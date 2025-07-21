import * as React from 'react';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from './Button';

// Helper function to merge refs
function mergeRefs<T = unknown>(
  refs: Array<React.MutableRefObject<T> | React.LegacyRef<T>>
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

export interface InputNumberProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'onBlur' | 'onFocus' | 'min' | 'max' | 'step' | 'size'
  > {
  value?: number | null;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onChange?: (value: number | null) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  formatter?: (value: number | undefined) => string;
  parser?: (displayValue: string | undefined) => number;
  controls?: boolean;
  size?: 'sm' | 'default' | 'lg';
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
  /** 单位文本，会显示在数字后面，增减按钮前面（始终内联显示） */
  unit?: string;
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  (
    {
      className,
      type: _type = 'number',
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
      size = 'default',
      addonBefore,
      addonAfter,
      unit,
      disabled,
      ...props
    },
    ref
  ) => {
    const [innerValue, setInnerValue] = React.useState<number | null>(
      value !== undefined ? value : defaultValue || null
    );
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [textWidth, setTextWidth] = React.useState(0);

    const actualValue = value !== undefined ? value : innerValue;

    const sizeClasses = {
      sm: 'h-8 px-2 text-sm',
      default: 'h-10 px-3',
      lg: 'h-12 px-4 text-lg',
    };

    const formatValue = React.useCallback((val: number | null): string => {
      if (val === null || val === undefined || isNaN(val)) return '';

      if (formatter) {
        return formatter(val);
      }

      if (precision !== undefined) {
        return val.toFixed(precision);
      }

      return val.toString();
    }, [formatter, precision]);

    // 计算文字宽度
    React.useEffect(() => {
      const calculateTextWidth = () => {
        if (!inputRef.current) return;
        
        const input = inputRef.current;
        const displayValue = formatValue(actualValue);
        
        if (!displayValue) {
          setTextWidth(0);
          return;
        }
        
        // 创建一个临时元素来测量文字宽度
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.fontSize = window.getComputedStyle(input).fontSize;
        span.style.fontFamily = window.getComputedStyle(input).fontFamily;
        span.style.fontWeight = window.getComputedStyle(input).fontWeight;
        span.textContent = displayValue;
        
        document.body.appendChild(span);
        const width = span.offsetWidth;
        document.body.removeChild(span);
        
        setTextWidth(width);
      };
      
      calculateTextWidth();
    }, [actualValue, formatValue]);

    const parseValue = (displayValue: string): number | null => {
      if (!displayValue.trim()) return null;

      if (parser) {
        const parsed = parser(displayValue);
        return isNaN(parsed) ? null : parsed;
      }

      const parsed = parseFloat(displayValue);
      return isNaN(parsed) ? null : parsed;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const displayValue = e.target.value;
      const numValue = parseValue(displayValue);

      if (value === undefined) {
        setInnerValue(numValue);
      }

      onChange?.(numValue);
    };

    const handleStep = (direction: 'up' | 'down') => {
      if (disabled) return;

      const currentValue = actualValue || 0;
      const newValue =
        direction === 'up' ? currentValue + step : currentValue - step;

      let finalValue = newValue;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;

      if (precision !== undefined) {
        finalValue = parseFloat(finalValue.toFixed(precision));
      }

      if (value === undefined) {
        setInnerValue(finalValue);
      }

      onChange?.(finalValue);
    };

    const getInputElement = () => {
      // 只需要为控制按钮预留空间，单位会动态跟随数字
      let rightPadding = 'pr-3'; // 默认padding
      
      if (controls && !disabled) {
        rightPadding = 'pr-8'; // 只为控制按钮预留空间
      }
      
      return (
        <input
          ref={mergeRefs([inputRef, ref])}
          type='text'
          className={cn(
            'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            sizeClasses[size],
            rightPadding,
            className
          )}
          value={formatValue(actualValue)}
          onChange={handleInputChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          {...props}
        />
      );
    };

    const getInlineUnit = () => {
      const displayUnit = unit || addonAfter;
      if (!displayUnit) return null;
      
      // 获取输入框的padding值
      const sizeInfo = {
        sm: 8,    // px-2
        default: 12, // px-3  
        lg: 16,   // px-4
      };
      
      const leftPadding = sizeInfo[size];
      const leftOffset = `${leftPadding + textWidth + 2}px`; // +2px for spacing
      
      return (
        <div 
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none text-sm text-muted-foreground"
          style={{ left: leftOffset }}
        >
          {displayUnit}
        </div>
      );
    };

    const getStepperControls = () => {
      if (!controls || disabled) return null;
      
      // 控制按钮始终在最右侧
      return (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col z-10">
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-4 w-6 p-0 hover:bg-muted'
            onClick={() => handleStep('up')}
            disabled={
              max !== undefined && actualValue !== null && actualValue >= max
            }
          >
            <Plus className='h-2 w-2' />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='h-4 w-6 p-0 hover:bg-muted'
            onClick={() => handleStep('down')}
            disabled={
              min !== undefined && actualValue !== null && actualValue <= min
            }
          >
            <Minus className='h-2 w-2' />
          </Button>
        </div>
      );
    };

    // 所有单位都内联显示，不再有独立的addon框
    // 只保留addonBefore的支持
    
    if (addonBefore) {
      return (
        <div className='flex w-full'>
          <div className='flex items-center px-3 border border-r-0 border-input bg-muted rounded-l-md text-sm'>
            {addonBefore}
          </div>
          <div className='relative flex-1'>
            {getInputElement()}
            {getInlineUnit()}
            {getStepperControls()}
          </div>
        </div>
      );
    }

    return (
      <div className='relative'>
        {getInputElement()}
        {getInlineUnit()}
        {getStepperControls()}
      </div>
    );
  }
);
InputNumber.displayName = 'InputNumber';

export { InputNumber };
