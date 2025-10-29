﻿import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FileText, Plus, FolderOpen } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { formatSQL } from '@/utils/sqlFormatter';
import type { DatabaseType } from '@/utils/sqlFormatter';
import type { TimeRange } from '@/components/common/TimeRangeSelector';

// 导入拆分的模块
import { TabManager, EditorTab } from '@/components/editor/TabManager';
import { EditorManager, type EditorManagerRef } from '@/components/editor/EditorManager';
import { useQueryExecutor } from '@/components/editor/QueryExecutor';
import { useFileOperations } from '@/components/editor/FileOperations';
import { useTabStore, useCurrentTab, useTabOperations } from '@/stores/tabStore';
import { QueryToolbar } from '@/components/query/QueryToolbar';
import DataExportDialog from '@/components/common/DataExportDialog';
import TableDataBrowser from '@/components/query/TableDataBrowser';


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



    // 🔧 使用ref存储当前Tab ID，避免闭包问题
    const currentTabIdRef = React.useRef<string | null>(null);

    // 🔧 立即同步更新 currentTabIdRef，不等待 useEffect
    // 这样可以确保在 EditorManager 同步内容之前，currentTabIdRef 已经是最新的
    if (activeKey && currentTabIdRef.current !== activeKey) {
      console.log(`🔄 Tab切换（同步）: ${currentTabIdRef.current} -> ${activeKey}`);
      currentTabIdRef.current = activeKey;
    }

    // 🔧 打印调试信息（在 useEffect 中，避免在每次渲染时都打印）
    React.useEffect(() => {
      if (activeKey) {
        // 🔧 打印所有Tab的内容，用于调试
        console.log(`📋 当前所有Tab的内容:`);
        tabs.forEach((tab, index) => {
          if (tab.type === 'query') {
            console.log(`  Tab ${index + 1}: ${tab.title} (${tab.id})`);
            console.log(`    内容: ${tab.content?.substring(0, 100) || '(空)'}`);
          }
        });

        // 🔧 打印当前Tab的详细信息
        const currentTab = tabs.find(t => t.id === activeKey);
        if (currentTab) {
          console.log(`✅ 当前激活的Tab:`, {
            id: currentTab.id,
            title: currentTab.title,
            type: currentTab.type,
            content: currentTab.content?.substring(0, 100),
          });
        }
      }
    }, [activeKey, tabs]);

    // 更新标签页内容的包装函数
    const handleTabContentChange = useCallback((tabId: string, content: string) => {
      console.log(`📝 handleTabContentChange 被调用: tabId=${tabId}, currentTabIdRef=${currentTabIdRef.current}, activeKey=${activeKey}`);

      // 🔧 验证：只更新当前激活的Tab
      if (tabId !== currentTabIdRef.current) {
        console.warn(`⚠️ 警告：尝试更新非当前Tab的内容！tabId=${tabId}, currentTabId=${currentTabIdRef.current}`);
        console.warn(`⚠️ 这可能是闭包问题导致的！`);
        // 🔧 使用正确的Tab ID
        updateTabContent(currentTabIdRef.current!, content);
      } else {
        updateTabContent(tabId, content);
      }
    }, [updateTabContent, activeKey]);

    // 编辑器引用，用于获取选中的文本
    const editorManagerRef = React.useRef<EditorManagerRef>(null);

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
      getSelectedText: () => editorManagerRef.current?.getSelectedText() || null,
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
          // 确保databaseType不是null,如果是null则使用undefined
          const formattedSQL = formatSQL(currentContent, databaseType || undefined);

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
        // 使用当前活动的连接ID,将null转换为undefined
        createQueryTab(selectedDatabase, undefined, activeConnectionId || undefined);
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
        <div className='h-full flex flex-col bg-background'>
          {/* 标签页头部 - 凹陷效果 */}
          <div className='flex items-center justify-between border-b border min-h-[36px] p-0 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] bg-muted/30'>
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
              />
            </div>

            {/* 右侧简化区域 */}
            <div className='flex items-center gap-2 px-3 flex-shrink-0'>
              {/* 查询相关功能已移至查询tab内部的工具栏 */}
            </div>
          </div>

          {/* 编辑器内容 */}
          <div className='flex-1 min-h-0'>
            {tabs.length > 0 ? (
              currentTab ? (
                currentTab.type === 'data-browser' ? (
                  <TableDataBrowser
                    connectionId={currentTab.connectionId!}
                    database={currentTab.database!}
                    tableName={currentTab.tableName!}
                  />
                ) : (
                  <div className="h-full flex flex-col overflow-hidden">
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

                    <div className="flex-1 min-h-0 overflow-hidden">
                      <EditorManager
                        ref={editorManagerRef}
                        currentTab={currentTab}
                        selectedDatabase={selectedDatabase}
                        databases={databases}
                        onContentChange={(content) => {
                          // 🔧 使用ref中的当前Tab ID，避免闭包问题
                          const tabId = currentTabIdRef.current || currentTab.id;
                          console.log(`📝 EditorManager onContentChange: tabId=${tabId}, currentTab.id=${currentTab.id}`);
                          handleTabContentChange(tabId, content);
                        }}
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
        </div>
      </TooltipProvider>
    );
  }
);

TabEditorRefactored.displayName = 'TabEditorRefactored';

export default TabEditorRefactored;
