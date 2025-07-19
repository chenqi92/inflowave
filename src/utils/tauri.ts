/**
 * Tauri 环境检测和兼容性工具
 */

import type { TauriCommandMap } from '@/types/tauri';

// 扩展 Window 接口以包含 Tauri 特定的属性
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检查是否在 Tauri 环境中运行
export const isTauriEnvironment = (): boolean => {
  // 多重检查确保在 Tauri 环境中
  if (typeof window === 'undefined') {
    return false;
  }

  // 检查 Tauri 特有的全局对象
  return (
    window.__TAURI__ !== undefined ||
    // 检查 Tauri API 是否可用
    (typeof window !== 'undefined' &&
     (window as any).__TAURI_INTERNALS__ !== undefined) ||
    // 检查用户代理字符串
    (typeof navigator !== 'undefined' &&
     navigator.userAgent.includes('Tauri')) ||
    // 检查是否在桌面应用环境中（非浏览器）
    (typeof window !== 'undefined' &&
     window.location.protocol === 'tauri:')
  );
};

// 检查是否在浏览器开发环境中 - 桌面应用专用，始终返回false
export const isBrowserEnvironment = (): boolean => {
  // 桌面应用专用，不支持浏览器环境
  return false;
};

// 定义返回 void 的命令列表
const VOID_COMMANDS = new Set([
  'initialize_connections',
  'update_user_preferences',
  'update_connection',
  'delete_connection',
  'connect_to_database',
  'disconnect_from_database',
  'write_file',
  'import_data',
  'perform_health_check',
  'export_analytics_report',
  'init_embedded_server_cmd',
  'stop_embedded_server_cmd',
  'restart_embedded_server_cmd',
  'update_general_settings',
  'update_editor_settings',
  'update_query_settings',
  'update_visualization_settings',
  'update_security_settings',
  'reset_settings',
  'save_app_config',
  'clear_query_history',
  'clear_optimization_history',
  'save_query_history',
  'save_optimization_history',
]);

// 类型安全的 Tauri API 调用包装器 - 使用函数重载
export function safeTauriInvoke<K extends keyof TauriCommandMap>(
  command: K,
  args?: Record<string, any>
): Promise<TauriCommandMap[K]>;
export function safeTauriInvoke<T = any>(
  command: string,
  args?: Record<string, any>
): Promise<T>;
export async function safeTauriInvoke<T = any>(
  command: string,
  args?: Record<string, any>
): Promise<T> {

  try {
    // 直接尝试调用 Tauri API，不进行环境检测
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    // 对于 void 命令，允许 null/undefined 返回值
    if (VOID_COMMANDS.has(command)) {
      // 对于 void 命令，返回 undefined 作为成功标志
      return (result === null || result === undefined ? undefined : result) as T;
    }

    // 对于其他命令，确保返回值不为 null 或 undefined
    if (result === null || result === undefined) {
      throw new Error(`Command "${command}" returned null or undefined`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Tauri invoke error for command "${command}":`, error);
    // 只有在 Tauri API 调用失败时才抛出错误，不再使用模拟数据
    throw error;
  }
}

// 可选的 Tauri API 调用包装器 - 允许返回 null
export const safeTauriInvokeOptional = async <T = any>(
  command: string,
  args?: Record<string, any>
): Promise<T | null> => {

  try {
    // 直接尝试调用 Tauri API，不进行环境检测
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    return result;
  } catch (error) {
    console.error(`❌ Tauri invoke error for command "${command}":`, error);
    // 对于可选调用，返回 null 而不是抛出错误
    return null;
  }
};

// 专门用于 void 命令的包装器
export const safeTauriInvokeVoid = async (
  command: string,
  args?: Record<string, any>
): Promise<void> => {

  try {
    // 直接尝试调用 Tauri API，不进行环境检测
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke(command, args);
    // 对于 void 命令，不检查返回值
    return;
  } catch (error) {
    console.error(`❌ Tauri invoke error for command "${command}":`, error);
    throw error;
  }
};

// 安全的 Tauri 事件监听包装器
export const safeTauriListen = async <T = any>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> => {
  console.log(`🎧 尝试设置事件监听器: "${event}"`);
  console.log(`🔍 Tauri环境检查:`, {
    isTauri: isTauriEnvironment(),
    hasWindow: typeof window !== 'undefined',
    hasTauriGlobal: typeof window !== 'undefined' && window.__TAURI__ !== undefined,
    hasTauriInternals: typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A'
  });

  // 强制尝试设置事件监听器，即使环境检测失败
  try {
    console.log(`📡 正在导入 Tauri 事件 API...`);
    const { listen } = await import('@tauri-apps/api/event');
    console.log(`✅ Tauri 事件 API 导入成功，设置监听器: "${event}"`);
    const unlisten = await listen<T>(event, handler);
    console.log(`🎯 事件监听器 "${event}" 设置成功`);
    return unlisten;
  } catch (error) {
    console.error(`❌ Tauri event listener error for event "${event}":`, error);

    // 如果不在 Tauri 环境中，返回空函数
    if (!isTauriEnvironment()) {
      console.warn(
        `⚠️ Tauri event listener "${event}" failed, likely in browser environment`
      );
      return () => {};
    }

    // 在 Tauri 环境中但失败了，重新抛出错误
    throw error;
  }
};

// 模拟数据生成器 - 已禁用，直接返回 null
const _getMockData = <T = any>(
  command: string,
  args?: Record<string, any>
): T | null => {
  console.log(`Mock data generator disabled for command: ${command}`, args);
  return null;
};

// 环境信息
export const getEnvironmentInfo = () => {
  return {
    isTauri: isTauriEnvironment(),
    isBrowser: isBrowserEnvironment(),
    userAgent:
      typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
    platform:
      typeof window !== 'undefined' ? window.navigator.platform : 'Unknown',
  };
};

// 显示环境警告 - 桌面应用专用，无需警告
export const showEnvironmentWarning = () => {
  // 桌面应用专用，无需显示浏览器环境警告
  console.log('🖥️ 桌面应用环境已初始化');
};

// 初始化环境检测 - 桌面应用专用
export const initializeEnvironment = () => {
  const envInfo = getEnvironmentInfo();

  // 桌面应用专用，始终显示桌面环境信息
  showEnvironmentWarning();

  return envInfo;
};
