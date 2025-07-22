import React, { useRef, useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useConnectionStore } from '@/store/connection';
import {
  setEditorLanguageByDatabaseVersion,
  createDatabaseSpecificCompletions
} from '@/utils/sqlIntelliSense';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DatabaseType } from '@/utils/sqlFormatter';
import type { EditorTab } from './TabManager';
import { useSmartSuggestion } from '@/hooks/useSmartSuggestion';
import { SmartSuggestionPopup } from './SmartSuggestionPopup';
import type { DataSourceType } from '@/utils/suggestionTypes';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/Separator';
import {
  Scissors,
  Copy,
  Clipboard,
  MousePointer,
  Code,
  Play
} from 'lucide-react';
import { writeToClipboard, readFromClipboard } from '@/utils/clipboard';
import { unifiedSyntaxManager } from '@/utils/unifiedSyntaxHighlight';
import { versionToLanguageType, type DatabaseLanguageType } from '@/types/database';



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
  // 键盘事件清理函数引用
  const keyboardCleanupRef = useRef<(() => void) | null>(null);
  const { resolvedTheme } = useTheme();
  const { activeConnectionId, connections } = useConnectionStore();

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
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
        // 检查 monaco 是否可用
        if (!monaco || !monaco.languages) {
          console.warn('⚠️ Monaco编辑器尚未加载，跳过语言注册');
          return;
        }

        const languages = monaco.languages.getLanguages();
        console.log('🔍 检查已注册的语言:', languages.map(l => l.id));

        // 语言注册已移到 handleEditorDidMount 中
        console.log('⚠️ 语言注册已移到编辑器挂载后执行');





      } catch (error) {
        console.warn('⚠️ 注册语言支持失败:', error);
      }
    };

    registerAllLanguages();
  }, []); // 只在组件初始化时执行一次

  // 监听连接状态变化，主动刷新语法高亮
  useEffect(() => {
    if (!editorRef.current) return;

    console.log('🔄 连接状态变化，检查语法高亮...');
    const editor = editorRef.current;
    const model = editor.getModel();

    if (model) {
      // 延迟执行，确保连接状态已稳定
      const timer = setTimeout(() => {
        try {
          // 使用简化语法高亮系统
          const languageType = getDatabaseLanguageType();
          const currentLanguage = unifiedSyntaxManager.getLanguageId(languageType);
          const currentTheme = unifiedSyntaxManager.getThemeName(languageType, resolvedTheme === 'dark');

          console.log('🔧 连接状态变化后重新应用简化语言和主题:', {
            languageType: languageType,
            language: currentLanguage,
            theme: currentTheme,
            connectionId: activeConnectionId
          });

          // 重新设置语言
          monaco.editor.setModelLanguage(model, currentLanguage);

          // 重新应用主题
          monaco.editor.setTheme(currentTheme);

          // 触发重新渲染
          editor.render(true);

          // 验证语法高亮
          setTimeout(() => {
            unifiedSyntaxManager.validateSyntaxHighlight(editor);
          }, 300);

          console.log('✅ 连接状态变化后语法高亮刷新完成');
        } catch (error) {
          console.warn('⚠️ 连接状态变化后语法高亮刷新失败:', error);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [activeConnectionId]); // 依赖连接ID变化

  // 组件卸载时清理键盘事件监听器
  useEffect(() => {
    return () => {
      if (keyboardCleanupRef.current) {
        console.log('🧹 清理键盘事件监听器');
        keyboardCleanupRef.current();
        keyboardCleanupRef.current = null;
      }
    };
  }, []);

  // 获取数据库语言类型
  const getDatabaseLanguageType = useCallback((): DatabaseLanguageType => {
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

    const languageType = versionToLanguageType(connection.version || 'unknown');
    console.log('数据库版本:', connection.version, '语言类型:', languageType, '连接ID:', activeConnectionId);

    return languageType;
  }, [connections, activeConnectionId]);

  // 获取编辑器语言ID
  const getEditorLanguage = useCallback(() => {
    const languageType = getDatabaseLanguageType();
    return unifiedSyntaxManager.getLanguageId(languageType);
  }, [getDatabaseLanguageType]);

  // 获取编辑器主题
  const getEditorTheme = useCallback(() => {
    const languageType = getDatabaseLanguageType();
    const isDark = resolvedTheme === 'dark';
    const themeName = unifiedSyntaxManager.getThemeName(languageType, isDark);

    console.log('🎨 getEditorTheme调用:', {
      languageType,
      resolvedTheme,
      isDark,
      themeName
    });

    console.log('🎨 选择的简化主题:', themeName);
    return themeName;
  }, [getDatabaseLanguageType, resolvedTheme]);

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
    _monacoInstance: typeof monaco,
    editor: monaco.editor.IStandaloneCodeEditor,
    databaseType: DatabaseType,
    database: string
  ) => {
    // 注册智能提示提供者
    const disposable = monaco.languages.registerCompletionItemProvider(
      databaseType === '2.x' || databaseType === '3.x' ? 'flux' : 'sql',
      {
        provideCompletionItems: async (model: monaco.editor.ITextModel, position: monaco.Position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn || position.column,
            endColumn: word.endColumn || position.column,
          };

          try {
            // 获取数据库特定的智能提示
            const completions = createDatabaseSpecificCompletions(
              databaseType,
              range,
              {
                databases,
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
                    database,
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
          { const selection = editor.getSelection();
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
          break; }

        case 'copy':
          // 使用安全的剪贴板操作
          { const copySelection = editor.getSelection();
          if (copySelection) {
            const selectedText = editor.getModel()?.getValueInRange(copySelection);
            if (selectedText) {
              await writeToClipboard(selectedText, {
                successMessage: '已复制到剪贴板',
                showSuccess: false // 避免过多提示
              });
            }
          }
          break; }

        case 'paste':
          // 使用安全的剪贴板操作
          { const clipboardText = await readFromClipboard({
            showError: false // 避免过多错误提示
          });
          if (clipboardText) {
            const selection = editor.getSelection();
            if (selection) {
              // 如果有选中内容，替换选中的内容
              editor.executeEdits('contextmenu', [{
                range: selection,
                text: clipboardText,
                forceMoveMarkers: true
              }]);
            } else {
              // 如果没有选中内容，在当前位置插入
              const position = editor.getPosition();
              if (position) {
                editor.executeEdits('contextmenu', [{
                  range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                  text: clipboardText,
                  forceMoveMarkers: true
                }]);
              }
            }
          }
          break; }

        case 'selectAll':
          editor.trigger('keyboard', 'editor.action.selectAll', {});
          break;

        case 'format':
          editor.trigger('editor', 'editor.action.formatDocument', {});
          break;

        case 'execute':
          onExecuteQuery?.();
          break;
      }
    } catch (error) {
      console.error('❌ 右键菜单操作失败:', error);
    }

    // 隐藏菜单
    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onExecuteQuery]);

  // 编辑器挂载处理
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor, _monacoInstance: typeof monaco) => {
    console.log('🚀🚀🚀 编辑器挂载开始 🚀🚀🚀');
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
      const databaseType: DatabaseType = currentConnection?.version as DatabaseType || 'unknown';

      // 注意：不在这里设置编辑器语言，因为Editor组件已经通过language属性设置了
      // 语言设置由Editor组件的language属性和key属性的变化来控制
      console.log('编辑器挂载，当前数据库类型:', databaseType, '语言:', getEditorLanguage());

      // 设置智能自动补全
      setupEnhancedAutoComplete(monaco, editor, databaseType, selectedDatabase);

      console.log('🎨 Monaco编辑器已挂载，使用原生主题:', resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light');

      console.log('🎯 编辑器挂载完成，当前语言:', getEditorLanguage());

      // 阻止浏览器默认的键盘行为（桌面应用专用）
      console.log('🔒 设置桌面应用键盘行为...');

      // 阻止 Backspace 键导致页面后退
      const preventBrowserNavigation = (e: KeyboardEvent) => {
        // 阻止 Backspace 键在非输入元素上的默认行为
        if (e.key === 'Backspace') {
          const target = e.target as HTMLElement;
          const isEditable = target.isContentEditable ||
                           target.tagName === 'INPUT' ||
                           target.tagName === 'TEXTAREA' ||
                           target.closest('.monaco-editor');

          if (!isEditable) {
            console.log('🚫 阻止 Backspace 键导致页面后退');
            e.preventDefault();
            e.stopPropagation();
          }
        }

        // 阻止 F5 刷新页面
        if (e.key === 'F5') {
          console.log('🚫 阻止 F5 键刷新页面');
          e.preventDefault();
          e.stopPropagation();
        }

        // 阻止 Ctrl+R 刷新页面
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
          console.log('🚫 阻止 Ctrl+R 刷新页面');
          e.preventDefault();
          e.stopPropagation();
        }
      };

      // 在捕获阶段添加事件监听器，确保优先处理
      document.addEventListener('keydown', preventBrowserNavigation, true);

      // 保存清理函数到 ref，在组件卸载时使用
      if (!keyboardCleanupRef.current) {
        keyboardCleanupRef.current = () => {
          document.removeEventListener('keydown', preventBrowserNavigation, true);
        };
      }

      // 确保统一语法高亮已注册（在编辑器挂载后）
      try {
        console.log('🔧 在编辑器挂载后注册统一语法高亮...');
        unifiedSyntaxManager.registerAll();
        console.log('✅ 统一语法高亮注册完成');

        // 立即设置正确的语言和主题
        const targetLanguage = getEditorLanguage();
        const model = editor.getModel();
        if (model && targetLanguage) {
          console.log('🔧 设置编辑器语言为:', targetLanguage);
          monaco.editor.setModelLanguage(model, targetLanguage);

          // 应用对应的主题
          const currentTheme = getEditorTheme();
          console.log('🎨 应用编辑器主题:', currentTheme);
          monaco.editor.setTheme(currentTheme);

          console.log('✅ 统一语言和主题设置完成');
        }
      } catch (langError) {
        console.error('❌ 统一语法高亮注册失败:', langError);
      }

      // 完全禁用Monaco编辑器的剪贴板功能，防止权限错误
      try {
        console.log('🚫 禁用Monaco编辑器剪贴板功能...');

        // 检查是否可以重写剪贴板API
        if (navigator.clipboard) {
          console.log('🔒 尝试重写navigator.clipboard API...');

          // 定义安全剪贴板对象（在外层作用域）
          const safeClipboard = {
            writeText: async (text: string) => {
              console.log('🔄 Monaco尝试写入剪贴板，重定向到安全API:', `${text.substring(0, 50)  }...`);
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

          // 尝试使用 Object.defineProperty 重写
          try {
            // 尝试替换navigator.clipboard
            Object.defineProperty(navigator, 'clipboard', {
              value: safeClipboard,
              writable: false,
              configurable: true
            });

            console.log('✅ Monaco编辑器剪贴板功能已安全重写');
          } catch (defineError) {
            console.warn('⚠️ 无法重写clipboard属性，尝试替换方法:', defineError);

            // 如果无法重写整个对象，尝试替换方法
            try {
              if (typeof navigator.clipboard.writeText === 'function') {
                (navigator.clipboard as any).writeText = safeClipboard.writeText;
              }
              if (typeof navigator.clipboard.readText === 'function') {
                (navigator.clipboard as any).readText = safeClipboard.readText;
              }
              console.log('✅ 剪贴板方法替换成功');
            } catch (methodError) {
              console.warn('⚠️ 剪贴板方法替换失败:', methodError);
            }
          }
        }
      } catch (clipboardError) {
        console.warn('⚠️ 重写剪贴板功能失败:', clipboardError);
      }

      // 检查语法高亮状态（语言已通过Editor组件的language属性设置）
      const editorModel = editor.getModel();
      if (editorModel) {
        const currentLanguage = getEditorLanguage();
        console.log('🔍 开始检查编辑器语言设置:', currentLanguage);

        // 检查当前模型状态
        const modelInfo = {
          language: editorModel.getLanguageId(),
          uri: editorModel.uri.toString(),
          lineCount: editorModel.getLineCount(),
          value: `${editorModel.getValue().substring(0, 50)  }...`
        };
        console.log('📋 当前模型信息:', modelInfo);

        // 验证语言是否正确设置（由Editor组件处理）
        const actualLanguage = editorModel.getLanguageId();
        const languageStatus = {
          expected: currentLanguage,
          actual: actualLanguage,
          isCorrect: actualLanguage === currentLanguage
        };
        console.log('✅ 语言设置状态:', languageStatus);

        // 如果语言不匹配，尝试修复
        if (!languageStatus.isCorrect) {
          console.warn('⚠️ 语言设置不匹配，尝试修复...');
          try {
            // 强制设置语言
            console.log('🔧 强制设置模型语言为:', currentLanguage);
            monaco.editor.setModelLanguage(editorModel, currentLanguage);

            // 验证设置结果
            const newLanguage = editorModel.getLanguageId();
            console.log('🔍 语言设置结果验证:', {
              target: currentLanguage,
              actual: newLanguage,
              success: newLanguage === currentLanguage
            });

            if (newLanguage !== currentLanguage) {
              console.error('❌ 语言设置失败，尝试备用方案...');
              // 备用方案：重新创建模型
              const content = editorModel.getValue();
              const newModel = monaco.editor.createModel(content, currentLanguage);
              editor.setModel(newModel);
              console.log('🔄 使用新模型，语言:', newModel.getLanguageId());
            }
          } catch (langError) {
            console.error('❌ 语言设置失败:', langError);
          }
        }

        // 检查tokenization provider是否存在
        console.log('🔍 检查tokenization provider...');
        try {
          // 检查语言是否已注册
          const registeredLanguages = monaco.languages.getLanguages();
          const isLanguageRegistered = registeredLanguages.some(lang => lang.id === actualLanguage);
          console.log('📝 语言注册状态:', {
            language: actualLanguage,
            isRegistered: isLanguageRegistered,
            totalLanguages: registeredLanguages.length
          });

          // 检查tokenization provider是否正确设置
          console.log('🔍 跳过tokenization支持检查（API不可用）');

          // 直接测试语法高亮是否工作
          try {
            const testText = 'SELECT COUNT(*) FROM measurement';
            console.log('🧪 测试语法高亮:', testText);

            // 创建一个临时模型来测试tokenization
            const tempModel = monaco.editor.createModel(testText, actualLanguage);
            console.log('🔍 临时模型创建成功:', {
              language: tempModel.getLanguageId(),
              lineCount: tempModel.getLineCount(),
              value: tempModel.getValue()
            });

            // 清理临时模型
            tempModel.dispose();
            console.log('✅ 语法高亮测试完成');
          } catch (tokenError) {
            console.warn('⚠️ 语法高亮测试失败:', tokenError);
          }

          // 如果语言未注册，强制重新注册
          if (!isLanguageRegistered && (actualLanguage === 'influxql' || actualLanguage === 'sql')) {
            console.warn('⚠️ 语言未注册，强制重新注册...');
            // 重新注册语言和语法高亮
            setTimeout(() => {
              console.log('🔄 重新注册语言和语法高亮...');
              // 这里会触发语言重新注册
              window.location.reload(); // 临时解决方案：重新加载页面
            }, 1000);
          }
        } catch (tokenError) {
          console.error('❌ 检查tokenization支持失败:', tokenError);
        }

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

        // 应用自定义主题
        const isDark = resolvedTheme === 'dark';
        const languageType = getDatabaseLanguageType();
        const themeName = unifiedSyntaxManager.getThemeName(languageType, isDark);

        console.log('🔍 统一主题选择参数:', {
          currentLanguage,
          resolvedTheme,
          isDark,
          themeName
        });

        console.log('🎨 应用统一编辑器主题:', themeName, '(当前主题模式:', resolvedTheme, ')');

        try {
          monaco.editor.setTheme(themeName);
          console.log('✅ 主题设置成功');

          // 验证主题是否正确应用
          setTimeout(() => {
            try {
              const editorDom = editor.getDomNode();
              if (editorDom) {
                const computedStyle = window.getComputedStyle(editorDom);
                console.log('🔍 编辑器DOM样式检查:', {
                  backgroundColor: computedStyle.backgroundColor,
                  color: computedStyle.color,
                  className: editorDom.className
                });
              }
            } catch (styleError) {
              console.warn('⚠️ 样式检查失败:', styleError);
            }
          }, 100);
        } catch (themeError) {
          console.error('❌ 主题设置失败:', themeError);
          // 回退到默认主题
          const fallbackTheme = isDark ? 'vs-dark' : 'vs';
          console.log('🔄 回退到默认主题:', fallbackTheme);
          monaco.editor.setTheme(fallbackTheme);
        }

        // 检查编辑器当前状态
        const model = editor.getModel();
        if (model) {
          console.log('📊 编辑器当前状态:', {
            language: model.getLanguageId(),
            theme: 'unknown', // Monaco没有直接获取当前主题的API
            hasContent: model.getValue().length > 0,
            lineCount: model.getLineCount()
          });
        }

        // 触发重新渲染以应用语法高亮
        setTimeout(() => {
          console.log('🔄 触发编辑器重新渲染...');
          try {
            editor.trigger('editor', 'editor.action.formatDocument', {});
            console.log('✅ 重新渲染触发成功');
          } catch (formatError) {
            console.warn('⚠️ 格式化触发失败:', formatError);
          }

          // 强制重新计算语法高亮（保留有效的刷新逻辑，但避免内容清除）
          setTimeout(() => {
            console.log('🎨 强制重新计算语法高亮...');
            const model = editor.getModel();
            if (!model) {
              console.warn('⚠️ 无法获取编辑器模型，跳过语法高亮刷新');
              return;
            }

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

              // 方法2: 重新应用语言和主题（不清除内容）
              setTimeout(() => {
                console.log('🔄 方法2: 重新应用语言和主题...');
                try {
                  const currentLanguage = getEditorLanguage();
                  const currentTheme = getEditorTheme();

                  // 重新设置语言
                  monaco.editor.setModelLanguage(model, currentLanguage);
                  console.log('✅ 语言重新设置完成:', currentLanguage);

                  // 重新应用主题
                  monaco.editor.setTheme(currentTheme);
                  console.log('✅ 主题重新应用完成:', currentTheme);

                  // 方法3: 触发编辑器重新渲染
                  setTimeout(() => {
                    console.log('🔄 方法3: 触发编辑器重新渲染...');
                    try {
                      editor.render(true);
                      console.log('✅ 编辑器重新渲染完成');

                      // 使用自定义语法高亮验证
                      setTimeout(() => {
                        unifiedSyntaxManager.validateSyntaxHighlight(editor);
                      }, 500);
                    } catch (renderError) {
                      console.warn('⚠️ 编辑器重新渲染失败:', renderError);
                    }
                  }, 100);
                } catch (langThemeError) {
                  console.warn('⚠️ 语言和主题重新应用失败:', langThemeError);
                }
              }, 50);

              console.log('✅ 语法高亮强制刷新流程启动');
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
        onExecuteQuery?.();
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
              // 使用我们的自定义粘贴逻辑，确保正确处理选中内容
              handleContextMenuAction('paste');
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
              onExecuteQuery?.();
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
          selectedText: selectedText || '',
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
        if (model) {
          // 设置语言时禁用一些高级功能
          console.debug('编辑器高级选项设置完成');
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
      const languageType = getDatabaseLanguageType();
      const languageId = unifiedSyntaxManager.getLanguageId(languageType);

      console.log('🔄 数据源变化，当前语言类型:', languageType, '统一语言ID:', languageId);
      // 语言更新由Editor组件的key属性变化自动处理
    }
  }, [activeConnectionId, connections, currentTab?.type, getDatabaseLanguageType]);

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
      key={`${currentTab.id}-${resolvedTheme}-${getEditorLanguage()}`} // 移除时间戳避免频繁重新挂载
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


