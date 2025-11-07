/**
 * 语言资源管理器
 * 提供高级的资源管理功能，包括完整性检查、热更新、版本管理等
 */

import { TranslationLoader, type LanguageResource, type ResourceIntegrityInfo, type LoaderStats } from './translation-loader';
import { SmartPreloader, type PreloadResult } from './preloader';
import type { LoaderConfig, LanguageInfo } from './types';
import logger from '@/utils/logger';

export interface ResourceVersion {
  language: string;
  version: string;
  timestamp: number;
  checksum: string;
}

export interface ResourceUpdateInfo {
  language: string;
  hasUpdate: boolean;
  currentVersion?: string;
  latestVersion?: string;
  updateSize?: number;
}

export interface ResourceManagerConfig extends LoaderConfig {
  enableVersioning: boolean;
  enableIntegrityCheck: boolean;
  enableHotReload: boolean;
  updateCheckInterval: number;
}

export class ResourceManager {
  private loader: TranslationLoader;
  private preloader: SmartPreloader;
  private config: ResourceManagerConfig;
  private versions: Map<string, ResourceVersion> = new Map();
  private updateCheckTimer?: NodeJS.Timeout;
  private integrityCheckTimer?: NodeJS.Timeout;

  constructor(config: ResourceManagerConfig) {
    this.config = config;
    this.loader = new TranslationLoader(config);
    this.preloader = new SmartPreloader({
      enableSmartPreload: true,
      maxConcurrentLoads: 2,
      preloadDelay: 1000,
    });
    
    if (config.enableHotReload) {
      this.enableHotReload();
    }
    
    if (config.enableIntegrityCheck) {
      this.startIntegrityChecks();
    }
  }

  /**
   * 初始化资源管理器
   */
  async initialize(): Promise<void> {
    try {
      // 加载版本信息
      if (this.config.enableVersioning) {
        await this.loadVersionInfo();
      }
      
      // 设置参考键集合
      await this.setupReferenceKeys();
      
      logger.info('Resource manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize resource manager:', error);
      throw error;
    }
  }

  /**
   * 加载语言资源
   */
  async loadLanguage(language: string): Promise<LanguageResource> {
    return this.loader.loadLanguage(language);
  }

  /**
   * 预加载多个语言
   */
  async preloadLanguages(languages: string[]): Promise<void> {
    return this.loader.preloadLanguages(languages);
  }

  /**
   * 智能预加载语言资源
   */
  async smartPreload(
    availableLanguages: string[],
    currentLanguage: string
  ): Promise<PreloadResult[]> {
    logger.info(`🧠 [ResourceManager] Starting smart preload`);
    
    return this.preloader.startPreloading(
      availableLanguages,
      currentLanguage,
      (lang) => this.loadLanguage(lang)
    );
  }

  /**
   * 记录语言使用（用于智能预加载）
   */
  recordLanguageUsage(language: string): void {
    this.preloader.recordLanguageUsage(language);
  }

  /**
   * 获取预加载器状态
   */
  getPreloaderStatus() {
    return this.preloader.getStatus();
  }

  /**
   * 检查资源更新
   */
  async checkForUpdates(languages: string[]): Promise<ResourceUpdateInfo[]> {
    const updateInfos: ResourceUpdateInfo[] = [];
    
    for (const language of languages) {
      try {
        const currentVersion = this.versions.get(language);
        const latestVersion = await this.fetchLatestVersion(language);
        
        const hasUpdate = !currentVersion || 
          currentVersion.version !== latestVersion.version ||
          currentVersion.checksum !== latestVersion.checksum;
        
        updateInfos.push({
          language,
          hasUpdate,
          currentVersion: currentVersion?.version,
          latestVersion: latestVersion.version,
          updateSize: hasUpdate ? await this.calculateUpdateSize(language) : 0,
        });
      } catch (error) {
        logger.error(`Failed to check updates for ${language}:`, error);
        updateInfos.push({
          language,
          hasUpdate: false,
        });
      }
    }
    
    return updateInfos;
  }

  /**
   * 更新语言资源
   */
  async updateLanguage(language: string): Promise<boolean> {
    try {
      // 清除缓存
      this.loader.clearLanguageCache(language);
      
      // 重新加载资源
      const resource = await this.loader.loadLanguage(language);
      
      // 更新版本信息
      if (this.config.enableVersioning) {
        const newVersion = await this.fetchLatestVersion(language);
        this.versions.set(language, newVersion);
        await this.saveVersionInfo();
      }
      
      logger.info(`Language ${language} updated successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to update language ${language}:`, error);
      return false;
    }
  }

  /**
   * 批量更新所有语言
   */
  async updateAllLanguages(): Promise<{ [language: string]: boolean }> {
    const languages = ['zh-CN', 'en-US'];
    const results: { [language: string]: boolean } = {};
    
    for (const language of languages) {
      results[language] = await this.updateLanguage(language);
    }
    
    return results;
  }

