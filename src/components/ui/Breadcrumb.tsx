import React from 'react';
import { cn } from '@/utils/cn';

export interface BreadcrumbItem {
  title: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '/',
  className,
}) => {
  return (
    <nav className={cn('flex items-center space-x-1 text-sm', className)}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 mx-1">{separator}</span>
          )}
          <div className="flex items-center">
            {item.icon && (
              <span className="mr-1 text-gray-500">{item.icon}</span>
            )}
            {item.href || item.onClick ? (
              <button
                onClick={item.onClick}
                className={cn(
                  'hover:text-blue-600 transition-colors',
                  index === items.length - 1
                    ? 'text-gray-900 font-medium cursor-default'
                    : 'text-gray-600 hover:text-blue-600 cursor-pointer'
                )}
              >
                {item.title}
              </button>
            ) : (
              <span
                className={cn(
                  index === items.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-600'
                )}
              >
                {item.title}
              </span>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};
