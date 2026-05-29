import { AlertTriangle, Database, ExternalLink, Globe, Info, Landmark, Search, ShieldCheck, Sparkles } from "lucide-react";
import { extractLinksFromText, isDomainTrusted, isGovVnDomain, isSuspiciousTLD, TRUSTED_DOMAINS } from "./trustedDomains";
import { getWikipediaProfile, compareFactsWithWikipedia } from "./wikipediaEnhanced";
import { extractClaimsFromText, verifyClaimsInBatch, crossVerifyClaim } from "./liveFactApiEnhanced";
import { parseGoogleNewsRSS, detectNewsClusters } from "./pressSourceEnhanced";
import { detectManipulation, temporalAnalysis, claimSpecificity, verifyWithWeights, combineAnalyses } from "../utils/consensusScorer";
import { PerformanceTracker, extractHighConfidenceClaims } from "../utils/performanceOptimizer";
import { withTimeout } from "../utils/performanceOptimizer";

export interface NewsAnalysisReason {
  id: string;
  name: string;
  detail: string;
  status: "danger" | "warning" | "success";
  icon: any;
}

export interface NewsVerificationSummary {
  source_audit: string;
  press_comparison: string;
  search_trace: string;
  fact_check: string;
}

export interface NewsVerificationResult {
  scoreDelta: number;
  reasons: NewsAnalysisReason[];
  summary: NewsVerificationSummary;
  trustedSourceCount: number;
  hasTrustedEvidence: boolean;
}

const PRESS_SOURCE_PATTERNS = [
  { label: "VnExpress", pattern: /\bvnexpress\b/i },
  { label: "Tuổi Trẻ", pattern: /\btuoi tre\b|\btuoitre\b/i },
  { label: "Thanh Niên", pattern: /\bthanh nien\b|\bthanhnien\b/i },
  { label: "Dân Trí", pattern: /\bdan tri\b|\bdantri\b/i },
  { label: "VTV", pattern: /\bvtv\b/i },
  { label: "VOV", pattern: /\bvov\b/i },
  { label: "Nhân Dân", pattern: /\bb[aá]o\s+nhan dan\b|\bnhandan\.vn\b|\bnhan dan online\b/i },
  { label: "Reuters", pattern: /\breuters\b/i },
  { label: "AP", pattern: /\bap news\b|\bassociated press\b/i },
  { label: "AFP", pattern: /\bafp\b/i },
  { label: "BBC", pattern: /\bbbc\b/i },
  { label: "CNN", pattern: /\bcnn\b/i },
];

const FACTCHECK_PATTERNS = [
  { label: "Google Fact Check", pattern: /\bgoogle fact check\b|\bfact check\b/i },
  { label: "FactCheck.org", pattern: /\bfactcheck\.org\b/i },
  { label: "Snopes", pattern: /\bsnopes\b/i },
  { label: "PolitiFact", pattern: /\bpolitifact\b/i },
  { label: "Full Fact", pattern: /\bfull fact\b|\bfullfact\b/i },
  { label: "Tin giả Chính phủ", pattern: /\btingia\b|\bcổng kiểm tin\b/i },
];

const RUMOR_CHAIN_PATTERN = /nghe nói|đồn rằng|rò rỉ|nguồn kín|một người bạn|admin báo|mxh lan truyền|viral khắp nơi|cộng đồng mạng đang chia sẻ/i;
const CITATION_PATTERN = /theo|dẫn nguồn|nguồn tin từ|thông cáo báo chí|đại diện .* cho biết|trao đổi với|xác nhận với|ghi nhận từ/i;
const DATE_PATTERN = /\b\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?\b|\bngày\s+\d{1,2}\b|\btháng\s+\d{1,2}\b|\bnăm\s+\d{4}\b/i;
const LOCATION_PATTERN = /\btại\s+[A-ZÀ-Ỹ][\p{L}\s.-]+|\bở\s+[A-ZÀ-Ỹ][\p{L}\s.-]+/iu;
const EXTRAORDINARY_PATTERN = /cả nước|toàn quốc|chấn động|khẩn cấp|bùng phát|phong tỏa|bắt giữ|sập|vỡ nợ|đảo chính|ngày tận thế/i;
const FALSE_VALIDATION_PATTERN = /google xác nhận|AI xác nhận|facebook xác thực|được thuật toán chứng minh|đã được internet kiểm chứng/i;

