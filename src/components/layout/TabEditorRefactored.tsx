import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { FileText, Plus, FolderOpen } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { formatSQL } from '@/utils/sqlFormatter';
import type { DatabaseType } from '@/utils/sqlFormatter';
import type { TimeRange } from '@/components/common/TimeRangeSelector';

// 导入拆分的模块
import { TabManager, EditorTab } from '@/components/editor/TabManager';
import { EditorManager } from '@/components/editor/EditorManager';
import { useQueryExecutor } from '@/components/editor/QueryExecutor';
import { useFileOperations } from '@/components/editor/FileOperations';
import { useTabStore, useCurrentTab, useTabOperations } from '@/stores/tabStore';
import { QueryToolbar } from '@/components/query/QueryToolbar';
import DataExportDialog from '@/components/common/DataExportDialog';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import SimpleDragOverlay from '@/components/common/SimpleDragOverlay';
import useSimpleTabDrag from '@/hooks/useSimpleTabDrag';

import type { QueryResult } from '@/types';

interface TabEditorProps {
  onQueryResult?: (result: QueryResult | null) => void;
  onBatchQueryResults?: (
    results: QueryResult[],
    queries: string[],
    executionTime: number
  ) => void;
  onActiveTabTypeChange?: (tabType: 'query' | 'table' | 'database' | 'data-browser') => void;
  expandedDatabases?: string[];
  currentTimeRange?: TimeRange;
}

export interface TabEditorRef {
  executeQueryWithContent: (query: string, database: string) => void;
  createDataBrowserTab: (connectionId: string, database: string, tableName: string) => void;
  createNewTab: (type?: 'query' | 'table' | 'database') => void;
  createQueryTabWithDatabase: (database: string, query?: string, connectionId?: string) => void;
  createAndExecuteQuery: (query: string, database: string, connectionId?: string) => Promise<void>;
  setSelectedDatabase: (database: string) => void;
}

