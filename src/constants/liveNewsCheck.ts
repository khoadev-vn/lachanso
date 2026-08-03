import { AlertTriangle, Database, Globe, Search, ShieldCheck, Shield } from "lucide-react";
import { NEWS_API_CONFIG } from "../config/newsApis";
import { VERIFICATION_CONFIG } from "../config/verificationConfig";
import type { NewsAnalysisReason } from "./newsVerification";
import { compareIdentityClaimsWithWikipedia, compareProfileClaimWithWikipedia, compareStatusClaimsWithWikipedia, extractStatusClaims, extractWikipediaClaims, type WikipediaIdentityClaim } from "./wikipediaClaimExtractor";
import { verifyHeadline, isHeadlineText, getArticleClaimStance, type HeadlineVerificationResult } from "./headlineVerification";
import { searchNews, searchNewsByTopic, isTrustedNewsSource, getNewsApiMetrics } from "../utils/newsApiOptimized";
import { apiOrchestrator } from "../utils/apiOrchestrator";
import { withTimeout } from "../utils/performanceOptimizer";
import { aiEngine } from "../utils/transformerEngine";
import { evaluateTextArchetype } from "../utils/contextRouter";
export interface LiveNewsSummary {
  live_fact_check: string;
  live_press_scan: string;
  open_knowledge_check: string;
  headline_verification?: string;
}
export interface LiveNewsCheckResult {
  enabled: boolean;
  scoreDelta: number;
  reasons: NewsAnalysisReason[];
  summary: LiveNewsSummary;
  verifiedExternally: boolean;
  pressArticles: PressArticle[];
  pressSourceLabel: string;
}
interface PressArticle {
  title: string;
  source: string;
  link?: string;
  publishedAt?: string;
  description?: string;
  stance?: "supporting" | "contradicting" | "neutral" | "unrelated";
}
interface FactCheckReview {
  title?: string;
  url?: string;
  textualRating?: string;
  publisher?: {
    name?: string;
    site?: string;
  };
}
interface FactCheckClaim {
  text?: string;
  claimReview?: FactCheckReview[];
}
interface WikipediaSearchItem {
  title?: string;
}
interface WikipediaSearchResponse {
  pages?: WikipediaSearchItem[];
}
interface WikipediaSummaryResponse {
  title?: string;
  extract?: string;
  content_language?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}
interface DuckDuckGoResponse {
  Heading: string;
  AbstractText: string;
  AbstractURL: string;
}
interface BiographyClaim {
  personName: string;
  day: number;
  month: number;
  year: number;
  birthplace: string;
  deathDay?: number;
  deathMonth?: number;
  deathYear?: number;
}
const BACKEND_PROXY_ENABLED = true;
const PERSON_NAME_ALIASES = [
{
  canonical: "donald trump",
  aliases: ["donald trump", "donal trump", "tổng thống donald trump", "president donald trump"],
  wikiTitle: "Donald Trump"
},
{
  canonical: "barack obama",
  aliases: ["barack obama", "tổng thống barack obama", "president barack obama"],
  wikiTitle: "Barack Obama"
},
{
  canonical: "joe biden",
  aliases: ["joe biden", "tổng thống joe biden", "president joe biden"],
  wikiTitle: "Joe Biden"
},
{
  canonical: "nguyen phu trong",
  aliases: ["nguyễn phú trọng", "nguyen phu trong", "tổng bí thư nguyễn phú trọng"],
  wikiTitle: "Nguyễn Phú Trọng"
},
{
  canonical: "ho chi minh",
  aliases: ["hồ chí minh", "ho chi minh", "chủ tịch hồ chí minh", "chu tich ho chi minh", "nguyễn sinh cung", "nguyen sinh cung"],
  wikiTitle: "Ho Chi Minh"
},
{
  canonical: "cristiano ronaldo",
  aliases: ["cristiano ronaldo", "ronaldo", "cr7", "cristiano ronaldo dos santos aveiro"],
  wikiTitle: "Cristiano Ronaldo"
},
{
  canonical: "lionel messi",
  aliases: ["lionel messi", "messi", "leo messi", "lionel andrés messi", "lionel andres messi"],
  wikiTitle: "Lionel Messi"
},
{
  canonical: "kylian mbappe",
  aliases: ["kylian mbappe", "mbappe", "mbappé", "kylian mbappé"],
  wikiTitle: "Kylian Mbappé"
}];

const MONTH_NAMES_EN = [
"",
"january",
"february",
"march",
"april",
"may",
"june",
"july",
"august",
"september",
"october",
"november",
"december"];

const LOCATION_STOPWORDS = new Set([
"quan",
"huyen",
"phuong",
"xa",
"tinh",
"lang",
"thanh",
"pho",
"city",
"district",
"province",
"commune",
"village",
"state",
"country"]
);
const LOCATION_EQUIVALENTS: Record<string, string[]> = {
  "hoa ky": ["united states", "united states of america", "u s", "u s a", "usa", "america"],
  "my": ["united states", "usa", "america"],
  "new york": ["new york", "nyc", "new york city"],
  queens: ["queens", "queens county", "borough of queens"],
  "lang sen": ["lang sen", "sen village"],
  "kim lien": ["kim lien", "kim liên"],
  "nam dan": ["nam dan", "nam đàn"],
  "nghe an": ["nghe an", "nghệ an"]
};
const KNOWN_IDENTITY_FACTS = [
{
  canonical: "ho chi minh",
  aliases: ["hồ chí minh", "ho chi minh", "bác hồ", "bac ho", "nguyễn ái quốc", "nguyen ai quoc"],
  validNames: ["nguyễn sinh cung", "nguyen sinh cung", "nguyễn tất thành", "nguyen tat thanh", "nguyễn ái quốc", "nguyen ai quoc", "bác hồ", "bac ho", "hồ chí minh", "ho chi minh"]
}];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function compactWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}
const VIETNAMESE_STOPWORDS = new Set([
"và", "hoặc", "của", "là", "các", "những", "cho", "để", "với", "từ", "tới", "trong", "ngoài", "trên", "dưới", "qua", "lại", "rồi", "còn", "sẽ", "đã", "đang", "bị", "được", "có", "không", "thì", "mà", "như", "khi", "nếu", "bởi", "về", "vào", "ra", "đến", "này", "kia", "đó", "đây", "theo", "sau", "cùng", "nhau", "rất", "quá", "lắm", "hơi", "luôn", "vẫn", "cứ", "đều", "đang", "sắp", "mới", "vừa", "từng", "lên", "xuống", "đi", "lại", "thấy", "nhìn", "nghe", "biết", "hiểu", "nhớ", "quên", "nghĩ", "rằng", "thế", "nào", "gì", "ai", "đâu", "bao", "nhiêu", "lúc", "giờ", "phút", "giây", "ngày", "tháng", "năm", "vui", "lòng", "kính", "gửi", "trân", "trọng", "hướng", "dẫn", "thực", "hiện", "bước", "chi", "tiết", "cụ", "thể", "ví", "dụ", "thông", "báo", "chào", "bạn", "tôi", "chúng", "ta"]
);

