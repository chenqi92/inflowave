/**
 * 翻译资源加载器
 * 负责加载、缓存和管理语言资源文件
 */

import i18next from 'i18next';
import type { LoaderConfig } from './types';
import { CacheManager } from './cache-manager';
import { performanceMonitor } from './performance-monitor';
import { errorHandler } from './error-handler';
import { fallbackManager } from './fallback-manager';
import logger from '@/utils/logger';

export interface LanguageResource {
  [key: string]: string | LanguageResource;
}

export interface ResourceIntegrityInfo {
  language: string;
  namespace: string;
  keyCount: number;
  missingKeys: string[];
  extraKeys: string[];
  isComplete: boolean;
  lastChecked: number;
}

export interface LoaderStats {
  totalLanguages: number;
  totalNamespaces: number;
  cacheHitRate: number;
  averageLoadTime: number;
  failedLoads: number;
  lastError?: string;
}

export class TranslationLoader {
  private config: LoaderConfig;
  private cacheManager: CacheManager<LanguageResource>;
  private loadingPromises: Map<string, Promise<LanguageResource>> = new Map();
  private integrityCache: Map<string, ResourceIntegrityInfo> = new Map();
  private loadStats: Map<string, { loadTime: number; success: boolean }> = new Map();
  private hotUpdateListeners: Map<string, ((resource: LanguageResource) => void)[]> = new Map();
  private referenceKeys: Set<string> = new Set(); // 参考键集合，用于完整性检查

  constructor(config: LoaderConfig) {
    this.config = config;
    
    // 初始化高级缓存管理器
    this.cacheManager = new CacheManager<LanguageResource>({
      maxSize: 20,
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      ttl: config.cacheTimeout,
      enableLRU: true,
    });
  }

