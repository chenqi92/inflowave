/**
 * 桌面应用剪贴板操作工具
 * 使用Tauri原生API，无浏览器权限问题
 */

import { showMessage } from './message';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

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
    // 直接使用 Tauri 的剪贴板API - 桌面应用无权限问题
    await writeText(text);
    if (showSuccess) {
      showMessage.success(successMessage);
    }
    return true;
  } catch (error) {
    console.error('Tauri clipboard write failed:', error);
    if (showError) {
      showMessage.error(`${errorMessage}: ${error}`);
    }
    return false;
  }
}

/**
 * 安全地读取剪贴板
 * @param options 配置选项
 */
export async function readFromClipboard(
  options: ClipboardOptions = {}
): Promise<string | null> {
  const {
    showError = true,
    errorMessage = '读取剪贴板失败',
  } = options;

  try {
    // 直接使用 Tauri 的剪贴板API - 桌面应用无权限问题
    const text = await readText();
    return text;
  } catch (error) {
    console.error('Tauri clipboard read failed:', error);
    if (showError) {
      showMessage.error(`${errorMessage}: ${error}`);
    }
    return null;
  }
}





/**
 * 检查是否支持剪贴板操作 - 桌面应用始终支持
 */
export function isClipboardSupported(): boolean {
  return true;
}

/**
 * 请求剪贴板权限 - 桌面应用无需权限
 */
export async function requestClipboardPermission(): Promise<boolean> {
  return true;
}

// 导出便捷方法
export const clipboard = {
  write: writeToClipboard,
  read: readFromClipboard,
  isSupported: isClipboardSupported,
  requestPermission: requestClipboardPermission,
};
