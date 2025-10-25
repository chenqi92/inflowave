import React, { Suspense } from 'react';
import { Spin } from '@/components/ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { FunctionType } from './RightFunctionBar';
import NotificationPanel from '@/components/notifications/NotificationPanel';

// 懒加载面板适配的功能组件
// 直接导入页面组件并创建面板适配版本
const VisualizationPage = React.lazy(() => import('@/pages/Visualization'));
const QueryHistoryPage = React.lazy(() => import('@/pages/QueryHistory'));
const Extensions = React.lazy(() => import('@/pages/Extensions'));
const DevTools = React.lazy(() => import('@/pages/DevTools'));

// 直接导入性能监控组件
import { ModernPerformanceMonitor } from '@/components/performance/ModernPerformanceMonitor';

// 面板适配组件
const PanelVisualizationPage: React.FC = () => (
  <div className="h-full">
    <VisualizationPage />
  </div>
);

const PanelPerformancePage: React.FC = () => (
  <div className="h-full">
    <ModernPerformanceMonitor />
  </div>
);

const PanelQueryHistoryPage: React.FC = () => (
  <div className="h-full">
    <QueryHistoryPage />
  </div>
);

const PanelExtensionsPage: React.FC = () => (
  <div className="h-full">
    <Extensions />
  </div>
);

const PanelDevToolsPage: React.FC = () => (
  <div className="h-full">
    <DevTools />
  </div>
);

interface RightFunctionPanelProps {
  selectedFunction: FunctionType | null;
  onClose: () => void;
  className?: string;
}

// 功能标题映射
const functionTitles: Record<FunctionType, string> = {
  notifications: '消息通知',
  visualization: '数据可视化',
  monitoring: '性能监控',
  history: '查询历史',
  extensions: '扩展管理',
  tools: '开发工具',
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
      case 'notifications':
        return <NotificationPanel onClose={onClose} />;
      case 'visualization':
        return <PanelVisualizationPage />;
      case 'monitoring':
        return <PanelPerformancePage />;
      case 'history':
        return <PanelQueryHistoryPage />;
      case 'extensions':
        return <PanelExtensionsPage />;
      case 'tools':
        return <PanelDevToolsPage />;
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

  // 消息通知面板不需要额外的头部和包装
  if (selectedFunction === 'notifications') {
    return (
      <div className={`bg-background border-l border-border flex flex-col h-full ${className}`}>
        {renderFunctionContent()}
      </div>
    );
  }

  return (
    <div className={`bg-background border-l border-border flex flex-col h-full ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground truncate">
            {functionTitles[selectedFunction]}
          </h3>
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
