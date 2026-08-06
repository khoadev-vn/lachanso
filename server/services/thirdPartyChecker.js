// ============ THIRD PARTY CHECKER — No-Key Threat Feeds ============
// Kiểm tra hostname với các nguồn không cần key (bulk feed + khớp nội bộ).
// Các feed được auto-crawl định kỳ vào scamDomains.json (xem autoCrawlService).
// PhishStats: real-time query không key.

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const dns = require('dns').promises;
const tinnhiemmang = require('./tinnhiemmang');

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

// Tinnhiemmang blacklist (live search qua /filterObj — cơ chế tìm kiếm đúng)
async function checkTinnhiemmang(hostname) {
  const res = await tinnhiemmang.searchTinnhiemmang(hostname);
  if (!res.available || !res.listed || !res.item) return null;
  const it = res.item;
  return {
    source: 'tinnhiemmang',
    severity: 'high',
    detail: `Domain có trong danh sách cảnh báo tinnhiemmang.vn (phát hiện ${it.detectedDate || '?'}, mạo danh "${it.org || '?'}", trạng thái ${it.status || '?'})`,
    matchedOrg: it.org,
    detectedDate: it.detectedDate,
    status: it.status,
    type: it.type,
    orgSlug: it.orgSlug
  };
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

  // 3) PhishStats real-time + 4) tinnhiemmang — chạy song song
  const [ps, tnm] = await Promise.all([checkPhishStats(host), checkTinnhiemmang(host)]);
  if (ps) results.push(ps);
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

// ============ IP INFO (no-key): DNS resolve + RDAP netrange + ip-api.com ============
// ip-api.com là nguồn miễn phí không cần key (45 req/phút) — đủ cho luồng từng-check.
let ipCache = new Map(); // ip -> { expiresAt, data }

async function getIpInfo(hostname) {
  const root = hostname.split('.').slice(-2).join('.');
  let ips = [];
  try { ips = await dns.resolve4(hostname); } catch (e) {}

  const detail = { hostname, ips, hosting: null, isp: null, org: null, country: null, region: null, city: null, asn: null, asName: null, rdapCidr: null, rdapName: null };
  if (!ips.length) return { collected: false, detail };

  const primary = ips[0];
  const cached = ipCache.get(primary);
  if (cached && Date.now() < cached.expiresAt) return { collected: true, ...cached.data };

  // 1) RDAP cho IP (cung cấp CIDR + tên tổ chức mạng)
  let rdap = null;
  try {
    const r = await axios.get(`https://rdap.org/ip/${primary}`, { timeout: 5000, headers: { 'Accept': 'application/rdap+json, application/json' } });
    const data = r.data || {};
    const cidr = (data.cidr || []).map(c => `${c.address}/${c.length}`).join(', ') || null;
    const name = data.name || null;
    const ent = (data.entities || []).find(e => e.vcardArray && e.vcardArray[1] && e.vcardArray[1].some(line => line[0] === 'fn'));
    const org = ent ? (ent.vcardArray[1].find(line => line[0] === 'fn') || [])[3] || null : null;
    rdap = { cidr, name, org };
    detail.rdapCidr = cidr;
    detail.rdapName = name || org;
  } catch (e) {}

  // 2) ip-api.com (miễn phí, http)
  try {
    const r = await axios.get(`http://ip-api.com/json/${primary}?fields=status,country,regionName,city,isp,org,as,asname,hosting,proxy,query`, { timeout: 5000 });
    const d = r.data || {};
    if (d.status === 'success') {
      detail.country = d.country;
      detail.region = d.regionName;
      detail.city = d.city;
      detail.isp = d.isp;
      detail.org = d.org;
      detail.asn = d.as;
      detail.asName = d.asname;
      detail.hosting = !!d.hosting || !!d.proxy;
    }
  } catch (e) {}

  const data = { detail };
  ipCache.set(primary, { expiresAt: Date.now() + 30 * 60 * 1000, data });
  return { collected: true, ...data };
}

// ============ CHECK ALL SOURCES — trả về mảng đầy đủ mọi nguồn (matched + clear) ============
// Khác checkHostname (chỉ trả matched), hàm này trả cả trạng thái "clear" để
// frontend render modal "Kết quả từ bên thứ 3".
async function checkAllSources(hostname) {
  const host = compactHost(hostname);
  const sources = [];

  // Tinnhiemmang (live search qua filterObj)
  const tnm = await tinnhiemmang.searchTinnhiemmang(host);
  if (tnm.available) {
    sources.push(tnm.listed
      ? { source: 'Tín Nhiệm Mạng', name: 'Tinnhiemmang.vn', listed: true, severity: 'high', detail: `Có trong danh sách lừa đảo. Phát hiện ${tnm.item.detectedDate || '?'}, mạo danh "${tnm.item.org || '?'}", trạng thái ${tnm.item.status || '?'}.`, item: tnm.item }
      : { source: 'Tín Nhiệm Mạng', name: 'Tinnhiemmang.vn', listed: false, severity: 'clear', detail: 'Không có trong danh sách cảnh báo lừa đảo của tinnhiemmang.vn.' });
  } else {
    sources.push({ source: 'Tín Nhiệm Mạng', name: 'Tinnhiemmang.vn', listed: false, severity: 'unknown', detail: `Không lấy được dữ liệu (${tnm.error || 'network-error'}).`, error: tnm.error });
  }

  // PhishStats (real-time, no key)
  const ps = await checkPhishStats(host);
  if (ps) {
    sources.push({ source: 'PhishStats', name: 'PhishStats', listed: true, severity: ps.severity, detail: ps.detail });
  } else {
    sources.push({ source: 'PhishStats', name: 'PhishStats', listed: false, severity: 'clear', detail: 'PhishStats chưa ghi nhận domain này.' });
  }

  // Local crawled feed (URLhaus, OpenPhish, Destroylist feed, ThreatFox)
  const local = loadCrawledDomains();
  const inLocal = local.has(host) || Array.from(local).some(d => host.endsWith('.' + d));
  sources.push({ source: 'Feed Bên Thứ 3', name: 'URLhaus / OpenPhish / Destroylist / ThreatFox', listed: inLocal, severity: inLocal ? 'high' : 'clear', detail: inLocal ? 'Domain có trong danh sách feed phishing đã crawl.' : 'Không có trong các feed phishing đã crawl.' });

  // Destroylist API (real-time, không key)
  let dl = null;
  try {
    const r = await axios.get(`https://api.destroy.tools/v1/check?domain=${encodeURIComponent(host)}`, { timeout: 4000, headers: { 'Accept': 'application/json' } });
    const d = r.data || {};
    const riskScore = Number(d.risk_score ?? d.riskScore ?? 0);
    dl = { listed: Boolean(d.threat || d.listed || riskScore >= 40), riskScore, severity: d.severity || d.status || 'unknown' };
  } catch (e) {}
  sources.push(dl
    ? { source: 'Destroylist', name: 'Destroylist', listed: dl.listed, severity: dl.listed ? 'high' : 'clear', detail: dl.listed ? `Destroylist đánh dấu nguy cơ ${dl.severity}, điểm rủi ro ${dl.riskScore}/100.` : `Destroylist chưa ghi nhận (điểm ${dl.riskScore}).` }
    : { source: 'Destroylist', name: 'Destroylist', listed: false, severity: 'unknown', detail: 'Không lấy được dữ liệu Destroylist.' });

  // IP info (no-key)
  const ipInfo = await getIpInfo(host);

  return { sources, ipInfo };
}

module.exports = { checkHostname, syncToRedis, loadCrawledDomains, getIpInfo, checkAllSources };