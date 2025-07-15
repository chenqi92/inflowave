import { useCallback, useEffect, useRef } from 'react';

/**
 * 用于优化 resizable 组件性能的自定义 hook
 */
export const useResizableOptimization = () => {
  const isResizingRef = useRef(false);
  const rafIdRef = useRef<number>();

  // 开始拖动时的优化
  const handleResizeStart = useCallback(() => {
    isResizingRef.current = true;
    
    // 添加拖动状态类到 body，用于全局样式优化
    document.body.classList.add('resizing');
    
    // 禁用页面滚动
    document.body.style.overflow = 'hidden';
    
    // 禁用文本选择
    document.body.style.userSelect = 'none';
    
    // 提高渲染优先级
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
  }, []);

  // 拖动结束时的清理
  const handleResizeEnd = useCallback(() => {
    isResizingRef.current = false;
    
    // 延迟移除优化类，避免闪烁
    rafIdRef.current = requestAnimationFrame(() => {
      document.body.classList.remove('resizing');
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
    });
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      // 确保清理状态
      document.body.classList.remove('resizing');
      document.body.style.overflow = '';
      document.body.style.userSelect = '';
    };
  }, []);

  return {
    isResizing: isResizingRef.current,
    handleResizeStart,
    handleResizeEnd,
  };
};

/**
 * 用于防抖的 hook，在拖动时减少不必要的重新渲染
 */
export const useResizeDebounce = (callback: () => void, delay: number = 16) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const rafRef = useRef<number>();

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      timeoutRef.current = setTimeout(callback, delay);
    });
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};
