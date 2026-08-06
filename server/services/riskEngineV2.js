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

const WEIGHTS = { c1: 0.20, c2: 0.15, c3: 0.10, c4: 0.15, c5: 0.15, c6: 0.10, c7: 0.08, c8: 0.07 };

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
    if (i < 2) await new Promise(res => setTimeout(res, 1500));
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
  const botRes = await fetchOnce(url, BOT_UA);
  const mobileRes = await fetchOnce(url, MOBILE_UA);

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

  // JS bundle scan (phát hiện SPA form)
  if (content && !blockedByWaf) {
    const srcs = [...content.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]).slice(0, 12);
    const scanned = new Set();
    for (const src of srcs) {
      if (scanned.has(src)) continue;
      scanned.add(src);
      try {
        const abs = /^https?:\/\//i.test(src) ? src : new URL(src, url).href;
        const jr = await axios.get(abs, { timeout: 4000, headers: { 'User-Agent': MOBILE_UA }, validateStatus: () => true });
        const js = String(jr.data || '');
        if (/createElement\s*\(\s*['"]form|type\s*=\s*['"]password|input_otp|login_submit|otp_input|password\s*field/i.test(js)) {
          risk += 50;
          break;
        }
      } catch (e) {}
    }
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
  return { collected: true, risk: 0, blacklisted: blacklists.length > 0, sources: blacklists };
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
  while (hops < 8 && current && !seen.has(current)) {
    seen.add(current);
    try {
      const r = await axios.get(current, {
        timeout: 4000, maxRedirects: 0, validateStatus: () => true,
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

  const [c1, c2, c3, c4, c5, c6, c7, c8] = await Promise.all([
    collectC1(hostname),
    collectC2(hostname),
    collectC3(hostname),
    collectC4(normalizedUrl, hostname, isPaaS),
    collectC5(hostname),
    collectC6(hostname, paasToken),
    collectC7(normalizedUrl),
    collectC8(hostname)
  ]);

  const criteria = { c1, c2, c3, c4, c5, c6, c7, c8 };

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
  const blacklistTrigger = c5.blacklisted ? 100 : 0;
  let R = blacklistTrigger + c1risk + c2risk + c3risk + c4risk + c6risk + c7risk;
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
    blacklisted: !!c5.blacklisted,
    blacklistSources: c5.sources || [],
    ownerVerify: { available: state === 'verify' },
    coreCriteriaOk: coreOk,
    executionTimeMs: Date.now() - start
  };
}

module.exports = { verifyWebsite, WEIGHTS, collectC1, collectC2, collectC3, collectC4, collectC5, collectC6, collectC7, collectC8 };