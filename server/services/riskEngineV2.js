// ============ LÁ CHẮN SỐ v2.0 — RISK ENGINE (Zero-Trust) ============
// 8 tiêu chí kỹ thuật, 2 nhóm (Cốt lõi + Bổ trợ), ma trận 4 trạng thái.
// Bao gồm vá các lỗ hổng False-Negative & False-Positive:
//   - Cloaking IP Datacenter (bot UA vs mobile UA)
//   - Subdomain phishing trên PaaS/SaaS
//   - Phishing SPA (JS bundle scan)
//   - Expired domain hijacking (RDAP updated + Wayback)
//   - CDN Anycast fast-flux (3-lần resolve + ASN whitelist)
//   - Cloudflare WAF / Anti-Bot (c4 không báo FETCH_ERROR)
//   - Startup form email/SĐT (phân biệt form nhạy cảm vs form thông tin)

const axios = require('axios');
const dns = require('dns').promises;
const tls = require('tls');
const cheerio = require('cheerio');
const brandPatterns = require('../config/brandPatterns');
const paasHosts = require('../config/paasHosts');
const thirdParty = require('./thirdPartyChecker');
const verifiedDomains = require('./verifiedDomains');
const { llmChat, isLLMConfigured } = require('./llmClient');
const { openrouterChat, isOpenRouterConfigured } = require('./openrouterClient');

const WEIGHTS = { c1: 0.18, c2: 0.14, c3: 0.08, c4: 0.14, c5: 0.15, c6: 0.10, c7: 0.06, c8: 0.05, c9: 0.10 };

// Điểm phạt mỗi tiêu chí (rủi ro cao = nguy hiểm hơn)
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const SENSITIVE_FORM_MARKERS = [
  'password', 'mật khẩu', 'mat khau', 'otp', 'cccd', 'cmnd', 'số dư', 'so du',
  'pin', 'napas', 'đăng nhập', 'dang nhap', 'login', 'verify', 'xac thuc', 'xác thực',
  'thẻ tín dụng', 'credit card', 'card number', 'cvv'
];
const CONTACT_FORM_MARKERS = [
  'email', 'sđt', 'sdt', 'số điện thoại', 'so dien thoai', 'phone', 'liên hệ',
  'lien he', 'tư vấn', 'tu van', 'nhận tư vấn', 'register', 'signup', 'newsletter'
];

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

