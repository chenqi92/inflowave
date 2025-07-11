import { safeTauriInvoke } from '@/utils/tauri';
import { QueryAnalysis } from '../analyzer/QueryAnalyzer';
import { Recommendation } from '../index';

export interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastHit: number;
  tags: string[];
  metadata: CacheMetadata;
}

export interface CacheMetadata {
  queryComplexity: number;
  dataSize: number;
  computationCost: number;
  freshnessScore: number;
  popularityScore: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  strategy?: 'lru' | 'lfu' | 'ttl' | 'adaptive';
}

export interface CacheStatistics {
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  totalEntries: number;
  usedMemory: number;
  maxMemory: number;
  evictionCount: number;
  avgResponseTime: number;
  topHitQueries: CacheHitInfo[];
  topMissQueries: CacheMissInfo[];
}

export interface CacheHitInfo {
  key: string;
  hitCount: number;
  avgResponseTime: number;
  lastHit: Date;
}

export interface CacheMissInfo {
  key: string;
  missCount: number;
  avgComputeTime: number;
  lastMiss: Date;
}

export interface CacheEvictionPolicy {
  name: string;
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  maxSize: number;
  maxMemory: number;
  ttlDefault: number;
  priorities: Record<string, number>;
}

export interface CacheConfiguration {
  enabled: boolean;
  maxSize: number;
  maxMemory: number;
  defaultTtl: number;
  evictionPolicy: CacheEvictionPolicy;
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  distributedEnabled: boolean;
}

/**
 * 智能缓存系统
 * 
 * 核心功能：
 * 1. 自适应缓存策略
 * 2. 智能TTL计算
 * 3. 查询模式识别
 * 4. 缓存性能分析
 */
