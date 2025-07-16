import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  header: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
  // Note: 'key' is handled by React automatically and should not be in props interface
}

export interface CollapseProps {
  children: React.ReactElement<PanelProps>[];
  defaultActiveKey?: string[];
  activeKey?: string[];
  onChange?: (activeKeys: string[]) => void;
  accordion?: boolean;
  ghost?: boolean;
  size?: 'small' | 'default' | 'large';
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  header,
  disabled,
  className,
}) => {
  // This component is just for type checking, actual rendering is handled by Collapse
  return <div className={className}>{children}</div>;
};

export const Collapse: React.FC<CollapseProps> = ({
  children,
  defaultActiveKey = [],
  activeKey,
  onChange,
  accordion = false,
  ghost = false,
  size = 'default',
  className,
}) => {
  const [internalActiveKeys, setInternalActiveKeys] =
    useState<string[]>(defaultActiveKey);

  const currentActiveKeys =
    activeKey !== undefined ? activeKey : internalActiveKeys;

  const handleToggle = (key: string) => {
    let newActiveKeys: string[];

    if (accordion) {
      // Accordion mode: only one panel can be open
      newActiveKeys = currentActiveKeys.includes(key) ? [] : [key];
    } else {
      // Normal mode: multiple panels can be open
      if (currentActiveKeys.includes(key)) {
        newActiveKeys = currentActiveKeys.filter(k => k !== key);
      } else {
        newActiveKeys = [...currentActiveKeys, key];
      }
    }

    if (activeKey === undefined) {
      setInternalActiveKeys(newActiveKeys);
    }

    onChange?.(newActiveKeys);
  };

  const sizeClasses = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg',
  };

  return (
    <div
      className={cn(
        'border border rounded-lg overflow-hidden',
        ghost && 'border-none bg-transparent',
        className
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;

        const {
          header,
          children: panelChildren,
          disabled = false,
        } = child.props;
        // Use React's key if available, otherwise fall back to index
        const key = child.key || index.toString();
        const isActive = currentActiveKeys.includes(key);

        return (
          <div
            key={key}
            className={cn(!ghost && index > 0 && 'border-t border')}
          >
            {/* Header */}
            <button
              className={cn(
                'w-full px-4 py-3 text-left flex items-center justify-between',
                'hover:bg-muted/50 transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                sizeClasses[size],
                disabled && 'opacity-50 cursor-not-allowed',
                ghost && 'px-0 hover:bg-transparent',
                !ghost && 'bg-muted/50/50'
              )}
              onClick={() => !disabled && handleToggle(key)}
              disabled={disabled}
              type='button'
            >
              <div className='flex-1'>{header}</div>
              <div
                className={cn(
                  'ml-2 transition-transform duration-200',
                  isActive && 'transform rotate-90'
                )}
              >
                {isActive ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </div>
            </button>

            {/* Content */}
            <div
              className={cn(
                'overflow-hidden transition-all duration-200 ease-in-out',
                isActive ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className={cn('px-4 py-3', ghost && 'px-0')}>
                {panelChildren}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// For backward compatibility with Ant Design API
Collapse.Panel = Panel;
