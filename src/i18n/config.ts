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
import logger from '@/utils/logger';

// 支持的语言列表（只使用完整的语言代码，避免加载不存在的资源）
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en-US'] as const;

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
  enableVersioning: false, // 禁用版本检查（项目中没有 versions.json）
  enableIntegrityCheck: false, // 禁用完整性检查
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

  // 支持的语言（严格模式，只允许列表中的语言）
  supportedLngs: SUPPORTED_LANGUAGES,

  // 加载选项
  load: 'currentOnly' as const, // 只加载当前语言，不加载语言变体
  nonExplicitSupportedLngs: false, // 不自动添加语言变体到支持列表

  // 命名空间
  defaultNS: 'common',
  ns: [
    'common', 'navigation', 'connections', 'query', 'settings', 'errors',
    'dateTime', 'menu', 'visualization', 'logs', 'tests', 'utils', 'data',
    'chart', 'chartType', 'contextMenu', 'dashboard', 'dataBrowser',
    'dataGenerator', 'dataType', 'databaseExplorer', 'diagnostics',
    'embeddedServer', 'export', 'extension', 'filter', 'font',
    'globalSearch', 'itemType', 'notifications', 'port', 'retentionPolicy',
    's3', 'shortcuts', 'statistics', 'status', 'tabs', 'theme',
    'updater', 'userGuide', 'versionDetection'
  ],

  // 预加载关键命名空间（在应用启动时立即加载）
  // 只预加载实际存在资源文件的语言，不预加载别名（zh, en）
  preload: ['zh-CN', 'en-US'],
  partialBundledLanguages: true,
  
  // 插值配置
  interpolation: {
    escapeValue: false, // React 已经处理了 XSS
    // 移除弃用的 format 函数，使用新的格式化方式
    // 如果需要格式化，可以在翻译文件中使用 {{value, uppercase}} 等
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
    // 使用函数来映射语言代码，将简化的代码（zh, en）映射到完整的路径（zh-CN, en-US）
    loadPath: (lngs: readonly string[], namespaces: readonly string[]) => {
      const lng = lngs[0];
      const ns = namespaces[0];

      // 语言代码映射
      const languageMap: Record<string, string> = {
        'zh': 'zh-CN',
        'en': 'en-US',
      };

      // 使用映射后的语言代码或原始代码
      const mappedLng = languageMap[lng] || lng;

      const path = `${loaderConfig.resourcePath}/${mappedLng}/${ns}.json`;
      logger.debug(`[i18n] Loading resource: ${path} (original lng: ${lng})`);
      return path;
    },
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

// 迁移旧的语言代码到新格式
const migrateLanguageCode = () => {
  try {
    const storedLang = localStorage.getItem('i18nextLng');
    if (storedLang) {
      // 语言代码映射
      const languageMap: Record<string, string> = {
        'zh': 'zh-CN',
        'en': 'en-US',
      };

      const normalizedLang = languageMap[storedLang] || storedLang;

      // 如果语言代码被映射了，更新 localStorage
      if (normalizedLang !== storedLang) {
        logger.info(`🔄 [i18n] 迁移语言代码: ${storedLang} -> ${normalizedLang}`);
        localStorage.setItem('i18nextLng', normalizedLang);
      }
    }
  } catch (error) {
    logger.warn('⚠️ [i18n] 迁移语言代码失败:', error);
  }
};

// 标记是否已初始化，防止重复初始化
let isI18nInitialized = false;
let initializationPromise: Promise<typeof i18n> | null = null;

// 初始化 i18next
const initI18n = async () => {
  // 🛡️ 防止重复初始化
  if (isI18nInitialized) {
    logger.debug('[i18n] Already initialized, skipping...');
    return i18n;
  }

  // 🛡️ 如果正在初始化中，返回已有的 Promise
  if (initializationPromise) {
    logger.debug('[i18n] Initialization in progress, waiting...');
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      // 迁移旧的语言代码
      migrateLanguageCode();

      // 初始化资源管理器
      await resourceManager.initialize();

      // 使用 HTTP 后端和 React 集成初始化 i18next
      await i18n
        .use(Backend)
        .use(initReactI18next)
        .init(i18nConfig);

      logger.info('i18next initialized successfully with language:', i18n.language);

      // 添加 missingKey 事件监听器，将缺失的键值打印到 frontend.log
      i18n.on('missingKey', (lngs: readonly string[], namespace: string, key: string, res: string) => {
        // 记录到 frontend.log
        logger.warn(`🔑 [i18n] Missing translation key: "${key}" in namespace "${namespace}" for language(s) "${lngs.join(', ')}"`, {
          languages: lngs,
          namespace,
          key,
          result: res,
        });
      });

      // 添加 failedLoading 事件监听器，处理资源加载失败
      i18n.on('failedLoading', (lng: string, ns: string, msg: string) => {
        // 只记录警告，不抛出错误，让 i18next 使用回退语言
        logger.warn(`⚠️ [i18n] Failed to load namespace "${ns}" for language "${lng}": ${msg}`);
      });

      // 智能预加载语言资源
      if (loaderConfig.enableLazyLoading) {
        // 使用智能预加载策略
        resourceManager.smartPreload(
          [...SUPPORTED_LANGUAGES],
          i18n.language
        ).then(results => {
          const successful = results.filter(r => r.success);
          logger.debug(`✅ [i18n] Smart preload completed: ${successful.length}/${results.length} languages loaded`);

          // 记录当前语言使用
          resourceManager.recordLanguageUsage(i18n.language);
        }).catch(error => {
          logger.warn('⚠️ [i18n] Smart preload failed:', error);
        });
      }

      // 检查资源更新（非阻塞）
      if (resourceManagerConfig.enableVersioning) {
        resourceManager.checkForUpdates([...SUPPORTED_LANGUAGES]).then(updates => {
          const hasUpdates = updates.some(u => u.hasUpdate);
          if (hasUpdates) {
            logger.info('Language resource updates available:', updates);

            // 触发更新可用事件
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('i18n-updates-available', {
                detail: { updates }
              }));
            }
          }
        }).catch(error => {
          logger.warn('Failed to check for updates:', error);
        });
      }

      // ✅ 标记初始化完成
      isI18nInitialized = true;

      return i18n;
    } catch (error) {
      // 初始化失败时，清除 Promise 以便重试
      initializationPromise = null;
      logger.error('Failed to initialize i18next:', error);
      throw error;
    }
  })();

  return initializationPromise;
};

// 导出配置和初始化函数
export { i18nConfig, languageDetectionConfig, loaderConfig, resourceManagerConfig };
export default initI18n;