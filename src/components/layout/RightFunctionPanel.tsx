import React, { Suspense } from 'react';
import { Spin } from '@/components/ui';
import { X } from 'lucide-react';
import { Button } from '@/components/ui';
import type { FunctionType } from './RightFunctionBar';
import NotificationPanel from '@/components/notifications/NotificationPanel';
import { useMenuTranslation } from '@/hooks/useTranslation';

// 懒加载面板适配的功能组件
// 直接导入页面组件并创建面板适配版本
const VisualizationPage = React.lazy(() => import('@/pages/Visualization'));
const QueryHistoryPage = React.lazy(() => import('@/pages/QueryHistory'));
const Extensions = React.lazy(() => import('@/pages/Extensions'));

// 直接导入性能监控组件和工作区内容
import { ModernPerformanceMonitor } from '@/components/performance/ModernPerformanceMonitor';
import { WorkspaceContent } from '@/components/workspace/WorkspaceContent';

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

const PanelQueryHistoryPage: React.FC<{ onClose?: () => void }> = ({ onClose }) => (
  <div className="h-full">
    <Suspense fallback={<Spin />}>
      <QueryHistoryPage onClose={onClose} />
    </Suspense>
  </div>
);

const PanelExtensionsPage: React.FC = () => (
  <div className="h-full">
    <Extensions />
  </div>
);

interface RightFunctionPanelProps {
  selectedFunction: FunctionType | null;
  onClose: () => void;
  onRestoreTabs?: (tabs: any[]) => void;
  className?: string;
}

const RightFunctionPanel: React.FC<RightFunctionPanelProps> = ({
  selectedFunction,
  onClose,
  onRestoreTabs,
  className = '',
}) => {
  const { t } = useMenuTranslation();

  // 功能标题映射
  const functionTitles: Record<FunctionType, string> = {
    notifications: t('right_panel.notifications'),
    workspace: t('right_panel.workspace'),
    visualization: t('right_panel.visualization'),
    monitoring: t('right_panel.monitoring'),
    history: t('right_panel.history'),
    extensions: t('right_panel.extensions'),
  };
  
  if (!selectedFunction) {
    return null;
  }

  const renderFunctionContent = () => {
    switch (selectedFunction) {
      case 'notifications':
        return <NotificationPanel onClose={onClose} />;
      case 'workspace':
        return <WorkspaceContent onRestoreTabs={onRestoreTabs || (() => {})} onClose={onClose} />;
      case 'visualization':
        return <PanelVisualizationPage />;
      case 'monitoring':
        return <PanelPerformancePage />;
      case 'history':
        return <PanelQueryHistoryPage onClose={onClose} />;
      case 'extensions':
        return <PanelExtensionsPage />;
      default:
        return (
          <div className="p-6">
            <div className="text-center text-muted-foreground">
              <p>{t('right_panel.unknown_function')}</p>
            </div>
          </div>
        );
    }
  };

  // 消息通知面板、工作区面板和查询历史面板不需要额外的头部和包装
  if (selectedFunction === 'notifications' || selectedFunction === 'workspace' || selectedFunction === 'history') {
    return (
      <div className={`bg-background border-l border-border flex flex-col h-full ${className}`}>
        {renderFunctionContent()}
      </div>
    );
  }

  return (
    <div className={`bg-background border-l border-border flex flex-col h-full w-full ${className}`}>
      {/* 面板头部 */}
      <div className="flex items-center justify-between py-2 px-3 border-b border-border bg-muted/30 dark:bg-muted/20 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {functionTitles[selectedFunction]}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 h-8 w-8 p-0 hover:bg-accent flex-shrink-0"
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
          <div className="h-full w-full overflow-auto bg-background">
            {renderFunctionContent()}
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default RightFunctionPanel;
