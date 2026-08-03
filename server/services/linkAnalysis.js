const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dns = require('dns').promises;

const scamDataPath = path.join(__dirname, '../data/scamDomains.json');
const { SCAM_DOMAINS, SCAM_BRAND_PATTERNS } = JSON.parse(fs.readFileSync(scamDataPath, 'utf8'));

const DESTROYLIST_CHECK_ENDPOINT = 'https://api.destroy.tools/v1/check';
const DESTROYLIST_RAW_URL = 'https://raw.githubusercontent.com/phishdestroy/destroylist/main/rootlist/formats/primary_active/hosts.txt';
const RDAP_LOOKUP_URL = 'https://rdap.org/domain/';

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
const CACHE_TTL = { destroylist: 12 * 60 * 60 * 1000, whois: 24 * 60 * 60 * 1000, feed: 6 * 60 * 60 * 1000 };

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
        const ageDays = Math.floor((Date.now() - regDate.getTime()) / 86400000);
        result = {
          available: true,
          registrationDate: registration,
          ageDays: Math.max(0, ageDays),
          isNew: ageDays < 90
        };
      } else {
        result = { available: true, noDate: true };
      }
    }
  } catch {
    result = { available: false };
  }

  cacheSet(cacheKey, result, result.available ? CACHE_TTL.whois : 10 * 60 * 1000);
  return result;
}

async function analyzeLink(input) {
  const reasons = [];
  let score = 70;

  const addReason = (reason) => {
    reasons.push(reason);
    score += reason.scoreDelta || 0;
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
    return { reasons, score: Math.max(0, Math.min(100, score)), hostname: null, url: null, scamMatch: null, whois: null, destroylist: null };
  }

  const { url, hostname, protocol } = parsed;
  const fullInput = url.toString();
  const isHttps = protocol === 'https:';

  addReason({
    id: 'LINK_HTTPS',
    name: isHttps ? 'HTTPS hợp lệ' : 'Không dùng HTTPS',
    detail: isHttps
      ? 'URL sử dụng HTTPS, giảm rủi ro nghe lén.'
      : 'Website dùng HTTP, dữ liệu có thể bị can thiệp trên đường truyền.',
    status: isHttps ? 'success' : 'danger',
    scoreDelta: isHttps ? 8 : -20
  });

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

  if (isSuspiciousTld(hostname)) {
    addReason({
      id: 'LINK_SUSPICIOUS_TLD',
      name: 'Đuôi tên miền rủi ro',
      detail: 'Đuôi tên miền giá rẻ (.xyz, .top, .online...) thường dùng trong chiến dịch phishing.',
      status: 'danger',
      scoreDelta: -25
    });
  }

  if (isIpHostname(hostname) || hasPunycode(hostname) || hasAuthInjection(fullInput)) {
    addReason({
      id: 'LINK_OBFUSCATED',
      name: 'URL có dấu hiệu che giấu',
      detail: 'URL dùng IP, punycode hoặc ký tự @ - kỹ thuật đánh lừa người xem.',
      status: 'danger',
      scoreDelta: -30
    });
  }

  if (hasHomoglyph(hostname)) {
    addReason({
      id: 'LINK_HOMOGLYPH',
      name: 'Ký tự Unicode giả Latin',
      detail: 'Hostname chứa ký tự Cyrillic/Greek trông giống chữ Latin (vd. а thay a) - thủ thuật giả mạo tên miền.',
      status: 'danger',
      scoreDelta: -55
    });
  }

  if (URL_SHORTENERS.has(hostname)) {
    addReason({
      id: 'LINK_SHORTENER',
      name: 'Link rút gọn',
      detail: 'Link rút gọn che khuất domain đích. Không nhập thông tin nhạy cảm trước khi mở rộng URL.',
      status: 'warning',
      scoreDelta: -18
    });
  }

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

  const [destroylist, whois] = await Promise.all([checkDestroylist(hostname), checkWhoisAge(hostname)]);

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

  if (whois.available && whois.ageDays !== undefined) {
    if (whois.isNew) {
      addReason({
        id: 'LINK_DOMAIN_NEW',
        name: 'Tên miền mới đăng ký',
        detail: `Domain chỉ mới đăng ký ${whois.ageDays} ngày (${new Date(whois.registrationDate).toISOString().substring(0, 10)}). Tên miền mới + nội dung nhạy cảm là dấu hiệu rủi ro cao.`,
        status: 'danger',
        scoreDelta: -25
      });
    } else {
      addReason({
        id: 'LINK_DOMAIN_AGE_OK',
        name: 'Tên miền đã tồn tại lâu',
        detail: `Domain đăng ký từ ${new Date(whois.registrationDate).toISOString().substring(0, 10)} (${whois.ageDays} ngày).`,
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
    addReason({
      id: 'LINK_DOMAIN_AGE_UNKNOWN',
      name: 'Chưa xác định tuổi tên miền',
      detail: 'RDAP không hỗ trợ đuôi tên miền này nên chưa thể xác định thời điểm đăng ký. Tên miền vẫn đang hoạt động (DNS có phản hồi), không tính là domain mới hay chưa đăng ký.',
      status: 'warning',
      scoreDelta: 0
    });
  }

  if (reasons.length === 0) {
    addReason({
      id: 'LINK_BASELINE',
      name: 'Không thấy dấu hiệu rõ ràng',
      detail: 'Chưa phát hiện tín hiệu nguy hiểm mạnh. Vẫn cần thận trọng nếu website yêu cầu đăng nhập hoặc thanh toán.',
      status: 'warning',
      scoreDelta: 0
    });
  }

  return {
    reasons,
    score: Math.max(0, Math.min(100, score)),
    hostname,
    url: fullInput,
    scamMatch: scamMatch ? { brand: scamMatch.brand, type: scamMatch.type, severity: scamMatch.severity } : null,
    whois: whois.available ? { ageDays: whois.ageDays ?? null, registrationDate: whois.registrationDate ?? null, isNew: whois.isNew ?? false, notFound: whois.notFound ?? false } : null,
    destroylist: destroylist.available ? { threat: destroylist.threat, riskScore: destroylist.riskScore, severity: destroylist.severity, source: destroylist.source } : null
  };
}

module.exports = {
  analyzeLink,
  matchScamDataset,
  detectTyposquat,
  hasHomoglyph,
  isSuspiciousTld,
  SCAM_DOMAINS
};
