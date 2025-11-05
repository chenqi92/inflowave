/**
 * 外部链接工具函数
 * 统一处理应用中的外部链接打开行为，确保在系统默认浏览器中打开
 */

import { logger } from '@/utils/logger';
import { showMessage } from '@/utils/message';

/**
 * 外部链接打开选项
 */
export interface OpenExternalLinkOptions {
  /** 是否显示成功消息 */
  showSuccessMessage?: boolean;
  /** 自定义成功消息 */
  successMessage?: string;
  /** 是否显示错误消息 */
  showErrorMessage?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 超时时间（毫秒），默认3000 */
  timeout?: number;
}

/**
 * 外部链接打开结果
 */
export interface OpenExternalLinkResult {
  /** 是否成功打开 */
  success: boolean;
  /** 使用的方法 */
  method: 'tauri-shell' | 'window-open' | 'fallback';
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 检测是否在 Tauri 环境中
 */
const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
};

/**
 * 验证 URL 格式
 */
const isValidUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 使用 window.open 打开链接（降级方案）
 */
const openWithWindowOpen = (url: string): boolean => {
  try {
    if (typeof window !== 'undefined' && window.open) {
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      return opened !== null;
    }
    return false;
  } catch (error) {
    logger.error('window.open 打开链接失败:', error);
    return false;
  }
};

/**
 * 在系统默认浏览器中打开外部链接
 * 
 * @param url - 要打开的URL
 * @param options - 可选配置
 * @returns Promise<OpenExternalLinkResult> - 打开结果
 * 
 * @example
 * ```typescript
 * // 基本使用
 * await openExternalLink('https://github.com/chenqi92/inflowave');
 * 
 * // 带自定义消息
 * await openExternalLink('https://github.com/chenqi92/inflowave', {
 *   showSuccessMessage: true,
 *   successMessage: '正在打开GitHub项目页面',
 *   showErrorMessage: true,
 *   errorMessage: '打开GitHub页面失败'
 * });
 * ```
 */
export async function openExternalLink(
  url: string,
  options: OpenExternalLinkOptions = {}
): Promise<OpenExternalLinkResult> {
  const {
    showSuccessMessage = false,
    successMessage = '正在打开链接',
    showErrorMessage = true,
    errorMessage = '打开链接失败',
    timeout = 3000,
  } = options;

  // 记录开始时间
  const startTime = Date.now();

  // 验证 URL
  if (!isValidUrl(url)) {
    const error = 'URL 格式无效或为空';
    logger.error('打开外部链接失败:', error, { url });
    
    if (showErrorMessage) {
      showMessage.error(`${errorMessage}: ${error}`);
    }
    
    return {
      success: false,
      method: 'window-open',
      error,
    };
  }

  logger.info('尝试打开外部链接:', url);

  try {
    // 检测环境并选择合适的打开方式
    if (isTauriEnvironment()) {
      logger.debug('检测到 Tauri 环境，使用 shell.open API');

      try {
        // 使用 Tauri shell API 打开链接
        const { open } = await import('@tauri-apps/plugin-shell');

        // shell.open 在 Tauri 中是异步的，但不会返回结果
        // 它会直接在系统默认浏览器中打开链接
        await open(url);

        const duration = Date.now() - startTime;
        logger.info(`外部链接已通过 Tauri shell 打开 (${duration}ms):`, url);

        if (showSuccessMessage) {
          showMessage.success(successMessage);
        }

        return {
          success: true,
          method: 'tauri-shell',
        };
      } catch (tauriError) {
        // Tauri API 失败
        const errorMsg = tauriError instanceof Error ? tauriError.message : String(tauriError);
        logger.error('Tauri shell.open 失败:', errorMsg);

        if (showErrorMessage) {
          showMessage.error(`${errorMessage}: ${errorMsg}`);
        }

        return {
          success: false,
          method: 'tauri-shell',
          error: errorMsg,
        };
      }
    } else {
      // 浏览器环境，直接使用 window.open
      logger.debug('检测到浏览器环境，使用 window.open');
      
      const success = openWithWindowOpen(url);
      
      if (success) {
        const duration = Date.now() - startTime;
        logger.info(`外部链接已通过 window.open 打开 (${duration}ms):`, url);
        
        if (showSuccessMessage) {
          showMessage.success(successMessage);
        }
        
        return {
          success: true,
          method: 'window-open',
        };
      }
      
      throw new Error('window.open 打开失败');
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    logger.error(`打开外部链接失败 (${duration}ms):`, errorMsg, { url });
    
    if (showErrorMessage) {
      showMessage.error(`${errorMessage}: ${errorMsg}`);
    }
    
    return {
      success: false,
      method: isTauriEnvironment() ? 'tauri-shell' : 'window-open',
      error: errorMsg,
    };
  }
}

/**
 * 便捷方法：打开 GitHub 仓库
 */
export async function openGitHubRepo(repoUrl: string): Promise<OpenExternalLinkResult> {
  return openExternalLink(repoUrl, {
    showSuccessMessage: true,
    successMessage: '正在打开 GitHub 项目页面',
    showErrorMessage: true,
    errorMessage: '打开 GitHub 页面失败',
  });
}

/**
 * 便捷方法：打开问题报告页面
 */
export async function openIssueReport(issueUrl: string): Promise<OpenExternalLinkResult> {
  return openExternalLink(issueUrl, {
    showSuccessMessage: false,
    showErrorMessage: true,
    errorMessage: '无法打开反馈页面',
  });
}

/**
 * 便捷方法：打开文档链接
 */
export async function openDocumentation(docUrl: string): Promise<OpenExternalLinkResult> {
  return openExternalLink(docUrl, {
    showSuccessMessage: false,
    showErrorMessage: true,
    errorMessage: '无法打开文档页面',
  });
}