  /**
   * 加载语言资源
   */
  async loadLanguage(language: string): Promise<LanguageResource> {
    const cacheKey = language;

    // 检查高级缓存
    if (this.config.enableCaching) {
      const cached = this.cacheManager.get(cacheKey);
      if (cached) {
        logger.debug(`📦 [TranslationLoader] Cache hit for ${language}`);
        performanceMonitor.recordCacheHit(language);

        // 将缓存的资源添加到 i18next
        if (i18next.isInitialized) {
          for (const [namespace, translations] of Object.entries(cached)) {
            i18next.addResourceBundle(language, namespace, translations, true, true);
          }
        }

        return cached;
      } else {
        performanceMonitor.recordCacheMiss(language);
      }
    }

    // 检查是否正在加载
    const existingPromise = this.loadingPromises.get(cacheKey);
    if (existingPromise) {
      logger.info(`⏳ [TranslationLoader] Waiting for ongoing load of ${language}`);
      return existingPromise;
    }

    // 开始加载
    logger.info(`🔄 [TranslationLoader] Loading ${language} from network`);
    const startTime = Date.now();
    const loadPromise = this.loadLanguageResources(language);
    this.loadingPromises.set(cacheKey, loadPromise);

    try {
      const resource = await loadPromise;
      const loadTime = Date.now() - startTime;

      // 记录加载性能
      performanceMonitor.recordLoad(language, loadTime, true);

      // 缓存结果到高级缓存管理器
      if (this.config.enableCaching) {
        this.cacheManager.set(cacheKey, resource);
      }

      // 将资源添加到 i18next
      if (i18next.isInitialized) {
        for (const [namespace, translations] of Object.entries(resource)) {
          i18next.addResourceBundle(language, namespace, translations, true, true);
        }
        logger.debug(`✅ [TranslationLoader] Added resources to i18next for ${language}`);
      }

      return resource;
    } catch (error) {
      const loadTime = Date.now() - startTime;
      performanceMonitor.recordLoad(language, loadTime, false);
      logger.error(`Failed to load language resources for ${language}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * 预加载多个语言
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    const loadPromises = languages.map(lang => 
      this.loadLanguage(lang).catch(error => {
        logger.warn(`Failed to preload language ${lang}:`, error);
        return null;
      })
    );

    await Promise.all(loadPromises);
  }

  /**
   * 获取缓存的资源
   */
  getCachedResource(language: string): LanguageResource | null {
    if (!this.config.enableCaching) {
      return null;
    }

    return this.cacheManager.get(language);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cacheManager.clear();
    this.loadingPromises.clear();
  }

  /**
   * 清除特定语言的缓存
   */
  clearLanguageCache(language: string): void {
    this.cacheManager.delete(language);
  }

  /**
   * 热更新语言资源
   */
  async reloadLanguage(language: string): Promise<LanguageResource> {
    this.clearLanguageCache(language);
    return this.loadLanguage(language);
  }

  /**
   * 加载单个语言的所有命名空间资源
   */
  private async loadLanguageResources(language: string): Promise<LanguageResource> {
    const namespaces = ['common', 'navigation', 'connections', 'query', 'settings', 'errors', 'dateTime', 'menu', 'visualization', 'logs', 'tests', 'utils', 'data'];
    const resources: LanguageResource = {};

    // 并行加载所有命名空间
    const loadPromises = namespaces.map(async (namespace) => {
      try {
        const resource = await this.loadNamespaceResource(language, namespace);
        return { namespace, resource };
      } catch (error) {
        logger.warn(`Failed to load namespace ${namespace} for language ${language}:`, error);
        return { namespace, resource: {} };
      }
    });

    const results = await Promise.all(loadPromises);
    
    // 合并结果
    for (const { namespace, resource } of results) {
      resources[namespace] = resource;
    }

    return resources;
  }

  /**
   * 加载单个命名空间资源
   */
  private async loadNamespaceResource(language: string, namespace: string): Promise<LanguageResource> {
    // 语言代码映射，确保使用正确的文件路径
    const languageMap: Record<string, string> = {
      'zh': 'zh-CN',
      'en': 'en-US',
    };
    const mappedLanguage = languageMap[language] || language;

    const url = `${this.config.resourcePath}/${mappedLanguage}/${namespace}.json`;
    const statsKey = `${language}:${namespace}`;

    logger.debug(`[TranslationLoader] Loading resource: ${url} (original language: ${language})`);

    // 使用错误处理器的重试机制
    return errorHandler.withRetry(
      async () => {
        const startTime = Date.now();

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'default',
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const resource = await response.json();
          
          // 验证资源格式
          const formatErrors = this.validateResourceFormat(resource);
          if (formatErrors.length > 0) {
            logger.warn(`Format issues in ${url}:`, formatErrors);
          }
          
          // 记录成功加载统计
          const loadTime = Date.now() - startTime;
          this.loadStats.set(statsKey, { loadTime, success: true });
          
          // 缓存资源到回退管理器
          fallbackManager.setResourceCache(language, namespace, resource);
          
          return resource;
        } catch (error) {
          // 记录失败加载统计
          const loadTime = Date.now() - startTime;
          this.loadStats.set(statsKey, { loadTime, success: false });
          
          throw error;
        }
      },
      {
        type: 'RESOURCE_LOAD_FAILED',
        language,
        key: `${namespace}`,
      }
    );
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    const cacheStats = this.cacheManager.getStats();
    return {
      size: cacheStats.size,
      maxSize: cacheStats.maxSize,
      languages: this.cacheManager.keys(),
      loadingCount: this.loadingPromises.size,
      hitRate: cacheStats.hitRate,
      hitCount: cacheStats.hitCount,
      missCount: cacheStats.missCount,
      evictionCount: cacheStats.evictionCount,
      totalSize: cacheStats.totalSize,
    };
  }

  /**
   * 获取缓存管理器实例
   */
  getCacheManager(): CacheManager<LanguageResource> {
    return this.cacheManager;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LoaderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果禁用了缓存，清除现有缓存
    if (!this.config.enableCaching) {
      this.clearCache();
    }
  }

  /**
   * 检查语言包完整性
   */
  async checkResourceIntegrity(language: string, namespace: string): Promise<ResourceIntegrityInfo> {
    const cacheKey = `${language}:${namespace}`;
    
    // 检查缓存的完整性信息
    const cached = this.integrityCache.get(cacheKey);
    if (cached && (Date.now() - cached.lastChecked) < 300000) { // 5分钟缓存
      return cached;
    }

    try {
      const resource = await this.loadNamespaceResource(language, namespace);
      const keys = this.extractKeys(resource);
      
      // 与参考键集合比较（如果有的话）
      const missingKeys: string[] = [];
      const extraKeys: string[] = [];
      
      if (this.referenceKeys.size > 0) {
        // 检查缺失的键
        for (const refKey of this.referenceKeys) {
          if (!keys.has(refKey)) {
            missingKeys.push(refKey);
          }
        }
        
        // 检查多余的键
        for (const key of keys) {
          if (!this.referenceKeys.has(key)) {
            extraKeys.push(key);
          }
        }
      }

      const integrityInfo: ResourceIntegrityInfo = {
        language,
        namespace,
        keyCount: keys.size,
        missingKeys,
        extraKeys,
        isComplete: missingKeys.length === 0,
        lastChecked: Date.now(),
      };

      this.integrityCache.set(cacheKey, integrityInfo);
      return integrityInfo;
    } catch (error) {
      logger.error(`Integrity check failed for ${language}:${namespace}:`, error);
      
      const errorInfo: ResourceIntegrityInfo = {
        language,
        namespace,
        keyCount: 0,
        missingKeys: [],
        extraKeys: [],
        isComplete: false,
        lastChecked: Date.now(),
      };
      
      return errorInfo;
    }
  }

  /**
   * 批量检查所有语言包完整性
   */
  async checkAllResourceIntegrity(): Promise<ResourceIntegrityInfo[]> {
    const namespaces = ['common', 'navigation', 'connections', 'query', 'settings', 'errors', 'visualization', 'dateTime', 'menu', 'logs', 'tests', 'utils', 'data'];
    const languages = ['zh-CN', 'en-US'];
    const results: ResourceIntegrityInfo[] = [];

    for (const language of languages) {
      for (const namespace of namespaces) {
        try {
          const info = await this.checkResourceIntegrity(language, namespace);
          results.push(info);
        } catch (error) {
          logger.error(`Failed to check integrity for ${language}:${namespace}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * 设置参考键集合（用于完整性检查）
   */
  setReferenceKeys(keys: string[]): void {
    this.referenceKeys = new Set(keys);
    // 清除完整性缓存，因为参考标准已改变
    this.integrityCache.clear();
  }

  /**
   * 从资源中提取所有键
   */
  private extractKeys(resource: LanguageResource, prefix = ''): Set<string> {
    const keys = new Set<string>();
    
    for (const [key, value] of Object.entries(resource)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        keys.add(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        const nestedKeys = this.extractKeys(value as LanguageResource, fullKey);
        for (const nestedKey of nestedKeys) {
          keys.add(nestedKey);
        }
      }
    }
    
    return keys;
  }

  /**
   * 注册热更新监听器
   */
  onHotUpdate(language: string, callback: (resource: LanguageResource) => void): () => void {
    if (!this.hotUpdateListeners.has(language)) {
      this.hotUpdateListeners.set(language, []);
    }
    
    const listeners = this.hotUpdateListeners.get(language)!;
    listeners.push(callback);
    
    // 返回取消监听的函数
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * 触发热更新事件
   */
  private triggerHotUpdate(language: string, resource: LanguageResource): void {
    const listeners = this.hotUpdateListeners.get(language);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(resource);
        } catch (error) {
          logger.error('Hot update listener error:', error);
        }
      });
    }
  }

