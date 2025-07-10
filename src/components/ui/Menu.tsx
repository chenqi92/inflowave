import React, { useState } from 'react';
import { cn } from '@/utils/cn';

export interface MenuItemProps {
  key?: string;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  children?: React.ReactNode;
}

export interface SubMenuProps {
  key?: string;
  icon?: React.ReactNode;
  title?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export interface MenuProps {
  mode?: 'horizontal' | 'vertical' | 'inline';
  theme?: 'light' | 'dark';
  inlineCollapsed?: boolean;
  openKeys?: string[];
  selectedKeys?: string[];
  defaultOpenKeys?: string[];
  defaultSelectedKeys?: string[];
  selectable?: boolean;
  multiple?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: { key: string; domEvent: React.MouseEvent }) => void;
  onSelect?: (e: { key: string; selectedKeys: string[] }) => void;
  onDeselect?: (e: { key: string; selectedKeys: string[] }) => void;
  onOpenChange?: (openKeys: string[]) => void;
  children?: React.ReactNode;
}

const MenuContext = React.createContext<{
  selectedKeys: string[];
  openKeys: string[];
  mode: 'horizontal' | 'vertical' | 'inline';
  theme: 'light' | 'dark';
  inlineCollapsed: boolean;
  onItemClick: (key: string, e: React.MouseEvent) => void;
  onSubMenuToggle: (key: string) => void;
}>({
  selectedKeys: [],
  openKeys: [],
  mode: 'vertical',
  theme: 'light',
  inlineCollapsed: false,
  onItemClick: () => {},
  onSubMenuToggle: () => {},
});

const MenuItem: React.FC<MenuItemProps> = ({
  key,
  icon,
  title,
  danger = false,
  disabled = false,
  onClick,
  className,
  children,
}) => {
  const context = React.useContext(MenuContext);
  const isSelected = key ? context.selectedKeys.includes(key) : false;

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    if (key) {
      context.onItemClick(key, e);
    }
    onClick?.(e);
  };

  const getItemClasses = () => {
    return cn(
      'flex items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer',
      context.mode === 'horizontal' ? 'border-b-2 border-transparent' : '',
      context.theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100',
      isSelected && context.theme === 'dark' ? 'bg-blue-600 text-white' : '',
      isSelected && context.theme === 'light' ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' : '',
      disabled && 'cursor-not-allowed opacity-50',
      danger && 'text-red-600 hover:bg-red-50',
      className
    );
  };

  return (
    <div
      className={getItemClasses()}
      onClick={handleClick}
      role="menuitem"
      aria-selected={isSelected}
      aria-disabled={disabled}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {(title || children) && (
        <span className={cn('flex-1', context.inlineCollapsed && 'hidden')}>
          {title || children}
        </span>
      )}
    </div>
  );
};

const SubMenu: React.FC<SubMenuProps> = ({
  key,
  icon,
  title,
  disabled = false,
  className,
  children,
}) => {
  const context = React.useContext(MenuContext);
  const isOpen = key ? context.openKeys.includes(key) : false;

  const handleToggle = () => {
    if (disabled || !key) return;
    context.onSubMenuToggle(key);
  };

  const getSubMenuClasses = () => {
    return cn(
      'flex items-center gap-2 px-4 py-2 text-sm transition-colors cursor-pointer',
      context.theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100',
      disabled && 'cursor-not-allowed opacity-50',
      className
    );
  };

  const getSubMenuContentClasses = () => {
    return cn(
      'overflow-hidden transition-all duration-200',
      context.theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50',
      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
    );
  };

  return (
    <div>
      <div
        className={getSubMenuClasses()}
        onClick={handleToggle}
        role="menuitem"
        aria-expanded={isOpen}
        aria-disabled={disabled}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className={cn('flex-1', context.inlineCollapsed && 'hidden')}>
          {title}
        </span>
        {!context.inlineCollapsed && (
          <span className={cn('transition-transform duration-200', isOpen && 'rotate-90')}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
      {context.mode === 'inline' && (
        <div className={getSubMenuContentClasses()}>
          <div className="pl-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

const Menu: React.FC<MenuProps> = ({
  mode = 'vertical',
  theme = 'light',
  inlineCollapsed = false,
  openKeys,
  selectedKeys,
  defaultOpenKeys = [],
  defaultSelectedKeys = [],
  selectable = true,
  multiple = false,
  className,
  style,
  onClick,
  onSelect,
  onDeselect,
  onOpenChange,
  children,
}) => {
  const [internalOpenKeys, setInternalOpenKeys] = useState<string[]>(
    openKeys || defaultOpenKeys
  );
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>(
    selectedKeys || defaultSelectedKeys
  );

  const currentOpenKeys = openKeys || internalOpenKeys;
  const currentSelectedKeys = selectedKeys || internalSelectedKeys;

  const handleItemClick = (key: string, e: React.MouseEvent) => {
    if (!selectable) return;

    let newSelectedKeys: string[];
    
    if (multiple) {
      if (currentSelectedKeys.includes(key)) {
        newSelectedKeys = currentSelectedKeys.filter(k => k !== key);
        onDeselect?.({ key, selectedKeys: newSelectedKeys });
      } else {
        newSelectedKeys = [...currentSelectedKeys, key];
        onSelect?.({ key, selectedKeys: newSelectedKeys });
      }
    } else {
      if (currentSelectedKeys.includes(key)) {
        newSelectedKeys = [];
        onDeselect?.({ key, selectedKeys: newSelectedKeys });
      } else {
        newSelectedKeys = [key];
        onSelect?.({ key, selectedKeys: newSelectedKeys });
      }
    }

    if (selectedKeys === undefined) {
      setInternalSelectedKeys(newSelectedKeys);
    }

    onClick?.({ key, domEvent: e });
  };

  const handleSubMenuToggle = (key: string) => {
    let newOpenKeys: string[];
    
    if (currentOpenKeys.includes(key)) {
      newOpenKeys = currentOpenKeys.filter(k => k !== key);
    } else {
      newOpenKeys = [...currentOpenKeys, key];
    }

    if (openKeys === undefined) {
      setInternalOpenKeys(newOpenKeys);
    }

    onOpenChange?.(newOpenKeys);
  };

  const getMenuClasses = () => {
    return cn(
      'border-r border-gray-200',
      mode === 'horizontal' && 'flex border-r-0 border-b border-gray-200',
      mode === 'inline' && 'w-full',
      theme === 'dark' && 'bg-gray-800 border-gray-700',
      theme === 'light' && 'bg-white',
      inlineCollapsed && 'w-16',
      className
    );
  };

  const contextValue = {
    selectedKeys: currentSelectedKeys,
    openKeys: currentOpenKeys,
    mode,
    theme,
    inlineCollapsed,
    onItemClick: handleItemClick,
    onSubMenuToggle: handleSubMenuToggle,
  };

  return (
    <MenuContext.Provider value={contextValue}>
      <div
        className={getMenuClasses()}
        style={style}
        role="menu"
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
};

Menu.Item = MenuItem;
Menu.SubMenu = SubMenu;

export { Menu };