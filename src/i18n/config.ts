/**
 * i18next 配置文件
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import { LanguageDetector } from './language-detector';
import { TranslationLoader } from './translation-loader';
import { ResourceManager, type ResourceManagerConfig } from './resource-manager';
import type { LanguageDetectionConfig, LoaderConfig } from './types';

// 支持的语言列表（包含基础语言代码以支持 fallback）
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US', 'zh', 'en'] as const;

// 默认语言
export const DEFAULT_LANGUAGE = 'zh-CN';

// 回退语言
export const FALLBACK_LANGUAGE = 'zh-CN';

// 语言检测配置
const languageDetectionConfig: LanguageDetectionConfig = {
  enableSystemDetection: true,
  enableStorageDetection: true,
  fallbackLanguage: FALLBACK_LANGUAGE,
  supportedLanguages: [...SUPPORTED_LANGUAGES],
};

// 资源加载器配置
const loaderConfig: LoaderConfig = {
  resourcePath: '/locales',
  enableLazyLoading: true,
  enableCaching: true,
  cacheTimeout: 24 * 60 * 60 * 1000, // 24小时
};

// 资源管理器配置
const resourceManagerConfig: ResourceManagerConfig = {
  ...loaderConfig,
  enableVersioning: true,
  enableIntegrityCheck: true,
  enableHotReload: import.meta.env.DEV, // 仅在开发环境启用热重载
  updateCheckInterval: 60 * 60 * 1000, // 1小时检查一次更新
};

// 创建语言检测器、翻译加载器和资源管理器实例
export const languageDetector = new LanguageDetector(languageDetectionConfig);
export const translationLoader = new TranslationLoader(loaderConfig);
export const resourceManager = new ResourceManager(resourceManagerConfig);

// i18next 配置
const i18nConfig = {
  // 调试模式（仅在开发环境启用）
  debug: import.meta.env.DEV,
  
  // 默认语言（将通过语言检测器动态设置）
  lng: languageDetector.detectLanguage(),
  
  // 回退语言
  fallbackLng: FALLBACK_LANGUAGE,
  
  // 支持的语言
  supportedLngs: SUPPORTED_LANGUAGES,
  
  // 命名空间
  defaultNS: 'common',
  ns: ['common', 'navigation', 'connections', 'query', 'settings', 'errors', 'dateTime', 'menu', 'visualization', 'logs', 'tests', 'utils', 'data'],
  
  // 插值配置
  interpolation: {
    escapeValue: false, // React 已经处理了 XSS
    formatSeparator: ',',
    format: (value: any, format?: string) => {
      if (format === 'uppercase') return value.toUpperCase();
      if (format === 'lowercase') return value.toLowerCase();
      if (format === 'capitalize') return value.charAt(0).toUpperCase() + value.slice(1);
      return value;
    },
  },
  
  // 复数规则
  pluralSeparator: '_',
  contextSeparator: '_',
  
  // 键分隔符
  keySeparator: '.',
  nsSeparator: ':',
  
  // 资源配置（将通过后端动态加载）
  resources: {},
  
  // React 配置
  react: {
    // 绑定事件
    bindI18n: 'languageChanged',
    bindI18nStore: '',
    
    // 事务模式
    transEmptyNodeValue: '',
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    
    // 使用 Suspense
    useSuspense: false,
  },
  
  // 后端配置（用于动态加载）
  backend: {
    loadPath: `${loaderConfig.resourcePath}/{{lng}}/{{ns}}.json`,
    addPath: `${loaderConfig.resourcePath}/{{lng}}/{{ns}}.json`,
    allowMultiLoading: false,
    crossDomain: false,
    withCredentials: false,
    requestOptions: {
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'default',
    },
  },
};

// 初始化 i18next
const initI18n = async () => {
  try {
    // 初始化资源管理器
    await resourceManager.initialize();
    
    // 使用 HTTP 后端和 React 集成初始化 i18next
    await i18n
      .use(Backend)
      .use(initReactI18next)
      .init(i18nConfig);
    
    console.log('i18next initialized successfully with language:', i18n.language);
    
    // 智能预加载语言资源
    if (loaderConfig.enableLazyLoading) {
      // 使用智能预加载策略
      resourceManager.smartPreload(
        [...SUPPORTED_LANGUAGES],
        i18n.language
      ).then(results => {
        const successful = results.filter(r => r.success);
        console.log(`✅ [i18n] Smart preload completed: ${successful.length}/${results.length} languages loaded`);
        
        // 记录当前语言使用
        resourceManager.recordLanguageUsage(i18n.language);
      }).catch(error => {
        console.warn('⚠️ [i18n] Smart preload failed:', error);
      });
    }
    
    // 检查资源更新（非阻塞）
    if (resourceManagerConfig.enableVersioning) {
      resourceManager.checkForUpdates([...SUPPORTED_LANGUAGES]).then(updates => {
        const hasUpdates = updates.some(u => u.hasUpdate);
        if (hasUpdates) {
          console.log('Language resource updates available:', updates);
          
          // 触发更新可用事件
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('i18n-updates-available', {
              detail: { updates }
            }));
          }
        }
      }).catch(error => {
        console.warn('Failed to check for updates:', error);
      });
    }
    
    return i18n;
  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw error;
  }
};

// 导出配置和初始化函数
export { i18nConfig, languageDetectionConfig, loaderConfig, resourceManagerConfig };
export default initI18n;