function damerauLevenshtein(a, b) {
  a = String(a || ''); b = String(b || '');
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = []; dp[i][0] = i; }
  for (let j = 0; j <= n; j++) { dp[0][j] = j; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

function shannonEntropy(s) {
  s = String(s || '');
  if (!s.length) return 0;
  const counts = {};
  for (const c of s) counts[c] = (counts[c] || 0) + 1;
  let H = 0;
  const len = s.length;
  for (const k in counts) { const p = counts[k] / len; H -= p * Math.log2(p); }
  return H;
}

function rootOf(hostname) {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

// ============ c1: Domain Age & WHOIS/RDAP ============
async function collectC1(hostname) {
  const root = rootOf(hostname);
  let ageDays = null, updatedDays = null, privacy = false, registrar = null;
  try {
    const { data } = await axios.get(`https://rdap.org/domain/${root}`, { timeout: 8000 });
    const events = data.events || [];
    const created = events.find(e => e.eventAction === 'registration' || e.eventAction === 'created');
    const updated = events.find(e => e.eventAction === 'last changed' || e.eventAction === 'updated');
    if (created?.eventDate) ageDays = Math.floor((Date.now() - new Date(created.eventDate)) / 86400000);
    if (updated?.eventDate) updatedDays = Math.floor((Date.now() - new Date(updated.eventDate)) / 86400000);
    registrar = data.registrar?.name || null;
    const reg = (registrar || '').toLowerCase();
    if (reg.includes('privacy') || reg.includes('whoisguard') || reg.includes('withheld') || reg.includes('redacted')) {
      privacy = ageDays !== null && ageDays < 30;
    }
  } catch (e) { /* RDAP lỗi → không phạt c1, chỉ giảm C */ }

  let risk = 0;
  if (ageDays === null) risk += 0; // không xác định được → không phạt, nhưng không đạt cốt lõi
  else if (ageDays >= 90) risk += 0;
  else if (ageDays >= 30) risk += 5;
  else if (ageDays >= 7) risk += 30;
  else risk += 50;

  if (privacy) risk += 15;

  // Expired domain hijacking: domain cũ nhưng mới được cập nhật gần đây → tái đăng ký
  let hijack = false;
  if (ageDays !== null && ageDays > 365 && updatedDays !== null && updatedDays < 30) {
    risk += 30;
    hijack = true;
  }

  return { collected: true, risk, ageDays, updatedDays, privacy, hijack, registrar };
}

// ============ c2: SSL/TLS Certificate ============
function collectC2(hostname) {
  return new Promise((resolve) => {
    const done = (result) => resolve(result);
    let peerCert = null;
    let socket = null;
    const timer = setTimeout(() => {
      try { socket?.destroy(); } catch (e) {}
      done({ collected: true, risk: 0, hasSSL: false, note: 'timeout' });
    }, 6000);
    try {
      socket = tls.connect({
        host: hostname, port: 443, servername: hostname,
        rejectUnauthorized: false, timeout: 5000
      });
      socket.on('secureConnect', () => {
        clearTimeout(timer);
        peerCert = socket.getPeerCertificate();
        const hasSSL = !!(peerCert && peerCert.subject);
        let risk = 0;
        if (!hasSSL) { risk = 80; }
        else {
          const validTo = new Date(peerCert.valid_to).getTime();
          const daysLeft = Math.floor((validTo - Date.now()) / 86400000);
          const isSelfSigned = peerCert.issuer?.O === peerCert.subject?.O;
          if (daysLeft < 0) risk += 80;
          else if (isSelfSigned) risk += 80;
          else if (daysLeft < 7) risk += 15;
          // free CA + domain trẻ được xử lý ở c1 (ageDays) phối hợp — c2 chỉ báo cert
        }
        try { socket.end(); } catch (e) {}
        done({ collected: true, risk, hasSSL, daysLeft: peerCert.valid_to ? Math.floor((new Date(peerCert.valid_to) - Date.now()) / 86400000) : null, issuer: peerCert.issuer?.O || null });
      });
      socket.on('error', () => {
        clearTimeout(timer);
        done({ collected: true, risk: 80, hasSSL: false });
      });
      socket.on('timeout', () => {
        clearTimeout(timer);
        try { socket.destroy(); } catch (e) {}
        done({ collected: true, risk: 0, hasSSL: false });
      });
    } catch (e) {
      clearTimeout(timer);
      done({ collected: true, risk: 80, hasSSL: false });
    }
  });
}

// ============ c3: DNS Health & Fast-Flux ============
async function collectC3(hostname) {
  const root = rootOf(hostname);
  let hasA = false, hasMX = false, hasSPF = false, hasDMARC = false;
  try { hasA = (await dns.resolve4(hostname).catch(() => [])).length > 0; } catch (e) {}
  try { hasMX = (await dns.resolveMx(root)).length > 0; } catch (e) {}
  try { hasSPF = (await dns.resolveTxt(root)).some(r => r.join('').toLowerCase().includes('v=spf1')); } catch (e) {}
  try { hasDMARC = (await dns.resolveTxt('_dmarc.' + root)).some(r => r.join('').toLowerCase().includes('v=dmarc1')); } catch (e) {}

  // Fast-Flux: resolve 3 lần cách nhau ~1.5s
  const ipSet = new Set();
  for (let i = 0; i < 3; i++) {
    try {
      const arr = await dns.resolve4(hostname);
      for (const ip of arr) ipSet.add(ip);
    } catch (e) {}
    if (i < 2) await new Promise(res => setTimeout(res, 1000));
  }

  let risk = 0;
  const manyIps = ipSet.size >= 3;
  const orgsLike = hasMX || hasSPF || hasDMARC;
  if (!hasA) risk += 0; // unreachable → không phạt điểm, C vẫn tính được
  else if (manyIps && !orgsLike) risk += 60; // nghi fast-flux
  else if (!orgsLike) risk += 8; // DNS minimal
  else risk += 0;

  return { collected: true, risk, hasA, hasMX, hasSPF, hasDMARC, distinctIps: ipSet.size, likelyFastFlux: manyIps && !orgsLike };
}

// ============ c4: Web Content & DOM (cloaking + SPA JS scan + form phân loại) ============
async function fetchOnce(url, ua) {
  try {
    const r = await axios.get(url, {
      timeout: 6000,
      headers: { 'User-Agent': ua, 'Accept-Language': 'vi,en', 'Accept': 'text/html,application/xhtml+xml' },
      maxRedirects: 5, validateStatus: () => true
    });
    return { status: r.status, html: String(r.data || '') };
  } catch (e) {
    return { status: 0, html: '' };
  }
}

function isWafBlock(status, html) {
  return status === 403 || status === 429 || status === 503 ||
    /cf_chl|challenge-platform|turnstile|under.?attack|cf-browser/i.test(html);
}

async function collectC4(url, hostname, isPaaS) {
  const [botRes, mobileRes] = await Promise.all([
    fetchOnce(url, BOT_UA),
    fetchOnce(url, MOBILE_UA)
  ]);

  const botHtml = botRes.html || '';
  const mobileHtml = mobileRes.html || '';
  const content = mobileHtml || botHtml;
  const blockedByWaf = isWafBlock(mobileRes.status, mobileHtml) || isWafBlock(botRes.status, botHtml);

  let risk = 0;
  let cloakDetected = false;

  // Cloaking: bot thấy trang sạch/404 ngắn, mobile thấy nội dung đầy đủ
  if (botRes.status > 0 && mobileRes.status > 0 && !blockedByWaf) {
    const botLooksClean = botHtml.length < 500 || /google|404|not found/i.test(botHtml);
    if (botLooksClean && mobileHtml.length > botHtml.length * 1.5 && mobileHtml.length > 1000) {
      risk += 45;
      cloakDetected = true;
    }
  }

  // Phân tích DOM
  let sensitiveForm = false;
  let contactOnly = false;
  if (content && !blockedByWaf) {
    const $ = cheerio.load(content);
    const pageText = content.toLowerCase();

    const hasSensitive = SENSITIVE_FORM_MARKERS.some(m => pageText.includes(m));
    const hasContact = CONTACT_FORM_MARKERS.some(m => pageText.includes(m));
    const hasLoginForm = $('input[type="password"], input[name*="pass"], input[name*="otp"], input[type="tel"][name*="otp"]').length > 0;
    const hasCreditCard = $('input[name*="card"], input[name*="cc"], input[type="number"][maxlength="16"]').length > 0;

    if (hasLoginForm || hasCreditCard) {
      sensitiveForm = true;
      risk += 50;
    } else if (hasSensitive && !hasContact) {
      risk += 40;
    } else if (hasContact) {
      risk += 5; // form email/SĐT thông thường → điểm nhẹ
    }
  }

  // JS bundle scan (phát hiện SPA form) — chạy song song, giới hạn tối đa 4 file, 3s mỗi file
  if (content && !blockedByWaf) {
    const srcs = [...content.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 4);
    await Promise.all(srcs.map(async (src) => {
      try {
        const abs = /^https?:\/\//i.test(src) ? src : new URL(src, url).href;
        const jr = await axios.get(abs, { timeout: 3000, headers: { 'User-Agent': MOBILE_UA }, validateStatus: () => true });
        const js = String(jr.data || '');
        if (/createElement\s*\(\s*['"]form|type\s*=\s*['"]password|input_otp|login_submit|otp_input|password\s*field/i.test(js)) {
          risk += 50;
        }
      } catch (e) {}
    }));
  }

  return {
    collected: true, risk: clamp(risk, 0, 90), blockedByWaf,
    cloakDetected, sensitiveForm, contactOnly,
    htmlLength: content.length, botHtmlLength: botHtml.length
  };
}

// ============ c5: Third-Party Feeds (blocklist → R=100) ============
async function collectC5(hostname) {
  const blacklists = await thirdParty.checkHostname(hostname);
  const all = await thirdParty.checkAllSources(hostname);
  return {
    collected: true,
    risk: 0,
    blacklisted: blacklists.length > 0,
    sources: blacklists,
    thirdParty: all.sources,
    ipInfo: all.ipInfo
  };
}

// ============ c6: Typosquatting / Entropy ============
function collectC6(hostname, paasToken) {
  const token = (paasToken || hostname).toLowerCase();
  const compact = token.replace(/[^a-z0-9]/g, '');
  let risk = 0;
  let matchedBrand = null;

  for (const p of brandPatterns.PATTERNS) {
    const isOfficial = p.officialDomains.some(o => {
      const oc = o.replace(/^www\./, '');
      return hostname === oc || hostname.endsWith('.' + oc);
    });
    if (isOfficial) continue;

    const hasBrand = p.keywords.some(k => compact.includes(k.replace(/\s/g, '')));
    if (!hasBrand) continue;

    const officialCompact = p.officialDomains.map(d => d.replace(/[^a-z0-9]/g, ''));
    const close = officialCompact.some(d => {
      const dist = damerauLevenshtein(compact, d);
      return dist <= 2 && dist > 0;
    });

    if (close) { risk += 60; matchedBrand = p.brand; break; }
    risk += 45; matchedBrand = p.brand; break;
  }

  // Near-miss: host KHÔNG chứa từ khóa thương hiệu nhưng gần-giống domain chính thức
  // (vd: biance.com ~ binance.com, thiếu 1 ký tự). Chỉ khi độ dài tương đồng để hạn chế FP.
  if (!matchedBrand && compact.length >= 6) {
    for (const p of brandPatterns.PATTERNS) {
      const isOfficial = p.officialDomains.some(o => {
        const oc = o.replace(/^www\./, '');
        return hostname === oc || hostname.endsWith('.' + oc);
      });
      if (isOfficial) continue;
      for (const d of p.officialDomains.map(x => x.replace(/[^a-z0-9]/g, ''))) {
        const dist = damerauLevenshtein(compact, d);
        const lenDiff = Math.abs(compact.length - d.length);
        // edit distance ≤ 2 và độ lệch chiều dài ≤ 3 → nghi vấn typosquat
        if (dist > 0 && dist <= 2 && lenDiff <= 3) {
          risk += 50; matchedBrand = p.brand; break;
        }
      }
      if (matchedBrand) break;
    }
  }

  let entropy = null;
  if (!risk && compact.length >= 12) {
    entropy = +shannonEntropy(compact).toFixed(2);
    if (entropy > 3.85) risk += 25;
  }

  return { collected: true, risk, matchedBrand, entropy };
}

// ============ c7: Redirect chain & anti-analysis ============
async function collectC7(url) {
  let risk = 0;
  const chain = [];
  let current = url;
  let hops = 0;
  const seen = new Set();
  while (hops < 6 && current && !seen.has(current)) {
    seen.add(current);
    try {
      const r = await axios.get(current, {
        timeout: 2500, maxRedirects: 0, validateStatus: () => true,
        headers: { 'User-Agent': MOBILE_UA }
      });
      const status = r.status;
      if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
        const loc = r.headers.location;
        if (!loc) break;
        chain.push({ from: current, status, to: new URL(loc, current).href });
        current = new URL(loc, current).href;
        hops++;
      } else {
        chain.push({ from: current, status, to: null });
        break;
      }
    } catch (e) {
      break;
    }
  }

  if (chain.length > 3) risk += 25;
  if (chain.length >= 2) {
    const finalTarget = chain[chain.length - 1];
    if (finalTarget?.to) {
      try {
        const dest = new URL(finalTarget.to);
        if (/\.(top|xyz|club|work|buzz|icu|vip|loan|racing|win|bid|stream|download|cricket|science|party|date|faith|accountant|review|men|click|link|space|surf|tokyo|cam)$/i.test(dest.hostname)) {
          risk += 40;
        }
      } catch (e) {}
    }
  }

  return { collected: true, risk: clamp(risk, 0, 65), chainLength: chain.length, chain };
}

// ============ c8: Digital footprint (Wayback) ============
async function collectC8(hostname) {
  let snapshots = [];
  try {
    const r = await axios.get(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(hostname)}&output=json&limit=8&fl=timestamp,original,statuscode&filter=statuscode:200&collapse=digest`,
      { timeout: 6000 }
    );
    const txt = String(r.data || '').trim();
    if (txt.startsWith('[')) {
      const arr = JSON.parse(txt);
      snapshots = arr.slice(1).map(row => ({ ts: row[0], original: row[1], status: row[2] }));
    }
  } catch (e) {}

  const hasHistory = snapshots.length > 0;
  return { collected: true, risk: 0, hasHistory, snapshotCount: snapshots.length };
}

// ============ c9: AI phân tích nội dung (đọc trang → tóm tắt → phân loại) ============
// Crawl nội dung thật của trang, cho LLM tóm tắt "web này về gì" và phân loại bản chất.
// Web doanh nghiệp/tin tức thật → không phạt (thậm chí tăng C). Cờ bạc/lừa đảo/landing
// lạm dụng brand → phạt mạnh. Giúp giảm false-positive cho web legit dùng đuôi rẻ.
const c9Cache = new Map();
const C9_CACHE_TTL = 30 * 60 * 1000; // 30 phút

async function extractPageText(url, userAgentOverride) {
  try {
    const r = await axios.get(url, {
      timeout: 7000,
      maxRedirects: 5,
      headers: {
        'User-Agent': userAgentOverride || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'vi,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
      },
      validateStatus: () => true
    });
    const html = String(r.data || '');
    if (!html || html.length < 200) return null;

    // Lấy tiêu đề + meta description trước (dễ bắt bản chất web)
    let title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    let desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1]
      || (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || [])[1] || '';

    // Fallback OpenGraph (nhiều trang chặn bot vẫn trả meta og:*)
    const ogTitle = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) || [])[1]
      || (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i) || [])[1] || '';
    const ogDesc = (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i) || [])[1]
      || (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i) || [])[1] || '';
    const ogSite = (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i) || [])[1]
      || (html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:site_name["']/i) || [])[1] || '';

    // Lọc body text: bỏ script/style/tag, nén khoảng trắng
    const $ = cheerio.load(html);
    $('script,style,noscript,svg,iframe,form').remove();
    const bodyText = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2200);
    const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim().substring(0, 200);

    if (!title && ogTitle) title = ogTitle;
    if (!desc && ogDesc) desc = ogDesc;

    return {
      title: title.trim().substring(0, 200),
      desc: desc.trim().substring(0, 300),
      ogSite: ogSite.trim().substring(0, 120),
      h1,
      body: bodyText,
      htmlLength: html.length
    };
  } catch (e) {
    return null;
  }
}

async function collectC9(url) {
  const cacheKey = url;
  const cached = c9Cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return { collected: true, ...cached.data };

  try {
    let page = await extractPageText(url);

    // Retry #1: UA Googlebot (nhiều trang chặn bot thường vẫn phục vụ googlebot)
    if (!page || !page.body) {
      const googlebot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
      page = await extractPageText(url, googlebot);
    }
    // Retry #2: đổi scheme https -> http (một số vhost redirect khác)
    if (!page || (!page.body && !page.desc && !page.title)) {
      try {
        const u = new URL(url);
        if (u.protocol === 'https:') {
          u.protocol = 'http:';
          const httpPage = await extractPageText(u.toString(), 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
          if (httpPage) page = httpPage;
        }
      } catch (e) { /* bỏ qua */ }
    }

    if (!page) {
      return { collected: false, risk: 0, summary: null, category: null };
    }

    // Nội dung tối thiểu để LLM phân tích: body, nếu rỗng thì dùng meta/title/h1/og
    const hasSignal = page.body || page.title || page.desc || page.h1 || page.ogSite;
    if (!hasSignal) {
      return { collected: false, risk: 0, summary: null, category: null };
    }

    // Không gọi LLM nếu chưa cấu hình → vẫn báo collected nhưng không chấm
    let analysis = null;
    const textSample = `TITLE: ${page.title}\nSITE: ${page.ogSite}\nH1: ${page.h1}\nDESC: ${page.desc}\nBODY: ${page.body}`;
    const llmReady = await isLLMConfigured();
    if (llmReady) {
      // Bước 1: OpenRouter free (Nemotron Ultra) — tóm tắt + phân loại + chấm điểm trong 1 call
      if (isOpenRouterConfigured()) {
        const ultraPrompt = 'Bạn là chuyên gia an toàn thông tin Việt Nam. Phân tích nội dung website được cho rồi trả về JSON tuyệt đối không thêm bất kỳ text nào khác. Schema: {"summary":"<tóm tắt 1-2 câu bằng tiếng Việt: web này làm gì>","category":"<một trong: legit_business|ecommerce|news|blog|gov_edu|gambling|scam|phishing|parked|redirect|adult|unknown>","risk":<số nguyên 0-100: 0=hoàn toàn bình thường (doanh nghiệp thật/tin tức), 30=đáng ngờ, 60=lừa đảo/cờ bạc rõ ràng, 90=phishing nguy hiểm>","keywords":["<5 từ khóa chính>"]}. Phải MỞ ĐẦU câu trả lời bằng ký tự { một cách trực tiếp.';
        try {
          const safetyRaw = await openrouterChat([
            { role: 'system', content: ultraPrompt },
            { role: 'user', content: `Nội dung website:\n"""\n${textSample}\n"""` }
          ], { temperature: 0.1, maxTokens: 450, jsonMode: true, timeout: 45000 });

          const rawStr = String((safetyRaw && typeof safetyRaw === 'object') ? JSON.stringify(safetyRaw) : safetyRaw || '');
          const start = rawStr.indexOf('{');
          const end = rawStr.lastIndexOf('}');
          if (start !== -1 && end > start) {
            const parsed = JSON.parse(rawStr.slice(start, end + 1));
            analysis = {
              summary: String(parsed.summary || '').substring(0, 300),
              category: String(parsed.category || 'unknown'),
              risk: clamp(Number(parsed.risk) || 0, 0, 100),
              keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
            };
            console.log(`[riskEngineV2] c9 OpenRouter: category=${analysis.category} risk=${analysis.risk} summary=${String(analysis.summary).substring(0, 60)}`);
          }
        } catch (e) {
          console.warn(`[riskEngineV2] c9 OpenRouter error: ${e.message}`);
        }
      }

      // Fallback: nếu OpenRouter không khả dụng → dùng llmChat (Groq/Gemini/DeepSeek/Ollama)
      if (!analysis) {
        const systemPrompt = 'Bạn là chuyên gia an toàn thông tin Việt Nam. Phân tích nội dung website được cho và trả về JSON tuyệt đối không có text khác. Schema: {"summary":"<tóm tắt 1-2 câu web này về gì, bằng tiếng Việt>","category":"<legit_business|ecommerce|news|blog|gov_edu|gambling|scam|phishing|parked|redirect|adult|unknown>","risk":<số nguyên 0-100: 0=hoàn toàn bình thường, 30=đáng ngờ, 60=lừa đảo/cờ bạc rõ, 90=phishing nguy hiểm>,"keywords":["<5 từ khóa chính>"]}.';
        try {
          const raw = await llmChat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Nội dung website:\n"""\n${textSample}\n"""` }
          ], { temperature: 0.1, maxTokens: 400, jsonMode: true, timeout: 45000 });

          const rawStr = String(raw || '');
          const start = rawStr.indexOf('{');
          const end = rawStr.lastIndexOf('}');
          if (start !== -1 && end > start) {
            const parsed = JSON.parse(rawStr.slice(start, end + 1));
            analysis = {
              summary: String(parsed.summary || '').substring(0, 300),
              category: String(parsed.category || 'unknown'),
              risk: clamp(Number(parsed.risk) || 0, 0, 100),
              keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
            };
          }
        } catch (e) {
        console.warn(`[riskEngineV2] c9 LLM error: ${e.message}`);
      }
      }
    }

    // Quy đổi category → điểm rủi ro (nếu LLM không trả risk hợp lý)
    const CATEGORY_RISK = {
      legit_business: 5, ecommerce: 8, news: 5, blog: 8, gov_edu: 2,
      parked: 35, redirect: 40, gambling: 70, adult: 55, scam: 80, phishing: 90, unknown: 20
    };
    let risk = analysis && typeof analysis.risk === 'number' ? analysis.risk : 15;
    if (analysis && analysis.category && analysis.category !== 'unknown') {
      risk = Math.max(risk, CATEGORY_RISK[analysis.category] || 15);
    }
    // Tiêu chí nội dung: nội dung bình thường + có LLM → coi như "collected" mạnh (C cao), risk thấp
    const result = {
      collected: true,
      risk: clamp(risk, 0, 90),
      summary: analysis ? analysis.summary : null,
      category: analysis ? analysis.category : null,
      keywords: analysis ? analysis.keywords : [],
      aiUsed: !!analysis,
      contentLength: page.htmlLength,
      title: page.title
    };
    c9Cache.set(cacheKey, { data: result, expiresAt: Date.now() + C9_CACHE_TTL });
    return result;
  } catch (e) {
    return { collected: false, risk: 0, summary: null, category: null };
  }
}

