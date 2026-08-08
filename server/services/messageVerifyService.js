// ============ MESSAGE VERIFY SERVICE — Phân loại tin nhắn / SMS: lừa đảo vs đáng ngờ vs xác thực ============
// Ưu tiên LLM (jsonMode) phán quyết; fallback thuần heuristic khi LLM không khả dụng.
// Nguyên tắc kết luận: ĐỎ (lừa đảo) CHỈ khi chắc chắn; còn lại nghiêng về ĐÁNG NGỜ hoặc XÁC THỰC.

const { llmChat, isLLMConfigured } = require('./llmClient');

// ---- Heuristic fallback: các dấu hiệu điển hình lừa đảo QUA TIN NHẮN (không phải tin tức) ----
const SCAM_SIGNALS = [
  { id: 'MSG_LINK', name: 'Đường dẫn nghi vấn', weight: 0.35, re: /https?:\/\/[^\s]+|www\.[^\s]+|([a-z0-9-]+\.)+(top|xyz|club|site|online|info|biz)(?:\/|[\s]|$)/i },
  { id: 'MSG_OTP', name: 'Yêu cầu mã OTP / mật khẩu', weight: 0.45, re: /(mã otp|mã xác (?:nhận|thực)|ma otp|mật khẩu|password|mã pin|số cvv|secure code|mã chuyển tiền)/i },
  { id: 'MSG_TRANSFER', name: 'Yêu cầu chuyển / nạp tiền', weight: 0.45, re: /(chuyển (?:khoản|tiền|khoan)|nạp (?:tiền|thẻ|card)|thanh toán (?:trước|trước )?cọc|đặt cọc|nạp thẻ|quét mã qr để nhận|chuyển gấp|gửi (?:tiền|gấp))/i },
  { id: 'MSG_JOB', name: 'Việc nhẹ lương cao / làm việc online', weight: 0.4, re: /(việc nhẹ|viec nhe|làm việc online|lam viec online|lương cao|luong cao|300.000|500.000|1 triệu|2 triệu|3 triệu|thu nhập thêm|hoàn đơn|hoàn phí|hoan don|đánh giá sản phẩm|danh gia san pham|nhận việc ngay|click like nhận|click.*follow.*nhận)/i },
  { id: 'MSG_PRIZE', name: 'Trúng thưởng / quà tặng bất thường', weight: 0.4, re: /(trúng (?:thưởng|giải)|trung thuong|nhận (?:quà|thưởng)|hoàn tiền|hoan tien|quà tặng miễn phí|may mắn trúng|giải đặc biệt|khuyến mãi.*(?:100%|99%))/i },
  { id: 'MSG_URGENCY', name: 'Áp lực thời gian / đe dọa', weight: 0.25, re: /(ngay lập tức|ngay bây giờ|trước (?:.\d+ |)(?:giờ|phút|ngày)|hết hiệu lực|tài khoản.*(?:bị khóa|bị đóng)|đóng tài khoản|hủy.*mã|vi phạm.*pháp luật|bị truy tố|bắt giữ|cơ quan công an|vneid|cccd.*cung cấp)/i },
  { id: 'MSG_LOAN', name: 'Vay vốn nhanh / lãi suất bất thường', weight: 0.3, re: /(vay.*(?:nhanh|online|nóng|lãi suất thấp)|cho vay.*(?:không cần|không chứng|nhận ngay)|giải ngân|nổ hũ|tăng tiền|nạp.*nhận.*(?:tiền|phần thưởng))/i },
  { id: 'MSG_PERSONAL_INFO', name: 'Dò tìm thông tin cá nhân', weight: 0.3, re: /(cung cấp.*(?:cccd|cmnd|căn cước|số tài khoản|địa chỉ|số thẻ|stk)|số tài khoản.*của|mã số thuế|ngày sinh)/i }
];

const CONTACT_LINK_RE = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.(?:top|xyz|club|site|online|info|biz)(?:\/|[^\s]|$))/gi;

// ---- Nhóm lành tính (không đánh giá là tin giả) ----
const SAFE_CONTEXT = [
  { id: 'MSG_CONFIRM', name: 'Xác nhận giao dịch / thông tin', re: /(xác nhận đã|đã nhận|đã chuyển|chuyển thành công|giao dịch thành công|mã đơn hàng|đã đặt hàng|hóa đơn)/i },
  { id: 'MSG_REPLY', name: 'Trả lời / hẹn gặp cá nhân', re: /\b(ừ[aàá]?|ok anh|ok chị|được anh|vâng|hẹn gặp|gặp nhau|bao giờ về|đi đâu|ăn cơm)\b/i }
];

