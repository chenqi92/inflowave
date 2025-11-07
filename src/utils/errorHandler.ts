/**
 * 统一错误处理工具
 * 提供错误分类、友好化、恢复建议生成等功能
 */

import {
  ErrorCategory,
  ErrorSeverity,
  ErrorDetails,
  ErrorHandlingResult,
  RecoverySuggestion,
  COMMON_ERROR_PATTERNS,
  ERROR_MESSAGES,
} from '@/types/error';
import { errorLogger } from './errorLogger';
import logger from '@/utils/logger';

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 分析错误并生成详细信息
   */
  public analyzeError(error: Error | unknown, context?: Record<string, any>): ErrorDetails {
    const errorMessage = this.extractErrorMessage(error);
    const category = this.categorizeError(errorMessage);
    const severity = this.determineSeverity(category, errorMessage);
    const suggestions = this.generateSuggestions(category, errorMessage);
    const friendlyMessage = this.generateFriendlyMessage(category, errorMessage);

    return {
      category,
      severity,
      originalError: error,
      message: errorMessage,
      friendlyMessage,
      suggestions,
      context,
      timestamp: Date.now(),
      stack: error instanceof Error ? error.stack : undefined,
    };
  }

  /**
   * 处理错误
   */
  public async handleError(
    error: Error | unknown,
    options: {
      context?: Record<string, any>;
      shouldDisplay?: boolean;
      shouldLog?: boolean;
      customSuggestions?: RecoverySuggestion[];
    } = {}
  ): Promise<ErrorHandlingResult> {
    const {
      context,
      shouldDisplay = true,
      shouldLog = true,
      customSuggestions,
    } = options;

    // 分析错误
    const details = this.analyzeError(error, context);

    // 添加自定义建议
    if (customSuggestions && customSuggestions.length > 0) {
      details.suggestions = [
        ...(details.suggestions || []),
        ...customSuggestions,
      ];
    }

    // 记录日志
    if (shouldLog) {
      await this.logError(details);
    }

    return {
      handled: true,
      shouldDisplay,
      details,
      shouldLog,
    };
  }

  /**
   * 提取错误消息
   */
  private extractErrorMessage(error: Error | unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error && typeof error === 'object') {
      // 尝试从常见的错误对象结构中提取消息
      const errorObj = error as any;
      return (
        errorObj.message ||
        errorObj.error ||
        errorObj.msg ||
        JSON.stringify(error)
      );
    }

    return '未知错误';
  }

  /**
   * 分类错误
   */
  private categorizeError(errorMessage: string): ErrorCategory {
    // 遍历常见错误模式
    for (const pattern of COMMON_ERROR_PATTERNS) {
      const regex =
        typeof pattern.pattern === 'string'
          ? new RegExp(pattern.pattern, 'i')
          : pattern.pattern;

      if (regex.test(errorMessage)) {
        return pattern.category;
      }
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(
    category: ErrorCategory,
    errorMessage: string
  ): ErrorSeverity {
    // 首先检查错误模式中是否指定了严重程度
    for (const pattern of COMMON_ERROR_PATTERNS) {
      const regex =
        typeof pattern.pattern === 'string'
          ? new RegExp(pattern.pattern, 'i')
          : pattern.pattern;

      if (regex.test(errorMessage) && pattern.severity) {
        return pattern.severity;
      }
    }

    // 根据类别确定默认严重程度
    switch (category) {
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL;
      case ErrorCategory.DATABASE_CONNECTION:
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.NETWORK:
        return ErrorSeverity.ERROR;
      case ErrorCategory.PERMISSION:
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.WARNING;
      default:
        return ErrorSeverity.ERROR;
    }
  }

  /**
   * 生成恢复建议
   */
  private generateSuggestions(
    category: ErrorCategory,
    errorMessage: string
  ): RecoverySuggestion[] {
    // 首先尝试从错误模式中获取建议
    for (const pattern of COMMON_ERROR_PATTERNS) {
      const regex =
        typeof pattern.pattern === 'string'
          ? new RegExp(pattern.pattern, 'i')
          : pattern.pattern;

      if (regex.test(errorMessage)) {
        return pattern.suggestions;
      }
    }

    // 如果没有匹配的模式，返回通用建议
    return this.getDefaultSuggestions(category);
  }

  /**
   * 获取默认恢复建议
   */
  private getDefaultSuggestions(category: ErrorCategory): RecoverySuggestion[] {
    const commonSuggestions: RecoverySuggestion[] = [
      {
        title: '重试操作',
        description: '问题可能是暂时的，请尝试重新执行操作',
        icon: 'refresh',
      },
      {
        title: '查看日志',
        description: '查看详细的错误日志以获取更多信息',
        icon: 'file-text',
      },
      {
        title: '联系支持',
        description: '如果问题持续存在，请联系技术支持',
        icon: 'help-circle',
      },
    ];

    switch (category) {
      case ErrorCategory.NETWORK:
        return [
          {
            title: '检查网络连接',
            description: '确保您的设备已连接到互联网',
            icon: 'wifi',
          },
          ...commonSuggestions,
        ];

      case ErrorCategory.DATABASE_CONNECTION:
        return [
          {
            title: '检查连接配置',
            description: '确认数据库连接参数是否正确',
            icon: 'settings',
          },
          {
            title: '测试连接',
            description: '使用连接测试功能验证配置',
            icon: 'activity',
          },
          ...commonSuggestions,
        ];

      case ErrorCategory.AUTHENTICATION:
        return [
          {
            title: '检查凭据',
            description: '确认用户名和密码是否正确',
            icon: 'key',
          },
          ...commonSuggestions,
        ];

      default:
        return commonSuggestions;
    }
  }

  /**
   * 生成友好的错误消息
   */
  private generateFriendlyMessage(
    category: ErrorCategory,
    errorMessage: string
  ): string {
    // 首先尝试从错误模式中获取友好消息
    for (const pattern of COMMON_ERROR_PATTERNS) {
      const regex =
        typeof pattern.pattern === 'string'
          ? new RegExp(pattern.pattern, 'i')
          : pattern.pattern;

      if (regex.test(errorMessage)) {
        return pattern.friendlyMessage;
      }
    }

    // 如果没有匹配的模式，返回默认消息
    const template = ERROR_MESSAGES[category];
    return template ? template.defaultMessage : errorMessage;
  }

  /**
   * 记录错误日志
   */
  private async logError(details: ErrorDetails): Promise<void> {
    try {
      await errorLogger.logCustomError(details.message, {
        category: details.category,
        severity: details.severity,
        friendlyMessage: details.friendlyMessage,
        suggestions: details.suggestions?.map(s => s.title),
        context: details.context,
        stack: details.stack,
      });
    } catch (logError) {
      logger.error('Failed to log error:', logError);
    }
  }

  /**
   * 格式化错误用于显示
   */
  public formatErrorForDisplay(details: ErrorDetails): {
    title: string;
    message: string;
    description?: string;
    suggestions: RecoverySuggestion[];
  } {
    const template = ERROR_MESSAGES[details.category];

    return {
      title: template?.title || '错误',
      message: details.friendlyMessage || details.message,
      description: details.technicalDetails,
      suggestions: details.suggestions || [],
    };
  }

  /**
   * 判断错误是否应该显示给用户
   */
  public shouldDisplayError(details: ErrorDetails): boolean {
    // 信息级别的错误通常不需要显示
    if (details.severity === ErrorSeverity.INFO) {
      return false;
    }

    // 其他级别的错误都应该显示
    return true;
  }

  /**
   * 判断错误是否应该记录日志
   */
  public shouldLogError(details: ErrorDetails): boolean {
    // 所有错误都应该记录日志
    return true;
  }
}

// 导出单例
export const errorHandler = new ErrorHandler();

// 导出便捷函数
export const analyzeError = (error: Error | unknown, context?: Record<string, any>) =>
  errorHandler.analyzeError(error, context);

export const handleError = (
  error: Error | unknown,
  options?: Parameters<typeof errorHandler.handleError>[1]
) => errorHandler.handleError(error, options);

export const formatErrorForDisplay = (details: ErrorDetails) =>
  errorHandler.formatErrorForDisplay(details);

