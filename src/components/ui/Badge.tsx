import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps {
  count?: number;
  dot?: boolean;
  showZero?: boolean;
  size?: 'default' | 'small';
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';
  color?: string;
  text?: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overflowCount?: number;
}

const Badge: React.FC<BadgeProps> = ({
  count = 0,
  dot = false,
  showZero = false,
  size = 'default',
  status,
  color,
  text,
  title,
  children,
  className,
  style,
  overflowCount = 99,
}) => {
  const shouldShowBadge = dot || count > 0 || showZero;
  
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getBadgeContent = () => {
    if (dot) return null;
    if (count > overflowCount) return `${overflowCount}+`;
    return count;
  };

  const getBadgeClasses = () => {
    const baseClasses = cn(
      'inline-flex items-center justify-center text-white text-xs font-medium rounded-full',
      size === 'small' ? 'min-w-[16px] h-4 px-1' : 'min-w-[20px] h-5 px-1.5',
      dot ? (size === 'small' ? 'w-2 h-2' : 'w-3 h-3') : '',
      color ? '' : getStatusColor()
    );

    return baseClasses;
  };

  const badgeStyle = color ? { backgroundColor: color, ...style } : style;

  // If no children, render standalone badge
  if (!children) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {shouldShowBadge && (
          <span
            className={getBadgeClasses()}
            style={badgeStyle}
            title={title}
          >
            {getBadgeContent()}
          </span>
        )}
        {text && <span className="text-sm text-gray-600">{text}</span>}
      </span>
    );
  }

  // Render badge with children
  return (
    <span className={cn('relative inline-block', className)} style={style}>
      {children}
      {shouldShowBadge && (
        <span
          className={cn(
            getBadgeClasses(),
            'absolute -top-1 -right-1 transform translate-x-1/2 -translate-y-1/2'
          )}
          style={badgeStyle}
          title={title}
        >
          {getBadgeContent()}
        </span>
      )}
    </span>
  );
};

export { Badge };