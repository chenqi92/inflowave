/**
 * 智能预加载器
 * 基于用户行为和系统状态智能预加载语言资源
 */

import type { LanguageResource } from './translation-loader';
import { performanceMonitor } from './performance-monitor';

export interface PreloadStrategy {
  name: string;
  priority: number;
  shouldPreload: (language: string, context: PreloadContext) => boolean;
}

export interface PreloadContext {
  currentLanguage: string;
  systemLanguage: string;
  browserLanguages: string[];
  recentLanguages: string[];
  userPreferences: string[];
  networkSpeed: 'slow' | 'medium' | 'fast';
  deviceMemory: number;
}

export interface PreloadConfig {
  enableSmartPreload: boolean;
  maxConcurrentLoads: number;
  preloadDelay: number;
  strategies: PreloadStrategy[];
}

export interface PreloadResult {
  language: string;
  success: boolean;
  loadTime: number;
  error?: Error;
}

/**
 * 智能预加载器
 */
export class SmartPreloader {
  private config: PreloadConfig;
  private loadQueue: string[] = [];
  private loading: Set<string> = new Set();
  private loaded: Set<string> = new Set();
  private recentLanguages: string[] = [];
  private preloadTimer?: NodeJS.Timeout;

  constructor(config: Partial<PreloadConfig> = {}) {
    this.config = {
      enableSmartPreload: config.enableSmartPreload !== false,
      maxConcurrentLoads: config.maxConcurrentLoads || 2,
      preloadDelay: config.preloadDelay || 1000, // 1秒延迟
      strategies: config.strategies || this.getDefaultStrategies(),
    };
  }

  /**
   * 开始智能预加载
   */
  async startPreloading(
    availableLanguages: string[],
    currentLanguage: string,
    loader: (language: string) => Promise<LanguageResource>
  ): Promise<PreloadResult[]> {
    if (!this.config.enableSmartPreload) {
      return [];
    }

    const context = this.buildPreloadContext(currentLanguage);
    const languagesToPreload = this.selectLanguagesToPreload(
      availableLanguages,
      currentLanguage,
      context
    );

    console.log(`🚀 [Preloader] Starting smart preload for languages:`, languagesToPreload);

    // 延迟预加载，避免影响首次加载性能
    await this.delay(this.config.preloadDelay);

    return this.preloadLanguages(languagesToPreload, loader);
  }

