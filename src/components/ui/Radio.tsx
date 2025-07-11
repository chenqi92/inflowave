import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/utils/cn';

// Radio Component Props
export interface RadioProps {
  value?: string | number;
  checked?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  onChange?: (checked: boolean) => void;
}

// Radio Group Context
interface RadioGroupContextType {
  value?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroupContext = createContext<RadioGroupContextType | undefined>(undefined);

// Radio Group Component Props
export interface RadioGroupProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string | number) => void;
  disabled?: boolean;
  name?: string;
  children?: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  direction?: 'horizontal' | 'vertical';
}

// Individual Radio Component
export const Radio: React.FC<RadioProps> & { Group: React.FC<RadioGroupProps> } = ({
  value,
  checked,
  disabled = false,
  children,
  className,
  onChange,
  ...props
}) => {
  const groupContext = useContext(RadioGroupContext);
  const [isChecked, setIsChecked] = useState(checked || false);

  // Use group context if available
  const isGrouped = groupContext !== undefined;
  const actualChecked = isGrouped ? groupContext.value === value : isChecked;
  const actualDisabled = disabled || groupContext?.disabled;

  useEffect(() => {
    if (checked !== undefined) {
      setIsChecked(checked);
    }
  }, [checked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (actualDisabled) return;
    
    const newChecked = e.target.checked;
    
    if (isGrouped && groupContext?.onChange && value !== undefined) {
      groupContext.onChange(value);
    } else {
      setIsChecked(newChecked);
      onChange?.(newChecked);
    }
  };

  return (
    <label
      className={cn(
        'inline-flex items-center cursor-pointer',
        actualDisabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <input
        type="radio"
        checked={actualChecked}
        disabled={actualDisabled}
        onChange={handleChange}
        name={groupContext?.name}
        value={value}
        className="sr-only"
        {...props}
      />
      
      {/* Custom radio button */}
      <div
        className={cn(
          'w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center transition-colors',
          actualChecked
            ? 'border-blue-600 bg-blue-600'
            : 'border-gray-300 bg-white hover:border-blue-400',
          actualDisabled && 'cursor-not-allowed'
        )}
      >
        {actualChecked && (
          <div className="w-2 h-2 rounded-full bg-white" />
        )}
      </div>
      
      {/* Label */}
      {children && (
        <span
          className={cn(
            'text-sm',
            actualDisabled ? 'text-gray-400' : 'text-gray-700'
          )}
        >
          {children}
        </span>
      )}
    </label>
  );
};

// Radio Group Component
const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  defaultValue,
  onChange,
  disabled = false,
  name,
  children,
  className,
  size = 'medium',
  direction = 'horizontal',
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (newValue: string | number) => {
    if (disabled) return;
    
    setInternalValue(newValue);
    onChange?.(newValue);
  };

  const contextValue: RadioGroupContextType = {
    value: internalValue,
    onChange: handleChange,
    disabled,
    name,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex',
          direction === 'vertical' ? 'flex-col space-y-2' : 'flex-row space-x-4',
          size === 'small' && 'text-sm',
          size === 'large' && 'text-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

// Attach Group to Radio
Radio.Group = RadioGroup;

export { RadioGroup };
export type { RadioGroupProps };