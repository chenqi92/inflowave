import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

export interface InputNumberProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'small' | 'middle' | 'large';
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (value: number | null) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPressEnter?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  controls?: boolean;
  formatter?: (value: number | undefined) => string;
  parser?: (displayValue: string | undefined) => number;
  addonBefore?: React.ReactNode;
  addonAfter?: React.ReactNode;
}

const InputNumber: React.FC<InputNumberProps> = ({
  value,
  defaultValue,
  min,
  max,
  step = 1,
  precision,
  disabled = false,
  readOnly = false,
  size = 'middle',
  placeholder,
  className,
  style,
  onChange,
  onBlur,
  onFocus,
  onPressEnter,
  controls = true,
  formatter,
  parser,
  addonBefore,
  addonAfter,
}) => {
  const [internalValue, setInternalValue] = useState<number | null>(
    value !== undefined ? value : defaultValue || null
  );
  const [displayValue, setDisplayValue] = useState<string>('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (internalValue !== null) {
      const formatted = formatter ? formatter(internalValue) : String(internalValue);
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  }, [internalValue, formatter]);

  const formatValue = (val: number): number => {
    if (precision !== undefined) {
      return Number(val.toFixed(precision));
    }
    return val;
  };

  const validateValue = (val: number): number => {
    if (min !== undefined && val < min) {
      return min;
    }
    if (max !== undefined && val > max) {
      return max;
    }
    return val;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    if (inputValue === '') {
      setInternalValue(null);
      onChange?.(null);
      return;
    }

    const parsedValue = parser ? parser(inputValue) : parseFloat(inputValue);
    
    if (!isNaN(parsedValue)) {
      const formattedValue = formatValue(validateValue(parsedValue));
      setInternalValue(formattedValue);
      onChange?.(formattedValue);
    }
  };

  const handleStep = (direction: 'up' | 'down') => {
    if (disabled || readOnly) return;

    const currentValue = internalValue || 0;
    const newValue = direction === 'up' ? currentValue + step : currentValue - step;
    const validatedValue = validateValue(formatValue(newValue));
    
    setInternalValue(validatedValue);
    onChange?.(validatedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onPressEnter?.(e);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleStep('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleStep('down');
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(e);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'h-7 px-2 text-sm';
      case 'large':
        return 'h-10 px-3 text-base';
      default:
        return 'h-8 px-3 text-sm';
    }
  };

  const inputClasses = cn(
    'border border-gray-300 rounded-md bg-white transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    getSizeClasses(),
    disabled && 'bg-gray-100 cursor-not-allowed',
    readOnly && 'bg-gray-50',
    className
  );

  const controlsClasses = cn(
    'flex flex-col border-l border-gray-300 ml-1',
    size === 'small' && 'text-xs',
    size === 'large' && 'text-sm'
  );

  const controlButtonClasses = cn(
    'flex items-center justify-center w-6 bg-white hover:bg-gray-50 border-b border-gray-300 first:rounded-tr-md last:rounded-br-md last:border-b-0',
    'transition-colors cursor-pointer select-none',
    size === 'small' && 'h-3.5',
    size === 'large' && 'h-5',
    size === 'middle' && 'h-4',
    disabled && 'cursor-not-allowed opacity-50 hover:bg-white'
  );

  const inputElement = (
    <div className="flex items-center rounded-md border border-gray-300 bg-white overflow-hidden">
      <input
        type="text"
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          'flex-1 border-none outline-none bg-transparent',
          getSizeClasses(),
          'border-0 focus:ring-0'
        )}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={style}
      />
      {controls && (
        <div className={controlsClasses}>
          <div
            className={controlButtonClasses}
            onClick={() => handleStep('up')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 4l4 4H2z" />
            </svg>
          </div>
          <div
            className={controlButtonClasses}
            onClick={() => handleStep('down')}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 8L2 4h8z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  if (addonBefore || addonAfter) {
    return (
      <div className={cn('flex items-center', className)}>
        {addonBefore && (
          <div className="px-3 py-1 bg-gray-50 border border-r-0 border-gray-300 rounded-l-md text-sm">
            {addonBefore}
          </div>
        )}
        {inputElement}
        {addonAfter && (
          <div className="px-3 py-1 bg-gray-50 border border-l-0 border-gray-300 rounded-r-md text-sm">
            {addonAfter}
          </div>
        )}
      </div>
    );
  }

  return inputElement;
};

export { InputNumber };