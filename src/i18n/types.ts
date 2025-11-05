/**
 * 国际化系统类型定义
 */

// 语言信息接口
export interface LanguageInfo {
  code: string;           // 语言代码 (zh-CN, en-US)
  name: string;           // 语言名称 (简体中文, English)
  nativeName: string;     // 本地名称 (简体中文, English)
  direction: 'ltr' | 'rtl'; // 文本方向
  region?: string;        // 地区代码 (CN, US)
  flag?: string;          // 国旗图标
  enabled: boolean;       // 是否启用
  progress: number;       // 翻译完成度 (0-100)
}

// 翻译选项接口
export interface TranslationOptions {
  count?: number;         // 复数形式计数
  context?: string;       // 上下文
  defaultValue?: string;  // 默认值
  interpolation?: Record<string, any>; // 插值变量
}

// 数字格式化选项
export interface NumberFormatOptions extends Intl.NumberFormatOptions {
  locale?: string;
}

// 日期格式化选项
export interface DateFormatOptions {
  format?: string;
  locale?: string;
}

// 语言检测配置
export interface LanguageDetectionConfig {
  enableSystemDetection: boolean;
  enableStorageDetection: boolean;
  fallbackLanguage: string;
  supportedLanguages: string[];
}

// 翻译资源加载器配置
export interface LoaderConfig {
  resourcePath: string;
  enableLazyLoading: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
}

// 本地化配置
export interface LocaleConfig {
  dateFormat: string;
  timeFormat: string;
  numberFormat: Intl.NumberFormatOptions;
  currencyFormat: Intl.NumberFormatOptions;
  relativeTimeFormat: Intl.RelativeTimeFormatOptions;
}

// 性能配置
export interface PerformanceConfig {
  enableResourceCache: boolean;
  cacheTimeout: number;
  maxCacheSize: number;
  enablePreloading: boolean;
  preloadLanguages: string[];
  enableLazyLoading: boolean;
  batchUpdateDelay: number;
}

// 国际化错误类型
export interface I18nError {
  type: 'RESOURCE_LOAD_FAILED' | 'TRANSLATION_KEY_MISSING' | 'FORMAT_ERROR';
  message: string;
  context: {
    language?: string;
    key?: string;
    value?: any;
  };
  timestamp: Date;
}

// 国际化上下文值
export interface I18nContextValue {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, options?: TranslationOptions) => string;
  isLoading: boolean;
  availableLanguages: LanguageInfo[];
  formatDate: (date: Date, format?: string) => string;
  formatNumber: (num: number, options?: NumberFormatOptions) => string;
  formatRelativeTime: (date: Date) => string;
  direction: 'ltr' | 'rtl';
}

// 国际化提供者属性
export interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: string;
  fallbackLanguage?: string;
  enableLanguageDetection?: boolean;
  enablePersistence?: boolean;
}

// 国际化状态接口
export interface I18nState {
  // 当前状态
  currentLanguage: string;
  availableLanguages: LanguageInfo[];
  isLoading: boolean;
  loadedResources: Record<string, any>;
  
  // 配置
  config: {
    fallbackLanguage: string;
    enableDetection: boolean;
    enablePersistence: boolean;
    cacheTimeout: number;
  };
  
  // 操作方法
  setLanguage: (lang: string) => Promise<void>;
  loadLanguageResource: (lang: string) => Promise<void>;
  addLanguage: (langInfo: LanguageInfo) => void;
  removeLanguage: (langCode: string) => void;
  updateLanguageProgress: (langCode: string, progress: number) => void;
  toggleLanguageEnabled: (langCode: string, enabled: boolean) => void;
  
  // 格式化方法
  formatDate: (date: Date, format?: string) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatRelativeTime: (date: Date) => string;
  
  // 工具方法
  t: (key: string, options?: TranslationOptions) => string;
  getTextDirection: () => 'ltr' | 'rtl';
  isRTL: () => boolean;
}

// 翻译资源结构类型
export interface TranslationResource {
  // 通用界面
  common: {
    ok: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
  };
  
  // 导航和菜单
  navigation: {
    dashboard: string;
    connections: string;
    query: string;
    visualization: string;
    settings: string;
  };
  
  // 连接管理
  connections: {
    title: string;
    create: string;
    edit: string;
    test: string;
    connect: string;
    disconnect: string;
  };
  
  // 查询相关
  query: {
    execute: string;
    history: string;
    save: string;
    format: string;
  };
  
  // 设置页面
  settings: {
    general: string;
    language: string;
    theme: string;
  };
  
  // 错误消息
  errors: {
    connectionFailed: string;
    queryTimeout: string;
    invalidSyntax: string;
  };
  
  // 日期时间格式
  dateTime: {
    formats: {
      short: string;
      medium: string;
      long: string;
      full: string;
    };
    relative: {
      now: string;
      minutesAgo: string;
      hoursAgo: string;
      daysAgo: string;
    };
  };
}