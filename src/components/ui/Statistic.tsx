import * as React from "react"
import { cn } from "@/lib/utils"

interface StatisticProps {
  className?: string
  title?: React.ReactNode
  value?: string | number | React.ReactNode
  precision?: number
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  valueStyle?: React.CSSProperties
  formatter?: (value?: string | number) => React.ReactNode
}

const Statistic = React.forwardRef<HTMLDivElement, StatisticProps>(
  ({ 
    className, 
    title, 
    value, 
    precision, 
    prefix, 
    suffix, 
    valueStyle,
    formatter,
    ...props 
  }, ref) => {
    const formatValue = (val?: string | number): React.ReactNode => {
      if (formatter) {
        return formatter(val)
      }
      
      if (typeof val === 'number' && precision !== undefined) {
        return val.toFixed(precision)
      }
      
      return val
    }

    return (
      <div
        ref={ref}
        className={cn("space-y-1", className)}
        {...props}
      >
        {title && (
          <div className="text-sm text-muted-foreground">
            {title}
          </div>
        )}
        <div 
          className="text-2xl font-semibold text-foreground flex items-baseline"
          style={valueStyle}
        >
          {prefix && <span className="mr-1">{prefix}</span>}
          {formatValue(value)}
          {suffix && <span className="ml-1">{suffix}</span>}
        </div>
      </div>
    )
  }
)
Statistic.displayName = "Statistic"

export { Statistic }
export type { StatisticProps }