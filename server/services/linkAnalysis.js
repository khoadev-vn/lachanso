const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dns = require('dns').promises;
const tls = require('tls');
const { URL } = require('url');
const tinnhiemmang = require('./tinnhiemmang');

function safeDateStr(value) {
  if (!value) return 'không rõ';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'không rõ';
  return d.toISOString().substring(0, 10);
}

const scamDataPath = path.join(__dirname, '../data/scamDomains.json');
const scamData = JSON.parse(fs.readFileSync(scamDataPath, 'utf8'));
const SCAM_DOMAINS = scamData.SCAM_DOMAINS || scamData.scamDomains || [];
const SCAM_BRAND_PATTERNS = scamData.SCAM_BRAND_PATTERNS || [];

// ============ TRUSTED DOMAINS WHITELIST ============
const trustedDomainsPath = path.join(__dirname, '../data/trustedDomains.json');
let TRUSTED_ROOT_DOMAINS = new Set();
try {
  const trustedData = JSON.parse(fs.readFileSync(trustedDomainsPath, 'utf8'));
  const allCategories = Object.values(trustedData.whitelist || {});
  for (const domains of allCategories) {
    if (Array.isArray(domains)) {
      for (const d of domains) {
        TRUSTED_ROOT_DOMAINS.add(d.toLowerCase().replace(/^www\./, ''));
      }
    }
  }
  console.log(`[LinkAnalysis] Loaded ${TRUSTED_ROOT_DOMAINS.size} trusted domains from whitelist.`);
} catch (e) {
  console.warn('[LinkAnalysis] Could not load trustedDomains.json:', e.message);
}

function isTrustedDomain(hostname) {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  if (TRUSTED_ROOT_DOMAINS.has(h)) return true;
  // Check if subdomain of trusted root (e.g., mail.google.com → google.com)
  const parts = h.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.');
    if (TRUSTED_ROOT_DOMAINS.has(candidate)) return true;
  }
  return false;
}

// ============ SSRF PROTECTION ============
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fd00:/i,
  /^fe80:/i,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
];

function isPrivateOrInternalIP(hostname) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  for (const pattern of PRIVATE_IP_RANGES) {
    if (pattern.test(h)) return true;
  }
  return false;
}

async function resolveAndCheckSSRF(hostname) {
  try {
    const addresses = await dns.resolve4(hostname);
    for (const addr of addresses) {
      for (const pattern of PRIVATE_IP_RANGES) {
        if (pattern.test(addr)) return true;
      }
    }
  } catch {}
  try {
    const addresses = await dns.resolve6(hostname);
    for (const addr of addresses) {
      const h = addr.toLowerCase();
      if (h === '::1' || h.startsWith('fc00:') || h.startsWith('fd00:') || h.startsWith('fe80:')) return true;
    }
  } catch {}
  return false;
}

// ============ GOOGLE SAFE BROWSING WARNING DETECTION ============
async function detectGoogleWarningPage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await axios.get(url, {
      signal: controller.signal,
      maxRedirects: 5,
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      validateStatus: (status) => status < 500
    });
    clearTimeout(timeout);
    
    const html = (response.data || '').toString().toLowerCase();
    
    const googleWarningPatterns = [
      'deceptive site ahead',
      'this site is deceptive',
      'the site ahead contains malware',
      'back to safety',
      'google safe browsing',
      'warning: visiting this web site may harm your computer',
      'this website has been reported as a deceptive site',
      'report this deceptive site',
      'why this page was blocked',
      'deceptive traffic warning',
      'has been reported as a deceptive site',
      'has been reported as a malicious site',
      'warning: potential security risk ahead',
      'your connection is not private',
      'this connection is not private',
      'the certificate for this site is not valid',
      'net::err_cert',
      'err_ssl_',
      "this site can't provide a secure connection",
      'chrome detected a phishing site',
      'safe browsing has detected malware',
      'this site is hosted on a suspicious domain',
      "the site you're trying to access is a known phishing site",
      'this website is a known phishing site',
      'phishing detected',
      'malware detected',
      'social engineering detected',
      'unwanted software detected'
    ];
    
    const hasWarningTitle = /<title[^>]*>(.*?(?:deceptive|malware|phishing|warning|danger|harmful|suspicious).*?)<\/title>/i.test(html);
    const hasWarningBody = googleWarningPatterns.some(pattern => html.includes(pattern));
    const hasBackToSafety = html.includes('back to safety') || html.includes('quay lại an toàn');
    const hasInterstitialStructure = 
      html.includes('safe-browsing') ||
      html.includes('google-warning') ||
      html.includes('warning-content') ||
      (html.includes('error-code') && html.includes('phishing'));
    
    const isWarning = hasWarningTitle || hasWarningBody || hasBackToSafety || hasInterstitialStructure;
    let warningType = 'unknown';
    
    if (html.includes('phishing') || html.includes('deceptive')) {
      warningType = 'phishing';
    } else if (html.includes('malware') || html.includes('malicious')) {
      warningType = 'malware';
    } else if (html.includes('social engineering')) {
      warningType = 'social_engineering';
    } else if (hasInterstitialStructure) {
      warningType = 'interstitial';
    }
    
    return { isWarning, warningType };
  } catch (error) {
    return { isWarning: false, warningType: 'fetch_error' };
  }
}

const DESTROYLIST_CHECK_ENDPOINT = 'https://api.destroy.tools/v1/check';
const DESTROYLIST_RAW_URL = 'https://raw.githubusercontent.com/phishdestroy/destroylist/main/rootlist/formats/primary_active/hosts.txt';
const RDAP_LOOKUP_URL = 'https://rdap.org/domain/';
const WAYBACK_MACHINE_API = 'https://web.archive.org/web/timemap/json/';
const CT_LOGS_API = 'https://crt.sh/?q=';

const SUSPICIOUS_TLDS = [
  '.ml', '.ga', '.cf', '.gq', '.tk', '.xyz', '.top', '.icu', '.cc', '.biz',
  '.click', '.link', '.today', '.online', '.space', '.pw', '.su', '.to',
  '.work', '.site', '.website', '.zip', '.mov', '.country', '.stream'
];

const URL_SHORTENERS = new Set([
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly',
  'rebrand.ly', 'shorturl.at', 'short.io', 'rb.gy', 'soo.gd'
]);

const BRAND_KEYWORDS = new Set(SCAM_BRAND_PATTERNS.flatMap((p) => p.keywords));

