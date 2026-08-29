// ============ MESSAGE VERIFY SERVICE — Phân loại tin nhắn / SMS: lừa đảo vs đáng ngờ vs xác thực ============
// Hỗ trợ đa ngôn ngữ: VI, EN, ZH, KO, JA, TH, RU, ES, PT, AR, TL
// Ưu tiên LLM (jsonMode) phán quyết; fallback thuần heuristic khi LLM không khả dụng.
// Nguyên tắc kết luận: ĐỎ (lừa đảo) CHỈ khi chắc chắn; còn lại nghiêng về ĐÁNG NGỜ hoặc XÁC THỰC.

const { llmChat, isLLMConfigured } = require('./llmClient');

// ---- Multi-language scam signals ----
const SCAM_SIGNALS = [
  // ===== VIETNAMESE =====
  { id: 'MSG_LINK', name: 'Đường dẫn nghi vấn', weight: 0.35, re: /https?:\/\/[^\s]+|www\.[^\s]+|([a-z0-9-]+\.)+(top|xyz|club|site|online|info|biz|work|live|click|buzz)(?:\/|[\s]|$)/i, lang: 'vi' },
  { id: 'MSG_OTP', name: 'Yêu cầu mã OTP / mật khẩu', weight: 0.45, re: /(mã otp|mã xác (?:nhận|thực)|ma otp|mật khẩu|password|mã pin|số cvv|secure code|mã chuyển tiền)/i, lang: 'vi' },
  { id: 'MSG_TRANSFER', name: 'Yêu cầu chuyển / nạp tiền', weight: 0.45, re: /(chuyển (?:khoản|tiền|khoan)|nạp (?:tiền|thẻ|card)|thanh toán (?:trước|trước )?cọc|đặt cọc|nạp thẻ|quét mã qr để nhận|chuyển gấp|gửi (?:tiền|gấp))/i, lang: 'vi' },
  { id: 'MSG_JOB', name: 'Việc nhẹ lương cao / làm việc online', weight: 0.4, re: /(việc nhẹ|viec nhe|làm việc online|lam viec online|lương cao|luong cao|300.000|500.000|1 triệu|2 triệu|3 triệu|thu nhập thêm|hoàn đơn|hoàn phí|hoan don|đánh giá sản phẩm|danh gia san pham|nhận việc ngay|click like nhận|click.*follow.*nhận)/i, lang: 'vi' },
  { id: 'MSG_PRIZE', name: 'Trúng thưởng / quà tặng bất thường', weight: 0.4, re: /(trúng (?:thưởng|giải)|trung thuong|nhận (?:quà|thưởng)|hoàn tiền|hoan tien|quà tặng miễn phí|may mắn trúng|giải đặc biệt|khuyến mãi.*(?:100%|99%))/i, lang: 'vi' },
  { id: 'MSG_URGENCY', name: 'Áp lực thời gian / đe dọa', weight: 0.25, re: /(ngay lập tức|ngay bây giờ|trước (?:.\d+ |)(?:giờ|phút|ngày)|hết hiệu lực|tài khoản.*(?:bị khóa|bị đóng)|đóng tài khoản|hủy.*mã|vi phạm.*pháp luật|bị truy tố|bắt giữ|cơ quan công an|vneid|cccd.*cung cấp)/i, lang: 'vi' },
  { id: 'MSG_LOAN', name: 'Vay vốn nhanh / lãi suất bất thường', weight: 0.3, re: /(vay.*(?:nhanh|online|nóng|lãi suất thấp)|cho vay.*(?:không cần|không chứng|nhận ngay)|giải ngân|nổ hũ|tăng tiền|nạp.*nhận.*(?:tiền|phần thưởng))/i, lang: 'vi' },
  { id: 'MSG_PERSONAL_INFO', name: 'Dò tìm thông tin cá nhân', weight: 0.3, re: /(cung cấp.*(?:cccd|cmnd|căn cước|số tài khoản|địa chỉ|số thẻ|stk)|số tài khoản.*của|mã số thuế|ngày sinh)/i, lang: 'vi' },

  // ===== ENGLISH =====
  { id: 'MSG_EN_LINK', name: 'Suspicious link (EN)', weight: 0.35, re: /https?:\/\/[^\s]+|www\.[^\s]+|([a-z0-9-]+\.)+(top|xyz|club|site|online|info|biz|work|live|click|buzz|fun|link|tech)(?:\/|[\s]|$)/i, lang: 'en' },
  { id: 'MSG_EN_OTP', name: 'OTP / password request (EN)', weight: 0.45, re: /\b(otp|one.?time.?password|verification code|security code|pin code|cvv|cvc|ssn|social security|account password|login credentials)\b/i, lang: 'en' },
  { id: 'MSG_EN_TRANSFER', name: 'Money transfer request (EN)', weight: 0.45, re: /\b(wire transfer|send money|transfer funds|western union|moneygram|bitcoin|crypto wallet|gift card|itunes|amazon card|steam card|reload|top.?up|deposit|payment|pay now|urgent payment|bank account)\b/i, lang: 'en' },
  { id: 'MSG_EN_JOB', name: 'Job scam (EN)', weight: 0.4, re: /\b(work from home|easy money|earn \$\d+|make \$\d+|passive income|financial freedom|side hustle|no experience needed|hiring immediately|click like|follow and earn|data entry|envelope stuffing)\b/i, lang: 'en' },
  { id: 'MSG_EN_PRIZE', name: 'Prize/lottery scam (EN)', weight: 0.4, re: /\b(you.?ve? won|congratulations.*winner|claim your prize|lottery winner|sweepstakes|grand prize|free gift|lucky draw|million dollar|inheritance|beneficiary|next of kin)\b/i, lang: 'en' },
  { id: 'MSG_EN_URGENCY', name: 'Urgency/threat (EN)', weight: 0.25, re: /\b(act now|immediate(ly)?|urgent|time.?sensitive|account (?:suspended|locked|closed|compromised|expiring)|verify your account|failure to comply|legal action|arrest warrant|fbi|irs|police)\b/i, lang: 'en' },
  { id: 'MSG_EN_LOAN', name: 'Loan scam (EN)', weight: 0.3, re: /\b(no credit check|guaranteed approval|instant loan|fast cash|emergency loan|low interest|0% APR|payday loan|cash advance|pre.?approved)\b/i, lang: 'en' },
  { id: 'MSG_EN_IMPERSONATE', name: 'Impersonation (EN)', weight: 0.4, re: /\b(this is (?:the|your) (?:IRS|FBI|bank|police|Microsoft|Apple|Amazon|Netflix|IRS)|your account has been|we detected unusual|security alert|unusual activity|suspicious login)\b/i, lang: 'en' },
  { id: 'MSG_EN_CRYPTO', name: 'Crypto/investment scam (EN)', weight: 0.4, re: /\b(double your|10x return|guaranteed profit|investment opportunity|crypto airdrop|free tokens|staking reward|yield farming|pump and dump|insider tip|before it goes public)\b/i, lang: 'en' },

  // ===== CHINESE (中文) =====
  { id: 'MSG_ZH_OTP', name: '验证码请求 (中文)', weight: 0.45, re: /(验证码|密码|安全码|支付密码|交易密码|短信验证码|手机验证码|银行卡密码)/i, lang: 'zh' },
  { id: 'MSG_ZH_TRANSFER', name: '转账请求 (中文)', weight: 0.45, re: /(转账|汇款|打款|付款|扫码支付|微信转账|支付宝转账|银行卡转账|紧急转账|立即转账|银行账户)/i, lang: 'zh' },
  { id: 'MSG_ZH_PRIZE', name: '中奖诈骗 (中文)', weight: 0.4, re: /(中奖|恭喜您|领奖|奖金|奖品|免费领取|幸运用户|恭喜发财|年终奖|红包)/i, lang: 'zh' },
  { id: 'MSG_ZH_URGENCY', name: '紧急威胁 (中文)', weight: 0.25, re: /(立即处理|紧急通知|账户异常|账户冻结|账户注销|涉嫌违法|公安局|检察院|法院传票|通缉令|立即配合)/i, lang: 'zh' },
  { id: 'MSG_ZH_LOAN', name: '贷款诈骗 (中文)', weight: 0.3, re: /(无抵押贷款|秒批贷款|当天放款|低息贷款|免审核|额度提升|贷款到账|急用钱)/i, lang: 'zh' },
  { id: 'MSG_ZH_JOB', name: '兼职诈骗 (中文)', weight: 0.4, re: /(刷单|做任务|日赚|兼职|在家赚钱|轻松赚钱|高薪|佣金|返现|抢单|淘宝刷单)/i, lang: 'zh' },
  { id: 'MSG_ZH_INVEST', name: '投资诈骗 (中文)', weight: 0.4, re: /(内幕消息|稳赚不赔|高回报|投资理财|虚拟货币|区块链|原始股|上市公司|私募基金)/i, lang: 'zh' },

  // ===== KOREAN (한국어) =====
  { id: 'MSG_KO_OTP', name: '인증번호 요청 (한국어)', weight: 0.45, re: /(인증번호|비밀번호|인증코드|보안코드|결제비밀번호|계좌비밀번호|승인번호)/i, lang: 'ko' },
  { id: 'MSG_KO_TRANSFER', name: '송금 요청 (한국어)', weight: 0.45, re: /(송금|이체|입금|계좌이체|카카오뱅크|토스|계좌번호|즉시송금|급히 송금)/i, lang: 'ko' },
  { id: 'MSG_KO_PRIZE', name: '당첨 사기 (한국어)', weight: 0.4, re: /(당첨|축하|상품권|경품|선물|무료|이벤트 당첨|럭키|대박)/i, lang: 'ko' },
  { id: 'MSG_KO_URGENCY', name: '긴급 상황 (한국어)', weight: 0.25, re: /(즉시|긴급|계정정지|계정삭제|이상거래|보안경고|경찰|검찰|법원|범죄)/i, lang: 'ko' },
  { id: 'MSG_KO_LOAN', name: '대출 사기 (한국어)', weight: 0.3, re: /(대출|무담보|빠른대출|이자율|즉시대출|승인|한도|신용불량)/i, lang: 'ko' },

  // ===== JAPANESE (日本語) =====
  { id: 'MSG_JA_OTP', name: '認証コード要求 (日本語)', weight: 0.45, re: /(認証番号|パスワード|暗証番号|セキュリティコード|確認番号|ワンタイムパスワード)/i, lang: 'ja' },
  { id: 'MSG_JA_TRANSFER', name: '送金要求 (日本語)', weight: 0.45, re: /(振込|振替|送金|入金|口座番号|銀行口座|即時送金|緊急送金)/i, lang: 'ja' },
  { id: 'MSG_JA_PRIZE', name: '詐欺キャンペーン (日本語)', weight: 0.4, re: /(当選|おめでとう|景品|プレゼント|無料|キャンペーン|宝くじ|抽選)/i, lang: 'ja' },
  { id: 'MSG_JA_URGENCY', name: '緊急対応 (日本語)', weight: 0.25, re: /(至急|緊急|アカウント停止|アカウント削除|不正利用|セキュリティ警告|警察|捜査)/i, lang: 'ja' },

  // ===== THAI (ภาษาไทย) =====
  { id: 'MSG_TH_OTP', name: 'ขอรหัส OTP (ไทย)', weight: 0.45, re: /(รหัส otp|รหัสยืนยัน|รหัสผ่าน|รหัสความปลอดภัย|รหัสบัตร)/i, lang: 'th' },
  { id: 'MSG_TH_TRANSFER', name: 'ขอโอนเงิน (ไทย)', weight: 0.45, re: /(โอนเงิน|ชำระเงิน|转账|บัญชีธนาคาร|พร้อมเพย์|โอนด่วน|โอนทันที)/i, lang: 'th' },
  { id: 'MSG_TH_PRIZE', name: 'หลอกลวงรางวัล (ไทย)', weight: 0.4, re: /(ถูกรางวัล|โชคดี|ของรางวัล|ฟรี|โปรโมชั่น|ส่วนลด|ข้อเสนอพิเศษ)/i, lang: 'th' },
  { id: 'MSG_TH_URGENCY', name: 'เร่งด่วน/ข่มขู่ (ไทย)', weight: 0.25, re: /(ทันที|ด่วน|บัญชีถูกระงับ|บัญชีถูกปิด|ผิดกฎหมาย|ตำรวจ|ศาล|หมายจับ)/i, lang: 'th' },

  // ===== RUSSIAN (Русский) =====
  { id: 'MSG_RU_OTP', name: 'Запрос кода (Русский)', weight: 0.45, re: /(код подтверждения|одноразовый пароль|смс код|код безопасности|пароль|пин-код)/i, lang: 'ru' },
  { id: 'MSG_RU_TRANSFER', name: 'Запрос перевода (Русский)', weight: 0.45, re: /(перевод|перевести|оплатить|внести|банковский счет|номер карты|срочно перевести)/i, lang: 'ru' },
  { id: 'MSG_RU_PRIZE', name: 'Мошенничество с призами (Русский)', weight: 0.4, re: /(вы выиграли|поздравляем|приз|выигрыш|бонус|подарок|бесплатно|лотерея)/i, lang: 'ru' },
  { id: 'MSG_RU_URGENCY', name: 'Срочность/угроза (Русский)', weight: 0.25, re: /(немедленно|срочно|аккаунт заблокирован|аккаунт удален|нарушение|полиция|суд|прокуратура)/i, lang: 'ru' },

  // ===== SPANISH (Español) =====
  { id: 'MSG_ES_OTP', name: 'Solicitud OTP (Español)', weight: 0.45, re: /(código de verificación|código otp|contraseña|código de seguridad|pin|cvv)/i, lang: 'es' },
  { id: 'MSG_ES_TRANSFER', name: 'Solicitud de transferencia (Español)', weight: 0.45, re: /(transferir|enviar dinero|depósito|cuenta bancaria|western union|urgente|pago inmediato)/i, lang: 'es' },
  { id: 'MSG_ES_PRIZE', name: 'Estafa de premios (Español)', weight: 0.4, re: /(has ganado|felicidades|premio|sorteo|regalo|gratis|bono|lotería)/i, lang: 'es' },
  { id: 'MSG_ES_URGENCY', name: 'Urgencia/amenaza (Español)', weight: 0.25, re: /(ahora|inmediato|urgente|cuenta bloqueada|cuenta suspendida|policía|autoridad|demanda)/i, lang: 'es' },

  // ===== PORTUGUESE (Português) =====
  { id: 'MSG_PT_OTP', name: 'Solicitação OTP (Português)', weight: 0.45, re: /(código de verificação|código otp|senha|código de segurança|pin|cvv)/i, lang: 'pt' },
  { id: 'MSG_PT_TRANSFER', name: 'Solicitação de transferência (Português)', weight: 0.45, re: /(transferir|enviar dinheiro|depósito|conta bancária|pix|urgente|pagamento imediato)/i, lang: 'pt' },
  { id: 'MSG_PT_PRIZE', name: 'Estafa de prêmios (Português)', weight: 0.4, re: /(você ganhou|parabéns|prêmio|sorteio|presente|grátis|bônus|loteria)/i, lang: 'pt' },

  // ===== ARABIC (العربية) =====
  { id: 'MSG_AR_OTP', name: 'طلب رمز التحقق (عربي)', weight: 0.45, re: /(رمز التحقق|كلمة المرور|رمز الأمان|رقم التأكيد)/i, lang: 'ar' },
  { id: 'MSG_AR_TRANSFER', name: 'طلب تحويل (عربي)', weight: 0.45, re: /(تحويل|إرسال|حساب بنكي|تحويل عاجل|دفع|إيداع)/i, lang: 'ar' },
  { id: 'MSG_AR_PRIZE', name: 'احتيال جوائز (عربي)', weight: 0.4, re: /(فازت|مبروك|جوائز|هدايا|مجاني|לוטو)/i, lang: 'ar' },

  // ===== FILIPINO (Tagalog) =====
  { id: 'MSG_TL_OTP', name: 'Hingi ng OTP (Filipino)', weight: 0.45, re: /(otp|verification code|password|security code|pin code|konfirmasyon)/i, lang: 'tl' },
  { id: 'MSG_TL_TRANSFER', name: 'Hingi ng padala (Filipino)', weight: 0.45, re: /(padala|magpadala|pera|gcash|maya|bank account|remittance|urgent|pabilis)/i, lang: 'tl' },
  { id: 'MSG_TL_PRIZE', name: 'Panloloko sa premyo (Filipino)', weight: 0.4, re: /(nanalo|congratulations|premyo|parisukat|pagkakataon|swerte|bigyan)/i, lang: 'tl' },

  // ===== UNIVERSAL PATTERNS (work across languages) =====
  { id: 'MSG_UNIVERSAL_CRYPTO', name: 'Crypto wallet address', weight: 0.45, re: /\b(?:0x[0-9a-fA-F]{40}|bc1[0-9a-zA-Z]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[0-9a-zA-Z]{33}|ban[0-9a-zA-Z]{42}|addr1[0-9a-zA-Z]{58})\b/i, lang: 'universal' },
  { id: 'MSG_UNIVERSAL_MONEY_APP', name: 'Money app request', weight: 0.35, re: /\b(cashapp|venmo|zelle|paypal|revolut|wise|monzo|n26|gcash|maya|dana|ovo|shopeepay|grabpay|line pay|kakao pay|toss|paytm|phonepe|googlepay|applepay)\b/i, lang: 'universal' },
  { id: 'MSG_UNIVERSAL_SCAM_DOMAIN', name: 'Known scam TLD pattern', weight: 0.3, re: /\b[a-z0-9-]+\.(?:top|xyz|club|site|online|info|biz|work|live|click|buzz|fun|link|tech|monster|icu|cam|rest| Laundering|cfd|bot|sbs|cyou|uno)\b/i, lang: 'universal' },
];

