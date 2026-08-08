import { AlertTriangle, Database, ExternalLink, Globe, Info, Search, ShieldCheck, Sparkles } from "lucide-react";
import { WEB_API_CONFIG } from "../config/webApis";
import { extractLinksFromText, isDomainTrusted, isGovVnDomain, isSuspiciousTLD } from "./trustedDomains";
export type WebReasonCategory = "technology" | "reputation" | "security" | "reference";
export type WebVerdictState = "safe" | "verify" | "warning" | "danger";
export interface WebVerificationReason {
  id: string;
  name: string;
  detail: string;
  status: "danger" | "warning" | "success";
  icon: any;
  category?: WebReasonCategory;
  scoreDelta?: number;
}
export interface WebCriterionDetail {
  key: string;
  name: string;
  weight: number;
  collected: boolean;
  risk: number;
  reason?: string;
  status: "danger" | "warning" | "success";
  icon: any;
  category: WebReasonCategory;
}
export interface WebVerificationResult {
  state: WebVerdictState;
  isSafe: boolean;
  isWarning: boolean;
  isDanger: boolean;
  needsVerification: boolean;
  riskScore: number;
  coverage: number;
  criteria: WebCriterionDetail[];
  ownerVerifyEmail?: string;
  ownerVerifyAvailable?: boolean;
  blacklisted?: boolean;
  blacklistSources?: string[];
  thirdParty?: BackendThirdPartySource[];
  ipInfo?: { collected: boolean; detail: BackendIpInfoDetail } | null;
  aiAnalysis?: BackendAiAnalysis | null;
  executionTimeMs?: number;
  backendV2?: boolean;
  normalizedUrl: string;
  displayUrl: string;
  score: number;
  title: string;
  description: string;
  screenshot: string;
  previewCandidates: string[];
  reasons: WebVerificationReason[];
}
const URL_SHORTENER_DOMAINS = new Set([
"bit.ly",
"tinyurl.com",
"t.co",
"goo.gl",
"ow.ly",
"is.gd",
"cutt.ly",
"rebrand.ly",
"shorturl.at"]
);
const BRAND_KEYWORDS = [
"vietcombank",
"vcb",
"mbbank",
"techcombank",
"bidv",
"vietinbank",
"momo",
"zalopay",
"vnpay",
"facebook",
"google",
"microsoft",
"apple",
"chinhphu",
"chinh phu",
"dichvucong",
"binance",
"bybit",
"okx",
"coinbase"];