  /**
   * 预加载指定语言列表
   */
  async preloadLanguages(
    languages: string[],
    loader: (language: string) => Promise<LanguageResource>
  ): Promise<PreloadResult[]> {
    const results: PreloadResult[] = [];
    
    // 过滤已加载的语言
    const toLoad = languages.filter(lang => 
      !this.loaded.has(lang) && !this.loading.has(lang)
    );

    // 添加到队列
    this.loadQueue.push(...toLoad);

    // 并发加载
    while (this.loadQueue.length > 0) {
      const batch = this.loadQueue.splice(0, this.config.maxConcurrentLoads);
      const batchResults = await Promise.all(
        batch.map(lang => this.loadLanguage(lang, loader))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 预加载单个语言
   */
  private async loadLanguage(
    language: string,
    loader: (language: string) => Promise<LanguageResource>
  ): Promise<PreloadResult> {
    const startTime = Date.now();
    this.loading.add(language);

    try {
      await loader(language);
      this.loaded.add(language);
      this.loading.delete(language);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [Preloader] Preloaded ${language} in ${loadTime}ms`);

      // 记录预加载性能
      performanceMonitor.recordPreload(language, loadTime, true);

      return {
        language,
        success: true,
        loadTime,
      };
    } catch (error) {
      this.loading.delete(language);
      const loadTime = Date.now() - startTime;
      console.warn(`❌ [Preloader] Failed to preload ${language}:`, error);

      // 记录预加载失败
      performanceMonitor.recordPreload(language, loadTime, false);

      return {
        language,
        success: false,
        loadTime,
        error: error as Error,
      };
    }
  }

  /**
   * 选择要预加载的语言
   */
  private selectLanguagesToPreload(
    availableLanguages: string[],
    currentLanguage: string,
    context: PreloadContext
  ): string[] {
    const scores = new Map<string, number>();

    // 为每个语言计算预加载优先级分数
    for (const language of availableLanguages) {
      if (language === currentLanguage) {
        continue; // 跳过当前语言
      }

      let score = 0;

      // 应用所有策略
      for (const strategy of this.config.strategies) {
        if (strategy.shouldPreload(language, context)) {
          score += strategy.priority;
        }
      }

      if (score > 0) {
        scores.set(language, score);
      }
    }

    // 按分数排序并返回
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([language]) => language);
  }

  /**
   * 构建预加载上下文
   */
  private buildPreloadContext(currentLanguage: string): PreloadContext {
    const systemLanguage = this.detectSystemLanguage();
    const browserLanguages = this.detectBrowserLanguages();
    const userPreferences = this.loadUserPreferences();
    const networkSpeed = this.detectNetworkSpeed();
    const deviceMemory = this.detectDeviceMemory();

    return {
      currentLanguage,
      systemLanguage,
      browserLanguages,
      recentLanguages: this.recentLanguages,
      userPreferences,
      networkSpeed,
      deviceMemory,
    };
  }

  /**
   * 获取默认预加载策略
   */
  private getDefaultStrategies(): PreloadStrategy[] {
    return [
      // 策略1: 系统语言优先
      {
        name: 'system-language',
        priority: 10,
        shouldPreload: (language, context) => {
          return language === context.systemLanguage;
        },
      },

      // 策略2: 浏览器首选语言
      {
        name: 'browser-language',
        priority: 8,
        shouldPreload: (language, context) => {
          return context.browserLanguages.includes(language);
        },
      },

      // 策略3: 最近使用的语言
      {
        name: 'recent-language',
        priority: 9,
        shouldPreload: (language, context) => {
          return context.recentLanguages.includes(language);
        },
      },

      // 策略4: 用户偏好语言
      {
        name: 'user-preference',
        priority: 7,
        shouldPreload: (language, context) => {
          return context.userPreferences.includes(language);
        },
      },

      // 策略5: 常用语言对（中英互换）
      {
        name: 'language-pair',
        priority: 6,
        shouldPreload: (language, context) => {
          const pairs: Record<string, string> = {
            'zh-CN': 'en-US',
            'en-US': 'zh-CN',
          };
          return pairs[context.currentLanguage] === language;
        },
      },

      // 策略6: 网络和设备条件良好时预加载所有
      {
        name: 'good-conditions',
        priority: 3,
        shouldPreload: (language, context) => {
          return context.networkSpeed === 'fast' && context.deviceMemory > 4;
        },
      },
    ];
  }

  /**
   * 检测系统语言
   */
  private detectSystemLanguage(): string {
    if (typeof navigator === 'undefined') {
      return 'zh-CN';
    }

    const lang = navigator.language || (navigator as any).userLanguage;
    return this.normalizeLanguageCode(lang);
  }

  /**
   * 检测浏览器语言列表
   */
  private detectBrowserLanguages(): string[] {
    if (typeof navigator === 'undefined') {
      return [];
    }

    const languages = navigator.languages || [navigator.language];
    return languages.map(lang => this.normalizeLanguageCode(lang));
  }

  /**
   * 加载用户偏好
   */
  private loadUserPreferences(): string[] {
    try {
      const stored = localStorage.getItem('i18n-user-preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
    return [];
  }

  /**
   * 检测网络速度
   */
  private detectNetworkSpeed(): 'slow' | 'medium' | 'fast' {
    if (typeof navigator === 'undefined' || !(navigator as any).connection) {
      return 'medium';
    }

    const connection = (navigator as any).connection;
    const effectiveType = connection.effectiveType;

    if (effectiveType === '4g') return 'fast';
    if (effectiveType === '3g') return 'medium';
    return 'slow';
  }

  /**
   * 检测设备内存
   */
  private detectDeviceMemory(): number {
    if (typeof navigator === 'undefined' || !(navigator as any).deviceMemory) {
      return 4; // 默认 4GB
    }

    return (navigator as any).deviceMemory;
  }

  /**
   * 标准化语言代码
   */
  private normalizeLanguageCode(code: string): string {
    // 将 'zh' 转换为 'zh-CN', 'en' 转换为 'en-US' 等
    const normalized = code.toLowerCase();
    
    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('en')) return 'en-US';
    
    return code;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 记录语言使用
   */
  recordLanguageUsage(language: string): void {
    // 添加到最近使用列表
    this.recentLanguages = [
      language,
      ...this.recentLanguages.filter(l => l !== language)
    ].slice(0, 5); // 保留最近5个

    // 保存到 localStorage
    try {
      localStorage.setItem('i18n-recent-languages', JSON.stringify(this.recentLanguages));
    } catch (error) {
      console.warn('Failed to save recent languages:', error);
    }
  }

  /**
   * 添加自定义策略
   */
  addStrategy(strategy: PreloadStrategy): void {
    this.config.strategies.push(strategy);
  }

  /**
   * 移除策略
   */
  removeStrategy(name: string): void {
    this.config.strategies = this.config.strategies.filter(s => s.name !== name);
  }

  /**
   * 获取预加载状态
   */
  getStatus() {
    return {
      queueSize: this.loadQueue.length,
      loading: Array.from(this.loading),
      loaded: Array.from(this.loaded),
      recentLanguages: this.recentLanguages,
    };
  }

  /**
   * 清除状态
   */
  clear(): void {
    this.loadQueue = [];
    this.loading.clear();
    this.loaded.clear();
  }
}
