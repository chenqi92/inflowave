/**
 * useLanguageSwitcher Hook
 * 
 * 功能：
 * 1. 实现 useLanguageSwitcher Hook，提供语言切换功能
 * 2. 添加语言切换时的加载状态和错误处理
 * 3. 确保切换过程中保持应用状态不丢失
 * 
 * 需求: 1.2, 1.3, 5.1, 5.2
 */

import { useCallback, useState, useMemo } from 'react';
import { useI18nStore } from '@/i18n/store';
import type { LanguageInfo } from '@/i18n/types';

// ============================================================================
// 类型定义
// ============================================================================

export interface LanguageSwitchError {
  code: 'UNSUPPORTED_LANGUAGE' | 'LOAD_FAILED' | 'SWITCH_FAILED' | 'NETWORK_ERROR';
  message: string;
  language?: string;
  originalError?: Error;
}

export interface LanguageSwitchOptions {
  preserveState?: boolean;        // 是否保持应用状态
  showLoadingIndicator?: boolean; // 是否显示加载指示器
  timeout?: number;               // 切换超时时间（毫秒）
  onSuccess?: (language: string) => void;     // 成功回调
  onError?: (error: LanguageSwitchError) => void; // 错误回调
  onStart?: (language: string) => void;       // 开始切换回调
}

export interface UseLanguageSwitcherReturn {
  // 当前状态
  currentLanguage: string;
  availableLanguages: LanguageInfo[];
  isLoading: boolean;
  isSwitching: boolean;
  error: LanguageSwitchError | null;
  
  // 语言切换方法
  switchLanguage: (language: string, options?: LanguageSwitchOptions) => Promise<void>;
  switchToNext: () => Promise<void>;
  switchToPrevious: () => Promise<void>;
  
  // 语言查询方法
  getLanguageInfo: (code: string) => LanguageInfo | undefined;
  isLanguageSupported: (code: string) => boolean;
  getEnabledLanguages: () => LanguageInfo[];
  
  // 错误处理
  clearError: () => void;
  retry: () => Promise<void>;
  