// Damerau–Levenshtein phía client để bắt typosquat thiếu/đổi 1 ký tự (biance ~ binance)
function levenshtein(a: string, b: string): number {
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
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

const DANGEROUS_PATH_KEYWORDS = [
"login",
"verify",
"security",
"account",
"password",
"otp",
"update",
"wallet",
"banking",
"dang-nhap",
"xac-thuc",
"tai-khoan",
"mat-khau"];

interface DestroylistResponse {
  threat?: boolean;
  listed?: boolean;
  risk_score?: number;
  riskScore?: number;
  severity?: string;
  status?: string;
  sources?: string[];
  lists?: string[];
  source?: "api" | "raw-feed";
}
function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
function stripEdgeNoise(value: string): string {
  return value.
  trim().
  replace(/^[<({[\s"'`]+/g, "").
  replace(/[>)}\]\s"'`,.;:!?]+$/g, "");
}
function normalizeUrl(input: string): string {
  const firstLink = extractLinksFromText(input)[0] ?? input.trim();
  const cleaned = stripEdgeNoise(firstLink);
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}
function getPreviewUrls(url: URL): string[] {
  const targets = unique([
  url.toString(),
  `${url.origin}${url.pathname === "/" ? "" : url.pathname}`,
  url.origin]
  );
  const candidates: string[] = [];
  for (const provider of WEB_API_CONFIG.screenshot.providers) {
    for (const target of targets) {
      if (provider.mode === "path") {
        candidates.push(`${provider.endpoint}/${encodeURIComponent(target)}?w=1200&vpw=1440&vph=900`);
      } else
      {
        candidates.push(`${provider.endpoint}/?url=${encodeURIComponent(target)}`);
      }
    }
  }
  return unique(candidates);
}
function hostnameParts(hostname: string): string[] {
  return hostname.split(".").filter(Boolean);
}
function hasIpHostname(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
}
function hasLookalikeBrand(hostname: string): boolean {
  const compactHost = hostname.replace(/[^a-z0-9]/g, "");
  
  // Official domains mapping
  const officialDomains: Record<string, string[]> = {
    "vietcombank": ["vietcombank.com.vn"],
    "vcb": ["vietcombank.com.vn"],
    "mbbank": ["mbbank.com.vn"],
    "techcombank": ["techcombank.com.vn"],
    "bidv": ["bidv.com.vn"],
    "vietinbank": ["vietinbank.com.vn"],
    "momo": ["momo.vn"],
    "zalopay": ["zalopay.vn"],
    "vnpay": ["vnpay.vn"],
    "facebook": ["facebook.com"],
    "google": ["google.com", "google.com.vn"],
    "microsoft": ["microsoft.com"],
    "apple": ["apple.com"],
    "chinhphu": ["chinhphu.vn", "gov.vn", "baochinhphu.vn"],
    "chinh phu": ["chinhphu.vn", "gov.vn", "baochinhphu.vn"],
    "gov": ["gov.vn", "chinhphu.vn", "dichvucong.gov.vn"],
    "binance": ["binance.com", "binance.us"],
    "bybit": ["bybit.com"],
    "okx": ["okx.com"],
    "coinbase": ["coinbase.com"]
  };

  // Nghi vấn nếu chứa từ khóa thương hiệu nhưng không phải domain chính thức
  for (const brand of BRAND_KEYWORDS) {
    if (!compactHost.includes(brand.replace(/\s/g, ""))) continue;
    const official = officialDomains[brand] || [];
    const isOfficial = official.some(d => hostname.endsWith(d) || hostname === d);
    if (!isOfficial) return true;
  }

  // Near-miss: không chứa từ khóa nhưng gần-giống domain chính thức (biance ~ binance)
  for (const brand in officialDomains) {
    for (const d of officialDomains[brand]) {
      const dc = d.replace(/[^a-z0-9]/g, "");
      if (dc.length < 6) continue;
      if (Math.abs(compactHost.length - dc.length) > 3) continue;
      const dist = levenshtein(compactHost, dc);
      if (dist > 0 && dist <= 2) return true;
    }
  }

  return false;
}
function hasCredentialPath(url: URL): boolean {
  const value = `${url.pathname} ${url.search}`.toLowerCase();
  return DANGEROUS_PATH_KEYWORDS.some((keyword) => value.includes(keyword));
}
async function checkDestroylist(hostname: string): Promise<DestroylistResponse | null> {
  try {
    const apiUrl = new URL(WEB_API_CONFIG.destroylist.checkEndpoint);
    apiUrl.searchParams.set("domain", hostname);
    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok)
    return null;
    const payload = await response.json();
    return {
      ...payload,
      source: "api"
    };
  }
  catch {
    return checkDestroylistRawFeed(hostname);
  }
}
async function checkDestroylistRawFeed(hostname: string): Promise<DestroylistResponse | null> {
  try {
    const response = await fetch(WEB_API_CONFIG.destroylist.rawPrimaryHostsUrl, {
      headers: {
        Accept: "text/plain"
      }
    });
    if (!response.ok)
    return null;
    const feed = await response.text();
    const normalizedHost = hostname.toLowerCase().replace(/^www\./, "");
    const rootHost = normalizedHost.split(".").slice(-2).join(".");
    const lines = feed.toLowerCase().split(/\r?\n/);
    const isListed = lines.some((line) => {
      const cleaned = line.replace(/^0\.0\.0\.0\s+|^127\.0\.0\.1\s+/, "").trim();
      return cleaned === normalizedHost || cleaned === rootHost || cleaned.endsWith(`.${rootHost}`);
    });
    return isListed ?
    {
      threat: true,
      listed: true,
      risk_score: 70,
      severity: "high",
      source: "raw-feed"
    } :
    {
      threat: false,
      listed: false,
      risk_score: 0,
      severity: "clear",
      source: "raw-feed"
    };
  }
  catch {
    return null;
  }
}
const BACKEND_SKIP_REASONS = new Set([
  "LINK_HTTPS",
  "LINK_DESTROYLIST",
  "LINK_DESTROYLIST_CLEAR",
  "LINK_DESTROYLIST_UNAVAILABLE",
  "LINK_SUSPICIOUS_TLD",
  "LINK_COMPLEX_HOST",
  "LINK_SHORTENER",
  "LINK_OBFUSCATED"
]);

const TECHNOLOGY_BACKEND_REASON_IDS = new Set([
  "LINK_HTTPS",
  "LINK_SUSPICIOUS_TLD",
  "LINK_OBFUSCATED",
  "LINK_SHORTENER",
  "LINK_COMPLEX_HOST",
  "LINK_DIGIT_HYPHEN",
  "LINK_HOMOGLYPH",
  "LINK_DOMAIN_NEW",
  "LINK_DOMAIN_AGE_OK",
  "LINK_DOMAIN_NOT_REGISTERED"
]);

const REPUTATION_BACKEND_REASON_IDS = new Set(["LINK_TYPOSQUAT"]);

function backendCategoryFor(id: string): WebReasonCategory {
  if (TECHNOLOGY_BACKEND_REASON_IDS.has(id)) return "technology";
  if (REPUTATION_BACKEND_REASON_IDS.has(id)) return "reputation";
  if (id === "LINK_GAMBLING" || id.startsWith("LINK_DESTROYLIST") || id.startsWith("LINK_SCAM")) return "security";
  return "reference";
}

async function mergeBackendAnalysis(reasons: WebVerificationReason[], scoreRef: { value: number }, hostname: string) {
  try {
    const response = await fetch("/api/analyze-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hostname })
    });
    if (!response.ok) return;
    const data = await response.json();
    if (!data || !Array.isArray(data.reasons)) return;

    const existingIds = new Set(reasons.map((r) => r.id));
    for (const br of data.reasons) {
      if (existingIds.has(br.id) || BACKEND_SKIP_REASONS.has(br.id)) continue;
      existingIds.add(br.id);
      scoreRef.value += br.scoreDelta || 0;
      reasons.push({
        id: br.id,
        name: br.name,
        detail: br.detail,
        status: br.status === "danger" ? "danger" : br.status === "success" ? "success" : "warning",
        icon: br.status === "danger" ? AlertTriangle : br.status === "success" ? ShieldCheck : Info,
        category: backendCategoryFor(br.id),
        scoreDelta: br.scoreDelta || 0
      });
    }
  } catch {
    // Backend không có sẵn -> chỉ dùng heuristics cục bộ.
  }
}

// Phát hiện Google Safe Browsing warning page
async function detectGoogleWarningPage(url: string): Promise<{ isWarning: boolean; warningType: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    
    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    
    // Google Safe Browsing warning patterns
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
      'what is the danger of a deceptive site',
      'deceptive traffic warning',
      'the web page at',
      'has been reported as a deceptive site',
      'has been reported as a malicious site',
      'warning: potential security risk ahead',
      'ssl connection error',
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
    
    // Check for Google warning page indicators
    const hasWarningTitle = /<title[^>]*>(.*?(?:deceptive|malware|phishing|warning|danger|harmful|suspicious).*?)<\/title>/i.test(html);
    const hasWarningBody = googleWarningPatterns.some(pattern => lowerHtml.includes(pattern));
    const hasBackToSafety = lowerHtml.includes('back to safety') || lowerHtml.includes('quay lại an toàn');
    const hasReportButton = lowerHtml.includes('report this deceptive site') || lowerHtml.includes('báo cáo trang web này');
    
    // Check for interstitial warning page structure
    const hasInterstitialStructure = 
      lowerHtml.includes('safe-browsing') ||
      lowerHtml.includes('google-warning') ||
      lowerHtml.includes('warning-content') ||
      lowerHtml.includes('error-code') && lowerHtml.includes('phishing');
    
    const isWarning = hasWarningTitle || hasWarningBody || hasBackToSafety || hasInterstitialStructure;
    let warningType = 'unknown';
    
    if (lowerHtml.includes('phishing') || lowerHtml.includes('deceptive')) {
      warningType = 'phishing';
    } else if (lowerHtml.includes('malware') || lowerHtml.includes('malicious')) {
      warningType = 'malware';
    } else if (lowerHtml.includes('social engineering')) {
      warningType = 'social_engineering';
    } else if (hasInterstitialStructure) {
      warningType = 'interstitial';
    }
    
    return { isWarning, warningType };
  } catch (error) {
    // Nếu fetch fail (CORS, timeout, etc.) → không detect được
    return { isWarning: false, warningType: 'fetch_error' };
  }
}

// Mức an toàn hiển thị: backend dùng R (risk) — frontend hiển thị dưới dạng điểm an toàn 0-100
function stateFromScore(score: number, collectedSignals: number): WebVerdictState {
  if (score < 45) return "danger";
  if (score < 60) return "warning";
  // Chỉ ghi nhận AN TOÀN khi đủ bằng chứng đã thu thập
  if (score >= 75 && collectedSignals >= 3) return "safe";
  return "verify";
}

// ===== Metadata 8 tiêu chí (khớp server riskEngineV2) =====
const CRITERIA_META: Record<string, { name: string; weight: number; icon: any; category: WebReasonCategory }> = {
  c1: { name: "Tuổi tên miền", weight: 0.20, icon: Database, category: "technology" },
  c2: { name: "Chứng chỉ HTTPS", weight: 0.15, icon: ShieldCheck, category: "technology" },
  c3: { name: "Cấu hình DNS", weight: 0.10, icon: Globe, category: "technology" },
  c4: { name: "Nội dung trang", weight: 0.15, icon: Search, category: "security" },
  c5: { name: "Feed bên thứ 3", weight: 0.15, icon: AlertTriangle, category: "security" },
  c6: { name: "Typosquat thương hiệu", weight: 0.10, icon: AlertTriangle, category: "reputation" },
  c7: { name: "Chuỗi chuyển hướng", weight: 0.08, icon: ExternalLink, category: "technology" },
  c8: { name: "Dấu vết web (Wayback)", weight: 0.07, icon: Database, category: "reference" }
};

// ===== Lấy kết quả từ Backend Zero-Trust v2 qua Async Job + Polling =====
// Gửi URL lên VPS, nhận jobId ngay (~100ms, không dính timeout Vercel),
// rồi poll GET /status?jobId=... mỗi 1.5s cho tới khi có kết quả.
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_WAIT_MS = 75000;

interface WebVerifyJobResult extends BackendWebResult {
  cached?: boolean;
}

async function submitWebVerifyJob(url: string): Promise<{ jobId: string | null; result?: WebVerifyJobResult } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const response = await fetch("/api/v2/web-verify/async", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.success !== true) return null;
    // Cache hit → có result ngay
    if (data.status === "done" && data.result) {
      return { jobId: null, result: data.result };
    }
    if (data.jobId) return { jobId: data.jobId };
    return null;
  } catch {
    return null;
  }
}

