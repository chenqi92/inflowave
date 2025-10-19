import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';
import { log } from '@/utils/logger';

interface ErrorTooltipProps {
  /** 触发元素的 ref */
  targetRef: React.RefObject<HTMLElement>;
  /** 错误消息 */
  message: string;
  /** 是否显示 */
  visible: boolean;
  /** 自动隐藏的延迟时间（毫秒），0 表示不自动隐藏 */
  autoHideDuration?: number;
  /** 隐藏时的回调 */
  onHide?: () => void;
}

/**
 * 错误提示组件 - 使用 Portal 渲染到 body，避免被父容器遮挡
 */
export const ErrorTooltip: React.FC<ErrorTooltipProps> = ({
  targetRef,
  message,
  visible,
  autoHideDuration = 3000,
  onHide,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(visible);
  const [isPositioned, setIsPositioned] = useState(false); // 标记是否已成功定位
  const [opacity, setOpacity] = useState(1); // 透明度，用于淡出效果
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPositionRef = useRef({ top: 0, left: 0 }); // 🔧 记录上次位置，避免重复更新
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🔧 防抖定时器
  const retryCountRef = useRef(0); // 重试计数器
  const fadeOutTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 淡出定时器

  // 计算提示框位置
  const updatePosition = useCallback(() => {
    if (!targetRef.current) {
      log.warn('[ErrorTooltip] targetRef.current 不存在');
      return;
    }

    const targetRect = targetRef.current.getBoundingClientRect();

    // 检查目标元素是否可见
    // 如果 getBoundingClientRect 返回全0，说明元素不可见或未渲染
    if (targetRect.top === 0 && targetRect.left === 0 && targetRect.right === 0 && targetRect.bottom === 0) {
      log.warn('[ErrorTooltip] 目标元素不可见，尝试重试', { retryCount: retryCountRef.current });

      // 重试机制：最多重试10次，每次延迟300ms（总共3秒）
      if (retryCountRef.current < 10) {
        retryCountRef.current++;
        setTimeout(() => {
          updatePosition();
        }, 300);
      } else {
        log.error('[ErrorTooltip] 重试10次后仍无法定位，放弃显示');
        setIsVisible(false);
        onHide?.();
      }
      return;
    }

    // 成功定位，重置重试计数器
    retryCountRef.current = 0;
    setIsPositioned(true);
    setOpacity(1); // 重置透明度

    // 启动淡出效果（2秒后开始淡出，1秒淡出时间）
    if (fadeOutTimeoutRef.current) {
      clearTimeout(fadeOutTimeoutRef.current);
    }
    fadeOutTimeoutRef.current = setTimeout(() => {
      setOpacity(0);
      // 淡出完成后隐藏
      setTimeout(() => {
        setIsVisible(false);
        onHide?.();
      }, 1000); // 1秒淡出时间
    }, 2000); // 2秒后开始淡出

    const padding = 12; // 增加间距，让提示框更贴近节点

    // 🔧 修复：使用估算的 tooltip 宽度，避免首次渲染时宽度为 0
    // 如果 tooltipRef 还没有渲染，使用默认宽度
    let tooltipWidth = 300; // 默认宽度
    let tooltipHeight = 60; // 默认高度

    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      if (tooltipRect.width > 0) {
        tooltipWidth = tooltipRect.width;
        tooltipHeight = tooltipRect.height;
      }
    }

    // 默认显示在目标元素的右侧，与节点顶部对齐
    let top = targetRect.top;
    let left = targetRect.right + padding;

    // 如果右侧空间不足，显示在左侧
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = targetRect.left - tooltipWidth - padding;
    }

    // 如果左侧也不够，显示在下方
    if (left < padding) {
      left = targetRect.left;
      top = targetRect.bottom + padding;
    }

    // 如果下方空间不足，显示在上方
    if (top + tooltipHeight > window.innerHeight - padding) {
      top = targetRect.top - tooltipHeight - padding;
    }

    // 确保不超出上边界
    if (top < padding) {
      top = padding;
    }

    // 确保不超出左边界
    if (left < padding) {
      left = padding;
    }

    // 🔧 位置变化检测：只在位置实际改变时更新（容差 2px）
    const tolerance = 2;
    const hasChanged =
      Math.abs(top - lastPositionRef.current.top) > tolerance ||
      Math.abs(left - lastPositionRef.current.left) > tolerance;

    if (!hasChanged) {
      log.debug('[ErrorTooltip] 位置无变化，跳过更新');
      return;
    }

    log.debug('[ErrorTooltip] 更新位置:', {
      targetRect: { top: targetRect.top, left: targetRect.left, right: targetRect.right, bottom: targetRect.bottom },
      tooltipSize: { width: tooltipWidth, height: tooltipHeight },
      finalPosition: { top, left }
    });

    lastPositionRef.current = { top, left };
    setPosition({ top, left });
  }, [targetRef]);

  // 监听 visible 变化
  useEffect(() => {
    setIsVisible(visible);
    setIsPositioned(false); // 重置定位状态
    retryCountRef.current = 0; // 重置重试计数器

    if (visible) {
      // 🔧 优化：只在 DOM 渲染后更新一次位置
      // 使用 requestAnimationFrame 确保 DOM 已渲染
      const rafId = requestAnimationFrame(() => {
        updatePosition();
      });

      // 设置自动隐藏
      if (autoHideDuration > 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          onHide?.();
        }, autoHideDuration);
      }

      return () => {
        cancelAnimationFrame(rafId);
      };
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, autoHideDuration, onHide, updatePosition]);

  // 监听窗口大小变化和滚动，更新位置（添加防抖）
  useEffect(() => {
    if (!isVisible) return;

    // 🔧 防抖处理：避免频繁更新位置
    const handleUpdate = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        updatePosition();
      }, 100); // 100ms 防抖
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [isVisible, updatePosition]);

  // 只有在可见且已成功定位后才渲染
  if (!isVisible || !isPositioned) return null;

  const tooltip = (
    <div
      ref={tooltipRef}
      className="fixed z-[99999] px-3 py-2 bg-destructive text-destructive-foreground text-xs rounded-md shadow-lg border border-destructive/20 pointer-events-none max-w-xs"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        opacity,
        transition: 'opacity 1s ease-out',
      }}
    >
      <div className="flex items-start gap-2">
        <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span className="break-words leading-relaxed">{message}</span>
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body
  return createPortal(tooltip, document.body);
};

/**
 * Hook: 管理错误提示状态
 */
export const useErrorTooltip = () => {
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const showError = (key: string, message: string) => {
    setErrors(prev => new Map(prev).set(key, message));
  };

  const hideError = (key: string) => {
    setErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const clearAllErrors = () => {
    setErrors(new Map());
  };

  return {
    errors,
    showError,
    hideError,
    clearAllErrors,
  };
};

