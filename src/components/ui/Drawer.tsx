import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';
import { CloseOutlined } from './Icons';

export interface DrawerProps {
  open?: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  width?: number | string;
  height?: number | string;
  mask?: boolean;
  maskClosable?: boolean;
  closable?: boolean;
  className?: string;
  bodyStyle?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  extra?: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
  open = false,
  onClose,
  title,
  placement = 'right',
  width = 480,
  height = 480,
  mask = true,
  maskClosable = true,
  closable = true,
  className,
  bodyStyle,
  headerStyle,
  children,
  footer,
  extra,
}) => {
  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onClose) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEsc);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const getDrawerStyles = () => {
    const baseStyles = 'fixed bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out';
    
    switch (placement) {
      case 'top':
        return cn(
          baseStyles,
          'top-0 left-0 right-0',
          'transform translate-y-0'
        );
      case 'bottom':
        return cn(
          baseStyles,
          'bottom-0 left-0 right-0',
          'transform translate-y-0'
        );
      case 'left':
        return cn(
          baseStyles,
          'top-0 left-0 bottom-0',
          'transform translate-x-0'
        );
      case 'right':
      default:
        return cn(
          baseStyles,
          'top-0 right-0 bottom-0',
          'transform translate-x-0'
        );
    }
  };

  const getDrawerSize = () => {
    if (placement === 'top' || placement === 'bottom') {
      return { height: typeof height === 'number' ? `${height}px` : height };
    } else {
      return { width: typeof width === 'number' ? `${width}px` : width };
    }
  };

  const handleMaskClick = () => {
    if (maskClosable && onClose) {
      onClose();
    }
  };

  const drawer = (
    <>
      {/* 遮罩层 */}
      {mask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={handleMaskClick}
        />
      )}
      
      {/* 抽屉主体 */}
      <div
        className={cn(getDrawerStyles(), className)}
        style={getDrawerSize()}
      >
        {/* 头部 */}
        {(title || closable || extra) && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-gray-200"
            style={headerStyle}
          >
            <div className="flex items-center gap-4">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 m-0">
                  {title}
                </h3>
              )}
              {extra}
            </div>
            
            {closable && (
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="关闭"
              >
                <CloseOutlined size={16} />
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div
          className="flex-1 overflow-auto p-6"
          style={bodyStyle}
        >
          {children}
        </div>

        {/* 底部 */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(drawer, document.body);
};

export { Drawer };
