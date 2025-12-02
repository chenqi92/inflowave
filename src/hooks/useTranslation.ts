/**
 * useTranslation Hook
 * 
 * 功能：
 * 1. 实现基础翻译函数 t()，支持键值访问和插值
 * 2. 添加复数形式支持和嵌套键访问功能
 * 3. 实现翻译键缺失时的回退机制和警告日志
 * 
 * 需求: 2.1, 2.3, 2.5
 */

import { useCallback, useMemo } from 'react';
import { useI18nStore } from '@/i18n/store';
import type { TranslationOptions } from '@/i18n/types';
import logger from '@/utils/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface UseTranslationReturn {
  t: (key: string, options?: TranslationOptions) => string;
  language: string;
  isLoading: boolean;
  ready: boolean;
  i18n: {
    language: string;
  };
}

export interface TranslationInterpolation {
  [key: string]: string | number | boolean | Date;
}

export interface PluralOptions {
  count: number;
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取嵌套对象的值
 */
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj);
};

/**
 * 处理字符串插值
 */
const interpolateString = (
  template: string, 
  values: TranslationInterpolation
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    if (value === undefined || value === null) {
      logger.warn(`⚠️ [useTranslation] 插值变量未找到: ${key}`);
      return match; // 保留原始占位符
    }
    
    // 格式化不同类型的值
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    return String(value);
  });
};

/**
 * 处理复数形式
 */
const handlePlural = (
  key: string,
  count: number,
  resources: any,
  language: string
): string | null => {
  const pluralKey = `${key}_plural`;
  const pluralResource = getNestedValue(resources, pluralKey);
  
  if (!pluralResource || typeof pluralResource !== 'object') {
    return null;
  }
  
  // 根据语言和数量选择合适的复数形式
  if (count === 0 && pluralResource.zero) {
    return pluralResource.zero;
  }
  
  if (count === 1 && pluralResource.one) {
    return pluralResource.one;
  }
  
  if (count === 2 && pluralResource.two) {
    return pluralResource.two;
  }
  
  // 对于中文，通常不区分复数
  if (language.startsWith('zh')) {
    return pluralResource.other || pluralResource.one;
  }
  
  // 对于英文和其他语言
  if (count > 1 && pluralResource.many) {
    return pluralResource.many;
  }
  
  return pluralResource.other || pluralResource.one;
};

/**
 * 记录翻译键缺失警告
 */
const logMissingKey = (key: string, language: string, namespace?: string, context?: string) => {
  const contextInfo = context ? ` (context: ${context})` : '';
  const fullKey = namespace ? `${namespace}:${key}` : key;
  logger.warn(
    `⚠️ [useTranslation] 翻译键缺失: "${fullKey}" for language "${language}"${contextInfo}`
  );

  // 在开发环境下，可以收集缺失的键用于翻译管理
  if (process.env.NODE_ENV === 'development') {
    const missingKeys = (window as any).__MISSING_TRANSLATION_KEYS__ || new Set();
    // 格式: language:namespace:key (例如: zh-CN:iotdb:template.title)
    missingKeys.add(`${language}:${fullKey}`);
    (window as any).__MISSING_TRANSLATION_KEYS__ = missingKeys;
  }
};

// ============================================================================
// useTranslation Hook
// ============================================================================