export class IntelligentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;
  private configuration: CacheConfiguration;
  private queryPatterns: Map<string, QueryPattern> = new Map();
  private accessLog: CacheAccess[] = [];

  constructor(config?: Partial<CacheConfiguration>) {
    this.configuration = {
      enabled: true,
      maxSize: 1000,
      maxMemory: 512 * 1024 * 1024, // 512MB
      defaultTtl: 3600000, // 1小时
      evictionPolicy: {
        name: 'adaptive',
        strategy: 'adaptive',
        maxSize: 1000,
        maxMemory: 512 * 1024 * 1024,
        ttlDefault: 3600000,
        priorities: {
          'high': 1.5,
          'medium': 1.0,
          'low': 0.5,
        },
      },
      compressionEnabled: true,
      persistenceEnabled: false,
      distributedEnabled: false,
      ...config,
    };
  }

  /**
   * 获取缓存项
   */
  async get(key: string): Promise<any> {
    if (!this.configuration.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      this.recordAccess(key, 'miss');
      return null;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.missCount++;
      this.recordAccess(key, 'miss');
      return null;
    }

    // 更新访问统计
    entry.hitCount++;
    entry.lastHit = Date.now();
    this.hitCount++;
    this.recordAccess(key, 'hit');

    return entry.value;
  }

  /**
   * 设置缓存项
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    if (!this.configuration.enabled) {
      return;
    }

    const ttl = options.ttl || this.configuration.defaultTtl;
    const tags = options.tags || [];
    const priority = options.priority || 'medium';
    
    // 计算元数据
    const metadata = this.calculateMetadata(value, options);
    
    // 创建缓存项
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
      lastHit: 0,
      tags,
      metadata,
    };

    // 检查是否需要淘汰
    await this.evictIfNeeded();

    // 添加到缓存
    this.cache.set(key, entry);
    
    // 记录查询模式
    this.recordQueryPattern(key, options);
  }

  /**
   * 删除缓存项
   */
  async remove(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.cache.clear();
      this.hitCount = 0;
      this.missCount = 0;
      this.evictionCount = 0;
      return;
    }

    // 根据模式清空
    const regex = new RegExp(pattern);
    const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(query: string, connectionId: string, database: string): string {
    // 标准化查询
    const normalizedQuery = this.normalizeQuery(query);
    
    // 生成哈希
    const queryHash = this.hashString(normalizedQuery);
    
    return `${connectionId}:${database}:${queryHash}`;
  }

  /**
   * 计算TTL
   */
  calculateTTL(analysis: QueryAnalysis): number {
    let ttl = this.configuration.defaultTtl;
    
    // 基于查询复杂度调整TTL
    const complexity = analysis.complexity.score;
    if (complexity > 80) {
      ttl *= 2; // 复杂查询缓存更久
    } else if (complexity < 20) {
      ttl *= 0.5; // 简单查询缓存时间短
    }
    
    // 基于数据新鲜度需求调整
    if (analysis.tags.includes('real_time')) {
      ttl = Math.min(ttl, 300000); // 最多5分钟
    }
    
    if (analysis.tags.includes('historical')) {
      ttl *= 3; // 历史数据可以缓存更久
    }
    
    // 基于资源使用调整
    if (analysis.resourceUsage.estimatedMemory > 1024) {
      ttl *= 1.5; // 高内存使用查询缓存更久
    }
    
    return ttl;
  }

  /**
   * 检查缓存有效性
   */
  isValid(entry: CacheEntry): boolean {
    return !this.isExpired(entry);
  }

  /**
   * 获取缓存统计
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.missCount / totalRequests : 0;
    
    // 计算内存使用
    const usedMemory = this.calculateMemoryUsage();
    
    // 计算平均响应时间
    const avgResponseTime = this.calculateAvgResponseTime();
    
    // 获取热门查询
    const topHitQueries = this.getTopHitQueries();
    const topMissQueries = this.getTopMissQueries();
    
    return {
      hitRate,
      missRate,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      totalEntries: this.cache.size,
      usedMemory,
      maxMemory: this.configuration.maxMemory,
      evictionCount: this.evictionCount,
      avgResponseTime,
      topHitQueries,
      topMissQueries,
    };
  }

  /**
   * 推荐缓存策略
   */
  async recommendCaching(query: string, analysis: QueryAnalysis): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    
    // 检查查询是否适合缓存
    const cachingScore = this.calculateCachingScore(analysis);
    
    if (cachingScore > 0.7) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        title: 'Enable aggressive caching',
        description: 'This query is ideal for caching with high TTL',
        implementation: `Set cache TTL to ${this.calculateTTL(analysis)}ms`,
        estimatedBenefit: Math.floor(cachingScore * 100),
      });
    } else if (cachingScore > 0.4) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Enable conservative caching',
        description: 'This query could benefit from short-term caching',
        implementation: `Set cache TTL to ${Math.floor(this.calculateTTL(analysis) * 0.5)}ms`,
        estimatedBenefit: Math.floor(cachingScore * 60),
      });
    }
    
    // 检查缓存策略优化
    const hitRate = this.getStatistics().hitRate;
    if (hitRate < 0.3) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Optimize cache strategy',
        description: 'Current cache hit rate is low, consider adjusting strategy',
        implementation: 'Switch to adaptive caching strategy',
        estimatedBenefit: 40,
      });
    }
    
    return recommendations;
  }

  /**
   * 更新缓存策略
   */
  async updateStrategy(query: string, result: any): Promise<void> {
    // 基于查询结果更新缓存策略
    const key = this.generateCacheKey(query, 'default', 'default');
    const pattern = this.queryPatterns.get(key);
    
    if (pattern) {
      // 更新模式统计
      pattern.accessCount++;
      pattern.lastAccess = Date.now();
      
      // 调整缓存策略
      this.adjustCacheStrategy(pattern);
    }
  }

  /**
   * 预热缓存
   */
  async warmup(queries: string[]): Promise<void> {
    // 预热常用查询
    for (const query of queries) {
      const key = this.generateCacheKey(query, 'warmup', 'default');
      
      // 检查是否已存在
      if (!this.cache.has(key)) {
        // 模拟执行查询并缓存结果
        const mockResult = { warmup: true, query };
        await this.set(key, mockResult, { ttl: this.configuration.defaultTtl });
      }
    }
  }

  /**
   * 缓存压缩
   */
  async compress(): Promise<void> {
    if (!this.configuration.compressionEnabled) {
      return;
    }
    
    // 压缩大型缓存项
    for (const [key, entry] of this.cache.entries()) {
      if (this.calculateSize(entry.value) > 1024 * 1024) { // 1MB
        // 这里应该使用实际的压缩算法
        entry.value = this.compressValue(entry.value);
      }
    }
  }

  /**
   * 缓存持久化
   */
  async persist(): Promise<void> {
    if (!this.configuration.persistenceEnabled) {
      return;
    }
    
    // 将缓存数据持久化到磁盘
    const cacheData = {
      entries: Array.from(this.cache.entries()),
      statistics: {
        hitCount: this.hitCount,
        missCount: this.missCount,
        evictionCount: this.evictionCount,
      },
      timestamp: Date.now(),
    };
    
    try {
      await safeTauriInvoke('save_cache_data', { data: cacheData });
    } catch (error) {
      console.error('Failed to persist cache:', error);
    }
  }

  /**
   * 从持久化存储恢复缓存
   */
  async restore(): Promise<void> {
    if (!this.configuration.persistenceEnabled) {
      return;
    }
    
    try {
      const cacheData = await safeTauriInvoke('load_cache_data');
      
      if (cacheData && cacheData.entries) {
        // 恢复缓存项
        for (const [key, entry] of cacheData.entries) {
          if (!this.isExpired(entry)) {
            this.cache.set(key, entry);
          }
        }
        
        // 恢复统计信息
        if (cacheData.statistics) {
          this.hitCount = cacheData.statistics.hitCount || 0;
          this.missCount = cacheData.statistics.missCount || 0;
          this.evictionCount = cacheData.statistics.evictionCount || 0;
        }
      }
    } catch (error) {
      console.error('Failed to restore cache:', error);
    }
  }

  // 私有方法实现
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private async evictIfNeeded(): Promise<void> {
    // 检查大小限制
    if (this.cache.size >= this.configuration.maxSize) {
      await this.evictEntries(1);
    }
    
    // 检查内存限制
    const memoryUsage = this.calculateMemoryUsage();
    if (memoryUsage >= this.configuration.maxMemory) {
      await this.evictEntries(Math.ceil(this.cache.size * 0.1)); // 淘汰10%
    }
  }

  private async evictEntries(count: number): Promise<void> {
    const strategy = this.configuration.evictionPolicy.strategy;
    
    switch (strategy) {
      case 'lru':
        await this.evictLRU(count);
        break;
      case 'lfu':
        await this.evictLFU(count);
        break;
      case 'ttl':
        await this.evictTTL(count);
        break;
      case 'adaptive':
        await this.evictAdaptive(count);
        break;
    }
    
    this.evictionCount += count;
  }

  private async evictLRU(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastHit - b[1].lastHit);
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private async evictLFU(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private async evictTTL(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => (a[1].timestamp + a[1].ttl) - (b[1].timestamp + b[1].ttl));
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private async evictAdaptive(count: number): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // 计算每个条目的分数
    entries.forEach(([key, entry]) => {
      entry.metadata.freshnessScore = this.calculateFreshnessScore(entry);
      entry.metadata.popularityScore = this.calculatePopularityScore(entry);
    });
    
    // 根据综合分数排序
    entries.sort((a, b) => {
      const scoreA = this.calculateAdaptiveScore(a[1]);
      const scoreB = this.calculateAdaptiveScore(b[1]);
      return scoreA - scoreB;
    });
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private calculateMetadata(value: any, options: CacheOptions): CacheMetadata {
    return {
      queryComplexity: 0,
      dataSize: this.calculateSize(value),
      computationCost: 0,
      freshnessScore: 1.0,
      popularityScore: 0.0,
    };
  }

  private calculateSize(value: any): number {
    // 简化的大小计算
    return JSON.stringify(value).length;
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += this.calculateSize(entry.value);
    }
    return totalSize;
  }

  private calculateAvgResponseTime(): number {
    const recentAccesses = this.accessLog.slice(-100);
    if (recentAccesses.length === 0) return 0;
    
    const totalTime = recentAccesses.reduce((sum, access) => sum + access.responseTime, 0);
    return totalTime / recentAccesses.length;
  }

  private getTopHitQueries(): CacheHitInfo[] {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => b[1].hitCount - a[1].hitCount);
    
    return entries.slice(0, 10).map(([key, entry]) => ({
      key,
      hitCount: entry.hitCount,
      avgResponseTime: 0, // 需要从访问日志计算
      lastHit: new Date(entry.lastHit),
    }));
  }

  private getTopMissQueries(): CacheMissInfo[] {
    // 从访问日志中统计miss查询
    const missQueries = new Map<string, { count: number; totalTime: number }>();
    
    this.accessLog.filter(access => access.type === 'miss').forEach(access => {
      const existing = missQueries.get(access.key) || { count: 0, totalTime: 0 };
      existing.count++;
      existing.totalTime += access.responseTime;
      missQueries.set(access.key, existing);
    });
    
    return Array.from(missQueries.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([key, stats]) => ({
        key,
        missCount: stats.count,
        avgComputeTime: stats.totalTime / stats.count,
        lastMiss: new Date(),
      }));
  }

  private calculateCachingScore(analysis: QueryAnalysis): number {
    let score = 0;
    
    // 基于查询复杂度
    if (analysis.complexity.score > 50) {
      score += 0.3;
    }
    
    // 基于资源使用
    if (analysis.resourceUsage.estimatedMemory > 512) {
      score += 0.2;
    }
    
    // 基于查询类型
    if (analysis.patterns[0]?.type === 'SELECT') {
      score += 0.3;
    }
    
    // 基于数据新鲜度需求
    if (!analysis.tags.includes('real_time')) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  private normalizeQuery(query: string): string {
    return query.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private hashString(str: string): string {
    // 简化的哈希函数
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return hash.toString();
  }

  private recordAccess(key: string, type: 'hit' | 'miss'): void {
    this.accessLog.push({
      key,
      type,
      timestamp: Date.now(),
      responseTime: 0, // 需要外部提供
    });
    
    // 保持最近1000条记录
    if (this.accessLog.length > 1000) {
      this.accessLog.shift();
    }
  }

  private recordQueryPattern(key: string, options: CacheOptions): void {
    const pattern = this.queryPatterns.get(key) || {
      key,
      accessCount: 0,
      lastAccess: 0,
      ttl: options.ttl || this.configuration.defaultTtl,
      tags: options.tags || [],
    };
    
    pattern.accessCount++;
    pattern.lastAccess = Date.now();
    
    this.queryPatterns.set(key, pattern);
  }

  private adjustCacheStrategy(pattern: QueryPattern): void {
    // 根据访问模式调整缓存策略
    if (pattern.accessCount > 10) {
      // 频繁访问的查询增加TTL
      pattern.ttl = Math.min(pattern.ttl * 1.2, this.configuration.defaultTtl * 3);
    }
  }

  private calculateFreshnessScore(entry: CacheEntry): number {
    const age = Date.now() - entry.timestamp;
    const normalizedAge = age / entry.ttl;
    return Math.max(0, 1 - normalizedAge);
  }

  private calculatePopularityScore(entry: CacheEntry): number {
    const recentHits = entry.hitCount;
    const timeSinceLastHit = Date.now() - entry.lastHit;
    const recency = Math.exp(-timeSinceLastHit / (24 * 60 * 60 * 1000)); // 24小时衰减
    
    return recentHits * recency;
  }

  private calculateAdaptiveScore(entry: CacheEntry): number {
    return (
      entry.metadata.freshnessScore * 0.4 +
      entry.metadata.popularityScore * 0.4 +
      (1 - entry.metadata.computationCost / 100) * 0.2
    );
  }

  private compressValue(value: any): any {
    // 简化的压缩实现
    return value;
  }
}

interface QueryPattern {
  key: string;
  accessCount: number;
  lastAccess: number;
  ttl: number;
  tags: string[];
}

interface CacheAccess {
  key: string;
  type: 'hit' | 'miss';
  timestamp: number;
  responseTime: number;
}

export default IntelligentCache;