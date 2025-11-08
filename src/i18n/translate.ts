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

export default t;
