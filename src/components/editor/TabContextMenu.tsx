import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import {
  X,
  Save,
  FileText,
  ArrowLeft,
  ArrowRight,
  Copy,
} from 'lucide-react';
import type { EditorTab } from './TabManager';

interface TabContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  targetTab: EditorTab;
  allTabs: EditorTab[];
  currentTabIndex: number;
  onClose: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs: (tabId: string) => void;
  onCloseLeftTabs: (tabId: string) => void;
  onCloseRightTabs: (tabId: string) => void;
  onSaveTab: (tabId: string) => void;
  onDuplicateTab: (tabId: string) => void;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  open,
  x,
  y,
  targetTab,
  allTabs,
  currentTabIndex,
  onClose,
  onCloseTab,
  onCloseOtherTabs,
  onCloseLeftTabs,
  onCloseRightTabs,
  onSaveTab,
  onDuplicateTab,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const { t } = useTranslation();

  // 生成菜单项
  const menuItems: ContextMenuItem[] = [
    {
      id: 'save',
      label: t('menu.tab_menu.save_as'),
      icon: <Save className="w-4 h-4" />,
      action: () => {
        onSaveTab(targetTab.id);
        onClose();
      },
    },
    {
      id: 'duplicate',
      label: t('menu.tab_menu.duplicate_tab'),
      icon: <Copy className="w-4 h-4" />,
      action: () => {
        onDuplicateTab(targetTab.id);
        onClose();
      },
    },
    {
      id: 'separator1',
      label: '',
      action: () => {},
      separator: true,
    },
    {
      id: 'close',
      label: t('menu.tab_menu.close'),
      icon: <X className="w-4 h-4" />,
      action: () => {
        onCloseTab(targetTab.id);
        onClose();
      },
    },
    {
      id: 'close-others',
      label: t('menu.tab_menu.close_other_tabs'),
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        onCloseOtherTabs(targetTab.id);
        onClose();
      },
      disabled: allTabs.length <= 1,
    },
    {
      id: 'close-left',
      label: t('menu.tab_menu.close_left_tabs'),
      icon: <ArrowLeft className="w-4 h-4" />,
      action: () => {
        onCloseLeftTabs(targetTab.id);
        onClose();
      },
      disabled: currentTabIndex === 0,
    },
    {
      id: 'close-right',
      label: t('menu.tab_menu.close_right_tabs'),
      icon: <ArrowRight className="w-4 h-4" />,
      action: () => {
        onCloseRightTabs(targetTab.id);
        onClose();
      },
      disabled: currentTabIndex === allTabs.length - 1,
    },
  ];

  // 处理菜单项点击
  const handleItemClick = useCallback((item: ContextMenuItem) => {
    if (item.disabled || isClosing) return;
    
    setIsClosing(true);
    try {
      item.action();
    } finally {
      setTimeout(() => setIsClosing(false), 100);
    }
  }, [isClosing]);

  // 渲染菜单项
  const renderMenuItem = (item: ContextMenuItem) => {
    if (item.separator) {
      return <Separator key={item.id} className="my-1" />;
    }

    return (
      <Button
        key={item.id}
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start gap-2 h-8 px-2",
          item.danger && "text-destructive hover:text-destructive",
          item.disabled && "opacity-50 cursor-not-allowed",
          isClosing && "opacity-50"
        )}
        onClick={() => handleItemClick(item)}
        disabled={item.disabled || isClosing}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
      </Button>
    );
  };

  if (!open) return null;

  // 调整菜单位置以防止超出屏幕
  const menuWidth = 160;
  const menuHeight = Math.min(300, menuItems.length * 32 + 20);
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Card
        className="absolute w-[160px] p-1 shadow-lg border"
        style={{
          left: adjustedX,
          top: adjustedY,
          maxHeight: '300px',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <CardContent className="p-0">
          {menuItems.map(item => renderMenuItem(item))}
        </CardContent>
      </Card>
    </div>,
    document.body
  );
};

export default TabContextMenu;
