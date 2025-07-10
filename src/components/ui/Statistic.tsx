import React from 'react';
import { cn } from '@/utils/cn';

export interface StatisticProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  value?: string | number;
  precision?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  valueStyle?: React.CSSProperties;
  formatter?: (value?: string | number) => React.ReactNode;
  loading?: boolean;
}

const Statistic: React.FC<StatisticProps> = ({
  title,
  value,
  precision,
  prefix,
  suffix,
  valueStyle,
  formatter,
  loading = false,
  className,
  ...props
}) => {
  const formatValue = (val?: string | number): React.ReactNode => {
    if (loading) {
      return (
        <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
      );
    }

    if (formatter) {
      return formatter(val);
    }

    if (typeof val === 'number' && precision !== undefined) {
      return val.toFixed(precision);
    }

    return val;
  };

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {title && (
        <div className="text-sm text-gray-600 font-medium">
          {title}
        </div>
      )}
      
      <div className="flex items-center gap-1" style={valueStyle}>
        {prefix && (
          <span className="text-current opacity-75">
            {prefix}
          </span>
        )}
        
        <span className="text-2xl font-semibold text-gray-900">
          {formatValue(value)}
        </span>
        
        {suffix && (
          <span className="text-current opacity-75">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export { Statistic };
