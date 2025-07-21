/**
 * ID生成器工具
 * 提供唯一ID生成方法，避免重复key错误
 */

let counter = 0;

/**
 * 生成唯一ID
 * @param prefix 前缀
 * @returns 唯一ID字符串
 */
export function generateUniqueId(prefix: string = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成简短的唯一ID（不包含时间戳）
 * @param prefix 前缀
 * @returns 简短的唯一ID
 */
export function generateShortId(prefix: string = 'id'): string {
  counter += 1;
  return `${prefix}-${counter}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * 生成基于时间戳的ID（用于需要时间排序的场景）
 * @param prefix 前缀
 * @returns 时间戳ID
 */
export function generateTimestampId(prefix: string = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/**
 * 重置计数器（测试用）
 */
export function resetCounter(): void {
  counter = 0;
}