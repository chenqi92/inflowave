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
  formatter?: (value?: string | number) => React.ReactNode;
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
    const formatValue = (val?: string | number): React.ReactNode => {
      if (formatter) {
        return formatter(val);
      }

      if (typeof val === 'number' && precision !== undefined) {
        return val.toFixed(precision);
      }

      return val;
    };

    return (
      <div ref={ref} className={cn('space-y-1', className)} {...props}>
        {title && (
          <div className='text-sm text-muted-foreground flex items-center gap-2'>
            {icon && <span className='flex-shrink-0'>{icon}</span>}
            <span>{title}</span>
          </div>
        )}
        <div
          className={cn(
            'text-2xl font-semibold text-foreground flex items-baseline',
            valueClassName
          )}
          style={valueStyle}
        >
          {prefix && <span className='mr-1'>{prefix}</span>}
          {formatValue(value)}
          {suffix && <span className='ml-1'>{suffix}</span>}
        </div>
      </div>
    );
  }
);
Statistic.displayName = 'Statistic';

export { Statistic };
export type { StatisticProps };
