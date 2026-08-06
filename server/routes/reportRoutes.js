// ============ REPORT ROUTES — Khiếu nại kết quả sai (False Positive / False Negative) ============
// Nhận form báo cáo từ ReportIssueModal, gửi thông báo qua Telegram (ưu tiên) + ghi JSON (luôn).
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

// ---- Telegram gửi thông báo (chỉ khi có token) ----
async function sendTelegram(report) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const text = [
      `⚠️ *KHIẾU NẠI KẾT QUẢ SAI — Lá Chắn Số*`,
      ``,
      `🔗 URL: ${report.targetUrl}`,
      `📌 Loại: ${report.reportType}`,
      `📧 Email: ${report.email}`,
      ``,
      `📝 Bằng chứng / Lý do:`,
      report.evidence
    ].join('\n');
    const r = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    }, { timeout: 8000 });
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

  const { email, targetUrl, reportType, evidence, agreeTerms } = req.body || {};

  if (!email || !targetUrl || !evidence || !agreeTerms) {
    return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
  }

  // Validate email + URL hợp lệ
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
  }
  if (!/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ success: false, message: 'Đường dẫn không hợp lệ.' });
  }
  if (!['false_positive', 'false_negative'].includes(reportType)) {
    return res.status(400).json({ success: false, message: 'Loại báo cáo không hợp lệ.' });
  }

  const report = {
    email,
    targetUrl,
    reportType,
    evidence: String(evidence).slice(0, 5000),
    agreeTerms: true,
    ip: process.env.LOG_REPORTER_IP === '1' ? ip : undefined
  };

  // Luôn ghi JSON (không mất dữ liệu kể cả khi Telegram chưa cấu hình)
  const saved = appendToLog(report);

  // Gửi Telegram nếu có token
  const telegramSent = await sendTelegram(report);

  console.log(`[Report] Khiếu nại mới: ${report.reportType} - ${report.targetUrl} (telegram:${telegramSent ? 'OK' : 'SKIP'})`);

  return res.json({
    success: true,
    message: 'Đã gửi khiếu nại thành công. Đội ngũ sẽ xem xét trong 24h-48h.',
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