/**
 * ENHANCED PRESS SOURCE INTEGRATION - Lá Chắn Số
 * Google News RSS parsing, multi-language support, source credibility scoring
 */

import { pressCache } from "../utils/cacheManager";
import { withTimeout } from "../utils/performanceOptimizer";

export interface PressSourceInfo {
  domain: string;
  name: string;
  authorityLevel: number; // 1=official, 2=major media, 3=verified outlets
  country: string;
  category: string;
  trustScore: number; // 0-100
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedDate: string;
  snippet: string;
  credibilityScore: number;
}

export interface NewsClusterResult {
  mainHeadline: string;
  count: number;
  sources: string[];
  publishDates: string[];
  relatedArticles: NewsArticle[];
}

// Enhanced press source database with authority levels
const PRESS_SOURCES: PressSourceInfo[] = [
  // Official government sources (Authority 1)
  {
    domain: "chinhphu.vn",
    name: "Chính phủ Việt Nam",
    authorityLevel: 1,
    country: "VN",
    category: "gov_official",
    trustScore: 100,
  },
  { domain: "mps.gov.vn", name: "Bộ Công an", authorityLevel: 1, country: "VN", category: "gov_official", trustScore: 100 },
  {
    domain: "mic.gov.vn",
    name: "Bộ Thông tin & Truyền thông",
    authorityLevel: 1,
    country: "VN",
    category: "gov_official",
    trustScore: 100,
  },

  // International wire services (Authority 2)
  { domain: "reuters.com", name: "Reuters", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
  { domain: "apnews.com", name: "AP News", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
  { domain: "afp.com", name: "AFP", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
  { domain: "bbc.com", name: "BBC", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },

  // Major Vietnamese media (Authority 2)
  {
    domain: "vnexpress.net",
    name: "VnExpress",
    authorityLevel: 2,
    country: "VN",
    category: "major_media",
    trustScore: 90,
  },
  { domain: "tuoitre.vn", name: "Tuổi Trẻ", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 90 },
  {
    domain: "thanhnien.vn",
    name: "Thanh Niên",
    authorityLevel: 2,
    country: "VN",
    category: "major_media",
    trustScore: 90,
  },
  { domain: "vtv.vn", name: "VTV", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 92 },
  { domain: "vov.vn", name: "VOV", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 92 },
  {
    domain: "nhandan.vn",
    name: "Nhân Dân",
    authorityLevel: 2,
    country: "VN",
    category: "major_media",
    trustScore: 92,
  },

  // Verified outlets (Authority 3)
  {
    domain: "dantri.com.vn",
    name: "Dân Trí",
    authorityLevel: 3,
    country: "VN",
    category: "verified_outlet",
    trustScore: 85,
  },
  {
    domain: "vietnamnet.vn",
    name: "VietnamNet",
    authorityLevel: 3,
    country: "VN",
    category: "verified_outlet",
    trustScore: 85,
  },
];

/**
 * Get credibility score for a press source
 */
export function scorePressSource(domain: string): number {
  const source = PRESS_SOURCES.find((s) => s.domain === domain.toLowerCase().replace(/^www\./, ""));

  if (source) {
    return source.trustScore;
  }

  // Heuristic scoring for unknown sources
  let score = 50; // Base score

  if (domain.includes(".gov.")) score += 20;
  if (domain.includes(".edu.")) score += 15;
  if (domain.match(/\.(com|vn|org|net)$/)) score += 0;
  if (domain.match(/\.(biz|info|xyz|tk)$/)) score -= 20;

  return Math.max(0, Math.min(100, score));
}

/**
 * Get press source info
 */
export function getPressSourceInfo(domain: string): PressSourceInfo | null {
  return (
    PRESS_SOURCES.find((s) => s.domain === domain.toLowerCase().replace(/^www\./, "")) || null
  );
}

/**
 * Detect similar news articles (clustering)
 */
export function detectNewsClusters(articles: NewsArticle[]): NewsClusterResult[] {
  const clusters: Map<string, NewsArticle[]> = new Map();

  for (const article of articles) {
    // Create a normalized headline key
    const key = normalizeHeadline(article.title);

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }

    clusters.get(key)!.push(article);
  }

  // Convert to results
  return Array.from(clusters.entries())
    .map(([headline, articles]) => ({
      mainHeadline: articles[0].title,
      count: articles.length,
      sources: articles.map((a) => a.source),
      publishDates: articles.map((a) => a.publishedDate),
      relatedArticles: articles,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Normalize headline for clustering
 */
function normalizeHeadline(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .split(" ")
    .filter((w) => w.length > 3) // Remove small words
    .slice(0, 5) // Take first 5 words
    .join(" ");
}

/**
 * Find coverage pattern for a claim
 */
export async function findCoveragePattern(
  claim: string,
  sourcesToCheck: PressSourceInfo[] = PRESS_SOURCES
): Promise<{
  coverageCount: number;
  averageCredibility: number;
  topSources: string[];
  consensus: "covered" | "minimal" | "uncovered";
}> {
  const cacheKey = `press_coverage_${claim.toLowerCase().replace(/\s+/g, "_").slice(0, 50)}`;
  const cached = pressCache.get<any>(cacheKey);

  if (cached) {
    return cached;
  }

  // Simulate searching news for the claim
  // In production, would use News API or Google News API
  const checkedSources = sourcesToCheck.slice(0, 5);
  let coverageCount = 0;
  let totalCredibility = 0;
  const topSources: string[] = [];

  for (const source of checkedSources) {
    // Simple heuristic: authority 1 sources always "cover" official claims
    if (source.authorityLevel <= 2) {
      coverageCount++;
      totalCredibility += source.trustScore;
      topSources.push(source.name);
    }
  }

  const result = {
    coverageCount,
    averageCredibility: coverageCount > 0 ? totalCredibility / coverageCount : 0,
    topSources,
    consensus:
      coverageCount >= 3 ? ("covered" as const) : coverageCount >= 1 ? ("minimal" as const) : ("uncovered" as const),
  };

  pressCache.set(cacheKey, result, 6 * 60 * 60 * 1000); // 6 hour cache
  return result;
}

/**
 * Parse Google News RSS (simplified version)
 */
export async function parseGoogleNewsRSS(
  query: string,
  langCodes: string[] = ["en", "vi"],
  hoursBack: number = 48
): Promise<NewsArticle[]> {
  const cacheKey = `google_news_${query.toLowerCase().replace(/\s+/g, "_")}_${langCodes.join("_")}`;
  const cached = pressCache.get<NewsArticle[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const articles: NewsArticle[] = [];

  try {
    // Google News RSS endpoint
    for (const lang of langCodes) {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${lang === "vi" ? "VN" : "US"}&ceid=VN:vi`;

      const response = await withTimeout(fetch(url), 3000);
      if (!response) continue;

      const text = await response.text();

      // Simple RSS parsing
      const itemRegex = /<item>(.*?)<\/item>/gs;
      const matches = text.matchAll(itemRegex);

      for (const match of matches) {
        const item = match[1];

        const titleMatch = item.match(/<title>(.*?)<\/title>/);
        const linkMatch = item.match(/<link>(.*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const descMatch = item.match(/<description>(.*?)<\/description>/);

        if (titleMatch) {
          articles.push({
            title: decode(titleMatch[1]),
            source: extractDomain(linkMatch?.[1] || ""),
            url: linkMatch?.[1] || "",
            publishedDate: pubDateMatch?.[1] || new Date().toISOString(),
            snippet: descMatch?.[1]?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
            credibilityScore: scorePressSource(extractDomain(linkMatch?.[1] || "")),
          });
        }
      }
    }

    // Sort by date and credibility
    articles.sort((a, b) => {
      const dateCompare = new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return b.credibilityScore - a.credibilityScore;
    });

    pressCache.set(cacheKey, articles.slice(0, 20), 6 * 60 * 60 * 1000);
    return articles.slice(0, 20);
  } catch (error) {
    console.error("[v0] Google News RSS parse error:", error);
    return [];
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Decode HTML entities
 */
function decode(html: string): string {
  const entities: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };

  return html.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

/**
 * Get trending topics from Google News
 */
export async function getTrendingTopics(count: number = 10): Promise<string[]> {
  const cacheKey = "trending_topics";
  const cached = pressCache.get<string[]>(cacheKey);

  if (cached) {
    return cached.slice(0, count);
  }

  try {
    const url = "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi";
    const response = await withTimeout(fetch(url), 3000);

    if (!response) return [];

    const text = await response.text();
    const titleRegex = /<title>(.*?)<\/title>/g;
    const titles: string[] = [];
    let match;

    while ((match = titleRegex.exec(text)) !== null && titles.length < count * 2) {
      const title = decode(match[1]).trim();
      if (title && title.length > 5 && !title.startsWith("Google News")) {
        titles.push(title);
      }
    }

    const uniqueTitles = Array.from(new Set(titles)).slice(0, count);
    pressCache.set(cacheKey, uniqueTitles, 60 * 60 * 1000); // 1 hour cache

    return uniqueTitles;
  } catch (error) {
    console.error("[v0] Trending topics error:", error);
    return [];
  }
}