function extractSearchKeywords(text: string): string {
  const multiCapMatch = text.match(/([\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+)+)/u);
  if (multiCapMatch) return multiCapMatch[1];

  const compacted = compactWhitespace(text);
  return compactWhitespace(compacted.replace(/^(là|tại|ở|vào|của|những|các|một)\s+/iu, "").replace(/[.,!?]/g, ""));
}

function extractCoreClaim(text: string): string {
  if (text.length < 100) return compactWhitespace(text);
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  let bestSentence = sentences[0];
  let maxScore = -1;
  for (const sentence of sentences) {
    if (sentence.length < 15 || sentence.length > 250) continue;
    const lower = sentence.toLowerCase();
    if (lower.includes("vui lòng") || lower.includes("bước") || lower.includes("kính gửi") || lower.includes("trân trọng") || lower.includes("hướng dẫn")) {
      continue;
    }
    let score = 0;
    const capsMatches = sentence.match(/[A-ZÀ-Ỹ][a-zà-ỹA-ZÀ-Ỹ]+/g);
    if (capsMatches) score += capsMatches.length * 2;
    const numMatches = sentence.match(/\d+/g);
    if (numMatches) score += numMatches.length;
    if (score > maxScore) {
      maxScore = score;
      bestSentence = sentence;
    }
  }
  if (maxScore <= 0) return extractSearchKeywords(text);
  return compactWhitespace(bestSentence).slice(0, 180);
}

function makeQuery(text: string): string {
  return extractCoreClaim(text);
}
function stripHonorifics(name: string): string {
  return name.
  replace(/^(tong thong|chu tich|thu tuong|tong bi thu|ong|ba|ngai|president|chairman)\s+/iu, "").
  trim();
}
function resolveKnownPerson(name: string) {
  const normalizedName = normalizeText(stripHonorifics(name));
  return PERSON_NAME_ALIASES.find((person) => person.aliases.some((alias) => normalizedName.includes(normalizeText(alias))));
}
function resolveKnownIdentityPerson(name: string) {
  const normalizedName = normalizeText(stripHonorifics(name));
  return KNOWN_IDENTITY_FACTS.find((person) => person.aliases.some((alias) => normalizedName.includes(normalizeText(alias))));
}
function extractIdentityClaim(text: string): WikipediaIdentityClaim | null {
  const compacted = compactWhitespace(text);
  const normalized = normalizeText(compacted);
  const knownPerson = PERSON_NAME_ALIASES.find((person) => person.aliases.some((alias) => normalized.includes(normalizeText(alias))));
  const leadingName = compacted.match(/^([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,5})[,，]/u)?.[1];
  const personName = knownPerson?.wikiTitle ?? leadingName;
  if (!personName)
  return null;
  const claimedNames: string[] = [];
  const patterns = [
  /tên khai sinh là\s+([^,.;]+)/iu,
  /tên khi đi học là\s+([^,.;]+)/iu,
  /còn được gọi[^,.;]*?(?:là|với tên gọi)\s+([^,.;]+)/iu,
  /bí danh là\s+([^,.;]+)/iu];

  for (const pattern of patterns) {
    const match = compacted.match(pattern);
    if (match?.[1]) {
      claimedNames.push(...match[1].split(/\s+hoặc\s+|\s+hay\s+|\/|;/iu));
    }
  }
  const cleanedNames = unique(claimedNames).
  map((name) => compactWhitespace(name.replace(/^(là|với tên gọi)\s+/iu, ""))).
  filter((name) => name.length >= 3);
  return cleanedNames.length > 0 ? { personName, claimedNames: cleanedNames } : null;
}
function extractBiographyClaim(text: string): BiographyClaim | null {
  let claim: BiographyClaim | null = null;


  const biographyMatch = text.match(/([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,7}).*?sinh ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})(?:.*?(?:tại|ở)\s+([^.!?\\]+))?/iu);
  if (biographyMatch) {
    claim = {
      personName: stripHonorifics(compactWhitespace(biographyMatch[1])),
      day: Number(biographyMatch[2]),
      month: Number(biographyMatch[3]),
      year: Number(biographyMatch[4]),
      birthplace: compactWhitespace(biographyMatch[5] ?? "")
    };
  } else {
    const invertedMatch = text.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+là\s+ngày\s+sinh\s+của\s+([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,7})(?:.*?\(\s*\d{1,2}\/\d{1,2}\/(\d{4})\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\))?(?:.*?(?:tại|ở)\s+([^.!?\\]+))?/iu);
    if (invertedMatch) {
      claim = {
        personName: stripHonorifics(compactWhitespace(invertedMatch[3])),
        day: Number(invertedMatch[1]),
        month: Number(invertedMatch[2]),
        year: Number(invertedMatch[4] ?? 0),
        birthplace: compactWhitespace(invertedMatch[5] ?? "")
      };
    }
  }


  if (!claim) {
    const compactBirthMatch = text.match(/Ngày.*?sinh\s+(\d{1,2})\s+tháng\s+(\d{1,2})[, ]+(\d{4})/iu);
    const nameMatch = text.match(/^([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,7})[,，]/u);
    if (compactBirthMatch && nameMatch) {
      claim = {
        personName: stripHonorifics(compactWhitespace(nameMatch[1])),
        day: Number(compactBirthMatch[1]),
        month: Number(compactBirthMatch[2]),
        year: Number(compactBirthMatch[3]),
        birthplace: ""
      };
    }
  }

  if (claim) {

    const deathMatch = text.match(/(?:mất|qua đời)[^\d]*?(\d{1,2})\s+tháng\s+(\d{1,2})[, ]+(\d{4})/iu);
    if (deathMatch) {
      claim.deathDay = Number(deathMatch[1]);
      claim.deathMonth = Number(deathMatch[2]);
      claim.deathYear = Number(deathMatch[3]);
    }
  }

  return claim;
}
function extractStatusClaimPerson(text: string): string | null {
  const known = PERSON_NAME_ALIASES.find((person) => person.aliases.some((alias) => normalizeText(text).includes(normalizeText(alias))));
  if (known) {
    return known.wikiTitle;
  }
  const leading = text.match(/^([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){0,5})[\s,，:]/u)?.[1];
  if (leading) {
    return compactWhitespace(leading);
  }
  const statusMatch = text.match(/([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){0,5})\s+(?:đ[ãa]|vừa|bất ngờ|đột ngột|sắp|chính thức)?\s*(?:giải nghệ|treo giày|qua đời|từ trần|tạ thế|mất|retired|died)/iu);
  return statusMatch?.[1] ? compactWhitespace(statusMatch[1]) : null;
}
function expandLocationSignals(location: string): string[] {
  const normalized = normalizeText(location).
  replace(/[()]/g, " ").
  replace(/[^a-z0-9,\s-]/g, " ").
  replace(/\b(quan|huyen|phuong|xa|tinh|lang|thanh pho|thanh|pho|city|district|province|commune|village)\b/g, " ").
  replace(/\s+/g, " ").
  trim();
  if (!normalized)
  return [];
  const phrases = unique([
  normalized,
  ...normalized.split(",").map((part) => part.trim()).filter(Boolean)]
  );
  const tokens = normalized.
  split(/[,\s-]+/).
  map((token) => token.trim()).
  filter((token) => token.length >= 3 && !LOCATION_STOPWORDS.has(token));
  const expanded = new Set<string>(tokens);
  for (const phrase of phrases) {
    if (phrase.length >= 3) {
      expanded.add(phrase);
    }
    for (const [key, aliases] of Object.entries(LOCATION_EQUIVALENTS)) {
      if (phrase.includes(key) || key.includes(phrase)) {
        aliases.forEach((alias) => expanded.add(normalizeText(alias)));
      }
    }
  }
  return Array.from(expanded).filter(Boolean);
}
function hasBiographyDateMatch(summary: string, claim: BiographyClaim): boolean {
  const monthName = MONTH_NAMES_EN[claim.month] ?? "";
  const directPatterns = [
  `${monthName} ${claim.day}, ${claim.year}`,
  `${monthName} ${claim.day} ${claim.year}`,
  `${claim.day} ${monthName} ${claim.year}`].
  filter(Boolean);
  if (directPatterns.some((pattern) => summary.includes(pattern))) {
    return true;
  }
  const tokens = [String(claim.day), String(claim.month), String(claim.year), monthName].filter(Boolean);
  return tokens.filter((token) => summary.includes(token)).length >= 3;
}
function titleMatchesPerson(summaryTitle: string, personClaim: {
  personName: string;
  claimedNames?: string[];
}, knownPerson?: {
  aliases: string[];
  canonical: string;
} | null): boolean {
  const normalizedTitle = normalizeText(summaryTitle);
  const expectedName = normalizeText(knownPerson?.canonical || personClaim.personName);
  const candidateNames = [personClaim.personName, ...(personClaim.claimedNames ?? [])].map(normalizeText);

  const titleTokens = normalizedTitle.split(/\s+/).filter(Boolean);
  const isTokenMatch = (target: string) => {
    const targetTokens = target.split(/\s+/).filter(Boolean);
    const overlap = titleTokens.filter((t) => targetTokens.includes(t));
    return targetTokens.length > 0 && titleTokens.length > 0 && overlap.length / Math.min(titleTokens.length, targetTokens.length) >= 0.7;
  };

  if (normalizedTitle.includes(expectedName) || expectedName.includes(normalizedTitle) || isTokenMatch(expectedName)) {
    return true;
  }
  if (candidateNames.some((name) => normalizedTitle.includes(name) || name.includes(normalizedTitle) || isTokenMatch(name))) {
    return true;
  }
  return knownPerson ?
  knownPerson.aliases.some((alias) => {
    const normAlias = normalizeText(alias);
    return normalizedTitle.includes(normAlias) || isTokenMatch(normAlias);
  }) :
  false;
}
function compareIdentityClaimWithWikipedia(identityClaim: WikipediaIdentityClaim, wikipediaSummary: WikipediaSummaryResponse | null) {
  if (wikipediaSummary?.extract) {
    const comparison = compareIdentityClaimsWithWikipedia(identityClaim, wikipediaSummary.title || identityClaim.personName, wikipediaSummary.extract);
    return {
      mismatchedNames: comparison.mismatchedNames,
      matchedCount: comparison.matchedNames.length
    };
  }
  const knownIdentity = resolveKnownIdentityPerson(identityClaim.personName);
  const summaryText = normalizeText(`${wikipediaSummary?.title || ""} ${wikipediaSummary?.extract || ""}`);
  const mismatchedNames = identityClaim.claimedNames.filter((name) => {
    const normalizedName = normalizeText(name);
    const inKnownFacts = knownIdentity?.validNames.some((validName) => normalizeText(validName) === normalizedName);
    const inWikipedia = summaryText.includes(normalizedName);
    return !inKnownFacts && !inWikipedia;
  });
  return {
    knownIdentity,
    mismatchedNames,
    matchedCount: identityClaim.claimedNames.length - mismatchedNames.length
  };
}
function buildFactCheckQueries(text: string, biographyClaim: BiographyClaim | null, knownPerson?: {
  wikiTitle: string;
} | null): string[] {
  const queries = [makeQuery(text)];
  if (biographyClaim) {
    queries.push(`${biographyClaim.personName} ${biographyClaim.day}/${biographyClaim.month}/${biographyClaim.year}`);
    queries.push(`${biographyClaim.personName} born ${MONTH_NAMES_EN[biographyClaim.month]} ${biographyClaim.day} ${biographyClaim.year}`);
  }
  if (knownPerson?.wikiTitle) {
    queries.push(knownPerson.wikiTitle);
  }
  return unique(queries.filter(Boolean));
}
function normalizeForPressMatch(text: string): string {
  return normalizeText(compactWhitespace(text)).replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}
