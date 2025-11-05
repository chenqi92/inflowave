/**
 * 国际化系统状态管理 Store
 * 
 * 功能：
 * 1. 管理当前语言和可用语言状态
 * 2. 提供语言切换逻辑和资源加载
 * 3. 支持持久化到 localStorage 和 Tauri 存储
 * 4. 提供格式化函数和工具方法
 * 5. 处理错误和回退机制
 */

import { create } from 'zustand';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import i18n from 'i18next';
import { safeTauriInvoke } from '@/utils/tauri';
import { languageDetector, translationLoader, resourceManager } from './config';
import { performanceMonitor } from './performance-monitor';
import { errorHandler } from './error-handler';
import { fallbackManager } from './fallback-manager';
import { devTools } from './dev-tools';
import type { 
  I18nState, 
  LanguageInfo, 
  TranslationOptions, 
  I18nError 
} from './types';

// ============================================================================
// 常量定义
// ============================================================================

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 从 localStorage 恢复语言状态
 */
const restoreLanguageStates = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem('i18n-language-states');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('⚠️ [I18nStore] 恢复语言状态失败:', error);
  }
  return {};
};

// 支持的语言信息
const getInitialLanguages = (): LanguageInfo[] => {
  const baseLanguages: LanguageInfo[] = [
    {
      code: 'zh-CN',
      name: '简体中文',
      nativeName: '简体中文',
      direction: 'ltr',
      region: 'CN',
      flag: '🇨🇳',
      enabled: true,
      progress: 100,
    },
    {
      code: 'en-US',
      name: 'English (US)',
      nativeName: 'English (US)',
      direction: 'ltr',
      region: 'US',
      flag: '🇺🇸',
      enabled: true,
      progress: 100,
    },
  ];
  
  // 恢复保存的语言状态
  const savedStates = restoreLanguageStates();
  
  return baseLanguages.map(lang => ({
    ...lang,
    enabled: savedStates[lang.code] !== undefined ? savedStates[lang.code] : lang.enabled,
  }));
};

export const AVAILABLE_LANGUAGES: LanguageInfo[] = getInitialLanguages();

// date-fns 语言映射
const DATE_FNS_LOCALES: Record<string, any> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// ============================================================================
// Store 实现
// ============================================================================

