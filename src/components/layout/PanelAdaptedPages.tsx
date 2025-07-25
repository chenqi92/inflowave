import React from 'react';
import { Card, CardContent } from '@/components/ui';

// 导入原始页面组件
import VisualizationPage from '../../pages/Visualization';
import PerformancePage from '../../pages/Performance';
import DatabasePage from '../../pages/Database';
import QueryHistoryPage from '../../pages/QueryHistory';
import Extensions from '../../pages/Extensions';
import DevTools from '../../pages/DevTools';

// 面板适配的可视化页面
export const PanelVisualizationPage: React.FC = () => {
  return (
    <div className="h-full">
      <VisualizationPage />
    </div>
  );
};

// 面板适配的性能监控页面
export const PanelPerformancePage: React.FC = () => {
  return (
    <div className="h-full">
      <PerformancePage />
    </div>
  );
};

// 面板适配的数据库管理页面
export const PanelDatabasePage: React.FC = () => {
  return (
    <div className="h-full">
      <DatabasePage />
    </div>
  );
};

// 面板适配的查询历史页面
export const PanelQueryHistoryPage: React.FC = () => {
  return (
    <div className="h-full">
      <QueryHistoryPage />
    </div>
  );
};

// 面板适配的扩展管理页面
export const PanelExtensionsPage: React.FC = () => {
  return (
    <div className="h-full">
      <Extensions />
    </div>
  );
};

// 面板适配的开发工具页面
export const PanelDevToolsPage: React.FC = () => {
  return (
    <div className="h-full">
      <DevTools />
    </div>
  );
};


