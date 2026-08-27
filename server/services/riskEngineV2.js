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
const https = require('https');
const dns = require('dns').promises;
const tls = require('tls');
const cheerio = require('cheerio');
const brandPatterns = require('../config/brandPatterns');
const paasHosts = require('../config/paasHosts');
const thirdParty = require('./thirdPartyChecker');
const verifiedDomains = require('./verifiedDomains');
const { llmChat, isLLMConfigured } = require('./llmClient');
const { openrouterChat, isOpenRouterConfigured } = require('./openrouterClient');
const ssrfGuard = require('./ssrfGuard');

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

  // Expired domain hijacking: RDAP event "updated sau khi cũ" KHÔNG phải dấu hiệu hijack —
  // "last changed" thường là đổi DNS/nameserver của chính doanh nghiệp, gây false positive cho web thật.
  // Vậy chỉ phạt khi (a) domain cũ, (b) VÀ đăng ký lại thật sự (RDAP trả registration gần đây) — nhưng
  // ageDays đã bắt case registration mới rồi. Nên bỏ phạt "updated" hoàn toàn; hijack chỉ đặt true để ghi chú.
  let hijack = false;
  if (ageDays !== null && ageDays > 365 && updatedDays !== null && updatedDays < 30) {
    hijack = true; // chỉ là tín hiệu tham khảo: nameserver/DNS vừa đổi — không phạt
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
    // SSRF guard: chặn redirect/URL nội bộ ngay tại điểm fetch
    const safe = await ssrfGuard.assertSafeUrl(url);
    if (!safe.ok) return { status: 0, html: '' };
    const r = await axios.get(url, {
      timeout: 6000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
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
  let creditCardDetected = false;
  let jsLoginDetected = false;
  let obfuscatedJsDetected = false;
  let cryptoWalletDetected = false;
  let suspiciousIframeDetected = false;
  let contactOnly = false;
  let govImpersonationDetected = false;
  let govContentMatched = false;
  if (content && !blockedByWaf) {
    const $ = cheerio.load(content);
    const pageText = content.toLowerCase();

    const hasSensitive = SENSITIVE_FORM_MARKERS.some(m => pageText.includes(m));
    const hasContact = CONTACT_FORM_MARKERS.some(m => pageText.includes(m));
    const hasLoginForm = $('input[type="password"], input[name*="pass"], input[name*="otp"], input[type="tel"][name*="otp"]').length > 0;

    // Form "thẻ tín dụng / thanh toán" — nhạy cảm hơn form đăng nhập thông thường
    const hasCreditCard = $('input[name*="card"], input[name*="cc"], input[type="number"][maxlength="16"]').length > 0;

// Mã độc: script inline bị encode/xáo trộn — CHỈ báo khi THỰC THI động mã ĐƯỢC MÃ HOÁ.
    // Lưu ý: "Function(\"return this\")" là pattern phổ biến trong polyfill hợp pháp để lấy globalThis —
    // KHÔNG phải mã độc. Chỉ flag khi (a) eval/Function nạp chuỗi từ atob/btoa/decode, hi (b) param chứa
    // escape hex/unicode dày đặc, hoặc (c) base64 dài — tức mã đang bị giải ngược trước khi chạy.
    // (hex \x, unicode \u, fromCharCode ĐƠN LẺ trong bundle/analytics hợp pháp — momo inline có 3451 escape, GA tag dùng atob.)
const inlineJs = $('script:not([src])').text() || '';
    // 1) eval/Function nạp chuỗi từ atob/btoa/decode (giải ngược ngay khi chạy)
    const inlineDecodedExec = /\beval\s*\(\s*(?:atob|btoa|decodeURIComponent|unescape)\s*\(/i.test(inlineJs) ||
      /\bnew Function\s*\(\s*(?:atob|btoa|decodeURIComponent|unescape)\s*\(/i.test(inlineJs);
    // 2) chuỗi literal sau eval(" mở đầu chứa escape hex/unicode (\x.. \u....)
    const inlineCipherArg = /\beval\s*\(\s*["'`][^"'`\n]*\\[xXuU][0-9a-fA-F]{2,4}/i.test(inlineJs) ||
      /\bnew Function\s*\(\s*["'`][^"'`\n]*\\[xXuU][0-9a-fA-F]{2,4}/i.test(inlineJs);
    // 3) param là chuỗi base64/string dài được tạo động cho eval
    const inlineLongArgEval = /\beval\s*\(\s*["'`][A-Za-z0-9+/=]{40,}["'`]/i.test(inlineJs) ||
      /\bnew Function\s*\(\s*["'`][^"'`]{60,}["'`]/i.test(inlineJs);
    // Loại trừ pattern vô hại: Function("return this") dùng lấy globalThis trong polyfill
    const harmlessGlobalThis = /Function\s*\(\s*["'`](?:return\s+(?:this|globalThis)|[^"'`]{0,20}return\s+this)/i.test(inlineJs);
    if ((inlineDecodedExec || inlineCipherArg || inlineLongArgEval) && !harmlessGlobalThis) {
      obfuscatedJsDetected = true;
    }

    // Ví crypto: CUỘC CHIẾN false positive — HTML dài chứa nhiều chuỗi base58/hex vô nghĩa và từ "wallet/bitcoin".
    // Chỉ báo khi một ĐỊA CHỈ VÍ THẬT (độ dài chuẩn: ETH 0x…40, BTC bc1…, TRON T…) xuất hiện trong trang
    // VÀ ngữ cảnh "ví/nạp/gửi/chuyển tiền mã hóa" nằm ở vùng gần đó (không phải mục khác trong trang).
    const ethAddresses = pageText.match(/0x[a-fA-F0-9]{40}\b/g) || [];
    const btcAddresses = pageText.match(/bc1[a-zA-HJ-NP-Z0-9]{25,39}\b/g) || [];
    const tronAddresses = pageText.match(/\bT[a-zA-HJ-NP-Z0-9]{33}\b/g) || [];
    const addrCount = ethAddresses.length + btcAddresses.length + tronAddresses.length;
    const payIndicators = /(?:nạp|gửi|chuyển|nộp)\s*(?:tiền|vào|tới)?\s*(?:ví|wallet|crypto|tiền mã hóa|coin|token)|(?:ví|wallet)\s*(?:điện tử|mã hóa|crypto)?\s*(?:nạp|gửi|nhận|address|địa chỉ)|\b(?:usdt|btc|eth|usdc|trc20|erc20|bep20)\b/i;
    if (addrCount > 0 && payIndicators.test(pageText)) {
      cryptoWalletDetected = true;
    }

    // Iframe ẩn (ẩn theo style/zero-size) — nghi tải trang bên thứ 3 lén lút
    const hiddenIframes = $('iframe').filter(function () {
      const st = ($(this).attr('style') || '') + ' ' + ($(this).attr('width') || '') + ' ' + ($(this).attr('height') || '');
      return /display\s*:\s*none|visibility\s*:\s*hidden|width:\s*0|height:\s*0/i.test(st);
    }).length;
    if (hiddenIframes > 0) suspiciousIframeDetected = true;

    // Nội dung nhái cơ quan nhà nước (chỉ đánh dấu — quyết định phạt ở cuối hàm)
    govContentMatched = /(?:cổng dịch vụ công|cổng thông tin|dịch vụ công quốc gia|chính phủ điện tử|bảo hiểm xã hội|nộp phạt|tra cứu thủ tục|(?:hải quan|thuế|kho bạc|công an|cán bộ|ủy ban nhân dân|bộ gtvt|bộ tài chính) (?:điện tử|online|trực tuyến)?)/i.test(pageText);

    if (hasLoginForm || hasCreditCard) {
      sensitiveForm = true;
      // Không cộng điểm cứng 50 — chỉ đánh dấu. Điểm thật sẽ được cộng theo bối cảnh
      // (mã độc / cloaking / mạo danh / AI xác nhận dạng web) ở phần rủi ro cuối hàm.
      if (hasCreditCard) creditCardDetected = true;
    } else if (hasSensitive && !hasContact) {
      risk += 15; // từ khoá nhạy cảm nhưng không phải hàm đăng nhập thật
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
        const safe = await ssrfGuard.assertSafeUrl(abs);
        if (!safe.ok) return;
        const jr = await axios.get(abs, { timeout: 3000, headers: { 'User-Agent': MOBILE_UA }, validateStatus: () => true });
        const js = String(jr.data || '');
        if (/createElement\s*\(\s*['"]form|type\s*=\s*['"]password|input_otp|login_submit|otp_input|password\s*field/i.test(js)) {
          jsLoginDetected = true;
        }
        // Bundle: chỉ báo khi THỰC THI động mã được mã hoá — bỏ các đơn lẻ eval/atob/Function("return this")
        const bundleDecodedExec = /\beval\s*\(\s*(?:atob|btoa|decodeURIComponent|unescape)\s*\(/i.test(js) ||
          /\bnew Function\s*\(\s*(?:atob|btoa|decodeURIComponent|unescape)\s*\(/i.test(js) ||
          /\beval\s*\(\s*["'`][^"'`\n]*\\[xXuU][0-9a-fA-F]{2,4}/i.test(js);
        const bundleLongEval = /\beval\s*\(\s*["'`][A-Za-z0-9+/=]{40,}["'`]/i.test(js) ||
          /\bnew Function\s*\(\s*["'`][^"'`]{60,}["'`]/i.test(js);
        const bundleHarmless = /Function\s*\(\s*["'`](?:return\s+(?:this|globalThis)|[^"'`]{0,20}return\s+this)/i.test(js);
        if ((bundleDecodedExec || bundleLongEval) && !bundleHarmless) obfuscatedJsDetected = true;
      } catch (e) {}
    }));
  }

  // ===== Mạo danh form GOV / cơ quan nhà nước =====
  // Trang có form đăng nhập + nội dung nhái "cổng dịch vụ công / thuế / BHXH / hải quan..."
  // nhưng domain không thuộc nhà nước (.gov.vn, chinhphu.vn...) → phạt nặng kể cả khi AI xếp sai loại.
  const govHost =
    /(?:\.gov\.vn|\.gov|\.edu\.vn)$/i.test(hostname) ||
    /^(?:chinhphu|dichvucong|baochinhphu|thuvienphapluat)\.vn$/i.test(hostname);
  const hasFormAny = sensitiveForm || jsLoginDetected;
  if (hasFormAny && govContentMatched && !govHost && !blockedByWaf) {
    risk = Math.max(risk, 65);
    govImpersonationDetected = true;
  }

  // Bối cảnh phạt: chỉ cộng mạnh khi có bằng chứng nguy hiểm chứ không chỉ riêng form
  if (hasFormAny) {
    if (cryptoWalletDetected) risk += 45;           // form + ví crypto
    else if (suspiciousIframeDetected) risk += 40;  // form + iframe ẩn
    else if (creditCardDetected) risk += 35;         // form thu tiền / thẻ
    else if (obfuscatedJsDetected) risk += 20;       // form + JS bị nén/mã hoá (bundle hiện đại khó phân biệt)
    else risk += 12;                                 // form đăng nhập/đăng ký SPA thông thường
  }

  // ===== Trang chưa có nội dung / placeholder của hosting =====
  // Domain trỏ đúng IP hosting nhưng chưa cài website (cPanel default page, Apache/nginx default,
  // "This domain is parked"...) → chưa thể coi là an toàn tuyệt đối.
  const parkedPageDetected = !!(content && !blockedByWaf &&
    /defaultwebpage\.cgi|domain\s+is\s+(?:pointed\s+to\s+.{0,40}IP|currently\s+parked)|hosting\s+has\s+not\s+been\s+(?:set\s+up|configured)|web\s+site\s+has\s+not\s+(?:been\s+)?(?:set\s+up|uploaded|configured)|this\s+domain\s+is\s+(?:a\s+)?placehold|parked\s+domain|apache2?\s+ubuntu\s+default\s+page|nginx\s+default\s+page|this\s+is\s+the\s+default\s+(?:web\s+page|public\s+html)|site\s+not\s+configured|getting\s+started\s+with\s+web\s+hosting/i.test(content.toLowerCase()));
  if (parkedPageDetected) {
    risk = Math.max(risk, 30);
  }

  // Trang trả nội dung cực ngắn (placeholder SSH/Lỗi/ưq, <200 ký tự) — tên miền chưa thực sự có
  // nội dung → không coi là "an toàn tuyệt đối", chuyển về verify.
  // Lưu ý: KHÔNG loại trừ blockedByWaf ở đây, vì nhiều host trả 403/trang lỗi cực ngắn
  // (vd "SSL not found" — cert lệch hostname). Nội dung càng minh bạch thì càng dễ lọc.
  const trimmedContent = content ? content.trim() : '';
  const placeholderPageDetected = !parkedPageDetected &&
    trimmedContent.length > 0 && trimmedContent.length < 200 &&
    !/cf_chl|challenge-platform|turnstile|under.?attack|cf-browser/i.test(trimmedContent);
  if (placeholderPageDetected) {
    risk = Math.max(risk, 30);
  }

  // Không đọc được nội dung gì cả (TLS lệch cert, reset connection, ...) — KHÔNG có quyền kết luận an toàn.
  const fetchFailedDetected = botRes.status === 0 && mobileRes.status === 0;
  if (fetchFailedDetected) {
    risk = Math.max(risk, 30);
  }

  return {
    collected: true, risk: clamp(risk, 0, 90), blockedByWaf,
    cloakDetected, sensitiveForm, creditCardDetected, jsLoginDetected, obfuscatedJsDetected,
    cryptoWalletDetected, suspiciousIframeDetected, contactOnly, govImpersonationDetected,
    parkedPageDetected, placeholderPageDetected, fetchFailedDetected,
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
    sources: blacklists, // mảng object đầy đủ (giữ để frontend hiển thị chi tiết)
    sourceNames: blacklists.map((b) => b.source || 'feed'),
    blacklistSources: blacklists.map((b) => b.source || 'feed'),
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
      const safe = await ssrfGuard.assertSafeUrl(current);
      if (!safe.ok) break;
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
    const safe = await ssrfGuard.assertSafeUrl(url);
    if (!safe.ok) return null;
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
        const parseAware = (raw) => {
          const rawStr = String((raw && typeof raw === 'object') ? JSON.stringify(raw) : raw || '');
          const start = rawStr.indexOf('{');
          const end = rawStr.lastIndexOf('}');
          if (start === -1 || end <= start) return null;
          try {
            const parsed = JSON.parse(rawStr.slice(start, end + 1));
            return {
              summary: String(parsed.summary || '').substring(0, 300),
              category: String(parsed.category || 'unknown'),
              risk: clamp(Number(parsed.risk) || 0, 0, 100),
              keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
            };
          } catch (e) {
            return null;
          }
        };
        try {
          const safetyRaw = await openrouterChat([
            { role: 'system', content: ultraPrompt },
            { role: 'user', content: `Nội dung website:\n"""\n${textSample}\n"""` }
          ], { temperature: 0.1, maxTokens: 450, jsonMode: true, timeout: 25000 });
          const maybe = safetyRaw ? parseAware(safetyRaw) : null;
          if (maybe && maybe.summary) {
            analysis = maybe;
            console.log(`[riskEngineV2] c9 OpenRouter: category=${analysis.category} risk=${analysis.risk} summary=${String(analysis.summary).substring(0, 60)}`);
          }
        } catch (e) {
          console.warn(`[riskEngineV2] c9 OpenRouter error: ${e.message}`);
        }
        // Nếu OpenRouter trả rỗng / thiếu summary → thử lại ngay bằng chuỗi fallback nhẹ
        // (Groq/Gemini/DeepSeek/Ollama) thay vì bỏ cuộc, tránh lỗi fail kéo dài luôn làm mất AI summary.
        if (!analysis) {
          try {
            const raw2 = await llmChat(
              [
                { role: 'system', content: ultraPrompt },
                { role: 'user', content: `Nội dung website:\n"""\n${textSample}\n"""` }
              ],
              { temperature: 0.1, maxTokens: 400, jsonMode: true, preferFastProvider: true, timeout: 30000 }
            );
            const maybe2 = raw2 ? parseAware(raw2) : null;
            if (maybe2 && maybe2.summary) {
              analysis = maybe2;
              console.log(`[riskEngineV2] c9 fallback: category=${analysis.category} risk=${analysis.risk} summary=${String(analysis.summary).substring(0, 60)}`);
            }
          } catch (e) {
          }
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
  let c6risk = c6.risk || 0;
  const c4riskRaw = c4.risk || 0;
  const c2risk = c2.risk || 0;
  const c3risk = c3.risk || 0;
  const c1risk = c1.risk || 0;
  const c7risk = c7.risk || 0;
  const c9risk = c9.risk || 0;
  const blacklistTrigger = c5.blacklisted ? 100 : 0;

  // ===== Bối cảnh form: nếu AI xác nhận đây là web doanh nghiệp/SaaS/tin tức thật
  // và KHÔNG có mã độc nghiêm trọng / cloaking / mạo danh / blacklist → không phạt vì có form đăng ký/đăng nhập.
  const aiLegitCategory = ['legit_business', 'ecommerce', 'news', 'blog', 'gov_edu'].includes(c9.category);
  // Mã độc "nặng": ví crypto / iframe ẩn / cloaking (JS nén nhẹ trong bundle hiện đại không tính — quá phổ biến)
  const noMalwareSignals = !c4.cryptoWalletDetected && !c4.suspiciousIframeDetected && !c4.cloakDetected;
  const noImpersonation = !c6.matchedBrand && !c4.govImpersonationDetected;
  const formOnly = c4.creditCardDetected ? false : (c4.sensitiveForm || c4.jsLoginDetected);
  let c4risk = c4riskRaw;
  if (blacklistTrigger !== 100 && aiLegitCategory && noMalwareSignals && noImpersonation && formOnly) {
    c4risk = Math.min(c4risk, 10); // form bình thường trên web thật → gần 0
  }

  // c6: phần phạt do "entropy" (tên miền có chữ số/dài như doanh nghiệp thật hay dùng "24h", "giare", "online"…)
  // KHÔNG phải mạo danh — bỏ hẳn khi AI xác nhận doanh nghiệp thật và không có matchedBrand (mạo danh thật).
  if (blacklistTrigger !== 100 && c6.matchedBrand === null && c6.entropy !== null && aiLegitCategory && !c4.govImpersonationDetected) {
    c6risk = 0;
  }

  let R = blacklistTrigger + c1risk + c2risk + c3risk + c4risk + c6risk + c7risk + c9risk;
  R = clamp(R, 0, 100);

// Điều kiện 3 tiêu chí cốt lõi
  // ageDays = null (RDAP/WHOIS bị chặn, .vn nhiều nơi 404) KHÔNG tự động "verify" nếu các tín hiệu
  // còn lại sạch và AI xác nhận doanh nghiệp thật → vẫn mở an toàn, tránh phạt nhầm web doanh nghiệp chính thức.
  const ageOk = c1.ageDays === null
    ? (R <= 20 && aiLegitCategory && blacklistTrigger !== 100) // không xác định được tuổi nhưng mọi thứ sạch + AI legit
    : c1.ageDays >= 30;
  const coreOk = c1.collected && c2.collected && c3.collected &&
    ageOk &&
    c2.risk === 0 &&
    c3.risk < 20;

  // Ma trận quyết định
  let state;
  if (R >= 80 || blacklistTrigger === 100) state = 'danger';          // 🔴 NGUY HIỂM
  else if (R >= 35) state = 'suspicious';                              // 🟠 ĐÁNG NGỜ
  else if (R < 35 && (C < 0.65 || !ageOk)) state = 'verify';           // 🟡 CẦN XÁC MINH THÊM
  else state = 'safe';                                                 // 🟢 AN TOÀN

  // Domain đã được xác minh chủ web (admin duyệt) → ép safe MẠNH, kể cả khi blacklist feed
  // bắt nhầm qua subdomain root (vd sites.google.com → root google.com). Admin tự chủ nó là trusted.
  const verifiedEntry = verifiedDomains.isTrusted(hostname);
  if (verifiedEntry) {
    state = 'safe';
    R = 0;
  }

  // Domain chính phủ / giáo dục (.gov.vn, .gov, .edu.vn) → tin tưởng cao.
  // NHƯNG chỉ khi tín hiệu sạch: không typosquat thương hiệu, không giả mạo nhà nước,
  // không cloaking, không blacklist và HTTPS hợp lệ. Nếu không → giã phạt phút như web thường
  // (ví dụ dichvucon.gov.vn giả dichvucong.gov.vn KHÔNG được 100 điểm).
  const govTld = /(?:\.gov\.vn|\.gov|\.edu\.vn)$/i.test(hostname) ||
    /^(?:chinhphu|dichvucong|baochinhphu|thuvienphapluat|daihoc)\.vn$/i.test(hostname);
  const govTrusted = govTld &&
    !c6.matchedBrand &&
    !c4.govImpersonationDetected &&
    !c4.cloakDetected &&
    c2.risk === 0 &&
    blacklistTrigger !== 100;
  if (govTrusted) {
    state = 'safe';
    R = 0;
  }

  // Trang placeholder của hosting (domain trỏ IP nhưng chưa cài website) → KHÔNG coi là an toàn.
  // Tuy không nguy hiểm nhưng chưa có nội dung thật → ép về 'verify' để người dùng tự kiểm tra,
  // và không gán nhầm 100 điểm (trừ khi đã được admin xác minh).
  const parkedPageDetected = !!c4.parkedPageDetected;
  const placeholderPageDetected = !!c4.placeholderPageDetected;
  const fetchFailedDetected = !!c4.fetchFailedDetected;
  const noContentYet = parkedPageDetected || placeholderPageDetected || fetchFailedDetected;
  if (noContentYet && !verifiedEntry && !govTrusted && blacklistTrigger !== 100) {
    R = Math.max(R, 30);
    if (state === 'safe') state = 'verify';
  }

  // Lý do chính — viết ngắn, dễ hiểu cho người dùng thường
  // Nếu được admin xác minh / thuộc gov → 100 điểm, không hiện các cảnh báo âm tích làm người dùng hoang mang.
  const forcedTrusted = !!verifiedEntry || !!govTrusted;
  const reasons = [];
  if (blacklistTrigger === 100 && state === 'danger' && !forcedTrusted) reasons.push(`Nguy hiểm: domain có trong danh sách lừa đảo bên thứ 3 (${(c5.sourceNames?.length ? c5.sourceNames : c5.sources).join(', ')}).`);
  if (c4.cloakDetected && state !== 'safe' && !forcedTrusted) reasons.push('Website "chơi khác" với máy quét: máy thấy sạch nhưng người dùng thấy nội dung khác — thủ thuật điển hình của trang lừa đảo.');
  if (isPaaS && !forcedTrusted) reasons.push('Trang đặt trên nền tảng miễn phí/dùng chung (PaaS) — chưa chắc là công ty thật.');
  if (!forcedTrusted && c1.ageDays !== null && c1.ageDays < 7) reasons.push('Tên miền vừa mới tạo dưới 1 tuần — trang lừa đảo thường vứt bỏ nhanh các tên miền mới.');
  else if (!forcedTrusted && c1.ageDays !== null && c1.ageDays < 30) reasons.push(`Tên miền chỉ mới ${c1.ageDays} ngày tuổi, cần thận trọng.`);
  if (c6.matchedBrand && !forcedTrusted) reasons.push(`Cẩn thận: tên miền giống thương hiệu "${c6.matchedBrand}" (cách vài ký tự) — có thể là web giả mạo.`);
  if (c4.govImpersonationDetected && !forcedTrusted) reasons.push('Trang nhái cơ quan nhà nước (cổng dịch vụ công, thuế, BHXH...) nhưng không phải tên miền chính phủ — tuyệt đối không đăng nhập hoặc nộp tiền!');
  if (formOnly && c4risk >= 25 && !forcedTrusted) reasons.push(c4.obfuscatedJsDetected || c4.suspiciousIframeDetected ? 'Trang có ô đăng nhập kèm dấu hiệu mã độc (mã ẩn / khung ẩn) — cẩn thận khi nhập mật khẩu.' : c4.creditCardDetected ? 'Trang có biểu mẫu thu thẻ tín dụng nhưng chưa xác minh được công ty — cẩn thận khi thanh toán.' : 'Trang có ô nhập mật khẩu/OTP kèm dấu hiệu lạ — cẩn thận khi đăng nhập.');
  if (c9.category && c9.risk >= 45 && !forcedTrusted) reasons.push(`Nội dung đáng ngờ theo phân tích: ${c9.summary || ''}`);
  if (verifiedEntry) reasons.push(`Đã xác minh chủ sở hữu (${verifiedEntry.note || 'Lá Chắn Số'}) — ngày ${new Date(verifiedEntry.verifiedAt).toLocaleDateString('vi-VN')}.`);
  if (parkedPageDetected && !verifiedEntry && !govTrusted) reasons.push('Website đang hiển thị trang mặc định của hosting — tên miền trỏ đến máy chủ nhưng chưa cài nội dung. Có thể là web chưa hoàn thiện hoặc tên miền giữ lại chưa dùng; hãy kiểm tra thêm.');
  if (placeholderPageDetected && !verifiedEntry && !govTrusted) reasons.push('Tên miền trỏ đến máy chủ nhưng chưa trả về nội dung thực (trang báo lỗi/giữ chỗ của hosting). Có thể là web chưa hoàn thiện — hãy tự kiểm tra thêm.');
  if (fetchFailedDetected && !verifiedEntry && !govTrusted) reasons.push('Không đọc được nội dung trang (kết nối/lỗi cấu hình HTTPS). Chưa đủ dữ liệu để khẳng định an toàn — hãy tự kiểm tra thêm.');
  if (state === 'verify') reasons.push('Chưa đủ dữ liệu để khẳng định an toàn (không xác minh được tuổi tên miền) — hãy tự kiểm tra thêm trước khi tin.');

  return {
    state,
    R: Math.round(R),
    C: +C.toFixed(2),
    collectedCriteria: collectedCount,
    criteria: Object.fromEntries(Object.entries(criteria).map(([k, v]) => {
      // Phản ánh điểm thực dùng khi tính R (c4/c6 đã được giảm theo bối cảnh AI legit)
      // Domain verified/gov tin tưởng tuyệt đối → tất cả tiêu chí = 0, kết quả sạch sẽ.
      let risk = v.risk || 0;
      if (k === 'c4') risk = c4risk;
      if (k === 'c6') risk = c6risk;
      if (forcedTrusted) risk = 0;
      return [k, { collected: v.collected, risk }];
    })),
    reasons,
    isPaaS,
    paasToken,
    cloakDetected: !!c4.cloakDetected,
    blacklistSources: c5.sourceNames?.length ? c5.sourceNames : (c5.sources || []).map((b) => b?.source || 'feed'),
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