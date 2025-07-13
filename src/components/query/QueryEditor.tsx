import React, { useState, useRef, useCallback } from 'react';
import { Button, Select, Typography, Dropdown, Switch, Tabs, Card, Space, Tooltip } from '@/components/ui';
// TODO: Replace these Ant Design components: Badge, Drawer
import { useToast } from '@/hooks/use-toast';

import { FlaskConical } from 'lucide-react';
import { Save, Database, History, Settings, Maximize, Minimize, Clock, Plus, X, Copy, Edit, Zap, Lightbulb, PlayCircle, Paintbrush } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { useQuery } from '@/hooks/useQuery';
import { useSettingsStore } from '@/store/settings';
import { FormatUtils } from '@/utils/format';
import { intelligentQueryEngine } from '@/services/intelligentQuery';
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
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [showOptimizationTips, setShowOptimizationTips] = useState(false);

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
      theme: 'vs-light',
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true }});

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

  // 智能优化查询
  const handleOptimizeQuery = useCallback(async () => {
    if (!activeConnectionId || !getCurrentTab()?.query) {
      toast({ title: "警告", description: "请选择连接并输入查询语句" });
      return;
    }

    const currentTab = getCurrentTab();
    if (!currentTab) return;

    setOptimizationLoading(true);
    try {
      const result = await intelligentQueryEngine.optimizeQuery({
        query: currentTab.query,
        connectionId: activeConnectionId,
        database: currentTab.database || selectedDatabase,
        context: {
          historicalQueries: [],
          userPreferences: {
            preferredPerformance: 'balanced',
            maxQueryTime: 5000,
            cachePreference: 'aggressive'
          },
          systemLoad: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskIo: 30,
            networkLatency: 20
          },
          dataSize: {
            totalRows: 100000,
            totalSize: 1024 * 1024 * 100,
            averageRowSize: 1024,
            compressionRatio: 0.3
          },
          indexInfo: []
        }
      });

      setOptimizationResult(result);
      
      // 如果用户启用了自动应用优化
      if (autoOptimize && result.optimizedQuery !== currentTab.query) {
        updateCurrentTabQuery(result.optimizedQuery);
        if (editorInstance) {
          editorInstance.setValue(result.optimizedQuery);
        }
        toast({ title: "成功", description: "查询已自动优化，预计性能提升 ${result.estimatedPerformanceGain}%" });
      } else {
        toast({ title: "成功", description: "查询分析完成，预计性能提升 ${result.estimatedPerformanceGain}%" });
      }
    } catch (error) {
      console.error('Query optimization failed:', error);
      toast({ title: "错误", description: "查询优化失败", variant: "destructive" });
    } finally {
      setOptimizationLoading(false);
    }
  }, [activeConnectionId, getCurrentTab, selectedDatabase, autoOptimize, updateCurrentTabQuery, editorInstance]);

  // 应用优化建议
  const handleApplyOptimization = useCallback(() => {
    if (!optimizationResult || !getCurrentTab()) return;

    const currentTab = getCurrentTab();
    if (!currentTab) return;

    updateCurrentTabQuery(optimizationResult.optimizedQuery);
    if (editorInstance) {
      editorInstance.setValue(optimizationResult.optimizedQuery);
    }
    toast({ title: "成功", description: "优化建议已应用" });
  }, [optimizationResult, getCurrentTab, updateCurrentTabQuery, editorInstance]);

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

        const suggestions: monaco.languages.CompletionItem[] = [
          // 关键字
          ...['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET'].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range})),
          // 函数
          ...['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST', 'MEAN'].map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}()`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range})),
          // 数据库
          ...databases.map(db => ({
            label: db,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: `"${db}"`,
            range,
            documentation: `Database: ${db}`})),
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

    setLoading(true);
    onLoadingChange?.(true);
    const startTime = Date.now();

    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: currentTab.query.trim()};

      const result = await invoke<QueryResult>('execute_query', { request });
      const executionTime = Date.now() - startTime;
      
      setLastExecutionTime(executionTime);
      onQueryResult?.(result);
      
      // 更新标签页的最后执行时间
      setQueryTabs(tabs => tabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, lastExecuted: new Date(), isModified: false }
          : tab
      ));
      
      toast({ title: "成功", description: "查询完成，返回 ${result.rowCount} 行数据，耗时 ${executionTime}ms" });
    } catch (error) {
      toast({ title: "错误", description: "查询执行失败: ${error}", variant: "destructive" });
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
          {tab.isModified && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
          {tab.lastExecuted && (
            <Tooltip title={`最后执行: ${tab.lastExecuted.toLocaleString()}`}>
              <Clock className="w-4 h-4 text-xs text-gray-400"   />
            </Tooltip>
          )}
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
        activeKey={activeTabId}
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
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <Card
        title={
          <div className="flex gap-2">
            <Database className="w-4 h-4"  />
            <span>查询编辑器</span>
            {lastExecutionTime && (
              <Text type="secondary">
                <Clock className="w-4 h-4"  /> 上次执行: {lastExecutionTime}ms
              </Text>
            )}
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
                disabled={loading}
                disabled={!selectedDatabase || !activeConnectionId || !currentTab?.query.trim()}
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

              <Tooltip title="智能优化查询">
                <Button
                  icon={<Zap className="w-4 h-4"  />}
                  onClick={handleOptimizeQuery}
                  disabled={optimizationLoading}
                  disabled={!activeConnectionId || !currentTab?.query.trim()}
                >
                  智能优化
                </Button>
              </Tooltip>

              {optimizationResult && (
                <Tooltip title="应用优化建议">
                  <Button
                    icon={<Lightbulb className="w-4 h-4"  />}
                    onClick={handleApplyOptimization}
                    disabled={!optimizationResult || optimizationResult.optimizedQuery === currentTab?.query}
                  >
                    应用优化
                  </Button>
                </Tooltip>
              )}

              <Tooltip title="优化设置">
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => setShowOptimizationTips(true)}
                />
              </Tooltip>

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
              theme="vs-light"
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

          {/* 优化结果展示 */}
          {optimizationResult && (
            <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px', background: '#fafafa' }}>
              <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
                <div className="flex gap-2">
                  <Text strong>优化分析结果</Text>
                  <Badge 
                    count={`${optimizationResult.estimatedPerformanceGain}%`} 
                    style={{ backgroundColor: optimizationResult.estimatedPerformanceGain > 20 ? '#52c41a' : '#faad14' }}
                  />
                  <Text type="secondary">预计性能提升</Text>
                </div>
                
                {optimizationResult.optimizationTechniques.length > 0 && (
                  <div className="flex gap-2" wrap>
                    <Text type="secondary">优化技术:</Text>
                    {optimizationResult.optimizationTechniques.map((tech: any, index: number) => (
                      <Badge
                        key={index}
                        count={tech.name}
                        style={{ 
                          backgroundColor: tech.impact === 'high' ? '#52c41a' : 
                                          tech.impact === 'medium' ? '#faad14' : '#d9d9d9'
                        }}
                      />
                    ))}
                  </div>
                )}

                {optimizationResult.warnings.length > 0 && (
                  <div className="flex gap-2" wrap>
                    <Text type="warning">警告:</Text>
                    {optimizationResult.warnings.map((warning: string, index: number) => (
                      <Text key={index} type="warning">{warning}</Text>
                    ))}
                  </div>
                )}

                {optimizationResult.recommendations.length > 0 && (
                  <div className="flex gap-2" wrap>
                    <Text type="secondary">建议:</Text>
                    {optimizationResult.recommendations.slice(0, 2).map((rec: any, index: number) => (
                      <Tooltip key={index} title={rec.description}>
                        <Badge count={rec.title} style={{ backgroundColor: '#1890ff' }} />
                      </Tooltip>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

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
              <Card
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
                  <div className="text-xs text-gray-500">
                    {tab.lastExecuted?.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {tab.query}
                  </div>
                </div>
              </Card>
            ))}
          
          {queryTabs.filter(tab => tab.lastExecuted).length === 0 && (
            <div className="text-center text-gray-500 py-8">
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
            <label className="block text-sm font-medium mb-2">字体大小</label>
            <Select defaultValue={14} style={{ width: '100%' }}>
              <Option value={12}>12px</Option>
              <Option value={14}>14px</Option>
              <Option value={16}>16px</Option>
              <Option value={18}>18px</Option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">主题</label>
            <Select defaultValue="vs-light" style={{ width: '100%' }}>
              <Option value="vs-light">浅色</Option>
              <Option value="vs-dark">深色</Option>
              <Option value="hc-black">高对比度</Option>
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

      {/* 优化设置抽屉 */}
      <Sheet
        title="优化设置"
        open={showOptimizationTips}
        onClose={() => setShowOptimizationTips(false)}
        width={400}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">自动应用优化</span>
            <Switch 
              checked={autoOptimize} 
              onValueChange={setAutoOptimize}
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">优化技术</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">索引优化</span>
                <Switch defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">查询重写</span>
                <Switch defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">缓存策略</span>
                <Switch defaultChecked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">并行化</span>
                <Switch defaultChecked={false} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">性能目标</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium mb-1">最大执行时间 (秒)</label>
                <Select defaultValue="5" style={{ width: '100%' }}>
                  <Option value="1">1</Option>
                  <Option value="5">5</Option>
                  <Option value="10">10</Option>
                  <Option value="30">30</Option>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">内存使用限制 (MB)</label>
                <Select defaultValue="512" style={{ width: '100%' }}>
                  <Option value="256">256</Option>
                  <Option value="512">512</Option>
                  <Option value="1024">1024</Option>
                  <Option value="2048">2048</Option>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">路由策略</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium mb-1">负载均衡</label>
                <Select defaultValue="adaptive" style={{ width: '100%' }}>
                  <Option value="round_robin">轮询</Option>
                  <Option value="least_connections">最少连接</Option>
                  <Option value="weighted">加权</Option>
                  <Option value="adaptive">自适应</Option>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">启用读写分离</span>
                <Switch defaultChecked={true} />
              </div>
            </div>
          </div>

          {optimizationResult && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">优化历史</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <Text type="secondary">上次优化时间:</Text>
                  <br />
                  <Text>{new Date().toLocaleString()}</Text>
                </div>
                <div className="text-sm">
                  <Text type="secondary">性能提升:</Text>
                  <br />
                  <Text type="success">{optimizationResult.estimatedPerformanceGain}%</Text>
                </div>
                <div className="text-sm">
                  <Text type="secondary">优化技术:</Text>
                  <br />
                  <Text>{optimizationResult.optimizationTechniques.map((t: any) => t.name).join(', ')}</Text>
                </div>
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};

export default QueryEditor;