async function pollWebVerifyJob(jobId: string): Promise<WebVerifyJobResult | null> {
  const deadline = Date.now() + POLL_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`/api/v2/web-verify/status?jobId=${encodeURIComponent(jobId)}`, {
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const data = await response.json();
      if (data?.status === "done" && data?.result) return data.result;
      if (data?.status === "error") return null;
    } catch {
      // lỗi mạng tạm thời → poll tiếp
    }
  }
  return null;
}

async function fetchBackendWebVerify(url: string): Promise<BackendWebResult | null> {
  const submitted = await submitWebVerifyJob(url);
  if (!submitted) return null;
  if (submitted.result) return submitted.result;
  if (!submitted.jobId) return null;
  return pollWebVerifyJob(submitted.jobId);
}

// ===== Lấy kết quả từ Backend Zero-Trust v2 (nếu máy chủ phản hồi) =====
interface BackendThirdPartySource {
  source: string;
  name: string;
  listed: boolean;
  severity: "high" | "clear" | "unknown";
  detail: string;
  item?: {
    domain?: string;
    detectedDate?: string | null;
    org?: string | null;
    orgSlug?: string | null;
    status?: string | null;
    type?: string | null;
  };
}

interface BackendIpInfoDetail {
  hostname: string;
  ips: string[];
  hosting: boolean | null;
  isp: string | null;
  org: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  asn: string | null;
  asName: string | null;
  rdapCidr: string | null;
  rdapName: string | null;
}

