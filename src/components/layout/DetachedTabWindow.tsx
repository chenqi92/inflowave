import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import { QueryToolbar } from '@/components/query/QueryToolbar';
import QueryResults from '@/components/query/QueryResults';
import { EditorManager } from '@/components/editor/EditorManager';
import type { EditorManagerRef } from '@/components/editor/EditorManager';
import { useQueryExecutor } from '@/components/editor/QueryExecutor';
import { useConnectionStore } from '@/store/connection';
import {
  ResizablePanel,
  ResizablePanelGroup,
  ResizableHandle,
} from '@/components/ui';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult } from '@/types/query';

interface DetachedTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  connectionId?: string;
  database?: string;
  tableName?: string;
  modified?: boolean;
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
  const { resolvedTheme } = useTheme();
  const [content, setContent] = useState(tab.content);
  const [modified, setModified] = useState(false);

  // 查询相关状态
  const [selectedDatabase, setSelectedDatabase] = useState(tab.database || '');
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [executedQueries, setExecutedQueries] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState(0);

  const { activeConnectionId, setActiveConnection, connections } = useConnectionStore();
  const editorManagerRef = useRef<EditorManagerRef>(null);

  // 获取数据库列表
  const databases = connections.find(c => c.id === (tab.connectionId || activeConnectionId))?.databases || [];

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

  return (
    <div className="h-screen bg-background flex flex-col">
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
                  <QueryResults
                    result={queryResult}
                    results={queryResults}
                    executedQueries={executedQueries}
                    executionTime={executionTime}
                    loading={loading}
                  />
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
};

export default DetachedTabWindow;