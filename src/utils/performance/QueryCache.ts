/**
 * 查询缓存系统
 * 
 * 提供智能的查询结果缓存，提高多数据库查询性能
 */

import { performanceMonitor } from './PerformanceMonitor';

interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  averageAccessTime: number;
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };
  
  private config: CacheConfig = {
    maxSize: 100, // 100MB
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxEntries: 1000,
    cleanupInterval: 60 * 1000, // 1 minute
  };

  private cleanupTimer?: NodeJS.Timeout;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.startCleanupTimer();
  }

  /**
   * 生成缓存键
   */
  private generateKey(
    connectionId: string,
    query: string,
    database?: string,
    params?: Record<string, any>
  ): string {
    const keyData = {
      connectionId,
      query: query.trim().toLowerCase(),
      database,
      params,
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2;
    }
  }

  /**
   * 检查缓存项是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 获取缓存项
   */
  get<T = any>(
    connectionId: string,
    query: string,
    database?: string,
    params?: Record<string, any>
  ): T | null {
    const startTime = performance.now();
    const key = this.generateKey(connectionId, query, database, params);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      this.stats.misses++;
      
      if (entry) {
        this.cache.delete(key);
      }
      
      const accessTime = performance.now() - startTime;
      this.updateAccessStats(accessTime);
      
      performanceMonitor.recordMetric(
        'cache_miss',
        accessTime,
        'query',
        { connectionId, query: query.substring(0, 100) }
      );
      
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    const accessTime = performance.now() - startTime;
    this.updateAccessStats(accessTime);

    performanceMonitor.recordMetric(
      'cache_hit',
      accessTime,
      'query',
      { connectionId, query: query.substring(0, 100) }
    );

    return entry.value;
  }

  /**
   * 设置缓存项
   */
  set<T = any>(
    connectionId: string,
    query: string,
    value: T,
    database?: string,
    params?: Record<string, any>,
    ttl?: number
  ): void {
    const key = this.generateKey(connectionId, query, database, params);
    const size = this.estimateSize(value);
    const actualTTL = ttl || this.config.defaultTTL;

    // Check if we need to make space
    this.ensureSpace(size);

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: actualTTL,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    this.cache.set(key, entry);

    performanceMonitor.recordMetric(
      'cache_set',
      0,
      'query',
      { 
        connectionId, 
        query: query.substring(0, 100),
        size,
        ttl: actualTTL,
      }
    );
  }

  /**
   * 确保有足够的缓存空间
   */
  private ensureSpace(requiredSize: number): void {
    const currentSize = this.getTotalSize();
    const maxSizeBytes = this.config.maxSize * 1024 * 1024;

    if (currentSize + requiredSize <= maxSizeBytes && this.cache.size < this.config.maxEntries) {
      return;
    }

    // Remove expired entries first
    this.removeExpiredEntries();

    // If still not enough space, use LRU eviction
    while (
      (this.getTotalSize() + requiredSize > maxSizeBytes || 
       this.cache.size >= this.config.maxEntries) &&
      this.cache.size > 0
    ) {
      this.evictLRU();
    }
  }

  /**
   * 移除过期的缓存项
   */
  private removeExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      performanceMonitor.recordMetric(
        'cache_cleanup_expired',
        expiredKeys.length,
        'memory',
        { removedEntries: expiredKeys.length }
      );
    }
  }

  /**
   * 使用 LRU 策略驱逐缓存项
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      
      performanceMonitor.recordMetric(
        'cache_eviction_lru',
        1,
        'memory',
        { evictedKey: oldestKey }
      );
    }
  }

  /**
   * 获取总缓存大小
   */
  private getTotalSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * 更新访问统计
   */
  private updateAccessStats(accessTime: number): void {
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.getTotalSize(),
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      averageAccessTime: this.stats.accessCount > 0 
        ? this.stats.totalAccessTime / this.stats.accessCount 
        : 0,
    };
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    const entriesCount = this.cache.size;
    this.cache.clear();
    this.resetStats();

    performanceMonitor.recordMetric(
      'cache_clear',
      entriesCount,
      'memory',
      { clearedEntries: entriesCount }
    );
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  /**
   * 删除特定连接的缓存
   */
  clearConnection(connectionId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      try {
        const keyData = JSON.parse(atob(key));
        if (keyData.connectionId === connectionId) {
          keysToDelete.push(key);
        }
      } catch {
        // Invalid key format, skip
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    performanceMonitor.recordMetric(
      'cache_clear_connection',
      keysToDelete.length,
      'memory',
      { connectionId, clearedEntries: keysToDelete.length }
    );
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.removeExpiredEntries();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * 获取缓存配置
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval && this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.startCleanupTimer();
    }
  }
}

// 创建全局查询缓存实例
export const queryCache = new QueryCache();

// 缓存装饰器
export function cacheQuery(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      connectionId: string,
      query: string,
      database?: string,
      params?: Record<string, any>
    ) {
      // Try to get from cache first
      const cached = queryCache.get(connectionId, query, database, params);
      if (cached) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.call(this, connectionId, query, database, params);

      // Cache the result
      queryCache.set(connectionId, query, result, database, params, ttl);

      return result;
    };

    return descriptor;
  };
}

export type { CacheEntry, CacheStats, CacheConfig };
