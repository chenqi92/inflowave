import React from 'react';
import { cn } from '@/utils/cn';

export interface DividerProps {
  type?: 'horizontal' | 'vertical';
  orientation?: 'left' | 'right' | 'center';
  orientationMargin?: string | number;
  dashed?: boolean;
  plain?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Divider: React.FC<DividerProps> = ({
  type = 'horizontal',
  orientation = 'center',
  orientationMargin,
  dashed = false,
  plain = false,
  className,
  style,
  children,
}) => {
  const hasChildren = children !== undefined && children !== null;

  if (type === 'vertical') {
    return (
      <span
        className={cn(
          'inline-block w-px bg-gray-200 align-middle',
          'mx-2',
          dashed && 'border-l border-dashed border-gray-300 bg-transparent',
          className
        )}
        style={{
          height: '0.9em',
          ...style,
        }}
      />
    );
  }

  // 水平分割线
  if (!hasChildren) {
    return (
      <div
        className={cn(
          'w-full h-px bg-gray-200 my-4',
          dashed && 'border-t border-dashed border-gray-300 bg-transparent h-0',
          className
        )}
        style={style}
      />
    );
  }

  // 带文字的水平分割线
  const getOrientationClasses = () => {
    switch (orientation) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-center';
    }
  };

  const getTextMargin = () => {
    if (orientationMargin) {
      const margin = typeof orientationMargin === 'number' ? `${orientationMargin}px` : orientationMargin;
      switch (orientation) {
        case 'left':
          return { marginLeft: margin };
        case 'right':
          return { marginRight: margin };
        default:
          return {};
      }
    }
    return {};
  };

  return (
    <div
      className={cn(
        'flex items-center my-4',
        getOrientationClasses(),
        className
      )}
      style={style}
    >
      {/* 左侧线条 */}
      {(orientation === 'center' || orientation === 'right') && (
        <div
          className={cn(
            'flex-1 h-px bg-gray-200',
            dashed && 'border-t border-dashed border-gray-300 bg-transparent h-0'
          )}
        />
      )}
      
      {/* 文字内容 */}
      <div
        className={cn(
          'px-4 text-sm text-gray-500',
          plain ? 'font-normal' : 'font-medium',
          orientation === 'left' && 'pl-0',
          orientation === 'right' && 'pr-0'
        )}
        style={getTextMargin()}
      >
        {children}
      </div>
      
      {/* 右侧线条 */}
      {(orientation === 'center' || orientation === 'left') && (
        <div
          className={cn(
            'flex-1 h-px bg-gray-200',
            dashed && 'border-t border-dashed border-gray-300 bg-transparent h-0'
          )}
        />
      )}
    </div>
  );
};
