import React from 'react';
import { cn } from '@/utils/cn';

export interface SpaceProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg' | number;
  align?: 'start' | 'end' | 'center' | 'baseline';
  wrap?: boolean;
}

const Space: React.FC<SpaceProps> = ({
  direction = 'horizontal',
  size = 'md',
  align,
  wrap = false,
  className,
  children,
  ...props
}) => {
  const sizeMap = {
    sm: 2,
    md: 4,
    lg: 6,
  };

  const gap = typeof size === 'number' ? size : sizeMap[size];

  const alignMap = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    baseline: 'items-baseline',
  };

  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        align && alignMap[align],
        wrap && 'flex-wrap',
        className
      )}
      style={{
        gap: `${gap * 0.25}rem`, // Convert to rem (gap-1 = 0.25rem)
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export { Space };