function isStrongGoogleNewsMatch(text: string, title: string): boolean {
  const normalizedText = normalizeForPressMatch(text);
  const normalizedTitle = normalizeForPressMatch(title);
  if (!normalizedText || !normalizedTitle) {
    return false;
  }
  if (normalizedText === normalizedTitle) {
    return true;
  }
  if (normalizedText.includes(normalizedTitle) || normalizedTitle.includes(normalizedText)) {
    return true;
  }
  const textTokens = unique(normalizedText.split(/\s+/).filter(Boolean));
  const titleTokens = unique(normalizedTitle.split(/\s+/).filter(Boolean));
  if (textTokens.length === 0 || titleTokens.length === 0) {
    return false;
  }
  const matchedTokens = titleTokens.filter((token) => textTokens.includes(token));
  const overlapRatio = matchedTokens.length / Math.min(textTokens.length, titleTokens.length);
  return overlapRatio >= 0.7;
}

async function fetchBackendNews(text: string, query: string): Promise<{articles: PressArticle[];extractedEntities: string[];aiComparison: any | null;}> {
  try {
    const response = await fetch("/api/verify-news", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, query })
    });
    if (!response.ok) return { articles: [], extractedEntities: [], aiComparison: null };
    const data = await response.json();
    if (data.success && data.filteredArticles) {
      return {
        articles: data.filteredArticles.map((a: any) => ({
          title: a.title,
          source: a.source,
          link: a.link,
          description: a.description,
          stance: (a.stance === "supporting" || a.stance === "contradicting" || a.stance === "neutral" || a.stance === "unrelated")
            ? a.stance
            : getArticleClaimStance(a.title)
        })),
        extractedEntities: data.extractedEntities || [],
        aiComparison: data.aiComparison || null
      };
    }
    return { articles: [], extractedEntities: [], aiComparison: null };
  } catch {
    return { articles: [], extractedEntities: [], aiComparison: null };
  }
}

export interface LiveNewsAIEnrichment {
  scoreDelta: number;
  reasons: NewsAnalysisReason[];
  pressArticles: PressArticle[];
  verifiedExternally: boolean;
  mode: string;
}

