import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useConnectionStore } from '@/store/connection';
import {
  setEditorLanguageByDatabaseType,
  registerFluxLanguage,
  registerInfluxQLLanguage,
  createDatabaseSpecificCompletions
} from '@/utils/sqlIntelliSense';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DatabaseType } from '@/utils/sqlFormatter';
import type { EditorTab } from './TabManager';
import { useSmartSuggestion } from '@/hooks/useSmartSuggestion';
import { SmartSuggestionPopup } from './SmartSuggestionPopup';
import type { DataSourceType } from '@/utils/suggestionTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Scissors,
  Copy,
  Clipboard,
  MousePointer,
  Code,
  Play
} from 'lucide-react';
import { writeToClipboard, readFromClipboard } from '@/utils/clipboard';

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

  // 右键菜单状态
  const [contextMenu, setContextMenu] = React.useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
    hasSelection: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
    hasSelection: false,
  });

  // 获取数据源类型
  const getDataSourceType = useCallback((): DataSourceType => {
    const connection = connections.find(c => c.id === activeConnectionId);
    return (connection?.version as DataSourceType) || 'unknown';
  }, [connections, activeConnectionId]);

  // 智能提示Hook
  const {
    suggestions,
    position,
    visible: suggestionVisible,
    showSuggestions,
    hideSuggestions,
    selectSuggestion,
  } = useSmartSuggestion({
    connectionId: activeConnectionId || '',
    database: selectedDatabase || '',
    dataSourceType: getDataSourceType(),
  });

  // 注册所有语言支持（在组件初始化时）
  useEffect(() => {
    const registerAllLanguages = () => {
      try {
        const languages = monaco.languages.getLanguages();
        console.log('🔍 检查已注册的语言:', languages.map(l => l.id));

        // 注册InfluxQL和Flux语言支持
        console.log('🔧 开始注册自定义语言支持...');

        try {
          console.log('🔧 注册InfluxQL语言支持...');
          registerInfluxQLLanguage();
          console.log('✅ InfluxQL语言支持注册完成');

          // 验证InfluxQL注册
          const influxqlRegistered = languages.some(l => l.id === 'influxql');
          console.log('🔍 InfluxQL注册验证:', influxqlRegistered);
        } catch (influxqlError) {
          console.error('❌ InfluxQL注册失败:', influxqlError);
        }

        try {
          console.log('🔧 注册Flux语言支持...');
          registerFluxLanguage();
          console.log('✅ Flux语言支持注册完成');

          // 验证Flux注册
          const fluxRegistered = languages.some(l => l.id === 'flux');
          console.log('🔍 Flux注册验证:', fluxRegistered);
        } catch (fluxError) {
          console.error('❌ Flux注册失败:', fluxError);
        }

        // 确保SQL语言有正确的语法高亮
        console.log('🔧 确保SQL语法高亮...');
        monaco.languages.setMonarchTokensProvider('sql', {
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

              // SQL关键字
              [/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|OFFSET|SHOW|CREATE|DROP|DELETE|INSERT|INTO|VALUES|UPDATE|SET)\b/i, 'keyword'],
              [/\b(DATABASE|DATABASES|TABLE|TABLES|INDEX|INDEXES|VIEW|VIEWS|PROCEDURE|PROCEDURES|FUNCTION|FUNCTIONS)\b/i, 'keyword'],
              [/\b(AND|OR|NOT|IN|LIKE|BETWEEN|IS|NULL|TRUE|FALSE|AS|ASC|DESC|DISTINCT|ALL|ANY|SOME|EXISTS)\b/i, 'keyword'],
              [/\b(INNER|LEFT|RIGHT|FULL|OUTER|JOIN|ON|UNION|INTERSECT|EXCEPT|HAVING|CASE|WHEN|THEN|ELSE|END)\b/i, 'keyword'],

              // 聚合函数
              [/\b(COUNT|SUM|AVG|MIN|MAX|DISTINCT|GROUP_CONCAT|FIRST|LAST)\b/i, 'keyword.function'],

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
        console.log('✅ SQL语法高亮设置完成');

        // 为SQL定义专门的主题颜色
        console.log('🎨 定义SQL主题颜色...');
        monaco.editor.defineTheme('sql-light', {
          base: 'vs',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '008000', fontStyle: 'italic' },
            { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
            { token: 'keyword.function', foreground: 'FF0000', fontStyle: 'bold' },
            { token: 'string', foreground: 'A31515' },
            { token: 'number', foreground: '098658' },
            { token: 'operator', foreground: '000000' },
            { token: 'identifier', foreground: '000000' },
            { token: 'delimiter', foreground: '000000' },
            { token: 'bracket', foreground: '000000' },
          ],
          colors: {}
        });

        monaco.editor.defineTheme('sql-dark', {
          base: 'vs-dark',
          inherit: true,
          rules: [
            { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
            { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
            { token: 'keyword.function', foreground: 'DCDCAA', fontStyle: 'bold' },
            { token: 'string', foreground: 'CE9178' },
            { token: 'number', foreground: 'B5CEA8' },
            { token: 'operator', foreground: 'D4D4D4' },
            { token: 'identifier', foreground: 'D4D4D4' },
            { token: 'delimiter', foreground: 'D4D4D4' },
            { token: 'bracket', foreground: 'FFD700' },
          ],
          colors: {}
        });
        console.log('✅ SQL主题颜色定义成功');

      } catch (error) {
        console.warn('⚠️ 注册语言支持失败:', error);
      }
    };

    registerAllLanguages();
  }, []); // 只在组件初始化时执行一次

  // 获取编辑器语言类型
  const getEditorLanguage = useCallback(() => {
    // 如果没有活动连接，默认使用SQL
    if (!activeConnectionId) {
      console.log('没有活动连接，使用SQL语言');
      return 'sql';
    }

    const connection = connections.find(c => c.id === activeConnectionId);
    if (!connection) {
      console.log('找不到连接，使用SQL语言');
      return 'sql';
    }

    const databaseType = connection.version;
    console.log('数据库类型:', databaseType, '连接ID:', activeConnectionId);

    switch (databaseType) {
      case '1.x':
        console.log('使用InfluxQL语言');
        return 'influxql';
      case '2.x':
      case '3.x':
        console.log('使用Flux语言');
        return 'flux';
      default:
        console.log('使用SQL语言');
        return 'sql';
    }
  }, [connections, activeConnectionId]);

  // 获取编辑器主题
  const getEditorTheme = useCallback(() => {
    const currentLanguage = getEditorLanguage();
    const isDark = resolvedTheme === 'dark';

    if (currentLanguage === 'influxql') {
      return isDark ? 'influxql-dark' : 'influxql-light';
    } else if (currentLanguage === 'flux') {
      return isDark ? 'flux-dark' : 'flux-light';
    } else if (currentLanguage === 'sql') {
      return isDark ? 'sql-dark' : 'sql-light';
    }

    return isDark ? 'vs-dark' : 'vs';
  }, [getEditorLanguage, resolvedTheme]);

  // 处理编辑器内容变化
  const handleEditorChange = useCallback((value: string | undefined) => {
    const content = value || '';
    onContentChange(content);

    // 触发智能提示
    if (editorRef.current && content.length > 0) {
      // 延迟触发，避免频繁调用
      setTimeout(() => {
        if (editorRef.current) {
          showSuggestions(editorRef.current);
        }
      }, 100);
    }
  }, [onContentChange, showSuggestions]);



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

  // 右键菜单项处理函数（需要在handleEditorDidMount之前定义）
  const handleContextMenuAction = useCallback(async (action: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    console.log('🎯 执行右键菜单操作:', action);

    try {
      switch (action) {
        case 'cut':
          // 使用安全的剪贴板操作
          const selection = editor.getSelection();
          if (selection) {
            const selectedText = editor.getModel()?.getValueInRange(selection);
            if (selectedText) {
              await writeToClipboard(selectedText, {
                successMessage: '已剪切到剪贴板',
                showSuccess: false // 避免过多提示
              });
              // 删除选中的文本
              editor.executeEdits('contextmenu', [{
                range: selection,
                text: '',
                forceMoveMarkers: true
              }]);
            }
          }
          break;

        case 'copy':
          // 使用安全的剪贴板操作
          const copySelection = editor.getSelection();
          if (copySelection) {
            const selectedText = editor.getModel()?.getValueInRange(copySelection);
            if (selectedText) {
              await writeToClipboard(selectedText, {
                successMessage: '已复制到剪贴板',
                showSuccess: false // 避免过多提示
              });
            }
          }
          break;

        case 'paste':
          // 使用安全的剪贴板操作
          const clipboardText = await readFromClipboard({
            showError: false // 避免过多错误提示
          });
          if (clipboardText) {
            const position = editor.getPosition();
            if (position) {
              editor.executeEdits('contextmenu', [{
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                text: clipboardText,
                forceMoveMarkers: true
              }]);
            }
          }
          break;

        case 'selectAll':
          editor.trigger('keyboard', 'editor.action.selectAll', {});
          break;

        case 'format':
          editor.trigger('editor', 'editor.action.formatDocument', {});
          break;

        case 'execute':
          if (onExecuteQuery) {
            onExecuteQuery();
          }
          break;
      }
    } catch (error) {
      console.error('❌ 右键菜单操作失败:', error);
    }

    // 隐藏菜单
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onExecuteQuery]);

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

      // 注意：不在这里设置编辑器语言，因为Editor组件已经通过language属性设置了
      // 语言设置由Editor组件的language属性和key属性的变化来控制
      console.log('编辑器挂载，当前数据库类型:', databaseType, '语言:', getEditorLanguage());

      // 设置智能自动补全
      setupEnhancedAutoComplete(monaco, editor, databaseType, selectedDatabase);

      console.log('🎨 Monaco编辑器已挂载，使用原生主题:', resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light');

      // 语言支持已在组件初始化时注册，这里不需要重复注册
      console.log('🎯 编辑器挂载完成，当前语言:', getEditorLanguage());

      // 完全禁用Monaco编辑器的剪贴板功能，防止权限错误
      try {
        console.log('🚫 禁用Monaco编辑器剪贴板功能...');

        // 重写navigator.clipboard以阻止Monaco使用它
        const originalClipboard = (window as any).navigator.clipboard;
        if (originalClipboard) {
          console.log('🔒 重写navigator.clipboard API...');

          // 创建一个安全的剪贴板代理
          const safeClipboard = {
            writeText: async (text: string) => {
              console.log('🔄 Monaco尝试写入剪贴板，重定向到安全API:', text.substring(0, 50) + '...');
              try {
                await writeToClipboard(text, { showSuccess: false });
                return Promise.resolve();
              } catch (error) {
                console.warn('⚠️ 安全剪贴板写入失败:', error);
                return Promise.reject(error);
              }
            },
            readText: async () => {
              console.log('🔄 Monaco尝试读取剪贴板，重定向到安全API...');
              try {
                const text = await readFromClipboard({ showError: false });
                return Promise.resolve(text || '');
              } catch (error) {
                console.warn('⚠️ 安全剪贴板读取失败:', error);
                return Promise.reject(error);
              }
            },
            write: async (data: any) => {
              console.log('🔄 Monaco尝试使用clipboard.write()，重定向到安全API');
              try {
                // 尝试从ClipboardItem中提取文本
                if (data && data.length > 0) {
                  const item = data[0];
                  if (item && typeof item.getType === 'function') {
                    try {
                      const blob = await item.getType('text/plain');
                      const text = await blob.text();
                      await writeToClipboard(text, { showSuccess: false });
                      return Promise.resolve();
                    } catch (error) {
                      console.warn('⚠️ 从ClipboardItem提取文本失败:', error);
                    }
                  }
                }
                // 如果无法提取，静默成功
                return Promise.resolve();
              } catch (error) {
                console.warn('⚠️ 安全剪贴板写入失败:', error);
                return Promise.resolve(); // 静默成功，避免Monaco报错
              }
            },
            read: async () => {
              console.log('🔄 Monaco尝试使用clipboard.read()，重定向到安全API');
              try {
                const text = await readFromClipboard({ showError: false });
                if (text) {
                  // 创建ClipboardItem格式的数据
                  const blob = new Blob([text], { type: 'text/plain' });
                  return Promise.resolve([
                    {
                      types: ['text/plain'],
                      getType: async (type: string) => {
                        if (type === 'text/plain') {
                          return blob;
                        }
                        throw new Error('Type not supported');
                      }
                    }
                  ]);
                }
                return Promise.resolve([]);
              } catch (error) {
                console.warn('⚠️ 安全剪贴板读取失败:', error);
                return Promise.resolve([]);
              }
            }
          };

          // 替换navigator.clipboard
          Object.defineProperty((window as any).navigator, 'clipboard', {
            value: safeClipboard,
            writable: false,
            configurable: false
          });

          console.log('✅ Monaco编辑器剪贴板功能已安全重写');
        }
      } catch (clipboardError) {
        console.warn('⚠️ 重写剪贴板功能失败:', clipboardError);
      }

      // 检查语法高亮状态（语言已通过Editor组件的language属性设置）
      const model = editor.getModel();
      if (model) {
        const currentLanguage = getEditorLanguage();
        console.log('🔍 检查编辑器语言设置:', currentLanguage);

        // 检查当前模型状态
        console.log('📋 当前模型信息:', {
          language: model.getLanguageId(),
          uri: model.uri.toString(),
          lineCount: model.getLineCount(),
          value: model.getValue().substring(0, 50) + '...'
        });

        // 验证语言是否正确设置（由Editor组件处理）
        const actualLanguage = model.getLanguageId();
        console.log('✅ 语言设置状态:', {
          expected: currentLanguage,
          actual: actualLanguage,
          isCorrect: actualLanguage === currentLanguage
        });

        // 检查语言注册状态
        console.log('🎨 检查语言注册状态...');
        try {
          // 获取所有已注册的语言
          const languages = monaco.languages.getLanguages();
          console.log('📝 已注册的语言数量:', languages.length);

          // 检查我们的自定义语言是否在列表中
          const hasInfluxQL = languages.some(l => l.id === 'influxql');
          const hasFlux = languages.some(l => l.id === 'flux');
          console.log('🔍 自定义语言检查:', { hasInfluxQL, hasFlux });
        } catch (error) {
          console.error('❌ 检查语言时出错:', error);
        }

        // 根据语言和主题设置对应的编辑器主题
        const isDark = resolvedTheme === 'dark';
        let themeName = isDark ? 'vs-dark' : 'vs';

        if (currentLanguage === 'influxql') {
          themeName = isDark ? 'influxql-dark' : 'influxql-light';
        } else if (currentLanguage === 'flux') {
          themeName = isDark ? 'flux-dark' : 'flux-light';
        } else if (currentLanguage === 'sql') {
          // 为SQL语言也设置专门的主题
          themeName = isDark ? 'sql-dark' : 'sql-light';
        }

        console.log('🎨 设置编辑器主题为:', themeName, '(当前主题模式:', resolvedTheme, ')');

        try {
          monaco.editor.setTheme(themeName);
          console.log('✅ 主题设置成功');
        } catch (themeError) {
          console.error('❌ 主题设置失败:', themeError);
          // 回退到默认主题
          const fallbackTheme = isDark ? 'vs-dark' : 'vs';
          console.log('🔄 回退到默认主题:', fallbackTheme);
          monaco.editor.setTheme(fallbackTheme);
        }

        // 检查编辑器当前状态
        console.log('📊 编辑器当前状态:', {
          language: model.getLanguageId(),
          theme: 'unknown', // Monaco没有直接获取当前主题的API
          hasContent: model.getValue().length > 0,
          lineCount: model.getLineCount()
        });

        // 触发重新渲染以应用语法高亮
        setTimeout(() => {
          console.log('🔄 触发编辑器重新渲染...');
          try {
            editor.trigger('editor', 'editor.action.formatDocument', {});
            console.log('✅ 重新渲染触发成功');
          } catch (formatError) {
            console.warn('⚠️ 格式化触发失败:', formatError);
          }

          // 强制重新计算语法高亮
          setTimeout(() => {
            console.log('🎨 强制重新计算语法高亮...');
            try {
              // 获取当前内容
              const content = model.getValue();

              // 方法1: 强制重新tokenize
              try {
                console.log('🔄 方法1: 强制重新tokenize...');
                // 触发模型的重新tokenization
                (model as any)._tokenization?.forceTokenization?.(model.getLineCount());
                console.log('✅ 强制tokenization完成');
              } catch (tokenError) {
                console.warn('⚠️ 强制tokenization失败:', tokenError);
              }

              // 方法2: 重新设置模型内容
              if (content.trim()) {
                console.log('🔄 方法2: 重新设置模型内容...');
                // 临时清空内容再恢复，强制重新解析
                model.setValue('');
                setTimeout(() => {
                  model.setValue(content);
                  console.log('✅ 模型内容重新设置完成');

                  // 方法3: 手动触发语法高亮更新
                  setTimeout(() => {
                    console.log('🔄 方法3: 手动触发语法高亮更新...');
                    try {
                      // 触发编辑器重新渲染
                      editor.render(true);
                      console.log('✅ 编辑器重新渲染完成');

                      // 检查tokenization状态
                      const lineCount = model.getLineCount();
                      console.log('📊 tokenization状态检查:', {
                        lineCount,
                        language: model.getLanguageId(),
                        hasContent: content.length > 0
                      });

                      // 详细检查第一行的tokenization
                      if (lineCount > 0 && content.trim()) {
                        try {
                          console.log('🔍 检查第一行tokenization...');
                          const firstLine = model.getLineContent(1);
                          console.log('📝 第一行内容:', firstLine);

                          // 尝试获取tokens
                          const lineTokens = monaco.editor.tokenize(firstLine, model.getLanguageId());
                          console.log('🎨 第一行tokens:', lineTokens);

                          // 检查是否有语法高亮的CSS类
                          setTimeout(() => {
                            const editorDom = editor.getDomNode();
                            if (editorDom) {
                              const tokenElements = editorDom.querySelectorAll('.mtk1, .mtk2, .mtk3, .mtk4, .mtk5, .mtk6, .mtk7, .mtk8, .mtk9, .mtk10');
                              console.log('🎨 找到的token元素数量:', tokenElements.length);

                              if (tokenElements.length > 0) {
                                console.log('🎨 前5个token元素的类名:',
                                  Array.from(tokenElements).slice(0, 5).map(el => el.className)
                                );
                              } else {
                                console.warn('⚠️ 没有找到任何token元素，语法高亮可能没有应用');

                                // 如果没有找到token元素，尝试强制刷新语法高亮
                                console.log('🔄 尝试强制刷新语法高亮...');
                                try {
                                  // 方法1: 重新设置语言
                                  const currentLang = model.getLanguageId();
                                  monaco.editor.setModelLanguage(model, 'plaintext');
                                  setTimeout(() => {
                                    monaco.editor.setModelLanguage(model, currentLang);
                                    console.log('✅ 语言重新设置完成');
                                  }, 100);

                                  // 方法2: 触发重新tokenization
                                  setTimeout(() => {
                                    editor.trigger('editor', 'editor.action.reindentlines', {});
                                    console.log('✅ 重新tokenization触发完成');
                                  }, 200);
                                } catch (refreshError) {
                                  console.error('❌ 强制刷新语法高亮失败:', refreshError);
                                }
                              }
                            }
                          }, 200);

                        } catch (tokenError) {
                          console.error('❌ 检查tokenization失败:', tokenError);
                        }
                      }

                    } catch (renderError) {
                      console.warn('⚠️ 编辑器重新渲染失败:', renderError);
                    }
                  }, 100);
                }, 50);
              }

              console.log('✅ 语法高亮强制刷新完成');
            } catch (refreshError) {
              console.warn('⚠️ 强制刷新失败:', refreshError);
            }
          }, 100);
        }, 100);
      } else {
        console.error('❌ 无法获取编辑器模型');
      }

      // 编辑器选项已通过Editor组件的options属性设置，无需重复配置

      // 添加快捷键
      console.log('🎯 注册Monaco编辑器快捷键...');

      // 执行查询快捷键 (Ctrl+Enter)
      const executeCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        console.log('🚀 快捷键触发：执行查询 (Ctrl+Enter)');
        if (onExecuteQuery) {
          onExecuteQuery();
        }
      });
      console.log('✅ 执行查询快捷键注册成功，ID:', executeCommandId);

      // 格式化代码快捷键 (Shift+Alt+F)
      const formatCommandId = editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
        console.log('🎨 快捷键触发：格式化代码 (Shift+Alt+F)');
        editor.trigger('keyboard', 'editor.action.formatDocument', {});
      });
      console.log('✅ 格式化代码快捷键注册成功，ID:', formatCommandId);

      // 注释/取消注释快捷键 (Ctrl+/)
      const commentCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        console.log('💬 快捷键触发：切换注释 (Ctrl+/)');
        editor.trigger('keyboard', 'editor.action.commentLine', {});
      });
      console.log('✅ 注释切换快捷键注册成功，ID:', commentCommandId);

      // 安全的剪贴板快捷键
      const copyCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        console.log('📋 快捷键触发：复制 (Ctrl+C)');
        handleContextMenuAction('copy');
      });
      console.log('✅ 复制快捷键注册成功，ID:', copyCommandId);

      const cutCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        console.log('✂️ 快捷键触发：剪切 (Ctrl+X)');
        handleContextMenuAction('cut');
      });
      console.log('✅ 剪切快捷键注册成功，ID:', cutCommandId);

      const pasteCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        console.log('📄 快捷键触发：粘贴 (Ctrl+V)');
        handleContextMenuAction('paste');
      });
      console.log('✅ 粘贴快捷键注册成功，ID:', pasteCommandId);

      // 撤销/重做快捷键
      const undoCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
        console.log('↶ 快捷键触发：撤销 (Ctrl+Z)');
        editor.trigger('keyboard', 'undo', {});
      });
      console.log('✅ 撤销快捷键注册成功，ID:', undoCommandId);

      const redoCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
        console.log('↷ 快捷键触发：重做 (Ctrl+Y)');
        editor.trigger('keyboard', 'redo', {});
      });
      console.log('✅ 重做快捷键注册成功，ID:', redoCommandId);

      // 全选快捷键
      const selectAllCommandId = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
        console.log('🔘 快捷键触发：全选 (Ctrl+A)');
        editor.trigger('keyboard', 'editor.action.selectAll', {});
      });
      console.log('✅ 全选快捷键注册成功，ID:', selectAllCommandId);

      // 添加自定义右键菜单
      editor.onContextMenu((e) => {
        console.log('🖱️ Monaco编辑器右键菜单事件:', e);

        // 阻止默认菜单
        e.event.preventDefault();
        e.event.stopPropagation();

        // 获取选中的文本
        const selection = editor.getSelection();
        const selectedText = selection ? editor.getModel()?.getValueInRange(selection) : '';

        // 获取光标位置
        const position = editor.getPosition();
        const lineContent = position ? editor.getModel()?.getLineContent(position.lineNumber) : '';

        console.log('📝 编辑器上下文信息:', {
          selectedText,
          position,
          lineContent,
          hasSelection: !!selectedText
        });

        // 创建自定义右键菜单项
        const menuItems = [
          {
            id: 'cut',
            label: '剪切',
            icon: 'scissors',
            disabled: !selectedText,
            action: () => {
              editor.trigger('keyboard', 'editor.action.clipboardCutAction', {});
            }
          },
          {
            id: 'copy',
            label: '复制',
            icon: 'copy',
            disabled: !selectedText,
            action: () => {
              editor.trigger('keyboard', 'editor.action.clipboardCopyAction', {});
            }
          },
          {
            id: 'paste',
            label: '粘贴',
            icon: 'clipboard',
            action: () => {
              editor.trigger('keyboard', 'editor.action.clipboardPasteAction', {});
            }
          },
          {
            id: 'separator1',
            type: 'separator'
          },
          {
            id: 'selectAll',
            label: '全选',
            icon: 'select-all',
            action: () => {
              editor.trigger('keyboard', 'editor.action.selectAll', {});
            }
          },
          {
            id: 'separator2',
            type: 'separator'
          },
          {
            id: 'format',
            label: '格式化代码',
            icon: 'code',
            action: () => {
              editor.trigger('editor', 'editor.action.formatDocument', {});
            }
          },
          {
            id: 'execute',
            label: '执行查询 (Ctrl+Enter)',
            icon: 'play',
            action: () => {
              if (onExecuteQuery) {
                onExecuteQuery();
              }
            }
          }
        ];

        // 显示自定义右键菜单
        console.log('🎯 应该显示自定义右键菜单，菜单项:', menuItems);

        // 获取鼠标位置 - 使用全局坐标
        const x = e.event.browserEvent.clientX;
        const y = e.event.browserEvent.clientY;

        console.log('🖱️ 鼠标位置:', { x, y });

        setContextMenu({
          visible: true,
          x,
          y,
          selectedText,
          hasSelection: !!selectedText,
        });
      });

      // 添加手动触发智能提示的快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        showSuggestions(editor, true);
      });

      // 监听光标位置变化
      editor.onDidChangeCursorPosition(() => {
        if (suggestionVisible) {
          hideSuggestions();
        }
      });

      // 监听内容变化
      editor.onDidChangeModelContent((e) => {
        // 检查是否输入了空格
        const changes = e.changes;
        const hasSpaceInput = changes.some(change =>
          change.text === ' ' || change.text.includes(' ')
        );

        // 如果输入了空格，延迟触发提示（允许空格正常输入）
        if (hasSpaceInput) {
          setTimeout(() => showSuggestions(editor), 200);
        } else {
          showSuggestions(editor);
        }
      });

      // 监听失去焦点
      editor.onDidBlurEditorText(() => {
        // 延迟隐藏，避免点击提示项时立即隐藏
        setTimeout(() => {
          hideSuggestions();
        }, 150);
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
  }, [connections, activeConnectionId, selectedDatabase, setupEnhancedAutoComplete, resolvedTheme, onExecuteQuery, showSuggestions, hideSuggestions, suggestionVisible]);

  // 点击其他地方隐藏右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(prev => ({ ...prev, visible: false }));
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
      };
    }
  }, [contextMenu.visible]);

  // 监听数据源变化，记录日志
  useEffect(() => {
    if (currentTab?.type === 'query') {
      const connection = connections.find(c => c.id === activeConnectionId);
      const databaseType = connection?.version || 'unknown';

      console.log('🔄 数据源变化，当前数据库类型:', databaseType, '语言:', getEditorLanguage());
      // 语言更新由Editor组件的key属性变化自动处理
    }
  }, [activeConnectionId, connections, currentTab?.type, getEditorLanguage]);

  if (!currentTab) {
    return null;
  }

  return (
    <div className="relative h-full">
      <Editor
      height='100%'
      language={getEditorLanguage()}
      theme={getEditorTheme()}
      value={currentTab.content}
      onChange={handleEditorChange}
      onMount={handleEditorDidMount}
      key={`${currentTab.id}-${resolvedTheme}-${getEditorLanguage()}-${activeConnectionId || 'no-connection'}`} // 强制重新渲染以应用主题和语言
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
        // 禁用Monaco内置的智能提示，使用我们的自定义提示
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        parameterHints: { enabled: false },
        formatOnPaste: true,
        formatOnType: true,
        acceptSuggestionOnEnter: 'off',
        tabCompletion: 'off',
        hover: { enabled: true },
        wordBasedSuggestions: 'off',
        // 桌面应用：禁用默认右键菜单，使用自定义中文菜单
        contextmenu: false,
        // 关键：完全禁用所有可能触发剪贴板权限的功能
        copyWithSyntaxHighlighting: false,  // 禁用语法高亮复制
        links: false,
        dragAndDrop: false,
        selectionClipboard: false,
        // 禁用所有剪贴板相关的快捷键和操作
        multiCursorModifier: 'alt',  // 避免Ctrl+C等快捷键冲突
        useTabStops: false,
        accessibilitySupport: 'off',
        // 禁用可能触发剪贴板的编辑器功能
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'never',  // 避免从选择中获取搜索字符串
        },
      }}
      />

      {/* 智能提示弹框 */}
      <SmartSuggestionPopup
        suggestions={suggestions}
        position={position}
        visible={suggestionVisible}
        onSelect={(item) => {
          if (editorRef.current) {
            selectSuggestion(item, editorRef.current);
          }
        }}
        onClose={hideSuggestions}
      />

      {/* 自定义右键菜单 */}
      {contextMenu.visible && (
        <div
          className="fixed z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <Card className="min-w-48 shadow-lg border">
            <CardContent className="p-1">
              <div className="space-y-1">
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm font-medium"
                  onClick={() => handleContextMenuAction('execute')}
                >
                  <Play className="w-4 h-4" />
                  执行查询 (Ctrl+Enter)
                </button>
                <Separator />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!contextMenu.hasSelection}
                  onClick={() => handleContextMenuAction('cut')}
                >
                  <Scissors className="w-4 h-4" />
                  剪切
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!contextMenu.hasSelection}
                  onClick={() => handleContextMenuAction('copy')}
                >
                  <Copy className="w-4 h-4" />
                  复制
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleContextMenuAction('paste')}
                >
                  <Clipboard className="w-4 h-4" />
                  粘贴
                </button>
                <Separator />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleContextMenuAction('selectAll')}
                >
                  <MousePointer className="w-4 h-4" />
                  全选
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleContextMenuAction('format')}
                >
                  <Code className="w-4 h-4" />
                  格式化代码
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


