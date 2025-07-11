import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  options: SelectOption[];
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  allowClear?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  defaultValue,
  placeholder = 'Please select',
  options,
  onChange,
  disabled = false,
  className,
  size = 'md',
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue);
  const selectRef = useRef<HTMLDivElement>(null);

  const sizes = {
    sm: 'h-8 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-4 text-base',
  };

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string | number) => {
    setSelectedValue(optionValue);
    setIsOpen(false);
    onChange?.(optionValue);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedValue(undefined);
    onChange?.('');
  };

  const selectedOption = options?.find(option => option.value === selectedValue);

  return (
    <div className={cn('relative', className)} ref={selectRef}>
      <div
        className={cn(
          'flex items-center justify-between w-full rounded-md border bg-white cursor-pointer transition-colors',
          'border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2',
          sizes[size],
          disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
          isOpen && 'ring-2 ring-blue-500 ring-offset-2',
          className
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={cn(
          'truncate',
          !selectedOption && 'text-gray-500'
        )}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        
        <div className="flex items-center gap-1">
          {allowClear && selectedValue && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 p-1"
              type="button"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg
            className={cn(
              'w-4 h-4 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {options?.map((option) => (
            <div
              key={option.value}
              className={cn(
                'px-3 py-2 cursor-pointer transition-colors',
                'hover:bg-gray-50',
                option.disabled && 'cursor-not-allowed opacity-50 bg-gray-50',
                selectedValue === option.value && 'bg-blue-50 text-blue-600'
              )}
              onClick={() => !option.disabled && handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Option component for compatibility
const Option: React.FC<{
  value: string | number;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ children }) => {
  return <>{children}</>;
};

// Attach Option to Select for compatibility
Select.Option = Option;

export { Select, Option };
