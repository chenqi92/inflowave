/**
 * 性能监控器
 * 监控和分析 i18n 系统的性能指标
 */

export interface PerformanceMetrics {
  // 加载性能
  averageLoadTime: number;
  minLoadTime: number;
  maxLoadTime: number;
  totalLoads: number;
  
  // 缓存性能
  cacheHitRate: number;
  cacheSize: number;
  cacheMemoryUsage: number;
  
  // 预加载性能
  preloadSuccessRate: number;
  preloadedLanguages: number;
  
  // 语言切换性能
  averageSwitchTime: number;
  totalSwitches: number;
  
  // 时间戳
  lastUpdated: number;
}

export interface PerformanceEvent {
  type: 'load' | 'switch' | 'cache-hit' | 'cache-miss' | 'preload';
  language?: string;
  duration: number;
  timestamp: number;
  success: boolean;
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private events: PerformanceEvent[] = [];
  private maxEvents: number = 1000;
  private enabled: boolean = true;

  /**
   * 记录性能事件
   */
  recordEvent(event: Omit<PerformanceEvent, 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEvent: PerformanceEvent = {
      ...event,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // 限制事件数量
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * 记录加载事件
   */
  recordLoad(language: string, duration: number, success: boolean): void {
    this.recordEvent({
      type: 'load',
      language,
      duration,
      success,
    });
  }

  /**
   * 记录语言切换事件
   */
  recordSwitch(language: string, duration: number, success: boolean): void {
    this.recordEvent({
      type: 'switch',
      language,
      duration,
      success,
    });
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(language: string): void {
    this.recordEvent({
      type: 'cache-hit',
      language,
      duration: 0,
      success: true,
    });
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(language: string): void {
    this.recordEvent({
      type: 'cache-miss',
      language,
      duration: 0,
      success: false,
    });
  }

  /**
   * 记录预加载事件
   */
  recordPreload(language: string, duration: number, success: boolean): void {
    this.recordEvent({
      type: 'preload',
      language,
      duration,
      success,
    });
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    const loadEvents = this.events.filter(e => e.type === 'load');
    const switchEvents = this.events.filter(e => e.type === 'switch');
    const cacheHitEvents = this.events.filter(e => e.type === 'cache-hit');
    const cacheMissEvents = this.events.filter(e => e.type === 'cache-miss');
    const preloadEvents = this.events.filter(e => e.type === 'preload');

    // 计算加载性能
    const loadTimes = loadEvents.map(e => e.duration);
    const averageLoadTime = loadTimes.length > 0
      ? loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length
      : 0;
    const minLoadTime = loadTimes.length > 0 ? Math.min(...loadTimes) : 0;
    const maxLoadTime = loadTimes.length > 0 ? Math.max(...loadTimes) : 0;

    // 计算缓存性能
    const totalCacheRequests = cacheHitEvents.length + cacheMissEvents.length;
    const cacheHitRate = totalCacheRequests > 0
      ? cacheHitEvents.length / totalCacheRequests
      : 0;

    // 计算预加载性能
    const successfulPreloads = preloadEvents.filter(e => e.success).length;
    const preloadSuccessRate = preloadEvents.length > 0
      ? successfulPreloads / preloadEvents.length
      : 0;

    // 计算语言切换性能
    const switchTimes = switchEvents.map(e => e.duration);
    const averageSwitchTime = switchTimes.length > 0
      ? switchTimes.reduce((sum, t) => sum + t, 0) / switchTimes.length
      : 0;

    return {
      averageLoadTime,
      minLoadTime,
      maxLoadTime,
      totalLoads: loadEvents.length,
      cacheHitRate,
      cacheSize: 0, // 将由外部提供
      cacheMemoryUsage: 0, // 将由外部提供
      preloadSuccessRate,
      preloadedLanguages: new Set(preloadEvents.filter(e => e.success).map(e => e.language)).size,
      averageSwitchTime,
      totalSwitches: switchEvents.length,
      lastUpdated: Date.now(),
    };
  }

  /**
   * 获取详细报告
   */
  getDetailedReport(): {
    metrics: PerformanceMetrics;
    recentEvents: PerformanceEvent[];
    languageStats: Record<string, {
      loads: number;
      averageLoadTime: number;
      cacheHits: number;
      cacheMisses: number;
    }>;
  } {
    const metrics = this.getMetrics();
    const recentEvents = this.events.slice(-50); // 最近50个事件

    // 按语言统计
    const languageStats: Record<string, {
      loads: number;
      averageLoadTime: number;
      cacheHits: number;
      cacheMisses: number;
    }> = {};

    for (const event of this.events) {
      if (!event.language) continue;

      if (!languageStats[event.language]) {
        languageStats[event.language] = {
          loads: 0,
          averageLoadTime: 0,
          cacheHits: 0,
          cacheMisses: 0,
        };
      }

      const stats = languageStats[event.language];

      if (event.type === 'load') {
        stats.loads++;
        stats.averageLoadTime = 
          (stats.averageLoadTime * (stats.loads - 1) + event.duration) / stats.loads;
      } else if (event.type === 'cache-hit') {
        stats.cacheHits++;
      } else if (event.type === 'cache-miss') {
        stats.cacheMisses++;
      }
    }

    return {
      metrics,
      recentEvents,
      languageStats,
    };
  }

  /**
   * 清除所有事件
   */
  clear(): void {
    this.events = [];
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 导出性能数据
   */
  export(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      events: this.events,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * 获取性能建议
   */
  getRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    // 检查缓存命中率
    if (metrics.cacheHitRate < 0.7) {
      recommendations.push(
        `缓存命中率较低 (${(metrics.cacheHitRate * 100).toFixed(1)}%)，建议增加缓存大小或启用预加载`
      );
    }

    // 检查平均加载时间
    if (metrics.averageLoadTime > 500) {
      recommendations.push(
        `平均加载时间较长 (${metrics.averageLoadTime.toFixed(0)}ms)，建议启用预加载或优化网络连接`
      );
    }

    // 检查语言切换时间
    if (metrics.averageSwitchTime > 500) {
      recommendations.push(
        `语言切换时间较长 (${metrics.averageSwitchTime.toFixed(0)}ms)，建议预加载常用语言`
      );
    }

    // 检查预加载成功率
    if (metrics.preloadSuccessRate < 0.9 && metrics.preloadedLanguages > 0) {
      recommendations.push(
        `预加载成功率较低 (${(metrics.preloadSuccessRate * 100).toFixed(1)}%)，请检查网络连接或资源文件`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('性能表现良好，无需优化');
    }

    return recommendations;
  }
}

// 创建全局性能监控器实例
export const performanceMonitor = new PerformanceMonitor();
