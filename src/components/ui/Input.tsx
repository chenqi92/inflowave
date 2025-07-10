import React, { forwardRef, useState } from 'react';
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

// Password component
export interface PasswordProps extends Omit<InputProps, 'type'> {
  visibilityToggle?: boolean;
  iconRender?: (visible: boolean) => React.ReactNode;
}

const Password = forwardRef<HTMLInputElement, PasswordProps>(
  ({ className, visibilityToggle = true, iconRender, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    const toggleVisibility = () => {
      setVisible(!visible);
    };

    const defaultIconRender = (visible: boolean) => (
      <button
        type="button"
        onClick={toggleVisibility}
        className="text-gray-500 hover:text-gray-700 focus:outline-none"
      >
        {visible ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    );

    const suffix = visibilityToggle ? (iconRender ? iconRender(visible) : defaultIconRender(visible)) : props.suffix;

    return (
      <Input
        {...props}
        ref={ref}
        type={visible ? 'text' : 'password'}
        suffix={suffix}
        className={className}
      />
    );
  }
);

Password.displayName = 'Password';

// Attach Password to Input
Input.Password = Password;

export { Input, TextArea };
