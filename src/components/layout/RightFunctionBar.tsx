import React from 'react';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import {
  BarChart,
  Activity,
  Package,
  History,
  Wrench,
  Bell,
} from 'lucide-react';
import { useNotificationStore } from '@/store/notifications';

export type FunctionType = 'notifications' | 'visualization' | 'monitoring' | 'extensions' | 'history' | 'tools';

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

const functionItems: FunctionItem[] = [
  {
    key: 'notifications',
    icon: <Bell className="w-4 h-4" />,
    label: '消息',
    description: '消息通知中心',
  },
  {
    key: 'visualization',
    icon: <BarChart className="w-4 h-4" />,
    label: '可视化',
    description: '数据图表和仪表板',
  },
  {
    key: 'monitoring',
    icon: <Activity className="w-4 h-4" />,
    label: '监控',
    description: '性能监控和诊断',
  },
  {
    key: 'history',
    icon: <History className="w-4 h-4" />,
    label: '历史',
    description: '查询历史记录',
  },
  // 扩展管理功能暂时隐藏
  // {
  //   key: 'extensions',
  //   icon: <Package className="w-4 h-4" />,
  //   label: '扩展',
  //   description: '插件和集成',
  // },
  {
    key: 'tools',
    icon: <Wrench className="w-4 h-4" />,
    label: '数据生成',
    description: '测试数据生成',
  },
];

const RightFunctionBar: React.FC<RightFunctionBarProps> = ({
  selectedFunction,
  onFunctionSelect,
  className = '',
}) => {
  const { unreadCount } = useNotificationStore();

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
