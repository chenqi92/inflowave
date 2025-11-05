/**
 * 高级缓存管理器
 * 提供智能缓存策略、LRU 淘汰、预加载优化等功能
 */

import type { LanguageResource } from './translation-loader';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  totalSize: number;
}

export interface CacheConfig {
  maxSize: number;           // 最大缓存条目数
  maxMemorySize: number;     // 最大内存占用（字节）
  ttl: number;               // 缓存过期时间（毫秒）
  enableLRU: boolean;        // 启用 LRU 淘汰策略
  enableCompression: boolean; // 启用压缩（未来功能）
}

/**
 * LRU 缓存管理器
 */
export class CacheManager<T = LanguageResource> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 50,
      maxMemorySize: config.maxMemorySize || 50 * 1024 * 1024, // 50MB
      ttl: config.ttl || 24 * 60 * 60 * 1000, // 24小时
      enableLRU: config.enableLRU !== false,
      enableCompression: config.enableCompression || false,
    };
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.missCount++;
      return null;
    }

    // 更新访问信息
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hitCount++;

    return entry.data;
  }

  /**
   * 设置缓存项
   */
  set(key: string, data: T): void {
    const size = this.estimateSize(data);
    
    // 检查是否需要淘汰旧条目
    if (this.config.enableLRU) {
      this.evictIfNeeded(size);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
    };

    this.cache.set(key, entry);
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
    };
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 
      ? this.stats.hitCount / totalRequests 
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      evictionCount: this.stats.evictionCount,
      hitRate,
      totalSize,
    };
  }

  /**
   * 获取缓存详细信息
   */
  getDetails(): Array<{ key: string; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry: {
        ...entry,
        data: undefined as any, // 不返回实际数据，避免内存占用
      },
    }));
  }

  /**
   * 预热缓存
   */
  async warmup(keys: string[], loader: (key: string) => Promise<T>): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await loader(key);
          this.set(key, data);
        } catch (error) {
          console.warn(`Failed to warmup cache for ${key}:`, error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age > this.config.ttl;
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: T): number {
    try {
      const jsonString = JSON.stringify(data);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.warn('Failed to estimate size:', error);
      return 1024; // 默认 1KB
    }
  }

  /**
   * 根据需要淘汰旧条目
   */
  private evictIfNeeded(newEntrySize: number): void {
    // 检查条目数量限制
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    // 检查内存大小限制
    const currentSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    while (currentSize + newEntrySize > this.config.maxMemorySize && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * 淘汰最少使用的条目
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruScore = Infinity;

    // 计算 LRU 分数（结合访问次数和最后访问时间）
    for (const [key, entry] of this.cache.entries()) {
      const timeSinceAccess = Date.now() - entry.lastAccessed;
      const score = timeSinceAccess / (entry.accessCount + 1);
      
      if (score < lruScore) {
        lruScore = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictionCount++;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果缩小了缓存大小，立即淘汰多余条目
    if (this.config.enableLRU) {
      while (this.cache.size > this.config.maxSize) {
        this.evictLRU();
      }
    }
  }
}
