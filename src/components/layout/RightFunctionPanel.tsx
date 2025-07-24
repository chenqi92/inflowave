import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Spin } from '@/components/ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { FunctionType } from './RightFunctionBar';

// 懒加载面板适配的功能组件
const PanelVisualizationPage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelVisualizationPage })));
const PanelPerformancePage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelPerformancePage })));
const PanelDatabasePage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelDatabasePage })));
const PanelQueryHistoryPage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelQueryHistoryPage })));
const PanelExtensionsPage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelExtensionsPage })));
const PanelDevToolsPage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelDevToolsPage })));
const PanelSettingsPage = React.lazy(() => import('./PanelAdaptedPages').then(m => ({ default: m.PanelSettingsPage })));

interface RightFunctionPanelProps {
  selectedFunction: FunctionType | null;
  onClose: () => void;
  className?: string;
}

// 功能标题映射
const functionTitles: Record<FunctionType, string> = {
  visualization: '数据可视化',
  monitoring: '性能监控',
  database: '数据库管理',
  history: '查询历史',
  extensions: '扩展管理',
  tools: '开发工具',
  settings: '应用设置',
};

// 功能描述映射
const functionDescriptions: Record<FunctionType, string> = {
  visualization: '创建图表和仪表板来可视化您的时序数据',
  monitoring: '监控系统性能和诊断瓶颈问题',
  database: '管理数据库连接和数据库操作',
  history: '查看和管理查询历史记录',
  extensions: '管理插件、API集成和自动化规则',
  tools: '开发和调试工具集合',
  settings: '配置应用程序设置和偏好',
};

const RightFunctionPanel: React.FC<RightFunctionPanelProps> = ({
  selectedFunction,
  onClose,
  className = '',
}) => {
  if (!selectedFunction) {
    return null;
  }

  const renderFunctionContent = () => {
    switch (selectedFunction) {
      case 'visualization':
        return <PanelVisualizationPage />;
      case 'monitoring':
        return <PanelPerformancePage />;
      case 'database':
        return <PanelDatabasePage />;
      case 'history':
        return <PanelQueryHistoryPage />;
      case 'extensions':
        return <PanelExtensionsPage />;
      case 'tools':
        return <PanelDevToolsPage />;
      case 'settings':
        return <PanelSettingsPage />;
      default:
        return (
          <div className="p-6">
            <div className="text-center text-muted-foreground">
              <p>未知功能类型</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`bg-background border-l border-border flex flex-col h-full ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {functionTitles[selectedFunction]}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {functionDescriptions[selectedFunction]}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 w-8 p-0 hover:bg-accent"
          onClick={onClose}
          title="关闭面板"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 面板内容 */}
      <div className="flex-1 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <Spin size="large" tip="加载中..." />
            </div>
          }
        >
          <div className="h-full overflow-auto bg-background">
            {renderFunctionContent()}
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default RightFunctionPanel;
