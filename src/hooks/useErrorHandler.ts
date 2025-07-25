/**
 * 统一错误处理 Hook
 * 提供一致的错误处理逻辑和用户体验
 */

import { useCallback } from 'react';
import { showMessage } from '@/utils/message';
import {
  getInfluxDBQueryError,
  getDatabaseConnectionError,
  getDataImportExportError,
  getSystemResourceError,
  getUIInteractionError,
  getExtensionError,
  getSecurityError,
  getApplicationError,
  getFileOperationError,
  getNetworkError,
  getPortDiscoveryError,
  getUserPreferencesError,
  formatErrorMessage,
  type UserFriendlyError
} from '@/utils/userFriendlyErrors';

export type ErrorContext = 
  | 'query'
  | 'connection'
  | 'import'
  | 'export'
  | 'system'
  | 'ui'
  | 'extension'
  | 'security'
  | 'application'
  | 'file'
  | 'network'
  | 'port'
  | 'preferences';

export interface ErrorHandlerOptions {
  /** 是否显示错误通知，默认为 true */
  showNotification?: boolean;
  /** 错误上下文，用于选择合适的错误处理策略 */
  context?: ErrorContext;
  /** 错误子类型，提供更精确的错误分类 */
  subType?: string;
  /** 额外的上下文信息 */
  contextInfo?: string;
  /** 自定义错误处理回调 */
  onError?: (error: UserFriendlyError) => void;
}