export interface BackendAiAnalysis {
  available: boolean;
  summary: string | null;
  category: string | null;
  risk: number;
  keywords: string[];
}

interface BackendWebResult {
  success: boolean;
  state: "safe" | "verify" | "suspicious" | "danger";
  R: number;
  C: number;
  collectedCriteria: number;
  criteria: Record<string, { collected: boolean; risk: number }>;
  reasons: string[];
  isPaaS: boolean;
  paasToken?: string;
  cloakDetected: boolean;
  blacklisted: boolean;
  blacklistSources: string[];
  thirdParty?: BackendThirdPartySource[];
  ipInfo?: { collected: boolean; detail: BackendIpInfoDetail };
  aiAnalysis?: BackendAiAnalysis;
  ownerVerify?: { available: boolean };
  coreCriteriaOk: boolean;
}

export async function analyzeWebsite(input: string): Promise<WebVerificationResult> {
  const reasons: WebVerificationReason[] = [];
  let score = 70;
  let normalizedUrl = normalizeUrl(input);
  let url: URL;
  try {
    url = new URL(normalizedUrl);
  }
  catch {
    normalizedUrl = `https://${input.trim().replace(/\s+/g, "")}`;
    url = new URL(normalizedUrl);
  }
  normalizedUrl = url.toString();
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const previewCandidates = getPreviewUrls(url);
  const parts = hostnameParts(hostname);
  const trusted = isDomainTrusted(url.toString());
  const isHttps = url.protocol === "https:";
  const isGov = isGovVnDomain(url.toString());
  const isShortener = URL_SHORTENER_DOMAINS.has(hostname);
  const hasSuspiciousTld = isSuspiciousTLD(url.toString());
  const usesIp = hasIpHostname(hostname);
  const hasPunycode = hostname.includes("xn--");
  const hyphenCount = (hostname.match(/-/g) ?? []).length;
  const isLongHost = hostname.length > 42 || parts.some((part) => part.length > 24);
  const hasBrandLookalike = hasLookalikeBrand(hostname);
  const hasCredentialKeywords = hasCredentialPath(url);
  const hasAuthInjection = normalizedUrl.includes("@");
  const destroylist = await checkDestroylist(hostname);
  const destroylistRiskScore = destroylist?.risk_score ?? destroylist?.riskScore ?? 0;
  const isDestroylistThreat = Boolean(destroylist?.threat || destroylist?.listed || destroylistRiskScore >= 40);
  
  // Phát hiện Google Safe Browsing warning page
  const googleWarning = await detectGoogleWarningPage(normalizedUrl);
  if (googleWarning.isWarning) {
    score = 0;
    reasons.unshift({
      id: "WEB_GOOGLE_WARNING",
      name: "CẢNH BÁO: Google phát hiện lừa đảo",
      detail: `Google Safe Browsing đã chặn trang web này (${googleWarning.warningType}). Trang web hiển thị cảnh báo lừa đảo/mã độc.`,
      status: "danger",
      icon: AlertTriangle,
      category: "security",
      scoreDelta: -100
    });
  }
  
  if (isHttps) {
    score += 10;
    reasons.push({
      id: "WEB_HTTPS",
      name: "HTTPS hợp lệ",
      detail: "URL sử dụng HTTPS, giảm rủi ro bị nghe lén khi tải trang.",
      status: "success",
      icon: ShieldCheck,
      category: "technology",
      scoreDelta: 10
    });
  } else
  {
    score -= 25;
    reasons.push({
      id: "WEB_HTTP",
      name: "Không dùng HTTPS",
      detail: "Website dùng HTTP, dữ liệu có thể bị can thiệp hoặc đọc lén trên đường truyền.",
      status: "danger",
      icon: AlertTriangle,
      category: "technology",
      scoreDelta: -25
    });
  }
  if (trusted) {
    score += trusted.trustScore >= 95 ? 25 : 16;
    reasons.push({
      id: "WEB_TRUSTED_DOMAIN",
      name: "Domain thuộc nguồn tin cậy",
      detail: `${hostname} nằm trong cơ sở dữ liệu nguồn tin cậy (${trusted.note || trusted.category}).`,
      status: "success",
      icon: Database,
      category: "reputation",
      scoreDelta: trusted.trustScore >= 95 ? 25 : 16
    });
  } else
  if (isGov) {
    score += 22;
    reasons.push({
      id: "WEB_GOV_DOMAIN",
      name: "Tên miền chính phủ",
      detail: "Tên miền có dạng cơ quan nhà nước, cần đối chiếu thêm cơ quan chủ quản trước khi nhập dữ liệu cá nhân.",
      status: "success",
      icon: ShieldCheck,
      category: "reputation",
      scoreDelta: 22
    });
  } else
  {
    score -= 8;
    reasons.push({
      id: "WEB_UNKNOWN_DOMAIN",
      name: "Domain chưa có trong danh sách tin cậy",
      detail: "Tên miền chưa nằm trong tập nguồn đã xác minh, cần kiểm tra kỹ trước khi đăng nhập hoặc thanh toán.",
      status: "warning",
      icon: Info,
      category: "reputation",
      scoreDelta: -8
    });
  }
  if (isDestroylistThreat) {
    const severity = destroylist?.severity || destroylist?.status || "unknown";
    score -= destroylistRiskScore >= 70 ? 70 : destroylistRiskScore >= 40 ? 50 : 35;
    reasons.push({
      id: "WEB_DESTROYLIST_HIT",
      name: "Có trong Destroylist",
      detail: `Destroylist đánh dấu domain này là nguy cơ ${severity}, điểm rủi ro ${destroylistRiskScore || "không rõ"}/100 (${destroylist?.source === "raw-feed" ? "raw feed GitHub" : "live API"}).`,
      status: "danger",
      icon: AlertTriangle,
      category: "security",
      scoreDelta: destroylistRiskScore >= 70 ? -70 : destroylistRiskScore >= 40 ? -50 : -35
    });
  } else
  if (destroylist) {
    score += 6;
    reasons.push({
      id: "WEB_DESTROYLIST_CLEAR",
      name: "Destroylist chưa ghi nhận",
      detail: `Domain chưa xuất hiện trong Destroylist tại thời điểm kiểm tra (${destroylist.source === "raw-feed" ? "raw feed GitHub" : "live API"}). Đây không phải bảo chứng an toàn tuyệt đối.`,
      status: "success",
      icon: Database,
      category: "security",
      scoreDelta: 6
    });
  } else
  {
    reasons.push({
      id: "WEB_DESTROYLIST_UNAVAILABLE",
      name: "Chưa gọi được Destroylist",
      detail: "Không lấy được dữ liệu từ API Destroylist trong lần kiểm tra này, hệ thống tiếp tục dựa vào các tín hiệu URL nội bộ.",
      status: "warning",
      icon: Database,
      category: "security",
      scoreDelta: 0
    });
  }
  if (hasSuspiciousTld) {
    score -= 30;
    reasons.push({
      id: "WEB_SUSPICIOUS_TLD",
      name: "Đuôi tên miền rủi ro",
      detail: "Một số đuôi tên miền giá rẻ thường xuất hiện trong chiến dịch phishing hoặc landing page lừa đảo.",
      status: "danger",
      icon: Globe,
      category: "technology",
      scoreDelta: -30
    });
  }
  if (usesIp || hasPunycode || hasAuthInjection) {
    score -= 35;
    reasons.push({
      id: "WEB_OBFUSCATED_URL",
      name: "URL có dấu hiệu che giấu",
      detail: "URL dùng IP, punycode hoặc ký tự @, đây là nhóm kỹ thuật thường dùng để đánh lừa người xem.",
      status: "danger",
      icon: ExternalLink,
      category: "technology",
      scoreDelta: -35
    });
  }
  if (isShortener) {
    score -= 22;
    reasons.push({
      id: "WEB_SHORTENER",
      name: "Link rút gọn",
      detail: "Link rút gọn che khuất domain đích, không nên nhập thông tin nhạy cảm trước khi mở rộng URL.",
      status: "warning",
      icon: Search,
      category: "technology",
      scoreDelta: -22
    });
  }
  if (hasBrandLookalike) {
    score -= 38;
    reasons.push({
      id: "WEB_BRAND_LOOKALIKE",
      name: "Nghi vấn giả mạo thương hiệu",
      detail: "Tên miền chứa từ khóa thương hiệu nhưng không khớp domain chính thức đã biết.",
      status: "danger",
      icon: AlertTriangle,
      category: "reputation",
      scoreDelta: -38
    });
  }
  if (hasCredentialKeywords && !trusted) {
    score -= 20;
    reasons.push({
      id: "WEB_CREDENTIAL_TRAP",
      name: "Đường dẫn yêu cầu xác thực",
      detail: "URL có dấu hiệu hướng tới đăng nhập/xác thực tài khoản trên domain chưa xác minh.",
      status: "warning",
      icon: Search,
      category: "security",
      scoreDelta: -20
    });
  }
  if (hyphenCount >= 3 || isLongHost) {
    score -= 12;
    reasons.push({
      id: "WEB_COMPLEX_HOST",
      name: "Tên miền bất thường",
      detail: "Hostname dài hoặc có nhiều dấu gạch ngang, dễ được dùng để mô phỏng domain chính thức.",
      status: "warning",
      icon: Sparkles,
      category: "technology",
      scoreDelta: -12
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      id: "WEB_BASELINE",
      name: "Không thấy dấu hiệu rõ ràng",
      detail: "Chưa phát hiện tín hiệu nguy hiểm mạnh, nhưng vẫn cần thận trọng nếu website yêu cầu đăng nhập hoặc thanh toán.",
      status: "warning",
      icon: Info,
      category: "reference",
      scoreDelta: 0
    });
  }

  const scoreRef = { value: score };
  // Chạy SONG SONG: lấy kết quả authoritative từ backend (AI 8 tiêu chí) VÀ merge phân tích link.
  // Trước đây gọi tuần tự khiến backend chậm → UI hay rơi xuống heuristics cục bộ.
  const [, backendV2] = await Promise.all([
    mergeBackendAnalysis(reasons, scoreRef, hostname),
    fetchBackendWebVerify(normalizedUrl)
  ]) as [void, BackendWebResult | null];
  score = Math.max(0, Math.min(100, scoreRef.value));

  // ===== Ưu tiên kết quả authoritative từ Backend Zero-Trust v2 =====
  if (backendV2) {
    const R = Math.min(100, Math.max(0, Number(backendV2.R) || 0));
    const C = Math.min(1, Math.max(0, Number(backendV2.C) || 0));
    const safetyScore = Math.round(100 - R);
    const state: WebVerdictState = backendV2.state === "suspicious" ? "warning" : backendV2.state;

    const criteria: WebCriterionDetail[] = Object.keys(CRITERIA_META).map((key) => {
      const meta = CRITERIA_META[key];
      const raw = backendV2.criteria?.[key];
      const risk = raw?.risk || 0;
      return {
        key,
        name: meta.name,
        weight: meta.weight,
        collected: Boolean(raw?.collected),
        risk,
        status: risk >= 45 ? "danger" : risk >= 20 ? "warning" : "success",
        icon: meta.icon,
        category: meta.category
      };
    });

    const v2reasons: WebVerificationReason[] = [];
    if (backendV2.blacklisted) {
      v2reasons.push({
        id: "WEB_BLACKLIST_HIT",
        name: "NẰM TRONG DANH SÁCH ĐEN",
        detail: `Domain xuất hiện trong ${backendV2.blacklistSources?.length ? backendV2.blacklistSources.join(", ") : "feed bên thứ 3"}.`,
        status: "danger",
        icon: AlertTriangle,
        category: "security",
        scoreDelta: -100
      });
    }
    if (backendV2.cloakDetected) {
      v2reasons.push({
        id: "WEB_CLOAK_DETECTED",
        name: "Phát hiện cloaking",
        detail: "Website trả nội dung khác nhau giữa bot quét và trình duyệt thật — kỹ thuật che giấu điển hình của trang lừa đảo.",
        status: "danger",
        icon: AlertTriangle,
        category: "technology",
        scoreDelta: -45
      });
    }
    if (backendV2.isPaaS) {
      v2reasons.push({
        id: "WEB_PAAS_SUBDOMAIN",
        name: "Subdomain PaaS/SaaS",
        detail: backendV2.paasToken ? `Subdomain "${backendV2.paasToken}" trên nền tảng PaaS — không kế thừa uy tín của root domain.` : "Subdomain trên nền tảng PaaS — không kế thừa uy tín của root domain.",
        status: "warning",
        icon: Info,
        category: "technology",
        scoreDelta: 0
      });
    }
    for (const c of criteria) {
      let detail: string;
      if (!c.collected) {
        detail = "Chưa đủ dữ liệu để kiểm tra mục này — không phạt nhưng cũng chưa thể kết luận.";
      } else if (c.risk <= 0) {
        detail = "Không phát hiện vấn đề.";
      } else {
        detail = c.risk >= 45 ? "Có dấu hiệu rủi ro rõ ràng." : c.risk >= 20 ? "Có vài dấu hiệu cần lưu ý." : "Có dấu hiệu nhỏ cần kiểm tra thêm.";
      }
      v2reasons.push({
        id: `C_${c.key}`,
        name: c.name,
        detail,
        status: c.collected ? (c.risk >= 45 ? "danger" : c.risk >= 20 ? "warning" : "success") : "warning",
        icon: c.icon,
        category: c.category,
        scoreDelta: 0
      });
    }
    for (const r of backendV2.reasons || []) {
      v2reasons.push({
        id: "WEB_BACKEND_NOTE",
        name: "Ghi chú của Lá Chắn Số",
        detail: r,
        status: "warning",
        icon: Info,
        category: "reference",
        scoreDelta: 0
      });
    }

    return {
      state,
      isSafe: state === "safe",
      isWarning: state === "warning",
      isDanger: state === "danger",
      needsVerification: state === "verify",
      riskScore: R,
      coverage: C,
      criteria,
      ownerVerifyEmail: undefined,
      ownerVerifyAvailable: Boolean(backendV2.ownerVerify?.available),
      blacklisted: backendV2.blacklisted,
      blacklistSources: backendV2.blacklistSources || [],
      thirdParty: backendV2.thirdParty || [],
      ipInfo: backendV2.ipInfo || null,
      aiAnalysis: backendV2.aiAnalysis || null,
      executionTimeMs: undefined,
      backendV2: true,
      normalizedUrl,
      displayUrl: hostname,
      score: safetyScore,
      title: backendV2.blacklisted ? `Cảnh báo ${hostname}` : `Đánh giá website ${hostname}`,
      description: `Hệ thống Zero-Trust 9 tiêu chí đã phân tích (điểm rủi ro ${R}/100, độ phủ dữ liệu ${Math.round(C * 100)}%, ${backendV2.collectedCriteria}/9 tiêu chí thu thập được).`,
      screenshot: previewCandidates[0] ?? "",
      previewCandidates,
      reasons: v2reasons
    };
  }

  // ===== Fallback cục bộ khi backend v2 không khả dụng =====
  let state = stateFromScore(score, reasons.length);
  // KHÔNG tự khẳng định "An toàn" nếu chưa có xác nhận từ backend AI hoặc domain tin cậy:
  // nếu backend không phản hồi, kết quả cao nhất là "Cần xác minh".
  if (state === "safe" && !trusted) state = "verify";
  const localCriteria: WebCriterionDetail[] = Object.keys(CRITERIA_META).map((key) => {
    const meta = CRITERIA_META[key];
    const knownLocal: Record<string, { collected: boolean; risk: number }> = {
      c2: { collected: true, risk: isHttps ? 0 : 40 },
      c6: { collected: true, risk: hasBrandLookalike ? 60 : 0 }
    };
    const k = knownLocal[key] || { collected: false, risk: 0 };
    return {
      key,
      name: meta.name,
      weight: meta.weight,
      collected: k.collected,
      risk: k.risk,
      status: k.risk >= 45 ? "danger" : k.risk >= 20 ? "warning" : "success",
      icon: meta.icon,
      category: meta.category
    };
  });
  return {
    state,
    isSafe: state === "safe",
    isWarning: state === "warning",
    isDanger: state === "danger",
    needsVerification: state === "verify",
    riskScore: Math.round(100 - score),
    coverage: 0.3,
    criteria: localCriteria,
    ownerVerifyEmail: undefined,
    ownerVerifyAvailable: false,
    blacklisted: isDestroylistThreat,
    blacklistSources: [],
    executionTimeMs: undefined,
    backendV2: false,
    normalizedUrl,
    displayUrl: hostname,
    score,
    title: trusted ? `Đã nhận diện ${trusted.note || hostname}` : `Đánh giá website ${hostname}`,
    description: trusted ?
    "Domain khớp nguồn đã xác minh. Ảnh preview được tải qua lớp trung gian để không cần mở trực tiếp trong trình duyệt." :
    "Kết quả PHÂN TÍCH NHANH TẠI MÁY BẠN (backend AI chưa phản hồi kịp) — chỉ đánh giá URL, HTTPS và dấu hiệu phishing cơ bản, độ phủ thấp. Hãy thử lại sau để có đánh giá đầy đủ từ máy chủ.",
    screenshot: previewCandidates[0] ?? "",
    previewCandidates,
    reasons
  };
}