  /**
   * 监听资源文件变化（开发模式）
   */
  enableHotReload(): void {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      // Tauri 环境下的文件监听
      this.setupTauriFileWatcher();
    } else {
      // 浏览器环境下的轮询检查
      this.setupPollingWatcher();
    }
  }

  /**
   * 设置 Tauri 文件监听器
   */
  private async setupTauriFileWatcher(): Promise<void> {
    try {
      const { listen } = await import('@tauri-apps/api/event');
      
      listen('file-changed', (event: any) => {
        const { path } = event.payload;
        
        // 检查是否是语言资源文件
        if (path.includes('/locales/') && path.endsWith('.json')) {
          const matches = path.match(/\/locales\/([^\/]+)\/([^\/]+)\.json$/);
          if (matches) {
            const [, language] = matches;
            logger.info(`Language resource changed: ${language}`);
            
            // 重新加载该语言资源
            this.reloadLanguage(language).then(resource => {
              this.triggerHotUpdate(language, resource);
            }).catch(error => {
              logger.error('Hot reload failed:', error);
            });
          }
        }
      });
    } catch (error) {
      logger.warn('Failed to setup Tauri file watcher:', error);
    }
  }

  /**
   * 设置轮询监听器（浏览器环境）
   *
   * 注意：轮询会导致每30秒加载所有翻译资源（26个文件），严重影响性能
   * 已禁用轮询功能，改为仅在手动触发时重新加载
   */
  private setupPollingWatcher(): void {
    logger.info('[TranslationLoader] 🚫 Polling watcher disabled for performance optimization');
    logger.info('[TranslationLoader] 💡 Translation resources will be cached and only reload on manual trigger');

    // 完全禁用轮询功能
    // 原因：
    // 1. 每30秒加载26个翻译文件（13个zh-CN + 13个en-US）会产生大量不必要的网络请求
    // 2. 即使资源没有变化，也会执行完整的加载和比较过程
    // 3. 在生产环境中，翻译资源通常不会频繁变化
    // 4. 如果需要更新翻译，可以通过刷新页面或手动调用 reloadLanguage() 方法

    // 如果将来需要启用热重载，建议使用以下优化方案：
    // 1. 使用 WebSocket 或 Server-Sent Events 进行推送式更新
    // 2. 使用 HEAD 请求检查 ETag 或 Last-Modified，而不是完整加载
    // 3. 增加轮询间隔（例如5分钟或更长）
    // 4. 仅在用户活跃时进行检查

    return;
  }

  /**
   * 获取加载统计信息
   */
  getLoaderStats(): LoaderStats {
    const stats = Array.from(this.loadStats.values());
    const successfulLoads = stats.filter(s => s.success);
    const failedLoads = stats.filter(s => !s.success);
    const cacheStats = this.cacheManager.getStats();
    
    return {
      totalLanguages: new Set(Array.from(this.loadStats.keys()).map(k => k.split(':')[0])).size,
      totalNamespaces: new Set(Array.from(this.loadStats.keys()).map(k => k.split(':')[1])).size,
      cacheHitRate: cacheStats.hitRate,
      averageLoadTime: successfulLoads.length > 0 
        ? successfulLoads.reduce((sum, s) => sum + s.loadTime, 0) / successfulLoads.length 
        : 0,
      failedLoads: failedLoads.length,
      lastError: failedLoads.length > 0 ? 'Check console for details' : undefined,
    };
  }

  /**
   * 验证资源格式
   */
  validateResourceFormat(resource: LanguageResource, path = ''): string[] {
    const errors: string[] = [];
    
    for (const [key, value] of Object.entries(resource)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string') {
        // 检查字符串是否为空
        if (value.trim() === '') {
          errors.push(`Empty translation at ${currentPath}`);
        }
        
        // 检查插值语法
        const interpolationMatches = value.match(/\{\{[^}]+\}\}/g);
        if (interpolationMatches) {
          for (const match of interpolationMatches) {
            if (!match.match(/^\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}$/)) {
              errors.push(`Invalid interpolation syntax at ${currentPath}: ${match}`);
            }
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        errors.push(...this.validateResourceFormat(value as LanguageResource, currentPath));
      } else {
        errors.push(`Invalid value type at ${currentPath}: ${typeof value}`);
      }
    }
    
    return errors;
  }
}