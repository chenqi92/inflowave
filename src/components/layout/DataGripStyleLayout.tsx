import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
  Layout,
  Header,
} from '@/components/ui';
import DatabaseExplorer from './DatabaseExplorer';
import MainToolbar from './MainToolbar';
import TabEditor from './TabEditor';
import EnhancedResultPanel from './EnhancedResultPanel';

import { dataExplorerRefresh } from '@/utils/refreshEvents';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { QueryResult } from '@/types';

// 临时导入页面组件用于视图切换
import DatabasePage from '../../pages/Database';
import VisualizationPage from '../../pages/Visualization';
import PerformancePage from '../../pages/Performance';
import ConnectionsPage from '../../pages/Connections';
import DevTools from '../../pages/DevTools';
import Extensions from '../../pages/Extensions';
import QueryHistory from '../query/QueryHistory';

export interface DataGripStyleLayoutProps {
  children?: React.ReactNode;
}

// 导出用于外部调用的方法接口
export interface DataGripLayoutRef {
  openQueryHistory: () => void;
}

const DataGripStyleLayout: React.FC<DataGripStyleLayoutProps> = ({
  children,
}) => {
  const { preferences, updateWorkspaceSettings } = useUserPreferences();
  const location = useLocation();
  const navigate = useNavigate();

  // 路径到视图的映射
  const getViewFromPath = (pathname: string): string => {
    if (pathname === '/connections') return 'datasource';
    if (pathname === '/database') return 'database';
    if (pathname === '/query') return 'query';
    if (pathname === '/visualization') return 'visualization';
    if (pathname === '/performance') return 'performance';
    if (pathname === '/extensions') return 'extensions';
    if (pathname === '/dev-tools') return 'dev-tools';
    return 'query'; // 默认视图
  };

  // 从用户偏好中获取初始状态，如果没有则使用默认值
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(() => {
    return (
      preferences?.workspace.panel_sizes?.['left-panel-collapsed'] === 1 ||
      false
    );
  });
  const [bottomPanelCollapsed, setBottomPanelCollapsed] = useState(() => {
    return (
      preferences?.workspace.panel_sizes?.['bottom-panel-collapsed'] === 1 ||
      false
    );
  });
  const [currentView, setCurrentView] = useState(() => {
    // 优先使用路径映射的视图，其次是用户偏好，最后默认为数据源视图
    return getViewFromPath(location.pathname) !== 'query'
      ? getViewFromPath(location.pathname)
      : preferences?.workspace.layout || 'datasource'; // 软件启动时默认显示数据源视图
  });

  // 面板尺寸状态
  const [leftPanelSize, setLeftPanelSize] = useState(() => {
    return preferences?.workspace.panel_positions?.['left-panel'] || 25;
  });
  const [bottomPanelSize, setBottomPanelSize] = useState(() => {
    return preferences?.workspace.panel_positions?.['bottom-panel'] || 40;
  });

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [executedQueries, setExecutedQueries] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [activeTabType, setActiveTabType] = useState<'query' | 'table' | 'database' | 'data-browser'>('query');
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [expandedDatabases, setExpandedDatabases] = useState<string[]>([]);

  // 手动打开查询历史的方法
  const openQueryHistory = useCallback(() => {
    console.log('Opening query history...');
    setShowQueryHistory(true);
  }, []);
  const [currentTimeRange, setCurrentTimeRange] = useState<{
    label: string;
    value: string;
    start: string;
    end: string;
  }>({
    label: '不限制时间',
    value: 'none',
    start: '',
    end: '',
  });
  const tabEditorRef = useRef<{
    executeQueryWithContent?: (query: string, database: string) => void;
    createDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void;
    createNewTab?: (type?: 'query' | 'table' | 'database') => void;
    createQueryTabWithDatabase?: (database: string, query?: string) => void;
    setSelectedDatabase?: (database: string) => void;
  } | null>(null);

  // 刷新数据源面板的方法
  const refreshDataExplorer = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 保存工作区设置到用户偏好
  const saveWorkspaceSettings = useCallback(async () => {
    if (!preferences) return;

    const currentPanelSizes = {
      ...preferences.workspace.panel_sizes,
      'left-panel-collapsed': leftPanelCollapsed ? 1 : 0,
      'bottom-panel-collapsed': bottomPanelCollapsed ? 1 : 0,
    };

    const currentPanelPositions = {
      ...preferences.workspace.panel_positions,
      'left-panel': leftPanelSize,
      'bottom-panel': bottomPanelSize,
    };

    const updatedWorkspace = {
      ...preferences.workspace,
      layout: currentView,
      panel_sizes: currentPanelSizes,
      panel_positions: currentPanelPositions,
    };

    await updateWorkspaceSettings(updatedWorkspace);
  }, [
    preferences,
    leftPanelCollapsed,
    bottomPanelCollapsed,
    currentView,
    leftPanelSize,
    bottomPanelSize,
    updateWorkspaceSettings,
  ]);

  // 监听路径变化，自动切换视图
  useEffect(() => {
    const newView = getViewFromPath(location.pathname);

    // 只有当视图真的不同时才更新，避免不必要的重渲染
    if (currentView !== newView) {
      setCurrentView(newView);
    }

    // 移除自动打开查询历史的逻辑，改为手动触发
    // 这样可以避免软件启动时自动弹出查询历史对话框
  }, [location.pathname, location.search]);

  // 当偏好设置加载后，更新本地状态
  useEffect(() => {
    if (preferences?.workspace) {
      setLeftPanelCollapsed(
        preferences.workspace.panel_sizes?.['left-panel-collapsed'] === 1 ||
          false
      );
      setBottomPanelCollapsed(
        preferences.workspace.panel_sizes?.['bottom-panel-collapsed'] === 1 ||
          false
      );
      // 只有在非特殊路径时才使用偏好设置的布局
      if (getViewFromPath(location.pathname) === 'query') {
        setCurrentView(preferences.workspace.layout || 'datasource'); // 默认为数据源视图
      }
      setLeftPanelSize(
        preferences.workspace.panel_positions?.['left-panel'] || 25
      );
      setBottomPanelSize(
        preferences.workspace.panel_positions?.['bottom-panel'] || 40
      );
    }
  }, [preferences, location.pathname]);

  // 当布局状态改变时自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      saveWorkspaceSettings();
    }, 500); // 防抖，500ms后保存

    return () => clearTimeout(timer);
  }, [
    leftPanelCollapsed,
    bottomPanelCollapsed,
    currentView,
    leftPanelSize,
    bottomPanelSize,
    saveWorkspaceSettings,
  ]);

  // 监听全局刷新事件
  useEffect(() => {
    const removeListener = dataExplorerRefresh.addListener(refreshDataExplorer);
    return removeListener;
  }, []);

  // 监听菜单刷新事件
  useEffect(() => {
    const handleRefreshDatabaseTree = () => {
      console.log('📥 DataGripStyleLayout收到刷新数据库树事件');
      refreshDataExplorer();
    };

    document.addEventListener(
      'refresh-database-tree',
      handleRefreshDatabaseTree
    );

    return () => {
      document.removeEventListener(
        'refresh-database-tree',
        handleRefreshDatabaseTree
      );
    };
  }, []);

  // 处理表格双击事件
  const handleTableDoubleClick = (
    database: string,
    table: string,
    query: string
  ) => {
    // 切换到查询视图
    setCurrentView('query');
    // 使用TabEditor的引用来执行查询
    if (tabEditorRef.current?.executeQueryWithContent) {
      tabEditorRef.current.executeQueryWithContent(query, database);
    }
  };

  // 处理创建数据浏览tab事件
  const handleCreateDataBrowserTab = (
    connectionId: string,
    database: string,
    tableName: string
  ) => {
    // 切换到查询视图
    setCurrentView('query');
    // 使用TabEditor的引用来创建数据浏览tab
    if (tabEditorRef.current?.createDataBrowserTab) {
      tabEditorRef.current.createDataBrowserTab(connectionId, database, tableName);
    }
  };

  // 处理创建查询标签页事件
  const handleCreateQueryTab = (query?: string, database?: string) => {
    // 切换到查询视图
    setCurrentView('query');

    // 如果有查询内容，使用 executeQueryWithContent 方法
    if (query && database && tabEditorRef.current?.executeQueryWithContent) {
      tabEditorRef.current.executeQueryWithContent(query, database);
    } else if (database && tabEditorRef.current?.createQueryTabWithDatabase) {
      // 使用新的方法创建带数据库选择的查询标签页
      tabEditorRef.current.createQueryTabWithDatabase(database, query);
    } else {
      // 否则创建新的空查询标签页
      if (tabEditorRef.current?.createNewTab) {
        tabEditorRef.current.createNewTab('query');
      }
    }
  };

  // 获取当前视图
  const getCurrentView = () => currentView;

  // 处理视图变化 - 特殊处理开发者工具
  const handleViewChange = useCallback(
    (newView: string) => {
      // 如果当前在开发者工具页面，并且要切换到其他视图，需要同时导航
      if (currentView === 'dev-tools' && newView !== 'dev-tools') {
        setCurrentView(newView);
        // 根据视图导航到对应路径
        const pathMap: Record<string, string> = {
          datasource: '/connections',
          query: '/query',
          visualization: '/visualization',
          performance: '/performance',
        };
        if (pathMap[newView]) {
          navigate(pathMap[newView]);
        }
      } else {
        setCurrentView(newView);
      }
    },
    [currentView, navigate]
  );

  // 根据当前视图渲染主要内容 - 使用 useMemo 优化性能
  const mainContent = useMemo(() => {
    switch (currentView) {
      case 'datasource':
        return (
          <div className='h-full'>
            <div className='p-0 h-full'>
              <ConnectionsPage />
            </div>
          </div>
        );
      case 'database':
        return (
          <div className='h-full flex flex-col'>
            <div className='flex-1 overflow-hidden p-0'>
              <div className='h-full overflow-y-auto p-4'>
                <DatabasePage />
              </div>
            </div>
          </div>
        );
      case 'visualization':
        return (
          <div className='h-full flex flex-col'>
            <div className='flex-1 overflow-hidden p-0'>
              <div className='h-full overflow-y-auto p-4'>
                <VisualizationPage />
              </div>
            </div>
          </div>
        );
      case 'performance':
        return (
          <div className='h-full flex flex-col'>
            <div className='flex-1 overflow-hidden p-0'>
              <div className='h-full overflow-y-auto p-4'>
                <PerformancePage />
              </div>
            </div>
          </div>
        );
      case 'dev-tools':
        return (
          <div className='h-full'>
            <div className='p-0 h-full'>
              <DevTools />
            </div>
          </div>
        );
      case 'extensions':
        return (
          <div className='h-full'>
            <div className='p-0 h-full'>
              <Extensions />
            </div>
          </div>
        );
      case 'query':
      default:
        return (
          <div className='h-full'>
            {/* 查询历史模态框 */}
            <QueryHistory
              visible={showQueryHistory}
              onClose={() => setShowQueryHistory(false)}
              onQuerySelect={(query, database) => {
                // 执行选中的查询
                if (tabEditorRef.current?.executeQueryWithContent) {
                  tabEditorRef.current.executeQueryWithContent(query, database || '');
                }
                setShowQueryHistory(false);
              }}
            />
            
            <ResizablePanelGroup direction='vertical'>
              {/* 上半部分：编辑器 */}
              <ResizablePanel
                defaultSize={bottomPanelCollapsed || activeTabType !== 'query' ? 100 : 100 - bottomPanelSize}
                minSize={30}
                className='bg-background overflow-hidden'
              >
                <TabEditor
                  onQueryResult={setQueryResult}
                  onBatchQueryResults={(results, queries, executionTime) => {
                    setQueryResults(results);
                    setExecutedQueries(queries);
                    setExecutionTime(executionTime);
                    // 如果只有一个结果，也设置 queryResult 以保持兼容性
                    if (results.length === 1) {
                      setQueryResult(results[0]);
                    }
                  }}
                  onActiveTabTypeChange={setActiveTabType}
                  expandedDatabases={expandedDatabases}
                  currentTimeRange={currentTimeRange}
                  ref={tabEditorRef as any}
                />
              </ResizablePanel>

            {/* 分割线和下半部分：结果面板 - 只在query类型标签时显示 */}
            {!bottomPanelCollapsed && activeTabType === 'query' && (
              <>
                <ResizableHandle
                  withHandle
                  className='h-2 bg-border hover:bg-border/80'
                />

                {/* 只有在有查询结果时才显示结果面板 */}
                {(queryResult || (queryResults && queryResults.length > 0)) && (
                  <ResizablePanel
                    defaultSize={bottomPanelSize}
                    minSize={25}
                    maxSize={70}
                    onResize={size => setBottomPanelSize(size)}
                  >
                    <div className='h-full border-t border-0 shadow-none bg-background overflow-hidden'>
                      <EnhancedResultPanel
                        collapsed={bottomPanelCollapsed}
                        queryResult={queryResult}
                        queryResults={queryResults}
                        executedQueries={executedQueries}
                        executionTime={executionTime}
                        onClearResult={() => {
                          setQueryResult(null);
                          setQueryResults([]);
                          setExecutedQueries([]);
                          setExecutionTime(0);
                        }}
                      />
                    </div>
                  </ResizablePanel>
                )}
              </>
            )}
          </ResizablePanelGroup>
          </div>
        );
    }
  }, [
    currentView,
    bottomPanelCollapsed,
    bottomPanelSize,
    activeTabType,
    queryResult,
    queryResults,
    executedQueries,
    executionTime,
    currentTimeRange,
    showQueryHistory,
  ]);

  return (
    <Layout className='h-screen bg-background flex flex-col overflow-hidden'>
      {/* 主工具栏 - 统一背景，移除边框分割线 */}
      <Header className='h-12 px-4 bg-background flex items-center flex-shrink-0'>
        <MainToolbar
          currentView={currentView}
          onViewChange={handleViewChange}
          currentTimeRange={currentTimeRange}
          onTimeRangeChange={setCurrentTimeRange}
          onOpenQueryHistory={openQueryHistory}
        />
      </Header>

      {/* 主要内容区域 - 使用可调整大小的面板 */}
      <div className='flex-1 min-h-0'>
        <ResizablePanelGroup direction='horizontal'>
          {/* 左侧数据库面板 */}
          <ResizablePanel
            defaultSize={leftPanelSize}
            minSize={15}
            maxSize={40}
            collapsible={true}
            collapsedSize={3}
            onResize={size => setLeftPanelSize(size)}
            className={cn(
              'bg-background border-r border-border transition-all duration-200',
              leftPanelCollapsed && 'min-w-12'
            )}
          >
            <div className='h-full'>
              <DatabaseExplorer
                collapsed={leftPanelCollapsed}
                refreshTrigger={refreshTrigger}
                onTableDoubleClick={handleTableDoubleClick}
                onCreateDataBrowserTab={handleCreateDataBrowserTab}
                onCreateQueryTab={handleCreateQueryTab}
                onViewChange={handleViewChange}
                onGetCurrentView={getCurrentView}
                onExpandedDatabasesChange={setExpandedDatabases}
                currentTimeRange={currentTimeRange}
              />
            </div>
          </ResizablePanel>

          {/* 分割线 */}
          <ResizableHandle
            withHandle
            className='w-2 bg-border hover:bg-border/80'
          />

          {/* 右侧主要工作区域 */}
          <ResizablePanel defaultSize={100 - leftPanelSize} minSize={50}>
            <main className='h-full bg-background flex flex-col'>
              <div
                key={currentView}
                className='h-full transition-all duration-200 ease-in-out'
              >
                {mainContent}
              </div>
            </main>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </Layout>
  );
};

export default DataGripStyleLayout;
