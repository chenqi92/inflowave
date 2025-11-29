import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatisticProps {
  className?: string;
  title?: React.ReactNode;
  value?: string | number | React.ReactNode;
  precision?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  icon?: React.ReactNode;
  valueStyle?: React.CSSProperties;
  valueClassName?: string;
  formatter?: (value?: string | number) => string | number;
}

const Statistic = React.forwardRef<HTMLDivElement, StatisticProps>(
  (
    {
      className,
      title,
      value,
      precision,
      prefix,
      suffix,
      icon,
      valueStyle,
      valueClassName,
      formatter,
      ...props
    },
    ref
  ) => {
    const formatValue = (val?: string | number): string | number => {
      if (formatter) {
        return formatter(val);
      }

      if (typeof val === 'number' && precision !== undefined) {
        return val.toFixed(precision);
      }

      return val ?? '';
    };

    return (
      <div ref={ref} className={cn('space-y-1', className)} {...props}>
        {title && (
          <div className='text-xs text-muted-foreground flex items-center gap-2'>
            {icon && <span className='flex-shrink-0'>{icon}</span>}
            <span>{title}</span>
          </div>
        )}
        <div
          className={cn(
            'text-xl font-semibold text-foreground flex items-baseline',
            valueClassName
          )}
          style={valueStyle}
        >
          {prefix && <span className='mr-1'>{prefix}</span>}
          {typeof value === 'string' || typeof value === 'number' ? formatValue(value) : value}
          {suffix && <span className='ml-1'>{suffix}</span>}
        </div>
      </div>
    );
  }
);
Statistic.displayName = 'Statistic';

export { Statistic };
export type { StatisticProps };
