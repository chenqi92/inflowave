import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import { QueryToolbar } from '@/components/query/QueryToolbar';
import QueryResults from '@/components/query/QueryResults';
import BatchResultsView from '@/components/query/BatchResultsView';
import { EditorManager } from '@/components/editor/EditorManager';
import type { EditorManagerRef } from '@/components/editor/EditorManager';
import { useQueryExecutor } from '@/components/editor/QueryExecutor';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
  Button,
} from '@/components/ui';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult } from '@/types';
import { ArrowLeftToLine } from 'lucide-react';

interface DetachedTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  connectionId?: string;
  database?: string;
  tableName?: string;
  modified?: boolean;
  // 查询结果相关字段
  queryResult?: QueryResult | null;
  queryResults?: QueryResult[];
  executedQueries?: string[];
  executionTime?: number;
}

interface DetachedTabWindowProps {
  tab: DetachedTab;
  onReattach?: () => void;
  onClose?: () => void;
}

const DetachedTabWindow: React.FC<DetachedTabWindowProps> = ({
  tab,
  onReattach,
  onClose,
}) => {
  // 🔧 添加详细的初始化日志
  console.log('🚀 DetachedTabWindow 组件渲染:', {
    tabId: tab.id,
    tabTitle: tab.title,
    tabType: tab.type,
    hasContent: !!tab.content,
    contentLength: tab.content?.length || 0,
    connectionId: tab.connectionId,
    database: tab.database,
    tableName: tab.tableName,
    modified: tab.modified,
    hasQueryResult: !!tab.queryResult,
    queryResultsCount: tab.queryResults?.length || 0,
  });

  const { resolvedTheme } = useTheme();
  const [content, setContent] = useState(tab.content || '');
  const [modified, setModified] = useState(tab.modified || false);

  // 查询相关状态 - 从tab prop中恢复初始值
  const [selectedDatabase, setSelectedDatabase] = useState(tab.database || '');
  const [selectedTimeRange, setSelectedTimeRange] = useState<any>(undefined); // 默认不限制时间
  const [queryResult, setQueryResult] = useState<QueryResult | null>(tab.queryResult || null);
  const [queryResults, setQueryResults] = useState<QueryResult[]>(tab.queryResults || []);
  const [executedQueries, setExecutedQueries] = useState<string[]>(tab.executedQueries || []);
  const [executionTime, setExecutionTime] = useState(tab.executionTime || 0);

  // 初始化时打印查询结果恢复信息
  useEffect(() => {
    console.log(`🪟 独立窗口初始化，恢复查询结果:`, {
      tabId: tab.id,
      tabTitle: tab.title,
      hasQueryResult: !!tab.queryResult,
      hasQueryResults: !!tab.queryResults,
      queryResultsCount: tab.queryResults?.length || 0,
      executedQueriesCount: tab.executedQueries?.length || 0,
    });
  }, []);

  const { activeConnectionId, setActiveConnection, connections } = useConnectionStore();
  const { openedDatabasesList } = useOpenedDatabasesStore();
  const editorManagerRef = useRef<EditorManagerRef>(null);

  // 初始化连接ID
  useEffect(() => {
    if (tab.connectionId && tab.connectionId !== activeConnectionId) {
      setActiveConnection(tab.connectionId);
    }
  }, [tab.connectionId, activeConnectionId, setActiveConnection]);

  // 获取数据库列表 - 使用openedDatabasesList而不是connections.databases
  const databases = React.useMemo(() => {
    const connectionId = tab.connectionId || activeConnectionId;
    if (!connectionId) return [];

    const { openedDatabases } = useOpenedDatabasesStore.getState();
    const connectionDatabases: string[] = [];

    for (const key of openedDatabases) {
      if (key.startsWith(`${connectionId}/`)) {
        const database = key.substring(connectionId.length + 1);
        if (database) {
          connectionDatabases.push(database);
        }
      }
    }

    return connectionDatabases;
  }, [tab.connectionId, activeConnectionId, openedDatabasesList]);

  // 创建一个临时的tab对象用于查询执行器
  const currentTab = {
    id: tab.id,
    title: tab.title,
    content: content,
    type: tab.type,
    modified: modified,
    saved: false,
    connectionId: tab.connectionId,
    database: tab.database,
    tableName: tab.tableName,
  };

  // 查询执行器
  const {
    loading,
    actualExecutedQueries,
    hasAnyConnectedInfluxDB,
    executeQuery,
    executeQueryWithContent,
  } = useQueryExecutor({
    currentTab,
    selectedDatabase,
    selectedTimeRange,
    onQueryResult: setQueryResult,
    onBatchQueryResults: (results, queries, time) => {
      setQueryResults(results);
      setExecutedQueries(queries);
      setExecutionTime(time);
      if (results.length === 1) {
        setQueryResult(results[0]);
      }
    },
    onUpdateTab: () => {},
    getSelectedText: () => editorManagerRef.current?.getSelectedText() || null,
  });

  // 处理内容变化
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    setModified(value !== tab.content);
  }, [tab.content]);

  // 处理移回主窗口
  const handleReattach = useCallback(async () => {
    try {
      // 🔧 获取当前窗口的label
      const currentWindow = getCurrentWindow();
      const windowLabel = currentWindow.label;

      console.log('🔄 准备移回主窗口:', {
        windowLabel,
        tabId: tab.id,
        tabTitle: tab.title,
      });

      // 创建tab数据，包含查询结果和窗口label
      const tabData = {
        id: tab.id,
        title: tab.title,
        content: content,
        type: tab.type,
        connectionId: tab.connectionId,
        database: selectedDatabase,
        tableName: tab.tableName,
        modified: modified,
        // 🔧 包含查询结果，确保移回主窗口后结果不丢失
        queryResult: queryResult,
        queryResults: queryResults,
        executedQueries: executedQueries,
        executionTime: executionTime,
        // 🔧 包含窗口label，用于后端关闭窗口
        windowLabel: windowLabel,
      };

      console.log('🔄 移回主窗口，tab数据:', {
        tabId: tabData.id,
        windowLabel: tabData.windowLabel,
        hasQueryResult: !!tabData.queryResult,
        queryResultsCount: tabData.queryResults?.length || 0,
      });

      // 🔧 通过Tauri命令通知主窗口，后端会关闭独立窗口
      await safeTauriInvoke('reattach_tab', { tab: tabData });

      console.log('✅ 已发送reattach命令，等待后端关闭窗口');

      // 🔧 不再在前端关闭窗口，由后端处理
      // 这样可以确保窗口在主窗口处理完reattach事件后才关闭
    } catch (error) {
      console.error('❌ 移回主窗口失败:', error);
      showMessage.error('移回主窗口失败');
    }
  }, [tab, content, selectedDatabase, modified, queryResult, queryResults, executedQueries, executionTime]);







  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 不要阻止系统级的复制粘贴快捷键
      const isSystemClipboard = (
        (event.ctrlKey || event.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(event.key.toLowerCase())
      );

      if (isSystemClipboard) {
        return; // 让系统处理复制粘贴
      }

      // Ctrl+S 保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        // 保存逻辑
        if (modified) {
          safeTauriInvoke('save_tab_content', { tabId: tab.id, content });
          setModified(false);
          showMessage.success('保存成功');
        }
      }

      // Ctrl+W 关闭窗口
      if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modified, content, tab.id, onClose]);

  // 🔧 调试：打印渲染信息
  console.log('🪟 DetachedTabWindow 准备渲染UI:', {
    tabId: tab.id,
    tabTitle: tab.title,
    tabType: tab.type,
    hasConnectionId: !!tab.connectionId,
    hasDatabase: !!tab.database,
    hasTableName: !!tab.tableName,
    hasQueryResult: !!queryResult,
    queryResultsCount: queryResults?.length || 0,
    hasActiveConnection: !!activeConnectionId,
    connectionsCount: connections.length,
  });

  // 🔧 如果是data-browser类型但缺少必要信息，显示错误
  if (tab.type === 'data-browser' && (!tab.connectionId || !tab.database || !tab.tableName)) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-4">数据浏览器配置错误</h1>
          <p className="text-muted-foreground mb-2">缺少必要的连接信息</p>
          <pre className="text-xs text-left bg-muted p-4 rounded mt-4">
            {JSON.stringify({
              connectionId: tab.connectionId,
              database: tab.database,
              tableName: tab.tableName,
            }, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className="h-screen bg-background flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex-shrink-0 bg-muted/30 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{tab.title}</span>
            {modified && <span className="text-xs text-orange-500">●</span>}
            <span className="text-xs text-muted-foreground">({tab.type})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReattach}
            className="flex items-center gap-2"
          >
            <ArrowLeftToLine className="w-4 h-4" />
            移回主窗口
          </Button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        {tab.type === 'data-browser' ? (
          <TableDataBrowser
            connectionId={tab.connectionId!}
            database={tab.database!}
            tableName={tab.tableName!}
          />
        ) : (
          <ResizablePanelGroup direction="vertical" className="h-full">
            {/* 上半部分: 编辑器 */}
            <ResizablePanel defaultSize={50} minSize={20} className="bg-background">
              <div className="h-full flex flex-col">
                {/* 查询工具栏 */}
                {tab.type === 'query' && (
                  <QueryToolbar
                    selectedConnectionId={tab.connectionId || activeConnectionId}
                    selectedDatabase={selectedDatabase}
                    selectedTimeRange={selectedTimeRange}
                    onConnectionChange={(connectionId) => {
                      setActiveConnection(connectionId);
                      setSelectedDatabase('');
                    }}
                    onDatabaseChange={setSelectedDatabase}
                    onTimeRangeChange={setSelectedTimeRange}
                    onExecuteQuery={executeQuery}
                    onSaveQuery={() => {
                      if (modified) {
                        safeTauriInvoke('save_tab_content', { tabId: tab.id, content });
                        setModified(false);
                        showMessage.success('保存成功');
                      }
                    }}
                    onFormatSQL={() => {
                      // 格式化SQL的逻辑
                      showMessage.info('SQL格式化功能待实现');
                    }}
                    loading={loading}
                    disabled={false}
                  />
                )}

                {/* 编辑器 */}
                <div className="flex-1 overflow-hidden">
                  <EditorManager
                    ref={editorManagerRef}
                    currentTab={currentTab}
                    selectedDatabase={selectedDatabase}
                    databases={databases}
                    onContentChange={handleContentChange}
                    onExecuteQuery={executeQuery}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* 分割线 */}
            {tab.type === 'query' && (
              <>
                <ResizableHandle withHandle className="h-2 bg-border hover:bg-border/80" />

                {/* 下半部分: 结果面板 */}
                <ResizablePanel defaultSize={50} minSize={20} className="bg-background">
                  {queryResults && queryResults.length > 1 ? (
                    // 批量查询结果
                    <BatchResultsView
                      results={queryResults}
                      queries={executedQueries}
                      totalExecutionTime={executionTime}
                      mode="tabs"
                    />
                  ) : (
                    // 单个查询结果
                    <QueryResults
                      result={queryResult}
                      loading={loading}
                      executedQuery={executedQueries?.[0]}
                    />
                  )}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex-shrink-0 bg-muted/50 border-t px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>类型: {tab.type}</span>
            {tab.type === 'data-browser' && tab.tableName && (
              <span>表: {tab.tableName}</span>
            )}
            {modified && <span className="text-orange-500">已修改</span>}
            {selectedDatabase && <span>数据库: {selectedDatabase}</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Ctrl+S 保存</span>
            <span>Ctrl+W 关闭</span>
          </div>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error('❌ DetachedTabWindow 渲染错误:', error);
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-destructive mb-4">独立窗口渲染错误</h1>
          <p className="text-muted-foreground mb-4">渲染组件时发生错误</p>
          <pre className="text-xs text-left bg-muted p-4 rounded mt-4 max-w-2xl overflow-auto">
            {String(error)}
          </pre>
        </div>
      </div>
    );
  }
};

export default DetachedTabWindow;