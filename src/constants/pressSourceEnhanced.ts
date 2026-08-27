import { pressCache } from "../utils/cacheManager";
import { withTimeout } from "../utils/performanceOptimizer";
export interface PressSourceInfo {
  domain: string;
  name: string;
  authorityLevel: number;
  country: string;
  category: string;
  trustScore: number;
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
const PRESS_SOURCES: PressSourceInfo[] = [
{
  domain: "chinhphu.vn",
  name: "Chính phủ Việt Nam",
  authorityLevel: 1,
  country: "VN",
  category: "gov_official",
  trustScore: 100
},
{ domain: "mps.gov.vn", name: "Bộ Công an", authorityLevel: 1, country: "VN", category: "gov_official", trustScore: 100 },
{
  domain: "mic.gov.vn",
  name: "Bộ Thông tin & Truyền thông",
  authorityLevel: 1,
  country: "VN",
  category: "gov_official",
  trustScore: 100
},
{ domain: "reuters.com", name: "Reuters", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
{ domain: "apnews.com", name: "AP News", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
{ domain: "afp.com", name: "AFP", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
{ domain: "bbc.com", name: "BBC", authorityLevel: 2, country: "GLOBAL", category: "wire_service", trustScore: 95 },
{ domain: "nytimes.com", name: "New York Times", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 92 },
{ domain: "theguardian.com", name: "The Guardian", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 90 },
{ domain: "cnn.com", name: "CNN", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 88 },
{ domain: "wsj.com", name: "Wall Street Journal", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 92 },
{ domain: "ft.com", name: "Financial Times", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 92 },
{ domain: "bloomberg.com", name: "Bloomberg", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 90 },
{ domain: "economist.com", name: "The Economist", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 92 },
{ domain: "nhk.or.jp", name: "NHK", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 90 },
{ domain: "dw.com", name: "Deutsche Welle", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 88 },
{ domain: "france24.com", name: "France 24", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 88 },
{ domain: "scmp.com", name: "South China Morning Post", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 85 },
{ domain: "straitstimes.com", name: "The Straits Times", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 85 },
{ domain: "koreaherald.com", name: "Korea Herald", authorityLevel: 3, country: "GLOBAL", category: "verified_outlet", trustScore: 82 },
{ domain: "japantimes.co.jp", name: "Japan Times", authorityLevel: 3, country: "GLOBAL", category: "verified_outlet", trustScore: 82 },
{ domain: "aljazeera.com", name: "Al Jazeera", authorityLevel: 2, country: "GLOBAL", category: "major_media", trustScore: 85 },
{ domain: "channelnewsasia.com", name: "Channel NewsAsia", authorityLevel: 3, country: "GLOBAL", category: "verified_outlet", trustScore: 82 },
{
  domain: "vnexpress.net",
  name: "VnExpress",
  authorityLevel: 2,
  country: "VN",
  category: "major_media",
  trustScore: 90
},
{ domain: "tuoitre.vn", name: "Tuổi Trẻ", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 90 },
{
  domain: "thanhnien.vn",
  name: "Thanh Niên",
  authorityLevel: 2,
  country: "VN",
  category: "major_media",
  trustScore: 90
},
{ domain: "vtv.vn", name: "VTV", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 92 },
{ domain: "vov.vn", name: "VOV", authorityLevel: 2, country: "VN", category: "major_media", trustScore: 92 },
{
  domain: "nhandan.vn",
  name: "Nhân Dân",
  authorityLevel: 2,
  country: "VN",
  category: "major_media",
  trustScore: 92
},
{
  domain: "dantri.com.vn",
  name: "Dân Trí",
  authorityLevel: 3,
  country: "VN",
  category: "verified_outlet",
  trustScore: 85
},
{
  domain: "vietnamnet.vn",
  name: "VietnamNet",
  authorityLevel: 3,
  country: "VN",
  category: "verified_outlet",
  trustScore: 85
}];

export function scorePressSource(domain: string): number {
  const source = PRESS_SOURCES.find((s) => s.domain === domain.toLowerCase().replace(/^www\./, ""));
  if (source) {
    return source.trustScore;
  }
  let score = 50;
  if (domain.includes(".gov."))
  score += 20;
  if (domain.includes(".edu."))
  score += 15;
  if (domain.match(/\.(com|vn|org|net)$/))
  score += 0;
  if (domain.match(/\.(biz|info|xyz|tk)$/))
  score -= 20;
  return Math.max(0, Math.min(100, score));
}
export function getPressSourceInfo(domain: string): PressSourceInfo | null {
  return PRESS_SOURCES.find((s) => s.domain === domain.toLowerCase().replace(/^www\./, "")) || null;
}
export function detectNewsClusters(articles: NewsArticle[]): NewsClusterResult[] {
  const clusters: Map<string, NewsArticle[]> = new Map();
  for (const article of articles) {
    const key = normalizeHeadline(article.title);
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(article);
  }
  return Array.from(clusters.entries()).
  map(([headline, articles]) => ({
    mainHeadline: articles[0].title,
    count: articles.length,
    sources: articles.map((a) => a.source),
    publishDates: articles.map((a) => a.publishedDate),
    relatedArticles: articles
  })).
  sort((a, b) => b.count - a.count);
}
function normalizeHeadline(headline: string): string {
  return headline.
  toLowerCase().
  replace(/[^a-z0-9\s]/g, "").
  replace(/\s+/g, " ").
  split(" ").
  filter((w) => w.length > 3).
  slice(0, 5).
  join(" ");
}
export async function findCoveragePattern(claim: string, sourcesToCheck: PressSourceInfo[] = PRESS_SOURCES): Promise<{
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
  const checkedSources = sourcesToCheck.slice(0, 5);
  let coverageCount = 0;
  let totalCredibility = 0;
  const topSources: string[] = [];
  for (const source of checkedSources) {
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
    consensus: coverageCount >= 3 ? "covered" as const : coverageCount >= 1 ? "minimal" as const : "uncovered" as const
  };
  pressCache.set(cacheKey, result, 6 * 60 * 60 * 1000);
  return result;
}
export async function parseGoogleNewsRSS(query: string, langCodes: string[] = ["en", "vi"], hoursBack: number = 48): Promise<NewsArticle[]> {
  const cacheKey = `google_news_${query.toLowerCase().replace(/\s+/g, "_")}_${langCodes.join("_")}`;
  const cached = pressCache.get<NewsArticle[]>(cacheKey);
  if (cached) {
    return cached;
  }
  const articles: NewsArticle[] = [];
  try {
    for (const lang of langCodes) {
      const url = `/api/proxy/google-news/rss/search?q=${encodeURIComponent(query)}&hl=${lang}&gl=${lang === "vi" ? "VN" : "US"}&ceid=VN:vi`;
      const response = await withTimeout(fetch(url), 3000);
      if (!response)
      continue;
      const text = await response.text();
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
            credibilityScore: scorePressSource(extractDomain(linkMatch?.[1] || ""))
          });
        }
      }
    }
    articles.sort((a, b) => {
      const dateCompare = new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      if (dateCompare !== 0)
      return dateCompare;
      return b.credibilityScore - a.credibilityScore;
    });
    pressCache.set(cacheKey, articles.slice(0, 20), 6 * 60 * 60 * 1000);
    return articles.slice(0, 20);
  }
  catch (error) {
    console.error("[v0] Google News RSS parse error:", error);
    return [];
  }
}
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  }
  catch {
    return "";
  }
}
function decode(html: string): string {
  const entities: {
    [key: string]: string;
  } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'"
  };
  return html.replace(/&[^;]+;/g, (match) => entities[match] || match);
}
export async function getTrendingTopics(count: number = 10): Promise<string[]> {
  const cacheKey = "trending_topics";
  const cached = pressCache.get<string[]>(cacheKey);
  if (cached) {
    return cached.slice(0, count);
  }
  try {
    const url = "/api/proxy/google-news/rss?hl=vi&gl=VN&ceid=VN:vi";
    const response = await withTimeout(fetch(url), 3000);
    if (!response)
    return [];
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
    pressCache.set(cacheKey, uniqueTitles, 60 * 60 * 1000);
    return uniqueTitles;
  }
  catch (error) {
    console.error("[v0] Trending topics error:", error);
    return [];
  }
}
