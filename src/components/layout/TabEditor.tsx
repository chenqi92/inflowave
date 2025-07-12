import React, { useState, useRef, useEffect } from 'react';
import { Tabs, Button, Space, Dropdown, Tooltip, Modal, Select } from 'antd';
import type { MenuProps } from 'antd';
import { 
  PlusOutlined, 
  CloseOutlined,
  SaveOutlined,
  FolderOpenOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  FileTextOutlined,
  DatabaseOutlined,
  TableOutlined
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult, QueryRequest } from '@/types';

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
      modified: false,
    }
  ]);
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
        connectionId: activeConnectionId,
      });
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
        query: currentTab.content.trim(),
      };

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
      modified: false,
    };
    
    setTabs([...tabs, newTab]);
    setActiveKey(newTab.id);
  };

  // 关闭标签
  const closeTab = (targetKey: string) => {
    const tab = tabs.find(t => t.id === targetKey);
    
    if (tab?.modified) {
      Modal.confirm({
        title: '保存更改',
        content: `"${tab.title}" 已修改，是否保存更改？`,
        okText: '保存',
        cancelText: '不保存',
        onOk: () => {
          // 保存逻辑
          removeTab(targetKey);
        },
        onCancel: () => {
          removeTab(targetKey);
        },
      });
    } else {
      removeTab(targetKey);
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
      automaticLayout: true,
    });

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
      icon: <SaveOutlined />,
    },
    {
      key: 'save-as',
      label: '另存为',
      icon: <SaveOutlined />,
    },
    { type: 'divider' },
    {
      key: 'close',
      label: '关闭',
      icon: <CloseOutlined />,
    },
    {
      key: 'close-others',
      label: '关闭其他',
    },
    {
      key: 'close-all',
      label: '关闭全部',
    },
  ];

  // 新建菜单
  const newTabMenuItems: MenuProps['items'] = [
    {
      key: 'new-query',
      label: 'SQL 查询',
      icon: <FileTextOutlined />,
      onClick: () => createNewTab('query'),
    },
    {
      key: 'new-table',
      label: '表设计器',
      icon: <TableOutlined />,
      onClick: () => createNewTab('table'),
    },
    {
      key: 'new-database',
      label: '数据库设计器',
      icon: <DatabaseOutlined />,
      onClick: () => createNewTab('database'),
    },
  ];

  const currentTab = tabs.find(tab => tab.id === activeKey);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 标签页头部 */}
      <div className="flex items-center justify-between border-b border-gray-200">
        <div className="flex-1">
          <Tabs
            type="editable-card"
            activeKey={activeKey}
            onChange={setActiveKey}
            onEdit={(targetKey, action) => {
              if (action === 'add') {
                createNewTab();
              } else if (action === 'remove') {
                closeTab(targetKey as string);
              }
            }}
            addIcon={
              <Dropdown menu={{ items: newTabMenuItems }} placement="bottomLeft">
                <Button type="text" icon={<PlusOutlined />} size="small" />
              </Dropdown>
            }
            items={tabs.map(tab => ({
              key: tab.id,
              label: (
                <Dropdown
                  menu={{ items: getTabContextMenu(tab) }}
                  trigger={['contextMenu']}
                >
                  <span className="flex items-center gap-1">
                    {tab.type === 'query' && <FileTextOutlined />}
                    {tab.type === 'table' && <TableOutlined />}
                    {tab.type === 'database' && <DatabaseOutlined />}
                    {tab.title}
                    {tab.modified && <span className="text-orange-500">*</span>}
                  </span>
                </Dropdown>
              ),
              children: null, // 内容在下面单独渲染
            }))}
            size="small"
            className="editor-tabs"
          />
        </div>

        {/* 工具栏 */}
        <Space size="small" className="px-3">
          <Select
            value={selectedDatabase}
            onChange={setSelectedDatabase}
            placeholder="选择数据库"
            style={{ minWidth: 150 }}
            size="small"
            disabled={!activeConnectionId || databases.length === 0}
          >
            {databases.map(db => (
              <Select.Option key={db} value={db}>
                {db}
              </Select.Option>
            ))}
          </Select>
          <Tooltip title="执行 (Ctrl+Enter)">
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              size="small"
              onClick={executeQuery}
              loading={loading}
              disabled={!activeConnectionId || !selectedDatabase}
            >
              执行
            </Button>
          </Tooltip>
          <Tooltip title="保存 (Ctrl+S)">
            <Button 
              icon={<SaveOutlined />} 
              size="small"
              onClick={saveCurrentTab}
            />
          </Tooltip>
          <Tooltip title="打开文件">
            <Button 
              icon={<FolderOpenOutlined />} 
              size="small"
            />
          </Tooltip>
          <Dropdown menu={{ items: [] }}>
            <Button 
              icon={<MoreOutlined />} 
              size="small"
            />
          </Dropdown>
        </Space>
      </div>

      {/* 编辑器内容 */}
      <div className="flex-1">
        {currentTab ? (
          <Editor
            height="100%"
            language="sql"
            theme="vs-light"
            value={currentTab.content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
              },
              wordWrap: 'on',
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileTextOutlined className="text-4xl mb-4" />
              <p>暂无打开的文件</p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => createNewTab()}
                className="mt-2"
              >
                新建查询
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabEditor;