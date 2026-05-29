import { AlertTriangle, Database, Globe, Search, ShieldCheck } from "lucide-react";
import { NEWS_API_CONFIG, NEWS_API_KEYS } from "../config/newsApis";
import type { NewsAnalysisReason } from "./newsVerification";
import { compareIdentityClaimsWithWikipedia, compareProfileClaimWithWikipedia, extractWikipediaClaims, type WikipediaIdentityClaim } from "./wikipediaClaimExtractor";
import { verifyHeadline, isHeadlineText, type HeadlineVerificationResult } from "./headlineVerification";

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

interface BiographyClaim {
  personName: string;
  day: number;
  month: number;
  year: number;
  birthplace: string;
}

const NEWS_API_KEY = NEWS_API_KEYS.newsApiKey;
const FACT_CHECK_API_KEY = NEWS_API_KEYS.googleFactCheckApiKey;

const PERSON_NAME_ALIASES = [
  {
    canonical: "donald trump",
    aliases: ["donald trump", "donal trump", "tổng thống donald trump", "president donald trump", "trump"],
    wikiTitle: "Donald Trump",
  },
  {
    canonical: "barack obama",
    aliases: ["barack obama", "obama", "tổng thống barack obama", "president barack obama"],
    wikiTitle: "Barack Obama",
  },
  {
    canonical: "joe biden",
    aliases: ["joe biden", "biden", "tổng thống joe biden", "president joe biden"],
    wikiTitle: "Joe Biden",
  },
  {
    canonical: "nguyen phu trong",
    aliases: ["nguyễn phú trọng", "nguyen phu trong", "tổng bí thư nguyễn phú trọng"],
    wikiTitle: "Nguyễn Phú Trọng",
  },
  {
    canonical: "ho chi minh",
    aliases: ["hồ chí minh", "ho chi minh", "chủ tịch hồ chí minh", "chu tich ho chi minh", "nguyễn sinh cung", "nguyen sinh cung"],
    wikiTitle: "Ho Chi Minh",
  },
];

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
  "december",
];

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
  "country",
]);

const LOCATION_EQUIVALENTS: Record<string, string[]> = {
  "hoa ky": ["united states", "united states of america", "u s", "u s a", "usa", "america"],
  "my": ["united states", "usa", "america"],
  "new york": ["new york", "nyc", "new york city"],
  queens: ["queens", "queens county", "borough of queens"],
  "lang sen": ["lang sen", "sen village"],
  "kim lien": ["kim lien", "kim liên"],
  "nam dan": ["nam dan", "nam đàn"],
  "nghe an": ["nghe an", "nghệ an"],
};

const KNOWN_IDENTITY_FACTS = [
  {
    canonical: "ho chi minh",
    aliases: ["hồ chí minh", "ho chi minh", "bác hồ", "bac ho", "nguyễn ái quốc", "nguyen ai quoc"],
    validNames: ["nguyễn sinh cung", "nguyen sinh cung", "nguyễn tất thành", "nguyen tat thanh", "nguyễn ái quốc", "nguyen ai quoc", "bác hồ", "bac ho", "hồ chí minh", "ho chi minh"],
  },
];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function compactWhitespace(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function makeQuery(text: string): string {
  return compactWhitespace(text).slice(0, 180);
}

function stripHonorifics(name: string): string {
  return name
    .replace(/^(tong thong|chu tich|thu tuong|tong bi thu|ong|ba|ngai|president|chairman)\s+/iu, "")
    .trim();
}

function resolveKnownPerson(name: string) {
  const normalizedName = normalizeText(stripHonorifics(name));
  return PERSON_NAME_ALIASES.find((person) =>
    person.aliases.some((alias) => normalizedName.includes(normalizeText(alias))),
  );
}

function resolveKnownIdentityPerson(name: string) {
  const normalizedName = normalizeText(stripHonorifics(name));
  return KNOWN_IDENTITY_FACTS.find((person) =>
    person.aliases.some((alias) => normalizedName.includes(normalizeText(alias))),
  );
}

function extractIdentityClaim(text: string): WikipediaIdentityClaim | null {
  const compacted = compactWhitespace(text);
  const normalized = normalizeText(compacted);
  const knownPerson = PERSON_NAME_ALIASES.find((person) =>
    person.aliases.some((alias) => normalized.includes(normalizeText(alias))),
  );
  const leadingName = compacted.match(/^([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,5})[,，]/u)?.[1];
  const personName = knownPerson?.wikiTitle ?? leadingName;

  if (!personName) return null;

  const claimedNames: string[] = [];
  const patterns = [
    /tên khai sinh là\s+([^,.;]+)/iu,
    /tên khi đi học là\s+([^,.;]+)/iu,
    /còn được gọi[^,.;]*?(?:là|với tên gọi)\s+([^,.;]+)/iu,
    /bí danh là\s+([^,.;]+)/iu,
  ];

  for (const pattern of patterns) {
    const match = compacted.match(pattern);
    if (match?.[1]) {
      claimedNames.push(...match[1].split(/\s+hoặc\s+|\s+hay\s+|\/|;/iu));
    }
  }

  const cleanedNames = unique(claimedNames)
    .map((name) => compactWhitespace(name.replace(/^(là|với tên gọi)\s+/iu, "")))
    .filter((name) => name.length >= 3);

  return cleanedNames.length > 0 ? { personName, claimedNames: cleanedNames } : null;
}

function extractBiographyClaim(text: string): BiographyClaim | null {
  const biographyMatch = text.match(
    /([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,7}).*?sinh ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})(?:.*?(?:tại|ở)\s+([^.!?\\]+))?/iu,
  );
  if (biographyMatch) {
    return {
      personName: stripHonorifics(compactWhitespace(biographyMatch[1])),
      day: Number(biographyMatch[2]),
      month: Number(biographyMatch[3]),
      year: Number(biographyMatch[4]),
      birthplace: compactWhitespace(biographyMatch[5] ?? ""),
    };
  }

  const invertedMatch = text.match(
    /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+là\s+ngày\s+sinh\s+của\s+([A-ZÀ-Ỹ][\p{L}.'-]+(?:\s+[A-ZÀ-Ỹ][\p{L}.'-]+){1,7})(?:.*?\(\s*\d{1,2}\/\d{1,2}\/(\d{4})\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\))?(?:.*?(?:tại|ở)\s+([^.!?\\]+))?/iu,
  );
  if (!invertedMatch) return null;

  return {
    personName: stripHonorifics(compactWhitespace(invertedMatch[3])),
    day: Number(invertedMatch[1]),
    month: Number(invertedMatch[2]),
    year: Number(invertedMatch[4] ?? 0),
    birthplace: compactWhitespace(invertedMatch[5] ?? ""),
  };
}

function expandLocationSignals(location: string): string[] {
  const normalized = normalizeText(location)
    .replace(/[()]/g, " ")
    .replace(/[^a-z0-9,\s-]/g, " ")
    .replace(/\b(quan|huyen|phuong|xa|tinh|lang|thanh pho|thanh|pho|city|district|province|commune|village)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return [];

  const phrases = unique([
    normalized,
    ...normalized.split(",").map((part) => part.trim()).filter(Boolean),
  ]);

  const tokens = normalized
    .split(/[,\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !LOCATION_STOPWORDS.has(token));

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
    `${claim.day} ${monthName} ${claim.year}`,
  ].filter(Boolean);

  if (directPatterns.some((pattern) => summary.includes(pattern))) {
    return true;
  }

  const tokens = [String(claim.day), String(claim.month), String(claim.year), monthName].filter(Boolean);
  return tokens.filter((token) => summary.includes(token)).length >= 3;
}

function titleMatchesPerson(summaryTitle: string, personClaim: { personName: string; claimedNames?: string[] }, knownPerson?: { aliases: string[]; canonical: string } | null): boolean {
  const normalizedTitle = normalizeText(summaryTitle);
  const expectedName = normalizeText(knownPerson?.canonical || personClaim.personName);
  const candidateNames = [personClaim.personName, ...(personClaim.claimedNames ?? [])].map(normalizeText);

  if (normalizedTitle.includes(expectedName) || expectedName.includes(normalizedTitle)) {
    return true;
  }

  if (candidateNames.some((name) => normalizedTitle.includes(name) || name.includes(normalizedTitle))) {
    return true;
  }

  return knownPerson
    ? knownPerson.aliases.some((alias) => normalizedTitle.includes(normalizeText(alias)))
    : false;
}

function compareIdentityClaimWithWikipedia(identityClaim: WikipediaIdentityClaim, wikipediaSummary: WikipediaSummaryResponse | null) {
  if (wikipediaSummary?.extract) {
    const comparison = compareIdentityClaimsWithWikipedia(
      identityClaim,
      wikipediaSummary.title || identityClaim.personName,
      wikipediaSummary.extract,
    );

    return {
      mismatchedNames: comparison.mismatchedNames,
      matchedCount: comparison.matchedNames.length,
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
    matchedCount: identityClaim.claimedNames.length - mismatchedNames.length,
  };
}

function buildFactCheckQueries(text: string, biographyClaim: BiographyClaim | null, knownPerson?: { wikiTitle: string } | null): string[] {
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

async function fetchTextWithCorsFallback(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const response = await fetch(url, { headers });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // ignore and try proxy fallback
  }

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // ignore fallback failure
  }

  return null;
}

async function fetchJsonWithCorsFallback(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const response = await fetch(url, init);
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // ignore and try proxy fallback
  }

  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const text = await response.text();
      return JSON.parse(text);
    }
  } catch {
    // ignore fallback failure
  }

  return null;
}

