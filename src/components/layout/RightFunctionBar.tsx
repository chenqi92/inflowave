import React from 'react';
import { Button } from '@/components/ui';
import {
  BarChart,
  Activity,
  Package,
  History,
  Wrench,
  Database,
  Settings,
} from 'lucide-react';

export type FunctionType = 'visualization' | 'monitoring' | 'extensions' | 'history' | 'tools' | 'database' | 'settings';

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
    key: 'visualization',
    icon: <BarChart className="w-5 h-5" />,
    label: '可视化',
    description: '数据图表和仪表板',
  },
  {
    key: 'monitoring',
    icon: <Activity className="w-5 h-5" />,
    label: '监控',
    description: '性能监控和诊断',
  },
  {
    key: 'database',
    icon: <Database className="w-5 h-5" />,
    label: '数据库',
    description: '数据库管理',
  },
  {
    key: 'history',
    icon: <History className="w-5 h-5" />,
    label: '历史',
    description: '查询历史记录',
  },
  {
    key: 'extensions',
    icon: <Package className="w-5 h-5" />,
    label: '扩展',
    description: '插件和集成',
  },
  {
    key: 'tools',
    icon: <Wrench className="w-5 h-5" />,
    label: '工具',
    description: '开发工具',
  },
  {
    key: 'settings',
    icon: <Settings className="w-5 h-5" />,
    label: '设置',
    description: '应用设置',
  },
];

const RightFunctionBar: React.FC<RightFunctionBarProps> = ({
  selectedFunction,
  onFunctionSelect,
  className = '',
}) => {
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
          <Button
            key={item.key}
            variant={selectedFunction === item.key ? 'default' : 'ghost'}
            size="sm"
            className={`w-10 h-10 p-0 mx-1 flex flex-col items-center justify-center transition-all duration-200 ${
              selectedFunction === item.key
                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                : 'hover:bg-accent hover:text-accent-foreground hover:scale-105'
            }`}
            onClick={() => handleFunctionClick(item.key)}
            title={`${item.label} - ${item.description}`}
          >
            {item.icon}
          </Button>
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