function extractContact(text) {
  const phones = [];
  const urls = [];
  const compact = String(text || '').replace(/\s+/g, ' ');
  const phoneRe = /(?:\+|0|84)\s?([3-9][0-9]{8})\b/g;
  let m;
  while ((m = phoneRe.exec(compact)) !== null) phones.push(m[0].replace(/\s/g, ''));
  const urlRe = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:com|vn|top|xyz|net|org|info|biz|online|club|site)(?:\/[^\s]*)?)/gi;
  while ((m = urlRe.exec(compact)) !== null) urls.push(m[0].replace(/[.,;\]\)]$/, ''));
  return { phones: [...new Set(phones)].slice(0, 5), urls: [...new Set(urls)].slice(0, 8) };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// ---- Chấm điểm heuristic thuần (fallback khi LLM hỏng) ----
function heuristicScan(text) {
  const reasons = [];
  let risk = 0;
  const contacts = extractContact(text);
  let scamSignalCount = 0;

  SCAM_SIGNALS.forEach((sig) => {
    sig.re.lastIndex = 0;
    if (sig.re.test(text)) {
      risk += sig.weight;
      scamSignalCount += 1;
      reasons.push({
        id: sig.id,
        name: sig.name,
        detail: sig.name,
        status: sig.weight >= 0.4 ? 'danger' : 'warning',
        source: 'heuristic'
      });
    }
  });

  if (contacts.phones.length > 0) {
    reasons.push({
      id: 'MSG_CONTACT_PHONE',
      name: 'Số điện thoại trong tin nhắn',
      detail: `Tin nhắn có đề cập số điện thoại: ${contacts.phones.join(', ')}. Nếu là số lạ kết hợp với các yêu cầu tiền/thông tin cá nhân thì rất nguy hiểm.`,
      status: 'warning',
      source: 'heuristic'
    });
  }
  contacts.urls.forEach((u) => {
    reasons.push({
      id: 'MSG_URL',
      name: 'Liên kết trong tin nhắn',
      detail: `Phát hiện liên kết: ${u}. KHÔNG nhấn vào liên kết từ tin nhắn không rõ nguồn gốc.`,
      status: 'danger',
      source: 'heuristic'
    });
  });

  // Xác nhận ngữ cảnh lành tính — CHỈ khi KHÔNG có dấu hiệu lừa đảo nào
  const safeHit = SAFE_CONTEXT.find((s) => { s.re.lastIndex = 0; return s.re.test(text); });
  if (safeHit && scamSignalCount === 0 && contacts.urls.length === 0) {
    risk = Math.max(0, risk - 0.15);
    reasons.push({
      id: safeHit.id,
      name: safeHit.name,
      detail: 'Ngữ cảnh tin nhắn mang tính cá nhân/hoặc xác nhận — ít khả năng là lừa đảo.',
      status: 'success',
      source: 'heuristic'
    });
  }

  const riskPct = clamp(Math.round(risk * 100), 0, 100);
  let verdict = 'verified';
  if (riskPct >= 60) verdict = 'scam';
  else if (riskPct >= 30) verdict = 'suspicious';

  return { riskPct, verdict, reasons, contacts };
}

// ---- LLM phán quyết (jsonMode) ----
const LLM_SYSTEM_PROMPT = `Bạn là chuyên gia an toàn thông tin Việt Nam, chuyên phát hiện lừa đảo qua tin nhắn SMS / Zalo / Facebook Messenger / mạng xã hội.

Phân tích TIN NHẮN được cung cấp và trả về DUY NHẤT một JSON (không kèm bất kỳ text nào khác), theo đúng schema:
{
  "verdict": "scam" | "suspicious" | "verified",
  "confidence": <số nguyên 0-100, mức độ chắc chắn của kết luận>,
  "summary": "<tóm tắt nội dung tin nhắn 1-2 câu bằng tiếng Việt>",
  "reasons": [
    { "severity": "danger" | "warning" | "success", "label": "<ngắn gọn>", "detail": "<giải thích 1-2 câu bằng tiếng Việt>" }
  ]
}

HƯỚNG DẪN KẾT LUẬN:
- verdict "scam" CHỈ khi có BẰNG CHỨNG RÕ RÀNG lừa đảo: yêu cầu cung cấp OTP/mật khẩu/CVV, yêu cầu chuyển/nạp tiền trước, mời chào việc nhẹ lương cao, trúng thưởng phải đóng phí, mạo danh ngân hàng/cơ quan, link lạ trong tin nhắn. Lúc đó confidence >= 70.
- verdict "verified" khi tin nhắn hoàn toàn bình thường: xác nhận giao dịch từ người quen, thông báo dịch vụ chính thống, trò chuyện cá nhân, KHÔNG có bất kỳ yêu cầu tiền/OTP/thông tin cá nhân nào.
- Mọi trường hợp KHÔNG chắc chắn → "suspicious" (đáng ngờ) — KHÔNG kết luận đỏ.
- reasons: liệt kê tối đa 4 tín hiệu QUAN TRỌNG NHẤT, mỗi cái một mục.`


