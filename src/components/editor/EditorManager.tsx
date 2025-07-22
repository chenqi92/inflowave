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

      // 强制刷新语法高亮
      const model = editor.getModel();
      if (model) {
        const currentLanguage = getEditorLanguage();
        console.log('🔄 强制设置编辑器语言为:', currentLanguage);

        // 检查当前模型状态
        console.log('📋 当前模型信息:', {
          language: model.getLanguageId(),
          uri: model.uri.toString(),
          lineCount: model.getLineCount(),
          value: model.getValue().substring(0, 50) + '...'
        });

        // 设置语言
        monaco.editor.setModelLanguage(model, currentLanguage);

        // 验证语言是否设置成功
        const actualLanguage = model.getLanguageId();
        console.log('✅ 语言设置结果:', {
          expected: currentLanguage,
          actual: actualLanguage,
          success: actualLanguage === currentLanguage
        });

        // 检查可用的主题
        console.log('🎨 检查可用主题...');
        try {
          // 获取所有已注册的语言
          const languages = monaco.languages.getLanguages();
          console.log('📝 已注册的语言:', languages.map(l => l.id));

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

      // 设置编辑器选项（保持与Editor组件中的options一致）
      editor.updateOptions({
        fontSize: 14,
        lineHeight: 20,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
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
        autoIndent: 'full',
        wordSeparators: '`~!@#$%^&*()=+[{]}\\|;:\'",.<>/?',
      });

      // 添加快捷键
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        // 执行查询
        if (onExecuteQuery) {
          onExecuteQuery();
        }
      });

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

        // 获取鼠标位置
        const rect = editor.getDomNode()?.getBoundingClientRect();
        const x = rect ? rect.left + e.event.posx : e.event.posx;
        const y = rect ? rect.top + e.event.posy : e.event.posy;

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

  // 右键菜单项处理函数
  const handleContextMenuAction = useCallback((action: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    console.log('🎯 执行右键菜单操作:', action);

    switch (action) {
      case 'cut':
        editor.trigger('keyboard', 'editor.action.clipboardCutAction', {});
        break;
      case 'copy':
        editor.trigger('keyboard', 'editor.action.clipboardCopyAction', {});
        break;
      case 'paste':
        editor.trigger('keyboard', 'editor.action.clipboardPasteAction', {});
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

    // 隐藏菜单
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onExecuteQuery]);

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
      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
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
        // 关键：禁用所有可能触发剪贴板权限的功能，但保持语法高亮
        copyWithSyntaxHighlighting: true,  // 保持语法高亮
        links: false,
        dragAndDrop: false,
        selectionClipboard: false,
        useTabStops: false,
        multiCursorModifier: 'alt',
        accessibilitySupport: 'off',
        find: {
          addExtraSpaceOnTop: false,
          autoFindInSelection: 'never',
          seedSearchStringFromSelection: 'never',
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
                <Separator />
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleContextMenuAction('format')}
                >
                  <Code className="w-4 h-4" />
                  格式化代码
                </button>
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                  onClick={() => handleContextMenuAction('execute')}
                >
                  <Play className="w-4 h-4" />
                  执行查询 (Ctrl+Enter)
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};


