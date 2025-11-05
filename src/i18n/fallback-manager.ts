/**
 * 回退管理器
 * 处理翻译键缺失时的回退策略
 */

import { errorHandler } from './error-handler';

export type FallbackStrategy =
  | 'key' // 显示键名
  | 'empty' // 显示空字符串
  | 'default' // 显示默认值
  | 'language' // 尝试回退语言
  | 'smart'; // 智能回退（组合多种策略）

export interface FallbackConfig {
  strategy: FallbackStrategy;
  fallbackLanguages: string[]; // 回退语言顺序
  showKeyInDev: boolean; // 开发模式下显示键名
  keyPrefix: string; // 键名前缀（用于标识缺失的翻译）
  keySuffix: string; // 键名后缀
  enableWarnings: boolean; // 启用缺失键警告
}

export interface MissingKeyInfo {
  key: string;
  language: string;
  namespace?: string;
  timestamp: number;
  count: number; // 缺失次数
}

/**
 * 回退管理器类
 */
export class FallbackManager {
  private config: FallbackConfig;
  private missingKeys: Map<string, MissingKeyInfo> = new Map();
  private resourceCache: Map<string, Record<string, any>> = new Map();

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      strategy: config.strategy || 'smart',
      fallbackLanguages: config.fallbackLanguages || ['zh-CN', 'en-US'],
      showKeyInDev: config.showKeyInDev !== false && process.env.NODE_ENV === 'development',
      keyPrefix: config.keyPrefix || '[',
      keySuffix: config.keySuffix || ']',
      enableWarnings: config.enableWarnings !== false,
    };
  }

  /**
   * 获取回退翻译
   */
  getFallbackTranslation(
    key: string,
    language: string,
    options?: {
      defaultValue?: string;
      namespace?: string;
      context?: Record<string, any>;
    }
  ): string {
    // 记录缺失的键
    this.recordMissingKey(key, language, options?.namespace);

    // 根据策略返回回退值
    switch (this.config.strategy) {
      case 'key':
        return this.formatKey(key);

      case 'empty':
        return '';

      case 'default':
        return options?.defaultValue || this.formatKey(key);

      case 'language':
        return this.tryFallbackLanguages(key, language, options);

      case 'smart':
      default:
        return this.smartFallback(key, language, options);
    }
  }

  /**
   * 智能回退策略
   */
  private smartFallback(
    key: string,
    language: string,
    options?: {
      defaultValue?: string;
      namespace?: string;
      context?: Record<string, any>;
    }
  ): string {
    // 1. 如果提供了默认值，使用默认值
    if (options?.defaultValue) {
      return options.defaultValue;
    }

    // 2. 尝试回退语言
    const fallbackTranslation = this.tryFallbackLanguages(key, language, options);
    if (fallbackTranslation !== key) {
      return fallbackTranslation;
    }

    // 3. 尝试从键名推断友好的显示文本
    const friendlyText = this.generateFriendlyText(key);
    if (friendlyText !== key) {
      return this.config.showKeyInDev ? this.formatKey(friendlyText) : friendlyText;
    }

    // 4. 最后返回格式化的键名
    return this.formatKey(key);
  }

  /**
   * 尝试回退语言
   */
  private tryFallbackLanguages(
    key: string,
    currentLanguage: string,
    options?: {
      namespace?: string;
      context?: Record<string, any>;
    }
  ): string {
    // 过滤掉当前语言
    const fallbackLangs = this.config.fallbackLanguages.filter((lang) => lang !== currentLanguage);

    for (const fallbackLang of fallbackLangs) {
      const translation = this.getTranslationFromCache(key, fallbackLang, options?.namespace);
      if (translation) {
        // 在开发模式下标记这是回退翻译
        if (this.config.showKeyInDev) {
          return `${translation} (${fallbackLang})`;
        }
        return translation;
      }
    }

    return key;
  }

  /**
   * 从缓存获取翻译
   */
  private getTranslationFromCache(
    key: string,
    language: string,
    namespace?: string
  ): string | null {
    const cacheKey = `${language}:${namespace || 'common'}`;
    const resource = this.resourceCache.get(cacheKey);

    if (!resource) {
      return null;
    }

    // 支持嵌套键（如 "common.button.save"）
    const keys = key.split('.');
    let value: any = resource;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }

    return typeof value === 'string' ? value : null;
  }

  /**
   * 生成友好的文本
   */
  private generateFriendlyText(key: string): string {
    // 移除命名空间前缀（如 "common:"）
    const withoutNamespace = key.includes(':') ? key.split(':')[1] : key;

    // 获取最后一部分（如 "button.save" -> "save"）
    const parts = withoutNamespace.split('.');
    const lastPart = parts[parts.length - 1];

    // 转换为友好格式
    // camelCase -> Camel Case
    // snake_case -> Snake Case
    // kebab-case -> Kebab Case
    const friendly = lastPart
      .replace(/([A-Z])/g, ' $1') // camelCase
      .replace(/[_-]/g, ' ') // snake_case, kebab-case
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return friendly || key;
  }

  /**
   * 格式化键名
   */
  private formatKey(key: string): string {
    return `${this.config.keyPrefix}${key}${this.config.keySuffix}`;
  }

  /**
   * 记录缺失的键
   */
  private recordMissingKey(key: string, language: string, namespace?: string): void {
    const cacheKey = `${language}:${namespace || 'common'}:${key}`;
    const existing = this.missingKeys.get(cacheKey);

    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.missingKeys.set(cacheKey, {
        key,
        language,
        namespace,
        timestamp: Date.now(),
        count: 1,
      });
    }

    // 发送错误到错误处理器
    if (this.config.enableWarnings) {
      errorHandler.handleError({
        type: 'TRANSLATION_KEY_MISSING',
        message: `Missing translation key: ${key}`,
        language,
        key,
        context: { namespace },
      });
    }
  }

  /**
   * 获取缺失的键列表
   */
  getMissingKeys(): MissingKeyInfo[] {
    return Array.from(this.missingKeys.values()).sort((a, b) => b.count - a.count);
  }

  /**
   * 按语言获取缺失的键
   */
  getMissingKeysByLanguage(language: string): MissingKeyInfo[] {
    return Array.from(this.missingKeys.values())
      .filter((info) => info.language === language)
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取最常缺失的键
   */
  getTopMissingKeys(limit: number = 10): MissingKeyInfo[] {
    return this.getMissingKeys().slice(0, limit);
  }

  /**
   * 导出缺失键报告
   */
  exportMissingKeysReport(): string {
    const report = {
      generatedAt: new Date().toISOString(),
      totalMissingKeys: this.missingKeys.size,
      byLanguage: this.groupMissingKeysByLanguage(),
      topMissing: this.getTopMissingKeys(20),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 按语言分组缺失的键
   */
  private groupMissingKeysByLanguage(): Record<string, MissingKeyInfo[]> {
    const grouped: Record<string, MissingKeyInfo[]> = {};

    for (const info of this.missingKeys.values()) {
      if (!grouped[info.language]) {
        grouped[info.language] = [];
      }
      grouped[info.language].push(info);
    }

    return grouped;
  }

  /**
   * 清除缺失键记录
   */
  clearMissingKeys(): void {
    this.missingKeys.clear();
  }

  /**
   * 设置资源缓存（用于回退查找）
   */
  setResourceCache(language: string, namespace: string, resource: Record<string, any>): void {
    const cacheKey = `${language}:${namespace}`;
    this.resourceCache.set(cacheKey, resource);
  }

  /**
   * 清除资源缓存
   */
  clearResourceCache(): void {
    this.resourceCache.clear();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalMissingKeys: number;
    uniqueKeys: number;
    byLanguage: Record<string, number>;
    mostFrequent: MissingKeyInfo | null;
  } {
    const byLanguage: Record<string, number> = {};
    let mostFrequent: MissingKeyInfo | null = null;

    for (const info of this.missingKeys.values()) {
      byLanguage[info.language] = (byLanguage[info.language] || 0) + 1;

      if (!mostFrequent || info.count > mostFrequent.count) {
        mostFrequent = info;
      }
    }

    return {
      totalMissingKeys: this.missingKeys.size,
      uniqueKeys: new Set(Array.from(this.missingKeys.values()).map((i) => i.key)).size,
      byLanguage,
      mostFrequent,
    };
  }
}

// 创建全局回退管理器实例
export const fallbackManager = new FallbackManager({
  strategy: 'smart',
  fallbackLanguages: ['zh-CN', 'en-US'],
  showKeyInDev: process.env.NODE_ENV === 'development',
  enableWarnings: true,
});
