/**
 * API ORCHESTRATOR - Lá Chắn Số
 * Tối ưu hóa sử dụng API keys, quản lý quota, và phân tán tải
 */

import { CacheManager } from "./cacheManager";

export interface APIQuotaStatus {
  newsApi: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
  factCheckApi: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}

export interface APICallMetrics {
  totalCalls: number;
  cacheHits: number;
  cacheRate: number; // percentage
  avgResponseTime: number; // ms
  failureRate: number; // percentage
  apiCallsBySource: Record<string, number>;
}

class APIOrchestrator {
  private newsApiQuota = { remaining: 100, limit: 100, resetAt: new Date() };
  private factCheckQuota = { remaining: 10000, limit: 10000, resetAt: new Date() };
  private metrics: APICallMetrics = {
    totalCalls: 0,
    cacheHits: 0,
    cacheRate: 0,
    avgResponseTime: 0,
    failureRate: 0,
    apiCallsBySource: {},
  };
  private callTimes: number[] = [];
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager({
      maxSize: 2000,
      defaultTTL: 60 * 60 * 1000, // 1 hour
    });
  }

  /**
   * Get current quota status
   */
  getQuotaStatus(): APIQuotaStatus {
    return {
      newsApi: this.newsApiQuota,
      factCheckApi: this.factCheckQuota,
    };
  }

  /**
   * Check if we have quota for a specific API
   */
  hasQuota(apiName: "newsApi" | "factCheckApi"): boolean {
    if (apiName === "newsApi") {
      return this.newsApiQuota.remaining > 0;
    } else if (apiName === "factCheckApi") {
      return this.factCheckQuota.remaining > 0;
    }
    return false;
  }

  /**
   * Decrement quota after API call
   */
  decrementQuota(apiName: "newsApi" | "factCheckApi", amount: number = 1): void {
    if (apiName === "newsApi") {
      this.newsApiQuota.remaining = Math.max(0, this.newsApiQuota.remaining - amount);
    } else if (apiName === "factCheckApi") {
      this.factCheckQuota.remaining = Math.max(0, this.factCheckQuota.remaining - amount);
    }

    this.recordAPICall(apiName);
  }

  /**
   * Record an API call for metrics
   */
  recordAPICall(apiName: string, responseTime: number = 0, success: boolean = true): void {
    this.metrics.totalCalls++;
    this.metrics.apiCallsBySource[apiName] = (this.metrics.apiCallsBySource[apiName] || 0) + 1;

    if (responseTime > 0) {
      this.callTimes.push(responseTime);
      // Keep only last 100 calls for average calculation
      if (this.callTimes.length > 100) {
        this.callTimes.shift();
      }
      this.metrics.avgResponseTime = this.callTimes.reduce((a, b) => a + b, 0) / this.callTimes.length;
    }

    if (!success) {
      // Calculate failure rate
      const failures = Object.values(this.metrics.apiCallsBySource).filter((v) => v < 0);
      this.metrics.failureRate = failures.length / this.metrics.totalCalls;
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
    this.metrics.cacheRate = (this.metrics.cacheHits / Math.max(this.metrics.totalCalls, 1)) * 100;
  }

  /**
   * Get current metrics
   */
  getMetrics(): APICallMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset daily quotas (called by external cron job)
   */
  resetQuotas(): void {
    this.newsApiQuota = { remaining: 100, limit: 100, resetAt: this.getNextMidnight() };
    this.factCheckQuota = { remaining: 10000, limit: 10000, resetAt: this.getNextMidnight() };
  }

  /**
   * Get next midnight UTC
   */
  private getNextMidnight(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Get cache instance for API results
   */
  getCache(): CacheManager {
    return this.cache;
  }

  /**
   * Decide which API to use based on quota and cache
   */
  chooseBestAPI(
    preferredAPI: "newsApi" | "factCheckApi",
    cacheKey: string
  ): { api: "newsApi" | "factCheckApi" | "cache"; canUse: boolean } {
    // Check cache first
    if (this.cache.get(cacheKey)) {
      return { api: "cache", canUse: true };
    }

    // Check if preferred API has quota
    if (this.hasQuota(preferredAPI)) {
      return { api: preferredAPI, canUse: true };
    }

    // Fallback to alternative
    const alternative = preferredAPI === "newsApi" ? "factCheckApi" : "newsApi";
    if (this.hasQuota(alternative)) {
      return { api: alternative, canUse: true };
    }

    // No quota available
    return { api: preferredAPI, canUse: false };
  }

  /**
   * Request throttling - delay if needed
   */
  async throttle(apiName: string): Promise<void> {
    // If we're making lots of calls, add small delay
    if (this.metrics.totalCalls > 100 && this.metrics.totalCalls % 50 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Export singleton instance
export const apiOrchestrator = new APIOrchestrator();
