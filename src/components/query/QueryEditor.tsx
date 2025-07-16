import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography, Dropdown, Switch, Tabs, Space, Tooltip, Label } from '@/components/ui';
// TODO: Replace these Ant Design components: Badge, Drawer
import { showMessage } from '@/utils/message';
import { Save, Database, History, Settings, Maximize, Minimize, Plus, X, Copy, Edit, PlayCircle, Paintbrush } from 'lucide-react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { influxDBSmartCompleteEngine } from '@/utils/influxdbSmartComplete';
import { influxqlValidator } from '@/utils/influxqlValidator';
import { influxqlFormatter } from '@/utils/influxqlFormatter';
import type { QueryResult, QueryRequest } from '@/types';

// Fix for invoke function
const invoke = safeTauriInvoke;

const { Text } = Typography;

interface QueryEditorProps {
  selectedDatabase: string;
  onDatabaseChange: (database: string) => void;
  databases: string[];
  onQueryResult?: (result: QueryResult) => void;
  onLoadingChange?: (loading: boolean) => void;
  currentTimeRange?: {
    label: string;
    value: string;
    start: string;
    end: string;
  };
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
  onLoadingChange,
  currentTimeRange}) => {
  const { activeConnectionId } = useConnectionStore();
  const { resolvedTheme } = useTheme();

  // 处理时间范围的SQL注入
  const injectTimeRangeToQuery = (query: string, timeRange?: { start: string; end: string; value: string }) => {
    if (!timeRange || timeRange.value === 'none' || !timeRange.start || !timeRange.end) {
      return query; // 如果没有时间范围或选择不限制时间，直接返回原查询
    }

    // 检查查询是否已经包含时间范围条件
    const hasTimeCondition = /WHERE\s+.*time\s*[><=]/i.test(query);

    if (hasTimeCondition) {
      // 如果已经有时间条件，不自动添加
      return query;
    }

    // 检查是否是 SELECT 查询
    const isSelectQuery = /^\s*SELECT\s+/i.test(query.trim());

    if (!isSelectQuery) {
      return query; // 非 SELECT 查询不添加时间范围
    }

    // 构建时间范围条件
    const timeCondition = `time >= ${timeRange.start} AND time <= ${timeRange.end}`;

    // 检查查询是否已经有 WHERE 子句
    const hasWhereClause = /\s+WHERE\s+/i.test(query);

    if (hasWhereClause) {
      // 如果已经有 WHERE 子句，添加 AND 条件
      return query.replace(/(\s+WHERE\s+)/i, `$1${timeCondition} AND `);
    } else {
      // 如果没有 WHERE 子句，添加 WHERE 条件
      // 找到 FROM 子句之后的位置
      const fromMatch = query.match(/(\s+FROM\s+[^\s]+)/i);
      if (fromMatch) {
        const fromClause = fromMatch[1];
        return query.replace(fromClause, `${fromClause} WHERE ${timeCondition}`);
      }
    }

    return query;
  };
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
      quickSuggestionsDelay: 100, // 快速响应
      parameterHints: { enabled: true },
      acceptSuggestionOnEnter: 'on',
      acceptSuggestionOnCommitCharacter: true,
      tabCompletion: 'on',
      wordBasedSuggestions: 'off', // 禁用基于单词的建议，使用我们的智能建议
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showIssues: true,
        showUsers: true,
        snippetsPreventQuickSuggestions: false,
        localityBonus: true, // 优先显示本地相关的建议
        shareSuggestSelections: false,
        showStatusBar: true,
        filterGraceful: true,
        insertMode: 'insert'
      }
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveQuery();
    });

    // 添加格式化快捷键
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      handleFormatQuery();
    });

    // 添加智能建议快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      editor.getAction('editor.action.triggerSuggest')?.run();
    });

    // 添加查询执行快捷键 (F5)
    editor.addCommand(monaco.KeyCode.F5, () => {
      handleExecuteQuery();
    });

    // 添加注释/取消注释快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
      editor.getAction('editor.action.commentLine')?.run();
    });

    // 注册 InfluxQL 语言支持
    registerInfluxQLLanguage();
    
    // 添加实时语法验证
    enableRealTimeValidation(editor);
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

  // 启用实时语法验证
  const enableRealTimeValidation = (editor: monaco.editor.IStandaloneCodeEditor) => {
    let validationTimeout: NodeJS.Timeout;
    
    // 监听内容变化
    const disposable = editor.onDidChangeModelContent(() => {
      // 使用防抖避免过于频繁的验证
      clearTimeout(validationTimeout);
      validationTimeout = setTimeout(() => {
        validateQuery(editor);
      }, 500);
    });

    // 立即验证当前内容
    validateQuery(editor);
    
    return disposable;
  };

  // 验证查询
  const validateQuery = (editor: monaco.editor.IStandaloneCodeEditor) => {
    const model = editor.getModel();
    if (!model) return;

    const query = model.getValue();
    const validation = influxqlValidator.validate(query);
    
    // 清除之前的标记
    monaco.editor.setModelMarkers(model, 'influxql', []);
    
    // 添加新的标记
    const markers: monaco.editor.IMarkerData[] = [
      ...validation.errors.map(error => ({
        startLineNumber: error.line,
        startColumn: error.column,
        endLineNumber: error.endLine,
        endColumn: error.endColumn,
        message: error.message,
        severity: monaco.MarkerSeverity.Error,
        code: error.code,
        tags: [monaco.MarkerTag.Unnecessary]
      })),
      ...validation.warnings.map(warning => ({
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.endLine,
        endColumn: warning.endColumn,
        message: warning.message,
        severity: monaco.MarkerSeverity.Warning,
        code: warning.code
      })),
      ...validation.suggestions.map(suggestion => ({
        startLineNumber: suggestion.line,
        startColumn: suggestion.column,
        endLineNumber: suggestion.endLine,
        endColumn: suggestion.endColumn,
        message: suggestion.message,
        severity: monaco.MarkerSeverity.Info,
        code: suggestion.code
      }))
    ];

    monaco.editor.setModelMarkers(model, 'influxql', markers);
    
    // 注册快速修复提供程序
    registerQuickFixProvider(validation);
  };

  // 注册快速修复提供程序
  const registerQuickFixProvider = (validation: any) => {
    const disposables: monaco.IDisposable[] = [];
    
    // 为每个有快速修复的错误注册代码操作提供程序
    const allIssues = [...validation.errors, ...validation.warnings, ...validation.suggestions];
    const issuesWithFixes = allIssues.filter(issue => issue.quickFix);
    
    if (issuesWithFixes.length > 0) {
      const provider = monaco.languages.registerCodeActionProvider('influxql', {
        provideCodeActions: (model, range, context) => {
          const actions: monaco.languages.CodeAction[] = [];
          
          context.markers.forEach(marker => {
            const issue = issuesWithFixes.find(i => i.code === marker.code);
            if (issue?.quickFix) {
              actions.push({
                title: issue.quickFix.title,
                kind: 'quickfix',
                edit: {
                  edits: [{
                    resource: model.uri,
                    edit: {
                      range: {
                        startLineNumber: marker.startLineNumber,
                        startColumn: marker.startColumn,
                        endLineNumber: marker.endLineNumber,
                        endColumn: marker.endColumn
                      },
                      text: issue.quickFix.newText
                    }
                  }]
                }
              });
            }
          });
          
          return { actions, dispose: () => {} };
        }
      });
      
      disposables.push(provider);
    }
    
    return disposables;
  };

  // 注册 InfluxQL 语言
  const registerInfluxQLLanguage = () => {
    // 检查是否已经注册过
    if (monaco.languages.getLanguages().find(lang => lang.id === 'influxql')) {
      return;
    }

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

    // 设置智能自动补全
    monaco.languages.registerCompletionItemProvider('influxql', {
      provideCompletionItems: async (model, position) => {
        if (!activeConnectionId || !selectedDatabase) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // 获取完整的查询文本和光标位置
        const fullText = model.getValue();
        const offset = model.getOffsetAt(position);

        try {
          // 使用全面的 InfluxDB 智能自动补全引擎
          const smartSuggestions = await influxDBSmartCompleteEngine.generateSuggestions(
            activeConnectionId,
            selectedDatabase,
            fullText,
            offset
          );

          // 转换为Monaco格式
          const suggestions = smartSuggestions.map(item => {
            let kind: monaco.languages.CompletionItemKind;
            switch (item.type) {
              case 'keyword':
                kind = monaco.languages.CompletionItemKind.Keyword;
                break;
              case 'function':
                kind = monaco.languages.CompletionItemKind.Function;
                break;
              case 'database':
                kind = monaco.languages.CompletionItemKind.Module;
                break;
              case 'measurement':
                kind = monaco.languages.CompletionItemKind.Class;
                break;
              case 'field':
                kind = monaco.languages.CompletionItemKind.Field;
                break;
              case 'tag':
                kind = monaco.languages.CompletionItemKind.Property;
                break;
              case 'template':
                kind = monaco.languages.CompletionItemKind.Snippet;
                break;
              case 'operator':
                kind = monaco.languages.CompletionItemKind.Operator;
                break;
              case 'value':
                kind = monaco.languages.CompletionItemKind.Value;
                break;
              case 'constant':
                kind = monaco.languages.CompletionItemKind.Constant;
                break;
              default:
                kind = monaco.languages.CompletionItemKind.Text;
            }

            return {
              label: item.label,
              kind,
              insertText: item.insertText,
              insertTextRules: item.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
              range,
              documentation: {
                value: item.documentation,
                isTrusted: true
              },
              detail: item.description,
              sortText: `${1000 - item.priority}_${item.label}`, // 使用优先级排序
              preselect: item.priority > 95, // 最高优先级项目预选
              tags: item.category ? [1] : undefined, // 添加分类标签
              command: item.snippet ? {
                id: 'editor.action.triggerSuggest',
                title: 'Trigger Suggest'
              } : undefined
            };
          });

          return { suggestions };
        } catch (error) {
          console.error('Failed to get InfluxDB smart autocomplete suggestions:', error);
          return { suggestions: [] };
        }
      },
      triggerCharacters: [' ', '.', '(', ',', '"', "'", '=', '<', '>', '!', '~']
    });
  };

  // 更新数据库结构缓存
  useEffect(() => {
    if (activeConnectionId && selectedDatabase) {
      // 使用新的智能补全引擎，它会自动缓存数据库结构
      influxDBSmartCompleteEngine.generateSuggestions(activeConnectionId, selectedDatabase, '', 0)
        .catch(error => console.warn('Failed to initialize database cache:', error));
    }
  }, [activeConnectionId, selectedDatabase]);

  // 执行查询
  const handleExecuteQuery = async () => {
    const currentTab = getCurrentTab();
    if (!currentTab?.query.trim()) {
      showMessage.success("请输入查询语句" );
      return;
    }

    if (!selectedDatabase) {
      showMessage.success("请选择数据库" );
      return;
    }

    if (!activeConnectionId) {
      showMessage.success("请先连接到数据库" );
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
      // 为查询注入时间范围条件
      const queryWithTimeRange = injectTimeRangeToQuery(queryToExecute, currentTimeRange);

      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: queryWithTimeRange
      };

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
      
      showMessage.success(`查询完成，返回 ${result.rowCount} 行数据，耗时 ${executionTime}ms`);
    } catch (error) {
      showMessage.error(`查询执行失败: ${error}`);
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
      showMessage.success("请输入查询语句" );
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
      showMessage.success("查询已保存" );
    } catch (error) {
      showMessage.error(`保存查询失败: ${error}`);
    }
  };

  // 格式化查询
  const handleFormatQuery = () => {
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    const selection = editorInstance.getSelection();
    const hasSelection = selection && !selection.isEmpty();

    try {
      if (hasSelection) {
        // 格式化选中的部分
        const selectedText = model.getValueInRange(selection);
        const formatted = influxqlFormatter.format(selectedText);
        
        editorInstance.executeEdits('format', [{
          range: selection,
          text: formatted
        }]);
      } else {
        // 格式化整个查询
        const fullText = model.getValue();
        const formatted = influxqlFormatter.format(fullText);
        
        // 保存光标位置
        const cursorPosition = editorInstance.getPosition();
        
        editorInstance.executeEdits('format', [{
          range: model.getFullModelRange(),
          text: formatted
        }]);
        
        // 恢复光标位置（大致）
        if (cursorPosition) {
          editorInstance.setPosition(cursorPosition);
        }
      }
      
      showMessage.success('查询已格式化');
    } catch (error) {
      showMessage.error(`格式化失败: ${error}`);
      console.error('Format error:', error);
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
