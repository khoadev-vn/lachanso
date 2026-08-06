// ============ THIRD PARTY CHECKER — No-Key Threat Feeds ============
// Kiểm tra hostname với các nguồn không cần key (bulk feed + khớp nội bộ).
// Các feed được auto-crawl định kỳ vào scamDomains.json (xem autoCrawlService).
// PhishStats: real-time query không key.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

let redisClient = null;
let redisReady = false;

// Lazy-load Redis nếu có (không bắt buộc — fallback file)
function getRedis() {
  if (redisClient) return redisClient;
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: 1 });
    redisClient.on('error', () => { redisReady = false; });
    redisClient.connect().then(() => { redisReady = true; }).catch(() => { redisReady = false; });
  } catch (e) { redisReady = false; }
  return redisClient;
}

// Domain chính (bỏ subdomain để khớp root)
function compactHost(hostname) {
  return hostname.replace(/^www\./, '').toLowerCase();
}

// Nạp danh sách đã crawl từ scamDomains.json
function loadCrawledDomains() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '../data/scamDomains.json'), 'utf8');
    const data = JSON.parse(raw);
    const domains = data.scamDomains || data.SCAM_DOMAINS || [];
    const set = new Set();
    for (const d of domains) {
      const val = typeof d === 'string' ? d : d.domain;
      if (val) {
        set.add(val.replace(/^www\./, '').toLowerCase());
        // thêm cả root
        const p = val.split('.');
        if (p.length > 2) set.add(p.slice(-2).join('.'));
      }
    }
    return set;
  } catch (e) {
    return new Set();
  }
}

// Real-time PhishStats query
async function checkPhishStats(hostname) {
  try {
    const r = await axios.get(`https://phishstats.info/phish_score.php?b=${encodeURIComponent(hostname)}`, { timeout: 5000 });
    const txt = String(r.data || '').trim();
    // Trả về score dạng số hoặc "dble"...
    const score = parseInt(txt.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(score) && score >= 5 && /^\d+$/.test(txt.replace(/\s/g, ''))) {
      return { source: 'PhishStats', severity: score >= 50 ? 'high' : 'medium', detail: `PhishStats score ${score}` };
    }
    return null;
  } catch (e) {
    return null;
  }
}

// Tinnhiemmang blacklist (scrape, bóc .table-result chính xác)
async function checkTinnhiemmang(hostname) {
  try {
    const r = await axios.get(`https://tinnhiemmang.vn/tim-kiem?q=${encodeURIComponent(hostname)}`, {
      timeout: 6000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html' },
      validateStatus: (s) => s < 400
    });
    const cheerio = require('cheerio');
    const $ = cheerio.load(String(r.data || ''));
    const target = hostname.replace(/^www\./, '').toLowerCase();
    // Bóc chính xác từ bảng .table-result
    let found = false;
    $('.table-result tr, table tr, .result-item, .item, tbody tr').each((i, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes(target) || text.includes(hostname.toLowerCase())) {
        // chỉ chốt khi khớp đúng hostname, không phải keyword
        const re = new RegExp(`(?:^|[^a-z0-9])${target.replace(/\./g, '\\.')}(?:[^a-z0-9]|$)`, 'i');
        if (re.test(text)) { found = true; return false; }
      }
    });
    if (found) {
      return { source: 'tinnhiemmang', severity: 'medium', detail: 'Domain có mặt trong danh sách cảnh báo tinnhiemmang.vn' };
    }
  } catch (e) {}
  return null;
}

// ============ MAIN CHECK ============
async function checkHostname(hostname) {
  const results = [];
  const host = compactHost(hostname);

  // 1) Local crawled feeds (URLhaus, OpenPhish, PhishStats feed, Destroylist, ThreatFox)
  const local = loadCrawledDomains();
  if (local.has(host)) {
    results.push({ source: 'feed', severity: 'high', detail: 'Domain có trong danh sách feed bên thứ 3 (crawl định kỳ)' });
  }

  // 2) Redis (nếu có)
  if (redisReady) {
    try {
      const inRedis = await getRedis().sismember('lcs:blacklist', host);
      if (inRedis) results.push({ source: 'redis', severity: 'high', detail: 'Domain trong danh sách đen Redis' });
    } catch (e) {}
  }

  // 3) PhishStats real-time
  const ps = await checkPhishStats(host);
  if (ps) results.push(ps);

  // 4) tinnhiemmang
  const tnm = await checkTinnhiemmang(host);
  if (tnm) results.push(tnm);

  // Loại trùng
  const seen = new Set();
  const unique = results.filter(r => {
    const k = r.source;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return unique;
}

// Đồng bộ toàn bộ phishing domains vào Redis Set (gọi sau crawl)
async function syncToRedis() {
  if (!redisReady) {
    try { getRedis(); } catch (e) {}
    await new Promise(res => setTimeout(res, 500));
  }
  if (!redisReady) return;
  const host = loadCrawledDomains();
  try {
    await getRedis().pipeline(Array.from(host).map(d => ['sadd', 'lcs:blacklist', d])).exec();
  } catch (e) {}
}

module.exports = { checkHostname, syncToRedis, loadCrawledDomains };