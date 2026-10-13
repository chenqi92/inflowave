/**
 * 国际化提供者组件
 * 
 * 功能：
 * 1. 提供全局国际化上下文
 * 2. 集成语言检测、资源加载和状态管理
 * 3. 处理初始化加载和错误处理逻辑
 * 4. 支持 Suspense 和错误边界
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useI18nStore, initI18nStore } from './store';
import initI18n, { languageDetector } from './config';
import type { I18nContextValue, I18nProviderProps, I18nError } from './types';
import logger from '@/utils/logger';

// ============================================================================
// Context 定义
// ============================================================================

const I18nContext = createContext<I18nContextValue | null>(null);

// ============================================================================
// 错误边界组件
// ============================================================================

interface I18nErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class I18nErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> },
  I18nErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): I18nErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('❌ [I18nProvider] 错误边界捕获错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} />;
    }

    return this.props.children;
  }
}

// 默认错误回退组件
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="flex items-center justify-center min-h-screen bg-red-50">
    <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
      <div className="text-red-500 text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        国际化系统初始化失败
      </h2>
      <p className="text-gray-600 mb-4">
        {error.message || '未知错误'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        重新加载
      </button>
    </div>
  </div>
);

// ============================================================================
// 加载组件（简化版，不阻塞渲染）
// ============================================================================

// 不再使用独立的加载界面，依赖 index.html 的加载屏幕
// 这样可以避免两个加载界面重叠的问题

// ============================================================================
// I18nProvider 组件
// ============================================================================

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  defaultLanguage,
  fallbackLanguage,
  enableLanguageDetection = true,
  enablePersistence = true,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);

  // 🛡️ 防止 StrictMode 或重渲染导致的重复初始化
  const initializationStarted = useRef(false);
  const initializationCompleted = useRef(false);

  // 从 store 获取状态和方法
  const {
    currentLanguage,
    availableLanguages,
    isLoading,
    setLanguage,
    t,
    formatDate,
    formatNumber,
    formatRelativeTime,
    getTextDirection,
  } = useI18nStore();

  // ============================================================================
  // 初始化逻辑（优化版：非阻塞后台语言设置加载）
  // ============================================================================

  const initializeI18n = useCallback(async () => {
    // 🛡️ 双重检查，防止 StrictMode 导致的重复初始化
    if (initializationCompleted.current) {
      logger.debug('[I18nProvider] 初始化已完成，跳过');
      setIsInitialized(true);
      return;
    }

    try {
      logger.info('🚀 [I18nProvider] 开始初始化国际化系统');

      // 阶段1: 先从后端加载语言设置
      let initialLanguage: string | undefined = defaultLanguage;
      const storedLanguage = languageDetector.getStoredLanguage();
      if (!initialLanguage && storedLanguage && languageDetector.isLanguageSupported(storedLanguage)) {
        initialLanguage = storedLanguage;
      }

      try {
        if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
          const { safeTauriInvoke } = await import('@/utils/tauri');
          const appSettings = await safeTauriInvoke<any>('get_app_settings');
          if (!initialLanguage && appSettings?.general?.language) {
            initialLanguage = appSettings.general.language;
            logger.info('✅ [I18nProvider] 从后端加载语言设置:', initialLanguage);
          }
        }
      } catch (error) {
        logger.warn('⚠️ [I18nProvider] 从后端加载语言设置失败，使用默认语言:', error);
      }

      // 阶段2: 使用后端语言设置初始化 i18n
      await initI18n(initialLanguage);
      await initI18nStore();

      // 标记核心初始化完成
      initializationCompleted.current = true;
      setIsInitialized(true);
      logger.debug('✅ [I18nProvider] 核心初始化完成，语言:', initialLanguage);

    } catch (error) {
      logger.error('❌ [I18nProvider] 核心初始化失败:', error);
      // 即使初始化失败，也尝试让应用继续运行
      initializationCompleted.current = true;
      setIsInitialized(true);
      // 记录错误但不阻止渲染
      setInitError(error as Error);
    }
  }, [defaultLanguage]);

  // 组件挂载时初始化（只执行一次）
  // 使用 ref 防止 StrictMode 导致的重复初始化
  useEffect(() => {
    if (!initializationStarted.current) {
      initializationStarted.current = true;
      initializeI18n();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // 错误处理
  // ============================================================================

  const handleError = useCallback((error: I18nError) => {
    logger.error('❌ [I18nProvider] 处理 I18n 错误:', error);
    
    // 可以在这里添加错误上报逻辑
    // 例如：发送到错误监控服务
  }, []);

  // ============================================================================
  // Context 值
  // ============================================================================

  const contextValue: I18nContextValue = {
    language: currentLanguage,
    setLanguage: useCallback(async (lang: string) => {
      try {
        await setLanguage(lang);
      } catch (error) {
        handleError({
          type: 'RESOURCE_LOAD_FAILED',
          message: `Failed to switch to language: ${lang}`,
          context: { language: lang },
          timestamp: new Date(),
        });
        throw error;
      }
    }, [setLanguage, handleError]),
    t: useCallback((key: string, options?) => {
      try {
        return t(key, options);
      } catch (error) {
        handleError({
          type: 'TRANSLATION_KEY_MISSING',
          message: `Translation key not found: ${key}`,
          context: { key, language: currentLanguage },
          timestamp: new Date(),
        });
        return options?.defaultValue || key;
      }
    }, [t, currentLanguage, handleError]),
    isLoading,
    availableLanguages,
    formatDate: useCallback((date: Date, format?: string) => {
      try {
        return formatDate(date, format);
      } catch (error) {
        handleError({
          type: 'FORMAT_ERROR',
          message: `Date formatting failed`,
          context: { value: date, language: currentLanguage },
          timestamp: new Date(),
        });
        return date.toLocaleDateString();
      }
    }, [formatDate, currentLanguage, handleError]),
    formatNumber: useCallback((num: number, options?) => {
      try {
        return formatNumber(num, options);
      } catch (error) {
        handleError({
          type: 'FORMAT_ERROR',
          message: `Number formatting failed`,
          context: { value: num, language: currentLanguage },
          timestamp: new Date(),
        });
        return num.toString();
      }
    }, [formatNumber, currentLanguage, handleError]),
    formatRelativeTime: useCallback((date: Date) => {
      try {
        return formatRelativeTime(date);
      } catch (error) {
        handleError({
          type: 'FORMAT_ERROR',
          message: `Relative time formatting failed`,
          context: { value: date, language: currentLanguage },
          timestamp: new Date(),
        });
        return date.toLocaleString();
      }
    }, [formatRelativeTime, currentLanguage, handleError]),
    direction: getTextDirection(),
  };

  // ============================================================================
  // 渲染逻辑（优化版：不阻塞渲染）
  // ============================================================================

  // 如果初始化出错，记录错误但继续渲染
  // 这样应用仍然可以使用（可能显示键名代替翻译）
  if (initError) {
    logger.warn('⚠️ [I18nProvider] 初始化时发生错误，应用将以降级模式运行:', initError.message);
  }

  // 不再显示独立的加载界面
  // 如果还在初始化，仍然渲染子组件，让 index.html 的加载屏幕处理加载状态
  // 这样可以避免两个加载界面重叠的问题

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * 使用国际化上下文的 Hook
 */
