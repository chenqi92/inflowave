import React from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  BarChart,
  Activity,
  History,
  Bell,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';
import { useTranslation } from '@/hooks/useTranslation';

export type FunctionType = 'notifications' | 'visualization' | 'monitoring' | 'extensions' | 'history';

interface FunctionItem {
  key: FunctionType;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface RightFunctionBarProps {
  selectedFunction: FunctionType | null;
  onFunctionSelect: (functionType: FunctionType | null) => void;
  className?: string;
}

const RightFunctionBar: React.FC<RightFunctionBarProps> = ({
  selectedFunction,
  onFunctionSelect,
  className = '',
}) => {
  const { unreadCount } = useNotificationStore();
  const { t } = useTranslation();

  // Generate function items with translations
  const functionItems: FunctionItem[] = [
    {
      key: 'notifications',
      icon: <Bell className="w-4 h-4" />,
      label: t('menu.right_panel.notifications'),
      description: t('menu.right_panel.notifications_description'),
    },
    {
      key: 'visualization',
      icon: <BarChart className="w-4 h-4" />,
      label: t('menu.right_panel.visualization'),
      description: t('menu.right_panel.visualization_description'),
    },
    {
      key: 'monitoring',
      icon: <Activity className="w-4 h-4" />,
      label: t('menu.right_panel.monitoring'),
      description: t('menu.right_panel.monitoring_description'),
    },
    {
      key: 'history',
      icon: <History className="w-4 h-4" />,
      label: t('menu.right_panel.history'),
      description: t('menu.right_panel.history_description'),
    },
    // 扩展管理功能暂时隐藏
    // {
    //   key: 'extensions',
    //   icon: <Package className="w-4 h-4" />,
    //   label: t('menu.right_panel.extensions'),
    //   description: t('menu.right_panel.extensions_description'),
    // },
  ];

  const handleFunctionClick = (functionType: FunctionType) => {
    // 如果点击的是当前选中的功能，则折叠面板
    if (selectedFunction === functionType) {
      onFunctionSelect(null);
    } else {
      onFunctionSelect(functionType);
    }
  };

  return (
    <div className={`w-12 bg-background border-l border-border flex flex-col ${className}`}>
      {/* 功能图标列表 */}
      <div className="flex-1 py-2 space-y-1">
        {functionItems.map((item) => (
          <div key={item.key} className="relative">
            <Button
              variant={selectedFunction === item.key ? 'default' : 'ghost'}
              size="sm"
              className={`w-8 h-8 p-0 mx-1 flex flex-col items-center justify-center transition-all duration-200 ${
                selectedFunction === item.key
                  ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                  : 'hover:bg-accent hover:text-accent-foreground hover:scale-105'
              }`}
              onClick={() => handleFunctionClick(item.key)}
              title={`${item.label} - ${item.description}`}
            >
              {item.icon}
            </Button>

            {/* 消息通知徽章 */}
            {item.key === 'notifications' && unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center min-w-[16px] rounded-full"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* 底部装饰 */}
      <div className="border-t border-border p-2 flex justify-center">
        <div className="w-6 h-0.5 bg-muted rounded-full"></div>
      </div>
    </div>
  );
};

export default RightFunctionBar;
