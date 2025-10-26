/**
 * EditorManager - CodeMirror 6 Version
 * 
 * Manages the code editor with CM6, replacing Monaco Editor
 */

import React, { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useConnectionStore } from '@/store/connection';
import type { EditorTab } from './TabManager';
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
import { logger } from '@/utils/logger';
import {
  CodeMirrorEditor,
  type CodeMirrorEditorRef,
  type QueryDialect,
  basicPreset,
  createEditorTheme,
  formatDocument,
  getFormattingOptions,
  getDialectExtensions,
  schemaCompletionProvider
} from '@/editor/cm6';
import type { Extension } from '@codemirror/state';

interface EditorManagerProps {
  currentTab: EditorTab | null;
  selectedDatabase: string;
  databases: string[];
  onContentChange: (content: string) => void;
  onExecuteQuery?: () => void;
}

export interface EditorManagerRef {
  getSelectedText: () => string | null;
}

export const EditorManager = forwardRef<EditorManagerRef, EditorManagerProps>(({
  currentTab,
  selectedDatabase,
  databases,
  onContentChange,
  onExecuteQuery,
}, ref) => {
  const editorRef = useRef<CodeMirrorEditorRef | null>(null);
  const isInternalChangeRef = useRef(false);
  const lastContentRef = useRef<string>('');
  const { resolvedTheme } = useTheme();
  const { activeConnectionId, connections } = useConnectionStore();
  
  // Current dialect state
  const [currentDialect, setCurrentDialect] = useState<QueryDialect>('sql');

  // Context menu state
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

  // Get current connection
  const getCurrentConnection = useCallback(() => {
    const effectiveConnectionId = currentTab?.connectionId || activeConnectionId;
    return connections.find(c => c.id === effectiveConnectionId);
  }, [connections, activeConnectionId, currentTab?.connectionId]);

  // Get data source type for smart suggestions
  const getDataSourceType = useCallback((): DataSourceType => {
    const connection = getCurrentConnection();
    return (connection?.version as DataSourceType) || 'unknown';
  }, [getCurrentConnection]);

  // Map database version to CM6 dialect
  const getDialectFromConnection = useCallback((): QueryDialect => {
    const connection = getCurrentConnection();
    if (!connection || !connection.version) {
      return 'sql';
    }

    const version = connection.version;

    // InfluxDB version detection
    if (version.includes('InfluxDB')) {
      if (version.includes('1.')) return 'influxql';
      if (version.includes('2.')) return 'flux';
      if (version.includes('3.')) return 'sql';
      return 'influxql';
    }

    // IoTDB
    if (version.includes('IoTDB')) return 'iotdb-sql';

    // Prometheus
    if (version.includes('Prometheus')) return 'promql';

    // Default to SQL
    return 'sql';
  }, [getCurrentConnection]);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getSelectedText: () => {
      if (!editorRef.current) {
        return null;
      }
      const selectedText = editorRef.current.getSelectedText();
      return selectedText || null;
    }
  }));

  // Handle editor content change
  const handleEditorChange = useCallback((value: string) => {
    if (isInternalChangeRef.current) {
      return;
    }

    const content = value || '';

    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      onContentChange(content);
    }
  }, [onContentChange]);

  // Handle context menu actions
  const handleContextMenuAction = useCallback(async (action: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    logger.debug('🎯 执行右键菜单操作:', action);

    try {
      switch (action) {
        case 'cut':
          {
            const selectedText = editor.getSelectedText();
            if (selectedText) {
              await writeToClipboard(selectedText, {
                successMessage: '已剪切到剪贴板',
                showSuccess: false
              });
              editor.replaceSelection('');
            }
          }
          break;

        case 'copy':
          {
            const selectedText = editor.getSelectedText();
            if (selectedText) {
              await writeToClipboard(selectedText, {
                successMessage: '已复制到剪贴板',
                showSuccess: false
              });
            }
          }
          break;

        case 'paste':
          {
            const clipboardText = await readFromClipboard({
              showError: false
            });
            if (clipboardText) {
              editor.replaceSelection(clipboardText);
            }
          }
          break;

        case 'selectAll':
          {
            const view = editor.getView();
            if (view) {
              view.dispatch({
                selection: { anchor: 0, head: view.state.doc.length }
              });
            }
          }
          break;

        case 'format':
          {
            const view = editor.getView();
            if (view) {
              const options = getFormattingOptions();
              formatDocument(view, currentDialect, options);
            }
          }
          break;

        case 'execute':
          onExecuteQuery?.();
          break;
      }
    } catch (error) {
      logger.error('右键菜单操作失败:', error);
    }

    setContextMenu(prev => ({ ...prev, visible: false }));
  }, [onExecuteQuery, getCurrentConnection]);

  // Handle dialect change
  const handleDialectChange = useCallback((newDialect: QueryDialect) => {
    setCurrentDialect(newDialect);
    logger.debug('Dialect changed to:', newDialect);
  }, []);

  // Handle format request
  const handleFormat = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const view = editor.getView();
    if (view) {
      const options = getFormattingOptions();
      formatDocument(view, currentDialect, options);
    }
  }, [currentDialect]);

  // Get language extension based on dialect
  const getLanguageExtension = useCallback((): Extension[] => {
    return getDialectExtensions(currentDialect);
  }, [currentDialect]);

  // Update dialect when connection changes
  useEffect(() => {
    const detectedDialect = getDialectFromConnection();
    if (detectedDialect !== currentDialect) {
      setCurrentDialect(detectedDialect);
    }
  }, [getDialectFromConnection, currentDialect]);

  // Update schema completion context when connection/database/dialect changes
  useEffect(() => {
    const connectionId = currentTab?.connectionId || activeConnectionId;
    if (connectionId && selectedDatabase && currentDialect) {
      schemaCompletionProvider.setContext(connectionId, selectedDatabase, currentDialect);
      logger.debug('Schema completion context updated:', { connectionId, selectedDatabase, currentDialect });
    }
  }, [currentTab?.connectionId, activeConnectionId, selectedDatabase, currentDialect]);

  // Sync tab content to editor
  useEffect(() => {
    if (!editorRef.current || !currentTab) return;

    const editor = editorRef.current;
    const currentContent = editor.getValue();

    if (currentTab.content !== currentContent) {
      isInternalChangeRef.current = true;
      editor.setValue(currentTab.content);
      lastContentRef.current = currentTab.content;
      isInternalChangeRef.current = false;
      logger.debug('📝 同步tab内容到编辑器');
    }
  }, [currentTab?.content, currentTab?.id]);

  if (!currentTab) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  const extensions = [
    basicPreset({
      onExecute: () => onExecuteQuery?.(),
      onFormat: handleFormat,
    }),
    ...createEditorTheme(isDark),
    ...getLanguageExtension(),
  ];

  return (
    <div className="relative h-full flex flex-col">
      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeMirrorEditor
          ref={editorRef}
          value={currentTab.content}
          onChange={handleEditorChange}
          extensions={extensions}
          height="100%"
        />
      </div>

      {/* Context Menu */}
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
});

EditorManager.displayName = 'EditorManager';

