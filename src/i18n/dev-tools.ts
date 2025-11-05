/**
 * 开发工具
 * 提供开发模式下的调试工具和警告提示
 */

import { errorHandler } from './error-handler';
import { fallbackManager } from './fallback-manager';
import { performanceMonitor } from './performance-monitor';

export interface DevToolsConfig {
  enabled: boolean;
  showMissingKeys: boolean;
  showPerformanceWarnings: boolean;
  highlightMissingTranslations: boolean;
  logTranslationCalls: boolean;
}

/**
 * 开发工具类
 */
export class DevTools {
  private config: DevToolsConfig;
  private translationCallCount = 0;
  private translationCallLog: Array<{
    key: string;
    language: string;
    timestamp: number;
  }> = [];

  constructor(config: Partial<DevToolsConfig> = {}) {
    this.config = {
      enabled: config.enabled !== false && process.env.NODE_ENV === 'development',
      showMissingKeys: config.showMissingKeys !== false,
      showPerformanceWarnings: config.showPerformanceWarnings !== false,
      highlightMissingTranslations: config.highlightMissingTranslations !== false,
      logTranslationCalls: config.logTranslationCalls || false,
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  /**
   * 初始化开发工具
   */
  private initialize(): void {
    if (typeof window === 'undefined') return;

    // 将开发工具挂载到 window 对象
    (window as any).__I18N_DEV_TOOLS__ = {
      getErrorHistory: () => errorHandler.getErrorHistory(),
      getErrorStats: () => errorHandler.getErrorStats(),
      getMissingKeys: () => fallbackManager.getMissingKeys(),
      getMissingKeysByLanguage: (lang: string) => fallbackManager.getMissingKeysByLanguage(lang),
      getPerformanceMetrics: () => performanceMonitor.getMetrics(),
      getPerformanceReport: () => performanceMonitor.getDetailedReport(),
      exportMissingKeysReport: () => fallbackManager.exportMissingKeysReport(),
      exportPerformanceData: () => performanceMonitor.export(),
      clearErrors: () => errorHandler.clearHistory(),
      clearMissingKeys: () => fallbackManager.clearMissingKeys(),
      getTranslationCallCount: () => this.translationCallCount,
      getTranslationCallLog: () => this.translationCallLog,
      showDashboard: () => this.showDashboard(),
    };

    console.log(
      '%c🛠️ I18n Dev Tools Enabled',
      'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;',
      '\nAccess via: window.__I18N_DEV_TOOLS__'
    );

    // 定期显示统计信息
    if (this.config.showPerformanceWarnings) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * 记录翻译调用
   */
  logTranslationCall(key: string, language: string): void {
    if (!this.config.enabled || !this.config.logTranslationCalls) return;

    this.translationCallCount++;
    this.translationCallLog.push({
      key,
      language,
      timestamp: Date.now(),
    });

    // 限制日志大小
    if (this.translationCallLog.length > 1000) {
      this.translationCallLog.shift();
    }
  }

  /**
   * 显示开发者仪表板
   */
  showDashboard(): void {
    if (!this.config.enabled) return;

    console.clear();
    console.log(
      '%c📊 I18n Development Dashboard',
      'background: #2196F3; color: white; padding: 8px 16px; border-radius: 4px; font-size: 16px; font-weight: bold;'
    );

    // 错误统计
    const errorStats = errorHandler.getErrorStats();
    console.group('❌ Error Statistics');
    console.log('Total Errors:', errorStats.total);
    console.log('Recent Errors (5min):', errorStats.recentCount);
    console.table(errorStats.byType);
    console.groupEnd();

    // 缺失键统计
    const missingStats = fallbackManager.getStats();
    console.group('🔑 Missing Keys Statistics');
    console.log('Total Missing Keys:', missingStats.totalMissingKeys);
    console.log('Unique Keys:', missingStats.uniqueKeys);
    console.table(missingStats.byLanguage);
    if (missingStats.mostFrequent) {
      console.log('Most Frequent Missing Key:', missingStats.mostFrequent);
    }
    console.groupEnd();

    // 性能指标
    const perfMetrics = performanceMonitor.getMetrics();
    console.group('⚡ Performance Metrics');
    console.log('Average Load Time:', perfMetrics.averageLoadTime.toFixed(2), 'ms');
    console.log('Cache Hit Rate:', (perfMetrics.cacheHitRate * 100).toFixed(1), '%');
    console.log('Average Switch Time:', perfMetrics.averageSwitchTime.toFixed(2), 'ms');
    console.log('Preload Success Rate:', (perfMetrics.preloadSuccessRate * 100).toFixed(1), '%');
    console.groupEnd();

    // 翻译调用统计
    console.group('📞 Translation Calls');
    console.log('Total Calls:', this.translationCallCount);
    console.log('Recent Calls:', this.translationCallLog.slice(-10));
    console.groupEnd();

    // 性能建议
    const recommendations = performanceMonitor.getRecommendations();
    if (recommendations.length > 0) {
      console.group('💡 Recommendations');
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
      console.groupEnd();
    }

    // Top 缺失键
    const topMissing = fallbackManager.getTopMissingKeys(10);
    if (topMissing.length > 0) {
      console.group('🔝 Top Missing Keys');
      console.table(
        topMissing.map((k) => ({
          Key: k.key,
          Language: k.language,
          Count: k.count,
          Namespace: k.namespace || 'common',
        }))
      );
      console.groupEnd();
    }

    console.log(
      '%cUse window.__I18N_DEV_TOOLS__ for more commands',
      'color: #666; font-style: italic;'
    );
  }

  /**
   * 开始性能监控
   */
  private startPerformanceMonitoring(): void {
    // 每分钟检查一次性能
    setInterval(() => {
      const metrics = performanceMonitor.getMetrics();

      // 检查缓存命中率
      if (metrics.cacheHitRate < 0.7 && metrics.totalLoads > 10) {
        console.warn(
          '%c⚠️ Low Cache Hit Rate',
          'background: #ff9800; color: white; padding: 4px 8px; border-radius: 3px;',
          `\nCurrent: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
          '\nConsider increasing cache size or enabling preloading'
        );
      }

      // 检查加载时间
      if (metrics.averageLoadTime > 500 && metrics.totalLoads > 5) {
        console.warn(
          '%c⚠️ Slow Load Times',
          'background: #ff9800; color: white; padding: 4px 8px; border-radius: 3px;',
          `\nAverage: ${metrics.averageLoadTime.toFixed(0)}ms`,
          '\nConsider enabling preloading or checking network connection'
        );
      }

      // 检查缺失键
      const missingStats = fallbackManager.getStats();
      if (missingStats.totalMissingKeys > 20) {
        console.warn(
          '%c⚠️ Many Missing Keys',
          'background: #ff9800; color: white; padding: 4px 8px; border-radius: 3px;',
          `\nTotal: ${missingStats.totalMissingKeys}`,
          '\nRun window.__I18N_DEV_TOOLS__.exportMissingKeysReport() to see details'
        );
      }
    }, 60000); // 每分钟
  }

  /**
   * 高亮缺失的翻译
   */
  highlightMissingTranslation(element: HTMLElement, key: string): void {
    if (!this.config.enabled || !this.config.highlightMissingTranslations) return;

    element.style.backgroundColor = '#ffeb3b';
    element.style.border = '2px dashed #ff5722';
    element.style.padding = '2px 4px';
    element.title = `Missing translation: ${key}`;
  }

  /**
   * 显示翻译键提示
   */
  showTranslationKeyTooltip(element: HTMLElement, key: string, language: string): void {
    if (!this.config.enabled) return;

    element.title = `Key: ${key}\nLanguage: ${language}`;
    element.dataset.i18nKey = key;
    element.dataset.i18nLanguage = language;
  }

  /**
   * 生成调试报告
   */
  generateDebugReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      errors: {
        stats: errorHandler.getErrorStats(),
        recent: errorHandler.getRecentErrors(20),
      },
      missingKeys: {
        stats: fallbackManager.getStats(),
        top: fallbackManager.getTopMissingKeys(20),
      },
      performance: {
        metrics: performanceMonitor.getMetrics(),
        recommendations: performanceMonitor.getRecommendations(),
      },
      translationCalls: {
        total: this.translationCallCount,
        recent: this.translationCallLog.slice(-50),
      },
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 启用/禁用开发工具
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled) {
      this.initialize();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<DevToolsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局开发工具实例
export const devTools = new DevTools({
  enabled: process.env.NODE_ENV === 'development',
  showMissingKeys: true,
  showPerformanceWarnings: true,
  highlightMissingTranslations: true,
  logTranslationCalls: false,
});

// 导出便捷函数
export const showI18nDashboard = () => devTools.showDashboard();
export const generateI18nReport = () => devTools.generateDebugReport();
