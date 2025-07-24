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
    <div className="h-full p-4">
      <div className="h-full">
        <VisualizationPage />
      </div>
    </div>
  );
};

// 面板适配的性能监控页面
export const PanelPerformancePage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <PerformancePage />
      </div>
    </div>
  );
};

// 面板适配的数据库管理页面
export const PanelDatabasePage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <DatabasePage />
      </div>
    </div>
  );
};

// 面板适配的查询历史页面
export const PanelQueryHistoryPage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <QueryHistoryPage />
      </div>
    </div>
  );
};

// 面板适配的扩展管理页面
export const PanelExtensionsPage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <Extensions />
      </div>
    </div>
  );
};

// 面板适配的开发工具页面
export const PanelDevToolsPage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <div className="h-full">
        <DevTools />
      </div>
    </div>
  );
};

// 面板适配的设置页面
export const PanelSettingsPage: React.FC = () => {
  return (
    <div className="h-full p-4">
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">应用设置</h3>
            <p className="text-muted-foreground">
              应用设置功能正在开发中...
            </p>
            <div className="text-sm text-muted-foreground">
              <p>即将支持的设置项：</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• 主题设置</li>
                <li>• 编辑器配置</li>
                <li>• 快捷键设置</li>
                <li>• 连接偏好</li>
                <li>• 通知设置</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
