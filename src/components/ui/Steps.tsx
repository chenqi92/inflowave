import React from 'react';
import { cn } from '@/utils/cn';

export interface StepProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  status?: 'wait' | 'process' | 'finish' | 'error';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface StepsProps {
  current?: number;
  direction?: 'horizontal' | 'vertical';
  labelPlacement?: 'horizontal' | 'vertical';
  size?: 'default' | 'small';
  status?: 'wait' | 'process' | 'finish' | 'error';
  type?: 'default' | 'navigation';
  className?: string;
  style?: React.CSSProperties;
  onChange?: (current: number) => void;
  items?: StepProps[];
  children?: React.ReactNode;
}

const Step: React.FC<StepProps & {
  index: number;
  isLast: boolean;
  isCurrent: boolean;
  direction: 'horizontal' | 'vertical';
  size: 'default' | 'small';
  onClick?: () => void;
}> = ({
  title,
  description,
  status = 'wait',
  icon,
  disabled = false,
  index,
  isLast,
  isCurrent,
  direction,
  size,
  onClick,
}) => {
  const getStepStatus = () => {
    if (status !== 'wait') return status;
    return isCurrent ? 'process' : 'wait';
  };

  const stepStatus = getStepStatus();

  const getIconClasses = () => {
    const baseClasses = cn(
      'flex items-center justify-center rounded-full border-2 transition-colors',
      size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
    );

    switch (stepStatus) {
      case 'finish':
        return cn(baseClasses, 'bg-blue-600 border-blue-600 text-white');
      case 'process':
        return cn(baseClasses, 'bg-blue-600 border-blue-600 text-white');
      case 'error':
        return cn(baseClasses, 'bg-red-600 border-red-600 text-white');
      default:
        return cn(baseClasses, 'bg-white border-gray-300 text-gray-500');
    }
  };

  const getConnectorClasses = () => {
    const baseClasses = 'bg-gray-300 transition-colors';
    
    if (direction === 'vertical') {
      return cn(baseClasses, 'w-px h-8 ml-3');
    }
    
    return cn(baseClasses, 'h-px flex-1 mt-4');
  };

  const getActiveConnectorClasses = () => {
    if (stepStatus === 'finish') {
      return 'bg-blue-600';
    }
    return '';
  };

  const renderIcon = () => {
    if (icon) {
      return icon;
    }

    if (stepStatus === 'finish') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (stepStatus === 'error') {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return index + 1;
  };

  const getTitleClasses = () => {
    switch (stepStatus) {
      case 'finish':
        return 'text-blue-600 font-medium';
      case 'process':
        return 'text-blue-600 font-medium';
      case 'error':
        return 'text-red-600 font-medium';
      default:
        return 'text-gray-500';
    }
  };

  const getDescriptionClasses = () => {
    switch (stepStatus) {
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const stepClasses = cn(
    'flex',
    direction === 'vertical' ? 'flex-col' : 'flex-row items-center',
    !disabled && onClick && 'cursor-pointer',
    disabled && 'opacity-50'
  );

  const contentClasses = cn(
    'flex',
    direction === 'vertical' ? 'flex-row items-start gap-3' : 'flex-col items-center gap-1',
    direction === 'horizontal' && 'min-w-0'
  );

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div className={stepClasses} onClick={handleClick}>
      <div className={contentClasses}>
        <div className={getIconClasses()}>
          {renderIcon()}
        </div>
        <div className={cn(direction === 'vertical' ? 'flex-1' : 'text-center')}>
          {title && (
            <div className={cn('text-sm', getTitleClasses())}>
              {title}
            </div>
          )}
          {description && (
            <div className={cn('text-xs mt-1', getDescriptionClasses())}>
              {description}
            </div>
          )}
        </div>
      </div>
      {!isLast && (
        <div className={cn(getConnectorClasses(), getActiveConnectorClasses())} />
      )}
    </div>
  );
};

const Steps: React.FC<StepsProps> = ({
  current = 0,
  direction = 'horizontal',
  labelPlacement = 'horizontal',
  size = 'default',
  status = 'process',
  type = 'default',
  className,
  style,
  onChange,
  items = [],
  children,
}) => {
  const steps = items.length > 0 ? items : React.Children.toArray(children) as StepProps[];

  const stepsClasses = cn(
    'flex',
    direction === 'vertical' ? 'flex-col' : 'flex-row',
    direction === 'horizontal' && 'items-start',
    className
  );

  const handleStepClick = (index: number) => {
    if (type === 'navigation') {
      onChange?.(index);
    }
  };

  return (
    <div className={stepsClasses} style={style}>
      {steps.map((step, index) => {
        const stepStatus = (() => {
          if (step.status) return step.status;
          if (index < current) return 'finish';
          if (index === current) return status;
          return 'wait';
        })();

        return (
          <Step
            key={index}
            {...step}
            index={index}
            isLast={index === steps.length - 1}
            isCurrent={index === current}
            direction={direction}
            size={size}
            status={stepStatus}
            onClick={type === 'navigation' ? () => handleStepClick(index) : undefined}
          />
        );
      })}
    </div>
  );
};

export { Steps, Step };