export const useTranslation = (namespace?: string): UseTranslationReturn => {
  const {
    currentLanguage,
    loadedResources,
    isLoading,
    t: storeT,
  } = useI18nStore();

  // 检查是否准备就绪
  const ready = useMemo(() => {
    return !isLoading && loadedResources[currentLanguage];
  }, [isLoading, loadedResources, currentLanguage]);

  // 获取当前语言的资源
  const currentResources = useMemo(() => {
    return loadedResources[currentLanguage] || {};
  }, [loadedResources, currentLanguage]);

  // 翻译函数实现
  const t = useCallback((
    key: string,
    options: TranslationOptions = {}
  ): string => {
    try {
      // 如果有命名空间，使用 i18next 的 ns 选项
      const translationOptions = namespace
        ? { ...options, ns: namespace }
        : options;

      // 首先尝试使用 i18next 的翻译
      const i18nextResult = storeT(key, translationOptions);

      // 如果 i18next 返回的是键名本身，说明翻译不存在
      // 直接返回键名，不再使用自定义的资源查找逻辑
      // 因为 i18next 应该已经处理了所有的翻译查找
      if (i18nextResult !== key) {
        return i18nextResult;
      }

      // 如果 i18next 找不到翻译，记录缺失的键并返回默认值或键名
      logMissingKey(key, currentLanguage, namespace, options.context);
      return options.defaultValue || key;
    } catch (error) {
      logger.error(`❌ [useTranslation] 翻译处理失败: ${key}`, error);

      // 返回默认值或键名
      return options.defaultValue || key;
    }
  }, [
    namespace,
    storeT,
    currentResources,
    currentLanguage,
  ]);

  return {
    t,
    language: currentLanguage,
    isLoading,
    ready,
    i18n: {
      language: currentLanguage,
    },
  };
};

// ============================================================================
// 便捷 Hooks
// ============================================================================

/**
 * 带命名空间的翻译 Hook
 */
export const useNamespacedTranslation = (namespace: string) => {
  return useTranslation(namespace);
};

/**
 * 通用翻译 Hook（常用文本）
 */
export const useCommonTranslation = () => {
  return useTranslation('common');
};

/**
 * 导航翻译 Hook
 */
export const useNavigationTranslation = () => {
  return useTranslation('navigation');
};

/**
 * 错误消息翻译 Hook
 */
export const useErrorTranslation = () => {
  return useTranslation('errors');
};

/**
 * 设置页面翻译 Hook
 */
export const useSettingsTranslation = () => {
  return useTranslation('settings');
};

/**
 * 菜单翻译 Hook
 */
export const useMenuTranslation = () => {
  return useTranslation('menu');
};

/**
 * 可视化翻译 Hook
 */
export const useVisualizationTranslation = () => {
  return useTranslation('visualization');
};

/**
 * 数据管理翻译 Hook
 */
export const useDataTranslation = () => {
  return useTranslation('data');
};

/**
 * 连接管理翻译 Hook
 */
export const useConnectionsTranslation = () => {
  return useTranslation('connections');
};

/**
 * 查询翻译 Hook
 */
export const useQueryTranslation = () => {
  return useTranslation('query');
};

/**
 * 更新器翻译 Hook
 */
export const useUpdaterTranslation = () => {
  return useTranslation('updater');
};

/**
 * 仪表板翻译 Hook
 */
export const useDashboardTranslation = () => {
  return useTranslation('dashboard');
};

/**
 * 图表翻译 Hook
 */
export const useChartTranslation = () => {
  return useTranslation('chart');
};

/**
 * 标签页翻译 Hook
 */
export const useTabsTranslation = () => {
  return useTranslation('tabs');
};

/**
 * 端口状态翻译 Hook
 */
export const usePortTranslation = () => {
  return useTranslation('port');
};

/**
 * 嵌入式服务器翻译 Hook
 */
export const useEmbeddedServerTranslation = () => {
  return useTranslation('embeddedServer');
};

/**
 * 数据浏览器翻译 Hook
 */
export const useDataBrowserTranslation = () => {
  return useTranslation('dataBrowser');
};

/**
 * 上下文菜单翻译 Hook
 */
export const useContextMenuTranslation = () => {
  return useTranslation('contextMenu');
};

/**
 * 快捷键翻译 Hook
 */
export const useShortcutsTranslation = () => {
  return useTranslation('shortcuts');
};

/**
 * 用户引导翻译 Hook
 */
export const useUserGuideTranslation = () => {
  return useTranslation('userGuide');
};