const CONTACT_LINK_RE = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.(?:top|xyz|club|site|online|info|biz|online|club|site|work|live|click|buzz|fun|link|tech)(?:\/|[^\s]|$))/gi;

// ---- Nhóm lành tính (không đánh giá là tin giả) ----
const SAFE_CONTEXT = [
  { id: 'MSG_CONFIRM', name: 'Xác nhận giao dịch / thông tin', re: /(xác nhận đã|đã nhận|đã chuyển|chuyển thành công|giao dịch thành công|mã đơn hàng|đã đặt hàng|hóa đơn|payment confirmed|order confirmed|transaction completed|order #|receipt|invoice)/i },
  { id: 'MSG_REPLY', name: 'Trả lời / hẹn gặp cá nhân', re: /\b(ừ[aàá]?|ok anh|ok chị|được anh|vâng|hẹn gặp|gặp nhau|bao giờ về|đi đâu|ăn cơm|thanks|thank you|got it|see you|ok|sounds good|没问题|好的|알겠습니다|了解| عندك)/i }
];

function extractContact(text) {
  const phones = [];
  const urls = [];
  const compact = String(text || '').replace(/\s+/g, ' ');
  
  // International phone patterns
  const phonePatterns = [
    /(?:\+|00)?(?:84|855|66|62|63|60|91|880|92|93|94|213|20|966|971|55|52|1|44|33|49|39|34|7|86|82|81|84|855|66|62|63|60|91|880|92|93|94|213|20|966|971|55|52|1|44|33|49|39|34|7|86|82|81)\s?[0-9]{7,12}\b/g,
    /(?:\+|00)?[0-9]{1,4}\s?[0-9]{6,14}\b/g
  ];
  
  for (const pattern of phonePatterns) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(compact)) !== null) {
      const cleaned = m[0].replace(/\s/g, '');
      if (cleaned.length >= 8 && cleaned.length <= 15) {
        phones.push(cleaned);
      }
    }
  }
  
  const urlRe = /(?:https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:com|vn|top|xyz|net|org|info|biz|online|club|site|work|live|click|buzz|fun|link|tech|io|co|me|app|dev|cloud|store|shop)(?:\/[^\s]*)?)/gi;
  while ((m = urlRe.exec(compact)) !== null) urls.push(m[0].replace(/[.,;\]\)]$/, ''));
  return { phones: [...new Set(phones)].slice(0, 5), urls: [...new Set(urls)].slice(0, 8) };
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Detect language of text (simple heuristic)
function detectLanguage(text) {
  const lower = text.toLowerCase();
  
  // Vietnamese diacritics
  if (/[àáạảãâầấậẩẫăằắặẳẵ]/i.test(text)) return 'vi';
  // Chinese characters
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  // Korean Hangul
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';
  // Japanese Hiragana/Katakana
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  // Thai
  if (/[\u0e00-\u0e7f]/.test(text)) return 'th';
  // Arabic
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';
  // Cyrillic
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';
  
  // English (Latin script fallback)
  if (/[a-z]/i.test(text)) return 'en';
  
  return 'unknown';
}

