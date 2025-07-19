import React, { useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import * as monaco from 'monaco-editor';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import {
  Card,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Popconfirm,
} from '@/components/ui';
import {
  ArrowLeft,
  FileText,
  Table,
  Database,
  Maximize2,
  Minimize2,
  X,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { safeTauriInvoke } from '@/utils/tauri';

interface DetachedTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  connectionId?: string;
  database?: string;
  tableName?: string;
  modified?: boolean;
}

interface DetachedTabWindowProps {
  tab: DetachedTab;
  onReattach?: () => void;
  onClose?: () => void;
}

const DetachedTabWindow: React.FC<DetachedTabWindowProps> = ({
  tab,
  onReattach,
  onClose,
}) => {
  const { resolvedTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [content, setContent] = useState(tab.content);
  const [modified, setModified] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showReattachConfirm, setShowReattachConfirm] = useState(false);

  // 处理内容变化
  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setModified(value !== tab.content);
    }
  };





  // 处理窗口控制
  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleToggleMaximize = async () => {
    const window = getCurrentWindow();
    if (isMaximized) {
      await window.unmaximize();
    } else {
      await window.maximize();
    }
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    if (modified) {
      setShowCloseConfirm(true);
      return;
    }

    await performClose();
  };

  const performClose = async () => {
    onClose?.();
    const currentWindow = getCurrentWindow();
    await currentWindow.close();
  };

  const handleSaveAndClose = async () => {
    // 保存逻辑
    if (modified) {
      await safeTauriInvoke('save_tab_content', { tabId: tab.id, content });
    }
    setShowCloseConfirm(false);
    await performClose();
  };

  const handleCloseWithoutSaving = async () => {
    setShowCloseConfirm(false);
    await performClose();
  };

  const handleReattach = () => {
    if (modified) {
      setShowReattachConfirm(true);
      return;
    }

    performReattach();
  };

  const performReattach = () => {
    onReattach?.();
  };

  const handleSaveAndReattach = async () => {
    // 保存并同步修改的内容
    if (modified) {
      await safeTauriInvoke('save_tab_content', { tabId: tab.id, content });
      await safeTauriInvoke('sync_tab_content', { tabId: tab.id, content });
    }
    setShowReattachConfirm(false);
    performReattach();
  };

  const handleReattachWithoutSaving = () => {
    setShowReattachConfirm(false);
    performReattach();
  };

  // 获取tab类型图标
  const getTabIcon = () => {
    switch (tab.type) {
      case 'query':
        return <FileText className="w-4 h-4" />;
      case 'table':
        return <Table className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'data-browser':
        return <Table className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // 监听窗口状态变化
  useEffect(() => {
    const setupWindowListeners = async () => {
      const window = getCurrentWindow();
      // 监听窗口最大化状态变化
      const unlistenResize = await window.onResized(() => {
        window.isMaximized().then(setIsMaximized);
      });

      return unlistenResize;
    };

    setupWindowListeners();
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 不要阻止系统级的复制粘贴快捷键
      const isSystemClipboard = (
        (event.ctrlKey || event.metaKey) &&
        ['c', 'v', 'x', 'a'].includes(event.key.toLowerCase())
      );

      if (isSystemClipboard) {
        return; // 让系统处理复制粘贴
      }

      // Ctrl+S 保存
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        // 保存逻辑
        if (modified) {
          safeTauriInvoke('save_tab_content', { tabId: tab.id, content });
          setModified(false);
        }
      }

      // Ctrl+W 关闭窗口
      if (event.ctrlKey && event.key === 'w') {
        event.preventDefault();
        handleClose();
      }
      
      // Ctrl+D 重新附加
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        handleReattach();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modified, content, tab.id]);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* 窗口标题栏 */}
      <Card className="border-0 border-b rounded-none flex-shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTabIcon()}
              <CardTitle className="text-lg">{tab.title}</CardTitle>
              {modified && <Badge variant="outline" className="text-xs">未保存</Badge>}
              {tab.database && (
                <Badge variant="secondary" className="text-xs">
                  {tab.database}
                </Badge>
              )}
            </div>
            
            {/* 窗口控制按钮 */}
            <div className="flex items-center gap-1">
              <Popconfirm
                title="保存更改"
                description={`"${tab.title}" 已修改，是否保存更改？`}
                open={showReattachConfirm}
                onConfirm={handleSaveAndReattach}
                onOpenChange={(open) => {
                  if (!open) handleReattachWithoutSaving();
                }}
                okText="保存"
                cancelText="不保存"
                placement="bottom"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReattach}
                  title="重新附加到主窗口 (Ctrl+D)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Popconfirm>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                title="最小化"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleMaximize}
                title={isMaximized ? "还原" : "最大化"}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Popconfirm
                title="保存更改"
                description={`"${tab.title}" 已修改，是否保存更改？`}
                open={showCloseConfirm}
                onConfirm={handleSaveAndClose}
                onOpenChange={(open) => {
                  if (!open) handleCloseWithoutSaving();
                }}
                okText="保存"
                cancelText="不保存"
                placement="bottom"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  title="关闭窗口 (Ctrl+W)"
                >
                  <X className="w-4 h-4" />
                </Button>
              </Popconfirm>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        {tab.type === 'data-browser' ? (
          <TableDataBrowser
            connectionId={tab.connectionId!}
            database={tab.database!}
            tableName={tab.tableName!}
          />
        ) : (
          <div className="h-full p-0">
            <Editor
              height="100%"
              language="sql"
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={content}
              onChange={handleContentChange}
              onMount={(editor, monaco) => {
                // 添加中文右键菜单支持 - 将执行查询放在第一位
                editor.addAction({
                  id: 'execute-query-chinese-detached',
                  label: '执行查询',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
                  contextMenuGroupId: 'query',
                  contextMenuOrder: 1,
                  run: (editor) => {
                    // 将当前查询内容发送到主窗口执行
                    const currentQuery = editor.getValue();
                    if (currentQuery.trim()) {
                      // 通过postMessage与主窗口通信
                      if (window.opener) {
                        window.opener.postMessage({
                          type: 'execute-query-from-detached',
                          query: currentQuery,
                          tabId: tab.id
                        }, '*');
                      }
                    }
                  }
                });

                // 分隔符
                editor.addAction({
                  id: 'separator-1-detached',
                  label: '',
                  contextMenuGroupId: 'separator1',
                  contextMenuOrder: 1,
                  run: () => {}
                });

                editor.addAction({
                  id: 'copy-chinese-detached',
                  label: '复制',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 1,
                  run: (editor) => {
                    editor.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
                  }
                });

                editor.addAction({
                  id: 'cut-chinese-detached',
                  label: '剪切',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 2,
                  run: (editor) => {
                    editor.trigger('keyboard', 'editor.action.clipboardCutAction', null);
                  }
                });

                editor.addAction({
                  id: 'paste-chinese-detached',
                  label: '粘贴',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 3,
                  run: (editor) => {
                    editor.trigger('keyboard', 'editor.action.clipboardPasteAction', null);
                  }
                });

                editor.addAction({
                  id: 'select-all-chinese-detached',
                  label: '全选',
                  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA],
                  contextMenuGroupId: 'navigation',
                  contextMenuOrder: 4,
                  run: (editor) => {
                    editor.trigger('keyboard', 'editor.action.selectAll', null);
                  }
                });

                console.log('✅ DetachedTabWindow 中文右键菜单已添加（包含执行查询）');
              }}
              key={resolvedTheme} // 强制重新渲染以应用主题
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
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: true,
                },
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                hover: { enabled: true },
                quickSuggestionsDelay: 50,
                suggestSelection: 'first',
                wordBasedSuggestions: 'allDocuments',
                // 桌面应用：禁用默认右键菜单，使用自定义中文菜单
                contextmenu: false,
                copyWithSyntaxHighlighting: true,
              }}
            />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex-shrink-0 bg-muted/50 border-t px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>类型: {tab.type}</span>
            {tab.type === 'data-browser' && tab.tableName && (
              <span>表: {tab.tableName}</span>
            )}
            {modified && <span className="text-orange-500">已修改</span>}
          </div>
          <div className="flex items-center gap-4">
            <span>Ctrl+S 保存</span>
            <span>Ctrl+D 重新附加</span>
            <span>Ctrl+W 关闭</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetachedTabWindow;