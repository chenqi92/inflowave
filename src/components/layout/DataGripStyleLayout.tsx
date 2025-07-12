import React, { useState, useEffect } from 'react';
import { Layout } from 'antd';
import { cn } from '@/utils/cn';
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

const { Header, Sider, Content } = Layout;

export interface DataGripStyleLayoutProps {
  children?: React.ReactNode;
}

const DataGripStyleLayout: React.FC<DataGripStyleLayoutProps> = ({ children }) => {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(300);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [currentView, setCurrentView] = useState('query');
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
      case 'query':
      default:
        return (
          <>
            {/* 上半部分：编辑器 */}
            <div 
              className="bg-white overflow-hidden"
              style={{ 
                height: bottomPanelCollapsed ? '100%' : `calc(100% - ${bottomPanelHeight}px - 4px)` 
              }}
            >
              <TabEditor onQueryResult={setQueryResult} />
            </div>

            {/* 分割线 */}
            {!bottomPanelCollapsed && (
              <div 
                className="h-1 bg-gray-200 cursor-row-resize hover:bg-gray-300 transition-colors"
                onMouseDown={(e) => {
                  const startY = e.clientY;
                  const startHeight = bottomPanelHeight;
                  
                  const handleMouseMove = (e: MouseEvent) => {
                    const deltaY = startY - e.clientY;
                    const newHeight = Math.max(200, Math.min(600, startHeight + deltaY));
                    setBottomPanelHeight(newHeight);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }}
              />
            )}

            {/* 下半部分：结果面板 */}
            {!bottomPanelCollapsed && (
              <div 
                className="bg-gray-50 border-t border-gray-200 overflow-hidden"
                style={{ height: `${bottomPanelHeight}px` }}
              >
                <ResultPanel 
                  collapsed={bottomPanelCollapsed} 
                  queryResult={queryResult} 
                  onClearResult={() => setQueryResult(null)}
                />
              </div>
            )}
          </>
        );
    }
  };

  return (
    <Layout className="h-screen bg-gray-50">
      {/* 顶部主工具栏 */}
      <Header className="h-12 px-4 bg-white border-b border-gray-200 flex items-center">
        <MainToolbar 
          currentView={currentView} 
          onViewChange={setCurrentView}
        />
      </Header>

      {/* 主要内容区域 */}
      <Layout className="flex-1">
        {/* 左侧数据库面板 */}
        <Sider
          collapsible
          collapsed={leftPanelCollapsed}
          onCollapse={setLeftPanelCollapsed}
          width={leftPanelWidth}
          className="bg-white border-r border-gray-200"
          theme="light"
        >
          <DatabaseExplorer 
            collapsed={leftPanelCollapsed} 
            refreshTrigger={refreshTrigger}
          />
        </Sider>

        {/* 右侧主要工作区域 */}
        <Layout className="flex-1">
          {/* 主要内容区域 */}
          <Content className="flex-1 bg-white flex flex-col">
            {renderMainContent()}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default DataGripStyleLayout;