function buildAIComparisonReasons(aiSummary: any): { scoreDelta: number; reasons: NewsAnalysisReason[]; verifiedExternally: boolean } {
  const reasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;
  let verifiedExternally = false;

  if (!aiSummary) {
    return { scoreDelta, reasons, verifiedExternally };
  }

  const aiVerdict = aiSummary.verdict;
  const supportingCount = aiSummary.counts?.supporting ?? 0;
  const contradictingCount = aiSummary.counts?.contradicting ?? 0;

  if (aiVerdict === "contradicted") {
    scoreDelta -= 45;
    reasons.push({
      id: "AI_MULTI_SOURCE_CONTRADICTED",
      name: "AI Đối chiếu đa nguồn: Tin mâu thuẫn",
      detail: `Ollama so sánh ${aiSummary.totalCompared} bài báo từ nhiều nguồn. ${contradictingCount} bài bác bỏ, ${supportingCount} bài ủng hộ. Các nguồn bác bỏ: ${(aiSummary.contradictingSources || []).slice(0, 4).join(", ") || "không xác định"}.`,
      status: "danger",
      icon: AlertTriangle
    });
  } else if (aiVerdict === "supported" && supportingCount >= 2) {
    scoreDelta += 40;
    verifiedExternally = true;
    reasons.push({
      id: "AI_MULTI_SOURCE_SUPPORTED",
      name: "AI Đối chiếu đa nguồn: Tin được xác nhận",
      detail: `Ollama so sánh ${aiSummary.totalCompared} bài báo từ nhiều nguồn. ${supportingCount} bài ủng hộ nội dung. Các nguồn: ${(aiSummary.supportingSources || []).slice(0, 4).join(", ") || "không xác định"}.`,
      status: "success",
      icon: ShieldCheck
    });
  } else if (aiVerdict === "inconclusive" && aiSummary.totalCompared >= 3) {
    scoreDelta += 2;
    reasons.push({
      id: "AI_MULTI_SOURCE_INCONCLUSIVE",
      name: "AI Đối chiếu đa nguồn: Chưa rõ ràng",
      detail: `Ollama so sánh ${aiSummary.totalCompared} bài báo nhưng số nguồn ủng hộ (${supportingCount}) và bác bỏ (${contradictingCount}) chưa đủ mạnh để kết luận. Cần đối chiếu thêm.`,
      status: "warning",
      icon: Globe
    });
  }

  return { scoreDelta, reasons, verifiedExternally };
}

export async function enrichLiveNewsWithAI(text: string): Promise<LiveNewsAIEnrichment | null> {
  try {
    const response = await fetch("/api/verify-news/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.success || !data.filteredArticles) return null;

    const pressArticles: PressArticle[] = data.filteredArticles.map((a: any) => ({
      title: a.title,
      source: a.source,
      link: a.link,
      description: a.description,
      stance: (a.stance === "supporting" || a.stance === "contradicting" || a.stance === "neutral" || a.stance === "unrelated")
        ? a.stance
        : getArticleClaimStance(a.title)
    }));

    const aiBuild = buildAIComparisonReasons(data.summary);
    return {
      scoreDelta: aiBuild.scoreDelta,
      reasons: aiBuild.reasons,
      pressArticles,
      verifiedExternally: aiBuild.verifiedExternally,
      mode: data.mode || "unknown"
    };
  } catch {
    return null;
  }
}

async function fetchTextWithCorsFallback(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return await response.text();
    }
  }
  catch {

  }
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.text();
    }
  }
  catch {

  }
  return null;
}
async function fetchJsonWithCorsFallback(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const response = await fetch(url, init);
    if (response.ok) {
      return await response.json();
    }
  }
  catch {

  }
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const text = await response.text();
      return JSON.parse(text);
    }
  }
  catch {

  }
  return null;
}
async function fetchGoogleNewsArticles(query: string): Promise<PressArticle[]> {
  try {
    const url = new URL("/api/proxy/google-news/rss/search", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "vi");
    url.searchParams.set("gl", "VN");
    url.searchParams.set("ceid", "VN:vi");
    const xmlText = await fetchTextWithCorsFallback(url.toString(), {
      Accept: "application/rss+xml, application/xml, text/xml"
    });
    if (!xmlText)
    return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 15);
    return items.map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() ?? "",
      source: item.querySelector("source")?.textContent?.trim() ?? "Google News",
      link: item.querySelector("link")?.textContent?.trim() ?? undefined,
      publishedAt: item.querySelector("pubDate")?.textContent?.trim() ?? undefined,
      stance: getArticleClaimStance(item.querySelector("title")?.textContent?.trim() ?? "")
    })).filter((item) => item.title);
  }
  catch {
    return [];
  }
}
async function fetchNewsApiArticles(query: string): Promise<PressArticle[]> {
  try {
    const url = new URL("/api/proxy/newsapi/v2/everything", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("searchIn", "title,description");
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "15");
    const payload = await fetchJsonWithCorsFallback(url.toString());
    if (!payload || !Array.isArray(payload.articles))
    return [];
    return payload.articles ?
    payload.articles.map((article: any) => ({
      title: article.title ?? "",
      source: article.source?.name ?? "News API",
      link: article.url ?? undefined,
      publishedAt: article.publishedAt ?? undefined,
      stance: getArticleClaimStance(article.title ?? "")
    })).filter((article: PressArticle) => article.title) :
    [];
  }
  catch {
    return [];
  }
}
async function fetchBingFactChecks(query: string): Promise<FactCheckClaim[]> {
  try {
    const url = new URL("/api/proxy/bing-news/", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "rss");
    url.searchParams.set("setlang", "vi");
    const response = await fetch(url.toString());
    if (!response.ok)
    return [];
    const xmlText = await response.text();
    if (!xmlText)
    return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.getElementsByTagName("parsererror").length > 0)
    return [];
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);
    return items.map((item) => {
      const title = item.querySelector("title")?.textContent?.trim() ?? "";
      const link = item.querySelector("link")?.textContent?.trim();
      const source = item.querySelector("News\\:Source")?.textContent?.trim() ?? item.querySelector("source")?.textContent?.trim() ?? "";
      const stance = getArticleClaimStance(title);
      return {
        text: title,
        claimReview: [{
          title,
          url: link,
          textualRating: stance === "contradicting" ? "contradicting" : stance === "supporting" ? "supporting" : "neutral",
          publisher: { name: source || "Bing News", site: undefined }
        }]
      };
    }).filter((claim) => claim.text);
  }
  catch {
    return [];
  }
}
async function fetchFactChecks(queries: string[]): Promise<FactCheckClaim[]> {
  const results = await Promise.all(queries.slice(0, 3).flatMap((query) => [
  ["vi", query],
  ["en", query]]
  ).map(async ([languageCode, query]) => {
    const googleClaims = await (async () => {
      try {
        const url = new URL("/api/proxy/factcheck/v1alpha1/claims:search", window.location.origin);
        url.searchParams.set("query", query);
        url.searchParams.set("languageCode", languageCode);
        url.searchParams.set("pageSize", "5");
        const payload = await fetchJsonWithCorsFallback(url.toString());
        return Array.isArray(payload?.claims) ? payload.claims : [];
      }
      catch {
        return [];
      }
    })();
    if (googleClaims.length > 0)
    return googleClaims;
    return fetchBingFactChecks(query);
  }));
  const flattened = results.flat();
  const seen = new Set<string>();
  return flattened.filter((claim) => {
    const key = `${claim.text ?? ""}|${claim.claimReview?.[0]?.url ?? ""}`;
    if (!key.trim() || seen.has(key))
    return false;
    seen.add(key);
    return true;
  });
}
async function fetchWikipediaSummaryFromLanguage(query: string, summaryEndpoint: string, searchEndpoint: string): Promise<WikipediaSummaryResponse | null> {
  try {
    const directSummaryUrl = `${summaryEndpoint}/${encodeURIComponent(query)}`;
    const directSummaryResponse = await fetch(directSummaryUrl, {
      headers: {
        Accept: "application/json"
      }
    });
    if (directSummaryResponse.ok) {
      const directPayload = await directSummaryResponse.json();
      if (directPayload?.title && directPayload?.extract) {
        return directPayload;
      }
    }
    const searchUrl = new URL(searchEndpoint);
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("limit", "1");
    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        Accept: "application/json"
      }
    });
    if (!searchResponse.ok)
    return null;
    const searchPayload: WikipediaSearchResponse = await searchResponse.json();
    const firstTitle = searchPayload.pages?.[0]?.title;
    if (!firstTitle)
    return null;
    const summaryUrl = `${summaryEndpoint}/${encodeURIComponent(firstTitle)}`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!summaryResponse.ok)
    return null;
    return summaryResponse.json();
  }
  catch {
    return null;
  }
}
async function fetchWikipediaSummary(query: string): Promise<WikipediaSummaryResponse | null> {
  const viSummary = await fetchWikipediaSummaryFromLanguage(query, NEWS_API_CONFIG.wikipedia.viSummaryEndpoint, NEWS_API_CONFIG.wikipedia.viSearchEndpoint);
  if (viSummary?.title && viSummary?.extract) {
    return {
      ...viSummary,
      content_language: viSummary.content_language || "vi"
    };
  }
  const enSummary = await fetchWikipediaSummaryFromLanguage(query, NEWS_API_CONFIG.wikipedia.enSummaryEndpoint, NEWS_API_CONFIG.wikipedia.enSearchEndpoint);
  if (!enSummary)
  return null;
  return {
    ...enSummary,
    content_language: enSummary.content_language || "en"
  };
}
async function fetchFirstWikipediaSummary(queries: string[]): Promise<WikipediaSummaryResponse | null> {
  const candidates = unique(queries.map(compactWhitespace).filter(Boolean)).slice(0, 3);
  if (candidates.length === 0) {
    return null;
  }
  const summaries = await Promise.all(candidates.map((candidate) => fetchWikipediaSummary(candidate)));
  return summaries.find((summary) => summary?.title && summary?.extract) ?? null;
}

