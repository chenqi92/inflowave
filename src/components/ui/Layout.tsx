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
export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {}

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
  ({ 
    className, 
    children, 
    collapsed = false,
    width = 200,
    collapsedWidth = 80,
    trigger,
    collapsible = false,
    onCollapse,
    ...props 
  }, ref) => {
    const currentWidth = collapsed ? collapsedWidth : width;
    const widthStyle = typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth;

    return (
      <aside
        ref={ref}
        className={cn(
          'bg-white border-r border-gray-200 h-full transition-all duration-200 flex flex-col',
          className
        )}
        style={{ width: widthStyle }}
        {...props}
      >
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        {collapsible && trigger && (
          <div 
            className="border-t p-2 cursor-pointer hover:bg-gray-50"
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
export interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const Content = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <main
        ref={ref}
        className={cn(
          'flex-1 overflow-auto bg-background',
          className
        )}
        {...props}
      >
        {children}
      </main>
    );
  }
);
Content.displayName = 'Content';

// Footer component
export interface FooterProps extends React.HTMLAttributes<HTMLElement> {}

const Footer = forwardRef<HTMLElement, FooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          'border-t bg-background px-4 py-2',
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
export type { LayoutProps, HeaderProps, SiderProps, ContentProps, FooterProps };