async function fetchGoogleNewsArticles(query: string): Promise<PressArticle[]> {
  try {
    const url = new URL("/proxy/google-news/rss/search", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("hl", "vi");
    url.searchParams.set("gl", "VN");
    url.searchParams.set("ceid", "VN:vi");

    const xmlText = await fetchTextWithCorsFallback(url.toString(), {
      Accept: "application/rss+xml, application/xml, text/xml",
    });

    if (!xmlText) return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 5);

    return items.map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() ?? "",
      source: item.querySelector("source")?.textContent?.trim() ?? "Google News",
      link: item.querySelector("link")?.textContent?.trim() ?? undefined,
      publishedAt: item.querySelector("pubDate")?.textContent?.trim() ?? undefined,
    })).filter((item) => item.title);
  } catch {
    return [];
  }
}

async function fetchNewsApiArticles(query: string): Promise<PressArticle[]> {
  if (!NEWS_API_KEY) return [];

  try {
    const url = new URL("/proxy/newsapi/v2/everything", window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("searchIn", "title,description");
    url.searchParams.set("sortBy", "relevancy");
    url.searchParams.set("pageSize", "5");

    const payload = await fetchJsonWithCorsFallback(url.toString(), {
      headers: {
        "X-Api-Key": NEWS_API_KEY,
      },
    });

    if (!payload || !Array.isArray(payload.articles)) return [];

    return payload.articles
      ? payload.articles.map((article: any) => ({
          title: article.title ?? "",
          source: article.source?.name ?? "News API",
          link: article.url ?? undefined,
          publishedAt: article.publishedAt ?? undefined,
        })).filter((article: PressArticle) => article.title)
      : [];
  } catch {
    return [];
  }
}

async function fetchFactChecks(queries: string[]): Promise<FactCheckClaim[]> {
  if (!FACT_CHECK_API_KEY) return [];

  const results = await Promise.all(
    queries.slice(0, 3).flatMap((query) => ([
      ["vi", query],
      ["en", query],
    ])).map(async ([languageCode, query]) => {
      try {
        const url = new URL("/proxy/factcheck/v1alpha1/claims:search", window.location.origin);
        url.searchParams.set("query", query);
        url.searchParams.set("languageCode", languageCode);
        url.searchParams.set("pageSize", "5");
        url.searchParams.set("key", FACT_CHECK_API_KEY);

        const payload = await fetchJsonWithCorsFallback(url.toString());
        return Array.isArray(payload?.claims) ? payload.claims : [];
      } catch {
        return [];
      }
    }),
  );

  const flattened = results.flat();
  const seen = new Set<string>();

  return flattened.filter((claim) => {
    const key = `${claim.text ?? ""}|${claim.claimReview?.[0]?.url ?? ""}`;
    if (!key.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchWikipediaSummaryFromLanguage(
  query: string,
  summaryEndpoint: string,
  searchEndpoint: string,
): Promise<WikipediaSummaryResponse | null> {
  try {
    const directSummaryUrl = `${summaryEndpoint}/${encodeURIComponent(query)}`;
    const directSummaryResponse = await fetch(directSummaryUrl, {
      headers: {
        Accept: "application/json",
      },
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
        Accept: "application/json",
      },
    });

    if (!searchResponse.ok) return null;

    const searchPayload: WikipediaSearchResponse = await searchResponse.json();
    const firstTitle = searchPayload.pages?.[0]?.title;
    if (!firstTitle) return null;

    const summaryUrl = `${summaryEndpoint}/${encodeURIComponent(firstTitle)}`;
    const summaryResponse = await fetch(summaryUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!summaryResponse.ok) return null;
    return summaryResponse.json();
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(query: string): Promise<WikipediaSummaryResponse | null> {
  const viSummary = await fetchWikipediaSummaryFromLanguage(
    query,
    NEWS_API_CONFIG.wikipedia.viSummaryEndpoint,
    NEWS_API_CONFIG.wikipedia.viSearchEndpoint,
  );

  if (viSummary?.title && viSummary?.extract) {
    return {
      ...viSummary,
      content_language: viSummary.content_language || "vi",
    };
  }

  const enSummary = await fetchWikipediaSummaryFromLanguage(
    query,
    NEWS_API_CONFIG.wikipedia.enSummaryEndpoint,
    NEWS_API_CONFIG.wikipedia.enSearchEndpoint,
  );

  if (!enSummary) return null;

  return {
    ...enSummary,
    content_language: enSummary.content_language || "en",
  };
}

async function fetchFirstWikipediaSummary(queries: string[]): Promise<WikipediaSummaryResponse | null> {
  for (const candidate of unique(queries.map(compactWhitespace).filter(Boolean))) {
    const summary = await fetchWikipediaSummary(candidate);
    if (summary?.title && summary?.extract) {
      return summary;
    }
  }

  return null;
}

export async function runLiveNewsCheck(text: string): Promise<LiveNewsCheckResult> {
  const query = makeQuery(text);
  const biographyClaim = extractBiographyClaim(text);
  const wikipediaClaims = extractWikipediaClaims(text);
  const identityClaim = wikipediaClaims?.identityClaims[0] ?? null;
  const knownPerson = biographyClaim
    ? resolveKnownPerson(biographyClaim.personName)
    : identityClaim
      ? resolveKnownPerson(identityClaim.personName)
      : wikipediaClaims
        ? resolveKnownPerson(wikipediaClaims.personName)
      : null;
  const wikipediaQueries = unique([
    knownPerson?.wikiTitle,
    biographyClaim?.personName,
    ...(wikipediaClaims?.queryCandidates ?? []),
    identityClaim?.personName,
    wikipediaClaims?.personName,
  ].filter(Boolean) as string[]);
  const factCheckQueries = buildFactCheckQueries(text, biographyClaim, knownPerson);

  // Check for headline and perform headline verification
  const isHeadline = isHeadlineText(text);
  const headlineVerificationPromise = isHeadline ? verifyHeadline(text) : Promise.resolve(null);

  const googleNewsArticles = await fetchGoogleNewsArticles(query);
  const fallbackNewsApiArticles = googleNewsArticles.length > 0 ? [] : await fetchNewsApiArticles(query);
  const pressArticles = googleNewsArticles.length > 0 ? googleNewsArticles : fallbackNewsApiArticles;
  const pressSourceLabel = googleNewsArticles.length > 0 ? "Google News" : fallbackNewsApiArticles.length > 0 ? "News API" : "Google News";

  const strongGoogleNewsMatch = googleNewsArticles.length > 0 && pressArticles.some((article) => isStrongGoogleNewsMatch(text, article.title));

  const [claims, wikipediaSummary, headlineVerification] = await Promise.all([
    fetchFactChecks(factCheckQueries),
    wikipediaQueries.length > 0 ? fetchFirstWikipediaSummary(wikipediaQueries) : Promise.resolve(null),
    headlineVerificationPromise,
  ]);

  if (!FACT_CHECK_API_KEY && !NEWS_API_KEY && pressArticles.length === 0 && !wikipediaSummary && !headlineVerification) {
    return {
      enabled: false,
      scoreDelta: 0,
      reasons: [],
      summary: {
        live_fact_check: "Google Fact Check API chưa bật do thiếu API key.",
        live_press_scan: "Google News chưa lấy được dữ liệu đối chiếu và News API cũng chưa bật.",
        open_knowledge_check: "Open Knowledge Check đang chờ đối chiếu.",
        headline_verification: "Headline verification chưa được kích hoạt.",
      },
      verifiedExternally: false,
      pressArticles: [],
      pressSourceLabel: "Google News",
    };
  }

  const reasons: NewsAnalysisReason[] = [];
  let scoreDelta = 0;
  let verifiedExternally = false;

  if (claims.length > 0) {
    scoreDelta += 14;
    reasons.push({
      id: "LIVE_FACTCHECK_MATCH",
      name: "Google Fact Check có kết quả",
      detail: `Tìm thấy ${claims.length} kết quả fact-check từ lớp đối soát bên ngoài cho truy vấn này.`,
      status: "success",
      icon: ShieldCheck,
    });
  }

  if (pressArticles.length >= 2) {
    scoreDelta += 12;
    reasons.push({
      id: "LIVE_PRESS_MATCH",
      name: "Có đối chiếu từ báo chí bên ngoài",
      detail: `Tìm thấy ${pressArticles.length} bài liên quan từ ${pressSourceLabel} để so sánh chéo tiêu đề và ngữ cảnh.`,
      status: "success",
      icon: Database,
    });
  }

  if (strongGoogleNewsMatch) {
    scoreDelta += 100;
    verifiedExternally = true;
    reasons.push({
      id: "LIVE_PRESS_STRONG_MATCH",
      name: "Bài báo Google News trùng khớp",
      detail: "Phát hiện ít nhất một bài báo Google News khớp chặt với nội dung người dùng nhập, điểm tin tức được nâng lên mức tối đa.",
      status: "success",
      icon: ShieldCheck,
    });
  }

  if (biographyClaim && wikipediaSummary?.extract && titleMatchesPerson(wikipediaSummary.title || "", biographyClaim, knownPerson)) {
    const normalizedSummary = normalizeText(wikipediaSummary.extract);
    const birthplaceSignals = expandLocationSignals(biographyClaim.birthplace);
    const matchedSignals = birthplaceSignals.filter((signal) => normalizedSummary.includes(signal));
    const hasBirthplaceMatch = birthplaceSignals.length === 0 || matchedSignals.length >= Math.min(2, birthplaceSignals.length);
    const hasYearMatch = normalizedSummary.includes(String(biographyClaim.year));
    const hasDateSignal = hasBiographyDateMatch(normalizedSummary, biographyClaim);

    if (hasYearMatch && hasDateSignal && hasBirthplaceMatch) {
      verifiedExternally = true;
      scoreDelta += 28;
      reasons.push({
        id: "OPEN_KNOWLEDGE_MATCH",
        name: "Đối chiếu tri thức mở khớp",
        detail: `Dữ kiện tiểu sử khớp với tóm tắt từ ${wikipediaSummary.title || "Wikipedia"}${wikipediaSummary.content_urls?.desktop?.page ? ` (${wikipediaSummary.content_urls.desktop.page})` : ""}.`,
        status: "success",
        icon: ShieldCheck,
      });
    } else {
      scoreDelta -= 22;
      reasons.push({
        id: "OPEN_KNOWLEDGE_MISMATCH",
        name: "Đối chiếu tri thức mở chưa khớp",
        detail: `Thông tin ngày sinh hoặc nơi sinh chưa khớp hoàn toàn với dữ kiện nền từ ${wikipediaSummary.title || "Wikipedia"}.`,
        status: "warning",
        icon: Globe,
      });
    }
  }

  // Process headline verification results
  if (headlineVerification && headlineVerification.isHeadline) {
    reasons.push(...headlineVerification.verificationReasons);
    scoreDelta += headlineVerification.scoreDelta;
    verifiedExternally = verifiedExternally || headlineVerification.hasVerifiedCoverage;
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
        icon: AlertTriangle,
      });
    } else if (identityCheck.matchedCount > 0) {
      verifiedExternally = true;
      scoreDelta += 18;
      reasons.push({
        id: "WIKIPEDIA_IDENTITY_MATCH",
        name: "Danh tính khớp Wikipedia",
        detail: `Các tên được nêu khớp với dữ kiện nền từ ${wikipediaSummary.title || "Wikipedia"}${wikipediaSummary.content_urls?.desktop?.page ? ` (${wikipediaSummary.content_urls.desktop.page})` : ""}.`,
        status: "success",
        icon: ShieldCheck,
      });
    }
  }

  const wikipediaPersonClaim = wikipediaClaims
    ? { personName: wikipediaClaims.personName, claimedNames: identityClaim?.claimedNames ?? [] }
    : null;

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
        icon: AlertTriangle,
      });
    } else if (profileCheck.missingSignals.length > 0 && profileCheck.matchedSignals.length === 0) {
      scoreDelta -= 20;
      reasons.push({
        id: "WIKIPEDIA_PROFILE_WEAK_MATCH",
        name: "Wikipedia chưa khớp mô tả hồ sơ",
        detail: `Wikipedia chưa xác nhận rõ các tín hiệu: ${profileCheck.missingSignals.join(", ")}.`,
        status: "warning",
        icon: Globe,
      });
    } else if (profileCheck.matchedSignals.length > 0) {
      verifiedExternally = true;
      scoreDelta += 24;
      reasons.push({
        id: "WIKIPEDIA_PROFILE_MATCH",
        name: "Hồ sơ khớp Wikipedia",
        detail: `Wikipedia xác nhận các tín hiệu hồ sơ chính: ${profileCheck.matchedSignals.join(", ")}.`,
        status: "success",
        icon: ShieldCheck,
      });
    }
  }

  if (pressArticles.length === 0 && claims.length === 0 && !verifiedExternally) {
    scoreDelta -= 8;
    reasons.push({
      id: "LIVE_NO_EVIDENCE",
      name: "Live check chưa thấy bằng chứng",
      detail: "Chưa tìm thấy bài báo đối chiếu hoặc kết quả fact-check rõ ràng từ lớp nguồn ngoài cho truy vấn này.",
      status: "warning",
      icon: Search,
    });
  }

  const firstClaim = claims[0];
  const firstReview = firstClaim?.claimReview?.[0];
  const factSummary = claims.length > 0
    ? `Google Fact Check trả về ${claims.length} kết quả; đầu tiên: ${firstClaim?.text || firstReview?.title || "không có tóm tắt"}.`
    : FACT_CHECK_API_KEY
      ? "Google Fact Check đã được gọi nhưng chưa trả về claim phù hợp."
      : "Google Fact Check API chưa bật.";

  const firstArticle = pressArticles[0];
  const pressSummary = pressArticles.length > 0
    ? strongGoogleNewsMatch
      ? `${pressSourceLabel} tìm thấy bài báo trùng khớp nội dung; nguồn đầu: ${firstArticle?.source || "không rõ nguồn"} - ${firstArticle?.title || "không có tiêu đề"}.`
      : `${pressSourceLabel} tìm thấy ${pressArticles.length} bài liên quan; nguồn đầu: ${firstArticle?.source || "không rõ nguồn"} - ${firstArticle?.title || "không có tiêu đề"}.`
    : NEWS_API_KEY
      ? "Google News không trả bài phù hợp; hệ thống đã thử fallback sang News API nhưng chưa thấy bài đối chiếu rõ."
      : "Google News chưa trả về bài đối chiếu phù hợp.";

  const knowledgeSummary = biographyClaim || identityClaim || wikipediaClaims?.hasProfileClaim
    ? wikipediaSummary?.extract
      ? `Wikipedia API (${wikipediaSummary.content_language || "unknown"}) đã đối chiếu với ${wikipediaSummary.title || "Wikipedia"} và dùng thêm chuẩn hóa song ngữ cho tên người, địa danh, quận/huyện/thành phố.`
      : "Open Knowledge Check chưa lấy được bản tóm tắt đủ rõ để so sánh fact tiểu sử."
    : "Wikipedia API chưa áp dụng vì nội dung không phải mẫu fact tiểu sử rõ ràng.";

  const headlineSummary = headlineVerification && headlineVerification.isHeadline
    ? headlineVerification.matchedOutlets.length > 0
      ? `Tiêu đề được xác nhận bởi ${headlineVerification.matchedOutlets.length} nguồn báo chí (${headlineVerification.matchedOutlets.map(o => o.outlet).join(", ")}) với độ khớp trung bình ${(headlineVerification.matchedOutlets[0].matchScore * 100).toFixed(0)}%.`
      : `Tiêu đề được nhập nhưng không tìm thấy bài viết khớp hoàn toàn từ các báo chí lớn.`
    : undefined;

  return {
    enabled: true,
    scoreDelta,
    reasons,
    summary: {
      live_fact_check: factSummary,
      live_press_scan: pressSummary,
      open_knowledge_check: knowledgeSummary,
      headline_verification: headlineSummary,
    },
    verifiedExternally,
    pressArticles,
    pressSourceLabel,
  };
}
