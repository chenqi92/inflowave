import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'antd';
import { cn } from '@/utils/cn';

export interface PopconfirmProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  okType?: 'primary' | 'danger';
  disabled?: boolean;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  trigger?: 'click' | 'hover';
  children: React.ReactElement;
  className?: string;
  overlayClassName?: string;
  icon?: React.ReactNode;
}

export const Popconfirm: React.FC<PopconfirmProps> = ({
  title,
  description,
  onConfirm,
  onCancel,
  okText = '确定',
  cancelText = '取消',
  okType = 'primary',
  disabled = false,
  placement = 'top',
  trigger = 'click',
  children,
  className,
  overlayClassName,
  icon,
}) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        visible &&
        containerRef.current &&
        popoverRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (trigger === 'click') {
      setVisible(!visible);
    }
  };

  const handleTriggerMouseEnter = () => {
    if (disabled) return;
    
    if (trigger === 'hover') {
      setVisible(true);
    }
  };

  const handleTriggerMouseLeave = () => {
    if (trigger === 'hover') {
      setVisible(false);
    }
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm();
        setVisible(false);
      } catch (error) {
        console.error('Popconfirm confirm error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setVisible(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    setVisible(false);
  };

  const getPlacementClasses = () => {
    const baseClasses = 'absolute z-50';
    
    switch (placement) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      case 'topLeft':
        return `${baseClasses} bottom-full left-0 mb-2`;
      case 'topRight':
        return `${baseClasses} bottom-full right-0 mb-2`;
      case 'bottomLeft':
        return `${baseClasses} top-full left-0 mt-2`;
      case 'bottomRight':
        return `${baseClasses} top-full right-0 mt-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseArrowClasses = 'absolute w-0 h-0 border-solid';
    
    switch (placement) {
      case 'top':
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white`;
      case 'bottom':
        return `${baseArrowClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white`;
      case 'left':
        return `${baseArrowClasses} left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white`;
      case 'right':
        return `${baseArrowClasses} right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white`;
      case 'topLeft':
        return `${baseArrowClasses} top-full left-4 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white`;
      case 'topRight':
        return `${baseArrowClasses} top-full right-4 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white`;
      case 'bottomLeft':
        return `${baseArrowClasses} bottom-full left-4 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white`;
      case 'bottomRight':
        return `${baseArrowClasses} bottom-full right-4 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white`;
      default:
        return `${baseArrowClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white`;
    }
  };

  const defaultIcon = (
    <svg
      className="w-4 h-4 text-orange-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );

  // 克隆子元素并添加事件处理器
  const triggerElement = React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      children.props.onClick?.(e);
      handleTriggerClick(e);
    },
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      handleTriggerMouseEnter();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      handleTriggerMouseLeave();
    },
  });

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      {triggerElement}
      
      {visible && (
        <div
          ref={popoverRef}
          className={cn(
            getPlacementClasses(),
            'bg-white border border-gray-200 rounded-md shadow-lg p-3 min-w-[200px] max-w-[300px]',
            overlayClassName
          )}
        >
          {/* 箭头 */}
          <div className={getArrowClasses()} />
          
          {/* 内容 */}
          <div className="space-y-3">
            {/* 标题和图标 */}
            <div className="flex items-start gap-2">
              {icon !== null && (
                <div className="flex-shrink-0 mt-0.5">
                  {icon || defaultIcon}
                </div>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {title}
                </div>
                {description && (
                  <div className="text-sm text-gray-600 mt-1">
                    {description}
                  </div>
                )}
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex justify-end gap-2">
              <Button
                size="small"
                onClick={handleCancel}
                disabled={loading}
              >
                {cancelText}
              </Button>
              <Button
                size="small"
                type={okType}
                onClick={handleConfirm}
                loading={loading}
              >
                {okText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

