/**
 * 翻译助手 - 用于非React组件中的翻译
 *
 * 这个文件提供了一个可以在纯TypeScript/JavaScript代码中使用的翻译函数，
 * 不依赖于React hooks
 */

import i18n from 'i18next';

/**
 * 翻译函数 - 可在非React组件中使用
 * @param key 翻译键，支持命名空间格式 "namespace:key"
 * @param options 可选参数，包括插值变量
 * @returns 翻译后的字符串
 */
export const t = (key: string, options?: Record<string, any>): string => {
  try {
    return i18n.t(key as any, options as any) as string;
  } catch (error) {
    console.warn(`Translation failed for key: ${key}`, error);
    return options?.defaultValue || key;
  }
};

/**
 * 带命名空间的翻译函数
 * @param namespace 命名空间
 * @param key 翻译键
 * @param options 可选参数
 * @returns 翻译后的字符串
 */
export const tNs = (namespace: string, key: string, options?: Record<string, any>): string => {
  return t(`${namespace}:${key}`, options);
};

/**
 * 错误翻译函数
 * @param key 错误翻译键
 * @param options 可选参数
 * @returns 翻译后的错误消息
 */
export const tError = (key: string, options?: Record<string, any>): string => {
  return tNs('errors', key, options);
};

/**
 * 连接错误消息翻译函数
 * 根据后端返回的错误消息，匹配并返回翻译后的友好错误信息
 * @param errorMessage 后端返回的原始错误消息
 * @returns 翻译后的错误消息
 */
export const translateConnectionError = (errorMessage: string): string => {
  if (!errorMessage) {
    return tNs('connections', 'error_messages.connection_failed_generic');
  }

  // 按优先级匹配错误类型
  if (errorMessage.includes('创建客户端失败') || errorMessage.includes('Failed to create client')) {
    return tNs('connections', 'error_messages.create_client_failed');
  }

  if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('服务不可用')) {
    return tNs('connections', 'error_messages.service_unavailable');
  }

  if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('认证失败')) {
    return tNs('connections', 'error_messages.authentication_failed');
  }

  if (errorMessage.includes('timeout') || errorMessage.includes('超时') || errorMessage.includes('连接超时')) {
    return tNs('connections', 'error_messages.connection_timeout');
  }

  if (errorMessage.includes('refused') || errorMessage.includes('拒绝') || errorMessage.includes('连接被拒绝')) {
    return tNs('connections', 'error_messages.connection_refused');
  }

  if (errorMessage.includes('unreachable') || errorMessage.includes('不可达') || errorMessage.includes('服务器不可达')) {
    return tNs('connections', 'error_messages.host_unreachable');
  }

  // 如果没有匹配到，返回原始消息
  return errorMessage;
};

export default t;