export const useI18nStore = create<I18nState>((set, get) => ({
  // 初始状态
  currentLanguage: languageDetector.detectLanguage(),
  availableLanguages: AVAILABLE_LANGUAGES,
  isLoading: false,
  loadedResources: {},
  
  // 配置
  config: {
    fallbackLanguage: 'zh-CN',
    enableDetection: true,
    enablePersistence: true,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24小时
  },
  
  // ============================================================================
  // 语言切换
  // ============================================================================
  setLanguage: async (language: string) => {
    const { currentLanguage, availableLanguages } = get();
    
    // 检查语言是否受支持
    const languageInfo = availableLanguages.find(lang => lang.code === language);
    if (!languageInfo || !languageInfo.enabled) {
      throw new Error(`Language ${language} is not supported or enabled`);
    }
    
    // 如果是当前语言，直接返回
    if (currentLanguage === language) {
      return;
    }
    
    console.log(`🌐 [I18nStore] 切换语言: ${currentLanguage} -> ${language}`);
    const startTime = Date.now();
    set({ isLoading: true });
    
    try {
      // 切换 i18next 语言
      await i18n.changeLanguage(language);
      
      // 更新状态
      set({ 
        currentLanguage: language,
        isLoading: false,
      });
      
      // 保存语言偏好
      await saveLanguagePreference(language);
      
      // 记录语言使用（用于智能预加载）
      resourceManager.recordLanguageUsage(language);
      
      // 记录语言切换性能
      const switchTime = Date.now() - startTime;
      performanceMonitor.recordSwitch(language, switchTime, true);
      
      // 更新 HTML lang 属性
      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
        document.documentElement.dir = languageInfo.direction;
      }
      
      console.log(`✅ [I18nStore] 语言切换成功: ${language} (${switchTime}ms)`);
    } catch (error) {
      const switchTime = Date.now() - startTime;
      performanceMonitor.recordSwitch(language, switchTime, false);
      
      // 记录错误
      errorHandler.handleError({
        type: 'LANGUAGE_SWITCH_FAILED',
        message: `Failed to switch language to ${language}`,
        language,
        originalError: error as Error,
      });
      
      console.error(`❌ [I18nStore] 语言切换失败:`, error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  // ============================================================================
  // 资源加载
  // ============================================================================
  loadLanguageResource: async (language: string) => {
    const { loadedResources } = get();
    
    // 检查是否已加载
    if (loadedResources[language]) {
      return;
    }
    
    console.log(`📦 [I18nStore] 加载语言资源: ${language}`);
    
    try {
      const resource = await translationLoader.loadLanguage(language);
      
      set({
        loadedResources: {
          ...loadedResources,
          [language]: resource,
        },
      });
      
      console.log(`✅ [I18nStore] 语言资源加载成功: ${language}`);
    } catch (error) {
      console.error(`❌ [I18nStore] 语言资源加载失败: ${language}`, error);
      throw error;
    }
  },
  
  // ============================================================================
  // 语言管理
  // ============================================================================
  addLanguage: (languageInfo: LanguageInfo) => {
    const { availableLanguages } = get();
    
    // 检查是否已存在
    const exists = availableLanguages.some(lang => lang.code === languageInfo.code);
    if (exists) {
      console.warn(`⚠️ [I18nStore] 语言已存在: ${languageInfo.code}`);
      return;
    }
    
    set({
      availableLanguages: [...availableLanguages, languageInfo],
    });
    
    console.log(`➕ [I18nStore] 添加语言: ${languageInfo.code}`);
  },
  
  removeLanguage: (languageCode: string) => {
    const { availableLanguages, currentLanguage, config } = get();
    
    // 不能删除当前语言和回退语言
    if (languageCode === currentLanguage || languageCode === config.fallbackLanguage) {
      console.warn(`⚠️ [I18nStore] 不能删除当前语言或回退语言: ${languageCode}`);
      return;
    }
    
    set({
      availableLanguages: availableLanguages.filter(lang => lang.code !== languageCode),
    });
    
    // 清除缓存的资源
    translationLoader.clearLanguageCache(languageCode);
    
    console.log(`➖ [I18nStore] 删除语言: ${languageCode}`);
  },
  
  updateLanguageProgress: (languageCode: string, progress: number) => {
    const { availableLanguages } = get();
    
    set({
      availableLanguages: availableLanguages.map(lang =>
        lang.code === languageCode
          ? { ...lang, progress: Math.max(0, Math.min(100, progress)) }
          : lang
      ),
    });
  },
  
  toggleLanguageEnabled: (languageCode: string, enabled: boolean) => {
    const { availableLanguages } = get();
    
    const updatedLanguages = availableLanguages.map(lang =>
      lang.code === languageCode
        ? { ...lang, enabled }
        : lang
    );
    
    set({ availableLanguages: updatedLanguages });
    
    // 持久化到 localStorage
    try {
      const languageStates = updatedLanguages.reduce((acc, lang) => {
        acc[lang.code] = lang.enabled;
        return acc;
      }, {} as Record<string, boolean>);
      
      localStorage.setItem('i18n-language-states', JSON.stringify(languageStates));
    } catch (error) {
      console.warn('⚠️ [I18nStore] 保存语言状态失败:', error);
    }
  },
  
  // ============================================================================
  // 格式化方法
  // ============================================================================
  formatDate: (date: Date, formatStr?: string) => {
    const { currentLanguage } = get();
    const locale = DATE_FNS_LOCALES[currentLanguage] || DATE_FNS_LOCALES['zh-CN'];
    const defaultFormat = currentLanguage === 'zh-CN' ? 'yyyy年MM月dd日' : 'MMM dd, yyyy';
    
    try {
      return format(date, formatStr || defaultFormat, { locale });
    } catch (error) {
      console.error('❌ [I18nStore] 日期格式化失败:', error);
      return date.toLocaleDateString();
    }
  },
  
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => {
    const { currentLanguage } = get();
    
    try {
      return new Intl.NumberFormat(currentLanguage, options).format(num);
    } catch (error) {
      console.error('❌ [I18nStore] 数字格式化失败:', error);
      return num.toString();
    }
  },
  
  formatRelativeTime: (date: Date) => {
    const { currentLanguage } = get();
    const locale = DATE_FNS_LOCALES[currentLanguage] || DATE_FNS_LOCALES['zh-CN'];
    
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale,
      });
    } catch (error) {
      console.error('❌ [I18nStore] 相对时间格式化失败:', error);
      return date.toLocaleString();
    }
  },
  
  // ============================================================================
  // 工具方法
  // ============================================================================
  t: (key: string, options?: TranslationOptions) => {
    const { currentLanguage } = get();
    
    // 记录翻译调用（开发模式）
    devTools.logTranslationCall(key, currentLanguage);
    
    try {
      const translation = i18n.t(key, options as any);
      
      // 检查是否返回了键名（表示翻译缺失）
      if (translation === key && !i18n.exists(key)) {
        // 使用回退管理器获取回退翻译
        return fallbackManager.getFallbackTranslation(key, currentLanguage, {
          defaultValue: options?.defaultValue,
          context: options as any,
        });
      }
      
      return translation;
    } catch (error) {
      console.error(`❌ [I18nStore] 翻译失败: ${key}`, error);
      
      // 记录错误
      errorHandler.handleError({
        type: 'FORMAT_ERROR',
        message: `Translation failed for key: ${key}`,
        language: currentLanguage,
        key,
        originalError: error as Error,
      });
      
      // 使用回退管理器
      return fallbackManager.getFallbackTranslation(key, currentLanguage, {
        defaultValue: options?.defaultValue,
        context: options as any,
      });
    }
  },
  
  getTextDirection: () => {
    const { currentLanguage, availableLanguages } = get();
    const languageInfo = availableLanguages.find(lang => lang.code === currentLanguage);
    return languageInfo?.direction || 'ltr';
  },
  
  isRTL: () => {
    return get().getTextDirection() === 'rtl';
  },
  
}));

