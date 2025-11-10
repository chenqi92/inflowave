/**
 * 错误处理器
 * 提供统一的错误处理、重试机制和回退策略
 */

export type I18nErrorType =
  | 'RESOURCE_LOAD_FAILED'
  | 'TRANSLATION_KEY_MISSING'
  | 'FORMAT_ERROR'
  | 'LANGUAGE_SWITCH_FAILED'
  | 'CACHE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface I18nError {
  type: I18nErrorType;
  message: string;
  language?: string;
  key?: string;
  originalError?: Error;
  timestamp: number;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  maxRetryDelay: number;
}

export interface ErrorHandlerConfig {
  enableRetry: boolean;
  retryConfig: RetryConfig;
  enableLogging: boolean;
  enableDevWarnings: boolean;
  onError?: (error: I18nError) => void;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: I18nError[] = [];
  private maxHistorySize = 100;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableRetry: config.enableRetry !== false,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        maxRetryDelay: 10000,
        ...config.retryConfig,
      },
      enableLogging: config.enableLogging !== false,
      enableDevWarnings: config.enableDevWarnings !== false && process.env.NODE_ENV === 'development',
      onError: config.onError,
    };
  }

  /**
   * 处理错误
   */
  handleError(error: Omit<I18nError, 'timestamp'>): void {
    const fullError: I18nError = {
      ...error,
      timestamp: Date.now(),
    };

    // 添加到历史记录
    this.errorHistory.push(fullError);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // 记录错误
    if (this.config.enableLogging) {
      this.logError(fullError);
    }

    // 开发模式警告
    if (this.config.enableDevWarnings) {
      this.showDevWarning(fullError);
    }

    // 调用自定义错误处理器
    if (this.config.onError) {
      try {
        this.config.onError(fullError);
      } catch (e) {
        console.error('Error in custom error handler:', e);
      }
    }
  }

  /**
   * 带重试的异步操作
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: { type: I18nErrorType; language?: string; key?: string }
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return operation();
    }

    const { maxRetries, retryDelay, backoffMultiplier, maxRetryDelay } = this.config.retryConfig;
    let lastError: Error | undefined;
    let currentDelay = retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // 检查是否是不应该重试的错误（如 404）
        const shouldNotRetry = this.shouldNotRetry(lastError);

        // 如果是不应该重试的错误，或者是最后一次尝试失败
        if (shouldNotRetry || attempt === maxRetries) {
          // 只在非 404 错误时记录错误
          if (!shouldNotRetry) {
            this.handleError({
              type: context.type,
              message: `Failed after ${maxRetries} retries: ${lastError.message}`,
              language: context.language,
              key: context.key,
              originalError: lastError,
              context: { attempts: attempt + 1 },
            });
          }
          throw lastError;
        }

        // 记录重试
        if (this.config.enableLogging) {
          console.warn(
            `⚠️ [ErrorHandler] Retry ${attempt + 1}/${maxRetries} for ${context.type}:`,
            lastError.message
          );
        }

        // 等待后重试
        await this.delay(currentDelay);
        currentDelay = Math.min(currentDelay * backoffMultiplier, maxRetryDelay);
      }
    }

    throw lastError;
  }

  /**
   * 判断错误是否不应该重试
   */
  private shouldNotRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    // 404 错误、语法错误等不应该重试
    return (
      message.includes('404') ||
      message.includes('not found') ||
      message.includes('unexpected token') ||
      message.includes('is not valid json') ||
      message.includes('<!doctype')
    );
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): I18nError[] {
    return [...this.errorHistory];
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): I18nError[] {
    return this.errorHistory.slice(-count);
  }

  /**
   * 按类型获取错误
   */
  getErrorsByType(type: I18nErrorType): I18nError[] {
    return this.errorHistory.filter((e) => e.type === type);
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    total: number;
    byType: Record<I18nErrorType, number>;
    recentCount: number;
  } {
    const byType: Record<string, number> = {};

    for (const error of this.errorHistory) {
      byType[error.type] = (byType[error.type] || 0) + 1;
    }

    // 最近5分钟的错误
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentCount = this.errorHistory.filter((e) => e.timestamp > fiveMinutesAgo).length;

    return {
      total: this.errorHistory.length,
      byType: byType as Record<I18nErrorType, number>,
      recentCount,
    };
  }

  /**
   * 记录错误
   */
  private logError(error: I18nError): void {
    const emoji = this.getErrorEmoji(error.type);
    const timestamp = new Date(error.timestamp).toISOString();

    console.error(
      `${emoji} [I18nError] ${error.type} at ${timestamp}:`,
      error.message,
      error.context || ''
    );

    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  }

  /**
   * 显示开发模式警告
   */
  private showDevWarning(error: I18nError): void {
    if (typeof window === 'undefined') return;

    // 在开发模式下显示更明显的警告
    const warningStyle = 'background: #ff6b6b; color: white; padding: 4px 8px; border-radius: 3px;';

    console.warn(
      `%c⚠️ I18n ${error.type}`,
      warningStyle,
      '\n',
      `Message: ${error.message}`,
      error.language ? `\nLanguage: ${error.language}` : '',
      error.key ? `\nKey: ${error.key}` : ''
    );

    // 对于翻译键缺失，提供更详细的信息
    if (error.type === 'TRANSLATION_KEY_MISSING' && error.key) {
      console.warn(
        `%cMissing Translation Key`,
        'background: #ffd93d; color: black; padding: 4px 8px; border-radius: 3px;',
        `\nKey: ${error.key}`,
        `\nLanguage: ${error.language || 'unknown'}`,
        '\nAdd this key to your language resource files.'
      );
    }
  }

  /**
   * 获取错误表情符号
   */
  private getErrorEmoji(type: I18nErrorType): string {
    const emojiMap: Record<I18nErrorType, string> = {
      RESOURCE_LOAD_FAILED: '📦❌',
      TRANSLATION_KEY_MISSING: '🔑❌',
      FORMAT_ERROR: '📝❌',
      LANGUAGE_SWITCH_FAILED: '🌐❌',
      CACHE_ERROR: '💾❌',
      NETWORK_ERROR: '🌐❌',
      UNKNOWN_ERROR: '❓❌',
    };

    return emojiMap[type] || '❌';
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler({
  enableRetry: true,
  enableLogging: true,
  enableDevWarnings: process.env.NODE_ENV === 'development',
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
    maxRetryDelay: 10000,
  },
});
