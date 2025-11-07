/**
 * CodeMirror 6 React Component
 * 
 * A React wrapper for CodeMirror 6 with theme integration and event handling
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useTheme } from '@/components/providers/ThemeProvider';
import { basicPreset } from './preset';
import { createEditorTheme } from './theme';
import { editorEvents } from './eventBus';
import { editorTelemetry } from './telemetry';
import { cn } from '@/lib/utils';
import { getCurrentStatement, getAllStatements } from './sqlUtils';
import logger from '@/utils/logger';

export interface CodeMirrorEditorProps {
  /** Initial document content */
  value?: string;
  /** Callback when content changes */
  onChange?: (value: string, viewUpdate: any) => void;
  /** Additional extensions */
  extensions?: Extension[];
  /** Editor height */
  height?: string;
  /** Editor max height */
  maxHeight?: string;
  /** Editor min height */
  minHeight?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether the editor is editable */
  editable?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
  /** Tab size */
  tabSize?: number;
  /** Line wrapping */
  lineWrapping?: boolean;
  /** Auto focus */
  autoFocus?: boolean;
  /** Callback when editor is ready */
  onReady?: (view: EditorView) => void;
}

export interface CodeMirrorEditorRef {
  /** Get the editor view instance */
  getView: () => EditorView | null;
  /** Get the current content */
  getValue: () => string;
  /** Set the content */
  setValue: (value: string) => void;
  /** Get selected text */
  getSelectedText: () => string;
  /** Focus the editor */
  focus: () => void;
  /** Insert text at cursor */
  insertText: (text: string) => void;
  /** Replace selection */
  replaceSelection: (text: string) => void;
  /** Get cursor position */
  getCursorPosition: () => number;
  /** Set cursor position */
  setCursorPosition: (pos: number) => void;
  /** Get the SQL statement at current cursor position */
  getCurrentStatement: () => string | null;
  /** Get all SQL statements in the editor */
  getAllStatements: () => string[];
}

/**
 * CodeMirror 6 Editor Component
 */
