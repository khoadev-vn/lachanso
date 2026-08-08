// ============ REPORT ROUTES — Khiếu nại kết quả sai (False Positive / False Negative) ============
// Nhận form báo cáo từ ReportIssueModal, gửi thông báo qua Telegram (ưu tiên) + ghi JSON (luôn).
// Hỗ trợ đính kèm 1 ảnh bằng chứng (base64 data-URL → Telegram sendPhoto).
// KHÔNG dùng SMTP. Không cần key email.
// Anti-spam: rate limit 5 báo cáo / 15 phút / IP.

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');

const router = express.Router();

// ---- Anti-Spam đơn giản (in-memory, mỗi IP 5 báo cáo/15 phút) ----
const reportLog = new Map(); // ip -> timestamps[]
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REPORTS = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const list = (reportLog.get(ip) || []).filter(t => now - t < WINDOW_MS);
  if (list.length >= MAX_REPORTS) { reportLog.set(ip, list); return true; }
  list.push(now);
  reportLog.set(ip, list);
  return false;
}

// ---- Giải mã ảnh bằng chứng (data:image/*;base64,...) — tối đa 1MB ----
const MAX_IMG_BYTES = 1 * 1024 * 1024;
function decodeImage(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[3], 'base64');
  if (!buf.length || buf.length > MAX_IMG_BYTES) return null;
  return { buffer: buf, mime: m[1], ext: m[2] === 'jpeg' ? 'jpg' : m[2] };
}

// ---- Xây caption chung cho tin nhắn Telegram ----
function buildCaption(report) {
  const lines = [];
  if (report.kind === 'owner_verify') {
    lines.push(`🛡️ <b>YÊU CẦU XÁC MINH CHỦ WEB — Lá Chắn Số</b>`);
    lines.push(``);
    lines.push(`🌐 Domain: ${report.domain}`);
    lines.push(`📧 Email: ${report.email}`);
    if (report.note) {
      lines.push(``);
      lines.push(`📝 Nội dung: ${report.note}`);
    }
  } else {
    lines.push(`⚠️ <b>KHIẾU NẠI KẾT QUẢ SAI — Lá Chắn Số</b>`);
    lines.push(``);
    lines.push(`🔗 ${report.kind === 'news' ? 'Nội dung tin' : 'URL'}: ${report.kind === 'news' ? (report.displayTarget || report.targetUrl) : report.targetUrl}`);
    lines.push(`📌 Loại: ${report.reportType}`);
    lines.push(`📧 Email: ${report.email}`);
    lines.push(``);
    lines.push(`📝 Bằng chứng / Lý do:`);
    lines.push(report.evidence);
  }
  if (report.screenshotData) lines.push(``, `🖼️ Đính kèm: ảnh bằng chứng.`);
  return lines.join('\n');
}

// ---- Telegram gửi thông báo (tin nhắn hoặc ảnh kèm caption) ----
async function sendTelegram(report) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const text = buildCaption(report);
    const photo = report.screenshotData ? decodeImage(report.screenshotData) : null;

    let url;
    let body;
    if (photo) {
      url = `https://api.telegram.org/bot${token}/sendPhoto`;
      const form = new FormData();
      form.append('chat_id', chatId);
      form.append('caption', text.slice(0, 1024));
      form.append('photo', new Blob([photo.buffer], { type: photo.mime }), `evidence.${photo.ext}`);
      body = form;
    } else {
      url = `https://api.telegram.org/bot${token}/sendMessage`;
      body = { chat_id: chatId, text, parse_mode: 'HTML' };
    }

    const r = await axios.post(url, body, { timeout: 10000 });
    return r.data?.ok === true;
  } catch (e) {
    console.error('[Report] Lỗi gửi Telegram:', e.message);
    return false;
  }
}

// ---- Ghi JSON (luôn lưu) ----
function appendToLog(report) {
  try {
    const dir = path.join(__dirname, '../data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'reports.json');
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { logs = []; }
    if (!Array.isArray(logs)) logs = [];
    logs.push({ ...report, receivedAt: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(logs, null, 2));
    return true;
  } catch (e) {
    console.error('[Report] Lỗi ghi JSON:', e.message);
    return false;
  }
}

// ---- POST /api/v2/report-issue ----
router.post('/report-issue', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Bạn đã gửi quá nhiều báo cáo. Vui lòng thử lại sau 15 phút.' });
  }

  const { email, targetUrl, reportType, evidence, agreeTerms, screenshotData, kind, displayTarget } = req.body || {};

  if (!email || !targetUrl || !evidence || !agreeTerms) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  }

  // Validate email + URL hợp lệ
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
  }
  if (kind === 'news') {
    // Nội dung tin có thể là snippet text (không phải URL) — chỉ cần không rỗng
    if (String(targetUrl).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Nội dung tin không hợp lệ.' });
    }
  } else if (!/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ success: false, message: 'Đường dẫn không hợp lệ.' });
  }
  if (!['false_positive', 'false_negative'].includes(reportType)) {
    return res.status(400).json({ success: false, message: 'Loại báo cáo không hợp lệ.' });
  }
  if (screenshotData && !decodeImage(screenshotData)) {
    return res.status(400).json({ success: false, message: 'Ảnh đính kèm không hợp lệ (chỉ chấp nhận PNG/JPG/WebP/GIF, tối đa 1MB).' });
  }

  const report = {
    email,
    targetUrl: String(targetUrl).slice(0, 2000),
    displayTarget: displayTarget ? String(displayTarget).slice(0, 2000) : undefined,
    kind: kind === 'news' ? 'news' : 'web',
    reportType,
    evidence: String(evidence).slice(0, 5000),
    agreeTerms: true,
    screenshotData: screenshotData || undefined,
    ip: process.env.LOG_REPORTER_IP === '1' ? ip : undefined
  };

  // Luôn ghi JSON (không mất dữ liệu kể cả khi Telegram chưa cấu hình) — KHÔNG lưu base64 ảnh
  const logReport = { ...report };
  logReport.hasScreenshot = !!logReport.screenshotData;
  delete logReport.screenshotData;
  delete logReport.ip;
  if (process.env.LOG_REPORTER_IP === '1') logReport.ip = ip;
  const saved = appendToLog(logReport);

  // Gửi Telegram nếu có token (kèm ảnh nếu có)
  const telegramSent = await sendTelegram(report);

  console.log(`[Report] Khiếu nại mới: ${report.reportType} - ${report.targetUrl} (telegram:${telegramSent ? 'OK' : 'SKIP'}${report.screenshotData ? ', img:1' : ''})`);

  return res.json({
    success: true,
    message: 'Đã gửi khiếu nại thành công. Đội ngũ sẽ xem xét trong 24h-48h.',
    telegramSent,
    saved
  });
});

// ---- POST /api/v2/owner-issue — Chủ web gửi yêu cầu xác minh (kèm ảnh tùy chọn) ----
router.post('/owner-issue', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' });
  }

  const { email, domain, note, screenshotData } = req.body || {};

  if (!email || !domain) {
    return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email và tên miền.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
  }
  if (screenshotData && !decodeImage(screenshotData)) {
    return res.status(400).json({ success: false, message: 'Ảnh đính kèm không hợp lệ (chỉ chấp nhận PNG/JPG/WebP/GIF, tối đa 1MB).' });
  }

  const owner = {
    kind: 'owner_verify',
    email,
    domain: String(domain).trim().slice(0, 255),
    note: String(note || '').slice(0, 3000),
    screenshotData: screenshotData || undefined,
    ip: process.env.LOG_REPORTER_IP === '1' ? ip : undefined
  };

  const logOwner = { ...owner };
  logOwner.hasScreenshot = !!logOwner.screenshotData;
  delete logOwner.screenshotData;
  delete logOwner.ip;
  if (process.env.LOG_REPORTER_IP === '1') logOwner.ip = ip;
  const saved = appendToLog(logOwner);

  const telegramSent = await sendTelegram(owner);

  console.log(`[Owner] Yêu cầu xác minh mới: ${owner.domain} (telegram:${telegramSent ? 'OK' : 'SKIP'}${owner.screenshotData ? ', img:1' : ''})`);

  return res.json({
    success: true,
    message: 'Đã gửi yêu cầu xác minh. Đội ngũ sẽ xem xét bằng chứng trong 24h-48h.',
    telegramSent,
    saved
  });
});

// ---- GET /api/v2/reports (admin xem, yêu cầu header secret) ----
router.get('/reports', (req, res) => {
  const secret = process.env.LCS_ADMIN_SECRET;
  if (secret && req.get('x-lcs-admin-secret') !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const file = path.join(__dirname, '../data/reports.json');
    if (!fs.existsSync(file)) return res.json([]);
    const logs = JSON.parse(fs.readFileSync(file, 'utf8'));
    return res.json(Array.isArray(logs) ? logs : []);
  } catch (e) {
    return res.json([]);
  }
});

module.exports = router;