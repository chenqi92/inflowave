import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Select, Typography, message, Tooltip } from 'antd';
import {
  PlayCircleOutlined,
  SaveOutlined,
  HistoryOutlined,
  FormatPainterOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult, QueryRequest } from '@/types';

const { Text } = Typography;
const { Option } = Select;

interface QueryEditorProps {
  selectedDatabase: string;
  onDatabaseChange: (database: string) => void;
  databases: string[];
  onQueryResult?: (result: QueryResult) => void;
  onLoadingChange?: (loading: boolean) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({
  selectedDatabase,
  onDatabaseChange,
  databases,
  onQueryResult,
  onLoadingChange,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [query, setQuery] = useState('SELECT * FROM measurement_name LIMIT 10');
  const [loading, setLoading] = useState(false);
  const [lastExecutionTime, setLastExecutionTime] = useState<number | null>(null);
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

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
      parameterHints: { enabled: true },
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
          [/[{}()\[\]]/, '@brackets'],
          [/[<>]=?|[!=]=|<>/, 'operator'],
          [/[+\-*\/=]/, 'operator'],
          [/[,;]/, 'delimiter'],
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment'],
        ],
      },
    });

    // 设置自动补全
    monaco.languages.registerCompletionItemProvider('influxql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: monaco.languages.CompletionItem[] = [
          // 关键字
          ...['SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET'].map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
          })),
          // 函数
          ...['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FIRST', 'LAST', 'MEAN'].map(func => ({
            label: func,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${func}()`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
          // 数据库
          ...databases.map(db => ({
            label: db,
            kind: monaco.languages.CompletionItemKind.Module,
            insertText: `"${db}"`,
            range,
            documentation: `Database: ${db}`,
          })),
        ];

        return { suggestions };
      },
    });
  };

  // 执行查询
  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    if (!selectedDatabase) {
      message.warning('请选择数据库');
      return;
    }

    if (!activeConnectionId) {
      message.warning('请先连接到数据库');
      return;
    }

    setLoading(true);
    onLoadingChange?.(true);
    const startTime = Date.now();

    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        query: query.trim(),
      };

      const result = await invoke<QueryResult>('execute_query', { request });
      const executionTime = Date.now() - startTime;
      
      setLastExecutionTime(executionTime);
      onQueryResult?.(result);
      
      message.success(`查询完成，返回 ${result.rowCount} 行数据，耗时 ${executionTime}ms`);
    } catch (error) {
      message.error(`查询执行失败: ${error}`);
      console.error('Query error:', error);
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  };

  // 保存查询
  const handleSaveQuery = async () => {
    if (!query.trim()) {
      message.warning('请输入查询语句');
      return;
    }

    try {
      const savedQuery = {
        id: `query_${Date.now()}`,
        name: `查询_${new Date().toLocaleString()}`,
        query: query.trim(),
        database: selectedDatabase,
        tags: [],
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_query', { query: savedQuery });
      message.success('查询已保存');
    } catch (error) {
      message.error(`保存查询失败: ${error}`);
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
      value: 'SELECT * FROM measurement_name LIMIT 10',
    },
    {
      label: '按时间范围查询',
      value: 'SELECT * FROM measurement_name WHERE time >= now() - 1h',
    },
    {
      label: '聚合查询',
      value: 'SELECT MEAN(field_name) FROM measurement_name WHERE time >= now() - 1h GROUP BY time(5m)',
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

  return (
    <Card
      title={
        <Space>
          <DatabaseOutlined />
          <span>查询编辑器</span>
          {lastExecutionTime && (
            <Text type="secondary">
              <ClockCircleOutlined /> 上次执行: {lastExecutionTime}ms
            </Text>
          )}
        </Space>
      }
      extra={
        <Space>
          <Select
            placeholder="选择数据库"
            value={selectedDatabase}
            onChange={onDatabaseChange}
            style={{ width: 150 }}
            size="small"
          >
            {databases.map(db => (
              <Option key={db} value={db}>
                {db}
              </Option>
            ))}
          </Select>
        </Space>
      }
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)' }}
      style={{ height: '100%', border: 'none' }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 工具栏 */}
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleExecuteQuery}
              loading={loading}
              disabled={!selectedDatabase || !activeConnectionId}
            >
              执行 (Ctrl+Enter)
            </Button>
            
            <Button
              icon={<SaveOutlined />}
              onClick={handleSaveQuery}
              disabled={!query.trim()}
            >
              保存
            </Button>
            
            <Button
              icon={<FormatPainterOutlined />}
              onClick={handleFormatQuery}
            >
              格式化
            </Button>
            
            <Button
              icon={<HistoryOutlined />}
              onClick={() => message.info('查询历史功能开发中...')}
            >
              历史
            </Button>

            <Select
              placeholder="选择模板"
              style={{ width: 150 }}
              size="small"
              onChange={(value) => setQuery(value)}
              allowClear
            >
              {queryTemplates.map(template => (
                <Option key={template.value} value={template.value}>
                  {template.label}
                </Option>
              ))}
            </Select>
          </Space>
        </div>

        {/* 编辑器 */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Editor
            height="100%"
            language="influxql"
            theme="vs-light"
            value={query}
            onChange={(value) => setQuery(value || '')}
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
      </div>
    </Card>
  );
};

export default QueryEditor;