const TabEditorRefactored = forwardRef<TabEditorRef, TabEditorProps>(
  ({ onQueryResult, onBatchQueryResults, onActiveTabTypeChange, expandedDatabases = [], currentTimeRange }, ref) => {
    const location = useLocation();
    const { activeConnectionId, connections, setActiveConnection } = useConnectionStore();
    const { openedDatabasesList } = useOpenedDatabasesStore();

    // Tab管理 - 使用全局store
    const {
      tabs,
      activeKey,
      selectedDatabase,
      selectedTimeRange,
      setTabs,
      setActiveKey,
      setSelectedDatabase,
      setSelectedTimeRange,
      updateTabContent
    } = useTabStore();

    const currentTab = useCurrentTab();
    const { createQueryTab, createDataBrowserTab, saveTab, removeTab, updateTab } = useTabOperations();

    const [databases, setDatabases] = useState<string[]>([]);

    // 初始化时间范围
    React.useEffect(() => {
      if (currentTimeRange && !selectedTimeRange) {
        setSelectedTimeRange(currentTimeRange);
      }
    }, [currentTimeRange, selectedTimeRange, setSelectedTimeRange]);

    // 拖拽功能
    const {
      isDragging,
      draggedTab,
      dropZoneActive,
      handleTabDragStart,
      handleTabDrag,
      handleTabDragEnd,
      handleTabDrop,
      handleTabDragOver,
      showTabInPopup,
    } = useSimpleTabDrag();

    // 更新标签页内容的包装函数
    const handleTabContentChange = useCallback((tabId: string, content: string) => {
      updateTabContent(tabId, content);
      console.log(`Tab ${tabId} content changed`);
    }, [updateTabContent]);

    // 查询执行器
    const {
      loading,
      actualExecutedQueries,
      hasAnyConnectedInfluxDB,
      executeQuery,
      executeQueryWithContent,
      testIntelligentHints,
    } = useQueryExecutor({
      currentTab,
      selectedDatabase,
      selectedTimeRange,
      onQueryResult,
      onBatchQueryResults,
      onUpdateTab: updateTab,
    });

    // 文件操作
    const {
      showExportDialog,
      setShowExportDialog,
      saveCurrentTab,
      saveFileAs,
      openFile,
      exportWorkspace,
      importWorkspace,
      exportData,
      autoSave,
      saveAllTabs,
    } = useFileOperations({
      tabs,
      currentTab,
      onTabsChange: setTabs,
      onActiveKeyChange: setActiveKey,
    });

    // SQL格式化处理函数
    const handleFormatSQL = useCallback(() => {
      if (currentTab && currentTab.type === 'query') {
        const currentContent = currentTab.content;
        const connection = connections.find(c => c.id === activeConnectionId);
        const databaseType = (connection?.version || 'unknown') as DatabaseType;
        
        try {
          const formattedSQL = formatSQL(currentContent, databaseType);
          
          // 更新tab内容
          updateTabContent(currentTab.id, formattedSQL);
          
          showMessage.success('SQL格式化完成');
        } catch (error) {
          console.error('SQL格式化失败:', error);
          showMessage.error(`SQL格式化失败: ${error}`);
        }
      }
    }, [currentTab, connections, activeConnectionId, updateTabContent]);

    // 创建新标签
    const createNewTab = useCallback((type: 'query' | 'table' | 'database' = 'query') => {
      if (type === 'query') {
        // 使用当前活动的连接ID
        createQueryTab(selectedDatabase, undefined, activeConnectionId);
      } else {
        // 对于其他类型，使用原有逻辑
        const newTab: EditorTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: `${type === 'table' ? '表' : '数据库'}-${tabs.length + 1}`,
          content: '',
          type,
          modified: true,
          saved: false,
        };

        setTabs([...tabs, newTab]);
        setActiveKey(newTab.id);
      }

      // 清空查询结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);
    }, [createQueryTab, selectedDatabase, tabs, setTabs, setActiveKey, onQueryResult, onBatchQueryResults]);

    // 创建数据浏览标签 - 使用store中的方法
    const handleCreateDataBrowserTab = useCallback((connectionId: string, database: string, tableName: string) => {
      createDataBrowserTab(connectionId, database, tableName);

      // 清空查询结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);
    }, [createDataBrowserTab, onQueryResult, onBatchQueryResults]);

    // 创建带数据库选择的查询标签页
    const createQueryTabWithDatabase = useCallback((database: string, query?: string, connectionId?: string) => {
      const newTab = createQueryTab(database, query, connectionId);
      setSelectedDatabase(database);

      // 清空查询结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);

      console.log(`✅ 创建查询标签页并选中数据库: ${database}, connectionId: ${connectionId}`);
    }, [createQueryTab, setSelectedDatabase, onQueryResult, onBatchQueryResults]);

    // 创建查询标签页并自动执行查询
    const createAndExecuteQuery = useCallback(async (query: string, database: string, connectionId?: string) => {
      // 首先创建新的查询标签页
      const newTab = createQueryTab(database, query, connectionId);
      setSelectedDatabase(database);

      // 清空之前的查询结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);

      console.log(`✅ 创建查询标签页并准备执行查询: ${database}`);

      // 等待一个短暂的延迟，确保标签页已经创建并激活
      setTimeout(async () => {
        try {
          // 执行查询
          await executeQueryWithContent(query, database);
          console.log(`✅ 查询执行完成`);
        } catch (error) {
          console.error('❌ 自动执行查询失败:', error);
          showMessage.error(`查询执行失败: ${error}`);
        }
      }, 100);
    }, [createQueryTab, setSelectedDatabase, onQueryResult, onBatchQueryResults, executeQueryWithContent]);

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        executeQueryWithContent,
        createDataBrowserTab: handleCreateDataBrowserTab,
        createNewTab,
        createQueryTabWithDatabase,
        createAndExecuteQuery,
        setSelectedDatabase,
      }),
      [executeQueryWithContent, handleCreateDataBrowserTab, createNewTab, createQueryTabWithDatabase, createAndExecuteQuery, setSelectedDatabase]
    );

    // 监听活跃标签类型变化
    useEffect(() => {
      if (currentTab && onActiveTabTypeChange) {
        onActiveTabTypeChange(currentTab.type);
      }
    }, [currentTab?.type, onActiveTabTypeChange]);

    // 监听已打开数据库变化
    useEffect(() => {
      setDatabases(openedDatabasesList);

      if (openedDatabasesList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(openedDatabasesList[0]);
      } else if (openedDatabasesList.length === 0) {
        setSelectedDatabase('');
      }
    }, [openedDatabasesList, selectedDatabase]);

    // 确保当有标签页但没有activeKey时，自动选择最后一个标签页
    useEffect(() => {
      if (tabs.length > 0 && (!activeKey || !tabs.find(tab => tab.id === activeKey))) {
        const lastTab = tabs[tabs.length - 1];
        setActiveKey(lastTab.id);
        console.log(`🔄 自动切换到标签页: ${lastTab.title}`);
      }
    }, [tabs, activeKey, setActiveKey]);

    return (
      <TooltipProvider>
        <div className='h-full flex flex-col bg-background border-0 shadow-none'>
          {/* 标签页头部 */}
          <div className='flex items-center justify-between border-b border min-h-[48px] p-0'>
            {/* 左侧标签区域 */}
            <div className='flex-1 flex items-center min-w-0'>
              <TabManager
                tabs={tabs}
                activeKey={activeKey}
                onTabsChange={setTabs}
                onActiveKeyChange={setActiveKey}
                onTabContentChange={handleTabContentChange}
                onSaveTab={saveCurrentTab}
                onSaveTabAs={saveFileAs}
                onSaveAllTabs={saveAllTabs}
                isDragging={isDragging}
                draggedTab={draggedTab}
                onTabDragStart={handleTabDragStart}
                onTabDrag={handleTabDrag}
                onTabDragEnd={handleTabDragEnd}
                onTabDrop={handleTabDrop}
                onTabDragOver={handleTabDragOver}
              />
            </div>

            {/* 右侧简化区域 */}
            <div className='flex items-center gap-2 px-3 flex-shrink-0'>
              {/* 查询相关功能已移至查询tab内部的工具栏 */}
            </div>
          </div>

          {/* 编辑器内容 */}
          <div className='flex-1 min-h-0 overflow-hidden'>
            {tabs.length > 0 ? (
              currentTab ? (
                currentTab.type === 'data-browser' ? (
                  <TableDataBrowser
                    connectionId={currentTab.connectionId!}
                    database={currentTab.database!}
                    tableName={currentTab.tableName!}
                  />
                ) : (
                  <div className="h-full flex flex-col">
                    {/* 查询工具栏 - 仅在查询类型tab中显示 */}
                    {currentTab.type === 'query' && (
                      <QueryToolbar
                        selectedConnectionId={activeConnectionId}
                        selectedDatabase={selectedDatabase}
                        selectedTimeRange={selectedTimeRange}
                        onConnectionChange={(connectionId) => {
                          setActiveConnection(connectionId);
                          setSelectedDatabase('');
                        }}
                        onDatabaseChange={setSelectedDatabase}
                        onTimeRangeChange={setSelectedTimeRange}
                        onExecuteQuery={executeQuery}
                        onSaveQuery={saveCurrentTab}
                        onFormatSQL={handleFormatSQL}
                        loading={loading}
                        disabled={false}
                      />
                    )}

                    <div className="flex-1">
                      <EditorManager
                        currentTab={currentTab}
                        selectedDatabase={selectedDatabase}
                        databases={databases}
                        onContentChange={(content) => handleTabContentChange(currentTab.id, content)}
                        onExecuteQuery={executeQuery}
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className='h-full flex items-center justify-center text-muted-foreground border-0 shadow-none'>
                  <div className='text-center'>
                    <FileText className='w-12 h-12 mx-auto mb-4' />
                    <p className="mb-4">请选择一个标签页</p>
                    <Button
                      variant='default'
                      onClick={() => setActiveKey(tabs[tabs.length - 1].id)}
                      className='mt-2'
                    >
                      <FileText className='w-4 h-4 mr-2' />
                      打开最后一个标签页
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className='h-full flex items-center justify-center text-muted-foreground border-0 shadow-none'>
                <div className='text-center'>
                  <FileText className='w-12 h-12 mx-auto mb-4' />
                  <p className="mb-4">暂无打开的文件</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant='default'
                      onClick={() => createNewTab()}
                    >
                      <Plus className='w-4 h-4 mr-2' />
                      新建查询
                    </Button>
                    <Button
                      variant='outline'
                      onClick={openFile}
                    >
                      <FolderOpen className='w-4 h-4 mr-2' />
                      打开文件
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 数据导出对话框 */}
          <DataExportDialog
            open={showExportDialog}
            onClose={() => setShowExportDialog(false)}
            connections={connections}
            currentConnection={activeConnectionId || undefined}
            currentDatabase={selectedDatabase}
            query={currentTab?.content}
            onSuccess={result => {
              showMessage.success('数据导出成功');
              setShowExportDialog(false);
            }}
          />

          {/* 拖拽提示覆盖层 */}
          <SimpleDragOverlay active={dropZoneActive} />
        </div>
      </TooltipProvider>
    );
  }
);

TabEditorRefactored.displayName = 'TabEditorRefactored';

export default TabEditorRefactored;
