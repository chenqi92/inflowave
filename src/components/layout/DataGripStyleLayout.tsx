import React, { useState, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui';
import DatabaseExplorer from './DatabaseExplorer';
import MainToolbar from './MainToolbar';
import TabEditor from './TabEditor';
import ResultPanel from './ResultPanel';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import type { QueryResult } from '@/types';

// 临时导入页面组件用于视图切换
import DatabasePage from '../../pages/Database';
import VisualizationPage from '../../pages/Visualization';
import PerformancePage from '../../pages/Performance';
import ConnectionsPage from '../../pages/Connections';
import DevTools from '../../pages/DevTools';



export interface DataGripStyleLayoutProps {
  children?: React.ReactNode;
}

const DataGripStyleLayout: React.FC<DataGripStyleLayoutProps> = ({ children }) => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [currentView, setCurrentView] = useState('datasource');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  // 刷新数据源面板的方法
  const refreshDataExplorer = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 监听全局刷新事件
  useEffect(() => {
    const removeListener = dataExplorerRefresh.addListener(refreshDataExplorer);
    return removeListener;
  }, []);

  // 根据当前视图渲染主要内容
  const renderMainContent = () => {
    switch (currentView) {
      case 'datasource':
        return (
          <div className="h-full">
            <ConnectionsPage />
          </div>
        );
      case 'database':
        return (
          <div className="h-full p-4 overflow-auto">
            <DatabasePage />
          </div>
        );
      case 'visualization':
        return (
          <div className="h-full p-4 overflow-auto">
            <VisualizationPage />
          </div>
        );
      case 'performance':
        return (
          <div className="h-full p-4 overflow-auto">
            <PerformancePage />
          </div>
        );
      case 'dev-tools':
        return (
          <div className="h-full">
            <DevTools />
          </div>
        );
      case 'query':
      default:
        return (
          <ResizablePanelGroup direction="vertical">
            {/* 上半部分：编辑器 */}
            <ResizablePanel
              defaultSize={bottomPanelCollapsed ? 100 : 60}
              minSize={30}
              className="bg-white overflow-hidden"
            >
              <TabEditor onQueryResult={setQueryResult} />
            </ResizablePanel>

            {/* 分割线和下半部分：结果面板 */}
            {!bottomPanelCollapsed && (
              <>
                <ResizableHandle withHandle className="h-2 bg-gray-200 hover:bg-gray-300 transition-colors" />

                <ResizablePanel
                  defaultSize={40}
                  minSize={20}
                  maxSize={70}
                  className="bg-gray-50 border-t border-gray-200 overflow-hidden"
                >
                  <ResultPanel
                    collapsed={bottomPanelCollapsed}
                    queryResult={queryResult}
                    onClearResult={() => setQueryResult(null)}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* 顶部主工具栏 */}
      <header className="h-12 px-4 bg-white border-b border-gray-200 flex items-center">
        <MainToolbar
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </header>

      {/* 主要内容区域 - 使用可调整大小的面板 */}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          {/* 左侧数据库面板 */}
          <ResizablePanel
            defaultSize={25}
            minSize={15}
            maxSize={40}
            collapsible={true}
            collapsedSize={3}
            className={cn(
              "bg-white border-r border-gray-200 transition-all duration-200",
              leftPanelCollapsed && "min-w-12"
            )}
          >
            <div className="h-full relative">
              <DatabaseExplorer
                collapsed={leftPanelCollapsed}
                refreshTrigger={refreshTrigger}
              />
              {/* 折叠按钮 */}
              <button
                className="absolute bottom-4 left-4 p-1 bg-gray-100 hover:bg-gray-200 rounded z-10"
                onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              >
                {leftPanelCollapsed ? '→' : '←'}
              </button>
            </div>
          </ResizablePanel>

          {/* 分割线 */}
          <ResizableHandle withHandle className="w-2 bg-gray-200 hover:bg-gray-300 transition-colors" />

          {/* 右侧主要工作区域 */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <main className="h-full bg-white flex flex-col">
              {renderMainContent()}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default DataGripStyleLayout;