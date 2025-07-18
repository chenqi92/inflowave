import React, { useState, useCallback, useEffect } from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TooltipWrapper as Tooltip,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  CustomDialog,
} from '@/components/ui';
import { useDialog } from '@/hooks/useDialog';
import { showMessage } from '@/utils/message';
import { useContextMenu } from '@/hooks/useContextMenu';
import ContextMenu from '@/components/common/ContextMenu';
import {
  Save,
  Database,
  History,
  Settings,
  Maximize,
  Minimize,
  X,
  Copy,
  Edit,
  PlayCircle,
  Paintbrush,
} from 'lucide-react';
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
  currentTimeRange,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const { resolvedTheme } = useTheme();
  const dialog = useDialog();
  
  // 初始化右键菜单
  const { 
    contextMenu, 
    showContextMenu, 
    hideContextMenu, 
    handleContextMenuAction 
  } = useContextMenu({
    onSqlGenerated: (sql: string, description: string) => {
      updateCurrentTabQuery(sql);
      showMessage.success(`SQL 已生成: ${description}`);
    },
    onActionExecuted: (action: string) => {
      console.log('Context menu action executed:', action);
    },
    onError: (error: string) => {
      showMessage.error(error);
    }
  });

  // 处理时间范围的SQL注入
  const injectTimeRangeToQuery = (
    query: string,
    timeRange?: { start: string; end: string; value: string }
  ) => {
    if (
      !timeRange ||
      timeRange.value === 'none' ||
      !timeRange.start ||
      !timeRange.end
    ) {
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
        return query.replace(
          fromClause,
          `${fromClause} WHERE ${timeCondition}`
        );
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
      isModified: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('default');
  const [loading, setLoading] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(
    null
  );
  const [editorInstance, setEditorInstance] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 初始化编辑器
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
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
        strings: false,
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
        insertMode: 'insert',
      },
    });

    // 添加快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleExecuteQuery();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveQuery();
    });

    // 添加格式化快捷键
    editor.addCommand(
      monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      () => {
        handleFormatQuery();
      }
    );

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

    // 添加右键菜单支持
    editor.onContextMenu((e) => {
      e.event.preventDefault();
      e.event.stopPropagation();
      
      const selection = editor.getSelection();
      const selectedText = selection && !selection.isEmpty() 
        ? editor.getModel()?.getValueInRange(selection) 
        : '';
      
      const position = editor.getPosition();
      const currentQuery = editor.getModel()?.getValue() || '';
      
      const target = {
        type: 'query-editor',
        query: currentQuery,
        selectedText,
        position,
        database: selectedDatabase,
        hasSelection: Boolean(selectedText?.trim()),
        canExecute: Boolean(currentQuery.trim() && activeConnectionId && selectedDatabase)
      };
      
      showContextMenu(e.event as any, target);
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
  const updateCurrentTabQuery = useCallback(
    (query: string) => {
      setQueryTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId ? { ...tab, query, isModified: true } : tab
        )
      );
    },
    [activeTabId]
  );

  // 添加新标签页
  const addNewTab = () => {
    const newTab: QueryTab = {
      id: `tab_${Date.now()}`,
      name: `查询 ${queryTabs.length + 1}`,
      query: 'SELECT * FROM measurement_name LIMIT 10',
      database: selectedDatabase,
      isModified: false,
    };
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
      isModified: false,
    };
    setQueryTabs([...queryTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // 重命名标签页
  const renameTab = (tabId: string, newName: string) => {
    setQueryTabs(tabs =>
      tabs.map(tab => (tab.id === tabId ? { ...tab, name: newName } : tab))
    );
  };

  // 启用实时语法验证
  const enableRealTimeValidation = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
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
        tags: [monaco.MarkerTag.Unnecessary],
      })),
      ...validation.warnings.map(warning => ({
        startLineNumber: warning.line,
        startColumn: warning.column,
        endLineNumber: warning.endLine,
        endColumn: warning.endColumn,
        message: warning.message,
        severity: monaco.MarkerSeverity.Warning,
        code: warning.code,
      })),
      ...validation.suggestions.map(suggestion => ({
        startLineNumber: suggestion.line,
        startColumn: suggestion.column,
        endLineNumber: suggestion.endLine,
        endColumn: suggestion.endColumn,
        message: suggestion.message,
        severity: monaco.MarkerSeverity.Info,
        code: suggestion.code,
      })),
    ];

    monaco.editor.setModelMarkers(model, 'influxql', markers);

    // 注册快速修复提供程序
    registerQuickFixProvider(validation);
  };

  // 注册快速修复提供程序
  const registerQuickFixProvider = (validation: any) => {
    const disposables: monaco.IDisposable[] = [];

    // 为每个有快速修复的错误注册代码操作提供程序
    const allIssues = [
      ...validation.errors,
      ...validation.warnings,
      ...validation.suggestions,
    ];
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
                  edits: [
                    {
                      resource: model.uri,
                      edit: {
                        range: {
                          startLineNumber: marker.startLineNumber,
                          startColumn: marker.startColumn,
                          endLineNumber: marker.endLineNumber,
                          endColumn: marker.endColumn,
                        },
                        text: issue.quickFix.newText,
                      },
                    },
                  ],
                },
              });
            }
          });

          return { actions, dispose: () => {} };
        },
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
          [
            /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|INTO|VALUES|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|SHOW|DESCRIBE)\b/i,
            'keyword',
          ],
          [/\b(AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|TRUE|FALSE)\b/i, 'keyword'],
          [
            /\b(COUNT|SUM|AVG|MIN|MAX|FIRST|LAST|MEAN|MEDIAN|MODE|STDDEV|SPREAD|PERCENTILE)\b/i,
            'function',
          ],
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
        ],
      },
    });

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
          endColumn: word.endColumn,
        };

        // 获取完整的查询文本和光标位置
        const fullText = model.getValue();
        const offset = model.getOffsetAt(position);

        try {
          // 使用全面的 InfluxDB 智能自动补全引擎
          const smartSuggestions =
            await influxDBSmartCompleteEngine.generateSuggestions(
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
              insertTextRules: item.snippet
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
              range,
              documentation: {
                value: item.documentation,
                isTrusted: true,
              },
              detail: item.description,
              sortText: `${1000 - item.priority}_${item.label}`, // 使用优先级排序
              preselect: item.priority > 95, // 最高优先级项目预选
              tags: item.category ? [1] : undefined, // 添加分类标签
              command: item.snippet
                ? {
                    id: 'editor.action.triggerSuggest',
                    title: 'Trigger Suggest',
                  }
                : undefined,
            };
          });

          return { suggestions };
        } catch (error) {
          console.error(
            'Failed to get InfluxDB smart autocomplete suggestions:',
            error
          );
          return { suggestions: [] };
        }
      },
      triggerCharacters: [
        ' ',
        '.',
        '(',
        ',',
        '"',
        "'",
        '=',
        '<',
        '>',
        '!',
        '~',
      ],
    });
  };

  // 更新数据库结构缓存
  useEffect(() => {
    if (activeConnectionId && selectedDatabase) {
      // 使用新的智能补全引擎，它会自动缓存数据库结构
      influxDBSmartCompleteEngine
        .generateSuggestions(activeConnectionId, selectedDatabase, '', 0)
        .catch(error =>
          console.warn('Failed to initialize database cache:', error)
        );
    }
  }, [activeConnectionId, selectedDatabase]);

  // 执行查询
  const handleExecuteQuery = async () => {
    const currentTab = getCurrentTab();
    if (!currentTab?.query.trim()) {
      showMessage.success('请输入查询语句');
      return;
    }

    if (!selectedDatabase) {
      showMessage.success('请选择数据库');
      return;
    }

    if (!activeConnectionId) {
      showMessage.success('请先连接到数据库');
      return;
    }

    // 检查是否有选中的内容
    let queryToExecute = currentTab.query.trim();
    if (editorInstance) {
      const selection = editorInstance.getSelection();
      if (selection && !selection.isEmpty()) {
        const selectedText = editorInstance
          .getModel()
          ?.getValueInRange(selection);
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
      const queryWithTimeRange = injectTimeRangeToQuery(
        queryToExecute,
        currentTimeRange
      );

      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: queryWithTimeRange,
      };

      const result = await invoke<QueryResult>('execute_query', { request });
      const executionTime = Date.now() - startTime;

      setLastExecutionTime(executionTime);
      onQueryResult?.(result);

      // 更新标签页的最后执行时间
      setQueryTabs(tabs =>
        tabs.map(tab =>
          tab.id === activeTabId
            ? { ...tab, lastExecuted: new Date(), isModified: false }
            : tab
        )
      );

      showMessage.success(
        `查询完成，返回 ${result.rowCount} 行数据，耗时 ${executionTime}ms`
      );
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
      showMessage.success('请输入查询语句');
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
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_query', { query: savedQuery });
      showMessage.success('查询已保存');
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

        editorInstance.executeEdits('format', [
          {
            range: selection,
            text: formatted,
          },
        ]);
      } else {
        // 格式化整个查询
        const fullText = model.getValue();
        const formatted = influxqlFormatter.format(fullText);

        // 保存光标位置
        const cursorPosition = editorInstance.getPosition();

        editorInstance.executeEdits('format', [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ]);

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
      value: 'SELECT * FROM measurement_name LIMIT 10',
    },
    {
      label: '按时间范围查询',
      value: 'SELECT * FROM measurement_name WHERE time >= now() - 1h',
    },
    {
      label: '聚合查询',
      value:
        'SELECT MEAN(field_name) FROM measurement_name WHERE time >= now() - 1h GROUP BY time(5m)',
    },
    {
      label: '显示测量',
      value: 'SHOW MEASUREMENTS',
    },
    {
      label: '显示字段',
      value: 'SHOW FIELD KEYS FROM measurement_name',
    },
    {
      label: '显示标签',
      value: 'SHOW TAG KEYS FROM measurement_name',
    },
  ];

  // 处理模板选择
  const handleTemplateSelect = (template: string) => {
    updateCurrentTabQuery(template);
  };

  // 菜单事件监听器
  useEffect(() => {
    const handleOpenFileContent = (event: CustomEvent) => {
      const { content, filename } = event.detail;
      // 创建新标签页加载文件内容
      const newTab: QueryTab = {
        id: `file_${Date.now()}`,
        name: filename.split('/').pop() || '未知文件',
        query: content,
        database: selectedDatabase,
        isModified: false,
      };
      setQueryTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    };

    const handleSaveCurrentQuery = async () => {
      await handleSaveQuery();
    };

    const handleSaveQueryAs = async () => {
      const currentTab = getCurrentTab();
      if (!currentTab?.query.trim()) {
        showMessage.warning('请输入查询语句');
        return;
      }

      try {
        const result = await safeTauriInvoke('save_file_dialog', {
          title: '保存查询文件',
          filters: [
            { name: 'SQL 文件', extensions: ['sql'] },
            { name: 'Text 文件', extensions: ['txt'] }
          ],
          defaultFilename: `${currentTab.name}.sql`
        });

        if (result && result.path) {
          await safeTauriInvoke('write_file', {
            path: result.path,
            content: currentTab.query
          });
          showMessage.success('查询已保存到文件');
        }
      } catch (error) {
        showMessage.error(`保存文件失败: ${error}`);
      }
    };

    const handleFormatQueryEvent = () => {
      handleFormatQuery();
    };

    const handleExplainQueryEvent = () => {
      if (!activeConnectionId) {
        showMessage.warning('请先建立数据库连接');
        return;
      }
      
      const currentTab = getCurrentTab();
      if (!currentTab?.query.trim()) {
        showMessage.warning('请输入查询语句');
        return;
      }

      // 这里可以调用实际的查询解释功能
      showMessage.info('查询解释功能开发中...');
    };

    const handleShowQueryFavorites = () => {
      showMessage.info('查询收藏夹功能开发中...');
    };

    const handleShowQueryHistory = () => {
      setShowHistory(true);
    };

    const handleExecuteSelection = () => {
      if (!editorInstance) return;
      
      const selection = editorInstance.getSelection();
      if (selection && !selection.isEmpty()) {
        handleExecuteQuery();
      } else {
        showMessage.info('请先选择要执行的查询文本');
      }
    };

    const handleExecuteQueryEvent = () => {
      handleExecuteQuery();
    };

    const handleFormatQueryMenuItem = () => {
      handleFormatQuery();
    };

    const handleInsertTemplateEvent = (event: CustomEvent) => {
      const { template } = event.detail;
      if (editorInstance && template) {
        const position = editorInstance.getPosition();
        if (position) {
          editorInstance.executeEdits('insert-template', [
            {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
              text: template,
            },
          ]);
        }
      }
    };

    const handleToggleCommentEvent = () => {
      if (editorInstance) {
        editorInstance.getAction('editor.action.commentLine')?.run();
      }
    };

    const handleSaveQueryEvent = () => {
      handleSaveQuery();
    };

    // 添加事件监听器
    document.addEventListener('open-file-content', handleOpenFileContent as any);
    document.addEventListener('save-current-query', handleSaveCurrentQuery);
    document.addEventListener('save-query-as', handleSaveQueryAs);
    document.addEventListener('format-query', handleFormatQueryEvent);
    document.addEventListener('explain-query', handleExplainQueryEvent);
    document.addEventListener('show-query-favorites', handleShowQueryFavorites);
    document.addEventListener('show-query-history', handleShowQueryHistory);
    document.addEventListener('execute-selection', handleExecuteSelection);
    document.addEventListener('execute-query', handleExecuteQueryEvent);
    document.addEventListener('format-query', handleFormatQueryMenuItem);
    document.addEventListener('insert-template', handleInsertTemplateEvent as any);
    document.addEventListener('toggle-comment', handleToggleCommentEvent);
    document.addEventListener('save-query', handleSaveQueryEvent);

    return () => {
      document.removeEventListener('open-file-content', handleOpenFileContent as any);
      document.removeEventListener('save-current-query', handleSaveCurrentQuery);
      document.removeEventListener('save-query-as', handleSaveQueryAs);
      document.removeEventListener('format-query', handleFormatQueryEvent);
      document.removeEventListener('explain-query', handleExplainQueryEvent);
      document.removeEventListener('show-query-favorites', handleShowQueryFavorites);
      document.removeEventListener('show-query-history', handleShowQueryHistory);
      document.removeEventListener('execute-selection', handleExecuteSelection);
      document.removeEventListener('execute-query', handleExecuteQueryEvent);
      document.removeEventListener('format-query', handleFormatQueryMenuItem);
      document.removeEventListener('insert-template', handleInsertTemplateEvent as any);
      document.removeEventListener('toggle-comment', handleToggleCommentEvent);
      document.removeEventListener('save-query', handleSaveQueryEvent);
    };
  }, [activeConnectionId, selectedDatabase, getCurrentTab, handleSaveQuery, handleFormatQuery, handleExecuteQuery, editorInstance]);

  // 当前标签页
  const currentTab = getCurrentTab();

  // 渲染标签页
  const renderTabs = () => {
    return (
      <div className="flex items-center justify-between border-b bg-background">
        <Tabs value={activeTabId} onValueChange={setActiveTabId} className="flex-1">
          <div className="flex items-center justify-between">
            <TabsList className="h-auto p-0 bg-transparent">
              {queryTabs.map(tab => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm border-b-2 border-transparent data-[state=active]:border-primary rounded-none"
                >
                  <span>{tab.name}</span>
                  {tab.isModified && (
                    <div className='w-1.5 h-1.5 bg-primary rounded-full' />
                  )}
                  {queryTabs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className='ml-1 h-4 w-4 p-0 opacity-60 hover:opacity-100'
                      onClick={e => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                    >
                      <X className='w-3 h-3' />
                    </Button>
                  )}
                </TabsTrigger>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 ml-2"
                onClick={addNewTab}
              >
                +
              </Button>
            </TabsList>

            <div className='flex gap-2 px-4'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Settings className='w-4 h-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => duplicateTab(activeTabId)}>
                    <Copy className='w-4 h-4 mr-2' />
                    复制标签页
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={async () => {
                    const newName = await dialog.prompt(
                      '请输入新名称',
                      currentTab?.name,
                      '标签页名称'
                    );
                    if (newName && newName.trim()) {
                      renameTab(activeTabId, newName.trim());
                    }
                  }}>
                    <Edit className='w-4 h-4 mr-2' />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setQueryTabs([currentTab!]);
                  }}>
                    关闭其他标签页
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Tabs>
      </div>
    );
  };

  return (
    <div
      className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}
    >
      <Card className="h-full flex flex-col border-0 rounded-none">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className='w-5 h-5' />
              <span>查询编辑器</span>
              {currentTab?.isModified && (
                <Badge variant="secondary" className="text-xs">
                  未保存
                </Badge>
              )}
            </CardTitle>

            <div className='flex items-center gap-2'>
              <Select
                value={selectedDatabase}
                onValueChange={onDatabaseChange}
              >
                <SelectTrigger className="w-[150px] h-8">
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

              <Tooltip title='查询历史'>
                <Button
                  variant="outline"
                  size='sm'
                  className="h-8 w-8 p-0"
                  onClick={() => setShowHistory(true)}
                >
                  <History className='w-4 h-4' />
                </Button>
              </Tooltip>

              <Tooltip title='编辑器设置'>
                <Button
                  variant="outline"
                  size='sm'
                  className="h-8 w-8 p-0"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className='w-4 h-4' />
                </Button>
              </Tooltip>

              <Tooltip title={isFullscreen ? '退出全屏' : '全屏模式'}>
                <Button
                  variant="outline"
                  size='sm'
                  className="h-8 w-8 p-0"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize className='w-4 h-4' />
                  ) : (
                    <Maximize className='w-4 h-4' />
                  )}
                </Button>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* 标签页 */}
          {renderTabs()}

          {/* 工具栏 */}
          <div className="flex items-center gap-2 p-4 border-b bg-muted/30">
            <Button
              onClick={handleExecuteQuery}
              disabled={
                loading ||
                !selectedDatabase ||
                !activeConnectionId ||
                !currentTab?.query.trim()
              }
              className="gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              执行 (Ctrl+Enter)
            </Button>

            <Button
              variant="outline"
              onClick={handleSaveQuery}
              disabled={!currentTab?.query.trim()}
              className="gap-2"
            >
              <Save className='w-4 h-4' />
              保存
            </Button>

            <Button
              variant="outline"
              onClick={handleFormatQuery}
              className="gap-2"
            >
              <Paintbrush className="w-4 h-4" />
              格式化
            </Button>

            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="选择模板" />
              </SelectTrigger>
              <SelectContent>
                {queryTemplates.map(template => (
                  <SelectItem key={template.value} value={template.value}>
                    {template.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 编辑器 */}
          <div className="flex-1 min-h-0">
            <Editor
              height='100%'
              language='influxql'
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={currentTab?.query || ''}
              onChange={value => updateCurrentTabQuery(value || '')}
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
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 查询历史抽屉 */}
      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side="right" className="w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              查询历史
            </SheetTitle>
          </SheetHeader>

          <div className='space-y-2 mt-6'>
            {queryTabs
              .filter(tab => tab.lastExecuted)
              .sort(
                (a, b) =>
                  (b.lastExecuted?.getTime() || 0) -
                  (a.lastExecuted?.getTime() || 0)
              )
              .map(tab => (
                <Card
                  key={tab.id}
                  className='cursor-pointer hover:bg-accent transition-colors'
                  onClick={() => {
                    setActiveTabId(tab.id);
                    setShowHistory(false);
                  }}
                >
                  <CardContent className="p-3">
                    <div className='space-y-1'>
                      <div className='font-medium text-sm'>{tab.name}</div>
                      <div className='text-xs text-muted-foreground'>
                        {tab.lastExecuted?.toLocaleString()}
                      </div>
                      <div className='text-sm text-muted-foreground truncate'>
                        {tab.query}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {queryTabs.filter(tab => tab.lastExecuted).length === 0 && (
              <div className='text-center text-muted-foreground py-8'>
                <History className='w-12 h-12 mx-auto mb-2 opacity-50' />
                <div>暂无查询历史</div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 编辑器设置抽屉 */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="w-[350px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              编辑器设置
            </SheetTitle>
          </SheetHeader>

          <div className='space-y-6 mt-6'>
            <div className="space-y-2">
              <Label className='text-sm font-medium'>字体大小</Label>
              <Select defaultValue="14">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12px</SelectItem>
                  <SelectItem value="14">14px</SelectItem>
                  <SelectItem value="16">16px</SelectItem>
                  <SelectItem value="18">18px</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className='text-sm font-medium'>主题</Label>
              <Select
                value={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
                disabled
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='vs-light'>浅色 (跟随系统)</SelectItem>
                  <SelectItem value='vs-dark'>深色 (跟随系统)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='flex items-center justify-between py-2'>
              <Label className='text-sm font-medium'>显示小地图</Label>
              <Switch defaultChecked={false} />
            </div>

            <div className='flex items-center justify-between py-2'>
              <Label className='text-sm font-medium'>自动换行</Label>
              <Switch defaultChecked={true} />
            </div>

            <div className='flex items-center justify-between py-2'>
              <Label className='text-sm font-medium'>显示行号</Label>
              <Switch defaultChecked={true} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 对话框组件 */}
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={dialog.hideDialog}
        options={{
          ...dialog.dialogState.options,
          onConfirm: dialog.handleConfirm,
          onCancel: dialog.handleCancel,
        }}
      />
      
      {/* 右键菜单 */}
      <ContextMenu
        open={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        target={contextMenu.target}
        onClose={hideContextMenu}
        onAction={handleContextMenuAction}
        onExecuteQuery={(sql: string, description?: string) => {
          updateCurrentTabQuery(sql);
          if (description) {
            showMessage.success(`SQL 已生成: ${description}`);
          }
        }}
      />
    </div>
  );
};

export default QueryEditor;