export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  
  return context;
};

// ============================================================================
// 高阶组件
// ============================================================================

/**
 * 带错误边界的 I18nProvider
 */
export const I18nProviderWithErrorBoundary: React.FC<
  I18nProviderProps & {
    errorFallback?: React.ComponentType<{ error: Error }>;
    loadingFallback?: React.ComponentType;
  }
> = ({ errorFallback, loadingFallback, children, ...props }) => {
  return (
    <I18nErrorBoundary fallback={errorFallback}>
      <I18nProvider {...props}>
        {children}
      </I18nProvider>
    </I18nErrorBoundary>
  );
};

// ============================================================================
// 工具组件
// ============================================================================

/**
 * 翻译文本组件
 */
export const Trans: React.FC<{
  i18nKey: string;
  options?: any;
  defaultValue?: string;
  components?: Record<string, React.ReactElement>;
}> = ({ i18nKey, options, defaultValue, components }) => {
  const { t } = useI18n();
  
  let translatedText = t(i18nKey, { ...options, defaultValue });
  
  // 如果有组件替换，处理插值
  if (components) {
    Object.entries(components).forEach(([key, component]) => {
      const placeholder = `<${key}>`;
      const closingPlaceholder = `</${key}>`;
      
      if (translatedText.includes(placeholder) && translatedText.includes(closingPlaceholder)) {
        const parts = translatedText.split(placeholder);
        if (parts.length === 2) {
          const [before, after] = parts;
          const afterParts = after.split(closingPlaceholder);
          if (afterParts.length === 2) {
            const [content, remaining] = afterParts;
            translatedText = before + React.cloneElement(component, {}, content) + remaining;
          }
        }
      }
    });
  }
  
  return <>{translatedText}</>;
};

/**
 * 语言切换器组件
 */
export const LanguageSwitcher: React.FC<{
  className?: string;
  showFlags?: boolean;
  showProgress?: boolean;
}> = ({ className = '', showFlags = true, showProgress = false }) => {
  const { language, setLanguage, availableLanguages, isLoading } = useI18n();
  
  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage !== language && !isLoading) {
      try {
        await setLanguage(newLanguage);
      } catch (error) {
        logger.error('语言切换失败:', error);
      }
    }
  };
  
  return (
    <select
      value={language}
      onChange={(e) => handleLanguageChange(e.target.value)}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {availableLanguages
        .filter(lang => lang.enabled)
        .map(lang => (
          <option key={lang.code} value={lang.code}>
            {showFlags && lang.flag ? `${lang.flag} ` : ''}
            {lang.nativeName}
            {showProgress ? ` (${lang.progress}%)` : ''}
          </option>
        ))}
    </select>
  );
};

export default I18nProvider;