function parseLlm(raw) {
  const rawStr = String(raw && typeof raw === 'object' ? JSON.stringify(raw) : raw || '');
  const start = rawStr.indexOf('{');
  const end = rawStr.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(rawStr.slice(start, end + 1));
    const verdict = ['scam', 'suspicious', 'verified'].includes(parsed.verdict) ? parsed.verdict : null;
    if (!verdict) return null;
    return {
      verdict,
      confidence: clamp(Number(parsed.confidence) || 0, 0, 100),
      summary: String(parsed.summary || '').trim(),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.slice(0, 4).map((r) => ({
            severity: ['danger', 'warning', 'success'].includes(r.severity) ? r.severity : 'warning',
            label: String(r.label || '').slice(0, 80),
            detail: String(r.detail || '').slice(0, 300)
          })).filter((r) => r.label || r.detail)
        : []
    };
  } catch (e) {
    return null;
  }
}

// ---- Entry point: kết hợp LLM + heuristic để ra kết luận cuối ----
async function verifyMessage(text) {
  const plain = String(text || '').trim().slice(0, 3000);
  const heuristic = heuristicScan(plain);
  let llm = null;
  let usedAI = false;

  try {
    if (await isLLMConfigured()) {
      const raw = await llmChat(
        [
          { role: 'system', content: LLM_SYSTEM_PROMPT },
          { role: 'user', content: `Tin nhắn cần kiểm tra:\n"""\n${plain}\n"""` }
        ],
        { temperature: 0.1, maxTokens: 600, jsonMode: true, timeout: 45000 }
      );
      llm = parseLlm(raw);
      if (llm) usedAI = true;
    }
  } catch (e) {
    console.warn('[verifyMessage] LLM error:', e.message);
  }

  // ---- Hợp nhất phán quyết ----
  // LLM đỏ chỉ tin khi confidence cao; heuristics luôn cộng hưởng.
  const hasStrongHeuristic = heuristic.verdict === 'scam' && heuristic.riskPct >= 55;
  let verdict = 'suspicious';
  let trustScore = 50;
  let reasons = heuristic.reasons.map((r) => ({ ...r, source: 'heuristic' }));
  let summary = '';

  if (llm) {
    summary = llm.summary;
    const llmReasons = llm.reasons.map((r) => ({
      id: 'MSG_LLM',
      name: r.label,
      detail: r.detail,
      status: r.severity,
      source: 'ai'
    }));
    reasons = [...llmReasons, ...heuristic.reasons.filter((r) => r.status !== 'success')].slice(0, 8);

    if (llm.verdict === 'scam' && llm.confidence >= 70) {
      verdict = 'scam';
      trustScore = clamp(100 - llm.confidence * 0.35 - heuristic.riskPct * 0.15, 10, 45);
    } else if (llm.verdict === 'verified' && llm.confidence >= 60 && !hasStrongHeuristic) {
      verdict = 'verified';
      trustScore = clamp(90 - heuristic.riskPct * 0.2, 72, 95);
    } else {
      verdict = 'suspicious';
      trustScore = clamp(50 + (llm.verdict === 'scam' ? -10 : 0) - heuristic.riskPct * 0.2, 30, 68);
    }
  } else {
    // Fallback thuần heuristic: đỏ chỉ khi risk cao rõ ràng
    if (heuristic.verdict === 'scam' && heuristic.riskPct >= 70) {
      verdict = 'scam';
      trustScore = clamp(100 - heuristic.riskPct, 15, 45);
    } else if (heuristic.verdict === 'verified' && heuristic.riskPct < 15) {
      verdict = 'verified';
      trustScore = 85;
    } else {
      verdict = 'suspicious';
      trustScore = clamp(58 - heuristic.riskPct * 0.2, 30, 68);
    }
    summary = '';
  }

  return {
    success: true,
    verdict,
    score: clamp(Math.round(trustScore), 0, 100),
    usedAI,
    summary,
    contacts: heuristic.contacts,
    reasons,
    heuristic: { riskPct: heuristic.riskPct, verdict: heuristic.verdict }
  };
}

module.exports = { verifyMessage, heuristicScan };
