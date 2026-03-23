/**
 * Query Cache Manager
 *
 * Handles caching of frequent query results with automatic expiration,
 * invalidation strategies, and memory management.
 */

import { DynamicResponse } from '../api';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  lastAccessTime: number;
  queryHash: string;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
}

export class QueryCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB
  private maxEntries: number = 1000;

  /**
   * Generate a cache key from query parameters
   */
  generateCacheKey(query: string, sessionId?: string, params?: Record<string, any>): string {
    const hashInput = `${query}|${sessionId || ''}|${JSON.stringify(params || {})}`;
    return this.simpleHash(hashInput);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash)}`;
  }

  /**
   * Get a cached response
   */
  get<T = DynamicResponse>(cacheKey: string): T | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.misses++;
      return null;
    }

    // Update access stats
    this.hits++;
    entry.hitCount++;
    entry.lastAccessTime = Date.now();

    return entry.data as T;
  }

  /**
   * Set a cached response
   */
  set<T = DynamicResponse>(
    cacheKey: string,
    data: T,
    validityMs: number,
    metadata?: Record<string, any>
  ): void {
    // Check memory before adding
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + validityMs,
      hitCount: 0,
      lastAccessTime: Date.now(),
      queryHash: cacheKey,
      metadata,
    };

    this.cache.set(cacheKey, entry);
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(cacheKey: string): void {
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccessTime < lruTime) {
        lruTime = entry.lastAccessTime;
        lruKey = key;
      }
    });

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.clearExpired();
    
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    
    // Estimate memory usage
    let memoryUsage = 0;
    this.cache.forEach((entry) => {
      memoryUsage += JSON.stringify(entry.data).length * 2; // rough estimate
    });

    return {
      totalEntries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage,
    };
  }

  /**
   * Get cache entries sorted by hit count
   */
  getTopEntries(limit: number = 10): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, limit);
  }

  /**
   * Prewarm cache with common queries
   */
  prewarmCache(entries: Array<{ key: string; data: any; validityMs: number }>): void {
    entries.forEach(entry => {
      this.set(entry.key, entry.data, entry.validityMs);
    });
  }

  /**
   * Export cache state for debugging/analytics
   */
  exportStats(): Record<string, any> {
    const stats = this.getStats();
    const topEntries = this.getTopEntries(5).map(e => ({
      key: e.queryHash,
      hits: e.hitCount,
      createdAt: new Date(e.timestamp),
      expiresAt: new Date(e.expiresAt),
    }));

    let memoryUsage = 0;
    this.cache.forEach(entry => {
      memoryUsage += JSON.stringify(entry.data).length * 2;
    });

    return {
      stats,
      topEntries,
      cacheSize: this.cache.size,
      estimatedMemoryMB: Math.round(memoryUsage / (1024 * 1024) * 100) / 100,
    };
  }
}

// Singleton instance
export const queryCacheManager = new QueryCacheManager();
