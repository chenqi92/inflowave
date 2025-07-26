/**
 * 多数据库工作台组件
 * 
 * 整合查询引擎、结果展示、可视化和数据源管理的统一工作界面
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Badge,
  Separator,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Database,
  TreePine,
  BarChart,
  Search,
  Play,
  Table,
  TrendingUp,
  Settings,
  RefreshCw,
  Maximize2,
  Minimize2,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react';
import { MultiDatabaseExplorer } from '@/components/database/MultiDatabaseExplorer';
import { MultiDatabaseManager } from '@/components/database/MultiDatabaseManager';
import { MultiDatabaseQueryEngine } from '@/components/query/MultiDatabaseQueryEngine';
import { MultiDatabaseQueryResults } from '@/components/query/MultiDatabaseQueryResults';
import { MultiDatabaseChart } from '@/components/visualization/MultiDatabaseChart';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import type { DatabaseType, QueryResult, ConnectionConfig } from '@/types';

// 数据库图标映射
const DATABASE_ICONS = {
  influxdb: <Database className="w-4 h-4 text-blue-500" />,
  iotdb: <TreePine className="w-4 h-4 text-green-500" />,
  prometheus: <BarChart className="w-4 h-4 text-orange-500" />,
  elasticsearch: <Search className="w-4 h-4 text-purple-500" />,
} as const;

interface MultiDatabaseWorkbenchProps {
  className?: string;
}

export const MultiDatabaseWorkbench: React.FC<MultiDatabaseWorkbenchProps> = ({
  className,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('query');
  const [activeLeftTab, setActiveLeftTab] = useState('explorer');
  const [activeRightTab, setActiveRightTab] = useState('results');
  
  // 查询相关状态
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentDatabase, setCurrentDatabase] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState(0);
  
  // 刷新触发器
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);
  const dbType = currentConnection?.dbType || 'influxdb';

  // 处理查询执行
  const handleQueryExecute = useCallback((query: string, database: string, language: string) => {
    setCurrentQuery(query);
    setCurrentDatabase(database);
    setActiveRightTab('results');
    
    console.log('执行查询:', { query, database, language });
  }, []);

  // 处理查询结果
  const handleQueryResult = useCallback((result: QueryResult) => {
    setQueryResult(result);
    setQueryError(null);
    
    // 如果有数值数据，自动切换到图表视图
    if (result.data || result.results) {
      setActiveRightTab('chart');
    }
  }, []);

  // 处理数据源浏览器操作
  const handleDataSourceAction = useCallback((action: string, node: any) => {
    console.log('数据源操作:', action, node);
    
    switch (action) {
      case 'create_query':
        if (node.metadata?.query) {
          setCurrentQuery(node.metadata.query);
          setCurrentDatabase(node.database || '');
          setActiveMainTab('query');
        }
        break;
      case 'browse_data':
        if (node.connectionId && node.database && node.table) {
          // 生成数据浏览查询
          const query = generateDataBrowseQuery(dbType, node.database, node.table);
          setCurrentQuery(query);
          setCurrentDatabase(node.database);
          setActiveMainTab('query');
        }
        break;
      case 'refresh':
        setRefreshTrigger(prev => prev + 1);
        break;
    }
  }, [dbType]);

  // 生成数据浏览查询
  const generateDataBrowseQuery = useCallback((dbType: DatabaseType, database: string, table: string) => {
    switch (dbType) {
      case 'influxdb':
        return `SELECT * FROM "${table}" WHERE time >= now() - 1h LIMIT 100`;
      case 'iotdb':
        return `SELECT * FROM ${database}.${table} WHERE time >= now() - 1h LIMIT 100`;
      case 'prometheus':
        return `{__name__="${table}"}[1h]`;
      case 'elasticsearch':
        return `GET /${table}/_search\n{\n  "size": 100\n}`;
      default:
        return `SELECT * FROM "${table}" LIMIT 100`;
    }
  }, []);

  // 处理表双击
  const handleTableDoubleClick = useCallback((database: string, table: string, query: string) => {
    setCurrentQuery(query);
    setCurrentDatabase(database);
    setActiveMainTab('query');
    setActiveRightTab('results');
  }, []);

  // 创建数据浏览标签页
  const handleCreateDataBrowserTab = useCallback((connectionId: string, database: string, tableName: string) => {
    const query = generateDataBrowseQuery(dbType, database, tableName);
    setCurrentQuery(query);
    setCurrentDatabase(database);
    setActiveMainTab('query');
    setActiveRightTab('results');
  }, [dbType, generateDataBrowseQuery]);

  // 创建查询标签页
  const handleCreateQueryTab = useCallback((query?: string, database?: string) => {
    if (query) setCurrentQuery(query);
    if (database) setCurrentDatabase(database);
    setActiveMainTab('query');
  }, []);

  // 创建并执行查询
  const handleCreateAndExecuteQuery = useCallback((query: string, database: string) => {
    setCurrentQuery(query);
    setCurrentDatabase(database);
    setActiveMainTab('query');
    setActiveRightTab('results');
    
    // 触发查询执行
    setTimeout(() => {
      handleQueryExecute(query, database, 'sql');
    }, 100);
  }, [handleQueryExecute]);

  // 编辑连接
  const handleEditConnection = useCallback((connection: ConnectionConfig) => {
    console.log('编辑连接:', connection);
    showMessage.info('编辑连接功能开发中...');
  }, []);

  // 刷新所有数据
  const handleRefreshAll = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    showMessage.success('已刷新所有数据');
  }, []);

  // 导出查询结果
  const handleExportResult = useCallback((format: string) => {
    console.log('导出结果:', format);
    showMessage.success(`正在导出 ${format.toUpperCase()} 格式...`);
  }, []);

  // 导出图表
  const handleExportChart = useCallback(() => {
    console.log('导出图表');
    showMessage.success('正在导出图表...');
  }, []);

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 顶部工具栏 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              {DATABASE_ICONS[dbType]}
              <span>多数据库工作台</span>
              {currentConnection && (
                <Badge variant="outline">
                  {currentConnection.name} ({currentConnection.dbType?.toUpperCase()})
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
              >
                {leftPanelCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              >
                {rightPanelCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主要工作区域 */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* 左侧面板 - 数据源管理 */}
          {!leftPanelCollapsed && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <Tabs value={activeLeftTab} onValueChange={setActiveLeftTab} className="h-full">
                      <div className="border-b p-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="explorer">数据源</TabsTrigger>
                          <TabsTrigger value="manager">管理</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="explorer" className="h-full mt-0 p-4">
                        <MultiDatabaseExplorer
                          refreshTrigger={refreshTrigger}
                          onTableDoubleClick={handleTableDoubleClick}
                          onCreateDataBrowserTab={handleCreateDataBrowserTab}
                          onCreateQueryTab={handleCreateQueryTab}
                          onCreateAndExecuteQuery={handleCreateAndExecuteQuery}
                          onEditConnection={handleEditConnection}
                        />
                      </TabsContent>

                      <TabsContent value="manager" className="h-full mt-0 p-4">
                        <MultiDatabaseManager
                          refreshTrigger={refreshTrigger}
                          onTableDoubleClick={handleTableDoubleClick}
                          onCreateDataBrowserTab={handleCreateDataBrowserTab}
                          onCreateQueryTab={handleCreateQueryTab}
                          onCreateAndExecuteQuery={handleCreateAndExecuteQuery}
                          onEditConnection={handleEditConnection}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </ResizablePanel>
              <ResizableHandle />
            </>
          )}

          {/* 中间面板 - 查询引擎 */}
          <ResizablePanel defaultSize={leftPanelCollapsed ? 60 : 45} minSize={30}>
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="h-full">
                  <div className="border-b p-2">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="query">查询引擎</TabsTrigger>
                      <TabsTrigger value="settings">设置</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="query" className="h-full mt-0 p-4">
                    <MultiDatabaseQueryEngine
                      onQueryExecute={handleQueryExecute}
                      onQueryResult={handleQueryResult}
                    />
                  </TabsContent>

                  <TabsContent value="settings" className="h-full mt-0 p-4">
                    <div className="space-y-4">
                      <Alert>
                        <Settings className="w-4 h-4" />
                        <AlertDescription>
                          工作台设置功能开发中...
                        </AlertDescription>
                      </Alert>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </ResizablePanel>

          {/* 右侧面板 - 结果展示 */}
          {!rightPanelCollapsed && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <Tabs value={activeRightTab} onValueChange={setActiveRightTab} className="h-full">
                      <div className="border-b p-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="results">查询结果</TabsTrigger>
                          <TabsTrigger value="chart">数据可视化</TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="results" className="h-full mt-0 p-4">
                        <MultiDatabaseQueryResults
                          result={queryResult}
                          loading={queryLoading}
                          error={queryError}
                          executionTime={executionTime}
                          query={currentQuery}
                          database={currentDatabase}
                          onExport={handleExportResult}
                          onRefresh={() => {
                            if (currentQuery && currentDatabase) {
                              handleQueryExecute(currentQuery, currentDatabase, 'sql');
                            }
                          }}
                        />
                      </TabsContent>

                      <TabsContent value="chart" className="h-full mt-0 p-4">
                        <MultiDatabaseChart
                          data={queryResult}
                          loading={queryLoading}
                          title="数据可视化"
                          database={currentDatabase}
                          onRefresh={() => {
                            if (currentQuery && currentDatabase) {
                              handleQueryExecute(currentQuery, currentDatabase, 'sql');
                            }
                          }}
                          onExport={handleExportChart}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* 连接状态提示 */}
      {!currentConnection && (
        <Alert className="mt-4">
          <AlertDescription>
            请先创建并连接到数据库以开始使用工作台功能。
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MultiDatabaseWorkbench;
