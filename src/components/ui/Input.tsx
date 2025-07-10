import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error';
  size?: 'sm' | 'md' | 'lg';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant = 'default', size = 'md', prefix, suffix, ...props }, ref) => {
    const baseStyles = 'flex w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variants = {
      default: 'border-gray-300 focus-visible:ring-blue-500',
      error: 'border-red-500 focus-visible:ring-red-500',
    };

    const sizes = {
      sm: 'h-8 px-2 text-xs',
      md: 'h-9 px-3 text-sm',
      lg: 'h-10 px-4 text-base',
    };

    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 z-10 text-gray-500">
              {prefix}
            </div>
          )}
          <input
            className={cn(
              baseStyles,
              variants[variant],
              sizes[size],
              prefix && 'pl-10',
              suffix && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 z-10 text-gray-500">
              {suffix}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// TextArea component
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error';
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseStyles = 'flex min-h-[80px] w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
    
    const variants = {
      default: 'border-gray-300 focus-visible:ring-blue-500',
      error: 'border-red-500 focus-visible:ring-red-500',
    };

    return (
      <textarea
        className={cn(
          baseStyles,
          variants[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

TextArea.displayName = 'TextArea';

export { Input, TextArea };
