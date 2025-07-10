import React from 'react';
import { cn } from '@/utils/cn';

export interface SpinProps {
  spinning?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tip?: string;
  children?: React.ReactNode;
  className?: string;
}

const Spin: React.FC<SpinProps> = ({
  spinning = true,
  size = 'md',
  tip,
  children,
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <svg
        className={cn(
          'animate-spin text-blue-600',
          sizes[size]
        )}
        fill="none"
        viewBox="0 0 24 24"
      >
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
      {tip && (
        <div className="mt-2 text-sm text-gray-600">
          {tip}
        </div>
      )}
    </div>
  );

  if (!children) {
    return (
      <div className={cn('flex items-center justify-center p-4', className)}>
        {spinning && spinner}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {children}
      {spinning && (
        <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10">
          {spinner}
        </div>
      )}
    </div>
  );
};

export { Spin };