  /**
   * 检查资源完整性
   */
  async checkIntegrity(language?: string): Promise<ResourceIntegrityInfo[]> {
    if (language) {
      const namespaces = ['common', 'navigation', 'connections', 'query', 'settings', 'errors', 'visualization', 'dateTime', 'menu', 'logs', 'tests', 'utils', 'data'];
      const results: ResourceIntegrityInfo[] = [];

      for (const namespace of namespaces) {
        const info = await this.loader.checkResourceIntegrity(language, namespace);
        results.push(info);
      }

      return results;
    } else {
      return this.loader.checkAllResourceIntegrity();
    }
  }

  /**
   * 获取资源统计信息
   */
  getStats(): LoaderStats {
    return this.loader.getLoaderStats();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.loader.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.loader.clearCache();
  }

  /**
   * 启用热重载
   */
  private enableHotReload(): void {
    this.loader.enableHotReload();
    
    // 监听热更新事件
    const languages = ['zh-CN', 'en-US'];
    languages.forEach(language => {
      this.loader.onHotUpdate(language, (resource) => {
        logger.info(`Hot reload triggered for ${language}`);
        // 触发自定义事件
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('i18n-hot-reload', {
            detail: { language, resource }
          }));
        }
      });
    });
  }

  /**
   * 开始定期完整性检查
   */
  private startIntegrityChecks(): void {
    // 每小时检查一次完整性
    this.integrityCheckTimer = setInterval(async () => {
      try {
        const results = await this.checkIntegrity();
        const issues = results.filter(r => !r.isComplete || r.missingKeys.length > 0);
        
        if (issues.length > 0) {
          logger.warn('Resource integrity issues found:', issues);
          
          // 触发完整性问题事件
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('i18n-integrity-issues', {
              detail: { issues }
            }));
          }
        }
      } catch (error) {
        logger.error('Integrity check failed:', error);
      }
    }, 3600000); // 1小时
  }

  /**
   * 设置参考键集合
   */
  private async setupReferenceKeys(): Promise<void> {
    try {
      // 使用中文资源作为参考标准
      const referenceResource = await this.loader.loadLanguage('zh-CN');
      const keys = this.extractAllKeys(referenceResource);
      this.loader.setReferenceKeys(Array.from(keys));
    } catch (error) {
      logger.warn('Failed to setup reference keys:', error);
    }
  }

  /**
   * 提取所有键
   */
  private extractAllKeys(resource: LanguageResource, prefix = ''): Set<string> {
    const keys = new Set<string>();
    
    for (const [key, value] of Object.entries(resource)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'string') {
        keys.add(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        const nestedKeys = this.extractAllKeys(value as LanguageResource, fullKey);
        for (const nestedKey of nestedKeys) {
          keys.add(nestedKey);
        }
      }
    }
    
    return keys;
  }

  /**
   * 加载版本信息
   */
  private async loadVersionInfo(): Promise<void> {
    try {
      const response = await fetch(`${this.config.resourcePath}/versions.json`);
      if (response.ok) {
        const versions = await response.json();
        for (const [language, versionInfo] of Object.entries(versions)) {
          this.versions.set(language, versionInfo as ResourceVersion);
        }
      }
    } catch (error) {
      logger.warn('Failed to load version info:', error);
    }
  }

  /**
   * 保存版本信息
   */
  private async saveVersionInfo(): Promise<void> {
    try {
      const versions = Object.fromEntries(this.versions);
      
      // 在 Tauri 环境下保存到本地文件
      if (typeof window !== 'undefined' && (window as any).__TAURI__) {
        // Tauri 2.0+ API
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const { appDataDir, join } = await import('@tauri-apps/api/path');
        
        const appDataPath = await appDataDir();
        const filePath = await join(appDataPath, 'i18n-versions.json');
        await writeTextFile(filePath, JSON.stringify(versions, null, 2));
      } else {
        // 在浏览器环境下保存到 localStorage
        localStorage.setItem('i18n-versions', JSON.stringify(versions));
      }
    } catch (error) {
      logger.warn('Failed to save version info:', error);
    }
  }

  /**
   * 获取最新版本信息
   */
  private async fetchLatestVersion(language: string): Promise<ResourceVersion> {
    // 这里应该从服务器获取最新版本信息
    // 目前返回模拟数据
    return {
      language,
      version: '1.0.0',
      timestamp: Date.now(),
      checksum: 'mock-checksum',
    };
  }

  /**
   * 计算更新大小
   */
  private async calculateUpdateSize(language: string): Promise<number> {
    try {
      const resource = await this.loader.loadLanguage(language);
      const jsonString = JSON.stringify(resource);
      return new Blob([jsonString]).size;
    } catch (error) {
      logger.warn(`Failed to calculate update size for ${language}:`, error);
      return 0;
    }
  }

  /**
   * 销毁资源管理器
   */
  destroy(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }
    
    if (this.integrityCheckTimer) {
      clearInterval(this.integrityCheckTimer);
    }
    
    this.loader.clearCache();
  }
}