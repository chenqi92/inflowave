/**
 * 语言检测器
 * 负责检测用户首选语言，支持系统语言和存储语言检测
 */

import type { LanguageDetectionConfig } from './types';
import logger from '@/utils/logger';

export class LanguageDetector {
  private config: LanguageDetectionConfig;

  constructor(config: LanguageDetectionConfig) {
    this.config = config;
  }

  /**
   * 检测用户首选语言
   */
  detectLanguage(): string {
    // 1. 优先检查存储的语言偏好
    if (this.config.enableStorageDetection) {
      const storedLanguage = this.getStoredLanguage();
      if (storedLanguage && this.isLanguageSupported(storedLanguage)) {
        return storedLanguage;
      }
    }

    // 2. 检测系统语言
    if (this.config.enableSystemDetection) {
      const systemLanguage = this.detectSystemLanguage();
      if (systemLanguage && this.isLanguageSupported(systemLanguage)) {
        return systemLanguage;
      }
    }

    // 3. 使用回退语言
    return this.config.fallbackLanguage;
  }

  /**
   * 检测系统语言
   */
  detectSystemLanguage(): string {
    // 检查 navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const language = this.normalizeLanguageCode(navigator.language);
      if (this.isLanguageSupported(language)) {
        return language;
      }
    }

    // 检查 navigator.languages
    if (typeof navigator !== 'undefined' && navigator.languages) {
      for (const lang of navigator.languages) {
        const language = this.normalizeLanguageCode(lang);
        if (this.isLanguageSupported(language)) {
          return language;
        }
      }
    }

    // 检查 HTML lang 属性
    if (typeof document !== 'undefined') {
      const htmlLang = document.documentElement.lang;
      if (htmlLang) {
        const language = this.normalizeLanguageCode(htmlLang);
        if (this.isLanguageSupported(language)) {
          return language;
        }
      }
    }

    return this.config.fallbackLanguage;
  }

  /**
   * 获取存储的语言偏好
   */
  getStoredLanguage(): string | null {
    try {
      // 从 localStorage 获取
      const stored = localStorage.getItem('i18nextLng');
      if (stored) {
        return this.normalizeLanguageCode(stored);
      }
    } catch (error) {
      logger.warn('Failed to read language from localStorage:', error);
    }

    return null;
  }

  /**
   * 保存语言偏好到存储
   */
  saveLanguagePreference(language: string): void {
    try {
      localStorage.setItem('i18nextLng', language);
    } catch (error) {
      logger.warn('Failed to save language to localStorage:', error);
    }
  }

  /**
   * 检查语言是否受支持
   */
  isLanguageSupported(language: string): boolean {
    return this.config.supportedLanguages.includes(language);
  }

  /**
   * 标准化语言代码
   * 将各种格式的语言代码转换为标准格式
   */
  private normalizeLanguageCode(language: string): string {
    if (!language) return this.config.fallbackLanguage;

    // 移除空格并转换为小写
    const cleaned = language.trim().toLowerCase();

    // 处理常见的语言代码映射
    const languageMap: Record<string, string> = {
      'zh': 'zh-CN',
      'zh-cn': 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-hans-cn': 'zh-CN',
      'zh-tw': 'zh-TW',
      'zh-hant': 'zh-TW',
      'zh-hant-tw': 'zh-TW',
      'en': 'en-US',
      'en-us': 'en-US',
      'en-gb': 'en-GB',
      'ja': 'ja-JP',
      'ja-jp': 'ja-JP',
      'ko': 'ko-KR',
      'ko-kr': 'ko-KR',
      'fr': 'fr-FR',
      'fr-fr': 'fr-FR',
      'de': 'de-DE',
      'de-de': 'de-DE',
      'es': 'es-ES',
      'es-es': 'es-ES',
      'it': 'it-IT',
      'it-it': 'it-IT',
      'pt': 'pt-BR',
      'pt-br': 'pt-BR',
      'pt-pt': 'pt-PT',
      'ru': 'ru-RU',
      'ru-ru': 'ru-RU',
      'ar': 'ar-SA',
      'ar-sa': 'ar-SA',
    };

    // 查找映射
    const mapped = languageMap[cleaned];
    if (mapped && this.isLanguageSupported(mapped)) {
      return mapped;
    }

    // 尝试提取主要语言部分
    const mainLang = cleaned.split('-')[0];
    const mainMapped = languageMap[mainLang];
    if (mainMapped && this.isLanguageSupported(mainMapped)) {
      return mainMapped;
    }

    // 如果原始语言代码受支持，直接返回
    if (this.config.supportedLanguages.includes(language)) {
      return language;
    }

    return this.config.fallbackLanguage;
  }

  /**
   * 获取语言的文本方向
   */
  getTextDirection(language: string): 'ltr' | 'rtl' {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
    const langCode = language.split('-')[0].toLowerCase();
    return rtlLanguages.includes(langCode) ? 'rtl' : 'ltr';
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<LanguageDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}