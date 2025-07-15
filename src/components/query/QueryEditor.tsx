import React, { useState, useRef, useCallback } from 'react';
import { Button, Select, Typography, Dropdown, Switch, Tabs, Space, Tooltip, Label } from '@/components/ui';
// TODO: Replace these Ant Design components: Badge, Drawer
import { useToast } from '@/hooks/use-toast';

import { Save, Database, History, Settings, Maximize, Minimize, Plus, X, Copy, Edit, PlayCircle, Paintbrush } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { QueryResult, QueryRequest } from '@/types';

// Fix for invoke function
const invoke = safeTauriInvoke;

const { Text } = Typography;
const { Option } = Select;

interface QueryEditorProps {
  selectedDatabase: string;
  onDatabaseChange: (database: string) => void;
  databases: string[];
  onQueryResult?: (result: QueryResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}

interface QueryTab {
  id: string;
  name: string;
  query: string;
  database?: string;
  lastExecuted?: Date;
  isModified: boolean;
}

const QueryEditor: React.FC<QueryEditorProps> = ({
  selectedDatabase,
  onDatabaseChange,
  databases,
  onQueryResult,
  onLoadingChange}) => {
  const { activeConnectionId } = useConnectionStore();
  const { resolvedTheme } = useTheme();
  const [queryTabs, setQueryTabs] = useState<QueryTab[]>([
    {
      id: 'default',
      name: '查询 1',
      query: 'SELECT * FROM measurement_name LIMIT 10',
      database: selectedDatabase,
      isModified: false}
  ]);
  const [activeTabId, setActiveTabId] = useState('default');
  const [loading, setLoading] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 初始化编辑器
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);

