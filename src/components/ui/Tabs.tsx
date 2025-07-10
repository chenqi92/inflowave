import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

export interface TabItem {
  key: string;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  closable?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  onEdit?: (targetKey: string, action: 'add' | 'remove') => void;
  type?: 'line' | 'card';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeKey,
  defaultActiveKey,
  onChange,
  onEdit,
  type = 'line',
  size = 'md',
  className,
}) => {
  const [currentActiveKey, setCurrentActiveKey] = useState(
    activeKey || defaultActiveKey || items[0]?.key
  );

  useEffect(() => {
    if (activeKey !== undefined) {
      setCurrentActiveKey(activeKey);
    }
  }, [activeKey]);

  const handleTabClick = (key: string) => {
    if (activeKey === undefined) {
      setCurrentActiveKey(key);
    }
    onChange?.(key);
  };

  const handleClose = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(key, 'remove');
  };

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  const activeItem = items.find(item => item.key === currentActiveKey);

  return (
    <div className={cn('w-full', className)}>
      {/* Tab Headers */}
      <div className={cn(
        'flex border-b border-gray-200',
        type === 'card' && 'border-b-0'
      )}>
        {items.map((item) => (
          <button
            key={item.key}
            className={cn(
              'relative flex items-center gap-2 font-medium transition-colors',
              sizes[size],
              type === 'line' && [
                'border-b-2 border-transparent hover:text-blue-600',
                currentActiveKey === item.key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 hover:border-gray-300'
              ],
              type === 'card' && [
                'border border-gray-200 border-b-0 rounded-t-md bg-white',
                currentActiveKey === item.key
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              ],
              item.disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => !item.disabled && handleTabClick(item.key)}
            disabled={item.disabled}
          >
            {item.label}
            {item.closable && (
              <button
                className="ml-1 text-gray-400 hover:text-gray-600 rounded-full p-0.5 hover:bg-gray-200"
                onClick={(e) => handleClose(item.key, e)}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={cn(
        'mt-4',
        type === 'card' && 'border border-gray-200 rounded-b-md bg-white p-4 mt-0'
      )}>
        {activeItem?.children}
      </div>
    </div>
  );
};

export { Tabs };
