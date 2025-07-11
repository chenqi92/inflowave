import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/utils/cn';

export interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  onChangeComplete?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  marks?: Record<number, string | React.ReactNode>;
  included?: boolean;
  vertical?: boolean;
  range?: boolean;
  tooltip?: {
    open?: boolean;
    formatter?: (value: number) => string;
  };
}

export const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue = 0,
  onChange,
  onChangeComplete,
  disabled = false,
  className,
  marks,
  included = true,
  vertical = false,
  range = false,
  tooltip,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue);
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Calculate percentage from value
  const getPercentage = useCallback((val: number) => {
    return ((val - min) / (max - min)) * 100;
  }, [min, max]);

  // Calculate value from percentage
  const getValueFromPercentage = useCallback((percentage: number) => {
    const rawValue = (percentage / 100) * (max - min) + min;
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  // Get position from mouse/touch event
  const getPositionFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return 0;
    
    const rect = sliderRef.current.getBoundingClientRect();
    let position: number;
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || e.changedTouches[0];
      position = vertical ? touch.clientY : touch.clientX;
    } else {
      // Mouse event
      position = vertical ? e.clientY : e.clientX;
    }
    
    if (vertical) {
      const sliderHeight = rect.height;
      const relativePosition = position - rect.top;
      return Math.max(0, Math.min(100, (1 - relativePosition / sliderHeight) * 100));
    } else {
      const sliderWidth = rect.width;
      const relativePosition = position - rect.left;
      return Math.max(0, Math.min(100, (relativePosition / sliderWidth) * 100));
    }
  }, [vertical]);

  // Handle value change
  const handleValueChange = useCallback((newValue: number) => {
    if (disabled) return;
    
    const clampedValue = Math.max(min, Math.min(max, newValue));
    setInternalValue(clampedValue);
    onChange?.(clampedValue);
  }, [disabled, min, max, onChange]);

  // Handle mouse/touch events
  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    setShowTooltip(true);
    
    const percentage = getPositionFromEvent(e);
    const newValue = getValueFromPercentage(percentage);
    handleValueChange(newValue);
  }, [disabled, getPositionFromEvent, getValueFromPercentage, handleValueChange]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || disabled) return;
    
    e.preventDefault();
    const percentage = getPositionFromEvent(e);
    const newValue = getValueFromPercentage(percentage);
    handleValueChange(newValue);
  }, [isDragging, disabled, getPositionFromEvent, getValueFromPercentage, handleValueChange]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    setShowTooltip(false);
    onChangeComplete?.(internalValue);
  }, [isDragging, internalValue, onChangeComplete]);

  // Mouse event handlers
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove);
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = internalValue;
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newValue = Math.min(max, internalValue + step);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newValue = Math.max(min, internalValue - step);
        break;
      case 'Home':
        newValue = min;
        break;
      case 'End':
        newValue = max;
        break;
      default:
        return;
    }
    
    e.preventDefault();
    handleValueChange(newValue);
  }, [disabled, internalValue, min, max, step, handleValueChange]);

  const percentage = getPercentage(internalValue);
  const thumbPosition = vertical ? `${100 - percentage}%` : `${percentage}%`;

  const renderTooltip = () => {
    if (!tooltip?.open && !showTooltip) return null;
    
    const tooltipValue = tooltip?.formatter ? tooltip.formatter(internalValue) : internalValue.toString();
    
    return (
      <div
        className={cn(
          'absolute z-10 px-2 py-1 text-xs text-white bg-gray-800 rounded shadow-lg pointer-events-none',
          'transform -translate-x-1/2 -translate-y-full',
          vertical ? 'left-8 -translate-y-1/2 translate-x-0' : 'bottom-8'
        )}
        style={{
          [vertical ? 'top' : 'left']: thumbPosition,
        }}
      >
        {tooltipValue}
        <div
          className={cn(
            'absolute w-1 h-1 bg-gray-800 transform rotate-45',
            vertical ? 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' : 'bottom-0 left-1/2 translate-y-1/2 -translate-x-1/2'
          )}
        />
      </div>
    );
  };

  const renderMarks = () => {
    if (!marks) return null;
    
    return Object.entries(marks).map(([value, label]) => {
      const markValue = Number(value);
      const markPercentage = getPercentage(markValue);
      
      return (
        <div
          key={value}
          className={cn(
            'absolute flex items-center justify-center text-xs text-gray-500',
            vertical ? 'left-6 transform -translate-y-1/2' : 'top-6 transform -translate-x-1/2'
          )}
          style={{
            [vertical ? 'top' : 'left']: `${vertical ? 100 - markPercentage : markPercentage}%`,
          }}
        >
          {/* Mark dot */}
          <div
            className={cn(
              'w-1 h-1 rounded-full bg-gray-400',
              vertical ? 'absolute left-0 transform -translate-x-1/2' : 'absolute top-0 transform -translate-y-1/2'
            )}
            style={{
              [vertical ? 'left' : 'top']: vertical ? '-12px' : '-12px',
            }}
          />
          {/* Mark label */}
          <span className={vertical ? 'ml-2' : 'mt-2'}>
            {label}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      className={cn(
        'relative',
        vertical ? 'h-48 w-6' : 'h-6 w-full',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
      {...props}
    >
      {/* Slider track */}
      <div
        ref={sliderRef}
        className={cn(
          'absolute bg-gray-200 rounded-full cursor-pointer',
          vertical ? 'w-1 h-full left-1/2 transform -translate-x-1/2' : 'h-1 w-full top-1/2 transform -translate-y-1/2'
        )}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        {/* Filled track */}
        {included && (
          <div
            className={cn(
              'absolute bg-blue-500 rounded-full',
              vertical ? 'w-full' : 'h-full'
            )}
            style={{
              [vertical ? 'height' : 'width']: `${percentage}%`,
              [vertical ? 'bottom' : 'left']: 0,
            }}
          />
        )}
        
        {/* Slider thumb */}
        <div
          ref={thumbRef}
          className={cn(
            'absolute w-4 h-4 bg-white border-2 border-blue-500 rounded-full cursor-pointer',
            'transform -translate-x-1/2 -translate-y-1/2',
            'hover:shadow-lg transition-shadow',
            isDragging && 'shadow-lg scale-110',
            disabled && 'cursor-not-allowed'
          )}
          style={{
            [vertical ? 'top' : 'left']: thumbPosition,
            [vertical ? 'left' : 'top']: '50%',
          }}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => !isDragging && setShowTooltip(false)}
        >
          {renderTooltip()}
        </div>
      </div>
      
      {/* Marks */}
      {renderMarks()}
    </div>
  );
};

export default Slider;