const BIRTH_YEAR_PATTERN = /([a-zA-ZÀ-ỹ\s.'-]{3,60})\s+sinh\s+n[aă]m\s+(\d{4})/i;
const FULL_BIRTHDATE_PATTERN = /([a-zA-ZÀ-ỹ\s.'-]{3,80})\s+sinh\s+ng[aà]y\s+(\d{1,2})\s+th[aá]ng\s+(\d{1,2})\s+n[aă]m\s+(\d{4})/i;
const BIRTH_OF_PERSON_PATTERN = /ng[aà]y\s+(\d{1,2})\s+th[aá]ng\s+(\d{1,2})\s+l[aà]\s+ng[aà]y\s+sinh\s+c[ủu]a\s+([a-zA-ZÀ-ỹ\s.'-]{3,80})/i;
const DATE_RANGE_PATTERN = /\(\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*\)/i;

const KNOWN_BIRTH_YEARS = [
  { canonical: "donald trump", aliases: ["donald trump", "donal trump", "trump"], birthYear: 1946 },
  { canonical: "barack obama", aliases: ["barack obama", "obama"], birthYear: 1961 },
  { canonical: "joe biden", aliases: ["joe biden", "biden"], birthYear: 1942 },
  { canonical: "elon musk", aliases: ["elon musk", "musk"], birthYear: 1971 },
  { canonical: "bill gates", aliases: ["bill gates", "gates"], birthYear: 1955 },
  { canonical: "ho chi minh", aliases: ["ho chi minh", "chu tich ho chi minh", "hồ chí minh", "chủ tịch hồ chí minh", "nguyen sinh cung", "nguyễn sinh cung"], birthYear: 1890 },
];

const KNOWN_BIRTHDATES = [
  { canonical: "donald trump", aliases: ["donald trump", "donal trump", "trump"], day: 14, month: 6, year: 1946 },
  { canonical: "barack obama", aliases: ["barack obama", "obama"], day: 4, month: 8, year: 1961 },
  { canonical: "joe biden", aliases: ["joe biden", "biden"], day: 20, month: 11, year: 1942 },
  { canonical: "ho chi minh", aliases: ["ho chi minh", "chu tich ho chi minh", "hồ chí minh", "chủ tịch hồ chí minh", "nguyen sinh cung", "nguyễn sinh cung"], day: 19, month: 5, year: 1890 },
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function collectTextMentions(text: string, patterns: Array<{ label: string; pattern: RegExp }>): string[] {
  return patterns.filter((item) => item.pattern.test(text)).map((item) => item.label);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function matchesKnownAlias(claimedPerson: string, aliases: string[]): boolean {
  const normalizedClaim = normalizeText(claimedPerson);
  return aliases.some((alias) => normalizedClaim.includes(normalizeText(alias)));
}

export function runNewsVerificationLayers(text: string): NewsVerificationResult {
  // Truncate để giảm CPU khi nội dung quá dài
  const input = text.length > 10000 ? text.slice(0, 10000) : text;

  const normalized = normalizeText(input);

  const links = extractLinksFromText(text);
  const trustedLinks = links.map((link) => isDomainTrusted(link)).filter(Boolean);
  const trustedMediaLinks = trustedLinks.filter((item) => item?.category === "media_vn" || item?.category === "media_global");
  const trustedFactLinks = trustedLinks.filter((item) => item?.category === "factcheck");
  const trustedGovLinks = trustedLinks.filter((item) => item?.category === "gov_vn" || item?.category === "gov_global");
  const suspiciousLinks = links.filter((link) => !isDomainTrusted(link) && (isSuspiciousTLD(link) || !isGovVnDomain(link)));

  const citedPressMentions = collectTextMentions(normalized, PRESS_SOURCE_PATTERNS);
  const citedFactMentions = collectTextMentions(normalized, FACTCHECK_PATTERNS);
  const trustedDomainsMentioned = TRUSTED_DOMAINS
    .filter((domain) => normalized.includes(domain.domain.replace(/^www\./, "")))
    .map((domain) => domain.domain);

  const allTrustedSources = unique([
    ...trustedLinks.map((item) => item!.domain),
    ...trustedDomainsMentioned,
    ...citedPressMentions,
    ...citedFactMentions,
  ]);

  const reasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;

  const hasCitation = CITATION_PATTERN.test(normalized);
  const hasDate = DATE_PATTERN.test(normalized);
  const hasLocation = LOCATION_PATTERN.test(text);
  const hasRumorChain = RUMOR_CHAIN_PATTERN.test(normalized);
  const hasExtraordinaryClaim = EXTRAORDINARY_PATTERN.test(normalized);
  const hasFalseValidation = FALSE_VALIDATION_PATTERN.test(normalized);
  const hasTrustedEvidence = allTrustedSources.length > 0;
  const trimmedText = text.trim();
  const sentenceCount = trimmedText.split(/[.!?]\s+/).filter(Boolean).length;
  const isShortStandaloneClaim = trimmedText.length <= 160 && sentenceCount <= 2;

  if (trustedFactLinks.length > 0 || citedFactMentions.length > 0) {
    scoreDelta += 18;
    reasons.push({
      id: "FACT_LAYER",
      name: "Có lớp fact-check tham chiếu",
      detail: `Nội dung có dấu vết kiểm chứng từ ${unique([...trustedFactLinks.map((item) => item!.domain), ...citedFactMentions]).slice(0, 3).join(", ")}.`,
      status: "success",
      icon: ShieldCheck,
    });
  }

  if ((trustedMediaLinks.length + trustedGovLinks.length) >= 2 || allTrustedSources.length >= 2) {
    scoreDelta += 16;
    reasons.push({
      id: "PRESS_MATCH",
      name: "Đối chiếu được nhiều nguồn",
      detail: `Phát hiện ${allTrustedSources.length} đầu mối tin cậy để đối chiếu chéo, phù hợp mô hình kiểm chứng báo chí.`,
      status: "success",
      icon: Database,
    });
  } else if (hasExtraordinaryClaim && !hasTrustedEvidence) {
    scoreDelta -= 22;
    reasons.push({
      id: "PRESS_GAP",
      name: "Tin lớn nhưng thiếu dấu vết báo chí",
      detail: "Nội dung đưa ra tuyên bố lớn nhưng không để lại nguồn báo chí, cổng chính phủ hoặc đầu mối kiểm chứng đủ tin cậy.",
      status: "danger",
      icon: Globe,
    });
  }

  if (hasCitation && hasDate && (hasLocation || hasTrustedEvidence)) {
    scoreDelta += 12;
    reasons.push({
      id: "TRACEABLE_ARTICLE",
      name: "Có thể truy vết như bài báo",
      detail: "Văn bản có cấu trúc gần với bản tin: có dẫn nguồn, mốc thời gian và ít nhất một tín hiệu địa điểm/nguồn xác thực.",
      status: "success",
      icon: Search,
    });
  } else if (hasExtraordinaryClaim && (!hasCitation || !hasDate)) {
    scoreDelta -= 15;
    reasons.push({
      id: "LOW_TRACEABILITY",
      name: "Khó truy vết trên Google",
      detail: "Nội dung mang tính sự kiện nhưng thiếu mốc thời gian hoặc dẫn nguồn, thường là dạng tin rất khó kiểm chứng bằng truy vết tìm kiếm.",
      status: "warning",
      icon: Search,
    });
  }

  if (hasRumorChain) {
    scoreDelta -= 18;
    reasons.push({
      id: "RUMOR_CHAIN",
      name: "Dạng truyền miệng/viral",
      detail: "Phát hiện ngôn ngữ kiểu 'nghe nói', 'rò rỉ', 'nguồn kín', 'mxh lan truyền' thay vì trích dẫn nguồn gốc rõ ràng.",
      status: "danger",
      icon: AlertTriangle,
    });
  }

  if (hasFalseValidation) {
    scoreDelta -= 20;
    reasons.push({
      id: "FAKE_VALIDATION",
      name: "Mạo danh xác thực công nghệ",
      detail: "Nội dung tự gán cho Google, AI hoặc nền tảng mạng xã hội vai trò 'xác nhận', đây là tín hiệu ngụy tạo độ tin cậy phổ biến.",
      status: "danger",
      icon: Sparkles,
    });
  }

  if (trustedLinks.length > 0 && suspiciousLinks.length > 0) {
    scoreDelta -= 10;
    reasons.push({
      id: "MIXED_SOURCES",
      name: "Trộn nguồn thật và nguồn lạ",
      detail: "Tin nhắn pha trộn nguồn đáng tin với link lạ/tên miền rủi ro, dễ tạo cảm giác hợp lệ giả.",
      status: "warning",
      icon: ExternalLink,
    });
  }

  if ((trustedGovLinks.length > 0 || citedPressMentions.length > 0) && !suspiciousLinks.length && !hasRumorChain) {
    scoreDelta += 8;
    reasons.push({
      id: "SOURCE_AUDIT_OK",
      name: "Chuỗi nguồn tương đối sạch",
      detail: "Không phát hiện dấu vết tên miền rủi ro trong khi có tham chiếu tới cơ quan/báo chí uy tín.",
      status: "success",
      icon: Landmark,
    });
  }

  if (!hasTrustedEvidence && !hasCitation && isShortStandaloneClaim) {
    scoreDelta -= 22;
    reasons.push({
      id: "UNSOURCED_CLAIM",
      name: "Khẳng định trống nguồn",
      detail: "Đây là một câu khẳng định ngắn nhưng không kèm nguồn, ngày, báo đối chiếu hay dấu vết xác minh. Mặc định không nên xếp vào mức an toàn cao.",
      status: "warning",
      icon: Info,
    });
  }

  if (normalized.includes("ho chi minh") && (normalized.includes("nguyen sinh ung") || normalized.includes("nguyen at thanh"))) {
    scoreDelta -= 60;
    reasons.push({
      id: "KNOWN_IDENTITY_MISMATCH",
      name: "Sai lệch danh tính đã biết",
      detail: "Dữ kiện nền cho thấy tên khai sinh/tên đi học của Hồ Chí Minh không khớp với mệnh đề trong văn bản.",
      status: "danger",
      icon: AlertTriangle,
    });
  }

  const birthOfPersonMatch = normalized.match(BIRTH_OF_PERSON_PATTERN);
  const dateRangeMatch = text.match(DATE_RANGE_PATTERN);

  if (birthOfPersonMatch) {
    const claimedDay = Number(birthOfPersonMatch[1]);
    const claimedMonth = Number(birthOfPersonMatch[2]);
    const claimedPerson = birthOfPersonMatch[3].trim().replace(/\s+/g, " ");
    const knownBirthdate = KNOWN_BIRTHDATES.find((person) =>
      matchesKnownAlias(claimedPerson, person.aliases),
    );

    if (knownBirthdate && (knownBirthdate.day !== claimedDay || knownBirthdate.month !== claimedMonth)) {
      scoreDelta -= 40;
      reasons.push({
        id: "KNOWN_BIRTHDAY_MISMATCH",
        name: "Sai ngày tháng sinh đã biết",
        detail: `Ngày/tháng sinh nêu trong câu không khớp với dữ kiện nền của ${knownBirthdate.canonical}.`,
        status: "danger",
        icon: AlertTriangle,
      });
    }
  }

  if (birthOfPersonMatch && dateRangeMatch) {
    const claimedPerson = birthOfPersonMatch[3].trim().replace(/\s+/g, " ");
    const knownBirthdate = KNOWN_BIRTHDATES.find((person) =>
      matchesKnownAlias(claimedPerson, person.aliases),
    );

    if (knownBirthdate) {
      const startDay = Number(dateRangeMatch[1]);
      const startMonth = Number(dateRangeMatch[2]);
      const startYear = Number(dateRangeMatch[3]);
      const endDay = Number(dateRangeMatch[4]);
      const endMonth = Number(dateRangeMatch[5]);
      const endYear = Number(dateRangeMatch[6]);

      const startMatches = knownBirthdate.day === startDay && knownBirthdate.month === startMonth && knownBirthdate.year === startYear;
      const endMatches = knownBirthdate.day === endDay && knownBirthdate.month === endMonth && knownBirthdate.year === endYear;

      if (!startMatches || !endMatches) {
        scoreDelta -= 65;
        reasons.push({
          id: "KNOWN_DATE_RANGE_MISMATCH",
          name: "Khoảng niên đại không khớp",
          detail: `Cặp mốc ngày trong ngoặc không khớp với ngày sinh đã biết của ${knownBirthdate.canonical}.`,
          status: "danger",
          icon: AlertTriangle,
        });
      }
    }
  }

  const fullBirthdateMatch = normalized.match(FULL_BIRTHDATE_PATTERN);
  if (fullBirthdateMatch) {
    const claimedPerson = fullBirthdateMatch[1].trim().replace(/\s+/g, " ");
    const claimedDay = Number(fullBirthdateMatch[2]);
    const claimedMonth = Number(fullBirthdateMatch[3]);
    const claimedYear = Number(fullBirthdateMatch[4]);
    const knownBirthdate = KNOWN_BIRTHDATES.find((person) =>
      matchesKnownAlias(claimedPerson, person.aliases),
    );

    if (knownBirthdate && (
      knownBirthdate.day !== claimedDay ||
      knownBirthdate.month !== claimedMonth ||
      knownBirthdate.year !== claimedYear
    )) {
      scoreDelta -= 60;
      reasons.push({
        id: "KNOWN_BIRTHDATE_MISMATCH",
        name: "Sai ngày sinh đã biết",
        detail: `Dữ kiện ngày sinh của ${knownBirthdate.canonical} không khớp với mệnh đề ${claimedDay}/${claimedMonth}/${claimedYear}.`,
        status: "danger",
        icon: AlertTriangle,
      });
    }
  }

  if (fullBirthdateMatch && !hasTrustedEvidence && !hasCitation) {
    scoreDelta -= 18;
    reasons.push({
      id: "BIOGRAPHY_FACT_WITHOUT_SOURCE",
      name: "Fact tiểu sử thiếu nguồn đối chiếu",
      detail: "Nội dung đang khẳng định dữ kiện tiểu sử cụ thể nhưng không kèm nguồn báo chí, cổng dữ liệu hay lớp trích dẫn để kiểm chứng.",
      status: "warning",
      icon: Search,
    });
  }

  const birthYearMatch = normalized.match(BIRTH_YEAR_PATTERN);
  if (birthYearMatch) {
    const claimedPerson = birthYearMatch[1].trim().replace(/\s+/g, " ");
    const claimedYear = Number(birthYearMatch[2]);
    const knownPerson = KNOWN_BIRTH_YEARS.find((person) =>
      matchesKnownAlias(claimedPerson, person.aliases),
    );

    if (knownPerson && knownPerson.birthYear !== claimedYear) {
      scoreDelta -= 45;
      reasons.push({
        id: "KNOWN_FACT_MISMATCH",
        name: "Sai lệch fact cơ bản",
        detail: `Mẫu kiểm tra tri thức nền cho thấy năm sinh của ${knownPerson.canonical} không khớp với giá trị ${claimedYear}.`,
        status: "danger",
        icon: AlertTriangle,
      });
    } else if (!knownPerson && !hasTrustedEvidence) {
      scoreDelta -= 12;
      reasons.push({
        id: "BIRTH_CLAIM_UNVERIFIED",
        name: "Mệnh đề năm sinh chưa được kiểm chứng",
        detail: "Nội dung đang khẳng định một fact tiểu sử cụ thể nhưng không có nguồn đi kèm để đối chiếu.",
        status: "warning",
        icon: Search,
      });
    }
  }

  if (!fullBirthdateMatch && birthYearMatch && !hasTrustedEvidence && !hasCitation) {
    scoreDelta -= 12;
    reasons.push({
      id: "BIOGRAPHY_YEAR_WITHOUT_SOURCE",
      name: "Năm sinh thiếu lớp kiểm chứng",
      detail: "Mệnh đề năm sinh đang đứng một mình, không có nguồn đối chiếu hay dấu vết báo chí/fact-check đi kèm.",
      status: "warning",
      icon: Search,
    });
  }

  const sourceAudit = trustedLinks.length > 0
    ? `Phát hiện ${trustedLinks.length} liên kết thuộc nguồn đã biết; ${suspiciousLinks.length} liên kết cần thẩm định thêm.`
    : suspiciousLinks.length > 0
      ? `Có ${suspiciousLinks.length} liên kết lạ/rủi ro nhưng chưa thấy liên kết từ nguồn báo chí hoặc cổng chính thống.`
      : "Không có liên kết trực tiếp; việc kiểm chứng phải dựa nhiều hơn vào dấu vết nguồn, mốc thời gian và cấu trúc bài viết.";

  const pressComparison = allTrustedSources.length >= 2
    ? `Có thể dựng đối chiếu chéo từ ${allTrustedSources.slice(0, 4).join(", ")}. Dấu vết nguồn đủ tốt để so sánh đa báo.`
    : hasExtraordinaryClaim
      ? "Tuyên bố mang tính 'tin lớn' nhưng chưa đủ dấu vết để đối chiếu với các báo/cổng dữ liệu lớn."
      : "Nguồn đối chiếu báo chí còn mỏng; cần thêm ít nhất 1-2 đầu mối chính thống để tăng độ chắc.";

  const searchTrace = hasCitation && hasDate
    ? "Bài viết có từ khóa truy vết, ngày tháng hoặc mô tả đủ cụ thể để kiểm tra qua tìm kiếm và đối chiếu lại tiêu đề."
    : "Thiếu cụm truy vết rõ ràng, khả năng cao sẽ cho kết quả tìm kiếm yếu hoặc chỉ ra các bài repost không nguồn.";

  const factCheck = trustedFactLinks.length > 0 || citedFactMentions.length > 0
    ? "Có tín hiệu fact-check hoặc lớp kiểm chứng độc lập đi kèm, phù hợp quy trình kiểm tin nâng cao."
    : hasFalseValidation
      ? "Nội dung đang 'mượn uy' công cụ tìm kiếm/nền tảng thay cho chứng cứ fact-check thật."
      : "Chưa thấy bằng chứng fact-check trực tiếp; cần xem đây là nội dung chưa được kiểm chứng hoàn tất.";

  return {
    scoreDelta,
    reasons,
    summary: {
      source_audit: sourceAudit,
      press_comparison: pressComparison,
      search_trace: searchTrace,
      fact_check: factCheck,
    },
    trustedSourceCount: allTrustedSources.length,
    hasTrustedEvidence,
  };
}

/**
 * ENHANCED VERIFICATION - Multi-layer consensus with AI/Wikipedia/Press integration
 * Combines Wikipedia, Fact APIs, Press coverage, manipulation detection, and temporal analysis
 */
export async function runEnhancedNewsVerification(text: string): Promise<{
  scoreDelta: number;
  reasons: NewsAnalysisReason[];
  summary: NewsVerificationSummary;
  manipulationScore: number;
  temporalRelevance: number;
  consensusDetails: string;
}> {
  const tracker = new PerformanceTracker();

  try {
    // Extract high-confidence claims only to reduce API calls
    const claims = extractHighConfidenceClaims(text);
    if (claims.length === 0) {
      const baseResult = runNewsVerificationLayers(text);
      return {
        ...baseResult,
        manipulationScore: 0,
        temporalRelevance: 0,
        consensusDetails: "No high-confidence claims to verify",
      };
    }

    // Run parallel verification tasks
    const tasks = [
      // 1. Fact-check claims
      () => withTimeout(verifyClaimsInBatch(claims.slice(0, 3)), 5000).then((r) => r || []),

      // 2. Wikipedia verification for persons mentioned
      async () => {
        const personMatches = text.match(/\b[A-ZÀ-Ỹ][\w\s.-]{2,}\b/gu) || [];
        const profiles = [];
        for (const name of personMatches.slice(0, 2)) {
          const profile = await withTimeout(getWikipediaProfile(name), 3000);
          if (profile) profiles.push(profile);
        }
        return profiles;
      },

      // 3. Press coverage analysis
      async () => {
        if (claims.length > 0) {
          const articles = await withTimeout(parseGoogleNewsRSS(claims[0], ["en", "vi"], 48), 4000).then(
            (r) => r || []
          );
          return detectNewsClusters(articles);
        }
        return [];
      },

      // 4. Manipulation detection
      () => Promise.resolve(detectManipulation(text)),

      // 5. Temporal analysis
      () => Promise.resolve(temporalAnalysis(text, new Date())),

      // 6. Claim specificity
      () => Promise.resolve(claimSpecificity(claims[0] || text)),
    ];

    const [factCheckResults, wikipediaProfiles, newsCluster, manipulation, temporal, specificity] =
      await Promise.all(tasks.map((task) => task()));

    tracker.recordApiCall();

    // Convert results to structured format
    const factCheckArticles: any[] = factCheckResults || [];
    const pressArticles = newsCluster && newsCluster.length > 0 ? newsCluster[0].relatedArticles : [];

    // Calculate consensus
    const consensus = verifyWithWeights(
      wikipediaProfiles && wikipediaProfiles.length > 0 ? wikipediaProfiles[0] : null,
      factCheckArticles,
      pressArticles,
      claims[0] || text
    );

    // Combine all analyses
    const finalAnalysis = combineAnalyses(
      consensus,
      manipulation,
      temporal,
      specificity
    );

    // Build reasons based on enhanced analysis
    const baseResult = runNewsVerificationLayers(text);
    const reasons: NewsAnalysisReason[] = [...baseResult.reasons];
    let scoreDelta = baseResult.scoreDelta;

    // Add enhanced verification reasons
    if (finalAnalysis.confidence > 0.8) {
      scoreDelta += 25;
      reasons.push({
        id: "ENHANCED_VERIFIED",
        name: "Xác minh bằng công nghệ nâng cao",
        detail: `Nội dung được kiểm chứng qua Wikipedia, Fact Check API, và coverage báo chí (độ tin cậy: ${Math.round(finalAnalysis.confidence * 100)}%).`,
        status: "success",
        icon: ShieldCheck,
      });
    } else if (finalAnalysis.finalVerdict === "false") {
      scoreDelta -= 50;
      reasons.push({
        id: "ENHANCED_FALSE",
        name: "Được xác định là sai lệch",
        detail: `Nội dung không phù hợp với dữ liệu Wikipedia, Fact Check, và coverage báo chí đa chiều.`,
        status: "danger",
        icon: AlertTriangle,
      });
    }

    if (manipulation.score > 0.6) {
      scoreDelta -= 30;
      const topPatterns = manipulation.patterns.slice(0, 2).map((p) => p.name).join(", ");
      reasons.push({
        id: "MANIPULATION_DETECTED",
        name: "Phát hiện ngôn ngữ thao túng",
        detail: `Nội dung chứa tín hiệu thao túng tâm lý: ${topPatterns}. Độ rủi ro thao túng: ${Math.round(manipulation.score * 100)}%.`,
        status: "warning",
        icon: AlertTriangle,
      });
    }

    if (!temporal.isTimely && temporal.ageInDays > 365) {
      scoreDelta -= 15;
      reasons.push({
        id: "OUTDATED_CLAIM",
        name: "Tuyên bố lỗi thời",
        detail: `Nội dung đề cập sự kiện cũ (${temporal.ageInDays} ngày trước) mà không có bối cảnh lịch sử phù hợp.`,
        status: "warning",
        icon: Info,
      });
    }

    const consensusDetails =
      `Multi-source consensus: ${finalAnalysis.finalVerdict.toUpperCase()} (${Math.round(finalAnalysis.confidence * 100)}% confidence). ` +
      `Sources: ${finalAnalysis.sourceCount} verified. ` +
      `Manipulation risk: ${Math.round(manipulation.score * 100)}%.`;

    return {
      scoreDelta,
      reasons,
      summary: baseResult.summary,
      manipulationScore: manipulation.score,
      temporalRelevance: temporal.relevance,
      consensusDetails,
    };
  } catch (error) {
    console.error("[v0] Enhanced verification error:", error);
    // Fallback to base verification
    const baseResult = runNewsVerificationLayers(text);
    return {
      ...baseResult,
      manipulationScore: 0,
      temporalRelevance: 0,
      consensusDetails: "Enhanced verification unavailable",
    };
  }
}
