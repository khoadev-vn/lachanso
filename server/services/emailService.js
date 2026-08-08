// ============ EMAIL SERVICE — Gửi thông báo qua SMTP ============
// Trả lời khiếu nại → gửi email thông báo cho người khiếu nại.
// Nếu chưa cấu hình SMTP (_env SMTP_HOST) thì skip và trả false (không làm crash).

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || (SMTP_USER ? `Lá Chắn Số <${SMTP_USER}>` : '');

let transporter = null;

function isEmailConfigured() {
  return Boolean(SMTP_HOST && SMTP_FROM);
}

async function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: { rejectUnauthorized: false }
  });
  return transporter;
}

/**
 * Gửi email thông báo trả lời khiếu nại.
 * @param {string} to Email người khiếu nại
 * @param {string} reportLabel Mô tả ngắn đối tượng khiếu nại (URL / tin)
 * @param {string} reply Nội dung phản hồi của admin
 * @param {string} status Trạng thái xử lý (0=Đang xem xét, 1=Đã xử lý...)
 */
async function sendReportReplyEmail(to, { reportLabel, reply, status }) {
  if (!isEmailConfigured()) {
    console.warn('[Email] Bỏ qua gửi email: chưa cấu hình SMTP (SMTP_HOST).');
    return { sent: false, reason: 'smtp_not_configured' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to))) {
    return { sent: false, reason: 'invalid_email' };
  }
  try {
    const t = await getTransporter();
    const statusLine = status === 'resolved'
      ? 'Đã được xử lý'
      : status === 'investigating'
        ? 'Đang được xem xét'
        : 'Cập nhật mới';
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
      <h2 style="color:#ff8904;margin:0 0 8px">Lá Chắn Số</h2>
      <p style="color:#666;margin:0 0 16px">Cập nhật trạng thái khiếu nại của bạn: <strong>${statusLine}</strong></p>
      <p><strong>Nội dung / đường dẫn đã khiếu nại:</strong><br/>${String(reportLabel || '').replace(/</g, '&lt;')}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
      <p><strong>Phản hồi từ đội ngũ:</strong></p>
      <div style="background:#f8f8f6;border-radius:8px;padding:14px 16px;color:#333">${String(reply || '').replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</div>
      <p style="color:#999;font-size:12px;margin-top:20px">Email này được gửi tự động. Vui lòng không trả lời trực tiếp.</p>
    </div>`;
    const info = await t.sendMail({
      from: SMTP_FROM,
      to,
      subject: `[Lá Chắn Số] Cập nhật khiếu nại: ${statusLine}`,
      html
    });
    console.log(`[Email] Đã gửi cập nhật khiếu nại tới ${to} (messageId: ${info.messageId})`);
    return { sent: true };
  } catch (e) {
    console.error(`[Email] Lỗi gửi mail tới ${to}:`, e.message);
    return { sent: false, reason: 'smtp_error', error: e.message };
  }
}

module.exports = { sendReportReplyEmail, isEmailConfigured };