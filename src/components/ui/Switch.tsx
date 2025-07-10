import React from 'react';
import { cn } from '@/utils/cn';

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  loading?: boolean;
  size?: 'default' | 'small';
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => void;
  onClick?: (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  defaultChecked = false,
  disabled = false,
  loading = false,
  size = 'default',
  checkedChildren,
  unCheckedChildren,
  className,
  style,
  onChange,
  onClick,
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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    const newChecked = !isChecked;
    
    if (checked === undefined) {
      setInternalChecked(newChecked);
    }

    onChange?.(newChecked, event);
    onClick?.(newChecked, event);
  };

  const getSizeClasses = () => {
    if (size === 'small') {
      return {
        switch: 'h-4 w-7',
        handle: 'w-3 h-3',
        translate: 'translate-x-3',
      };
    }
    return {
      switch: 'h-5 w-9',
      handle: 'w-4 h-4',
      translate: 'translate-x-4',
    };
  };

  const sizeClasses = getSizeClasses();

  const switchClasses = cn(
    'relative inline-flex items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    sizeClasses.switch,
    isChecked ? 'bg-blue-600' : 'bg-gray-200',
    disabled && 'opacity-50 cursor-not-allowed',
    loading && 'cursor-not-allowed',
    !disabled && !loading && 'cursor-pointer',
    className
  );

  const handleClasses = cn(
    'inline-block rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out',
    sizeClasses.handle,
    isChecked ? sizeClasses.translate : 'translate-x-0.5'
  );

  const getChildrenContent = () => {
    if (size === 'small') return null;
    return isChecked ? checkedChildren : unCheckedChildren;
  };

  return (
    <button
      type="button"
      className={switchClasses}
      style={style}
      onClick={handleClick}
      disabled={disabled || loading}
      role="switch"
      aria-checked={isChecked}
    >
      <span className="sr-only">Toggle switch</span>
      
      {/* Background content */}
      {getChildrenContent() && (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center text-xs font-medium text-white transition-opacity',
            isChecked ? 'pl-1' : 'pr-1'
          )}
        >
          {getChildrenContent()}
        </span>
      )}

      {/* Handle */}
      <span className={handleClasses}>
        {loading && (
          <svg
            className="animate-spin h-2 w-2 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </span>
    </button>
  );
};

export { Switch };