async function fetchDuckDuckGoSummary(query: string): Promise<DuckDuckGoResponse | null> {
  const realEndpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  try {
    const proxyUrl = `/api/proxy/ddg/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.Heading && data.AbstractText) return data;
    }
  } catch {

  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(realEndpoint)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const data = await response.json();
      if (data.Heading && data.AbstractText) return data;
    }
  } catch {

  }

  try {
    const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(realEndpoint)}`;
    const response2 = await fetch(proxyUrl2);
    if (response2.ok) {
      const data2 = await response2.json();
      if (data2.Heading && data2.AbstractText) return data2;
    }
  } catch {

  }

  return null;
}
export async function runLiveNewsCheck(text: string): Promise<LiveNewsCheckResult> {
  const query = makeQuery(text);
  const biographyClaim = extractBiographyClaim(text);
  const wikipediaClaims = extractWikipediaClaims(text);
  const statusClaims = extractStatusClaims(text);
  const identityClaim = wikipediaClaims?.identityClaims[0] ?? null;
  const knownPerson = biographyClaim ?
  resolveKnownPerson(biographyClaim.personName) :
  identityClaim ?
  resolveKnownPerson(identityClaim.personName) :
  wikipediaClaims ?
  resolveKnownPerson(wikipediaClaims.personName) :
  null;

  const contextInfo = await evaluateTextArchetype(text);

  const skipWikiAndDDG = !["NEWS_ARTICLE", "NEWS_CLAIM"].includes(contextInfo.archetype) && !biographyClaim && !identityClaim && !wikipediaClaims?.hasProfileClaim && statusClaims.length === 0;


  const genericWikiQuery = extractSearchKeywords(text).split(" ").slice(0, 3).join(" ");

  const wikipediaQueries = skipWikiAndDDG ? [] : unique([
  knownPerson?.wikiTitle,
  biographyClaim?.personName,
  ...(wikipediaClaims?.queryCandidates ?? []),
  identityClaim?.personName,
  wikipediaClaims?.personName,
  genericWikiQuery].
  filter(Boolean) as string[]);
  const factCheckQueries = buildFactCheckQueries(text, biographyClaim, knownPerson);
  const isHeadline = isHeadlineText(text);
  const headlineVerificationPromise = isHeadline ? verifyHeadline(text) : Promise.resolve(null);
  const backendNewsPromise = withTimeout(fetchBackendNews(text, query), 70000);

  const factChecksPromise = withTimeout(fetchFactChecks(factCheckQueries), VERIFICATION_CONFIG.apis.factCheck.timeout);
  const wikipediaPromise = wikipediaQueries.length > 0 ?
  withTimeout(fetchFirstWikipediaSummary(wikipediaQueries), VERIFICATION_CONFIG.apis.wikipedia.timeout) :
  Promise.resolve<WikipediaSummaryResponse | null>(null);
  const headlineTimedPromise = withTimeout(headlineVerificationPromise, VERIFICATION_CONFIG.performance.requestTimeout);


  const ddgEntityName = knownPerson?.wikiTitle || biographyClaim?.personName || identityClaim?.personName || wikipediaClaims?.personName;
  const ddgQuery = ddgEntityName ? ddgEntityName : extractSearchKeywords(text).split(" ").slice(0, 2).join(" ");
  const ddgPromise = skipWikiAndDDG ? Promise.resolve(null) : withTimeout(fetchDuckDuckGoSummary(ddgQuery), VERIFICATION_CONFIG.apis.wikipedia.timeout);

  const [backendNewsResult, claimsResult, wikipediaSummary, headlineVerification, ddgSummary] = await Promise.all([
  backendNewsPromise,
  factChecksPromise,
  wikipediaPromise,
  headlineTimedPromise,
  ddgPromise]
  );
  let pressArticles = backendNewsResult?.articles ?? [];
  let extractedEntities = backendNewsResult?.extractedEntities ?? [];
  const backendAiComparison = backendNewsResult?.aiComparison ?? null;
  let claims = claimsResult ?? [];


  const inputEmbedding = await aiEngine.getRawEmbedding(text);
  if (inputEmbedding && inputEmbedding.length > 0) {


    const filteredClaims = [];
    for (const claim of claims) {
      const claimEmbedding = await aiEngine.getRawEmbedding(claim.text);
      if (claimEmbedding && claimEmbedding.length > 0) {
        const sim = aiEngine.cosineSimilarity(inputEmbedding, claimEmbedding);
        if (sim >= 0.40) {
          filteredClaims.push(claim);
        }
      } else {
        filteredClaims.push(claim);
      }
    }
    claims = filteredClaims;
  }

  const pressSourceLabel = "Bộ máy tìm kiếm cục bộ (Backend)";
  const strongGoogleNewsMatch = pressArticles.length > 0 && pressArticles.some((article) => isStrongGoogleNewsMatch(text, article.title));
  const contradictingPressArticles = pressArticles.filter((article) => article.stance === "contradicting");
  const hasContradictingPressCoverage = contradictingPressArticles.length > 0;
  if (!BACKEND_PROXY_ENABLED && pressArticles.length === 0 && !wikipediaSummary && !headlineVerification) {
    return {
      enabled: false,
      scoreDelta: 0,
      reasons: [],
      summary: {
        live_fact_check: "Google Fact Check API chưa bật do thiếu API key.",
        live_press_scan: "Chưa lấy được dữ liệu đối chiếu từ Backend cục bộ.",
        open_knowledge_check: "Open Knowledge Check đang chờ đối chiếu.",
        headline_verification: "Headline verification chưa được kích hoạt."
      },
      verifiedExternally: false,
      pressArticles: [],
      pressSourceLabel: "Backend Search"
    };
  }
  const reasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;
  let verifiedExternally = false;
  if (claims.length > 0) {
    scoreDelta += 14;
    reasons.push({
      id: "LIVE_FACTCHECK_MATCH",
      name: "Đối soát thực tế có kết quả",
      detail: `Tìm thấy ${claims.length} kết quả đối soát thực tế từ các nguồn bên ngoài (Google Fact Check / Bing News) cho truy vấn này.`,
      status: "success",
      icon: ShieldCheck
    });
  }

  if (extractedEntities.length > 0) {
    reasons.push({
      id: "AI_NER_EXTRACTED",
      name: "LCS AI Nhận diện Thực thể",
      detail: `Đã phân tích ngữ cảnh và trích xuất các từ khóa: ${extractedEntities.join(", ")}.`,
      status: "success",
      icon: Shield
    });
  }
  if (pressArticles.length >= 2 && hasContradictingPressCoverage) {
    scoreDelta -= 30;
    reasons.push({
      id: "LIVE_PRESS_CONTRADICTS_CLAIM",
      name: "Bao chi doi chieu dang bac bo claim",
      detail: `Tim thay ${contradictingPressArticles.length}/${pressArticles.length} bai doi chieu tu ${pressSourceLabel} co tieu de cho thay claim dang bi bac bo hoac gan la tin gia.`,
      status: "danger",
      icon: AlertTriangle
    });
  }
  if (pressArticles.length >= 2 && !hasContradictingPressCoverage) {
    scoreDelta += 12;
    reasons.push({
      id: "LIVE_PRESS_MATCH",
      name: "Có đối chiếu từ báo chí bên ngoài",
      detail: `Tìm thấy ${pressArticles.length} bài liên quan từ ${pressSourceLabel} để so sánh chéo tiêu đề và ngữ cảnh.`,
      status: "success",
      icon: Database
    });
  }
  if (strongGoogleNewsMatch && hasContradictingPressCoverage) {
    const topContradiction = contradictingPressArticles[0];
    scoreDelta -= 65;
    verifiedExternally = false;
    reasons.push({
      id: "LIVE_PRESS_STRONG_CONTRADICTION",
      name: "Bao chi trung khop nhung dang bac bo claim",
      detail: `Co bai bao trung khop cao nhung theo huong bac bo noi dung; nguon dau: ${topContradiction?.source || "khong ro nguon"} - ${topContradiction?.title || "khong co tieu de"}.`,
      status: "danger",
      icon: AlertTriangle
    });
  }
  if (strongGoogleNewsMatch && !hasContradictingPressCoverage) {
    scoreDelta += 100;
    verifiedExternally = true;
    reasons.push({
      id: "LIVE_PRESS_STRONG_MATCH",
      name: "Bài báo Google News trùng khớp",
      detail: "Phát hiện ít nhất một bài báo Google News khớp chặt với nội dung người dùng nhập, điểm tin tức được nâng lên mức tối đa.",
      status: "success",
      icon: ShieldCheck
    });
  }
  if (backendAiComparison?.enabled && backendAiComparison?.summary) {
    const aiBuild = buildAIComparisonReasons(backendAiComparison.summary);
    scoreDelta += aiBuild.scoreDelta;
    verifiedExternally = verifiedExternally || aiBuild.verifiedExternally;
    reasons.push(...aiBuild.reasons);
  }
  if (biographyClaim && wikipediaSummary?.extract && titleMatchesPerson(wikipediaSummary.title || "", biographyClaim, knownPerson)) {
    const normalizedSummary = normalizeText(wikipediaSummary.extract);
    const sentences = wikipediaSummary.extract.split(/(?<=[.!?\n])\s+/);

    let birthMatch = false;
    let deathMatch = true;
    let hasMismatch = false;
    let mismatchDetails: string[] = [];


    if (biographyClaim.year) {
      const birthQuery = `sinh ngày ${biographyClaim.day || ""} tháng ${biographyClaim.month || ""} năm ${biographyClaim.year} tại ${biographyClaim.birthplace || ""}`;
      const queryVector = await aiEngine.getRawEmbedding(birthQuery);

      let bestSentence = "";
      let bestScore = 0;

      if (queryVector) {
        for (const sentence of sentences) {
          const sentenceVector = await aiEngine.getRawEmbedding(sentence);
          if (sentenceVector) {
            const score = aiEngine.cosineSimilarity(queryVector, sentenceVector);
            if (score > bestScore) {
              bestScore = score;
              bestSentence = normalizeText(sentence);
            }
          }
        }
      } else {

        bestSentence = normalizedSummary;
      }

      const hasYearMatch = bestSentence.includes(String(biographyClaim.year));
      const hasDateSignal = hasBiographyDateMatch(bestSentence, biographyClaim);

      const birthplaceSignals = expandLocationSignals(biographyClaim.birthplace);
      const matchedSignals = birthplaceSignals.filter((signal) => bestSentence.includes(signal));
      const hasBirthplaceMatch = birthplaceSignals.length === 0 || matchedSignals.length >= Math.min(2, birthplaceSignals.length);

      if (hasYearMatch && hasDateSignal && hasBirthplaceMatch) {
        birthMatch = true;
      } else {
        hasMismatch = true;
        mismatchDetails.push(`Ngày sinh hoặc nơi sinh không khớp với ngữ cảnh tương đồng cao nhất (Độ tin cậy ngữ cảnh: ${Math.round(bestScore * 100)}%)`);
      }
    }


    if (biographyClaim.deathYear) {
      deathMatch = false;
      const deathQuery = `mất ngày ${biographyClaim.deathDay || ""} tháng ${biographyClaim.deathMonth || ""} năm ${biographyClaim.deathYear}`;
      const queryVector = await aiEngine.getRawEmbedding(deathQuery);

      let bestSentence = "";
      let bestScore = 0;

      if (queryVector) {
        for (const sentence of sentences) {
          const sentenceVector = await aiEngine.getRawEmbedding(sentence);
          if (sentenceVector) {
            const score = aiEngine.cosineSimilarity(queryVector, sentenceVector);
            if (score > bestScore) {
              bestScore = score;
              bestSentence = normalizeText(sentence);
            }
          }
        }
      } else {
        bestSentence = normalizedSummary;
      }

      const hasDeathYearMatch = bestSentence.includes(String(biographyClaim.deathYear));
      const hasDeathDateSignal = bestSentence.includes(String(biographyClaim.deathDay)) || bestSentence.includes(String(biographyClaim.deathMonth));

      if (hasDeathYearMatch && hasDeathDateSignal) {
        deathMatch = true;
      } else {
        hasMismatch = true;
        mismatchDetails.push(`Ngày mất không khớp với ngữ cảnh tương đồng cao nhất (Độ tin cậy ngữ cảnh: ${Math.round(bestScore * 100)}%)`);
      }
    }

    if (!hasMismatch && birthMatch && deathMatch) {
      verifiedExternally = true;
      scoreDelta += 28;
      reasons.push({
        id: "OPEN_KNOWLEDGE_MATCH",
        name: "Đối chiếu tri thức mở khớp",
        detail: `Dữ kiện tiểu sử khớp với tóm tắt từ ${wikipediaSummary.title || "Wikipedia"}${wikipediaSummary.content_urls?.desktop?.page ? ` (${wikipediaSummary.content_urls.desktop.page})` : ""}.`,
        status: "success",
        icon: ShieldCheck
      });
    } else
    {
      verifiedExternally = false;
      scoreDelta -= 55;
      reasons.push({
        id: "OPEN_KNOWLEDGE_MISMATCH",
        name: "Sai lệch dữ kiện tiểu sử so với Wikipedia",
        detail: mismatchDetails.join(". "),
        status: "danger",
        icon: AlertTriangle
      });
    }
  }
  if (headlineVerification && headlineVerification.isHeadline) {
    reasons.push(...headlineVerification.verificationReasons);
    scoreDelta += headlineVerification.scoreDelta;
    const headlineTopMatch = headlineVerification.matchedOutlets[0]?.matchScore ?? 0;
    verifiedExternally = verifiedExternally || (headlineVerification.hasVerifiedCoverage && headlineTopMatch >= 0.65);
  }
  const statusClaimPerson = statusClaims.length > 0 ? extractStatusClaimPerson(text) : null;
  if (statusClaims.length > 0 && wikipediaSummary?.extract && titleMatchesPerson(wikipediaSummary.title || "", { personName: knownPerson?.wikiTitle || wikipediaClaims?.personName || biographyClaim?.personName || statusClaimPerson || statusClaims[0].phrase }, knownPerson)) {
    const statusComparison = compareStatusClaimsWithWikipedia(statusClaims, wikipediaSummary.extract);
    if (statusComparison.contradictedClaims.length > 0) {
      verifiedExternally = false;
      scoreDelta -= 70;
      reasons.push({
        id: "WIKIPEDIA_STATUS_MISMATCH",
        name: "Sai lệch trạng thái sự nghiệp",
        detail: `Wikipedia không xác nhận trạng thái "${statusComparison.contradictedClaims.join(", ")}" cho ${wikipediaSummary.title || "nhân vật này"}. Nội dung đối lập với thông tin hiện tại trên Wikipedia.`,
        status: "danger",
        icon: AlertTriangle
      });
    } else
    if (statusComparison.matchedClaims.length > 0) {
      verifiedExternally = true;
      scoreDelta += 24;
      reasons.push({
        id: "WIKIPEDIA_STATUS_MATCH",
        name: "Trạng thái khớp Wikipedia",
        detail: `Trạng thái "${statusComparison.matchedClaims.join(", ")}" được xác nhận bởi ${wikipediaSummary.title || "Wikipedia"}${wikipediaSummary.content_urls?.desktop?.page ? ` (${wikipediaSummary.content_urls.desktop.page})` : ""}.`,
        status: "success",
        icon: ShieldCheck
      });
    }
  }
  if (identityClaim && wikipediaSummary?.extract && titleMatchesPerson(wikipediaSummary.title || "", identityClaim, knownPerson)) {
    const identityCheck = compareIdentityClaimWithWikipedia(identityClaim, wikipediaSummary);
    if (identityCheck.mismatchedNames.length > 0) {
      verifiedExternally = false;
      scoreDelta -= 45;
      reasons.push({
        id: "WIKIPEDIA_IDENTITY_MISMATCH",
        name: "Sai lệch danh tính theo Wikipedia",
        detail: `Wikipedia không xác nhận các tên sau cho ${wikipediaSummary.title || identityClaim.personName}: ${identityCheck.mismatchedNames.join(", ")}.`,
        status: "danger",
        icon: AlertTriangle
      });
    } else
    if (identityCheck.matchedCount > 0) {
      verifiedExternally = true;
      scoreDelta += 18;
      reasons.push({
        id: "WIKIPEDIA_IDENTITY_MATCH",
        name: "Danh tính khớp Wikipedia",
        detail: `Các tên được nêu khớp với dữ kiện nền từ ${wikipediaSummary.title || "Wikipedia"}${wikipediaSummary.content_urls?.desktop?.page ? ` (${wikipediaSummary.content_urls.desktop.page})` : ""}.`,
        status: "success",
        icon: ShieldCheck
      });
    }
  }
  const wikipediaPersonClaim = wikipediaClaims ?
  { personName: wikipediaClaims.personName, claimedNames: identityClaim?.claimedNames ?? [] } :
  null;
  if (wikipediaClaims?.hasProfileClaim && wikipediaPersonClaim && wikipediaSummary?.extract && titleMatchesPerson(wikipediaSummary.title || "", wikipediaPersonClaim, knownPerson)) {
    const profileCheck = compareProfileClaimWithWikipedia(text, wikipediaSummary.title || wikipediaClaims.personName, wikipediaSummary.extract);
    if (profileCheck.mismatchedSignals.length > 0) {
      verifiedExternally = false;
      scoreDelta -= 50;
      reasons.push({
        id: "WIKIPEDIA_PROFILE_MISMATCH",
        name: "Sai lệch hồ sơ theo Wikipedia",
        detail: `Wikipedia không xác nhận các mệnh đề định lượng: ${profileCheck.mismatchedSignals.join(", ")}.`,
        status: "danger",
        icon: AlertTriangle
      });
    } else
    if (profileCheck.missingSignals.length > 0 && profileCheck.matchedSignals.length === 0) {
      scoreDelta -= 20;
      reasons.push({
        id: "WIKIPEDIA_PROFILE_WEAK_MATCH",
        name: "Wikipedia chưa khớp mô tả hồ sơ",
        detail: `Wikipedia chưa xác nhận rõ các tín hiệu: ${profileCheck.missingSignals.join(", ")}.`,
        status: "warning",
        icon: Globe
      });
    } else
    if (profileCheck.matchedSignals.length > 0) {
      verifiedExternally = true;
      scoreDelta += 24;
      reasons.push({
        id: "WIKIPEDIA_PROFILE_MATCH",
        name: "Hồ sơ khớp Wikipedia",
        detail: `Wikipedia xác nhận các tín hiệu hồ sơ chính: ${profileCheck.matchedSignals.join(", ")}.`,
        status: "success",
        icon: ShieldCheck
      });
    }
  }

  if (!verifiedExternally) {

    if (wikipediaSummary?.extract && !wikipediaClaims?.hasProfileClaim && !biographyClaim && !identityClaim) {

      let nliResult = null;
      try {

        const ddgText = ddgSummary ? `\n\nDuckDuckGo: ${ddgSummary}` : "";
        const pressText = pressArticles && pressArticles.length > 0 ?
        `\n\nTin tức liên quan: ${pressArticles.slice(0, 3).map((a) => a.description).join(" ")}` :
        "";
        const richPremise = `${wikipediaSummary.extract}${ddgText}${pressText}`;

        const nliResponse = await fetch("/api/verify-nli", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            premise: richPremise,
            hypothesis: text
          })
        });
        if (nliResponse.ok) {
          const data = await nliResponse.json();
          if (data.success) {
            nliResult = data;
          }
        }
      } catch (e) {
        console.error("NLI check failed", e);
      }

      if (nliResult && nliResult.entailment > 0.6) {
        verifiedExternally = true;
        scoreDelta += 30;
        reasons.push({
          id: "AI_NLI_ENTAILMENT",
          name: "AI Xác nhận Thông tin",
          detail: `Mô hình NLI xác nhận nội dung gốc hoàn toàn khớp với tri thức mở Wikipedia (Độ tự tin: ${Math.round(nliResult.entailment * 100)}%).`,
          status: "success",
          icon: ShieldCheck
        });
      } else if (nliResult && nliResult.contradiction > 0.5) {

        scoreDelta -= 40;
        reasons.push({
          id: "AI_NLI_CONTRADICTION",
          name: "AI Phát hiện Mâu thuẫn",
          detail: `Mô hình NLI phát hiện nội dung gốc MÂU THUẪN TRỰC TIẾP với tri thức mở Wikipedia. Có dấu hiệu tin giả (Độ tự tin: ${Math.round(nliResult.contradiction * 100)}%).`,
          status: "danger",
          icon: AlertTriangle
        });
      } else {

        scoreDelta += 2;
        reasons.push({
          id: "OPEN_KNOWLEDGE_GENERAL_MATCH",
          name: "Từ điển Wikipedia (Mở rộng)",
          detail: `Tìm thấy bối cảnh tham khảo từ Wikipedia: ${wikipediaSummary.title}. Tuy nhiên cần tự đối chiếu thông tin: ${wikipediaSummary.extract.slice(0, 150)}...`,
          status: "warning",
          icon: Globe
        });
      }
    }
  }


  if (ddgSummary?.AbstractText) {
    scoreDelta += 2;
    reasons.push({
      id: "OPEN_KNOWLEDGE_DDG_MATCH",
      name: "Trích xuất DuckDuckGo Answers",
      detail: `Cung cấp ngữ cảnh từ DuckDuckGo: ${ddgSummary.Heading}. Vui lòng tự xác minh: ${ddgSummary.AbstractText.slice(0, 150)}...`,
      status: "warning",
      icon: Globe
    });
  }

  if (pressArticles.length === 0 && claims.length === 0 && !verifiedExternally && !wikipediaSummary && !ddgSummary) {
    scoreDelta -= 8;
    reasons.push({
      id: "LIVE_NO_EVIDENCE",
      name: "Live check chưa thấy bằng chứng",
      detail: "Chưa tìm thấy bài báo đối chiếu hoặc kết quả fact-check rõ ràng từ lớp nguồn ngoài cho truy vấn này.",
      status: "warning",
      icon: Search
    });
  }
  const firstClaim = claims[0];
  const firstReview = firstClaim?.claimReview?.[0];
  const factSummary = claims.length > 0 ?
  `Đối soát thực tế trả về ${claims.length} kết quả; đầu tiên: ${firstClaim?.text || firstReview?.title || "không có tóm tắt"}.` :
  BACKEND_PROXY_ENABLED ?
  "Đối soát thực tế đã được gọi nhưng chưa trả về kết quả phù hợp." :
  "Đối soát thực tế chưa bật.";
  const firstArticle = pressArticles[0];
  const pressSummary = pressArticles.length > 0 ?
  strongGoogleNewsMatch ?
  `${pressSourceLabel} tìm thấy bài báo trùng khớp nội dung; nguồn đầu: ${firstArticle?.source || "không rõ nguồn"} - ${firstArticle?.title || "không có tiêu đề"}.` :
  `${pressSourceLabel} tìm thấy ${pressArticles.length} bài liên quan; nguồn đầu: ${firstArticle?.source || "không rõ nguồn"} - ${firstArticle?.title || "không có tiêu đề"}.` :
  BACKEND_PROXY_ENABLED ?
  "Google News không trả bài phù hợp; hệ thống đã thử fallback sang News API nhưng chưa thấy bài đối chiếu rõ." :
  "Google News chưa trả về bài đối chiếu phù hợp.";
  const resolvedPressSummary = hasContradictingPressCoverage ?
  `${pressSourceLabel} tim thay bai bao trung khop theo huong bac bo claim; nguon dau: ${firstArticle?.source || "khong ro nguon"} - ${firstArticle?.title || "khong co tieu de"}.` :
  pressSummary;
  const knowledgeSummary = biographyClaim || identityClaim || wikipediaClaims?.hasProfileClaim ?
  wikipediaSummary?.extract ?
  `Wikipedia API (${wikipediaSummary.content_language || "unknown"}) đã đối chiếu với ${wikipediaSummary.title || "Wikipedia"} và dùng thêm chuẩn hóa song ngữ cho tên người, địa danh, quận/huyện/thành phố.` :
  "Open Knowledge Check chưa lấy được bản tóm tắt đủ rõ để so sánh fact tiểu sử." :
  "Wikipedia API chưa áp dụng vì nội dung không phải mẫu fact tiểu sử rõ ràng.";
  const headlineSummary = headlineVerification && headlineVerification.isHeadline ?
  headlineVerification.matchedOutlets.length > 0 ?
  `Tiêu đề được xác nhận bởi ${headlineVerification.matchedOutlets.length} nguồn báo chí (${headlineVerification.matchedOutlets.map((o) => o.outlet).join(", ")}) với độ khớp trung bình ${(headlineVerification.matchedOutlets[0].matchScore * 100).toFixed(0)}%.` :
  `Tiêu đề được nhập nhưng không tìm thấy bài viết khớp hoàn toàn từ các báo chí lớn.` :
  undefined;
  const matchedPressArticles: PressArticle[] = headlineVerification?.isHeadline ?
  headlineVerification.matchedOutlets.flatMap((outlet) => outlet.articles).map((a: any) => ({
    title: a.title,
    source: `${a.source} (khớp ${Math.round((a.similarityScore ?? 0) * 100)}%)`,
    link: a.link,
    publishedAt: a.publishedAt,
    description: ""
  })) :
  [];
  const knownTitles = new Set(pressArticles.map((a) => a.title?.toLowerCase?.() ?? ""));
  const uniqueMatched = matchedPressArticles.filter((a) => !knownTitles.has(a.title?.toLowerCase?.() ?? ""));
  const displayPressArticles = uniqueMatched.length > 0 ? [...uniqueMatched, ...pressArticles] : pressArticles;
  return {
    enabled: true,
    scoreDelta,
    reasons,
    summary: {
      live_fact_check: factSummary,
      live_press_scan: resolvedPressSummary,
      open_knowledge_check: knowledgeSummary,
      headline_verification: headlineSummary
    },
    verifiedExternally,
    pressArticles: displayPressArticles,
    pressSourceLabel
  };
}
