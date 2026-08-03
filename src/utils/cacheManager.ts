export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
export interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
}
export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestQueue: Map<string, Promise<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number;
  constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 1000;
    this.defaultTTL = config.defaultTTL || 5 * 60 * 1000;
  }
  hashKey(key: string): string {
    return key.toLowerCase().trim();
  }
  private isValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }
  get<T>(key: string): T | null {
    const hashedKey = this.hashKey(key);
    const entry = this.cache.get(hashedKey);
    if (!entry)
    return null;
    if (!this.isValid(entry)) {
      this.cache.delete(hashedKey);
      return null;
    }
    return entry.data as T;
  }
  set<T>(key: string, data: T, ttl?: number): void {
    const hashedKey = this.hashKey(key);
    if (this.cache.size >= this.maxSize && !this.cache.has(hashedKey)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey)
      this.cache.delete(firstKey);
    }
    this.cache.set(hashedKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }
  delete(key: string): boolean {
    const hashedKey = this.hashKey(key);
    return this.cache.delete(hashedKey);
  }
  clear(): void {
    this.cache.clear();
  }
  getStats(): {
    size: number;
    maxSize: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
  async deduplicate<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const hashedKey = this.hashKey(key);
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    if (this.requestQueue.has(hashedKey)) {
      return this.requestQueue.get(hashedKey) as Promise<T>;
    }
    const promise = fetchFn().then((result) => {
      this.requestQueue.delete(hashedKey);
      return result;
    });
    this.requestQueue.set(hashedKey, promise);
    return promise;
  }
}
export const wikipediaCache = new CacheManager({
  defaultTTL: 5 * 60 * 1000,
  maxSize: 500
});
export const factCheckCache = new CacheManager({
  defaultTTL: 30 * 60 * 1000,
  maxSize: 300
});
export const pressCache = new CacheManager({
  defaultTTL: 6 * 60 * 60 * 1000,
  maxSize: 200
});
export const domainCache = new CacheManager({
  defaultTTL: 24 * 60 * 60 * 1000,
  maxSize: 500
});