// ---- Chấm điểm heuristic thuần (fallback khi LLM hỏng) ----
function heuristicScan(text) {
  const reasons = [];
  let risk = 0;
  const contacts = extractContact(text);
  let scamSignalCount = 0;
  const detectedLang = detectLanguage(text);

  // Track which languages had matches
  const langMatches = new Set();

  SCAM_SIGNALS.forEach((sig) => {
    sig.re.lastIndex = 0;
    if (sig.re.test(text)) {
      risk += sig.weight;
      scamSignalCount += 1;
      langMatches.add(sig.lang);
      reasons.push({
        id: sig.id,
        name: sig.name,
        detail: sig.name,
        status: sig.weight >= 0.4 ? 'danger' : 'warning',
        source: 'heuristic'
      });
    }
  });

  // Bonus: multiple languages triggered = higher confidence
  if (langMatches.size >= 3) {
    risk += 0.1;
    reasons.push({
      id: 'MSG_MULTILINGUAL',
      name: 'Multi-language scam signals detected',
      detail: `Scam signals detected in ${langMatches.size} different languages. This is a strong indicator of organized scam campaigns.`,
      status: 'warning',
      source: 'heuristic'
    });
  }

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

  return { riskPct, verdict, reasons, contacts, detectedLang, langMatches: Array.from(langMatches) };
}

