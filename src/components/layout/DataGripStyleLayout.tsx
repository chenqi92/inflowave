import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/cn';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui';
import DatabaseExplorer from './DatabaseExplorer';
import MainToolbar from './MainToolbar';
import TabEditor from './TabEditor';
import ResultPanel from './ResultPanel';
import NativeMenuHandler from './NativeMenuHandler';
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
  const tabEditorRef = useRef<{ executeQueryWithContent?: (query: string, database: string) => void } | null>(null);

  // 刷新数据源面板的方法
  const refreshDataExplorer = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 监听全局刷新事件
  useEffect(() => {
    const removeListener = dataExplorerRefresh.addListener(refreshDataExplorer);
    return removeListener;
  }, []);

  // 处理表格双击事件
  const handleTableDoubleClick = (database: string, table: string, query: string) => {
    // 切换到查询视图
    setCurrentView('query');
    // 使用TabEditor的引用来执行查询
    if (tabEditorRef.current?.executeQueryWithContent) {
      tabEditorRef.current.executeQueryWithContent(query, database);
    }
  };

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
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <DatabasePage />
              </div>
            </div>
          </div>
        );
      case 'visualization':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <VisualizationPage />
              </div>
            </div>
          </div>
        );
      case 'performance':
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <PerformancePage />
              </div>
            </div>
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
              className="bg-background overflow-hidden"
            >
              <TabEditor 
                onQueryResult={setQueryResult} 
                ref={tabEditorRef}
              />
            </ResizablePanel>

            {/* 分割线和下半部分：结果面板 */}
            {!bottomPanelCollapsed && (
              <>
                <ResizableHandle withHandle className="h-2 bg-border hover:bg-border/80 transition-colors" />

                <ResizablePanel
                  defaultSize={40}
                  minSize={20}
                  maxSize={70}
                  className="bg-muted border-t border-border overflow-hidden"
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* 原生菜单处理器 */}
      <NativeMenuHandler />

      {/* 主工具栏 - 统一背景，移除边框分割线 */}
      <header className="h-12 px-4 bg-background flex items-center flex-shrink-0">
        <MainToolbar
          currentView={currentView}
          onViewChange={setCurrentView}
        />
      </header>

      {/* 主要内容区域 - 使用可调整大小的面板 */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal">
          {/* 左侧数据库面板 */}
          <ResizablePanel
            defaultSize={25}
            minSize={15}
            maxSize={40}
            collapsible={true}
            collapsedSize={3}
            className={cn(
              "bg-background border-r border-border transition-all duration-200",
              leftPanelCollapsed && "min-w-12"
            )}
          >
            <div className="h-full relative">
              <DatabaseExplorer
                collapsed={leftPanelCollapsed}
                refreshTrigger={refreshTrigger}
                onTableDoubleClick={handleTableDoubleClick}
              />
              {/* 折叠按钮 */}
              <button
                className="absolute bottom-4 left-4 p-1 bg-muted hover:bg-muted/80 rounded z-10"
                onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              >
                {leftPanelCollapsed ? '→' : '←'}
              </button>
            </div>
          </ResizablePanel>

          {/* 分割线 */}
          <ResizableHandle withHandle className="w-2 bg-border hover:bg-border/80 transition-colors" />

          {/* 右侧主要工作区域 */}
          <ResizablePanel defaultSize={75} minSize={50}>
            <main className="h-full bg-background flex flex-col">
              {renderMainContent()}
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default DataGripStyleLayout;