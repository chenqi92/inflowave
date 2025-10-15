/**
 * 统一加载状态管理 Hook
 * 提供加载状态、超时处理、进度跟踪等功能
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * 加载状态配置
 */
export interface LoadingConfig {
  /** 超时时间（毫秒），0 表示不超时 */
  timeout?: number;
  /** 超时回调 */
  onTimeout?: () => void;
  /** 超时提示消息 */
  timeoutMessage?: string;
  /** 是否在超时后自动停止加载 */
  stopOnTimeout?: boolean;
  /** 最小加载时间（毫秒），避免闪烁 */
  minDuration?: number;
}

/**
 * 加载状态返回值
 */
export interface LoadingState {
  /** 是否正在加载 */
  loading: boolean;
  /** 开始加载 */
  startLoading: () => void;
  /** 停止加载 */
  stopLoading: () => void;
  /** 切换加载状态 */
  toggleLoading: () => void;
  /** 是否超时 */
  isTimeout: boolean;
  /** 已加载时间（毫秒） */
  elapsedTime: number;
}

/**
 * 基础加载状态 Hook
 */
export function useLoadingState(config: LoadingConfig = {}): LoadingState {
  const {
    timeout = 0,
    onTimeout,
    timeoutMessage = '操作超时，请重试',
    stopOnTimeout = true,
    minDuration = 0,
  } = config;

  const [loading, setLoading] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const canStopRef = useRef<boolean>(true);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (minDurationTimerRef.current) {
      clearTimeout(minDurationTimerRef.current);
      minDurationTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  }, []);

  // 开始加载
  const startLoading = useCallback(() => {
    setLoading(true);
    setIsTimeout(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    canStopRef.current = false;

    // 设置最小加载时间
    if (minDuration > 0) {
      minDurationTimerRef.current = setTimeout(() => {
        canStopRef.current = true;
      }, minDuration);
    } else {
      canStopRef.current = true;
    }

    // 设置超时定时器
    if (timeout > 0) {
      timeoutTimerRef.current = setTimeout(() => {
        setIsTimeout(true);
        if (onTimeout) {
          onTimeout();
        }
        if (timeoutMessage) {
          toast.warning(timeoutMessage);
        }
        if (stopOnTimeout) {
          setLoading(false);
        }
      }, timeout);
    }

    // 启动计时器
    elapsedTimerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);
  }, [timeout, onTimeout, timeoutMessage, stopOnTimeout, minDuration]);

  // 停止加载
  const stopLoading = useCallback(() => {
    const stop = () => {
      setLoading(false);
      clearTimers();
    };

    if (canStopRef.current) {
      stop();
    } else {
      // 等待最小加载时间
      const remaining = minDuration - (Date.now() - startTimeRef.current);
      if (remaining > 0) {
        setTimeout(stop, remaining);
      } else {
        stop();
      }
    }
  }, [clearTimers, minDuration]);

  // 切换加载状态
  const toggleLoading = useCallback(() => {
    if (loading) {
      stopLoading();
    } else {
      startLoading();
    }
  }, [loading, startLoading, stopLoading]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    loading,
    startLoading,
    stopLoading,
    toggleLoading,
    isTimeout,
    elapsedTime,
  };
}

/**
 * 带进度的加载状态 Hook
 */
export interface ProgressLoadingState extends LoadingState {
  /** 当前进度（0-100） */
  progress: number;
  /** 设置进度 */
  setProgress: (value: number) => void;
  /** 增加进度 */
  incrementProgress: (delta: number) => void;
  /** 重置进度 */
  resetProgress: () => void;
}

export function useProgressLoading(
  config: LoadingConfig = {}
): ProgressLoadingState {
  const loadingState = useLoadingState(config);
  const [progress, setProgress] = useState(0);

  const incrementProgress = useCallback((delta: number) => {
    setProgress((prev) => Math.min(100, Math.max(0, prev + delta)));
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
  }, []);

  // 开始加载时重置进度
  const startLoading = useCallback(() => {
    resetProgress();
    loadingState.startLoading();
  }, [loadingState, resetProgress]);

  return {
    ...loadingState,
    startLoading,
    progress,
    setProgress,
    incrementProgress,
    resetProgress,
  };
}

/**
 * 异步操作加载状态 Hook
 */
export function useAsyncLoading<T = any>(
  config: LoadingConfig = {}
): {
  loading: boolean;
  error: Error | null;
  data: T | null;
  execute: (asyncFn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
} {
  const loadingState = useLoadingState(config);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(
    async (asyncFn: () => Promise<T>): Promise<T | null> => {
      loadingState.startLoading();
      setError(null);
      setData(null);

      try {
        const result = await asyncFn();
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        loadingState.stopLoading();
      }
    },
    [loadingState]
  );

  const reset = useCallback(() => {
    setError(null);
    setData(null);
    loadingState.stopLoading();
  }, [loadingState]);

  return {
    loading: loadingState.loading,
    error,
    data,
    execute,
    reset,
  };
}

/**
 * 批量加载状态 Hook
 */
export function useBatchLoading(
  itemCount: number,
  config: LoadingConfig = {}
): {
  loading: boolean;
  progress: number;
  completedCount: number;
  startBatch: () => void;
  completeItem: () => void;
  stopBatch: () => void;
  reset: () => void;
} {
  const loadingState = useLoadingState(config);
  const [completedCount, setCompletedCount] = useState(0);

  const progress = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;

  const startBatch = useCallback(() => {
    setCompletedCount(0);
    loadingState.startLoading();
  }, [loadingState]);

  const completeItem = useCallback(() => {
    setCompletedCount((prev) => Math.min(itemCount, prev + 1));
  }, [itemCount]);

  const stopBatch = useCallback(() => {
    loadingState.stopLoading();
  }, [loadingState]);

  const reset = useCallback(() => {
    setCompletedCount(0);
    loadingState.stopLoading();
  }, [loadingState]);

  // 自动停止
  useEffect(() => {
    if (completedCount >= itemCount && itemCount > 0 && loadingState.loading) {
      loadingState.stopLoading();
    }
  }, [completedCount, itemCount, loadingState]);

  return {
    loading: loadingState.loading,
    progress,
    completedCount,
    startBatch,
    completeItem,
    stopBatch,
    reset,
  };
}

