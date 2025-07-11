import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

export interface DropdownMenuItem {
  key: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  type?: 'divider';
}

export interface DropdownMenuProps {
  items: DropdownMenuItem[];
}

export interface DropdownProps {
  menu: DropdownMenuProps;
  trigger?: ('click' | 'hover')[];
  placement?: 'bottom' | 'bottomLeft' | 'bottomRight' | 'top' | 'topLeft' | 'topRight';
  disabled?: boolean;
  children: React.ReactElement;
}

const Dropdown: React.FC<DropdownProps> = ({
  menu,
  trigger = ['click'],
  placement = 'bottomLeft',
  disabled = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTrigger = () => {
    if (disabled) return;
    if (trigger.includes('click')) {
      setIsOpen(!isOpen);
    }
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    if (trigger.includes('hover')) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    if (trigger.includes('hover')) {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 100);
    }
  };

  const handleMenuItemClick = (item: DropdownMenuItem) => {
    if (item.disabled) return;
    item.onClick?.();
    setIsOpen(false);
  };

  const placementStyles = {
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-1',
    bottomLeft: 'top-full left-0 mt-1',
    bottomRight: 'top-full right-0 mt-1',
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-1',
    topLeft: 'bottom-full left-0 mb-1',
    topRight: 'bottom-full right-0 mb-1',
  };

  return (
    <div
      className="relative inline-block"
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {React.cloneElement(children, {
        onClick: handleTrigger,
        className: cn(children.props.className, disabled && 'cursor-not-allowed opacity-50'),
      })}

      {isOpen && (
        <div
          className={cn(
            'absolute z-50 min-w-[120px] bg-white border border-gray-200 rounded-md shadow-lg py-1',
            placementStyles[placement]
          )}
        >
          {menu.items.map((item) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.key}
                  className="h-px bg-gray-200 my-1"
                  role="separator"
                />
              );
            }
            
            return (
              <button
                key={item.key}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  'hover:bg-gray-50',
                  item.disabled && 'cursor-not-allowed opacity-50 hover:bg-white',
                  item.danger && 'text-red-600 hover:bg-red-50'
                )}
                onClick={() => handleMenuItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export { Dropdown };
