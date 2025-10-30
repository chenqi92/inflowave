/**
 * 加载超时处理工具
 * 提供加载操作的超时检测和处理
 */

import { toast } from 'sonner';

/**
 * 超时配置
 */
export interface TimeoutConfig {
  /** 超时时间（毫秒） */
  timeout: number;
  /** 超时提示消息 */
  message?: string;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 是否在超时后抛出错误 */
  throwOnTimeout?: boolean;
}

/**
 * 超时错误
 */
export class TimeoutError extends Error {
  constructor(message: string = '操作超时') {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * 带超时的 Promise 包装器
 */
export function withTimeout<T>(
  promise: Promise<T>,
  config: TimeoutConfig
): Promise<T> {
  const {
    timeout,
    message = '操作超时，请重试',
    onTimeout,
    throwOnTimeout = true,
  } = config;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      toast.dismiss(); // 清除所有现有消息，避免位置叠加
      toast.warning(message);

      if (throwOnTimeout) {
        reject(new TimeoutError(message));
      }
    }, timeout);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 带重试的超时 Promise
 */
export interface RetryConfig extends TimeoutConfig {
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟（毫秒） */
  retryDelay?: number;
  /** 重试回调 */
  onRetry?: (attempt: number) => void;
}

export async function withTimeoutAndRetry<T>(
  promiseFn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    ...timeoutConfig
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        if (onRetry) {
          onRetry(attempt);
        }
        toast.info(`正在重试... (${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      return await withTimeout(promiseFn(), timeoutConfig);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果不是超时错误，直接抛出
      if (!(error instanceof TimeoutError) && attempt === 0) {
        throw error;
      }

      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('操作失败');
}

/**
 * 超时管理器
 */
export class TimeoutManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * 启动超时计时器
   */
  start(
    key: string,
    timeout: number,
    callback: () => void,
    message?: string
  ): void {
    // 清除已存在的计时器
    this.clear(key);

    // 记录开始时间
    this.startTimes.set(key, Date.now());

    // 创建新的计时器
    const timer = setTimeout(() => {
      if (message) {
        toast.dismiss(); // 清除所有现有消息，避免位置叠加
        toast.warning(message);
      }
      callback();
      this.clear(key);
    }, timeout);

    this.timers.set(key, timer);
  }

  /**
   * 清除超时计时器
   */
  clear(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
    this.startTimes.delete(key);
  }

  /**
   * 清除所有计时器
   */
  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.startTimes.clear();
  }

  /**
   * 获取已用时间
   */
  getElapsedTime(key: string): number {
    const startTime = this.startTimes.get(key);
    if (!startTime) return 0;
    return Date.now() - startTime;
  }

  /**
   * 检查是否存在计时器
   */
  has(key: string): boolean {
    return this.timers.has(key);
  }

  /**
   * 获取活跃的计时器数量
   */
  get activeCount(): number {
    return this.timers.size;
  }
}

/**
 * 全局超时管理器实例
 */
export const globalTimeoutManager = new TimeoutManager();

/**
 * 加载超时装饰器（用于类方法）
 */
export function LoadingTimeout(config: TimeoutConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return withTimeout(originalMethod.apply(this, args), config);
    };

    return descriptor;
  };
}

/**
 * 批量操作超时管理
 */
export class BatchTimeoutManager {
  private manager: TimeoutManager;
  private batchKey: string;
  private itemTimeouts: Map<string, number> = new Map();

  constructor(batchKey: string) {
    this.manager = new TimeoutManager();
    this.batchKey = batchKey;
  }

  /**
   * 添加批量项
   */
  addItem(itemKey: string, timeout: number, onTimeout: () => void): void {
    const fullKey = `${this.batchKey}:${itemKey}`;
    this.itemTimeouts.set(itemKey, timeout);
    this.manager.start(fullKey, timeout, onTimeout);
  }

  /**
   * 完成批量项
   */
  completeItem(itemKey: string): void {
    const fullKey = `${this.batchKey}:${itemKey}`;
    this.manager.clear(fullKey);
    this.itemTimeouts.delete(itemKey);
  }

  /**
   * 获取批量项已用时间
   */
  getItemElapsedTime(itemKey: string): number {
    const fullKey = `${this.batchKey}:${itemKey}`;
    return this.manager.getElapsedTime(fullKey);
  }

  /**
   * 清除所有批量项
   */
  clearAll(): void {
    this.manager.clearAll();
    this.itemTimeouts.clear();
  }

  /**
   * 获取剩余项数量
   */
  get remainingCount(): number {
    return this.itemTimeouts.size;
  }

  /**
   * 获取所有项的总已用时间
   */
  get totalElapsedTime(): number {
    let total = 0;
    this.itemTimeouts.forEach((_, itemKey) => {
      total += this.getItemElapsedTime(itemKey);
    });
    return total;
  }
}

/**
 * 创建带超时的异步函数
 */
export function createTimeoutFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: TimeoutConfig
): T {
  return ((...args: any[]) => {
    return withTimeout(fn(...args), config);
  }) as T;
}

/**
 * 超时重试策略
 */
export interface RetryStrategy {
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始延迟（毫秒） */
  initialDelay: number;
  /** 延迟倍数 */
  delayMultiplier: number;
  /** 最大延迟（毫秒） */
  maxDelay: number;
}

/**
 * 指数退避重试
 */
export async function retryWithBackoff<T>(
  promiseFn: () => Promise<T>,
  strategy: RetryStrategy,
  timeoutConfig: TimeoutConfig
): Promise<T> {
  const { maxRetries, initialDelay, delayMultiplier, maxDelay } = strategy;
  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        toast.info(`正在重试... (${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay = Math.min(delay * delayMultiplier, maxDelay);
      }

      return await withTimeout(promiseFn(), timeoutConfig);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError || new Error('操作失败');
}

