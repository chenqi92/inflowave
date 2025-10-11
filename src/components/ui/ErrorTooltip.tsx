import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 计算提示框位置
  const updatePosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    // 默认显示在目标元素的右上方
    let top = targetRect.top - tooltipRect.height - 8;
    let left = targetRect.left;

    // 如果上方空间不足，显示在下方
    if (top < 8) {
      top = targetRect.bottom + 8;
    }

    // 如果右侧空间不足，调整到左侧
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }

    // 确保不超出左边界
    if (left < 8) {
      left = 8;
    }

    setPosition({ top, left });
  };

  // 监听 visible 变化
  useEffect(() => {
    setIsVisible(visible);

    if (visible) {
      // 延迟一帧更新位置，确保 DOM 已渲染
      requestAnimationFrame(() => {
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
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, autoHideDuration, onHide]);

  // 监听窗口大小变化和滚动，更新位置
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const tooltip = (
    <div
      ref={tooltipRef}
      className="fixed z-[99999] px-3 py-2 bg-destructive text-destructive-foreground text-xs rounded-md shadow-lg whitespace-nowrap border border-destructive/20 animate-fade-out pointer-events-none"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center gap-2">
        <XCircle className="w-3 h-3 flex-shrink-0" />
        <span>{message}</span>
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