export const useErrorHandler = () => {
  /**
   * 处理错误的核心方法
   */
  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ): UserFriendlyError => {
    const {
      showNotification = true,
      context = 'application',
      subType,
      contextInfo,
      onError
    } = options;

    const errorString = error instanceof Error ? error.message : String(error);
    let friendlyError: UserFriendlyError;

    // 根据上下文选择合适的错误处理器
    switch (context) {
      case 'query':
        friendlyError = getInfluxDBQueryError(errorString);
        break;
        
      case 'connection':
        friendlyError = getDatabaseConnectionError(errorString);
        break;
        
      case 'import':
        friendlyError = getDataImportExportError(errorString, 'import', subType as any);
        break;
        
      case 'export':
        friendlyError = getDataImportExportError(errorString, 'export', subType as any);
        break;
        
      case 'system':
        const resourceType = (subType as 'memory' | 'cpu' | 'disk' | 'network') || 'memory';
        friendlyError = getSystemResourceError(resourceType, undefined, undefined, contextInfo);
        break;
        
      case 'ui':
        const interactionType = (subType as 'form' | 'drag' | 'chart' | 'theme' | 'layout' | 'component') || 'component';
        friendlyError = getUIInteractionError(interactionType, errorString, contextInfo);
        break;
        
      case 'extension':
        const extensionContext = (subType as 'load' | 'install' | 'uninstall' | 'dependency' | 'version' | 'permission' | 'api') || 'load';
        friendlyError = getExtensionError(errorString, extensionContext);
        break;
        
      case 'security':
        const securityContext = (subType as 'session' | 'permission' | 'certificate' | 'token' | 'authentication' | 'authorization') || 'authentication';
        friendlyError = getSecurityError(errorString, securityContext);
        break;
        
      case 'application':
        const appContext = (subType as 'startup' | 'shutdown' | 'update' | 'config' | 'migration' | 'backup') || 'startup';
        friendlyError = getApplicationError(errorString, appContext);
        break;
        
      case 'file':
        const fileOperation = (subType as 'read' | 'write' | 'select' | 'save') || 'read';
        friendlyError = getFileOperationError(errorString, fileOperation);
        break;
        
      case 'network':
        friendlyError = getNetworkError(errorString);
        break;
        
      case 'port':
        friendlyError = getPortDiscoveryError(errorString);
        break;
        
      case 'preferences':
        const prefOperation = (subType as 'load' | 'save') || 'load';
        friendlyError = getUserPreferencesError(errorString, prefOperation);
        break;
        
      default:
        friendlyError = {
          title: '未知错误',
          message: '发生了未知错误',
          suggestion: '请重试或联系技术支持'
        };
    }

    // 记录原始错误到控制台
    console.error(`[${context}] ${friendlyError.title}:`, error);

    // 显示用户友好的错误通知
    if (showNotification) {
      showMessage.error(formatErrorMessage(friendlyError));
    }

    // 执行自定义错误处理回调
    if (onError) {
      onError(friendlyError);
    }

    return friendlyError;
  }, []);

  /**
   * 查询相关错误处理
   */
  const handleQueryError = useCallback((error: unknown, options?: Omit<ErrorHandlerOptions, 'context'>) => {
    return handleError(error, { ...options, context: 'query' });
  }, [handleError]);

  /**
   * 数据库连接错误处理
   */
  const handleConnectionError = useCallback((error: unknown, options?: Omit<ErrorHandlerOptions, 'context'>) => {
    return handleError(error, { ...options, context: 'connection' });
  }, [handleError]);

  /**
   * 数据导入错误处理
   */
  const handleImportError = useCallback((error: unknown, options?: Omit<ErrorHandlerOptions, 'context'>) => {
    return handleError(error, { ...options, context: 'import' });
  }, [handleError]);

  /**
   * 数据导出错误处理
   */
  const handleExportError = useCallback((error: unknown, options?: Omit<ErrorHandlerOptions, 'context'>) => {
    return handleError(error, { ...options, context: 'export' });
  }, [handleError]);

  /**
   * 系统资源错误处理
   */
  const handleSystemError = useCallback((error: unknown, resourceType?: 'memory' | 'cpu' | 'disk' | 'network', options?: Omit<ErrorHandlerOptions, 'context' | 'subType'>) => {
    return handleError(error, { ...options, context: 'system', subType: resourceType });
  }, [handleError]);

  /**
   * UI交互错误处理
   */
  const handleUIError = useCallback((error: unknown, interactionType?: 'form' | 'drag' | 'chart' | 'theme' | 'layout' | 'component', options?: Omit<ErrorHandlerOptions, 'context' | 'subType'>) => {
    return handleError(error, { ...options, context: 'ui', subType: interactionType });
  }, [handleError]);

  /**
   * 扩展/插件错误处理
   */
  const handleExtensionError = useCallback((error: unknown, extensionContext?: 'load' | 'install' | 'uninstall' | 'dependency' | 'version' | 'permission' | 'api', options?: Omit<ErrorHandlerOptions, 'context' | 'subType'>) => {
    return handleError(error, { ...options, context: 'extension', subType: extensionContext });
  }, [handleError]);

  /**
   * 安全相关错误处理
   */
  const handleSecurityError = useCallback((error: unknown, securityContext?: 'session' | 'permission' | 'certificate' | 'token' | 'authentication' | 'authorization', options?: Omit<ErrorHandlerOptions, 'context' | 'subType'>) => {
    return handleError(error, { ...options, context: 'security', subType: securityContext });
  }, [handleError]);

  /**
   * 文件操作错误处理
   */
  const handleFileError = useCallback((error: unknown, operation?: 'read' | 'write' | 'select' | 'save', options?: Omit<ErrorHandlerOptions, 'context' | 'subType'>) => {
    return handleError(error, { ...options, context: 'file', subType: operation });
  }, [handleError]);

  /**
   * 静默错误处理（不显示通知，仅记录日志）
   */
  const handleSilentError = useCallback((error: unknown, context?: ErrorContext) => {
    return handleError(error, { showNotification: false, context });
  }, [handleError]);

  return {
    handleError,
    handleQueryError,
    handleConnectionError,
    handleImportError,
    handleExportError,
    handleSystemError,
    handleUIError,
    handleExtensionError,
    handleSecurityError,
    handleFileError,
    handleSilentError,
  };
};

export default useErrorHandler;