// ============================================================================
// 持久化函数
// ============================================================================

/**
 * 保存语言偏好
 */
const saveLanguagePreference = async (language: string) => {
  const config = useI18nStore.getState().config;
    
    if (!config.enablePersistence) {
      return;
    }
    
    try {
      // 保存到 localStorage
      languageDetector.saveLanguagePreference(language);
      
      // 保存到 Tauri 存储（如果可用）
      if (typeof window !== 'undefined' && window.__TAURI__) {
        await safeTauriInvoke('save_language_preference', { language });
      }
      
      console.log(`💾 [I18nStore] 语言偏好已保存: ${language}`);
  } catch (error) {
    console.warn('⚠️ [I18nStore] 保存语言偏好失败:', error);
  }
};

// ============================================================================
// 便捷选择器和工具函数
// ============================================================================

/**
 * 获取当前语言（同步）
 */
export const getCurrentLanguage = (): string => {
  return useI18nStore.getState().currentLanguage;
};

/**
 * 获取可用语言列表（同步）
 */
export const getAvailableLanguages = (): LanguageInfo[] => {
  return useI18nStore.getState().availableLanguages;
};

/**
 * 检查是否为 RTL 语言（同步）
 */
export const isRTLLanguage = (): boolean => {
  return useI18nStore.getState().isRTL();
};

/**
 * 获取文本方向（同步）
 */
export const getTextDirection = (): 'ltr' | 'rtl' => {
  return useI18nStore.getState().getTextDirection();
};

/**
 * 翻译函数（同步）
 */
export const t = (key: string, options?: TranslationOptions): string => {
  return useI18nStore.getState().t(key, options);
};

/**
 * 格式化日期（同步）
 */
export const formatDate = (date: Date, format?: string): string => {
  return useI18nStore.getState().formatDate(date, format);
};

/**
 * 格式化数字（同步）
 */
export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
  return useI18nStore.getState().formatNumber(num, options);
};

/**
 * 格式化相对时间（同步）
 */
export const formatRelativeTime = (date: Date): string => {
  return useI18nStore.getState().formatRelativeTime(date);
};

/**
 * 初始化 i18n store
 */
export const initI18nStore = async (): Promise<void> => {
  const store = useI18nStore.getState();
  
  try {
    // 加载当前语言资源
    await store.loadLanguageResource(store.currentLanguage);
    
    // 预加载其他语言资源
    const otherLanguages = store.availableLanguages
      .filter(lang => lang.code !== store.currentLanguage && lang.enabled)
      .map(lang => lang.code);
    
    for (const lang of otherLanguages) {
      try {
        await store.loadLanguageResource(lang);
      } catch (error) {
        console.warn(`⚠️ [I18nStore] 预加载语言失败: ${lang}`, error);
      }
    }
    
    console.log('✅ [I18nStore] 初始化完成');
  } catch (error) {
    console.error('❌ [I18nStore] 初始化失败:', error);
    throw error;
  }
};