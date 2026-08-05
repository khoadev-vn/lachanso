import { AlertTriangle, Database, ExternalLink, Globe, Info, Search, ShieldCheck, Sparkles } from "lucide-react";
import { WEB_API_CONFIG } from "../config/webApis";
import { extractLinksFromText, isDomainTrusted, isGovVnDomain, isSuspiciousTLD } from "./trustedDomains";
export type WebReasonCategory = "technology" | "reputation" | "security" | "reference";
export interface WebVerificationReason {
  id: string;
  name: string;
  detail: string;
  status: "danger" | "warning" | "success";
  icon: any;
  category?: WebReasonCategory;
  scoreDelta?: number;
}
export interface WebVerificationResult {
  isSafe: boolean;
  isWarning: boolean;
  isDanger: boolean;
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
"apple"];

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
    "apple": ["apple.com"]
  };
  
  return BRAND_KEYWORDS.some((brand) => {
    // Check if brand is in the hostname
    if (!compactHost.includes(brand)) return false;
    
    // Check if it's an official domain
    const official = officialDomains[brand] || [];
    const isOfficial = official.some(d => hostname.endsWith(d) || hostname === d);
    
    // If it's not official, it's a lookalike
    return !isOfficial;
  });
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
      detail: `Destroylist đánh dấu domain này là nguy cơ ${severity}, điểm rủi ro ${destroylistRiskScore || "không rõ"}/100 (${destroylist.source === "raw-feed" ? "raw feed GitHub" : "live API"}).`,
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
  await mergeBackendAnalysis(reasons, scoreRef, hostname);
  score = Math.max(0, Math.min(100, scoreRef.value));
  return {
    isSafe: score >= 75,
    isWarning: score >= 50 && score < 75,
    isDanger: score < 50,
    normalizedUrl,
    displayUrl: hostname,
    score,
    title: trusted ? `Đã nhận diện ${trusted.note || hostname}` : `Đánh giá website ${hostname}`,
    description: trusted ?
    "Domain khớp nguồn đã xác minh. Ảnh preview được tải qua lớp trung gian để không cần mở trực tiếp trong trình duyệt." :
    "Hệ thống đã phân tích cấu trúc URL, domain, HTTPS và dấu hiệu phishing trước khi hiển thị preview.",
    screenshot: previewCandidates[0] ?? "",
    previewCandidates,
    reasons
  };
}
