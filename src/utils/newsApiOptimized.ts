/**
 * NEWS API OPTIMIZED - Lá Chắn Số
 * Tối ưu hóa sử dụng NewsAPI.org với caching, batching, và smart queries
 */

import { apiOrchestrator } from "./apiOrchestrator";
import { withTimeout, RateLimiter } from "./performanceOptimizer";

const NEWS_API_KEY = import.meta.env.VITE_NEWS_API_KEY || "";
const NEWS_API_BASE = "https://newsapi.org/v2";

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

// Rate limiter: 5 requests per 100ms to stay safe
const rateLimiter = new RateLimiter(5, 100);

/**
 * Search for news articles with optimization
 */
export async function searchNews(query: string, options?: {
  language?: string;
  sortBy?: "relevancy" | "popularity" | "publishedAt";
  pageSize?: number;
}): Promise<NewsArticle[]> {
  if (!NEWS_API_KEY) {
    console.warn("[v0] News API key not configured");
    return [];
  }

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
      apiKey: NEWS_API_KEY,
      sortBy: options?.sortBy || "relevancy",
      pageSize: String(options?.pageSize || 15),
      language: options?.language || "en",
    });

    const startTime = performance.now();
    const response = await withTimeout(
      fetch(`${NEWS_API_BASE}/everything?${params}`),
      5000
    );

    if (!response || !response.ok) {
      console.error(`[v0] News API error: ${response?.statusText}`);
      return [];
    }

    const data = await response.json();
    const articles: NewsArticle[] = (data.articles || [])
      .slice(0, 15)
      .map((article: any) => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source,
        author: article.author,
        publishedAt: article.publishedAt,
        content: article.content?.substring(0, 500),
        image: article.urlToImage,
      }));

    const responseTime = performance.now() - startTime;
    apiOrchestrator.recordAPICall("newsApi", responseTime, true);
    apiOrchestrator.decrementQuota("newsApi", 1);

    // Cache for 4 hours
    apiOrchestrator.getCache().set(cacheKey, articles, 4 * 60 * 60 * 1000);

    return articles;
  } catch (error) {
    console.error("[v0] News API fetch error:", error);
    apiOrchestrator.recordAPICall("newsApi", 0, false);
    return [];
  }
}

/**
 * Search for news by topic with smart filtering
 */
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
    vietnam: "Vietnam Việt Nam news",
  };

  const query = topicQueries[topic as keyof typeof topicQueries] || topic;
  return searchNews(query, { sortBy: "publishedAt", pageSize: 20 });
}

/**
 * Batch search for multiple queries efficiently
 */
export async function batchSearchNews(queries: string[]): Promise<Map<string, NewsArticle[]>> {
  const results = new Map<string, NewsArticle[]>();

  // Process in batches of 3 to stay within rate limits
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map((q) => searchNews(q)));

    batch.forEach((query, index) => {
      results.set(query, batchResults[index]);
    });

    // Delay between batches
    if (i + 3 < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

/**
 * Score articles by relevance to original claim
 */
export function scoreArticleRelevance(article: NewsArticle, claim: string): number {
  const text = `${article.title} ${article.description || ""}`.toLowerCase();
  const claimWords = claim.toLowerCase().split(/\s+/);

  let matchScore = 0;
  for (const word of claimWords) {
    if (word.length > 3 && text.includes(word)) {
      matchScore++;
    }
  }

  // Boost score for recent articles
  const ageInDays = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyBoost = Math.max(0, 1 - ageInDays / 365);

  return Math.min(1, (matchScore / claimWords.length) * 0.7 + recencyBoost * 0.3);
}

/**
 * Filter trusted news sources
 */
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
  "Thanh Niên",
]);

export function isTrustedNewsSource(sourceName: string): boolean {
  return TRUSTED_NEWS_SOURCES.has(sourceName);
}

/**
 * Get quota status
 */
export function getNewsApiQuotaStatus() {
  const status = apiOrchestrator.getQuotaStatus();
  return status.newsApi;
}

/**
 * Get API metrics
 */
export function getNewsApiMetrics() {
  const metrics = apiOrchestrator.getMetrics();
  return {
    totalCalls: metrics.totalCalls,
    cacheRate: metrics.cacheRate.toFixed(2) + "%",
    avgResponseTime: metrics.avgResponseTime.toFixed(0) + "ms",
    newsApiCalls: metrics.apiCallsBySource["newsApi"] || 0,
    failureRate: metrics.failureRate.toFixed(2) + "%",
  };
}
