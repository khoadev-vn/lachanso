import { apiOrchestrator } from "./apiOrchestrator";
import { withTimeout, RateLimiter } from "./performanceOptimizer";
const BING_NEWS_BASE = "/api/proxy/bing-news/";
export interface NewsArticle {
  title: string;
  description?: string;
  url: string;
  source: {
    id?: string;
    name: string;
  };
  author?: string;
  publishedAt: string;
  content?: string;
  image?: string;
  relevanceScore?: number;
}
export interface NewsSearchResult {
  totalResults: number;
  articles: NewsArticle[];
  lastQuery: string;
  timestamp: number;
}
const rateLimiter = new RateLimiter(5, 100);
export async function searchNews(query: string, options?: {
  language?: string;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  pageSize?: number;
}): Promise<NewsArticle[]> {
  const cacheKey = `news_search_${query.toLowerCase().trim()}`;
  const cached = apiOrchestrator.getCache().get<NewsArticle[]>(cacheKey);
  if (cached) {
    apiOrchestrator.recordCacheHit();
    return cached;
  }
  try {
    await rateLimiter.acquire();
    await apiOrchestrator.throttle("newsApi");
    if (!apiOrchestrator.hasQuota("newsApi")) {
      console.warn("[v0] News API quota exhausted");
      return [];
    }
    const params = new URLSearchParams({
      q: query,
      format: "rss",
      setlang: options?.language || "vi"
    });
    const startTime = performance.now();
    const response = await withTimeout(fetch(`${BING_NEWS_BASE}?${params}`), 5000);
    if (!response || !response.ok) {
      console.error(`[v0] Bing News error: ${response?.statusText}`);
      return [];
    }
    const xmlText = await response.text();
    if (!xmlText) return [];
    const xml = new DOMParser().parseFromString(xmlText, "application/xml");
    if (xml.getElementsByTagName("parsererror").length > 0) return [];
    const items = Array.from(xml.querySelectorAll("item")).slice(0, options?.pageSize || 15);
    const articles: NewsArticle[] = items.map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() ?? "",
      description: undefined,
      url: item.querySelector("link")?.textContent?.trim() ?? "",
      source: { name: item.querySelector("News\\:Source")?.textContent?.trim() ?? item.querySelector("source")?.textContent?.trim() ?? "Bing News" },
      author: undefined,
      publishedAt: item.querySelector("pubDate")?.textContent?.trim() ?? new Date().toISOString(),
      content: undefined,
      image: undefined
    }));
    const responseTime = performance.now() - startTime;
    apiOrchestrator.recordAPICall("newsApi", responseTime, true);
    apiOrchestrator.decrementQuota("newsApi", 1);
    apiOrchestrator.getCache().set(cacheKey, articles, 4 * 60 * 60 * 1000);
    return articles;
  }
  catch (error) {
    console.error("[v0] News API fetch error:", error);
    apiOrchestrator.recordAPICall("newsApi", 0, false);
    return [];
  }
}
export async function searchNewsByTopic(topic: string): Promise<NewsArticle[]> {
  const topicQueries = {
    politics: "politics election government policy",
    health: "health medicine disease vaccine",
    technology: "technology AI software innovation",
    business: "business economy market finance",
    sports: "sports football basketball soccer",
    entertainment: "entertainment movie music celebrity",
    science: "science research discovery",
    world: "world international news",
    vietnam: "Vietnam Việt Nam news"
  };
  const query = topicQueries[topic as keyof typeof topicQueries] || topic;
  return searchNews(query, { sortBy: "publishedAt", pageSize: 20 });
}
export async function batchSearchNews(queries: string[]): Promise<Map<string, NewsArticle[]>> {
  const results = new Map<string, NewsArticle[]>();
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map((q) => searchNews(q)));
    batch.forEach((query, index) => {
      results.set(query, batchResults[index]);
    });
    if (i + 3 < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return results;
}
export function scoreArticleRelevance(article: NewsArticle, claim: string): number {
  const text = `${article.title} ${article.description || ""}`.toLowerCase();
  const claimWords = claim.toLowerCase().split(/\s+/);
  let matchScore = 0;
  for (const word of claimWords) {
    if (word.length > 3 && text.includes(word)) {
      matchScore++;
    }
  }
  const ageInDays = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 1 - ageInDays / 365);
  return Math.min(1, matchScore / claimWords.length * 0.7 + recencyBoost * 0.3);
}
export const TRUSTED_NEWS_SOURCES = new Set([
"Reuters",
"AP News",
"Associated Press",
"BBC",
"BBC News",
"The New York Times",
"The Guardian",
"The Washington Post",
"CNN",
"NPR",
"Al Jazeera",
"Financial Times",
"The Economist",
"ProPublica",
"Snopes",
"FactCheck.org",
"PolitiFact",
"The Vietnam News",
"VnExpress",
"Tuổi Trẻ",
"Thanh Niên"]
);
export function isTrustedNewsSource(sourceName: string): boolean {
  return TRUSTED_NEWS_SOURCES.has(sourceName);
}
export function getNewsApiQuotaStatus() {
  const status = apiOrchestrator.getQuotaStatus();
  return status.newsApi;
}
export function getNewsApiMetrics() {
  const metrics = apiOrchestrator.getMetrics();
  return {
    totalCalls: metrics.totalCalls,
    cacheRate: metrics.cacheRate.toFixed(2) + "%",
    avgResponseTime: metrics.avgResponseTime.toFixed(0) + "ms",
    newsApiCalls: metrics.apiCallsBySource["newsApi"] || 0,
    failureRate: metrics.failureRate.toFixed(2) + "%"
  };
}
