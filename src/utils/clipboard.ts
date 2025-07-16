/**
 * 安全的剪贴板操作工具
 * 处理浏览器权限问题和兼容性
 */

import { showMessage } from './message';
import { isBrowserEnvironment } from './tauri';

export interface ClipboardOptions {
  showSuccess?: boolean;
  showError?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * 安全地写入剪贴板
 * @param text 要写入的文本
 * @param options 配置选项
 */
export async function writeToClipboard(
  text: string,
  options: ClipboardOptions = {}
): Promise<boolean> {
  const {
    showSuccess = true,
    showError = true,
    successMessage = '已复制到剪贴板',
    errorMessage = '复制失败',
  } = options;

  try {
    // 检查是否在浏览器环境中
    if (isBrowserEnvironment()) {
      // 现代浏览器的 Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          if (showSuccess) {
            showMessage.success(successMessage);
          }
          return true;
        } catch (clipboardError) {
          // 如果 Clipboard API 失败，尝试降级方案
          console.warn(
            'Clipboard API failed, trying fallback:',
            clipboardError
          );
          return tryFallbackCopy(text, options);
        }
      } else {
        // 浏览器不支持 Clipboard API，使用降级方案
        return tryFallbackCopy(text, options);
      }
    } else {
      // 在 Tauri 环境中，可以使用 Tauri 的 API
      // 这里先使用浏览器的 API，后续可以集成 Tauri 的剪贴板 API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        if (showSuccess) {
          showMessage.success(successMessage);
        }
        return true;
      } else {
        return tryFallbackCopy(text, options);
      }
    }
  } catch (error) {
    console.error('Clipboard write failed:', error);
    if (showError) {
      showMessage.error(`${errorMessage}: ${error}`);
    }
    return false;
  }
}

/**
 * 降级的复制方案 - 使用传统的 document.execCommand
 * @param text 要复制的文本
 * @param options 配置选项
 */
function tryFallbackCopy(text: string, options: ClipboardOptions): boolean {
  const {
    showSuccess = true,
    showError = true,
    successMessage = '已复制到剪贴板',
    errorMessage = '复制失败',
  } = options;

  try {
    // 创建临时文本区域
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // 设置样式使其不可见
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';

    document.body.appendChild(textArea);

    // 选择文本
    textArea.focus();
    textArea.select();

    // 尝试复制
    const success = document.execCommand('copy');

    // 清理临时元素
    document.body.removeChild(textArea);

    if (success) {
      if (showSuccess) {
        showMessage.success(successMessage);
      }
      return true;
    } else {
      throw new Error('execCommand failed');
    }
  } catch (error) {
    console.error('Fallback copy failed:', error);
    if (showError) {
      showMessage.error(`${errorMessage}: 请手动复制文本`);
    }
    return false;
  }
}

/**
 * 尝试读取剪贴板内容
 * @returns 剪贴板文本内容或 null
 */
export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    } else {
      // 浏览器不支持读取剪贴板
      showMessage.warning('当前浏览器不支持读取剪贴板');
      return null;
    }
  } catch (error) {
    console.error('Clipboard read failed:', error);
    // 不显示错误消息，因为读取失败是常见的（权限问题）
    return null;
  }
}

/**
 * 检查是否支持剪贴板操作
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

/**
 * 请求剪贴板权限（如果需要）
 */
export async function requestClipboardPermission(): Promise<boolean> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permission = await navigator.permissions.query({
        name: 'clipboard-write' as any,
      });
      return permission.state === 'granted';
    }
    return true; // 假设有权限
  } catch (error) {
    console.warn('Permission check failed:', error);
    return true; // 假设有权限
  }
}

// 导出便捷方法
export const clipboard = {
  write: writeToClipboard,
  read: readFromClipboard,
  isSupported: isClipboardSupported,
  requestPermission: requestClipboardPermission,
};
