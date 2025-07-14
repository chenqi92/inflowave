import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Tabs, TabsContent, TabsList, TabsTrigger, Button, Space, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Dialog, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Popconfirm, Card, CardHeader, CardContent
} from '@/components/ui';
import { Save, PlayCircle, Database, Plus, X, Table, FolderOpen, MoreHorizontal, FileText, Download, Upload } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import DataExportDialog from '@/components/common/DataExportDialog';
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
  onBatchQueryResults?: (results: QueryResult[], queries: string[], executionTime: number) => void;
}

interface TabEditorRef {
  executeQueryWithContent: (query: string, database: string) => void;
}

const TabEditor = forwardRef<TabEditorRef, TabEditorProps>(({ onQueryResult, onBatchQueryResults }, ref) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const [activeKey, setActiveKey] = useState<string>('1');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databases, setDatabases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: '1',
      title: '查询-1',
      content: '-- 在此输入 InfluxQL 查询语句\nSELECT * FROM "measurement_name" LIMIT 10',
      type: 'query',
      modified: false}
  ]);
  const [closingTab, setClosingTab] = useState<EditorTab | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
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
      console.log('✅ 成功加载数据库列表:', dbList);
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0 && !selectedDatabase) {
        console.log('🔄 自动选择第一个数据库:', dbList[0]);
        setSelectedDatabase(dbList[0]);
      } else {
        console.log('⚠️ 数据库列表为空或已选择数据库:', { dbList, selectedDatabase });
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

  // 执行指定内容和数据库的查询
  const executeQueryWithContent = async (query: string, database: string) => {
    if (!activeConnectionId) {
      showMessage.warning('请先选择数据库连接');
      return;
    }

    // 创建新标签或更新当前标签
    const newTab: EditorTab = {
      id: Date.now().toString(),
      title: `表查询-${tabs.length + 1}`,
      content: query,
      type: 'query',
      modified: false
    };
    
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveKey(newTab.id);
    setSelectedDatabase(database);

    // 执行查询
    setLoading(true);
    try {
      console.log('🚀 执行表双击查询:', {
        connection_id: activeConnectionId,
        database: database,
        query: query.trim()
      });
      
      // 确保数据库名称不为空
      if (!database || database.trim() === '') {
        console.log('❌ 数据库名称为空:', { database });
        showMessage.error('数据库名称为空，无法执行查询');
        return;
      }
      
      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connection_id: activeConnectionId,
          database: database,
          query: query.trim()
        }
      });
      
      console.log('✅ 查询结果:', result);
      
      if (result) {
        onQueryResult?.(result);
        showMessage.success(`表查询执行成功，返回 ${result.data?.length || 0} 行数据`);
      }
    } catch (error) {
      console.error('查询执行失败:', error);
      const errorMessage = String(error).replace('Error: ', '');
      showMessage.error(`查询执行失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行查询
  const executeQuery = async () => {
    console.log('🎯 执行查询 - 开始检查条件');
    console.log('activeConnectionId:', activeConnectionId);
    console.log('selectedDatabase:', selectedDatabase);
    console.log('activeKey:', activeKey);
    console.log('tabs:', tabs);

    if (!activeConnectionId) {
      console.log('❌ 没有活跃连接');
      showMessage.warning('请先选择数据库连接。请在左侧连接列表中选择一个连接。');
      return;
    }

    if (!selectedDatabase) {
      console.log('❌ 没有选择数据库');
      showMessage.warning('请选择数据库。如果下拉列表为空，请检查连接状态。');
      return;
    }

    const currentTab = tabs.find(tab => tab.id === activeKey);
    console.log('当前标签:', currentTab);
    
    if (!currentTab) {
      console.log('❌ 找不到当前标签');
      showMessage.warning('找不到当前查询标签，请重新创建查询');
      return;
    }

    if (!currentTab.content.trim()) {
      console.log('❌ 查询内容为空');
      showMessage.warning('请输入查询语句');
      return;
    }

    console.log('✅ 所有条件满足，开始执行查询');
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const queryText = currentTab.content.trim();
      
      // 检查是否包含多条 SQL 语句（以分号分隔）
      const statements = queryText.split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      console.log('🔍 检测到查询语句数量:', statements.length);
      
      if (statements.length > 1) {
        // 执行多条查询
        console.log('🚀 执行批量查询:', {
          connection_id: activeConnectionId,
          database: selectedDatabase,
          queries: statements
        });
        
        // 确保数据库名称不为空
        if (!selectedDatabase || selectedDatabase.trim() === '') {
          console.log('❌ 数据库名称为空:', { selectedDatabase, databases });
          showMessage.error('数据库名称为空，请选择一个数据库');
          return;
        }
        
        const results = await safeTauriInvoke<QueryResult[]>('execute_batch_queries', {
          request: {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            queries: statements
          }
        });
        
        const executionTime = Date.now() - startTime;
        console.log('✅ 批量查询结果:', results);
        
        if (results && results.length > 0) {
          // 调用批量查询回调
          onBatchQueryResults?.(results, statements, executionTime);
          
          const totalRows = results.reduce((sum, result) => sum + (result.data?.length || 0), 0);
          showMessage.success(`批量查询执行成功，共执行 ${results.length} 条语句，返回 ${totalRows} 行数据`);
        } else {
          console.log('⚠️ 批量查询结果为空');
          showMessage.warning('批量查询执行完成，但没有返回数据');
        }
      } else {
        // 执行单条查询
        console.log('🚀 执行单条查询:', {
          connection_id: activeConnectionId,
          database: selectedDatabase,
          query: statements[0]
        });
        
        // 确保数据库名称不为空
        if (!selectedDatabase || selectedDatabase.trim() === '') {
          console.log('❌ 数据库名称为空:', { selectedDatabase, databases });
          showMessage.error('数据库名称为空，请选择一个数据库');
          return;
        }
        
        console.log('🔍 准备执行查询，参数检查:', {
          connection_id: activeConnectionId,
          database: selectedDatabase,
          query: statements[0],
          selectedDatabase_type: typeof selectedDatabase,
          selectedDatabase_length: selectedDatabase?.length
        });
        
        const result = await safeTauriInvoke<QueryResult>('execute_query', {
          request: {
            connection_id: activeConnectionId,
            database: selectedDatabase,
            query: statements[0]
          }
        });
        
        const executionTime = Date.now() - startTime;
        console.log('✅ 单条查询结果:', result);
        
        if (result) {
          onQueryResult?.(result);
          // 也调用批量查询回调，但只有一个结果
          onBatchQueryResults?.([result], statements, executionTime);
          showMessage.success(`查询执行成功，返回 ${result.data?.length || 0} 行数据`);
        } else {
          console.log('⚠️ 查询结果为空');
          showMessage.warning('查询执行完成，但没有返回数据');
        }
      }
    } catch (error) {
      console.error('查询执行失败:', error);
      const errorMessage = String(error).replace('Error: ', '');
      showMessage.error(`查询执行失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 打开文件
  const openFile = async () => {
    try {
      // 使用 Tauri 的文件对话框
      const result = await safeTauriInvoke('open_file_dialog', {
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result?.path) {
        // 读取文件内容
        const content = await safeTauriInvoke('read_file', { path: result.path });
        
        if (content) {
          // 创建新标签
          const filename = result.path.split('/').pop() || result.path.split('\\').pop() || '未命名';
          const newTab: EditorTab = {
            id: Date.now().toString(),
            title: filename,
            content: content,
            type: 'query',
            modified: false,
            filePath: result.path
          };
          
          setTabs([...tabs, newTab]);
          setActiveKey(newTab.id);
          showMessage.success(`文件 "${filename}" 已打开`);
        }
      }
    } catch (error) {
      console.error('打开文件失败:', error);
      showMessage.error(`打开文件失败: ${error}`);
    }
  };

  // 保存文件到指定路径
  const saveFileAs = async () => {
    const currentTab = tabs.find(tab => tab.id === activeKey);
    if (!currentTab || !editorRef.current) {
      showMessage.warning('没有要保存的内容');
      return;
    }

    try {
      const content = editorRef.current.getValue();
      const result = await safeTauriInvoke('save_file_dialog', {
        defaultPath: currentTab.filePath || `${currentTab.title}.sql`,
        filters: [
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (result?.path) {
        await safeTauriInvoke('write_file', { 
          path: result.path, 
          content: content 
        });
        
        const filename = result.path.split('/').pop() || result.path.split('\\').pop() || '未命名';
        updateTabContent(activeKey, content, false);
        
        // 更新标签标题和文件路径
        setTabs(tabs.map(tab => 
          tab.id === activeKey 
            ? { ...tab, title: filename, filePath: result.path, modified: false }
            : tab
        ));
        
        showMessage.success(`文件已保存到 "${result.path}"`);
      }
    } catch (error) {
      console.error('保存文件失败:', error);
      showMessage.error(`保存文件失败: ${error}`);
    }
  };

  // 导入数据
  const importData = async () => {
    try {
      const result = await safeTauriInvoke('open_file_dialog', {
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'SQL Files', extensions: ['sql'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result?.path) {
        setShowImportDialog(true);
        showMessage.info('导入数据功能正在开发中...');
      }
    } catch (error) {
      console.error('选择导入文件失败:', error);
      showMessage.error(`选择导入文件失败: ${error}`);
    }
  };

  // 导出数据
  const exportData = () => {
    if (!activeConnectionId || !selectedDatabase) {
      showMessage.warning('请先选择数据库连接');
      return;
    }
    setShowExportDialog(true);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    executeQueryWithContent
  }), [executeQueryWithContent]);

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
  const saveCurrentTab = async () => {
    const currentTab = tabs.find(tab => tab.id === activeKey);
    if (!currentTab || !editorRef.current) {
      showMessage.warning('没有要保存的内容');
      return;
    }

    const content = editorRef.current.getValue();
    
    // 如果已有文件路径，直接保存
    if (currentTab.filePath) {
      try {
        await safeTauriInvoke('write_file', { 
          path: currentTab.filePath, 
          content: content 
        });
        updateTabContent(activeKey, content, false);
        showMessage.success(`文件已保存`);
      } catch (error) {
        console.error('保存文件失败:', error);
        showMessage.error(`保存文件失败: ${error}`);
      }
    } else {
      // 没有文件路径，调用另存为
      saveFileAs();
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
      <Card className="h-full flex flex-col bg-white border-0 shadow-none">
      {/* 优化后的标签页头部 - 防止被挤压 */}
      <CardHeader className="flex items-center justify-between border-b border min-h-[48px] p-0">
        {/* 左侧标签区域 - 支持滚动 */}
        <div className="flex-1 flex items-center min-w-0">
          <div className="flex items-center border-b border flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-1 px-3 py-2 border-r border cursor-pointer hover:bg-muted/50 flex-shrink-0 min-w-[120px] max-w-[180px] ${
                  activeKey === tab.id ? 'bg-white border-b-2 border-blue-500' : 'bg-muted/50'
                }`}
                onClick={() => setActiveKey(tab.id)}
              >
                {tab.type === 'query' && <FileText className="w-4 h-4 flex-shrink-0" />}
                {tab.type === 'table' && <Table className="w-4 h-4 flex-shrink-0" />}
                {tab.type === 'database' && <Database className="w-4 h-4 flex-shrink-0" />}
                <span className="text-sm truncate flex-1">{tab.title}</span>
                {tab.modified && <span className="text-orange-500 text-xs flex-shrink-0">*</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-1 p-0 h-4 w-4 flex-shrink-0 opacity-60 hover:opacity-100"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 flex-shrink-0"
                  title="新建"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => createNewTab('query')}>
                  <FileText className="w-4 h-4 mr-2" />
                  SQL 查询
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createNewTab('table')}>
                  <Table className="w-4 h-4 mr-2" />
                  表设计器
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => createNewTab('database')}>
                  <Database className="w-4 h-4 mr-2" />
                  数据库设计器
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 右侧工具栏 - 统一尺寸，防止被挤压 */}
        <div className="flex items-center gap-2 px-3 flex-shrink-0">
          <Select
            value={selectedDatabase}
            onValueChange={setSelectedDatabase}
            disabled={!activeConnectionId || databases.length === 0}
          >
            <SelectTrigger className="w-[140px] h-10">
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

          <Button
            size="sm"
            onClick={executeQuery}
            disabled={loading || !activeConnectionId || !selectedDatabase}
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
            title="执行查询 (Ctrl+Enter)"
          >
            <PlayCircle className="w-4 h-4" />
            <span className="text-xs">{loading ? '执行中' : '执行'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={saveCurrentTab}
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
            title="保存查询 (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            <span className="text-xs">保存</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openFile}
            className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
            title="打开文件"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="text-xs">打开</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-14 p-1 flex flex-col items-center justify-center gap-1"
                title="更多操作"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="text-xs">更多</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={saveFileAs}>
                <Save className="w-4 h-4 mr-2" />
                另存为
              </DropdownMenuItem>
              <DropdownMenuItem onClick={importData}>
                <Upload className="w-4 h-4 mr-2" />
                导入数据
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportData}>
                <Download className="w-4 h-4 mr-2" />
                导出数据
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* 编辑器内容 */}
      <CardContent className="flex-1 p-0">
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
          <Card className="h-full flex items-center justify-center text-muted-foreground border-0 shadow-none">
            <CardContent className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <p>暂无打开的文件</p>
              <Button
                variant="default"
                onClick={() => createNewTab()}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建查询
              </Button>
            </CardContent>
          </Card>
        )}
      </CardContent>

      {/* 关闭标签确认对话框 */}
      {closingTab && (
        <Popconfirm
          title="保存更改"
          description={`"${closingTab.title}" 已修改，是否保存更改？`}
          open={!!closingTab}
          onConfirm={saveAndCloseTab}
          onOpenChange={(open) => { if (!open) closeTabWithoutSaving(); }}
          okText="保存"
          cancelText="不保存"
        >
          <div />
        </Popconfirm>
      )}

      {/* 数据导出对话框 */}
      <DataExportDialog
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        connections={connections}
        currentConnection={activeConnectionId}
        currentDatabase={selectedDatabase}
        query={currentTab?.content}
        onSuccess={(result) => {
          showMessage.success('数据导出成功');
          setShowExportDialog(false);
        }}
      />
      </Card>
    </TooltipProvider>
  );
});

TabEditor.displayName = 'TabEditor';

export default TabEditor;