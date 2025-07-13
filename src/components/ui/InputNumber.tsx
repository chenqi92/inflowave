import * as React from "react"
import { cn } from "@/lib/utils"
import { Minus, Plus } from "lucide-react"
import { Button } from "./Button"

export interface InputNumberProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  precision?: number
  onChange?: (value: number | null) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  formatter?: (value: number | undefined) => string
  parser?: (displayValue: string | undefined) => number
  controls?: boolean
  size?: "sm" | "default" | "lg"
  addonBefore?: React.ReactNode
  addonAfter?: React.ReactNode
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  ({ 
    className, 
    type = "number",
    value,
    defaultValue,
    min,
    max,
    step = 1,
    precision,
    onChange,
    onBlur,
    onFocus,
    formatter,
    parser,
    controls = true,
    size = "default",
    addonBefore,
    addonAfter,
    disabled,
    ...props 
  }, ref) => {
    const [innerValue, setInnerValue] = React.useState<number | null>(
      value !== undefined ? value : defaultValue || null
    )

    const actualValue = value !== undefined ? value : innerValue

    const sizeClasses = {
      sm: "h-8 px-2 text-sm",
      default: "h-10 px-3",
      lg: "h-12 px-4 text-lg"
    }

    const formatValue = (val: number | null): string => {
      if (val === null || val === undefined || isNaN(val)) return ""
      
      if (formatter) {
        return formatter(val)
      }
      
      if (precision !== undefined) {
        return val.toFixed(precision)
      }
      
      return val.toString()
    }

    const parseValue = (displayValue: string): number | null => {
      if (!displayValue.trim()) return null
      
      if (parser) {
        const parsed = parser(displayValue)
        return isNaN(parsed) ? null : parsed
      }
      
      const parsed = parseFloat(displayValue)
      return isNaN(parsed) ? null : parsed
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const displayValue = e.target.value
      const numValue = parseValue(displayValue)
      
      if (value === undefined) {
        setInnerValue(numValue)
      }
      
      onChange?.(numValue)
    }

    const handleStep = (direction: 'up' | 'down') => {
      if (disabled) return
      
      const currentValue = actualValue || 0
      const newValue = direction === 'up' ? currentValue + step : currentValue - step
      
      let finalValue = newValue
      if (min !== undefined && finalValue < min) finalValue = min
      if (max !== undefined && finalValue > max) finalValue = max
      
      if (precision !== undefined) {
        finalValue = parseFloat(finalValue.toFixed(precision))
      }
      
      if (value === undefined) {
        setInnerValue(finalValue)
      }
      
      onChange?.(finalValue)
    }

    const inputElement = (
      <input
        ref={ref}
        type="text"
        className={cn(
          "flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          sizeClasses[size],
          controls && "pr-8",
          className
        )}
        value={formatValue(actualValue)}
        onValueChange={handleInputChange}
        onBlur={onBlur}
        onFocus={onFocus}
        disabled={disabled}
        {...props}
      />
    )

    const stepperControls = controls && !disabled && (
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-4 w-6 p-0 hover:bg-muted"
          onClick={() => handleStep('up')}
          disabled={max !== undefined && actualValue !== null && actualValue >= max}
        >
          <Plus className="h-2 w-2" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-4 w-6 p-0 hover:bg-muted"
          onClick={() => handleStep('down')}
          disabled={min !== undefined && actualValue !== null && actualValue <= min}
        >
          <Minus className="h-2 w-2" />
        </Button>
      </div>
    )

    if (addonBefore || addonAfter) {
      return (
        <div className="flex w-full">
          {addonBefore && (
            <div className="flex items-center px-3 border border-r-0 border-input bg-muted rounded-l-md text-sm">
              {addonBefore}
            </div>
          )}
          <div className="relative flex-1">
            {inputElement}
            {stepperControls}
          </div>
          {addonAfter && (
            <div className="flex items-center px-3 border border-l-0 border-input bg-muted rounded-r-md text-sm">
              {addonAfter}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="relative">
        {inputElement}
        {stepperControls}
      </div>
    )
  }
)
InputNumber.displayName = "InputNumber"

export { InputNumber }