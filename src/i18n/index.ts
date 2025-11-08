/**
 * 国际化系统入口文件
 */

// 导出类型定义
export type {
  LanguageInfo,
  TranslationOptions,
  NumberFormatOptions,
  DateFormatOptions,
  LanguageDetectionConfig,
  LoaderConfig,
  LocaleConfig,
  PerformanceConfig,
  I18nError,
  I18nContextValue,
  I18nProviderProps,
  I18nState,
  TranslationResource,
} from './types';

// 导出配置
export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  FALLBACK_LANGUAGE,
  i18nConfig,
  languageDetectionConfig,
  loaderConfig,
} from './config';

// 导出初始化函数
export { default as initI18n } from './config';

// 导出核心类
export { LanguageDetector } from './language-detector';
export { TranslationLoader } from './translation-loader';
export { ResourceManager } from './resource-manager';
export { CacheManager } from './cache-manager';
export { SmartPreloader } from './preloader';
export { PerformanceMonitor, performanceMonitor } from './performance-monitor';
export { ErrorHandler, errorHandler } from './error-handler';
export { FallbackManager, fallbackManager } from './fallback-manager';
export { DevTools, devTools, showI18nDashboard, generateI18nReport } from './dev-tools';

// 导出实例
export { languageDetector, translationLoader, resourceManager } from './config';

// 导出 Store
export {
  useI18nStore,
  getCurrentLanguage,
  getAvailableLanguages,
  isRTLLanguage,
  getTextDirection,
  t,
  tConn,
  formatDate,
  formatNumber,
  formatRelativeTime,
  initI18nStore,
  AVAILABLE_LANGUAGES,
} from './store';

// 导出 Provider 组件
export {
  I18nProvider,
  I18nProviderWithErrorBoundary,
  useI18n,
  Trans,
  LanguageSwitcher,
} from './I18nProvider';

// 导出验证函数
export { validateI18nSetup } from './validate-setup';

// 导出性能测试
export { runPerformanceTests, quickPerformanceCheck } from './performance-test';

// 导出 i18next 实例
export { default as i18n } from 'i18next';