export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  (
    {
      value = '',
      onChange,
      extensions = [],
      height,
      maxHeight,
      minHeight,
      readOnly = false,
      editable = true,
      placeholder,
      className,
      tabSize = 2,
      lineWrapping = true,
      autoFocus = false,
      onReady,
    },
    ref
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const themeCompartmentRef = useRef<Compartment>(new Compartment());
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getView: () => viewRef.current,
      getValue: () => viewRef.current?.state.doc.toString() || '',
      setValue: (newValue: string) => {
        if (viewRef.current) {
          viewRef.current.dispatch({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: newValue,
            },
          });
        }
      },
      getSelectedText: () => {
        if (!viewRef.current) return '';
        const { from, to } = viewRef.current.state.selection.main;
        return viewRef.current.state.sliceDoc(from, to);
      },
      focus: () => {
        viewRef.current?.focus();
      },
      insertText: (text: string) => {
        if (viewRef.current) {
          const { from } = viewRef.current.state.selection.main;
          viewRef.current.dispatch({
            changes: { from, insert: text },
            selection: { anchor: from + text.length },
          });
        }
      },
      replaceSelection: (text: string) => {
        if (viewRef.current) {
          viewRef.current.dispatch(
            viewRef.current.state.replaceSelection(text)
          );
        }
      },
      getCursorPosition: () => {
        return viewRef.current?.state.selection.main.head || 0;
      },
      setCursorPosition: (pos: number) => {
        if (viewRef.current) {
          viewRef.current.dispatch({
            selection: { anchor: pos },
          });
        }
      },
      getCurrentStatement: () => {
        if (!viewRef.current) return null;
        return getCurrentStatement(viewRef.current);
      },
      getAllStatements: () => {
        if (!viewRef.current) return [];
        const text = viewRef.current.state.doc.toString();
        return getAllStatements(text);
      },
    }));

    // Initialize editor
    useEffect(() => {
      if (!editorRef.current) return;

      // Track render time
      editorTelemetry.startTimer('editor-init');

      // Create editor state
      const startState = EditorState.create({
        doc: value,
        extensions: [
          // Basic preset
          basicPreset({
            tabSize,
            lineWrapping,
            readOnly,
            editable: !readOnly && editable,
          }),
          // Theme (using compartment for dynamic updates)
          themeCompartmentRef.current.of(createEditorTheme(isDark)),
          // Update listener
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              editorTelemetry.startTimer('content-change');
              const newValue = update.state.doc.toString();
              onChange?.(newValue, update);
              editorEvents.contentChange(newValue, update.changes);
              editorTelemetry.endTimer('content-change', 'editor.content.change', {
                docSize: newValue.length,
              });

              // Track document size
              editorTelemetry.recordValue('editor.document.size', newValue.length);
            }

            if (update.selectionSet) {
              editorTelemetry.startTimer('selection-change');
              const { from, to } = update.state.selection.main;
              const text = update.state.sliceDoc(from, to);
              editorEvents.selectionChange(from, to, text);
              editorTelemetry.endTimer('selection-change', 'editor.selection.change', {
                selectionLength: text.length,
              });
            }
          }),
          // Focus/blur listeners and clipboard debugging
          EditorView.domEventHandlers({
            focus: () => {
              editorEvents.focus();
            },
            blur: () => {
              editorEvents.blur();
            },
            copy: (event: ClipboardEvent) => {
              logger.info('📋 [CodeMirror] copy event triggered', {
                hasClipboardData: !!event.clipboardData,
                defaultPrevented: event.defaultPrevented,
              });
              return false; // Let CodeMirror handle it
            },
            cut: (event: ClipboardEvent) => {
              logger.debug('✂️ [CodeMirror] cut event triggered', {
                hasClipboardData: !!event.clipboardData,
                defaultPrevented: event.defaultPrevented,
              });
              return false; // Let CodeMirror handle it
            },
            paste: (event: ClipboardEvent) => {
              logger.info('📌 [CodeMirror] paste event triggered', {
                hasClipboardData: !!event.clipboardData,
                defaultPrevented: event.defaultPrevented,
              });
              return false; // Let CodeMirror handle it
            },
            keydown: (event: KeyboardEvent) => {
              const isClipboard = (event.ctrlKey || event.metaKey) &&
                                 ['c', 'v', 'x'].includes(event.key.toLowerCase());
              if (isClipboard) {
                logger.debug('⌨️ [CodeMirror] keydown event', {
                  key: event.key,
                  ctrl: event.ctrlKey,
                  meta: event.metaKey,
                  defaultPrevented: event.defaultPrevented,
                });
              }
              return false; // Let CodeMirror handle it
            },
          }),
          // Custom extensions
          ...extensions,
        ],
      });

      // Create editor view
      const view = new EditorView({
        state: startState,
        parent: editorRef.current,
      });

      viewRef.current = view;

      // Track initial render time
      editorTelemetry.endTimer('editor-init', 'editor.render', {
        initialDocSize: value?.length || 0,
      });

      // Auto focus
      if (autoFocus) {
        view.focus();
      }

      // Notify ready
      onReady?.(view);

      // Cleanup
      return () => {
        view.destroy();
        viewRef.current = null;
      };
    }, []); // Only run once on mount

    // Update theme when it changes
    useEffect(() => {
      if (!viewRef.current) return;

      // Use requestAnimationFrame to ensure CSS variables are updated
      requestAnimationFrame(() => {
        if (!viewRef.current) return;

        viewRef.current.dispatch({
          effects: themeCompartmentRef.current.reconfigure(createEditorTheme(isDark)),
        });
      });
    }, [isDark]);

    // Update value when prop changes (controlled component)
    useEffect(() => {
      if (!viewRef.current) return;
      
      const currentValue = viewRef.current.state.doc.toString();
      if (value !== currentValue) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }, [value]);

    // Container styles
    const containerStyle: React.CSSProperties = {
      height,
      maxHeight,
      minHeight: minHeight || '200px',
      overflow: 'auto',
    };

    // 点击容器空白区域时聚焦编辑器
    const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      // 只有点击容器本身(不是编辑器内容)时才聚焦
      if (e.target === e.currentTarget && viewRef.current) {
        viewRef.current.focus();
        // 将光标移到文档末尾
        const doc = viewRef.current.state.doc;
        viewRef.current.dispatch({
          selection: { anchor: doc.length },
        });
      }
    }, []);

    return (
      <div
        ref={editorRef}
        className={cn(
          'cm6-editor-container',
          'border-0 overflow-hidden',
          className
        )}
        style={containerStyle}
        onClick={handleContainerClick}
      />
    );
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';

export default CodeMirrorEditor;

