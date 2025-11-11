/**
 * Tauri 环境检测和兼容性工具
 */

import i18n from 'i18next';
import type { TauriCommandMap } from '@/types/tauri';
import logger from '@/utils/logger';

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

// 检查是否在浏览器开发环境中
export const isBrowserEnvironment = (): boolean => {
  // 如果不在 Tauri 环境中，则认为在浏览器环境中
  return !isTauriEnvironment();
};

// 定义返回 void 的命令列表
const VOID_COMMANDS = new Set([
  // Connection management
  'initialize_connections',
  'update_connection',
  'delete_connection',
  'connect_to_database',
  'disconnect_from_database',
  'start_connection_monitoring',
  'stop_connection_monitoring',

  // System operations
  'cleanup_resources',
  'toggle_devtools',
  'write_file',
  'write_binary_file',
  'create_dir',
  'delete_file',
  'close_app',
  'rebuild_native_menu',

  // Settings
  'update_app_settings',
  'update_general_settings',
  'update_editor_settings',
  'update_query_settings',
  'update_visualization_settings',
  'update_security_settings',
  'update_controller_settings',
  'update_monitoring_settings',
  'export_settings',
  'update_menu_language',

  // Query history
  'delete_query_history',
  'update_saved_query',
  'delete_saved_query',

  // User preferences
  'update_user_preferences',

  // Data operations
  'import_data',
  'create_database',
  'delete_database',
  'create_influxdb2_bucket',
  'delete_influxdb2_bucket',
  'update_bucket_retention',

  // Performance monitoring
  'perform_health_check',
  'export_analytics_report',
  'start_system_monitoring',
  'stop_system_monitoring',
  'record_query_performance',

  // Embedded server
  'init_embedded_server_cmd',
  'stop_embedded_server_cmd',
  'restart_embedded_server_cmd',

  // History operations
  'clear_query_history',
  'clear_optimization_history',
  'save_query_history',
  'save_optimization_history',

  // Workspace operations
  'set_active_workspace_tab',
  'remove_tab_from_workspace',
  'clear_workspace',
  'save_tabs_to_workspace',

  // Database operations (返回 Result<(), String>)
  'create_database',
  'drop_database',
  'create_retention_policy',
  'drop_retention_policy',
  'alter_retention_policy',
  'drop_measurement',

  // S3 operations (返回 Result<(), String>)
  's3_disconnect',
  's3_create_bucket',
  's3_delete_bucket',
  's3_upload_object',
  's3_delete_object',
  's3_copy_object',
  's3_move_object',
  's3_create_folder',
  's3_put_bucket_acl',
  's3_put_bucket_policy',
  's3_put_object_acl',
  's3_put_object_tags',
  's3_delete_object_tags',

  // Legacy/deprecated
  'reset_settings',
  'save_app_config',
]);

// 类型安全的 Tauri API 调用包装器 - 使用函数重载
/* eslint-disable no-redeclare */
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
    const errorMsg: string = String((i18n.t as any)('logs:tauri.invoke_error', { command }));
    logger.error(errorMsg, error);
    // 只有在 Tauri API 调用失败时才抛出错误，不再使用模拟数据
    throw error;
  }
}
/* eslint-enable no-redeclare */

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
    const errorMsg: string = String((i18n.t as any)('logs:tauri.invoke_error', { command }));
    logger.error(errorMsg, error);
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
    const errorMsg: string = String((i18n.t as any)('logs:tauri.invoke_error', { command }));
    logger.error(errorMsg, error);
    throw error;
  }
};

// 安全的 Tauri 事件监听包装器
export const safeTauriListen = async <T = any>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> => {
  logger.info(String((i18n.t as any)('logs:tauri.event_listener_setup', { event })));
  logger.info(String((i18n.t as any)('logs:tauri.environment_check')), {
    isTauri: isTauriEnvironment(),
    hasWindow: typeof window !== 'undefined',
    hasTauriGlobal: typeof window !== 'undefined' && window.__TAURI__ !== undefined,
    hasTauriInternals: typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    protocol: typeof window !== 'undefined' ? window.location.protocol : 'N/A'
  });

  // 强制尝试设置事件监听器，即使环境检测失败
  try {
    const { listen } = await import('@tauri-apps/api/event');
    logger.info(String((i18n.t as any)('logs:tauri.api_import_success')));
    const unlisten = await listen<T>(event, handler);
    return unlisten;
  } catch (error) {
    const errorMsg: string = String((i18n.t as any)('logs:tauri.invoke_error', { command: event }));
    logger.error(errorMsg, error);

    // 如果不在 Tauri 环境中，返回空函数
    if (!isTauriEnvironment()) {
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
  logger.info(`Mock data generator disabled for command: ${command}`, args);
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
  logger.info(String((i18n.t as any)('logs:system.initialized')));
};

// 初始化环境检测 - 桌面应用专用
export const initializeEnvironment = () => {
  const envInfo = getEnvironmentInfo();

  // 桌面应用专用，始终显示桌面环境信息
  showEnvironmentWarning();

  return envInfo;
};