/**
 * Nhãn tiếng Việt + mô tả ngắn cho từng loại bản chất web do AI phân loại (c9).
 * Hiển thị trên khung "AI Tóm Tắt Nội Dung Web".
 */
export const WEB_AI_CATEGORY_LABEL: Record<string, { label: string; desc: string }> = {
  legit_business: { label: "Doanh nghiệp thật", desc: "Web doanh nghiệp · phân loại bản chất" },
  ecommerce: { label: "Bán hàng / TMĐT", desc: "Đọc trang qua GPT · phân loại bản chất" },
  news: { label: "Trang tin tức", desc: "Đọc trang qua GPT · phân loại bản chất" },
  blog: { label: "Blog / nội dung", desc: "Đọc trang qua GPT · phân loại bản chất" },
  gov_edu: { label: "Chính phủ / giáo dục", desc: "Đọc trang qua GPT · phân loại bản chất" },
  parked: { label: "Tên miền đứng tên (parked)", desc: "Cảnh báo: web có thể không hoạt động" },
  redirect: { label: "Chuyển hướng", desc: "Cảnh báo: web chuyển hướng đi nơi khác" },
  gambling: { label: "Cờ bạc / cá cược", desc: "Cảnh báo: cờ bạc lừa đảo" },
  adult: { label: "Nội dung người lớn", desc: "Cảnh báo: không phù hợp" },
  scam: { label: "Lừa đảo", desc: "Cảnh báo: dấu hiệu lừa đảo" },
  phishing: { label: "Lừa đảo chiếm đoạt", desc: "Cảnh báo cao: phishing" },
  unknown: { label: "Không xác định", desc: "Đọc trang qua GPT · phân loại bản chất" }
};
