import React, { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/components/providers/ThemeProvider';
import TableDataBrowser from '@/components/query/TableDataBrowser';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
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
import { appWindow } from '@tauri-apps/api/window';
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

  // 处理内容变化
  const handleContentChange = (value: string | undefined) => {
    if (value !== undefined) {
      setContent(value);
      setModified(value !== tab.content);
    }
  };

  // 处理窗口控制
  const handleMinimize = async () => {
    await appWindow.minimize();
  };

  const handleToggleMaximize = async () => {
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
    setIsMaximized(!isMaximized);
  };

  const handleClose = async () => {
    if (modified) {
      // 这里可以显示保存确认对话框
      const shouldClose = window.confirm('内容已修改，确定要关闭吗？');
      if (!shouldClose) return;
    }
    
    onClose?.();
    await appWindow.close();
  };

  const handleReattach = () => {
    if (modified) {
      // 同步修改的内容
      const updatedTab = { ...tab, content, modified };
      // 这里可以通过IPC通知主窗口更新tab内容
      safeTauriInvoke('sync_tab_content', { tabId: tab.id, content });
    }
    
    onReattach?.();
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
      // 监听窗口最大化状态变化
      const unlistenResize = await appWindow.onResized(() => {
        appWindow.isMaximized().then(setIsMaximized);
      });

      return unlistenResize;
    };

    setupWindowListeners();
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReattach}
                title="重新附加到主窗口 (Ctrl+D)"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                title="关闭窗口 (Ctrl+W)"
              >
                <X className="w-4 h-4" />
              </Button>
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
              language="influxql"
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs-light'}
              value={content}
              onChange={handleContentChange}
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
                wordBasedSuggestions: true,
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