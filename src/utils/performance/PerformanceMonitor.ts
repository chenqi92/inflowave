/**
 * 性能监控工具
 *
 * 监控和分析多数据库系统的性能指标
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  category: 'query' | 'connection' | 'ui' | 'memory';
  metadata?: Record<string, any>;
}

interface PerformanceReport {
  totalMetrics: number;
  averageQueryTime: number;
  averageConnectionTime: number;
  memoryUsage: number;
  slowQueries: PerformanceMetric[];
  recommendations: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // 最多保存 1000 个指标
  private observers: Map<string, (metric: PerformanceMetric) => void> = new Map();

  /**
   * 记录性能指标
   */
  recordMetric(
    name: string,
    value: number,
    category: PerformanceMetric['category'],
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      category,
      metadata,
    };

    this.metrics.push(metric);

    // 限制指标数量
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // 通知观察者
    this.notifyObservers(metric);

    // 记录到控制台（开发模式）
    if (import.meta.env.DEV) {
      console.log(`[Performance] ${name}: ${value}ms`, metadata);
    }
  }

  /**
   * 测量函数执行时间
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    category: PerformanceMetric['category'] = 'query',
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, category, {
        ...metadata,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, category, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  /**
   * 测量同步函数执行时间
   */
  measure<T>(
    name: string,
    fn: () => T,
    category: PerformanceMetric['category'] = 'ui',
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, category, {
        ...metadata,
        success: true,
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(name, duration, category, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }
  }

  /**
   * 获取性能报告
   */
  getReport(): PerformanceReport {
    const queryMetrics = this.metrics.filter(m => m.category === 'query');
    const connectionMetrics = this.metrics.filter(m => m.category === 'connection');
    
    const averageQueryTime = queryMetrics.length > 0
      ? queryMetrics.reduce((sum, m) => sum + m.value, 0) / queryMetrics.length
      : 0;
    
    const averageConnectionTime = connectionMetrics.length > 0
      ? connectionMetrics.reduce((sum, m) => sum + m.value, 0) / connectionMetrics.length
      : 0;

    // 找出慢查询（超过 1 秒）
    const slowQueries = queryMetrics.filter(m => m.value > 1000);

    // 内存使用情况
    const memoryUsage = this.getMemoryUsage();

    // 生成优化建议
    const recommendations = this.generateRecommendations(queryMetrics, connectionMetrics);

    return {
      totalMetrics: this.metrics.length,
      averageQueryTime,
      averageConnectionTime,
      memoryUsage,
      slowQueries,
      recommendations,
    };
  }

  /**
   * 获取指定类别的指标
   */
  getMetricsByCategory(category: PerformanceMetric['category']): PerformanceMetric[] {
    return this.metrics.filter(m => m.category === category);
  }

  /**
   * 获取指定时间范围内的指标
   */
  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * 添加性能观察者
   */
  addObserver(name: string, callback: (metric: PerformanceMetric) => void): void {
    this.observers.set(name, callback);
  }

  /**
   * 移除性能观察者
   */
  removeObserver(name: string): void {
    this.observers.delete(name);
  }

  /**
   * 通知观察者
   */
  private notifyObservers(metric: PerformanceMetric): void {
    this.observers.forEach(callback => {
      try {
        callback(metric);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    queryMetrics: PerformanceMetric[],
    connectionMetrics: PerformanceMetric[]
  ): string[] {
    const recommendations: string[] = [];

    // 查询性能建议
    const slowQueries = queryMetrics.filter(m => m.value > 1000);
    if (slowQueries.length > 0) {
      recommendations.push(
        `发现 ${slowQueries.length} 个慢查询，建议优化查询语句或添加索引`
      );
    }

    const averageQueryTime = queryMetrics.length > 0
      ? queryMetrics.reduce((sum, m) => sum + m.value, 0) / queryMetrics.length
      : 0;
    
    if (averageQueryTime > 500) {
      recommendations.push('平均查询时间较长，建议检查数据库性能和网络连接');
    }

    // 连接性能建议
    const averageConnectionTime = connectionMetrics.length > 0
      ? connectionMetrics.reduce((sum, m) => sum + m.value, 0) / connectionMetrics.length
      : 0;
    
    if (averageConnectionTime > 200) {
      recommendations.push('数据库连接时间较长，建议检查网络延迟或使用连接池');
    }

    // 内存使用建议
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 100) {
      recommendations.push('内存使用量较高，建议清理不必要的数据或优化内存使用');
    }

    // 错误率建议
    const failedQueries = queryMetrics.filter(m => m.metadata?.success === false);
    const errorRate = queryMetrics.length > 0 ? failedQueries.length / queryMetrics.length : 0;
    
    if (errorRate > 0.1) {
      recommendations.push('查询错误率较高，建议检查查询语句和数据库状态');
    }

    if (recommendations.length === 0) {
      recommendations.push('系统性能良好，无需特别优化');
    }

    return recommendations;
  }

  /**
   * 导出性能数据
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      report: this.getReport(),
    }, null, 2);
  }

  /**
   * 导入性能数据
   */
  importMetrics(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.metrics && Array.isArray(parsed.metrics)) {
        this.metrics = parsed.metrics;
      }
    } catch (error) {
      console.error('Failed to import performance metrics:', error);
    }
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

// 性能装饰器
export function measurePerformance(
  name: string,
  category: PerformanceMetric['category'] = 'query'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(
        `${target.constructor.name}.${propertyKey}`,
        () => originalMethod.apply(this, args),
        category,
        { name, args: args.length }
      );
    };

    return descriptor;
  };
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const [report, setReport] = React.useState<PerformanceReport | null>(null);

  React.useEffect(() => {
    const updateReport = () => {
      setReport(performanceMonitor.getReport());
    };

    // 初始更新
    updateReport();

    // 定期更新
    const interval = setInterval(updateReport, 5000);

    // 添加观察者
    performanceMonitor.addObserver('react-hook', updateReport);

    return () => {
      clearInterval(interval);
      performanceMonitor.removeObserver('react-hook');
    };
  }, []);

  return {
    report,
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    clearMetrics: performanceMonitor.clearMetrics.bind(performanceMonitor),
  };
}

export type { PerformanceMetric, PerformanceReport };
