import React from 'react';
import { cn } from '@/utils/cn';
import { Spin } from './Spin';
import { Empty } from './Empty';

export interface ListItemProps {
  children: React.ReactNode;
  actions?: React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export interface ListItemMetaProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
}

export interface ListProps<T = any> {
  dataSource?: T[];
  renderItem?: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'default' | 'large';
  split?: boolean;
  bordered?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  locale?: {
    emptyText?: React.ReactNode;
  };
  pagination?: boolean | {
    current?: number;
    pageSize?: number;
    total?: number;
    onChange?: (page: number, pageSize?: number) => void;
  };
  grid?: {
    gutter?: number;
    column?: number;
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  };
}

// List.Item 组件
const ListItem: React.FC<ListItemProps> & {
  Meta: React.FC<ListItemMetaProps>;
} = ({
  children,
  actions,
  className,
  style,
  onClick,
}) => {
  return (
    <div
      className={cn(
        'flex items-start justify-between py-3 px-0',
        'border-b border-gray-100 last:border-b-0',
        onClick && 'cursor-pointer hover:bg-gray-50',
        className
      )}
      style={style}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        {children}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {actions.map((action, index) => (
            <div key={index} className="flex items-center">
              {action}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// List.Item.Meta 组件
const ListItemMeta: React.FC<ListItemMetaProps> = ({
  title,
  description,
  avatar,
  className,
}) => {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {avatar && (
        <div className="flex-shrink-0">
          {avatar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="text-sm font-medium text-gray-900 mb-1">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm text-gray-500">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

ListItem.Meta = ListItemMeta;

// 主 List 组件
export const List: React.FC<ListProps> & {
  Item: typeof ListItem;
} = ({
  dataSource = [],
  renderItem,
  loading = false,
  className,
  style,
  size = 'default',
  split = true,
  bordered = false,
  header,
  footer,
  locale = {},
  pagination,
  grid,
}) => {
  const sizeClasses = {
    small: 'text-sm',
    default: '',
    large: 'text-base',
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      );
    }

    if (!dataSource || dataSource.length === 0) {
      return (
        <div className="py-8">
          <Empty description={locale.emptyText || '暂无数据'} />
        </div>
      );
    }

    if (grid) {
      // 网格布局
      const { column = 1, gutter = 16 } = grid;
      return (
        <div 
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${column}, 1fr)`,
            gap: `${gutter}px`,
          }}
        >
          {dataSource.map((item, index) => (
            <div key={index}>
              {renderItem ? renderItem(item, index) : item}
            </div>
          ))}
        </div>
      );
    }

    // 列表布局
    return (
      <div className={cn(!split && 'space-y-0')}>
        {dataSource.map((item, index) => (
          <div key={index}>
            {renderItem ? renderItem(item, index) : item}
          </div>
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!pagination || typeof pagination === 'boolean') {
      return null;
    }

    const { current = 1, pageSize = 10, total = 0, onChange } = pagination;
    const totalPages = Math.ceil(total / pageSize);

    if (totalPages <= 1) {
      return null;
    }

    return (
      <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={() => onChange?.(current - 1, pageSize)}
          disabled={current <= 1}
          className={cn(
            'px-3 py-1 text-sm border border-gray-300 rounded',
            'hover:border-blue-500 hover:text-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500'
          )}
        >
          上一页
        </button>
        
        <span className="text-sm text-gray-600">
          第 {current} 页，共 {totalPages} 页
        </span>
        
        <button
          onClick={() => onChange?.(current + 1, pageSize)}
          disabled={current >= totalPages}
          className={cn(
            'px-3 py-1 text-sm border border-gray-300 rounded',
            'hover:border-blue-500 hover:text-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500'
          )}
        >
          下一页
        </button>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'w-full',
        sizeClasses[size],
        bordered && 'border border-gray-200 rounded-md',
        className
      )}
      style={style}
    >
      {header && (
        <div className={cn(
          'px-4 py-3 border-b border-gray-100 bg-gray-50',
          bordered && 'rounded-t-md'
        )}>
          {header}
        </div>
      )}
      
      <div className={cn(bordered ? 'px-4 py-2' : 'py-0')}>
        {renderContent()}
      </div>
      
      {footer && (
        <div className={cn(
          'px-4 py-3 border-t border-gray-100 bg-gray-50',
          bordered && 'rounded-b-md'
        )}>
          {footer}
        </div>
      )}
      
      {renderPagination()}
    </div>
  );
};

List.Item = ListItem;

export { ListItem, ListItemMeta };