/**
 * 版本检测翻译 Hook
 */
export const useVersionDetectionTranslation = () => {
  return useTranslation('versionDetection');
};

/**
 * 保留策略翻译 Hook
 */
export const useRetentionPolicyTranslation = () => {
  return useTranslation('retentionPolicy');
};

/**
 * 统计翻译 Hook
 */
export const useStatisticsTranslation = () => {
  return useTranslation('statistics');
};

/**
 * 导出翻译 Hook
 */
export const useExportTranslation = () => {
  return useTranslation('export');
};

/**
 * 状态翻译 Hook
 */
export const useStatusTranslation = () => {
  return useTranslation('status');
};

/**
 * 字体翻译 Hook
 */
export const useFontTranslation = () => {
  return useTranslation('font');
};

/**
 * 主题翻译 Hook
 */
export const useThemeTranslation = () => {
  return useTranslation('theme');
};

/**
 * 数据类型翻译 Hook
 */
export const useDataTypeTranslation = () => {
  return useTranslation('dataType');
};

/**
 * 项目类型翻译 Hook
 */
export const useItemTypeTranslation = () => {
  return useTranslation('itemType');
};

/**
 * 图表类型翻译 Hook
 */
export const useChartTypeTranslation = () => {
  return useTranslation('chartType');
};

/**
 * 过滤器翻译 Hook
 */
export const useFilterTranslation = () => {
  return useTranslation('filter');
};

/**
 * 扩展翻译 Hook
 */
export const useExtensionTranslation = () => {
  return useTranslation('extension');
};

/**
 * 诊断翻译 Hook
 */
export const useDiagnosticsTranslation = () => {
  return useTranslation('diagnostics');
};

/**
 * 全局搜索翻译 Hook
 */
export const useGlobalSearchTranslation = () => {
  return useTranslation('globalSearch');
};

/**
 * 数据库浏览器翻译 Hook
 */
export const useDatabaseExplorerTranslation = () => {
  return useTranslation('databaseExplorer');
};

/**
 * 通知翻译 Hook
 */
export const useNotificationsTranslation = () => {
  return useTranslation('notifications');
};

/**
 * 数据生成器翻译 Hook
 */
export const useDataGeneratorTranslation = () => {
  return useTranslation('dataGenerator');
};

// ============================================================================
// 高级翻译工具
// ============================================================================

/**
 * 批量翻译 Hook
 */
export const useBatchTranslation = (keys: string[], namespace?: string) => {
  const { t } = useTranslation(namespace);
  
  return useMemo(() => {
    const translations: Record<string, string> = {};
    keys.forEach(key => {
      translations[key] = t(key);
    });
    return translations;
  }, [keys, t]);
};

/**
 * 条件翻译 Hook
 */
export const useConditionalTranslation = (
  condition: boolean,
  trueKey: string,
  falseKey: string,
  namespace?: string
) => {
  const { t } = useTranslation(namespace);
  
  return useMemo(() => {
    return condition ? t(trueKey) : t(falseKey);
  }, [condition, trueKey, falseKey, t]);
};

/**
 * 翻译状态 Hook
 */
export const useTranslationStatus = () => {
  const { currentLanguage, availableLanguages, isLoading } = useI18nStore();
  
  return useMemo(() => {
    const currentLangInfo = availableLanguages.find(
      lang => lang.code === currentLanguage
    );
    
    return {
      currentLanguage,
      currentLanguageName: currentLangInfo?.nativeName || currentLanguage,
      isLoading,
      progress: currentLangInfo?.progress || 0,
      direction: currentLangInfo?.direction || 'ltr',
      isRTL: currentLangInfo?.direction === 'rtl',
    };
  }, [currentLanguage, availableLanguages, isLoading]);
};

/**
 * IoTDB 翻译 Hook
 */
export const useIoTDBTranslation = () => {
  return useTranslation('iotdb');
};

export default useTranslation;