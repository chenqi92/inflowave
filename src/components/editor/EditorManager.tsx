import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useConnectionStore } from '@/store/connection';
import { 
  setEditorLanguageByDatabaseType,
  registerFluxLanguage,
  createDatabaseSpecificCompletions
} from '@/utils/sqlIntelliSense';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DatabaseType } from '@/utils/sqlFormatter';
import type { EditorTab } from './TabManager';

interface EditorManagerProps {
  currentTab: EditorTab | null;
  selectedDatabase: string;
  databases: string[];
  onContentChange: (content: string) => void;
  onExecuteQuery?: () => void;
}

export const EditorManager: React.FC<EditorManagerProps> = ({
  currentTab,
  selectedDatabase,
  databases,
  onContentChange,
  onExecuteQuery,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const { resolvedTheme } = useTheme();
  const { activeConnectionId, connections } = useConnectionStore();

  // 获取编辑器语言类型
  const getEditorLanguage = useCallback(() => {
    const connection = connections.find(c => c.id === activeConnectionId);
    const databaseType = connection?.version || 'unknown';
    
    switch (databaseType) {
      case '1.x':
        return 'influxql';
      case '2.x':
      case '3.x':
        return 'flux';
      default:
        return 'sql';
    }
  }, [connections, activeConnectionId]);

  // 注册InfluxQL语言支持
  const registerInfluxQLLanguage = useCallback(() => {
    // 注册语言
    monaco.languages.register({ id: 'influxql' });

    // 设置InfluxQL语法高亮
    monaco.languages.setMonarchTokensProvider('influxql', {
      tokenizer: {
        root: [
          // 注释
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // 字符串
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/'/, 'string', '@string_single'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          
          // 数字
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],
          
          // InfluxQL关键字
          [/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|SHOW|CREATE|DROP|DELETE|INSERT|INTO|VALUES)\b/i, 'keyword'],
          [/\b(DATABASES|MEASUREMENTS|SERIES|TAG|FIELD|TIME|RETENTION|POLICY|CONTINUOUS|QUERY|USER|USERS)\b/i, 'keyword'],
          [/\b(AND|OR|NOT|IN|LIKE|REGEXP|AS|ASC|DESC|FILL|NULL|NONE|LINEAR|PREVIOUS|NOW|DURATION)\b/i, 'keyword'],
          
          // 聚合函数
          [/\b(MEAN|MEDIAN|MODE|SPREAD|STDDEV|SUM|COUNT|DISTINCT|INTEGRAL|DERIVATIVE|DIFFERENCE)\b/i, 'keyword.function'],
          [/\b(NON_NEGATIVE_DERIVATIVE|MOVING_AVERAGE|CUMULATIVE_SUM|HOLT_WINTERS|PERCENTILE)\b/i, 'keyword.function'],
          [/\b(TOP|BOTTOM|FIRST|LAST|MAX|MIN|SAMPLE)\b/i, 'keyword.function'],
          
          // 操作符
          [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
          
          // 分隔符
          [/[;,.]/, 'delimiter'],
          [/[()[\]{}]/, 'bracket'],
          
          // 标识符
          [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          
          // 空白字符
          [/[ \t\r\n]+/, 'white'],
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ],
        
        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
      },
    });

    console.log('🎨 InfluxQL语法高亮已设置');
  }, []);

  // 增强的智能提示设置函数
  const setupEnhancedAutoComplete = useCallback((
    monaco: any,
    editor: monaco.editor.IStandaloneCodeEditor,
    databaseType: DatabaseType,
    database: string
  ) => {
    // 注册智能提示提供者
    const disposable = monaco.languages.registerCompletionItemProvider(
      databaseType === '2.x' || databaseType === '3.x' ? 'flux' : 'sql',
      {
        provideCompletionItems: async (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          try {
            // 获取数据库特定的智能提示
            const completions = createDatabaseSpecificCompletions(
              databaseType,
              range,
              {
                databases: databases,
                // 这里可以添加更多上下文信息，如测量名、字段名等
              }
            );

            // 如果有活跃连接和数据库，获取动态建议
            if (activeConnectionId && database) {
              try {
                const suggestions = await safeTauriInvoke<string[]>(
                  'get_query_suggestions',
                  {
                    connectionId: activeConnectionId,
                    database: database,
                    partialQuery: word.word || '',
                  }
                );

                if (suggestions && suggestions.length > 0) {
                  suggestions.forEach(suggestion => {
                    completions.push({
                      label: suggestion,
                      kind: monaco.languages.CompletionItemKind.Class,
                      insertText: `"${suggestion}"`,
                      documentation: `测量: ${suggestion}`,
                      range,
                    });
                  });
                }
              } catch (error) {
                console.warn('获取动态建议失败:', error);
              }
            }

            return { suggestions: completions };
          } catch (error) {
            console.error('智能提示提供失败:', error);
            return { suggestions: [] };
          }
        },
      }
    );

    // 返回清理函数
    return () => disposable.dispose();
  }, [activeConnectionId, databases]);

  // 编辑器挂载处理
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monaco: any) => {
    try {
      editorRef.current = editor;

      // 确保Monaco环境配置正确，禁用Web Workers
      if (typeof window !== 'undefined') {
        if (!window.MonacoEnvironment) {
          window.MonacoEnvironment = {};
        }

        // 强制禁用Web Workers
        window.MonacoEnvironment.getWorkerUrl = () => 'data:text/javascript;charset=utf-8,';
        window.MonacoEnvironment.getWorker = () => ({
          postMessage: () => {},
          terminate: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
          onmessage: null,
          onmessageerror: null,
          onerror: null,
        } as any);
      }

      // 根据选择的数据源类型设置智能提示
      const currentConnection = connections.find(c => c.id === activeConnectionId);
      const databaseType = (currentConnection?.version || 'unknown') as DatabaseType;
      
      // 设置编辑器语言
      setEditorLanguageByDatabaseType(editor, databaseType);
      
      // 设置智能自动补全
      setupEnhancedAutoComplete(monaco, editor, databaseType, selectedDatabase);

      console.log('🎨 Monaco编辑器已挂载，使用原生主题:', resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light');

      // 注册语言支持（只注册一次）
      try {
        const languages = monaco.languages.getLanguages();
        
        // 注册InfluxQL语言支持
        const isInfluxQLRegistered = languages.some((lang: any) => lang.id === 'influxql');
        if (!isInfluxQLRegistered) {
          console.log('🔧 注册InfluxQL语言支持...');
          registerInfluxQLLanguage();
          console.log('✅ InfluxQL语言支持注册完成');
        }

        // 注册Flux语言支持
        const isFluxRegistered = languages.some((lang: any) => lang.id === 'flux');
        if (!isFluxRegistered) {
          console.log('🔧 注册Flux语言支持...');
          registerFluxLanguage();
          console.log('✅ Flux语言支持注册完成');
        }
      } catch (error) {
        console.debug('⚠️ 注册语言支持失败:', error);
      }

      // 设置编辑器选项
      editor.updateOptions({
        fontSize: 14,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        automaticLayout: true,
        // 增强智能提示
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true, // 在字符串中也显示提示（用于测量名）
        },
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        parameterHints: { enabled: true },
        hover: { enabled: true },
        // 增加更多提示配置
        quickSuggestionsDelay: 50, // 减少延迟到50ms
        suggestSelection: 'first', // 默认选择第一个建议
        // 自动触发提示的字符
        autoIndent: 'full',
        // 更敏感的提示设置
        wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
        // 禁用一些可能导致Web Worker问题的功能
        // 注意：这些选项需要使用正确的Monaco编辑器API
      });

      // 添加快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        // 执行查询
        if (onExecuteQuery) {
          onExecuteQuery();
        }
      });

      // 添加手动触发智能提示的快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        editor.trigger('manual', 'editor.action.triggerSuggest', {});
      });

      // 通过API禁用一些可能导致问题的功能
      try {
        // 禁用语义高亮（如果支持）
        const model = editor.getModel();
        if (model && monaco.editor.setModelLanguage) {
          // 设置语言时禁用一些高级功能
        }
      } catch (error) {
        console.debug('设置编辑器高级选项时出错:', error);
      }

    } catch (error) {
      console.error('⚠️ Monaco编辑器挂载失败:', error);
    }
  }, [connections, activeConnectionId, selectedDatabase, setupEnhancedAutoComplete, registerInfluxQLLanguage, resolvedTheme, onExecuteQuery]);

  // 监听数据源变化，更新编辑器语言
  useEffect(() => {
    if (editorRef.current && currentTab?.type === 'query') {
      const connection = connections.find(c => c.id === activeConnectionId);
      const databaseType = connection?.version || 'unknown';
      
      // 设置编辑器语言
      setEditorLanguageByDatabaseType(editorRef.current, databaseType as DatabaseType);
      
      console.log('🔄 编辑器语言已更新:', databaseType);
    }
  }, [activeConnectionId, connections, currentTab?.type]);

  if (!currentTab) {
    return null;
  }

  return (
    <Editor
      height='100%'
      language={getEditorLanguage()}
      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
      value={currentTab.content}
      onChange={(value) => onContentChange(value || '')}
      onMount={handleEditorDidMount}
      key={`${currentTab.id}-${resolvedTheme}`} // 强制重新渲染以应用主题
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
        // 智能提示配置
        suggestOnTriggerCharacters: true,
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        parameterHints: { enabled: true },
        formatOnPaste: false, // 禁用粘贴格式化，避免剪贴板操作
        formatOnType: false, // 禁用自动格式化，避免内部操作
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        hover: { enabled: true },
        quickSuggestionsDelay: 50,
        suggestSelection: 'first',
        // 禁用右键菜单，使用自定义菜单
        contextmenu: false,
        // 基本剪贴板配置
        copyWithSyntaxHighlighting: false,
        selectionClipboard: false,
      }}
    />
  );
};