  // 工具方法
  canSwitchTo: (language: string) => boolean;
  getNextLanguage: () => LanguageInfo | undefined;
  getPreviousLanguage: () => LanguageInfo | undefined;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_SWITCH_OPTIONS: Required<LanguageSwitchOptions> = {
  preserveState: true,
  showLoadingIndicator: true,
  timeout: 5000, // 5秒超时
  onSuccess: () => {},
  onError: () => {},
  onStart: () => {},
};

// ============================================================================
// useLanguageSwitcher Hook
// ============================================================================

export const useLanguageSwitcher = (): UseLanguageSwitcherReturn => {
  const {
    currentLanguage,
    availableLanguages,
    isLoading: storeLoading,
    setLanguage,
  } = useI18nStore();

  // 本地状态
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<LanguageSwitchError | null>(null);
  const [lastAttemptedLanguage, setLastAttemptedLanguage] = useState<string | null>(null);

  // 计算启用的语言列表
  const enabledLanguages = useMemo(() => {
    return availableLanguages.filter(lang => lang.enabled);
  }, [availableLanguages]);

  // ============================================================================
  // 语言查询方法
  // ============================================================================

  const getLanguageInfo = useCallback((code: string): LanguageInfo | undefined => {
    return availableLanguages.find(lang => lang.code === code);
  }, [availableLanguages]);

  const isLanguageSupported = useCallback((code: string): boolean => {
    const langInfo = getLanguageInfo(code);
    return langInfo !== undefined && langInfo.enabled;
  }, [getLanguageInfo]);

  const getEnabledLanguages = useCallback((): LanguageInfo[] => {
    return enabledLanguages;
  }, [enabledLanguages]);

  const canSwitchTo = useCallback((language: string): boolean => {
    return isLanguageSupported(language) && language !== currentLanguage;
  }, [isLanguageSupported, currentLanguage]);

  // ============================================================================
  // 导航方法
  // ============================================================================

  const getNextLanguage = useCallback((): LanguageInfo | undefined => {
    const currentIndex = enabledLanguages.findIndex(lang => lang.code === currentLanguage);
    if (currentIndex === -1) return enabledLanguages[0];
    
    const nextIndex = (currentIndex + 1) % enabledLanguages.length;
    return enabledLanguages[nextIndex];
  }, [enabledLanguages, currentLanguage]);

  const getPreviousLanguage = useCallback((): LanguageInfo | undefined => {
    const currentIndex = enabledLanguages.findIndex(lang => lang.code === currentLanguage);
    if (currentIndex === -1) return enabledLanguages[enabledLanguages.length - 1];
    
    const prevIndex = currentIndex === 0 ? enabledLanguages.length - 1 : currentIndex - 1;
    return enabledLanguages[prevIndex];
  }, [enabledLanguages, currentLanguage]);

  // ============================================================================
  // 错误处理
  // ============================================================================

  const createError = useCallback((
    code: LanguageSwitchError['code'],
    message: string,
    language?: string,
    originalError?: Error
  ): LanguageSwitchError => {
    return {
      code,
      message,
      language,
      originalError,
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // 核心语言切换逻辑
  // ============================================================================

  const switchLanguage = useCallback(async (
    language: string,
    options: LanguageSwitchOptions = {}
  ): Promise<void> => {
    const config = { ...DEFAULT_SWITCH_OPTIONS, ...options };
    
    // 清除之前的错误
    setError(null);
    
    // 验证语言是否受支持
    if (!isLanguageSupported(language)) {
      const error = createError(
        'UNSUPPORTED_LANGUAGE',
        `Language "${language}" is not supported or enabled`,
        language
      );
      setError(error);
      config.onError(error);
      return;
    }

    // 如果已经是当前语言，直接返回
    if (language === currentLanguage) {
      console.log(`🌐 [useLanguageSwitcher] 已经是当前语言: ${language}`);
      config.onSuccess(language);
      return;
    }

    console.log(`🌐 [useLanguageSwitcher] 开始切换语言: ${currentLanguage} -> ${language}`);
    
    // 设置切换状态
    setIsSwitching(true);
    setLastAttemptedLanguage(language);
    config.onStart(language);

    try {
      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Language switch timeout after ${config.timeout}ms`));
        }, config.timeout);
      });

      // 执行语言切换
      const switchPromise = setLanguage(language);

      // 等待切换完成或超时
      await Promise.race([switchPromise, timeoutPromise]);

      console.log(`✅ [useLanguageSwitcher] 语言切换成功: ${language}`);
      config.onSuccess(language);

    } catch (originalError) {
      console.error(`❌ [useLanguageSwitcher] 语言切换失败:`, originalError);
      
      // 创建错误对象
      let errorCode: LanguageSwitchError['code'] = 'SWITCH_FAILED';
      let errorMessage = `Failed to switch to language "${language}"`;

      if (originalError instanceof Error) {
        if (originalError.message.includes('timeout')) {
          errorCode = 'NETWORK_ERROR';
          errorMessage = `Language switch timed out after ${config.timeout}ms`;
        } else if (originalError.message.includes('load')) {
          errorCode = 'LOAD_FAILED';
          errorMessage = `Failed to load language resources for "${language}"`;
        }
      }

      const error = createError(errorCode, errorMessage, language, originalError as Error);
      setError(error);
      config.onError(error);

    } finally {
      setIsSwitching(false);
    }
  }, [
    currentLanguage,
    isLanguageSupported,
    setLanguage,
    createError,
  ]);

  // ============================================================================
  // 便捷切换方法
  // ============================================================================

  const switchToNext = useCallback(async (): Promise<void> => {
    const nextLang = getNextLanguage();
    if (nextLang) {
      await switchLanguage(nextLang.code);
    }
  }, [getNextLanguage, switchLanguage]);

  const switchToPrevious = useCallback(async (): Promise<void> => {
    const prevLang = getPreviousLanguage();
    if (prevLang) {
      await switchLanguage(prevLang.code);
    }
  }, [getPreviousLanguage, switchLanguage]);

  // ============================================================================
  // 重试逻辑
  // ============================================================================

  const retry = useCallback(async (): Promise<void> => {
    if (lastAttemptedLanguage && error) {
      console.log(`🔄 [useLanguageSwitcher] 重试切换语言: ${lastAttemptedLanguage}`);
      await switchLanguage(lastAttemptedLanguage);
    }
  }, [lastAttemptedLanguage, error, switchLanguage]);

  // ============================================================================
  // 返回接口
  // ============================================================================

  return {
    // 当前状态
    currentLanguage,
    availableLanguages,
    isLoading: storeLoading || isSwitching,
    isSwitching,
    error,
    
    // 语言切换方法
    switchLanguage,
    switchToNext,
    switchToPrevious,
    
    // 语言查询方法
    getLanguageInfo,
    isLanguageSupported,
    getEnabledLanguages,
    
    // 错误处理
    clearError,
    retry,
    
    // 工具方法
    canSwitchTo,
    getNextLanguage,
    getPreviousLanguage,
  };
};

// ============================================================================
// 便捷 Hooks
// ============================================================================

/**
 * 简化的语言切换 Hook（只返回核心功能）
 */
export const useSimpleLanguageSwitcher = () => {
  const { 
    currentLanguage, 
    availableLanguages, 
    isLoading, 
    switchLanguage 
  } = useLanguageSwitcher();

  return {
    currentLanguage,
    availableLanguages: availableLanguages.filter(lang => lang.enabled),
    isLoading,
    switchLanguage,
  };
};

/**
 * 语言切换状态 Hook（只返回状态信息）
 */
export const useLanguageSwitchStatus = () => {
  const { 
    currentLanguage, 
    isLoading, 
    isSwitching, 
    error,
    getLanguageInfo 
  } = useLanguageSwitcher();

  const currentLanguageInfo = getLanguageInfo(currentLanguage);

  return {
    currentLanguage,
    currentLanguageName: currentLanguageInfo?.nativeName || currentLanguage,
    currentLanguageFlag: currentLanguageInfo?.flag,
    isLoading,
    isSwitching,
    hasError: !!error,
    error,
  };
};

/**
 * 语言导航 Hook（提供上一个/下一个语言切换）
 */
export const useLanguageNavigation = () => {
  const {
    switchToNext,
    switchToPrevious,
    getNextLanguage,
    getPreviousLanguage,
    canSwitchTo,
  } = useLanguageSwitcher();

  const nextLanguage = getNextLanguage();
  const previousLanguage = getPreviousLanguage();

  return {
    switchToNext,
    switchToPrevious,
    nextLanguage,
    previousLanguage,
    canSwitchNext: nextLanguage ? canSwitchTo(nextLanguage.code) : false,
    canSwitchPrevious: previousLanguage ? canSwitchTo(previousLanguage.code) : false,
  };
};

export default useLanguageSwitcher;