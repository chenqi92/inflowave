import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface SpinProps {
  spinning?: boolean;
  size?: 'small' | 'default' | 'large';
  tip?: string;
  className?: string;
  children?: React.ReactNode;
  indicator?: React.ReactNode;
}

const Spin = React.forwardRef<HTMLDivElement, SpinProps>(
  (
    {
      spinning = false,
      size = 'default',
      tip,
      className,
      children,
      indicator,
      ...props
    },
    ref
  ) => {
    // Remove custom props to prevent them from being passed to DOM
    const {
      spinning: _,
      size: __,
      tip: ___,
      indicator: ____,
      ...domProps
    } = props as any;
    const sizeClasses = {
      small: 'h-4 w-4',
      default: 'h-6 w-6',
      large: 'h-8 w-8',
    };

    const defaultIndicator = (
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
    );

    if (!children) {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center space-y-2',
            className
          )}
          {...domProps}
        >
          {indicator || defaultIndicator}
          {tip && <span className='text-sm text-muted-foreground'>{tip}</span>}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('relative', className)} {...domProps}>
        {children}
        {spinning && (
          <div className='absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm'>
            <div className='flex flex-col items-center space-y-2'>
              {indicator || defaultIndicator}
              {tip && (
                <span className='text-sm text-muted-foreground'>{tip}</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);
Spin.displayName = 'Spin';

export { Spin };
export type { SpinProps };
