import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MenuProps {
  className?: string;
  children?: React.ReactNode;
  mode?: 'vertical' | 'horizontal' | 'inline';
  theme?: 'light' | 'dark';
  selectedKeys?: string[];
  onSelect?: (key: string) => void;
  items?: MenuItemConfig[];
}

interface MenuItemConfig {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: MenuItemConfig[];
  disabled?: boolean;
  danger?: boolean;
  type?: 'divider' | 'group';
  onClick?: () => void;
}

const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
  (
    {
      className,
      children,
      mode = 'vertical',
      theme = 'light',
      selectedKeys = [],
      onSelect,
      items,
      ...props
    },
    ref
  ) => {
    const renderItem = (item: MenuItemConfig, level = 0) => {
      if (item.type === 'divider') {
        return <div key={item.key} className='border-t border-border my-1' />;
      }

      if (item.type === 'group') {
        return (
          <div
            key={item.key}
            className='px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider'
          >
            {item.label}
          </div>
        );
      }

      const isSelected = selectedKeys.includes(item.key);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <div key={item.key}>
          <div
            className={cn(
              'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isSelected && 'bg-accent text-accent-foreground',
              item.disabled && 'opacity-50 cursor-not-allowed',
              item.danger && 'text-destructive hover:text-destructive',
              level > 0 && 'pl-6'
            )}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                onSelect?.(item.key);
              }
            }}
          >
            <div className='flex items-center space-x-2'>
              {item.icon && <span className='flex-shrink-0'>{item.icon}</span>}
              <span>{item.label}</span>
            </div>
            {hasChildren && <ChevronRight className='h-4 w-4' />}
          </div>
          {hasChildren && (
            <div className='ml-4'>
              {item.children?.map(child => renderItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col min-w-[200px] border border-border rounded-md bg-background p-1',
          mode === 'horizontal' && 'flex-row',
          theme === 'dark' && 'bg-muted text-muted-foreground',
          className
        )}
        {...props}
      >
        {items ? items.map(item => renderItem(item)) : children}
      </div>
    );
  }
);
Menu.displayName = 'Menu';

interface MenuItemProps {
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
}

const MenuItem = React.forwardRef<HTMLDivElement, MenuItemProps>(
  ({ className, children, disabled, danger, icon, onClick, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center space-x-2 px-3 py-2 text-sm cursor-pointer transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
          danger && 'text-destructive hover:text-destructive',
          className
        )}
        onClick={() => {
          if (!disabled) {
            onClick?.();
          }
        }}
        {...props}
      >
        {icon && <span className='flex-shrink-0'>{icon}</span>}
        <span>{children}</span>
      </div>
    );
  }
);
MenuItem.displayName = 'MenuItem';

const MenuDivider = React.forwardRef<HTMLDivElement, { className?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('border-t border-border my-1', className)}
        {...props}
      />
    );
  }
);
MenuDivider.displayName = 'MenuDivider';

export { Menu, MenuItem, MenuDivider };
export type { MenuProps, MenuItemConfig, MenuItemProps };
