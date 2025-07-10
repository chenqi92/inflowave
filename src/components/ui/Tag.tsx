import React from 'react';
import { cn } from '@/utils/cn';

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing';
  closable?: boolean;
  onClose?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

const Tag: React.FC<TagProps> = ({
  color = 'default',
  closable = false,
  onClose,
  size = 'md',
  className,
  children,
  ...props
}) => {
  const colorStyles = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    processing: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.(e);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        colorStyles[color],
        sizes[size],
        className
      )}
      {...props}
    >
      {color === 'processing' && (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {children}
      
      {closable && (
        <button
          onClick={handleClose}
          className="ml-1 text-current opacity-70 hover:opacity-100 transition-opacity"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

export { Tag };
