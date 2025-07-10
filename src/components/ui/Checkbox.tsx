import React from 'react';
import { cn } from '@/utils/cn';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  defaultChecked = false,
  disabled = false,
  indeterminate = false,
  autoFocus = false,
  className,
  style,
  children,
  onChange,
  onFocus,
  onBlur,
}) => {
  const [internalChecked, setInternalChecked] = React.useState(
    checked !== undefined ? checked : defaultChecked
  );

  const isChecked = checked !== undefined ? checked : internalChecked;

  React.useEffect(() => {
    if (checked !== undefined) {
      setInternalChecked(checked);
    }
  }, [checked]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newChecked = e.target.checked;
    
    if (checked === undefined) {
      setInternalChecked(newChecked);
    }

    onChange?.(e);
  };

  const checkboxClasses = cn(
    'relative w-4 h-4 border border-gray-300 rounded transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    isChecked && !indeterminate && 'bg-blue-600 border-blue-600',
    indeterminate && 'bg-blue-600 border-blue-600',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && 'cursor-pointer hover:border-blue-500'
  );

  const wrapperClasses = cn(
    'inline-flex items-center gap-2',
    disabled && 'cursor-not-allowed opacity-50',
    !disabled && 'cursor-pointer',
    className
  );

  const renderIcon = () => {
    if (indeterminate) {
      return (
        <svg
          className="w-3 h-3 text-white absolute inset-0 m-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
        </svg>
      );
    }

    if (isChecked) {
      return (
        <svg
          className="w-3 h-3 text-white absolute inset-0 m-auto"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return null;
  };

  return (
    <label className={wrapperClasses} style={style}>
      <div className="relative flex items-center">
        <input
          type="checkbox"
          className="sr-only"
          checked={isChecked}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <div className={checkboxClasses}>
          {renderIcon()}
        </div>
      </div>
      {children && (
        <span className="text-sm text-gray-700 select-none">
          {children}
        </span>
      )}
    </label>
  );
};

export { Checkbox };