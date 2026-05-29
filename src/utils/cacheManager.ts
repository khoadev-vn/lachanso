/**
 * UNIVERSAL CACHE MANAGER - Lá Chắn Số
 * Quản lý bộ nhớ cache cho các lớp xác minh tin tức
 * Hỗ trợ TTL (Time-To-Live), deduplication, và session persistence
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

export interface CacheConfig {
  maxSize?: number; // Maximum entries, default 1000
  defaultTTL?: number; // Default TTL in ms, default 5 minutes
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.defaultTTL || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate a cache key from input
   */
  hashKey(key: string): string {
    return key.toLowerCase().trim();
  }

  /**
   * Check if entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const hashedKey = this.hashKey(key);
    const entry = this.cache.get(hashedKey);

    if (!entry) return null;
    if (!this.isValid(entry)) {
      this.cache.delete(hashedKey);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const hashedKey = this.hashKey(key);

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(hashedKey)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(hashedKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Remove entry from cache
   */
  delete(key: string): boolean {
    const hashedKey = this.hashKey(key);
    return this.cache.delete(hashedKey);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Deduplicate requests - return same promise if request already in progress
   */
  async deduplicate<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const hashedKey = this.hashKey(key);

    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if request already in progress
    if (this.requestQueue.has(hashedKey)) {
      return this.requestQueue.get(hashedKey) as Promise<T>;
    }

    // Execute request and store promise
    const promise = fetchFn().then((result) => {
      this.requestQueue.delete(hashedKey);
      return result;
    });

    this.requestQueue.set(hashedKey, promise);
    return promise;
  }
}

// Global cache instances
export const wikipediaCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
});

export const factCheckCache = new CacheManager({
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxSize: 300,
});

export const pressCache = new CacheManager({
  defaultTTL: 6 * 60 * 60 * 1000, // 6 hours
  maxSize: 200,
});

export const domainCache = new CacheManager({
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 500,
});
