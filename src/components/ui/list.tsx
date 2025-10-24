import * as React from 'react';
import { cn } from '@/lib/utils';

interface ListItemProps {
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode[];
  extra?: React.ReactNode;
}

const ListItem = React.forwardRef<HTMLDivElement, ListItemProps>(
  ({ className, children, actions, extra, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between p-4 border-b border-border last:border-b-0',
          className
        )}
        {...props}
      >
        <div className='flex-1'>{children}</div>
        {(actions || extra) && (
          <div className='flex items-center space-x-2 ml-4'>
            {actions && (
              <div className='flex items-center space-x-1'>
                {actions.map((action, index) => (
                  <div key={index}>{action}</div>
                ))}
              </div>
            )}
            {extra && <div>{extra}</div>}
          </div>
        )}
      </div>
    );
  }
);
ListItem.displayName = 'ListItem';

interface ListItemMetaProps {
  className?: string;
  avatar?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
}

const ListItemMeta = React.forwardRef<HTMLDivElement, ListItemMetaProps>(
  ({ className, avatar, title, description, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start space-x-3', className)}
        {...props}
      >
        {avatar && <div className='flex-shrink-0'>{avatar}</div>}
        <div className='flex-1 min-w-0'>
          {title && (
            <div className='text-sm font-medium text-foreground'>{title}</div>
          )}
          {description && (
            <div className='text-sm text-muted-foreground mt-1'>
              {description}
            </div>
          )}
        </div>
      </div>
    );
  }
);
ListItemMeta.displayName = 'ListItemMeta';

interface ListProps {
  className?: string;
  children?: React.ReactNode;
  dataSource?: any[];
  renderItem?: (item: any, index: number) => React.ReactNode;
  loading?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  bordered?: boolean;
  split?: boolean;
  size?: 'small' | 'default' | 'large';
}

const List = React.forwardRef<HTMLDivElement, ListProps>(
  (
    {
      className,
      children,
      dataSource,
      renderItem,
      loading,
      header,
      footer,
      bordered = true,
      split = true,
      size = 'default',
      ...props
    },
    ref
  ) => {
    // Remove custom props to prevent them from being passed to DOM
    const {
      dataSource: _,
      renderItem: __,
      loading: ___,
      header: ____,
      footer: _____,
      bordered: ______,
      split: _______,
      size: ________,
      ...domProps
    } = props as any;
    const sizeClasses = {
      small: 'text-sm',
      default: '',
      large: 'text-base',
    };

    const content =
      dataSource && renderItem
        ? dataSource.map((item, index) => renderItem(item, index))
        : children;

    return (
      <div
        ref={ref}
        className={cn(
          'bg-background',
          bordered && 'border border-border rounded-md',
          sizeClasses[size],
          className
        )}
        {...domProps}
      >
        {header && (
          <div className='px-4 py-3 border-b border-border bg-muted/30'>
            {header}
          </div>
        )}
        <div className={cn(!split && 'divide-none')}>
          {loading ? (
            <div className='flex justify-center p-8'>
              <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
            </div>
          ) : (
            content
          )}
        </div>
        {footer && (
          <div className='px-4 py-3 border-t border-border bg-muted/30'>
            {footer}
          </div>
        )}
      </div>
    );
  }
);
List.displayName = 'List';

export { List, ListItem, ListItemMeta };
export type { ListProps, ListItemProps, ListItemMetaProps };