    // 设置编辑器选项
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      theme: resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light',
      suggestOnTriggerCharacters: true,
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false
      },
      parameterHints: { enabled: true },
      acceptSuggestionOnEnter: 'on',
      acceptSuggestionOnCommitCharacter: true,
      tabCompletion: 'on',
      wordBasedSuggestions: true
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveQuery();
    });

    // 注册 InfluxQL 语言支持
    registerInfluxQLLanguage();
  };

  // 获取当前活动标签页
  const getCurrentTab = useCallback(() => {
    return queryTabs.find(tab => tab.id === activeTabId);
  }, [queryTabs, activeTabId]);

  // 更新当前标签页的查询内容
  const updateCurrentTabQuery = useCallback((query: string) => {
    setQueryTabs(tabs => tabs.map(tab => 
      tab.id === activeTabId 
        ? { ...tab, query, isModified: true }
        : tab
    ));
  }, [activeTabId]);


  // 添加新标签页
  const addNewTab = () => {
    const newTab: QueryTab = {
      id: `tab_${Date.now()}`,
      name: `查询 ${queryTabs.length + 1}`,
      query: 'SELECT * FROM measurement_name LIMIT 10',
      database: selectedDatabase,
      isModified: false};
    setQueryTabs([...queryTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // 关闭标签页
  const closeTab = (tabId: string) => {
    if (queryTabs.length === 1) return; // 至少保留一个标签页
    
    const tabIndex = queryTabs.findIndex(tab => tab.id === tabId);
    const newTabs = queryTabs.filter(tab => tab.id !== tabId);
    setQueryTabs(newTabs);
    
    if (activeTabId === tabId) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  // 复制标签页
  const duplicateTab = (tabId: string) => {
    const tab = queryTabs.find(t => t.id === tabId);
    if (!tab) return;
    
    const newTab: QueryTab = {
      ...tab,
      id: `tab_${Date.now()}`,
      name: `${tab.name} (副本)`,
      isModified: false};
    setQueryTabs([...queryTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // 重命名标签页
  const renameTab = (tabId: string, newName: string) => {
    setQueryTabs(tabs => tabs.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  // 注册 InfluxQL 语言
  const registerInfluxQLLanguage = () => {
    // 简化的 InfluxQL 语言定义
    monaco.languages.register({ id: 'influxql' });

    monaco.languages.setMonarchTokensProvider('influxql', {
      tokenizer: {
        root: [
          [/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|INTO|VALUES|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|SHOW|DESCRIBE)\b/i, 'keyword'],
          [/\b(AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|TRUE|FALSE)\b/i, 'keyword'],
          [/\b(COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|MEAN|MEDIAN|MODE|STDDEV|SPREAD|PERCENTILE)\b/i, 'function'],
          [/\b(TIME|NOW|AGO|DURATION|FILL|SLIMIT|SOFFSET)\b/i, 'keyword'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/\d+(\.\d+)?/, 'number'],
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          [/[{}()[\]]/, '@brackets'],
          [/[<>]=?|[!=]=|<>/, 'operator'],
          [/[+\-*/=]/, 'operator'],
          [/[,;]/, 'delimiter'],
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ]}});

    // 设置自动补全
    monaco.languages.registerCompletionItemProvider('influxql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn};

        const lineText = model.getLineContent(position.lineNumber);
        const wordBeforeCursor = lineText.substring(0, position.column - 1);
        
        const suggestions: monaco.languages.CompletionItem[] = [
          // SQL关键字
          ...['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'INTO', 'VALUES', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'SHOW', 'DESCRIBE'].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            documentation: `SQL关键字: ${keyword}`
          })),
          
          // 逻辑操作符
          ...['AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'TRUE', 'FALSE'].map(op => ({
            label: op,
            kind: monaco.languages.CompletionItemKind.Operator,
            insertText: op,
            range,
            documentation: `逻辑操作符: ${op}`
          })),
          
          // 聚合函数
          ...['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST', 'MEAN', 'MEDIAN', 'MODE', 'STDDEV', 'SPREAD', 'PERCENTILE'].map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}($1)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: `聚合函数: ${func}(field)`
          })),
          
          // 时间函数
          ...['NOW', 'TIME', 'AGO', 'DURATION', 'FILL'].map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: func,
            range,
            documentation: `时间函数: ${func}`
          })),
          
          // 数据库
          ...databases.map(db => ({
            label: db,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: `"${db}"`,
            range,
            documentation: `数据库: ${db}`
          })),
          
          // 常用查询模板
          {
            label: 'SELECT template',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'SELECT ${1:*} FROM ${2:measurement} WHERE ${3:condition}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: 'SELECT查询模板'
          },
          {
            label: 'Time range query',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'SELECT ${1:*} FROM ${2:measurement} WHERE time >= now() - ${3:1h}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: '时间范围查询模板'
          },
          {
            label: 'Aggregation query',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'SELECT ${1:MEAN}(${2:field}) FROM ${3:measurement} WHERE time >= now() - ${4:1h} GROUP BY time(${5:5m})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            documentation: '聚合查询模板'
          }
        ];

        return { suggestions };
      }});
  };

  // 执行查询
  const handleExecuteQuery = async () => {
    const currentTab = getCurrentTab();
    if (!currentTab?.query.trim()) {
      toast({ title: "警告", description: "请输入查询语句" });
      return;
    }

    if (!selectedDatabase) {
      toast({ title: "警告", description: "请选择数据库" });
      return;
    }

    if (!activeConnectionId) {
      toast({ title: "警告", description: "请先连接到数据库" });
      return;
    }

    // 检查是否有选中的内容
    let queryToExecute = currentTab.query.trim();
    if (editorInstance) {
      const selection = editorInstance.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editorInstance.getModel()?.getValueInRange(selection);
        if (selectedText && selectedText.trim()) {
          queryToExecute = selectedText.trim();
        }
      }
    }

    setLoading(true);
    onLoadingChange?.(true);
    const startTime = Date.now();

    try {
      const result = await invoke<QueryResult>('execute_query', {
        connection_id: activeConnectionId,
        database: selectedDatabase,
        query: queryToExecute
      });
      const executionTime = Date.now() - startTime;
      
      setLastExecutionTime(executionTime);
      onQueryResult?.(result);
      
      // 更新标签页的最后执行时间
      setQueryTabs(tabs => tabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, lastExecuted: new Date(), isModified: false }
          : tab
      ));
      
      toast({ title: "成功", description: `查询完成，返回 ${result.rowCount} 行数据，耗时 ${executionTime}ms` });
    } catch (error) {
      toast({ title: "错误", description: `查询执行失败: ${error}`, variant: "destructive" });
      console.error('Query error:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // 保存查询
  const handleSaveQuery = async () => {
    const currentTab = getCurrentTab();
    if (!currentTab?.query.trim()) {
      toast({ title: "警告", description: "请输入查询语句" });
      return;
    }

    try {
      const savedQuery = {
        id: `query_${Date.now()}`,
        name: currentTab.name,
        query: currentTab.query.trim(),
        database: selectedDatabase,
        tags: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date()};

      await safeTauriInvoke('save_query', { query: savedQuery });
      toast({ title: "成功", description: "查询已保存" });
    } catch (error) {
      toast({ title: "错误", description: "保存查询失败: ${error}", variant: "destructive" });
    }
  };

  // 格式化查询
  const handleFormatQuery = () => {
    if (editorInstance) {
      editorInstance.getAction('editor.action.formatDocument')?.run();
    }
  };

  // 预设查询模板
  const queryTemplates = [
    {
      label: '查询所有数据',
      value: 'SELECT * FROM measurement_name LIMIT 10'},
    {
      label: '按时间范围查询',
      value: 'SELECT * FROM measurement_name WHERE time >= now() - 1h'},
    {
      label: '聚合查询',
      value: 'SELECT MEAN(field_name) FROM measurement_name WHERE time >= now() - 1h GROUP BY time(5m)'},
    {
      label: '显示测量',
      value: 'SHOW MEASUREMENTS'},
    {
      label: '显示字段',
      value: 'SHOW FIELD KEYS FROM measurement_name'},
    {
      label: '显示标签',
      value: 'SHOW TAG KEYS FROM measurement_name'},
  ];

  // 处理模板选择
  const handleTemplateSelect = (template: string) => {
    updateCurrentTabQuery(template);
  };

  // 当前标签页
  const currentTab = getCurrentTab();

  // 渲染标签页
  const renderTabs = () => {
    const tabItems = queryTabs.map(tab => ({
      key: tab.id,
      label: (
        <div className="flex items-center gap-1">
          <span>{tab.name}</span>
          {tab.isModified && <div className="w-1 h-1 bg-primary rounded-full" />}
          {queryTabs.length > 1 && (
            <Button
              type="text"
              size="small"
              icon={<X className="w-4 h-4"  />}
              className="ml-1 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
            />
          )}
        </div>
      ),
      children: null}));

    return (
      <Tabs
        type="editable-add"
        value={activeTabId}
        items={tabItems}
        onValueChange={setActiveTabId}
        onEdit={(targetKey, action) => {
          if (action === 'add') {
            addNewTab();
          }
        }}
        tabBarExtraContent={
          <div className="flex gap-2">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'duplicate',
                    label: '复制标签页',
                    icon: <Copy className="w-4 h-4"  />,
                    onClick: () => duplicateTab(activeTabId)},
                  {
                    key: 'rename',
                    label: '重命名',
                    icon: <Edit className="w-4 h-4"  />,
                    onClick: () => {
                      const newName = prompt('请输入新名称', currentTab?.name);
                      if (newName && newName.trim()) {
                        renameTab(activeTabId, newName.trim());
                      }
                    }},
                  { type: 'divider' },
                  {
                    key: 'close-others',
                    label: '关闭其他标签页',
                    onClick: () => {
                      setQueryTabs([currentTab!]);
                    }},
                ]}}
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<Settings className="w-4 h-4"  />} />
            </Dropdown>
          </div>
        }
      />
    );
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <div
        title={
          <div className="flex gap-2">
            <Database className="w-4 h-4"  />
            <span>查询编辑器</span>
            {currentTab?.isModified && (
              <Badge color="blue" text="未保存" />
            )}
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Select
              placeholder="选择数据库"
              value={selectedDatabase}
              onValueChange={onDatabaseChange}
              style={{ width: 150 }}
              size="small"
            >
              {databases.map(db => (
                <Option key={db} value={db}>
                  {db}
                </Option>
              ))}
            </Select>
            
            <Tooltip title="查询历史">
              <Button
                size="small"
                icon={<History className="w-4 h-4"  />}
                onClick={() => setShowHistory(true)}
              />
            </Tooltip>
            
            <Tooltip title="编辑器设置">
              <Button
                size="small"
                icon={<Settings className="w-4 h-4"  />}
                onClick={() => setShowSettings(true)}
              />
            </Tooltip>
            
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏模式'}>
              <Button
                size="small"
                icon={isFullscreen ? <Minimize className="w-4 h-4"  /> : <Maximize className="w-4 h-4"  />}
                onClick={() => setIsFullscreen(!isFullscreen)}
              />
            </Tooltip>
          </div>
        }
        styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
        style={{ height: '100%', border: 'none' }}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 标签页 */}
          <div className="border-b">
            {renderTabs()}
          </div>

          {/* 工具栏 */}
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div className="flex gap-2">
              <Button
                type="primary"
                icon={<PlayCircle />}
                onClick={handleExecuteQuery}
                disabled={loading || !selectedDatabase || !activeConnectionId || !currentTab?.query.trim()}
              >
                执行 (Ctrl+Enter)
              </Button>
              
              <Button
                icon={<Save className="w-4 h-4"  />}
                onClick={handleSaveQuery}
                disabled={!currentTab?.query.trim()}
              >
                保存
              </Button>
              
              <Button
                icon={<Paintbrush />}
                onClick={handleFormatQuery}
              >
                格式化
              </Button>


              <Select
                placeholder="选择模板"
                style={{ width: 150 }}
                size="small"
                onValueChange={handleTemplateSelect}
                allowClear
              >
                {queryTemplates.map(template => (
                  <Option key={template.value} value={template.value}>
                    {template.label}
                  </Option>
                ))}
              </Select>
            </div>
          </div>

          {/* 编辑器 */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language="influxql"
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={currentTab?.query || ''}
              onValueChange={(value) => updateCurrentTabQuery(value || '')}
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
                automaticLayout: true}}
            />
          </div>

        </div>
      </div>

      {/* 查询历史抽屉 */}
      <Sheet
        title="查询历史"
        open={showHistory}
        onClose={() => setShowHistory(false)}
        width={400}
      >
        <div className="space-y-2">
          {queryTabs
            .filter(tab => tab.lastExecuted)
            .sort((a, b) => (b.lastExecuted?.getTime() || 0) - (a.lastExecuted?.getTime() || 0))
            .map(tab => (
              <div
                key={tab.id}
                size="small"
                hoverable
                onClick={() => {
                  setActiveTabId(tab.id);
                  setShowHistory(false);
                }}
                className="cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {tab.lastExecuted?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {tab.query}
                  </div>
                </div>
              </div>
            ))}
          
          {queryTabs.filter(tab => tab.lastExecuted).length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <History className="w-4 h-4 text-4xl mb-2"   />
              <div>暂无查询历史</div>
            </div>
          )}
        </div>
      </Sheet>

      {/* 编辑器设置抽屉 */}
      <Sheet
        title="编辑器设置"
        open={showSettings}
        onClose={() => setShowSettings(false)}
        width={300}
      >
        <div className="space-y-4">
          <div>
            <Label className="block text-sm font-medium mb-2">字体大小</Label>
            <Select defaultValue={14} style={{ width: '100%' }}>
              <Option value={12}>12px</Option>
              <Option value={14}>14px</Option>
              <Option value={16}>16px</Option>
              <Option value={18}>18px</Option>
            </Select>
          </div>
          
          <div>
            <Label className="block text-sm font-medium mb-2">主题</Label>
            <Select value={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'} disabled style={{ width: '100%' }}>
              <Option value="vs-light">浅色 (跟随系统)</Option>
              <Option value="vs-dark">深色 (跟随系统)</Option>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">显示小地图</span>
            <Switch defaultChecked={false} />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">自动换行</span>
            <Switch defaultChecked={true} />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">显示行号</span>
            <Switch defaultChecked={true} />
          </div>
        </div>
      </Sheet>

    </div>
  );
};

export default QueryEditor;
