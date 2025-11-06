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
  [key: string]: any;     // 允许任意插值属性
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
  
  // 日志消息
  logs: {
    system: {
      initialized: string;
      starting: string;
      ready: string;
      shutdown: string;
    };
    tauri: {
      invoke_error: string;
      event_listener_setup: string;
      environment_check: string;
      api_import_success: string;
    };
    performance: {
      metric_recorded: string;
      observer_error: string;
      import_failed: string;
    };
    theme: {
      save_failed: string;
      load_failed: string;
      import_failed: string;
      preset_save_failed: string;
      preset_load_failed: string;
    };
    version: {
      get_failed: string;
    };
    sql: {
      format_failed: string;
    };
    shortcut: {
      import_failed: string;
      save_failed: string;
      load_failed: string;
    };
    refresh: {
      listener_error: string;
    };
    i18n: {
      initialized: string;
      preload_completed: string;
      preload_failed: string;
      updates_available: string;
      check_updates_failed: string;
      init_failed: string;
    };
    ui_test: {
      starting: string;
      testing_toolbar: string;
      testing_user_menu: string;
      testing_shortcuts: string;
      testing_forms: string;
      testing_modals: string;
      testing_navigation: string;
      report_summary: string;
      total_tests: string;
      passed_tests: string;
      failed_tests: string;
      success_rate: string;
      category_stats: string;
      run_failed: string;
    };
  };
  
  // 测试描述
  tests: {
    tauri: {
      description: string;
      safe_invoke: {
        should_succeed: string;
        should_handle_error: string;
        should_handle_no_params: string;
        should_handle_complex_params: string;
        should_handle_empty_string: string;
        should_handle_null: string;
        should_handle_array: string;
        should_handle_timeout: string;
        should_handle_network_error: string;
        should_handle_permission_error: string;
      };
      environment: {
        should_return_true_in_tauri: string;
        should_return_false_in_browser: string;
        should_return_false_in_browser_env: string;
      };
      error_handling: {
        title: string;
        should_handle_string_error: string;
        should_handle_object_error: string;
        should_handle_undefined_error: string;
      };
      performance: {
        title: string;
        should_complete_in_time: string;
        should_complete_within_100ms: string;
        should_support_concurrent: string;
      };
      edge_cases: {
        title: string;
        should_handle_large_params: string;
        should_handle_special_chars: string;
        unicode_test: string;
        should_handle_circular_ref: string;
        should_not_cause_infinite_loop: string;
      };
    };
    sql_type_detector: {
      description: string;
      display_info: {
        query_result_title: string;
        write_result_title: string;
        delete_result_title: string;
      };
      result_stats: {
        query_row_count: string;
        query_execution_time: string;
        write_row_count: string;
        write_execution_time: string;
        delete_row_count: string;
        delete_execution_time: string;
      };
    };
  };
  
  // 工具函数文本
  utils: {
    version: {
      default_version: string;
      app_name: string;
    };
    theme: {
      presets: {
        default_light: {
          name: string;
          description: string;
        };
        default_dark: {
          name: string;
          description: string;
        };
        minimal: {
          name: string;
          description: string;
        };
        modern: {
          name: string;
          description: string;
        };
        nature: {
          name: string;
          description: string;
        };
      };
    };
    sql: {
      display_info: {
        query_result: string;
        query_description: string;
        write_result: string;
        write_description: string;
        update_result: string;
        update_description: string;
        delete_result: string;
        delete_description: string;
        ddl_result: string;
        ddl_description: string;
        permission_result: string;
        permission_description: string;
        transaction_result: string;
        transaction_description: string;
        other_result: string;
        other_description: string;
        unknown_result: string;
        unknown_description: string;
      };
      stats_labels: {
        query_row_count: string;
        query_time: string;
        query_columns: string;
        write_row_count: string;
        write_time: string;
        write_columns: string;
        update_row_count: string;
        update_time: string;
        update_columns: string;
        delete_row_count: string;
        delete_time: string;
        delete_columns: string;
        ddl_row_count: string;
        ddl_time: string;
        ddl_columns: string;
        permission_row_count: string;
        permission_time: string;
        permission_columns: string;
        transaction_row_count: string;
        transaction_time: string;
        transaction_columns: string;
        other_row_count: string;
        other_time: string;
        other_columns: string;
        unknown_row_count: string;
        unknown_time: string;
        unknown_columns: string;
      };
    };
  };
}