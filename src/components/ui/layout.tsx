/**
 * Layout 组件 - JetBrains New UI 风格
 * 紧凑布局, 更小的间距
 */
import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// Layout component
export interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  hasSider?: boolean;
}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, hasSider, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-screen',
          hasSider ? 'flex-row' : 'flex-col',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Layout.displayName = 'Layout';

// Header component
export type HeaderProps = React.HTMLAttributes<HTMLElement>;

const Header = forwardRef<HTMLElement, HeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'flex items-center justify-between px-4 py-2 border-b bg-background',
          className
        )}
        {...props}
      >
        {children}
      </header>
    );
  }
);
Header.displayName = 'Header';

// Sider component
export interface SiderProps extends React.HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean;
  width?: number | string;
  collapsedWidth?: number | string;
  trigger?: React.ReactNode;
  collapsible?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const Sider = forwardRef<HTMLDivElement, SiderProps>(
  (
    {
      className,
      children,
      collapsed = false,
      width = 200,
      collapsedWidth = 80,
      trigger,
      collapsible = false,
      onCollapse,
      ...props
    },
    ref
  ) => {
    const currentWidth = collapsed ? collapsedWidth : width;
    const widthStyle =
      typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth;

    return (
      <aside
        ref={ref}
        className={cn(
          'bg-background border-r border-border h-full transition-all duration-200 flex flex-col',
          className
        )}
        style={{ width: widthStyle }}
        {...props}
      >
        <div className='flex-1 overflow-auto'>{children}</div>
        {collapsible && trigger && (
          <div
            className='border-t p-2 cursor-pointer hover:bg-muted/50'
            onClick={() => onCollapse?.(!collapsed)}
          >
            {trigger}
          </div>
        )}
      </aside>
    );
  }
);
Sider.displayName = 'Sider';

// Content component
export type ContentProps = React.HTMLAttributes<HTMLDivElement>;

const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn('flex-1 overflow-auto bg-background', className)}
        {...props}
      >
        {children}
      </main>
    );
  }
);
Content.displayName = 'Content';

// Footer / Status Bar component - JetBrains New UI: 22px 高度, 11px 字体
export type FooterProps = React.HTMLAttributes<HTMLElement>;

const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          'h-[22px] border-t bg-muted/30 px-2 flex items-center text-xs text-muted-foreground',
          className
        )}
        {...props}
      >
        {children}
      </footer>
    );
  }
);
Footer.displayName = 'Footer';

export { Layout, Header, Sider, Content, Footer };
