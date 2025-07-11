import React from 'react';
import { cn } from '@/utils/cn';

export interface DescriptionsItemProps {
  label: string;
  children: React.ReactNode;
  span?: number;
}

export interface DescriptionsProps {
  title?: string;
  bordered?: boolean;
  column?: number;
  size?: 'small' | 'default' | 'large';
  layout?: 'horizontal' | 'vertical';
  colon?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const DescriptionsItem: React.FC<DescriptionsItemProps> = ({
  label,
  children,
  span = 1,
}) => {
  return (
    <div className={cn(
      "flex",
      span > 1 && `col-span-${span}`,
      "text-sm"
    )}>
      <div className="w-32 text-gray-500 font-medium">{label}:</div>
      <div className="flex-1 text-gray-900">{children}</div>
    </div>
  );
};

export const Descriptions: React.FC<DescriptionsProps> = ({
  title,
  bordered = false,
  column = 3,
  size = 'default',
  layout = 'horizontal',
  colon = true,
  children,
  className,
}) => {
  const sizeClasses = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
  };

  return (
    <div className={cn(
      "w-full",
      bordered && "border border-gray-200 rounded-lg",
      sizeClasses[size],
      className
    )}>
      {title && (
        <div className={cn(
          "font-semibold mb-4",
          bordered && "px-4 py-2 bg-gray-50 border-b border-gray-200"
        )}>
          {title}
        </div>
      )}
      <div className={cn(
        "space-y-2",
        bordered && "p-4",
        layout === 'vertical' && "space-y-4"
      )}>
        {children}
      </div>
    </div>
  );
};

// Add static property for easier usage
Descriptions.Item = DescriptionsItem;