const CONFUSABLE_RANGES = [
  [0x0370, 0x03ff],
  [0x0400, 0x04ff],
  [0x1d00, 0x1d7f],
  [0x1e00, 0x1eff]
];

const cache = new Map();
const CACHE_TTL = {
  destroylist: 12 * 60 * 60 * 1000,
  whois: 24 * 60 * 60 * 1000,
  feed: 6 * 60 * 60 * 1000,
  ssl: 6 * 60 * 60 * 1000,
  content: 4 * 60 * 60 * 1000,
  redirect: 30 * 60 * 1000,
  dns: 12 * 60 * 60 * 1000
};

function cacheGet(key) {
  const item = cache.get(key);
  if (item && item.expires > Date.now()) return item.value;
  if (item) cache.delete(key);
  return null;
}

function cacheSet(key, value, ttl) {
  cache.set(key, { value, expires: Date.now() + ttl });
}

function extractHostname(input) {
  let candidate = input.trim();
  if (!candidate) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
    return { url, hostname: url.hostname.toLowerCase().replace(/^www\./, ''), protocol: url.protocol };
  } catch {
    return null;
  }
}

function isSuspiciousTld(hostname) {
  return SUSPICIOUS_TLDS.some((tld) => hostname.endsWith(tld));
}

function isIpHostname(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || /^\[?[0-9a-f:]+\]?$/i.test(hostname);
}

function hasHomoglyph(hostname) {
  for (const char of hostname) {
    const code = char.codePointAt(0);
    if (CONFUSABLE_RANGES.some(([lo, hi]) => code >= lo && code <= hi)) {
      return true;
    }
  }
  return false;
}

function hasPunycode(hostname) {
  return hostname.includes('xn--');
}

