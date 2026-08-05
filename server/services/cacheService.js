/**
 * Cache Service - In-memory cache with TTL
 * Lưu kết quả tìm kiếm để trả nhanh cho user tiếp theo
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0 };
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
    
    console.log('[CacheService] Initialized in-memory cache');
  }

  /**
   * Generate cache key from input
   */
  generateKey(type, input) {
    const normalized = input.toLowerCase().trim();
    return `${type}:${normalized}`;
  }

  /**
   * Get cached result
   */
  get(type, input) {
    const key = this.generateKey(type, input);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set cached result with TTL
   * @param {string} type - 'link' or 'text'
   * @param {string} input - URL or text content
   * @param {object} data - Result data to cache
   * @param {number} ttlMinutes - Time to live in minutes (default: 60)
   */
  set(type, input, data, ttlMinutes = 60) {
    const key = this.generateKey(type, input);
    const expiresAt = Date.now() + (ttlMinutes * 60 * 1000);
    
    this.cache.set(key, {
      data,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    this.stats.sets++;
    
    // Limit cache size (max 10,000 entries)
    if (this.cache.size > 10000) {
      this.evictOldest();
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1)
      : 0;
    
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[CacheService] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  evictOldest() {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    // Remove oldest 10%
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    console.log(`[CacheService] Evicted ${toRemove} oldest entries`);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
    console.log('[CacheService] Cache cleared');
  }

  /**
   * Get TTL remaining for a key
   */
  getTTL(type, input) {
    const key = this.generateKey(type, input);
    const entry = this.cache.get(key);
    
    if (!entry) return 0;
    
    const remaining = Math.max(0, entry.expiresAt - Date.now());
    return Math.floor(remaining / 1000); // Return seconds
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
