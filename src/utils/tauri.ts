/**
 * Tauri 环境检测和兼容性工具
 */

// 扩展 Window 接口以包含 Tauri 特定的属性
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检查是否在 Tauri 环境中运行
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         window.__TAURI__ !== undefined;
};

// 检查是否在浏览器开发环境中
export const isBrowserEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         window.__TAURI__ === undefined;
};

// 安全的 Tauri API 调用包装器
export const safeTauriInvoke = async <T = any>(
  command: string,
  args?: Record<string, any>
): Promise<T | null> => {
  console.log(`🚀 API 调用: ${command}`, { args });

  try {
    // 直接尝试调用 Tauri API，不进行环境检测
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    console.log(`✅ Tauri API 返回结果 (${command}):`, result);
    return result;
  } catch (error) {
    console.error(`❌ Tauri invoke error for command "${command}":`, error);
    // 只有在 Tauri API 调用失败时才抛出错误，不再使用模拟数据
    throw error;
  }
};

// 安全的 Tauri 事件监听包装器
export const safeTauriListen = async <T = any>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> => {
  if (!isTauriEnvironment()) {
    console.warn(`Tauri event listener "${event}" called in browser environment, using mock handler`);
    // 返回一个空的取消监听函数
    return () => {};
  }

  try {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<T>(event, handler);
    return unlisten;
  } catch (error) {
    console.error(`Tauri event listener error for event "${event}":`, error);
    // 返回一个空的取消监听函数
    return () => {};
  }
};

// 模拟数据生成器 - 已禁用，直接返回 null
const _getMockData = <T = any>(command: string, args?: Record<string, any>): T | null => {
  console.log(`Mock data generator disabled for command: ${command}`, args);
  return null;
};

// 环境信息
export const getEnvironmentInfo = () => {
  return {
    isTauri: isTauriEnvironment(),
    isBrowser: isBrowserEnvironment(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
    platform: typeof window !== 'undefined' ? window.navigator.platform : 'Unknown'
  };
};

// 显示环境警告
export const showEnvironmentWarning = () => {
  if (isBrowserEnvironment()) {
    console.warn(
      '%c🌐 浏览器开发模式',
      'color: #ff9800; font-size: 14px; font-weight: bold;',
      '\n当前在浏览器中运行，Tauri API 不可用。\n正在使用模拟数据进行开发。\n要体验完整功能，请使用 `npm run tauri:dev` 启动。'
    );
  }
};

// 初始化环境检测
export const initializeEnvironment = () => {
  const envInfo = getEnvironmentInfo();
  
  console.log('🔍 环境信息:', envInfo);
  
  if (envInfo.isBrowser) {
    showEnvironmentWarning();
  }
  
  return envInfo;
};
