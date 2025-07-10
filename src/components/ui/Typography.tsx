import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

// Title component
export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5;
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

const Title = forwardRef<HTMLHeadingElement, TitleProps>(
  ({ className, level = 1, type = 'primary', children, ...props }, ref) => {
    const Component = `h${level}` as keyof JSX.IntrinsicElements;
    
    const levelStyles = {
      1: 'text-3xl font-bold',
      2: 'text-2xl font-semibold',
      3: 'text-xl font-semibold',
      4: 'text-lg font-medium',
      5: 'text-base font-medium',
    };

    const typeStyles = {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      danger: 'text-red-600',
    };

    return React.createElement(
      Component,
      {
        ref,
        className: cn(levelStyles[level], typeStyles[type], className),
        ...props,
      },
      children
    );
  }
);

Title.displayName = 'Title';

// Text component
export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  strong?: boolean;
  italic?: boolean;
  underline?: boolean;
  delete?: boolean;
  code?: boolean;
  mark?: boolean;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
}

const Text = forwardRef<HTMLSpanElement, TextProps>(
  ({ 
    className, 
    type = 'primary', 
    strong, 
    italic, 
    underline, 
    delete: del, 
    code, 
    mark,
    size = 'base',
    children, 
    ...props 
  }, ref) => {
    const typeStyles = {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      danger: 'text-red-600',
    };

    const sizeStyles = {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    };

    const baseClassName = cn(
      sizeStyles[size],
      typeStyles[type],
      strong && 'font-semibold',
      italic && 'italic',
      underline && 'underline',
      del && 'line-through',
      code && 'font-mono bg-gray-100 px-1 py-0.5 rounded text-sm',
      mark && 'bg-yellow-200 px-1 py-0.5 rounded',
      className
    );

    return (
      <span ref={ref} className={baseClassName} {...props}>
        {children}
      </span>
    );
  }
);

Text.displayName = 'Text';

// Paragraph component
export interface ParagraphProps extends React.HTMLAttributes<HTMLParagraphElement> {
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'base' | 'lg';
  ellipsis?: boolean;
}

const Paragraph = forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ className, type = 'primary', size = 'base', ellipsis, children, ...props }, ref) => {
    const typeStyles = {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      success: 'text-green-600',
      warning: 'text-yellow-600',
      danger: 'text-red-600',
    };

    const sizeStyles = {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
    };

    return (
      <p
        ref={ref}
        className={cn(
          sizeStyles[size],
          typeStyles[type],
          ellipsis && 'truncate',
          'leading-relaxed',
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);

Paragraph.displayName = 'Paragraph';

// Link component
export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  underline?: boolean;
  disabled?: boolean;
}

const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, type = 'primary', underline = true, disabled = false, children, ...props }, ref) => {
    const typeStyles = {
      primary: 'text-blue-600 hover:text-blue-800',
      secondary: 'text-gray-600 hover:text-gray-800',
      success: 'text-green-600 hover:text-green-800',
      warning: 'text-yellow-600 hover:text-yellow-800',
      danger: 'text-red-600 hover:text-red-800',
    };

    return (
      <a
        ref={ref}
        className={cn(
          'transition-colors cursor-pointer',
          typeStyles[type],
          underline && 'underline',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {children}
      </a>
    );
  }
);

Link.displayName = 'Link';

// Typography namespace object (similar to Ant Design)
const Typography = {
  Title,
  Text,
  Paragraph,
  Link,
};

export { Typography, Title, Text, Paragraph, Link };
