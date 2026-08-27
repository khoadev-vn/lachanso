const fs = require('fs');
const path = require('path');

const KEYS_PATH = path.join(__dirname, '../data/partnerApiKeys.json');
const LOG_PATH = path.join(__dirname, '../data/partnerRequestLog.json');

let keys = {};
let requestLog = {};

function loadKeys() {
  try {
    if (fs.existsSync(KEYS_PATH)) {
      keys = JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
    }
  } catch { /* keep defaults */ }
}

function loadLog() {
  try {
    if (fs.existsSync(LOG_PATH)) {
      requestLog = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    }
  } catch { /* keep defaults */ }
}

function persistLog() {
  try {
    fs.writeFileSync(LOG_PATH, JSON.stringify(requestLog, null, 2), 'utf8');
  } catch (e) {
    console.error('[partnerAuth] persist log error:', e.message);
  }
}

// Auto-save log every 60s
setInterval(persistLog, 60000);

function partnerAuth(req, res, next) {
  loadKeys();

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Thiếu header x-api-key' });
  }

  // Find partner by key
  let partnerKey = null;
  let partner = null;
  for (const [id, p] of Object.entries(keys)) {
    if (p.key === apiKey) {
      partnerKey = id;
      partner = p;
      break;
    }
  }

  if (!partner || !partner.active) {
    return res.status(403).json({ error: 'API key không hợp lệ hoặc đã bị khóa' });
  }

  // Rate limit per partner (per minute)
  const now = Date.now();
  const windowMs = 60 * 1000;
  if (!partner._bucket || partner._bucket.resetAt <= now) {
    partner._bucket = { count: 0, resetAt: now + windowMs };
  }
  partner._bucket.count += 1;

  if (partner._bucket.count > partner.rateLimit) {
    return res.status(429).json({ error: 'Vượt quá giới hạn request. Vui lòng thử lại sau.' });
  }

  // Log request
  loadLog();
  const today = new Date().toISOString().slice(0, 10);
  if (!requestLog[partnerKey]) requestLog[partnerKey] = {};
  if (!requestLog[partnerKey][today]) requestLog[partnerKey][today] = 0;
  requestLog[partnerKey][today] += 1;

  // Attach partner info to request
  req.partnerId = partnerKey;
  req.partnerName = partner.name;

  next();
}

function getPartnerStats(partnerId) {
  loadLog();
  const log = requestLog[partnerId] || {};
  let total = 0;
  let today = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const [date, count] of Object.entries(log)) {
    total += count;
    if (date === todayStr) today = count;
  }

  return { partnerId, today, total, daily: log };
}

module.exports = { partnerAuth, getPartnerStats };