function hasAuthInjection(input) {
  return input.includes('@');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function matchScamDataset(hostname) {
  const exact = SCAM_DOMAINS.find((s) => s.domain === hostname || hostname.endsWith(`.${s.domain}`));
  if (exact) {
    return { ...exact, matchType: 'exact' };
  }
  const sub = SCAM_DOMAINS.find((s) => s.domain.split('.')[0] && hostname.endsWith(`.${s.domain.split('.').slice(-2).join('.')}`));
  if (sub) {
    return { ...sub, matchType: 'subdomain' };
  }
  return null;
}

function detectTyposquat(hostname) {
  const compact = hostname.replace(/[^a-z0-9]/g, '');
  for (const pattern of SCAM_BRAND_PATTERNS) {
    const isOfficial = pattern.officialDomains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    if (isOfficial) continue;
    const hasBrand = pattern.keywords.some((k) => compact.includes(k.replace(/[^a-z0-9]/g, '')));
    if (!hasBrand) continue;

    const officialCompact = pattern.officialDomains.map((d) => d.replace(/[^a-z0-9]/g, ''));
    const closeToOfficial = officialCompact.some((d) => {
      const dist = levenshtein(compact, d);
      return dist <= 2 && dist > 0;
    });

    if (closeToOfficial || isSuspiciousTld(hostname) || hasHomoglyph(hostname) || hasPunycode(hostname) || hostname.length > 40) {
      return {
        brand: pattern.brand,
        officialDomains: pattern.officialDomains,
        detail: `Tên miền chứa từ khóa thương hiệu "${pattern.brand}" nhưng không phải domain chính thức (${pattern.officialDomains.join(', ')}).`
      };
    }
  }
  return null;
}

// ============ NEW: SSL Certificate Analysis ============
async function checkSSLCertificate(hostname) {
  const cacheKey = `ssl:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  if (isPrivateOrInternalIP(hostname)) {
    return { available: false, valid: false, error: 'blocked_private_ip' };
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ available: false, valid: false, error: 'timeout' });
    }, 5000);

    try {
      const socket = tls.connect(443, hostname, {
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 4000
      }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        clearTimeout(timeout);

        if (!cert || !cert.subject) {
          resolve({ available: true, valid: false, error: 'no_cert', issuer: null, expiry: null, daysLeft: null, selfSigned: true });
          return;
        }

        const issuer = cert.issuer?.CN || cert.issuer?.O || 'Unknown';
        const subject = cert.subject?.CN || hostname;
        const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const daysLeft = validTo ? Math.floor((validTo.getTime() - Date.now()) / 86400000) : null;
        const isExpired = validTo ? validTo.getTime() < Date.now() : false;
        const selfSigned = issuer === subject || issuer === 'Unknown';
        const trustedIssuers = ['Let\'s Encrypt', 'DigiCert', 'Cloudflare', 'Google Trust Services', 'Sectigo', 'GlobalSign', 'Amazon', 'Microsoft'];
        const isTrustedIssuer = trustedIssuers.some(t => issuer.toLowerCase().includes(t.toLowerCase()));

        resolve({
          available: true,
          valid: !isExpired && !selfSigned,
          issuer,
          subject,
          validFrom: validFrom?.toISOString(),
          validTo: validTo?.toISOString(),
          daysLeft,
          isExpired,
          selfSigned,
          isTrustedIssuer,
          error: null
        });
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({ available: false, valid: false, error: 'connection_failed' });
      });

      socket.on('timeout', () => {
        socket.destroy();
        clearTimeout(timeout);
        resolve({ available: false, valid: false, error: 'timeout' });
      });
    } catch (e) {
      clearTimeout(timeout);
      resolve({ available: false, valid: false, error: e.message });
    }
  });
}

// ============ NEW: Redirect Chain Analysis ============
async function followRedirects(inputUrl, maxRedirects = 5) {
  const cacheKey = `redirect:${inputUrl}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const chain = [];
  let currentUrl = inputUrl;
  const visited = new Set();

  try {
    for (let i = 0; i < maxRedirects; i++) {
      if (visited.has(currentUrl)) break;
      visited.add(currentUrl);

      const parsed = new URL(currentUrl);

      if (isPrivateOrInternalIP(parsed.hostname) || await resolveAndCheckSSRF(parsed.hostname)) {
        console.warn(`[SSRF] Blocked redirect to internal/private host: ${parsed.hostname}`);
        break;
      }

      chain.push({
        url: currentUrl,
        hostname: parsed.hostname.replace(/^www\./, ''),
        protocol: parsed.protocol
      });

      const response = await axios.head(currentUrl, {
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: (s) => s >= 200 && s < 400,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }).catch(() => null);

      if (!response || !response.headers?.location) break;
      const nextUrl = new URL(response.headers.location, currentUrl).toString();
      currentUrl = nextUrl;
    }
  } catch {
    // ignore
  }

  const result = {
    chainLength: chain.length,
    redirects: chain,
    domainChanged: chain.length >= 2 && chain[0].hostname !== chain[chain.length - 1].hostname,
    finalHostname: chain.length > 0 ? chain[chain.length - 1].hostname : null,
    suspiciousRedirect: chain.length >= 3,
    crossDomainRedirect: chain.length >= 2 ? chain.filter((c, i) => i > 0 && c.hostname !== chain[0].hostname).length > 0 : false
  };

  cacheSet(cacheKey, result, CACHE_TTL.redirect);
  return result;
}

// ============ NEW: DNS Reputation Check ============
async function checkDnsReputation(hostname) {
  const cacheKey = `dns:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = { available: false, hasMx: false, hasSpf: false, hasDmarc: false, mxRecords: [], txtRecords: [] };

  try {
    const [mxRecords, txtRecords] = await Promise.all([
      dns.resolveMx(hostname).catch(() => []),
      dns.resolveTxt(hostname).catch(() => [])
    ]);

    result.available = true;
    result.mxRecords = (mxRecords || []).map(r => ({ exchange: r.exchange, priority: r.priority }));
    result.hasMx = result.mxRecords.length > 0;

    const allTxt = (txtRecords || []).flat().map(t => t.toLowerCase());
    result.txtRecords = allTxt;
    result.hasSpf = allTxt.some(t => t.includes('v=spf1'));
    result.hasDmarc = false;

    try {
      const dmarcRecords = await dns.resolveTxt(`_dmarc.${hostname}`).catch(() => []);
      const dmarcFlat = (dmarcRecords || []).flat().map(t => t.toLowerCase());
      result.hasDmarc = dmarcFlat.some(t => t.includes('v=dmarc1'));
    } catch {
      // ignore
    }

    result.legitimacyScore = (result.hasMx ? 1 : 0) + (result.hasSpf ? 1 : 0) + (result.hasDmarc ? 1 : 0);
  } catch {
    result.available = false;
  }

  cacheSet(cacheKey, result, CACHE_TTL.dns);
  return result;
}

// ============ NEW: Page Content Phishing Detection ============
async function analyzePageContent(url, hostname) {
  const cacheKey = `content:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const result = {
    available: false,
    hasLoginForm: false,
    hasPasswordField: false,
    urgencyScore: 0,
    cryptoWalletDetected: false,
    externalResources: 0,
    obfuscatedScripts: 0,
    suspiciousIframes: 0,
    contactInfo: null,
    pageLanguage: null,
    title: null,
    phishingSignals: []
  };

  try {
    if (isPrivateOrInternalIP(hostname) || await resolveAndCheckSSRF(hostname)) {
      console.warn(`[SSRF] Blocked fetch to internal/private host: ${hostname}`);
      result.available = false;
      return result;
    }

    const response = await axios.get(url.toString(), {
      timeout: 8000,
      maxRedirects: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml'
      },
      validateStatus: (s) => s < 400
    });

    const html = String(response.data || '');
    result.available = true;

    // Login form detection
    const loginPatterns = /type=["']password["']|name=["'](pass|pwd|password|mat_khau)["']|<form[^>]*(login|signin|dang-nhap|đăng nhập)/i;
    result.hasLoginForm = loginPatterns.test(html);
    result.hasPasswordField = /type=["']password["']/i.test(html);

    // Urgency language detection
    const urgencyPatterns = [
      /urgent|khẩn cấp|cấp bách/i,
      /verify\s*(now|your|account)|xác\s*minh\s*(ngay|tài\s*khoản)/i,
      /suspended|đình\s*chỉ|khóa|blocked/i,
      /expire|expir|hết\s*hạn|sắp\s*hết/i,
      /act\s*now|hành\s*động\s*ngay/i,
      /click\s*here|nhấp\s*vào\s*đây/i,
      /limited\s*time|thời\s*gian\s*hạn\s*chế/i,
      /congratulations|xin\s*chúc\s*mừng|bạn\s*đã\s*trúng/i,
      /your\s*account\s*will|tài\s*khoản\s*sẽ\s*bị/i,
      /immediate\s*action|canh\s*báo\s*nghiêm\s*trọng/i
    ];
    result.urgencyScore = urgencyPatterns.filter(p => p.test(html)).length;

    // Crypto wallet detection
    const walletPatterns = /(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})/i;
    result.cryptoWalletDetected = walletPatterns.test(html);

    // External resources
    const externalDomains = html.match(/(?:src|href|action)=["']https?:\/\/[^"']+["']/gi) || [];
    const externalHosts = new Set();
    for (const match of externalDomains) {
      try {
        const mUrl = new URL(match.match(/https?:\/\/[^"']+/i)?.[0] || '');
        if (mUrl.hostname !== hostname && !mUrl.hostname.endsWith(`.${hostname}`)) {
          externalHosts.add(mUrl.hostname);
        }
      } catch { /* skip */ }
    }
    result.externalResources = externalHosts.size;

    // Obfuscated scripts
    result.obfuscatedScripts = (html.match(/eval\(|document\.write\(|unescape\(|String\.fromCharCode\(/gi) || []).length;

    // Suspicious iframes
    const iframes = html.match(/<iframe[^>]*>/gi) || [];
    result.suspiciousIframes = iframes.filter(f => /hidden|visibility:\s*none|width=["']0|height=["']0/i.test(f)).length;

    // Phone/contact detection
    const phoneMatch = html.match(/(?:tel:|href=["']tel:|0\d{9,10}|\+84\d{9,10})/i);
    const emailMatch = html.match(/mailto:|[\w.-]+@[\w.-]+\.\w+/i);
    result.contactInfo = {
      hasPhone: !!phoneMatch,
      hasEmail: !!emailMatch
    };

    // Page language
    const langMatch = html.match(/lang=["']([a-z]{2}(?:-[a-z]{2})?)["']/i);
    result.pageLanguage = langMatch ? langMatch[1] : null;

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    result.title = titleMatch ? titleMatch[1].trim().substring(0, 150) : null;

    // Phishing signal aggregation
    if (result.hasLoginForm) result.phishingSignals.push('Trang có form đăng nhập');
    if (result.urgencyScore >= 3) result.phishingSignals.push(`Nhiều ngôn ngữ khẩn cấp (${result.urgencyScore} tín hiệu)`);
    if (result.cryptoWalletDetected) result.phishingSignals.push('Phát hiện địa chỉ ví crypto');
    if (result.obfuscatedScripts > 0) result.phishingSignals.push(`Có ${result.obfuscatedScripts} script bị mã hóa/ẩn`);
    if (result.suspiciousIframes > 0) result.phishingSignals.push(`Có ${result.suspiciousIframes} iframe ẩn`);

  } catch (e) {
    result.available = false;
  }

  cacheSet(cacheKey, result, CACHE_TTL.content);
  return result;
}

// ============ EXISTING: Destroylist Check ============
async function checkDestroylist(hostname) {
  const cacheKey = `dl:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let result = null;
  try {
    const apiUrl = new URL(DESTROYLIST_CHECK_ENDPOINT);
    apiUrl.searchParams.set('domain', hostname);
    const response = await axios.get(apiUrl.toString(), { timeout: 4000, headers: { Accept: 'application/json' } });
    const payload = response.data || {};
    const riskScore = Number(payload.risk_score ?? payload.riskScore ?? 0);
    result = {
      available: true,
      source: 'api',
      threat: Boolean(payload.threat || payload.listed || riskScore >= 40),
      riskScore,
      severity: payload.severity || payload.status || 'unknown'
    };
  } catch {
    try {
      const feedResponse = await axios.get(DESTROYLIST_RAW_URL, { timeout: 5000, headers: { Accept: 'text/plain' } });
      const feed = String(feedResponse.data || '').toLowerCase();
      const normalizedHost = hostname.replace(/^www\./, '');
      const rootHost = normalizedHost.split('.').slice(-2).join('.');
      const listed = feed.split(/\r?\n/).some((line) => {
        const cleaned = line.replace(/^0\.0\.0\.0\s+|^127\.0\.0\.1\s+/, '').trim();
        return cleaned === normalizedHost || cleaned === rootHost || cleaned.endsWith(`.${rootHost}`);
      });
      result = {
        available: true,
        source: 'raw-feed',
        threat: listed,
        riskScore: listed ? 70 : 0,
        severity: listed ? 'high' : 'clear'
      };
    } catch {
      result = { available: false, source: null, threat: false, riskScore: 0, severity: 'unknown' };
    }
  }

  cacheSet(cacheKey, result, result.available ? CACHE_TTL.destroylist : 5 * 60 * 1000);
  return result;
}

// ============ EXISTING: WHOIS Age Check ============
async function resolveHostExists(hostname) {
  try {
    await dns.resolve4(hostname);
    return true;
  } catch {
    try {
      await dns.resolve6(hostname);
      return true;
    } catch {
      return false;
    }
  }
}

async function checkWhoisAge(hostname) {
  const cacheKey = `whois:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let result = { available: false };

  // Method 1: RDAP
  try {
    const response = await axios.get(`${RDAP_LOOKUP_URL}${encodeURIComponent(hostname)}`, {
      timeout: 4000,
      headers: { Accept: 'application/rdap+json, application/json' },
      validateStatus: (s) => s < 500
    });
    if (response.status === 404) {
      const resolves = await resolveHostExists(hostname);
      result = resolves ? { available: true, noDate: true } : { available: true, notFound: true };
    } else if (response.data) {
      const events = response.data.events || [];
      const registration = events.find((e) => (e.eventAction || '').includes('registration'))?.eventDate
        || events[0]?.eventDate
        || null;
if (registration) {
          const regDate = new Date(registration);
          if (!isNaN(regDate.getTime())) {
          const ageDays = Math.floor((Date.now() - regDate.getTime()) / 86400000);
          result = {
            available: true,
            registrationDate: registration,
            ageDays: Math.max(0, ageDays),
            isNew: ageDays < 90
          };
          }
        } else {
        result = { available: true, noDate: true };
      }
    }
  } catch {
    result = { available: false };
  }

  // Method 2: Fallback - Wayback Machine (first archived date)
  if (!result.available || result.noDate) {
    try {
      const wbUrl = `${WAYBACK_MACHINE_API}${hostname}`;
      const wbResponse = await axios.get(wbUrl, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
        validateStatus: (s) => s < 400
      });
      if (wbResponse.data && Array.isArray(wbResponse.data) && wbResponse.data.length > 1) {
        // First row is header, second row is oldest snapshot
        const oldest = wbResponse.data[1];
        if (oldest && oldest[1]) {
          const firstSeen = new Date(oldest[1]);
          if (!isNaN(firstSeen.getTime())) {
          const ageDays = Math.floor((Date.now() - firstSeen.getTime()) / 86400000);
          result = {
            available: true,
            registrationDate: oldest[1],
            ageDays: Math.max(0, ageDays),
            isNew: ageDays < 90,
            source: 'wayback'
          };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Method 3: Fallback - Certificate Transparency logs (crt.sh)
  if (!result.available || result.noDate) {
    try {
      const ctUrl = `${CT_LOGS_API}${encodeURIComponent(hostname)}&output=json`;
      const ctResponse = await axios.get(ctUrl, {
        timeout: 5000,
        headers: { Accept: 'application/json' },
        validateStatus: (s) => s < 400
      });
      if (ctResponse.data && Array.isArray(ctResponse.data) && ctResponse.data.length > 0) {
        // Find earliest not_before date
        const dates = ctResponse.data
          .map((entry) => entry.not_before)
          .filter(Boolean)
          .map((d) => new Date(d))
          .filter((d) => !isNaN(d.getTime()));
        if (dates.length > 0) {
          const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
          if (!isNaN(earliest.getTime())) {
          const ageDays = Math.floor((Date.now() - earliest.getTime()) / 86400000);
          result = {
            available: true,
            registrationDate: earliest.toISOString(),
            ageDays: Math.max(0, ageDays),
            isNew: ageDays < 90,
            source: 'crt.sh'
          };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Method 4: Final fallback - check if domain resolves at all
  if (!result.available) {
    const resolves = await resolveHostExists(hostname);
    if (resolves) {
      result = { available: true, noDate: true, source: 'dns' };
    }
  }

  cacheSet(cacheKey, result, result.available ? CACHE_TTL.whois : 10 * 60 * 1000);
  return result;
}

// ============ Tinnhiemmang.vn Blacklist Check ============
async function checkTinnhiemmang(hostname) {
  const cacheKey = `tnmm:${hostname}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await tinnhiemmang.searchTinnhiemmang(hostname);
  let result;
  if (res.available && res.listed && res.item) {
    const it = res.item;
    result = {
      available: true,
      isBlacklisted: true,
      details: `Domain "${hostname}" được tìm thấy trên tinnhiemmang.vn (cổng cảnh báo lừa đảo của Việt Nam). Phát hiện ${it.detectedDate || 'không rõ ngày'}, mạo danh tổ chức "${it.org || 'không rõ'}", trạng thái ${it.status || 'đang xử lý'}.`,
      org: it.org,
      detectedDate: it.detectedDate,
      status: it.status,
      type: it.type
    };
  } else if (res.available) {
    result = {
      available: true,
      isBlacklisted: false,
      details: 'Domain không nằm trong danh sách cảnh báo của tinnhiemmang.vn.',
      org: null,
      detectedDate: null,
      status: null,
      type: null
    };
  } else {
    result = { available: false, isBlacklisted: false, details: null, error: res.error || null };
  }

  cacheSet(cacheKey, result, CACHE_TTL.destroylist);
  return result;
}

// ============ MAIN: Weighted Analyze Link ============
async function analyzeLink(input) {
  const reasons = [];
  let rawScore = 70; // Starting trust score (neutral = 70, lower = more dangerous)

  const addReason = (reason) => {
    reasons.push(reason);
    rawScore += reason.scoreDelta || 0;
  };

  const parsed = extractHostname(input);
  if (!parsed) {
    addReason({
      id: 'LINK_PARSE_ERROR',
      name: 'Không phân tích được URL',
      detail: 'Đầu vào không phải là một địa chỉ web hợp lệ.',
      status: 'warning',
      scoreDelta: -10
    });
    return buildResult(reasons, rawScore, null, null, null, null, null, null, null);
  }

  const { url, hostname, protocol } = parsed;
  const fullInput = url.toString();
  const isHttps = protocol === 'https:';

  // ============ FAST PATH: OWN PROJECTS ============
  const OWN_PROJECTS = new Set(['lachansovn.vercel.app', 'la-chan-so.vercel.app']);
  if (OWN_PROJECTS.has(hostname)) {
    return {
      reasons: [
        {
          id: 'LINK_OWN_PROJECT',
          name: 'Website chính thức Lá Chắn Số',
          detail: `"${hostname}" là website chính thức của Lá Chắn Số - hệ thống chống tin giả hàng đầu Việt Nam.`,
          status: 'success',
          scoreDelta: 30
        }
      ],
      score: 100,
      hostname,
      url: fullInput,
      scamMatch: null,
      whois: null,
      destroylist: null,
      ssl: null,
      dns: null,
      redirect: null,
      pageAnalysis: null,
      trustedDomain: true
    };
  }

  // ============ FAST PATH: WHITELIST BYPASS ============
  if (isTrustedDomain(hostname)) {
    return {
      reasons: [
        {
          id: 'LINK_TRUSTED_DOMAIN',
          name: 'Website uy tín',
          detail: `"${hostname}" nằm trong danh sách ${TRUSTED_ROOT_DOMAINS.size}+ website uy tín được xác nhận. Bỏ qua kiểm tra chi tiết.`,
          status: 'success',
          scoreDelta: 25
        }
      ],
      score: 96,
      hostname,
      url: fullInput,
      scamMatch: null,
      whois: null,
      destroylist: null,
      ssl: null,
      dns: null,
      redirect: null,
      pageAnalysis: null,
      trustedDomain: true
    };
  }

  // --- 1. HTTPS ---
  addReason({
    id: 'LINK_HTTPS',
    name: isHttps ? 'HTTPS hợp lệ' : 'Không dùng HTTPS',
    detail: isHttps
      ? 'URL sử dụng HTTPS, giảm rủi ro nghe lén.'
      : 'Website dùng HTTP, dữ liệu có thể bị can thiệp trên đường truyền.',
    status: isHttps ? 'success' : 'danger',
    scoreDelta: isHttps ? 8 : -20
  });

  // --- 1.5. Google Safe Browsing Warning Detection ---
  const googleWarning = await detectGoogleWarningPage(fullInput);
  if (googleWarning.isWarning) {
    addReason({
      id: 'LINK_GOOGLE_WARNING',
      name: 'CẢNH BÁO: Google phát hiện lừa đảo',
      detail: `Google Safe Browsing đã chặn trang web này (${googleWarning.warningType}). Trang web hiển thị cảnh báo lừa đảo/mã độc.`,
      status: 'danger',
      scoreDelta: -70
    });
  }

  // --- 2. Scam Dataset ---
  const scamMatch = matchScamDataset(hostname);
  if (scamMatch) {
    const severityScore = scamMatch.severity === 'critical' ? -80 : scamMatch.severity === 'high' ? -65 : -40;
    addReason({
      id: 'LINK_SCAM_DATASET',
      name: 'CÓ MẶT TRONG CƠ SỞ DỮ LIỆU LỪA ĐẢO',
      detail: `Domain nằm trong danh sách lừa đảo đã ghi nhận. Thương hiệu bị giả mạo: ${scamMatch.brand}. ${scamMatch.description}`,
      status: 'danger',
      scoreDelta: severityScore
    });
  }

  // --- 3. Typosquatting ---
  const typosquat = detectTyposquat(hostname);
  if (typosquat) {
    addReason({
      id: 'LINK_TYPOSQUAT',
      name: 'Nghi vấn giả mạo thương hiệu',
      detail: typosquat.detail,
      status: 'danger',
      scoreDelta: -45
    });
  }

  // --- 4. Suspicious TLD ---
  // Đuôi giá rẻ một mình KHÔNG đủ để phạt (tránh -25 oan cho web thật dùng .online/.xyz).
  // Chỉ phạt khi đi kèm ít nhất một dấu hiệu nguy cơ khác (brand-lookalike / typosquat /
  // scam dataset / domain mới / obfuscation / homoglyph).
  if (isSuspiciousTld(hostname)) {
    const tldCoSignal =
      typosquat ||
      scamMatch ||
      isIpHostname(hostname) ||
      hasPunycode(hostname) ||
      hasHomoglyph(hostname) ||
      hasAuthInjection(fullInput);
    if (tldCoSignal) {
      addReason({
        id: 'LINK_SUSPICIOUS_TLD',
        name: 'Đuôi tên miền rủi ro',
        detail: 'Đuôi tên miền giá rẻ (.xyz, .top, .online...) kết hợp với dấu hiệu nghi vấn thương hiệu/giả mạo làm tăng rủi ro.',
        status: 'danger',
        scoreDelta: -25
      });
    }
  }

  // --- 5. Obfuscation (IP, punycode, auth injection) ---
  if (isIpHostname(hostname) || hasPunycode(hostname) || hasAuthInjection(fullInput)) {
    addReason({
      id: 'LINK_OBFUSCATED',
      name: 'URL có dấu hiệu che giấu',
      detail: 'URL dùng IP, punycode hoặc ký tự @ - kỹ thuật đánh lừa người xem.',
      status: 'danger',
      scoreDelta: -30
    });
  }

  // --- 6. Homoglyph ---
  if (hasHomoglyph(hostname)) {
    addReason({
      id: 'LINK_HOMOGLYPH',
      name: 'Ký tự Unicode giả Latin',
      detail: 'Hostname chứa ký tự Cyrillic/Greek trông giống chữ Latin (vd. а thay a) - thủ thuật giả mạo tên miền.',
      status: 'danger',
      scoreDelta: -55
    });
  }

  // --- 7. URL Shortener ---
  if (URL_SHORTENERS.has(hostname)) {
    addReason({
      id: 'LINK_SHORTENER',
      name: 'Link rút gọn',
      detail: 'Link rút gọn che khuất domain đích. Không nhập thông tin nhạy cảm trước khi mở rộng URL.',
      status: 'warning',
      scoreDelta: -18
    });
  }

  // --- 8. Complex hostname ---
  const hyphenCount = (hostname.match(/-/g) ?? []).length;
  const isLongHost = hostname.length > 42 || hostname.split('.').some((part) => part.length > 24);
  if (hyphenCount >= 3 || isLongHost) {
    addReason({
      id: 'LINK_COMPLEX_HOST',
      name: 'Tên miền bất thường',
      detail: 'Hostname dài hoặc nhiều dấu gạch ngang, dễ dùng để mô phỏng domain chính thức.',
      status: 'warning',
      scoreDelta: -10
    });
  }

  // --- 9. Machine-generated hostname ---
  const hasDigitsAndHyphens = /\d{2,}/.test(hostname) && hyphenCount > 0;
  if (hasDigitsAndHyphens) {
    addReason({
      id: 'LINK_DIGIT_HYPHEN',
      name: 'Tên miền dạng máy sinh',
      detail: 'Kết hợp chữ số + dấu gạch ngang đặc trưng cho domain do máy tự sinh trong chiến dịch phishing quy mô lớn.',
      status: 'warning',
      scoreDelta: -8
    });
  }

  // --- 10. Dot count (too many subdomains = suspicious) ---
  const dotCount = (hostname.match(/\./g) ?? []).length;
  if (dotCount >= 4) {
    addReason({
      id: 'LINK_DEEP_SUBDOMAIN',
      name: 'Quá nhiều subdomain',
      detail: `Hostname có ${dotCount} dấu chấm - nhiều subdomain thường là chiến thuật che giấu domain gốc trong phishing.`,
      status: 'warning',
      scoreDelta: -12
    });
  }

  // --- PARALLEL: Destroylist + WHOIS + SSL + DNS + Redirects + Tinnhiemmang ---
  const [destroylist, whois, sslCert, dnsRep, redirectInfo, tinnhiemmang] = await Promise.all([
    checkDestroylist(hostname),
    checkWhoisAge(hostname),
    checkSSLCertificate(hostname),
    checkDnsReputation(hostname),
    followRedirects(fullInput),
    checkTinnhiemmang(hostname)
  ]);

  // --- 11. Tinnhiemmang.vn Blacklist ---
  if (tinnhiemmang.available && tinnhiemmang.isBlacklisted) {
    addReason({
      id: 'LINK_TINNHIEMMANG',
      name: 'CẢNH BÁO: Tinnhiemmang.vn',
      detail: tinnhiemmang.details + (tinnhiemmang.org ? ` Tổ chức bị mạo danh: ${tinnhiemmang.org}${tinnhiemmang.detectedDate ? ` (phát hiện ${tinnhiemmang.detectedDate})` : ''}.` : ''),
      status: 'danger',
      scoreDelta: -50
    });
  } else if (tinnhiemmang.available && !tinnhiemmang.isBlacklisted) {
    addReason({
      id: 'LINK_TINNHIEMMANG_CLEAR',
      name: 'Không có trong Tinnhiemmang.vn',
      detail: 'Domain không nằm trong danh sách cảnh báo của cổng thông tin nhà nước.',
      status: 'success',
      scoreDelta: 5
    });
  }

  // --- 11. Destroylist ---
  if (destroylist.available) {
    if (destroylist.threat) {
      addReason({
        id: 'LINK_DESTROYLIST',
        name: 'Có trong Destroylist',
        detail: `Destroylist đánh dấu domain là nguy cơ ${destroylist.severity}, điểm rủi ro ${destroylist.riskScore}/100 (${destroylist.source}).`,
        status: 'danger',
        scoreDelta: -(destroylist.riskScore >= 70 ? 60 : destroylist.riskScore >= 40 ? 45 : 30)
      });
    } else {
      addReason({
        id: 'LINK_DESTROYLIST_CLEAR',
        name: 'Destroylist chưa ghi nhận',
        detail: `Domain chưa xuất hiện trong Destroylist (${destroylist.source}). Không phải bảo chứng an toàn tuyệt đối.`,
        status: 'success',
        scoreDelta: 4
      });
    }
  } else {
    addReason({
      id: 'LINK_DESTROYLIST_UNAVAILABLE',
      name: 'Chưa gọi được Destroylist',
      detail: 'Không lấy được dữ liệu Destroylist trong lần kiểm tra này.',
      status: 'warning',
      scoreDelta: 0
    });
  }

  // --- 12. WHOIS ---
  if (whois.available && whois.ageDays !== undefined) {
    if (whois.isNew) {
      addReason({
        id: 'LINK_DOMAIN_NEW',
        name: 'Tên miền mới đăng ký',
        detail: `Domain chỉ mới đăng ký ${whois.ageDays} ngày (${safeDateStr(whois.registrationDate)}). Tên miền mới + nội dung nhạy cảm là dấu hiệu rủi ro cao.`,
        status: 'danger',
        scoreDelta: -25
      });
    } else {
      addReason({
        id: 'LINK_DOMAIN_AGE_OK',
        name: 'Tên miền đã tồn tại lâu',
        detail: `Domain đăng ký từ ${safeDateStr(whois.registrationDate)} (${whois.ageDays} ngày).`,
        status: 'success',
        scoreDelta: 6
      });
    }
  } else if (whois.available && whois.notFound) {
    addReason({
      id: 'LINK_DOMAIN_NOT_REGISTERED',
      name: 'Tên miền chưa đăng ký',
      detail: 'RDAP không tìm thấy bản ghi đăng ký cho domain này - domain có thể chưa tồn tại hoặc đã bị thu hồi.',
      status: 'warning',
      scoreDelta: -15
    });
  } else if (whois.available && whois.noDate) {
    const sourceInfo = whois.source ? ` (nguồn: ${whois.source})` : '';
    addReason({
      id: 'LINK_DOMAIN_AGE_UNKNOWN',
      name: 'Chưa xác định tuổi tên miền',
      detail: `Không thể xác định thời gian đăng ký${sourceInfo}. Tên miền vẫn đang hoạt động (DNS có phản hồi), không tính là domain mới hay chưa đăng ký.`,
      status: 'warning',
      scoreDelta: 0
    });
  }

  // --- 13. SSL Certificate (NEW) ---
  if (sslCert.available) {
    if (sslCert.selfSigned && !sslCert.isTrustedIssuer) {
      addReason({
        id: 'LINK_SSL_SELFSIGNED',
        name: 'Chứng chỉ SSL tự ký',
        detail: `SSL certificate do "${sslCert.issuer}" cấp - không phải CA uy tín. Trang có thể giả mạo để thu thập dữ liệu.`,
        status: 'danger',
        scoreDelta: -30
      });
    } else if (sslCert.isExpired) {
      addReason({
        id: 'LINK_SSL_EXPIRED',
        name: 'Chứng chỉ SSL hết hạn',
        detail: `SSL certificate đã hết hạn từ ${sslCert.validTo}. Trang không được bảo mật và có thể đã bị bỏ rơi hoặc đang được vận hành trái phép.`,
        status: 'danger',
        scoreDelta: -25
      });
    } else if (sslCert.valid && sslCert.isTrustedIssuer) {
      addReason({
        id: 'LINK_SSL_VALID',
        name: `SSL hợp lệ (${sslCert.issuer})`,
        detail: `Certificate do ${sslCert.issuer} cấp, hết hạn ${sslCert.daysLeft} ngày nữa.`,
        status: 'success',
        scoreDelta: 10
      });
    } else if (sslCert.valid && sslCert.daysLeft !== null && sslCert.daysLeft < 30) {
      addReason({
        id: 'LINK_SSL_EXPIRING',
        name: 'SSL sắp hết hạn',
        detail: `Certificate hết hạn trong ${sslCert.daysLeft} ngày - trang có thể không được duy trì.`,
        status: 'warning',
        scoreDelta: -5
      });
    }
  }

  // --- 14. DNS Reputation (NEW) ---
  if (dnsRep.available) {
    if (dnsRep.legitimacyScore >= 2) {
      addReason({
        id: 'LINK_DNS_LEGIT',
        name: 'DNS có cấu hình hợp pháp',
        detail: `Domain có${dnsRep.hasMx ? ' MX (email)' : ''}${dnsRep.hasSpf ? ' SPF' : ''}${dnsRep.hasDmarc ? ' DMARC' : ''} - dấu hiệu doanh nghiệp thật.`,
        status: 'success',
        scoreDelta: 8
      });
    } else if (dnsRep.legitimacyScore === 0 && !scamMatch) {
      addReason({
        id: 'LINK_DNS_MINIMAL',
        name: 'DNS tối giản',
        detail: 'Domain không có MX/SPF/DMARC - có thể chỉ là trang phishing tạm thời không cần email.',
        status: 'warning',
        scoreDelta: -8
      });
    }
  }

  // --- 15. Redirect Chain (NEW) ---
  if (redirectInfo.chainLength >= 2) {
    if (redirectInfo.domainChanged) {
      addReason({
        id: 'LINK_REDIRECT_DOMAIN_CHANGE',
        name: `Chuyển hướng qua ${redirectInfo.chainLength} domain`,
        detail: `URL gốc redirect sang domain khác: ${redirectInfo.redirects[redirectInfo.redirects.length - 1]?.hostname}. Đây là kỹ thuật common trong phishing để ẩn destination.`,
        status: 'danger',
        scoreDelta: -35
      });
    } else if (redirectInfo.suspiciousRedirect) {
      addReason({
        id: 'LINK_REDIRECT_CHAIN',
        name: `Chuỗi redirect dài (${redirectInfo.chainLength} bước)`,
        detail: 'URL phải qua nhiều bước redirect mới đến trang đích - có thể dùng để che giấu domain thật.',
        status: 'warning',
        scoreDelta: -15
      });
    }
  }

  // --- 16. Page Content Analysis (NEW) ---
  let pageAnalysis = null;
  try {
    pageAnalysis = await analyzePageContent(url, hostname);
  } catch { /* ignore */ }

  if (pageAnalysis && pageAnalysis.available) {
    // Trust signal: if SSL valid + old domain + legit DNS, reduce page content penalties
    // (news sites legitimately have login forms, urgency language, crypto articles)
    const hasTrustSignals = sslCert.valid && sslCert.isTrustedIssuer
      && whois.available && whois.ageDays > 180
      && dnsRep.available && dnsRep.legitimacyScore >= 2;
    const contentPenaltyScale = hasTrustSignals ? 0.3 : 1.0; // Reduce 70% for trusted sites

    if (pageAnalysis.hasLoginForm && !scamMatch) {
      addReason({
        id: 'LINK_CONTENT_LOGIN_FORM',
        name: 'Trang có form đăng nhập',
        detail: hasTrustSignals
          ? 'Phát hiện form đăng nhập (trang có tín hiệu hợp pháp - có thể là tính năng chính thống).'
          : 'Phát hiện form nhập mật khẩu. Kết hợp với các dấu hiệu khác, đây có thể là trang đánh cắp tài khoản.',
        status: hasTrustSignals ? 'success' : 'warning',
        scoreDelta: Math.round(-15 * contentPenaltyScale)
      });
    }

    if (pageAnalysis.urgencyScore >= 5) {
      addReason({
        id: 'LINK_CONTENT_URGENCY',
        name: `Nhiều ngôn ngữ khẩn cấp (${pageAnalysis.urgencyScore} tín hiệu)`,
        detail: 'Trang sử dụng rất nhiều cụm từ gây áp lực - kỹ thuật social engineering kinh điển.',
        status: 'danger',
        scoreDelta: Math.round(-12 * contentPenaltyScale)
      });
    } else if (pageAnalysis.urgencyScore >= 3) {
      addReason({
        id: 'LINK_CONTENT_URGENCY_LOW',
        name: `Có ngôn ngữ khẩn cấp (${pageAnalysis.urgencyScore} tín hiệu)`,
        detail: 'Trang chứa một số cụm từ gây áp lực. Cần kết hợp thêm dấu hiệu khác để xác định.',
        status: 'warning',
        scoreDelta: Math.round(-5 * contentPenaltyScale)
      });
    }

    if (pageAnalysis.cryptoWalletDetected) {
      addReason({
        id: 'LINK_CONTENT_CRYPTO_WALLET',
        name: 'Phát hiện địa chỉ ví crypto',
        detail: hasTrustSignals
          ? 'Trang có đề cập địa chỉ ví crypto (bài viết/báo cáo).'
          : 'Trang chứa địa chỉ ví crypto - kết hợp với các dấu hiệu khác có thể là scam.',
        status: 'warning',
        scoreDelta: Math.round(-5 * contentPenaltyScale)
      });
    }

    if (pageAnalysis.obfuscatedScripts > 0) {
      addReason({
        id: 'LINK_CONTENT_OBFUSCATED',
        name: `Có ${pageAnalysis.obfuscatedScripts} script mã hóa`,
        detail: 'Phát hiện eval()/document.write()/unescape() - script bị obfuscate để tránh bị phát hiện.',
        status: 'danger',
        scoreDelta: Math.round(-15 * contentPenaltyScale)
      });
    }

    if (pageAnalysis.suspiciousIframes > 0) {
      addReason({
        id: 'LINK_CONTENT_HIDDEN_IFRAME',
        name: `${pageAnalysis.suspiciousIframes} iframe ẩn`,
        detail: 'Trang nhúng iframe ẩn (width=0/height=0) - kỹ thuật inject nội dung độc hại hoặc keylogger.',
        status: 'danger',
        scoreDelta: Math.round(-20 * contentPenaltyScale)
      });
    }
  }

  // --- Baseline ---
  if (reasons.length === 0) {
    addReason({
      id: 'LINK_BASELINE',
      name: 'Không thấy dấu hiệu rõ ràng',
      detail: 'Chưa phát hiện tín hiệu nguy hiểm mạnh. Vẫn cần thận trọng nếu website yêu cầu đăng nhập hoặc thanh toán.',
      status: 'warning',
      scoreDelta: 0
    });
  }

  // --- Weighted Scoring ---
  const finalScore = calculateWeightedScore(reasons, rawScore);

  return {
    reasons,
    score: finalScore,
    hostname,
    url: fullInput,
    scamMatch: scamMatch ? { brand: scamMatch.brand, type: scamMatch.type, severity: scamMatch.severity } : null,
    whois: whois.available ? { ageDays: whois.ageDays ?? null, registrationDate: whois.registrationDate ?? null, isNew: whois.isNew ?? false, notFound: whois.notFound ?? false } : null,
    destroylist: destroylist.available ? { threat: destroylist.threat, riskScore: destroylist.riskScore, severity: destroylist.severity, source: destroylist.source } : null,
    ssl: sslCert.available ? { valid: sslCert.valid, issuer: sslCert.issuer, selfSigned: sslCert.selfSigned, daysLeft: sslCert.daysLeft, isExpired: sslCert.isExpired, isTrustedIssuer: sslCert.isTrustedIssuer } : null,
    dns: dnsRep.available ? { hasMx: dnsRep.hasMx, hasSpf: dnsRep.hasSpf, hasDmarc: dnsRep.hasDmarc, legitimacyScore: dnsRep.legitimacyScore } : null,
    redirect: redirectInfo.chainLength >= 2 ? { chainLength: redirectInfo.chainLength, domainChanged: redirectInfo.domainChanged, finalHostname: redirectInfo.finalHostname, redirects: redirectInfo.redirects.map(r => r.hostname) } : null,
    pageAnalysis: pageAnalysis && pageAnalysis.available ? { hasLoginForm: pageAnalysis.hasLoginForm, urgencyScore: pageAnalysis.urgencyScore, cryptoWalletDetected: pageAnalysis.cryptoWalletDetected, obfuscatedScripts: pageAnalysis.obfuscatedScripts, phishingSignals: pageAnalysis.phishingSignals } : null,
    tinnhiemmang: tinnhiemmang.available ? { isBlacklisted: tinnhiemmang.isBlacklisted, details: tinnhiemmang.details, org: tinnhiemmang.org, detectedDate: tinnhiemmang.detectedDate, status: tinnhiemmang.status, type: tinnhiemmang.type } : null
  };
}

function calculateWeightedScore(reasons, rawScore) {
  // Weight multiplier: critical signals count more than warnings
  const dangerCount = reasons.filter(r => r.status === 'danger').length;
  const warningCount = reasons.filter(r => r.status === 'warning').length;
  const successCount = reasons.filter(r => r.status === 'success').length;

  // Danger cascade: multiple danger signals compound
  let dangerMultiplier = 1.0;
  if (dangerCount >= 4) dangerMultiplier = 1.5;
  else if (dangerCount >= 3) dangerMultiplier = 1.3;
  else if (dangerCount >= 2) dangerMultiplier = 1.15;

  // Apply cascade to danger deltas
  let adjustedScore = 70;
  for (const reason of reasons) {
    if (reason.status === 'danger') {
      adjustedScore += reason.scoreDelta * dangerMultiplier;
    } else {
      adjustedScore += reason.scoreDelta;
    }
  }

  // Floor/ceiling
  return Math.max(0, Math.min(100, Math.round(adjustedScore)));
}

function buildResult(reasons, rawScore, hostname, url, scamMatch, whois, destroylist, ssl, dns) {
  return {
    reasons,
    score: calculateWeightedScore(reasons, rawScore),
    hostname,
    url,
    scamMatch,
    whois,
    destroylist,
    ssl,
    dns
  };
}

module.exports = {
  analyzeLink,
  matchScamDataset,
  detectTyposquat,
  hasHomoglyph,
  isSuspiciousTld,
  checkSSLCertificate,
  checkDnsReputation,
  analyzePageContent,
  followRedirects,
  isTrustedDomain,
  detectGoogleWarningPage,
  TRUSTED_ROOT_DOMAINS,
  SCAM_DOMAINS
};