// ============ MAIN ORCHESTRATOR ============
async function verifyWebsite(input, opts = {}) {
  const start = Date.now();
  let normalizedUrl = input;
  if (!/^https?:\/\//i.test(normalizedUrl)) normalizedUrl = 'https://' + normalizedUrl;
  let url;
  try { url = new URL(normalizedUrl); }
  catch (e) { return { error: 'Invalid URL' }; }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const isPaaS = paasHosts.isPaaSHost(hostname);
  const paasToken = paasHosts.getUserToken(hostname);

  const [c1, c2, c3, c4, c5, c6, c7, c8, c9] = await Promise.all([
    collectC1(hostname),
    collectC2(hostname),
    collectC3(hostname),
    collectC4(normalizedUrl, hostname, isPaaS),
    collectC5(hostname),
    collectC6(hostname, paasToken),
    collectC7(normalizedUrl),
    collectC8(hostname),
    collectC9(normalizedUrl)
  ]);

  const criteria = { c1, c2, c3, c4, c5, c6, c7, c8, c9 };

  // C = tổng trọng số tiêu chí thu thập thành công
  let C = 0, collectedCount = 0;
  for (const k of Object.keys(WEIGHTS)) {
    if (criteria[k].collected) { C += WEIGHTS[k]; collectedCount++; }
  }
  C = clamp(C, 0, 1);

  // R = BlacklistTrigger + penalty c1..c7 (c8 chỉ là context, không phạt)
  const c6risk = c6.risk || 0;
  const c4risk = c4.risk || 0;
  const c2risk = c2.risk || 0;
  const c3risk = c3.risk || 0;
  const c1risk = c1.risk || 0;
  const c7risk = c7.risk || 0;
  const c9risk = c9.risk || 0;
  const blacklistTrigger = c5.blacklisted ? 100 : 0;
  let R = blacklistTrigger + c1risk + c2risk + c3risk + c4risk + c6risk + c7risk + c9risk;
  R = clamp(R, 0, 100);

  // Điều kiện 3 tiêu chí cốt lõi
  const coreOk = c1.collected && c2.collected && c3.collected &&
    c1.ageDays !== null && c1.ageDays >= 30 &&
    c2.risk === 0 &&
    c3.risk < 20;

  // Ma trận quyết định
  let state;
  if (R >= 80 || blacklistTrigger === 100) state = 'danger';          // 🔴 NGUY HIỂM
  else if (R >= 35) state = 'suspicious';                              // 🟠 ĐÁNG NGỜ
  else if (R < 35 && (C < 0.65 || !coreOk)) state = 'verify';          // 🟡 CẦN XÁC MINH THÊM
  else state = 'safe';                                                 // 🟢 AN TOÀN

  // Domain đã được xác minh chủ web (admin duyệt) → ép safe, trừ khi đang nằm trong blacklist
  const verifiedEntry = verifiedDomains.isTrusted(hostname);
  if (verifiedEntry && blacklistTrigger !== 100) {
    state = 'safe';
    R = Math.min(R, 20);
  }

  // Lý do chính
  const reasons = [];
  if (blacklistTrigger === 100) reasons.push(`Nguy hiểm: domain có mặt trong danh sách đen bên thứ 3 (${c5.sources.join(', ')}).`);
  if (c4.cloakDetected) reasons.push('Phát hiện cloaking: nội dung trả về khác nhau theo User-Agent (bot thấy sạch, trình duyệt thấy nội dung đầy đủ).');
  if (isPaaS) reasons.push('Subdomain trên nền tảng PaaS/SaaS, không kế thừa uy tín của root domain.');
  if (c1.ageDays !== null && c1.ageDays < 7) reasons.push(`Domain mới tạo (<7 ngày), rủi ro lừa đảo rất cao.`);
  else if (c1.ageDays !== null && c1.ageDays < 30) reasons.push(`Domain mới (${c1.ageDays} ngày), cần thận trọng.`);
  if (c1.hijack) reasons.push('Domain tuổi cao nhưng vừa được đăng ký/cập nhật lại gần đây (nghi tái sử dụng domain hết hạn).');
  if (c6.matchedBrand) reasons.push(`Nghi vấn mạo danh thương hiệu "${c6.matchedBrand}" (typosquatting).`);
  if (c4.sensitiveForm) reasons.push('Phát hiện form nhạy cảm (mật khẩu/OTP/thẻ tín dụng) trên domain chưa xác minh thương hiệu.');
  if (c9.category && c9.risk >= 45) reasons.push(`Nội dung AI nhận diện: ${c9.summary || 'đáng ngờ'} (loại: ${c9.category}, rủi ro ${c9.risk}/100).`);
  else if (c9.summary) reasons.push(`AI tóm tắt nội dung: ${c9.summary}`);
  if (verifiedEntry) reasons.push(`Domain đã được xác minh chủ sở hữu (${verifiedEntry.note || 'Lá Chắn Số'}) — ngày ${new Date(verifiedEntry.verifiedAt).toLocaleDateString('vi-VN')}.`);
  if (state === 'verify') reasons.push(`Chưa đủ tiêu chí đánh giá để xác minh (C=${C.toFixed(2)}, domain ${c1.ageDays !== null ? c1.ageDays + ' ngày' : 'không xác định được'}).`);

  return {
    state,
    R: Math.round(R),
    C: +C.toFixed(2),
    collectedCriteria: collectedCount,
    criteria: Object.fromEntries(Object.entries(criteria).map(([k, v]) => [
      k, { collected: v.collected, risk: v.risk || 0 }
    ])),
    reasons,
    isPaaS,
    paasToken,
    cloakDetected: !!c4.cloakDetected,
    blacklistSources: c5.sources || [],
    thirdParty: c5.thirdParty || [],
    ipInfo: c5.ipInfo || { collected: false, detail: {} },
    aiAnalysis: {
      available: !!c9.summary,
      summary: c9.summary || null,
      category: c9.category || null,
      risk: c9.risk || 0,
      keywords: c9.keywords || []
    },
    ownerVerify: { available: state === 'verify' },
    verified: !!verifiedEntry,
    verifiedDomain: verifiedEntry ? {
      note: verifiedEntry.note,
      category: verifiedEntry.category,
      trustScore: verifiedEntry.trustScore,
      verifiedAt: verifiedEntry.verifiedAt
    } : null,
    coreCriteriaOk: coreOk,
    executionTimeMs: Date.now() - start
  };
}

module.exports = { verifyWebsite, WEIGHTS, collectC1, collectC2, collectC3, collectC4, collectC5, collectC6, collectC7, collectC8, collectC9 };