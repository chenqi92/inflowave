import React from 'react';
import { cn } from '@/lib/utils';

export interface ResultProps {
  status?: 'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500';
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  wrap?: boolean; // Ant Design compatibility
}

const statusConfig = {
  success: {
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  error: {
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  info: {
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  warning: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  '404': {
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  '403': {
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  '500': {
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

const Result: React.FC<ResultProps> = ({
  status = 'info',
  title,
  subTitle,
  icon,
  extra,
  className,
  children,
  wrap = true,
  ...props
}) => {
  const config = statusConfig[status];

  // Filter out Ant Design specific props that shouldn't be passed to DOM
  const { wrap: _wrap, ...domProps } = props as any;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 rounded-lg border',
        config.bgColor,
        config.borderColor,
        !wrap && 'whitespace-nowrap',
        className
      )}
      {...domProps}
    >
      {icon && (
        <div className={cn('mb-4 text-4xl', config.color)}>
          {icon}
        </div>
      )}

      {title && (
        <h3 className={cn('text-lg font-semibold mb-2', config.color)}>
          {title}
        </h3>
      )}

      {subTitle && (
        <div className="text-gray-600 mb-4 max-w-md">
          {subTitle}
        </div>
      )}

      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {extra && (
        <div className="flex flex-wrap gap-2 justify-center">
          {extra}
        </div>
      )}
    </div>
  );
};

export { Result };
