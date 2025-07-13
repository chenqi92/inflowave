import React, { useState, useRef, useEffect } from 'react';
import {
  Tabs, TabsContent, TabsList, TabsTrigger, Button, Space, Dropdown,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Dialog, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Popconfirm
} from '@/components/ui';
import { Save, PlayCircle, Database, Plus, X, Table, FolderOpen, MoreHorizontal, FileText } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult, QueryRequest } from '@/types';

interface MenuProps {
  items?: Array<{
    key: string;
    label: React.ReactNode;
    icon?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }>;
}

interface EditorTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database';
  modified: boolean;
  filePath?: string;
}

interface TabEditorProps {
  onQueryResult?: (result: QueryResult) => void;
}

const TabEditor: React.FC<TabEditorProps> = ({ onQueryResult }) => {
  const { activeConnectionId } = useConnectionStore();
  const [activeKey, setActiveKey] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: '1',
      title: '查询-1',
      content: 'SELECT * FROM measurement_name LIMIT 10',
      type: 'query',
      modified: false}
  ]);
  const [closingTab, setClosingTab] = useState<EditorTab | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    try {
      // 首先验证连接是否在后端存在
      const backendConnections = await safeTauriInvoke<any[]>('get_connections');
      const backendConnection = backendConnections?.find((c: any) => c.id === activeConnectionId);
      
      if (!backendConnection) {
        console.warn(`⚠️ 连接 ${activeConnectionId} 在后端不存在，跳过加载数据库列表`);
        showMessage.warning('连接不存在，请重新选择连接');
        return;
      }

      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId});
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      
      // 如果是连接不存在的错误，显示更友好的消息
      const errorStr = String(error);
      if (errorStr.includes('连接') && errorStr.includes('不存在')) {
        showMessage.error(`连接不存在，请检查连接配置: ${activeConnectionId}`);
      } else {
        showMessage.error(`加载数据库列表失败: ${error}`);
      }
    }
  };

  // 执行查询
  const executeQuery = async () => {
    if (!activeConnectionId) {
      showMessage.warning('请先选择数据库连接');
      return;
    }

    if (!selectedDatabase) {
      showMessage.warning('请选择数据库');
      return;
    }

    const currentTab = tabs.find(tab => tab.id === activeKey);
    if (!currentTab || !currentTab.content.trim()) {
      showMessage.warning('请输入查询语句');
      return;
    }

    setLoading(true);
    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: currentTab.content.trim()};

      console.log('🚀 执行查询:', request);
      const result = await safeTauriInvoke<QueryResult>('execute_query', { request });
      console.log('✅ 查询结果:', result);
      
      if (result) {
        onQueryResult?.(result);
        showMessage.success('查询执行成功');
      }
    } catch (error) {
      console.error('查询执行失败:', error);
      showMessage.error(`查询执行失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时加载数据库列表
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    } else {
      setDatabases([]);
      setSelectedDatabase('');
    }
  }, [activeConnectionId]);

  // 创建新标签
  const createNewTab = (type: 'query' | 'table' | 'database' = 'query') => {
    const newTab: EditorTab = {
      id: Date.now().toString(),
      title: `${type === 'query' ? '查询' : type === 'table' ? '表' : '数据库'}-${tabs.length + 1}`,
      content: type === 'query' ? 'SELECT * FROM ' : '',
      type,
      modified: false};
    
    setTabs([...tabs, newTab]);
    setActiveKey(newTab.id);
  };

  // 关闭标签
  const closeTab = (targetKey: string) => {
    const tab = tabs.find(t => t.id === targetKey);

    if (tab?.modified) {
      setClosingTab(tab);
    } else {
      removeTab(targetKey);
    }
  };

  // 保存并关闭标签
  const saveAndCloseTab = () => {
    if (closingTab) {
      // 保存逻辑
      removeTab(closingTab.id);
      setClosingTab(null);
    }
  };

  // 不保存直接关闭标签
  const closeTabWithoutSaving = () => {
    if (closingTab) {
      removeTab(closingTab.id);
      setClosingTab(null);
    }
  };

  const removeTab = (targetKey: string) => {
    const newTabs = tabs.filter(tab => tab.id !== targetKey);
    setTabs(newTabs);
    
    if (activeKey === targetKey) {
      const newActiveKey = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : '';
      setActiveKey(newActiveKey);
    }
  };

  // 保存当前标签
  const saveCurrentTab = () => {
    const currentTab = tabs.find(tab => tab.id === activeKey);
    if (currentTab && editorRef.current) {
      const content = editorRef.current.getValue();
      updateTabContent(activeKey, content, false);
    }
  };

  // 更新标签内容
  const updateTabContent = (tabId: string, content: string, modified: boolean = true) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, content, modified }
        : tab
    ));
  };

  // 编辑器内容改变
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeKey) {
      updateTabContent(activeKey, value);
    }
  };

  // 编辑器挂载
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // 设置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true});

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // 执行查询
      executeQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveCurrentTab();
    });
  };

  // 标签页右键菜单
  const getTabContextMenu = (tab: EditorTab): MenuProps['items'] => [
    {
      key: 'save',
      label: '保存',
      icon: <Save className="w-4 h-4" />},
    {
      key: 'save-as',
      label: '另存为',
      icon: <Save className="w-4 h-4" />},
    { type: 'divider' },
    {
      key: 'close',
      label: '关闭',
      icon: <X className="w-4 h-4"  />},
    {
      key: 'close-others',
      label: '关闭其他'},
    {
      key: 'close-all',
      label: '关闭全部'},
  ];

  // 新建菜单
  const newTabMenuItems: MenuProps['items'] = [
    {
      key: 'new-query',
      label: 'SQL 查询',
      icon: <FileText className="w-4 h-4"  />,
      onClick: () => createNewTab('query')},
    {
      key: 'new-table',
      label: '表设计器',
      icon: <Table className="w-4 h-4"  />,
      onClick: () => createNewTab('table')},
    {
      key: 'new-database',
      label: '数据库设计器',
      icon: <Database className="w-4 h-4"  />,
      onClick: () => createNewTab('database')},
  ];

  const currentTab = tabs.find(tab => tab.id === activeKey);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-white">
      {/* 标签页头部 */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex-1 flex items-center">
          <div className="flex items-center border-b border-gray-200 flex-1">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-1 px-3 py-2 border-r border-gray-200 cursor-pointer hover:bg-gray-50 ${
                  activeKey === tab.id ? 'bg-white border-b-2 border-blue-500' : 'bg-gray-50'
                }`}
                onClick={() => setActiveKey(tab.id)}
              >
                {tab.type === 'query' && <FileText className="w-4 h-4" />}
                {tab.type === 'table' && <Table className="w-4 h-4" />}
                {tab.type === 'database' && <Database className="w-4 h-4" />}
                <span className="text-sm">{tab.title}</span>
                {tab.modified && <span className="text-orange-500 text-xs">*</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-1 p-0 h-4 w-4"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={createNewTab}
              className="ml-2"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 工具栏 */}
        <div className="flex gap-2 px-3" size="small" >
          <Select
            value={selectedDatabase}
            onValueChange={setSelectedDatabase}
            disabled={!activeConnectionId || databases.length === 0}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="选择数据库" />
            </SelectTrigger>
            <SelectContent>
              {databases.map(db => (
                <SelectItem key={db} value={db}>
                  {db}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={executeQuery}
                disabled={loading || !activeConnectionId || !selectedDatabase}
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                {loading ? '执行中...' : '执行'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>执行 (Ctrl+Enter)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={saveCurrentTab}
              >
                <Save className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>保存 (Ctrl+S)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>打开文件</TooltipContent>
          </Tooltip>
          <Button
            variant="outline"
            size="sm"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1">
        {currentTab ? (
          <Editor
            height="100%"
            language="sql"
            theme="vs-light"
            value={currentTab.content}
            onValueChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'},
              wordWrap: 'on',
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true}}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileText className="w-4 h-4 text-4xl mb-4"   />
              <p>暂无打开的文件</p>
              <Button 
                type="primary" 
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => createNewTab()}
                className="mt-2"
              >
                新建查询
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 关闭标签确认对话框 */}
      {closingTab && (
        <Popconfirm
          title="保存更改"
          description={`"${closingTab.title}" 已修改，是否保存更改？`}
          open={!!closingTab}
          onConfirm={saveAndCloseTab}
          onOpenChange={(open) => !open && (closeTabWithoutSaving)()}
          okText="保存"
          cancelText="不保存"
        >
          <div />
        </Popconfirm>
      )}
      </div>
    </TooltipProvider>
  );
};

export default TabEditor;