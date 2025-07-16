import React, { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

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

// 定义 Collapse 组件的类型，包含 Panel 属性
export interface CollapseComponent extends React.FC<CollapseProps> {
  Panel: React.FC<PanelProps>;
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

const CollapseComponent: React.FC<CollapseProps> = ({
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

  const handleValueChange = (value: string | string[]) => {
    const newActiveKeys = Array.isArray(value) ? value : value ? [value] : [];

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

  // 如果是手风琴模式，使用 shadcn Accordion 组件
  if (accordion) {
    return (
      <Accordion
        type="single"
        collapsible
        value={currentActiveKeys[0] || ''}
        onValueChange={(value) => handleValueChange(value)}
        className={cn(
          ghost && 'border-none bg-transparent',
          sizeClasses[size],
          className
        )}
      >
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;

          const {
            header,
            children: panelChildren,
            disabled = false,
            className: panelClassName,
          } = child.props;

          const key = child.key || index.toString();

          return (
            <AccordionItem
              key={key}
              value={key}
              disabled={disabled}
              className={cn(
                ghost && 'border-none',
                panelClassName
              )}
            >
              <AccordionTrigger
                className={cn(
                  'hover:no-underline',
                  ghost && 'px-0',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled}
              >
                {header}
              </AccordionTrigger>
              <AccordionContent
                className={cn(
                  'pb-4 pt-0',
                  ghost && 'px-0'
                )}
              >
                {panelChildren}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    );
  }

  // 非手风琴模式，使用多个 Collapsible 组件
  return (
    <div
      className={cn(
        'space-y-0',
        !ghost && 'border border-border rounded-lg overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;

        const {
          header,
          children: panelChildren,
          disabled = false,
          className: panelClassName,
        } = child.props;

        const key = child.key || index.toString();
        const isOpen = currentActiveKeys.includes(key);

        const handleToggle = () => {
          if (disabled) return;

          const newActiveKeys = isOpen
            ? currentActiveKeys.filter(k => k !== key)
            : [...currentActiveKeys, key];

          handleValueChange(newActiveKeys);
        };

        return (
          <Collapsible
            key={key}
            open={isOpen}
            onOpenChange={handleToggle}
            disabled={disabled}
            className={cn(
              !ghost && index > 0 && 'border-t border-border',
              panelClassName
            )}
          >
            <CollapsibleTrigger
              className={cn(
                'flex w-full items-center justify-between py-4 px-4 text-left font-medium transition-all',
                'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-50',
                '[&[data-state=open]>svg]:rotate-180',
                ghost && 'px-0 hover:bg-transparent'
              )}
              disabled={disabled}
            >
              {header}
              <svg
                className="h-4 w-4 shrink-0 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className={cn('px-4 pb-4 pt-0', ghost && 'px-0')}>
                {panelChildren}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

// 创建带有 Panel 属性的 Collapse 组件
// 这是为了向后兼容 Ant Design API 的设计模式
export const Collapse = CollapseComponent as CollapseComponent;
Collapse.Panel = Panel;