// ---- LLM phán quyết (jsonMode) — multilingual prompt ----
const LLM_SYSTEM_PROMPT = `You are a multilingual cybersecurity expert specializing in SMS/scam message detection across ALL languages.

Analyze the MESSAGE and return ONLY a JSON (no other text), following this schema:
{
  "verdict": "scam" | "suspicious" | "verified",
  "confidence": <integer 0-100, certainty level>,
  "summary": "<brief summary 1-2 sentences in the SAME language as the message>",
  "language": "<detected language code: vi|en|zh|ko|ja|th|ru|es|pt|ar|tl|other>",
  "reasons": [
    { "severity": "danger" | "warning" | "success", "label": "<brief>", "detail": "<1-2 sentence explanation in the SAME language as the message>" }
  ]
}

CONCLUSION GUIDELINES:
- verdict "scam" ONLY when CLEAR EVIDENCE: requesting OTP/password/CVV, money transfer/gift cards, impersonating bank/government, phishing links, crypto wallet requests, advance fee fraud, fake prizes requiring payment. Then confidence >= 70.
- verdict "verified" when message is normal: transaction confirmations from known contacts, legitimate service notifications, personal conversations, NO requests for money/OTP/personal info.
- When UNCERTAIN → "suspicious" — NEVER conclude red without evidence.
- reasons: list max 4 MOST IMPORTANT signals, one per entry.
- IMPORTANT: The message may be in ANY language (Vietnamese, English, Chinese, Korean, Japanese, Thai, Russian, Spanish, Portuguese, Arabic, Filipino, etc.). Detect the language and respond in that language.

KNOWN SCAM PATTERNS BY LANGUAGE:
- VI: "chuyển khoản", "mã OTP", "việc nhẹ lương cao", "trúng thưởng", "tài khoản bị khóa"
- EN: "wire transfer", "verification code", "you've won", "account suspended", "act now"
- ZH: "转账", "验证码", "中奖", "账户冻结", "刷单"
- KO: "송금", "인증번호", "당첨", "계정정지"
- JA: "振込", "認証番号", "当選", "アカウント停止"
- TH: "โอนเงิน", "รหัส OTP", "ถูกรางวัล"
- RU: "перевод", "код подтверждения", "вы выиграли"
- ES: "transferir", "código de verificación", "has ganado"
- PT: "transferir", "código de verificação", "você ganhou"
- AR: "تحويل", "رمز التحقق"
- TL: "padala", "otp", "nanalo"`;


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
      language: String(parsed.language || 'unknown').trim(),
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
          { role: 'user', content: `Message to check:\n"""\n${plain}\n"""` }
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

    if (llm.verdict === 'scam') {
      const llmCertain = llm.confidence >= 85;
      const llmConfident = llm.confidence >= 70;
      if ((llmConfident || llmCertain) && (llmCertain || hasStrongHeuristic)) {
        verdict = 'scam';
        trustScore = clamp(100 - llm.confidence * 0.35 - heuristic.riskPct * 0.15, 10, 45);
      } else {
        verdict = 'suspicious';
        trustScore = clamp(50 - heuristic.riskPct * 0.2, 30, 68);
      }
    } else if (llm.verdict === 'verified' && llm.confidence >= 60 && !hasStrongHeuristic) {
      verdict = 'verified';
      trustScore = clamp(90 - heuristic.riskPct * 0.2, 72, 95);
    } else {
      verdict = 'suspicious';
      trustScore = clamp(50 + (llm.verdict === 'scam' ? -10 : 0) - heuristic.riskPct * 0.2, 30, 68);
    }
  } else {
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
    detectedLanguage: heuristic.detectedLang,
    languageMatches: heuristic.langMatches,
    contacts: heuristic.contacts,
    reasons,
    heuristic: { riskPct: heuristic.riskPct, verdict: heuristic.verdict }
  };
}

module.exports = { verifyMessage, heuristicScan };
