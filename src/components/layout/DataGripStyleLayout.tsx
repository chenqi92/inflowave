import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {cn} from '@/utils/cn';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
    Layout,
    Header,
} from '@/components/ui';
import DatabaseExplorer from './DatabaseExplorer';
import MainToolbar from './MainToolbar';
import TabEditorRefactored, {TabEditorRef} from './TabEditorRefactored';
import EnhancedResultPanel from './EnhancedResultPanel';
import RightFunctionBar, {type FunctionType} from './RightFunctionBar';
import RightFunctionPanel from './RightFunctionPanel';
import MultiDatabaseWorkbenchPage from '@/pages/MultiDatabaseWorkbench';
import IoTDBTestPage from '@/pages/IoTDBTest';

import {dataExplorerRefresh} from '@/utils/refreshEvents';
import {useUserPreferences} from '@/hooks/useUserPreferences';
import type {QueryResult} from '@/types';



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
    const {preferences, updateWorkspaceSettings} = useUserPreferences();
    const location = useLocation();
    const navigate = useNavigate();

    // 有效的布局类型
    const validLayouts = ['datasource', 'query', 'visualization', 'query-history'] as const;
    type ValidLayout = typeof validLayouts[number];

    // 类型守卫：检查是否为有效布局
    const isValidLayout = (layout: string | undefined): layout is ValidLayout => {
        return validLayouts.includes(layout as ValidLayout);
    };

    // 路径到视图的映射
    const getViewFromPath = (pathname: string): string => {
        if (pathname === '/connections') return 'datasource';
        if (pathname === '/database') return 'database';
        if (pathname === '/query') return 'query';
        if (pathname === '/query-history') return 'query-history';
        if (pathname === '/visualization') return 'visualization';
        if (pathname === '/performance') return 'performance';
        if (pathname === '/extensions') return 'extensions';
        if (pathname === '/dev-tools') return 'dev-tools';
        if (pathname === '/multi-database') return 'multi-database';
        if (pathname === '/iotdb-test') return 'iotdb-test';

        // 根据路径返回对应视图，如果没有匹配则保持当前视图不变
        if (pathname === '/' || pathname === '/dashboard') return 'datasource';

        // 对于未知路径，返回当前视图以避免意外跳转
        return currentView || 'datasource';
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
    const [currentView, setCurrentView] = useState<string>(() => {
        // 如果是特定的路径（如 /query, /visualization 等），使用对应的视图
        const pathView = getViewFromPath(location.pathname);
        if (location.pathname !== '/' && pathView !== 'datasource') {
            return pathView;
        }
        // 否则优先使用用户偏好，如果是无效值则默认为数据源视图
        const userLayout = preferences?.workspace.layout;
        return isValidLayout(userLayout) ? userLayout : 'datasource';
    });

    // 面板尺寸状态
    const [leftPanelSize, setLeftPanelSize] = useState(() => {
        return preferences?.workspace.panel_positions?.['left-panel'] || 25;
    });
    const [bottomPanelSize, setBottomPanelSize] = useState(() => {
        return preferences?.workspace.panel_positions?.['bottom-panel'] || 40;
    });
    const [rightPanelSize, setRightPanelSize] = useState(() => {
        return preferences?.workspace.panel_positions?.['right-panel'] || 30;
    });

    // 右侧功能面板状态
    const [selectedFunction, setSelectedFunction] = useState<FunctionType | null>(null);
    const [rightPanelCollapsed, setRightPanelCollapsed] = useState<boolean>(() => {
        return (
            preferences?.workspace.panel_sizes?.['right-panel-collapsed'] === 1 ||
            true // 默认折叠
        );
    });

    // 拖拽状态跟踪
    const [isResizing, setIsResizing] = useState(false);
    const resizeTimerRef = useRef<ReturnType<typeof setTimeout>>();

    // 保存工作区设置到用户偏好
    const saveWorkspaceSettings = useCallback(async () => {
        if (!preferences) return;

        const currentPanelSizes = {
            ...preferences.workspace.panel_sizes,
            'left-panel-collapsed': leftPanelCollapsed ? 1 : 0,
            'bottom-panel-collapsed': bottomPanelCollapsed ? 1 : 0,
            'right-panel-collapsed': rightPanelCollapsed ? 1 : 0,
        };

        const currentPanelPositions = {
            ...preferences.workspace.panel_positions,
            'left-panel': leftPanelSize,
            'bottom-panel': bottomPanelSize,
            'right-panel': rightPanelSize,
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
        rightPanelCollapsed,
        currentView,
        leftPanelSize,
        bottomPanelSize,
        rightPanelSize,
        updateWorkspaceSettings,
    ]);

    // 使用 ref 来存储 saveWorkspaceSettings 函数，避免依赖问题
    const saveWorkspaceSettingsRef = useRef(saveWorkspaceSettings);
    saveWorkspaceSettingsRef.current = saveWorkspaceSettings;

    // 智能面板大小处理函数
    const handleLeftPanelResize = useCallback((size: number) => {
        setLeftPanelSize(size);
        setIsResizing(true);

        // 清除之前的定时器
        if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current);
        }

        // 设置新的定时器，拖拽结束后保存
        resizeTimerRef.current = setTimeout(() => {
            setIsResizing(false);
            saveWorkspaceSettingsRef.current();
        }, 1000);
    }, []);

    const handleRightPanelResize = useCallback((size: number) => {
        setRightPanelSize(size);
        setIsResizing(true);

        // 清除之前的定时器
        if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current);
        }

        // 设置新的定时器，延迟保存设置
        resizeTimerRef.current = setTimeout(() => {
            setIsResizing(false);
            saveWorkspaceSettingsRef.current();
        }, 1000);
    }, []);

    const handleBottomPanelResize = useCallback((size: number) => {
        setBottomPanelSize(size);
        setIsResizing(true);

        // 清除之前的定时器
        if (resizeTimerRef.current) {
            clearTimeout(resizeTimerRef.current);
        }

        // 设置新的定时器，拖拽结束后保存
        resizeTimerRef.current = setTimeout(() => {
            setIsResizing(false);
            saveWorkspaceSettingsRef.current();
        }, 1000);
    }, []);


    // 右侧功能面板处理函数
    const handleFunctionSelect = useCallback((functionType: FunctionType | null) => {
        setSelectedFunction(functionType);
        setRightPanelCollapsed(functionType === null);

        // 立即保存状态
        setTimeout(() => {
            saveWorkspaceSettingsRef.current();
        }, 100);
    }, []);

    const handleRightPanelClose = useCallback(() => {
        setSelectedFunction(null);
        setRightPanelCollapsed(true);

        // 立即保存状态
        setTimeout(() => {
            saveWorkspaceSettingsRef.current();
        }, 100);
    }, []);

    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
    const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
    const [executedQueries, setExecutedQueries] = useState<string[]>([]);
    const [executionTime, setExecutionTime] = useState<number>(0);
    const [activeTabType, setActiveTabType] = useState<'query' | 'table' | 'database' | 'data-browser'>('query');

    const [expandedDatabases, setExpandedDatabases] = useState<string[]>([]);

    // 调试：监听 expandedDatabases 变化
    useEffect(() => {
        if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_RENDERS === 'true') {
            console.log('🔄 DataGripStyleLayout expandedDatabases 变化:', {
                expandedDatabases: JSON.stringify(expandedDatabases), // 显示具体内容
                length: expandedDatabases.length,
                timestamp: new Date().toISOString()
            });

            // 强制触发 TabEditor 的重新渲染
            if (tabEditorRef.current) {
                console.log('🔄 强制更新 TabEditor 组件');
                // 这里可以调用 TabEditor 的方法来强制更新
            }
        }
    }, [expandedDatabases]);

    // 智能视图切换：当在查询视图但没有展开数据库时，提示用户先展开数据库
    useEffect(() => {
        if (currentView === 'query' && expandedDatabases.length === 0) {
            console.log('💡 检测到查询视图但没有展开数据库，建议切换到数据源视图');
            // 可以选择自动切换到数据源视图，或者显示提示
            // setCurrentView('datasource'); // 取消注释以启用自动切换
        }
    }, [currentView, expandedDatabases]);


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
    const tabEditorRef = useRef<TabEditorRef>(null);

    // 刷新数据源面板的方法
    const refreshDataExplorer = () => {
        setRefreshTrigger(prev => prev + 1);
    };


    // 监听路径变化，自动切换视图
    useEffect(() => {
        const newView = getViewFromPath(location.pathname);

        console.log('🔄 路径变化监听:', {
            pathname: location.pathname,
            currentView,
            newView,
            willUpdate: currentView !== newView
        });

        // 只有当视图真的不同时才更新，避免不必要的重渲染
        if (currentView !== newView) {
            console.log(`✅ 更新视图: ${currentView} → ${newView}`);
            setCurrentView(newView);
        }

        // 移除自动打开查询历史的逻辑，改为手动触发
        // 这样可以避免软件启动时自动弹出查询历史对话框
    }, [location]); // 🔧 关键修复：只依赖 location 对象，不依赖 currentView

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
            setLeftPanelSize(
                preferences.workspace.panel_positions?.['left-panel'] || 25
            );
            setBottomPanelSize(
                preferences.workspace.panel_positions?.['bottom-panel'] || 40
            );
        }
    }, [preferences]);

    // 监听布局偏好设置变化，应用到当前视图（仅单向）
    // 🔧 修复：添加条件避免与路径变化监听器冲突
    useEffect(() => {
        if (preferences?.workspace.layout) {
            // 只在根路径或仪表板路径，且不是用户主动导航时，应用用户偏好的布局
            if ((location.pathname === '/' || location.pathname === '/dashboard')) {
                const userLayout = preferences.workspace.layout;
                const layout = isValidLayout(userLayout) ? userLayout : 'datasource';
                const expectedViewFromPath = getViewFromPath(location.pathname);

                // 只有当路径对应的视图与偏好设置一致时才应用，避免冲突
                if (expectedViewFromPath === 'datasource' && currentView !== layout) {
                    setCurrentView(layout);
                    console.log('应用用户偏好布局:', layout);
                }
            }
        }
    }, [preferences?.workspace.layout]); // 🔧 移除 location.pathname 依赖，避免循环

    // 当布局状态改变时自动保存（排除面板大小变化）
    // 🔧 修复：增加防抖时间，减少保存频率，避免与导航冲突
    useEffect(() => {
        const timer = setTimeout(() => {
            // 只在非导航页面时保存视图状态，避免干扰路由导航
            if (location.pathname === '/' || location.pathname === '/dashboard') {
                saveWorkspaceSettings();
            }
        }, 1000); // 增加到1000ms，减少保存频率

        return () => clearTimeout(timer);
    }, [
        leftPanelCollapsed,
        bottomPanelCollapsed,
        currentView,
        saveWorkspaceSettings,
        location.pathname, // 添加路径依赖，确保在正确的页面保存
    ]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (resizeTimerRef.current) {
                clearTimeout(resizeTimerRef.current);
            }
            if (viewChangeTimeoutRef.current) {
                clearTimeout(viewChangeTimeoutRef.current);
            }
        };
    }, []);

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

        const handleTableQuery = (event: Event) => {
            const customEvent = event as CustomEvent;
            const {query, database, tableName} = customEvent.detail;
            console.log('📥 DataGripStyleLayout收到表查询事件:', {query, database, tableName});

            // 切换到查询视图并执行查询
            setCurrentView('query');
            if (tabEditorRef.current?.executeQueryWithContent) {
                tabEditorRef.current.executeQueryWithContent(query, database);
            }
        };

        document.addEventListener(
            'refresh-database-tree',
            handleRefreshDatabaseTree
        );

        document.addEventListener(
            'table-query',
            handleTableQuery
        );

        return () => {
            document.removeEventListener(
                'refresh-database-tree',
                handleRefreshDatabaseTree
            );
            document.removeEventListener(
                'table-query',
                handleTableQuery
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

        // 总是创建新的查询标签页，不直接执行查询
        if (database && tabEditorRef.current?.createQueryTabWithDatabase) {
            // 使用新的方法创建带数据库选择的查询标签页，并填入查询内容
            tabEditorRef.current.createQueryTabWithDatabase(database, query);
        } else if (query && tabEditorRef.current?.createNewTab) {
            // 如果没有数据库信息，创建新标签页后需要手动设置内容
            tabEditorRef.current.createNewTab('query');
            // 这里可能需要额外的逻辑来设置查询内容
        } else {
            // 创建空的查询标签页
            if (tabEditorRef.current?.createNewTab) {
                tabEditorRef.current.createNewTab('query');
            }
        }
    };

    // 处理创建查询标签页并自动执行事件
    const handleCreateAndExecuteQuery = async (query: string, database: string) => {
        // 切换到查询视图
        setCurrentView('query');

        // 创建新的查询标签页并自动执行查询
        if (tabEditorRef.current?.createAndExecuteQuery) {
            await tabEditorRef.current.createAndExecuteQuery(query, database);
        } else {
            // 回退到创建标签页
            handleCreateQueryTab(query, database);
        }
    };

    // 获取当前视图
    const getCurrentView = (): string => currentView;

    // 防抖处理视图切换，避免快速切换导致的问题
    const viewChangeTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    // 处理视图变化 - 特殊处理路径导航和偏好设置同步
    const handleViewChange = useCallback(
        (newView: string) => {
            // 防止重复切换到相同视图
            if (currentView === newView) {
                return;
            }

            // 清除之前的定时器
            if (viewChangeTimeoutRef.current) {
                clearTimeout(viewChangeTimeoutRef.current);
            }

            // 使用防抖机制，避免快速切换导致的问题
            viewChangeTimeoutRef.current = setTimeout(() => {
                // 定义视图到路径的映射
                const pathMap: Record<string, string> = {
                    datasource: '/connections',
                    query: '/query',
                    'query-history': '/query-history',
                    visualization: '/visualization',
                    performance: '/performance',
                    extensions: '/extensions',
                    'dev-tools': '/dev-tools',
                };

                // 对于需要特定路径的视图，先导航再设置视图状态
                if (pathMap[newView] && location.pathname !== pathMap[newView]) {
                    // 对于所有有特定路径的视图，都先导航再让路径监听器处理状态更新
                    // 这样可以确保路径和视图状态的同步
                    navigate(pathMap[newView]);
                    // 不立即设置 currentView，让 useEffect 监听路径变化来处理
                } else {
                    setCurrentView(newView);
                }
            }, 50); // 50ms防抖延迟

            // 🔧 修复：移除立即更新偏好设置的逻辑，避免与路径导航冲突
            // 偏好设置的更新由自动保存机制处理，避免在导航过程中产生状态冲突
        },
        [currentView, navigate, location.pathname, preferences?.workspace, updateWorkspaceSettings]
    );

    // 中间栏根据当前视图显示不同内容
    const mainContent = useMemo(() => {
        // 如果是多数据库工作台视图，显示专门的工作台页面
        if (currentView === 'multi-database') {
            return (
                <div className='h-full'>
                    <MultiDatabaseWorkbenchPage />
                </div>
            );
        }

        // 如果是 IoTDB 测试视图，显示测试页面
        if (currentView === 'iotdb-test') {
            return (
                <div className='h-full'>
                    <IoTDBTestPage />
                </div>
            );
        }

        // 默认显示查询面板内容
        return (
            <div className='h-full'>
                <ResizablePanelGroup direction='vertical'>
                    {/* 上半部分：编辑器 */}
                    <ResizablePanel
                        defaultSize={bottomPanelCollapsed || activeTabType !== 'query' ? 100 : 100 - bottomPanelSize}
                        minSize={30}
                        className='bg-background overflow-hidden'
                    >
                        <TabEditorRefactored
                            key="main-tab-editor-stable" // 使用更稳定的 key 防止重新挂载
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
                            ref={tabEditorRef}
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
                                    onResize={handleBottomPanelResize}
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
                        onResize={handleLeftPanelResize}
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
                                onCreateAndExecuteQuery={handleCreateAndExecuteQuery}
                                onViewChange={handleViewChange}
                                onGetCurrentView={getCurrentView}
                                onExpandedDatabasesChange={setExpandedDatabases}
                                currentTimeRange={currentTimeRange}
                            />
                        </div>
                    </ResizablePanel>

                    {/* 分割线 */}
                    <ResizableHandle
                        className='w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize'/>

                    {/* 右侧区域：使用嵌套的ResizablePanelGroup */}
                    <ResizablePanel defaultSize={100 - leftPanelSize} minSize={50}>
                        <ResizablePanelGroup direction='horizontal'>
                            {/* 中间主要工作区域 */}
                            <ResizablePanel
                                defaultSize={rightPanelCollapsed ? 100 : 100 - rightPanelSize}
                                minSize={40}
                            >
                                <div className='h-full bg-background flex flex-col'>
                                    <div
                                        key={`view-${currentView}`}
                                        className='h-full transition-all duration-200 ease-in-out'
                                        style={{
                                            // 确保内容在视图切换时保持稳定
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {mainContent}
                                    </div>
                                </div>
                            </ResizablePanel>

                            {/* 右侧功能面板（始终存在但可能隐藏） */}
                            {!rightPanelCollapsed && selectedFunction && (
                                <>
                                    <ResizableHandle
                                        className='w-px bg-border hover:bg-primary/50 transition-colors cursor-col-resize'/>
                                    <ResizablePanel
                                        defaultSize={rightPanelSize}
                                        minSize={20}
                                        maxSize={60}
                                        onResize={handleRightPanelResize}
                                    >
                                        <div className='h-full bg-background'>
                                            <RightFunctionPanel
                                                selectedFunction={selectedFunction}
                                                onClose={handleRightPanelClose}
                                            />
                                        </div>
                                    </ResizablePanel>
                                </>
                            )}

                            {/* 最右侧图标栏 - 固定宽度 */}
                            <div className='w-12 flex-shrink-0'>
                                <RightFunctionBar
                                    selectedFunction={selectedFunction}
                                    onFunctionSelect={handleFunctionSelect}
                                />
                            </div>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </Layout>
    );
};

export default DataGripStyleLayout;
