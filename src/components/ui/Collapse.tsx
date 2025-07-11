import React, { useState } from 'react';
import { cn } from '@/utils/cn';
import { CaretRightOutlined } from './Icons';

export interface CollapseProps {
  activeKey?: string | string[];
  defaultActiveKey?: string | string[];
  onChange?: (key: string | string[]) => void;
  accordion?: boolean;
  bordered?: boolean;
  children?: React.ReactNode;
  className?: string;
  expandIcon?: (panelProps: { isActive: boolean }) => React.ReactNode;
  ghost?: boolean;
  size?: 'large' | 'middle' | 'small';
}

export interface PanelProps {
  header: React.ReactNode;
  key: string;
  extra?: React.ReactNode;
  disabled?: boolean;
  forceRender?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ 
  header, 
  key, 
  extra, 
  disabled = false, 
  className,
  children 
}) => {
  // Panel组件由父Collapse管理，这里只是占位符
  return null;
};

const Collapse: React.FC<CollapseProps> & { Panel: typeof Panel } = ({
  activeKey,
  defaultActiveKey,
  onChange,
  accordion = false,
  bordered = true,
  children,
  className,
  expandIcon,
  ghost = false,
  size = 'middle',
}) => {
  const [internalActiveKey, setInternalActiveKey] = useState<string | string[]>(
    activeKey ?? defaultActiveKey ?? (accordion ? '' : [])
  );

  const currentActiveKey = activeKey ?? internalActiveKey;

  const handlePanelClick = (panelKey: string) => {
    let newActiveKey: string | string[];

    if (accordion) {
      newActiveKey = currentActiveKey === panelKey ? '' : panelKey;
    } else {
      const activeKeys = Array.isArray(currentActiveKey) ? currentActiveKey : [currentActiveKey].filter(Boolean);
      if (activeKeys.includes(panelKey)) {
        newActiveKey = activeKeys.filter(key => key !== panelKey);
      } else {
        newActiveKey = [...activeKeys, panelKey];
      }
    }

    if (activeKey === undefined) {
      setInternalActiveKey(newActiveKey);
    }
    onChange?.(newActiveKey);
  };

  const isActive = (panelKey: string): boolean => {
    if (accordion) {
      return currentActiveKey === panelKey;
    }
    const activeKeys = Array.isArray(currentActiveKey) ? currentActiveKey : [currentActiveKey].filter(Boolean);
    return activeKeys.includes(panelKey);
  };

  const renderExpandIcon = (isActive: boolean) => {
    if (expandIcon) {
      return expandIcon({ isActive });
    }
    return (
      <CaretRightOutlined 
        className={cn(
          'transition-transform duration-200',
          isActive && 'rotate-90'
        )}
      />
    );
  };

  const sizeClasses = {
    large: 'text-base',
    middle: 'text-sm', 
    small: 'text-xs'
  };

  return (
    <div
      className={cn(
        'bg-white',
        bordered && !ghost && 'border border-gray-200 rounded-md',
        ghost && 'bg-transparent',
        sizeClasses[size],
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child) || child.type !== Panel) {
          return null;
        }

        const panelProps = child.props as PanelProps;
        const panelKey = panelProps.key;
        const active = isActive(panelKey);

        return (
          <div
            key={panelKey}
            className={cn(
              'border-b border-gray-200 last:border-b-0',
              ghost && 'border-b-0',
              panelProps.className
            )}
          >
            <div
              className={cn(
                'flex items-center justify-between p-4 cursor-pointer transition-colors',
                'hover:bg-gray-50',
                panelProps.disabled && 'cursor-not-allowed opacity-50',
                ghost && 'px-0 py-3'
              )}
              onClick={() => !panelProps.disabled && handlePanelClick(panelKey)}
            >
              <div className="flex items-center gap-3 flex-1">
                {renderExpandIcon(active)}
                <div className="flex-1 font-medium">
                  {panelProps.header}
                </div>
              </div>
              {panelProps.extra && (
                <div onClick={(e) => e.stopPropagation()}>
                  {panelProps.extra}
                </div>
              )}
            </div>
            {active && (
              <div className={cn(
                'px-4 pb-4',
                ghost && 'px-0 pb-3'
              )}>
                {panelProps.children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

Collapse.Panel = Panel;

export { Collapse };
export type { PanelProps as CollapsePanelProps };