import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

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
          'bg-white border-b border-gray-200 px-6 py-4',
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
  collapsible?: boolean;
  width?: number | string;
  collapsedWidth?: number | string;
  onCollapse?: (collapsed: boolean) => void;
}

const Sider = forwardRef<HTMLDivElement, SiderProps>(
  ({ 
    className, 
    collapsed = false, 
    collapsible = false,
    width = 200,
    collapsedWidth = 80,
    onCollapse,
    children, 
    ...props 
  }, ref) => {
    const currentWidth = collapsed ? collapsedWidth : width;
    
    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-50 border-r border-gray-200 transition-all duration-200',
          className
        )}
        style={{ width: typeof currentWidth === 'number' ? `${currentWidth}px` : currentWidth }}
        {...props}
      >
        {children}
        {collapsible && (
          <button
            className="absolute bottom-4 right-4 p-2 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50"
            onClick={() => onCollapse?.(!collapsed)}
          >
            <svg
              className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
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
          'flex-1 p-6 bg-gray-50 overflow-auto',
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
          'bg-white border-t border-gray-200 px-6 py-4 text-center text-gray-600',
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

// Attach sub-components to Layout
Layout.Header = Header;
Layout.Sider = Sider;
Layout.Content = Content;
Layout.Footer = Footer;

export { Layout, Header, Sider, Content, Footer };
