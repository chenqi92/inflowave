/**
 * 智能提示Hook
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';
import { 
  SuggestionItem, 
  SuggestionContext, 
  SuggestionPosition,
  DataSourceType 
} from '@/utils/suggestionTypes';
import { smartSuggestionService } from '@/services/smartSuggestionService';

interface UseSmartSuggestionOptions {
  connectionId: string;
  database: string;
  dataSourceType: DataSourceType;
  debounceMs?: number;
  minChars?: number;
}

interface UseSmartSuggestionReturn {
  suggestions: SuggestionItem[];
  position: SuggestionPosition;
  visible: boolean;
  loading: boolean;
  showSuggestions: (editor: monaco.editor.IStandaloneCodeEditor, force?: boolean) => void;
  hideSuggestions: () => void;
  selectSuggestion: (item: SuggestionItem, editor: monaco.editor.IStandaloneCodeEditor) => void;
}

export function useSmartSuggestion(options: UseSmartSuggestionOptions): UseSmartSuggestionReturn {
  const { connectionId, database, dataSourceType, debounceMs = 150, minChars = 1 } = options;
  
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [position, setPosition] = useState<SuggestionPosition>({ top: 0, left: 0 });
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastContextRef = useRef<SuggestionContext | null>(null);

  /**
   * 获取编辑器上下文信息
   */
  const getEditorContext = useCallback((editor: monaco.editor.IStandaloneCodeEditor): SuggestionContext => {
    const model = editor.getModel();
    const position = editor.getPosition();

    if (!model || !position) {
      throw new Error('无法获取编辑器上下文');
    }

    const lineText = model.getLineContent(position.lineNumber);
    const text = model.getValue();

    // 获取光标前的单词
    const wordInfo = model.getWordUntilPosition(position);
    const wordBeforeCursor = wordInfo.word;
    let wordStartColumn = wordInfo.startColumn;
    let wordEndColumn = wordInfo.endColumn;

    // 如果当前没有单词，设置插入位置为当前光标位置
    if (!wordBeforeCursor) {
      wordStartColumn = position.column;
      wordEndColumn = position.column;
    }

    return {
      text,
      position: model.getOffsetAt(position),
      lineText,
      wordBeforeCursor,
      lineNumber: position.lineNumber,
      column: position.column,
      wordStartColumn,
      wordEndColumn,
    };
  }, []);

  /**
   * 计算提示弹框位置
   */
  const calculatePosition = useCallback((
    editor: monaco.editor.IStandaloneCodeEditor,
    context: SuggestionContext
  ): SuggestionPosition => {
    const editorDom = editor.getDomNode();
    if (!editorDom) {
      return { top: 0, left: 0 };
    }

    const editorRect = editorDom.getBoundingClientRect();
    const position = editor.getPosition();
    
    if (!position) {
      return { top: 0, left: 0 };
    }

    // 获取光标在编辑器中的像素位置
    const pixelPosition = editor.getScrolledVisiblePosition(position);
    
    if (!pixelPosition) {
      return { top: 0, left: 0 };
    }

    // 计算相对于视口的位置
    const top = editorRect.top + pixelPosition.top + 20; // 在光标下方20px
    const left = editorRect.left + pixelPosition.left;

    // 确保弹框不会超出视口
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const maxHeight = Math.min(320, viewportHeight - top - 20);
    const maxWidth = Math.min(384, viewportWidth - left - 20);

    return {
      top: Math.max(0, top),
      left: Math.max(0, left),
      maxHeight,
      maxWidth,
    };
  }, []);

  /**
   * 获取智能提示
   */
  const fetchSuggestions = useCallback(async (context: SuggestionContext) => {
    if (!connectionId || !database) {
      return [];
    }

    try {
      setLoading(true);
      const items = await smartSuggestionService.getSuggestions(
        connectionId,
        database,
        context,
        dataSourceType
      );
      return items;
    } catch (error) {
      console.warn('获取智能提示失败:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connectionId, database, dataSourceType]);

  /**
   * 显示智能提示
   */
  const showSuggestions = useCallback(async (
    editor: monaco.editor.IStandaloneCodeEditor,
    force = false
  ) => {
    try {
      const context = getEditorContext(editor);

      // 检查是否需要显示提示
      // 只在强制触发或者有实际输入的单词时显示提示（不包括空格触发）
      const shouldShow = force ||
        context.wordBeforeCursor.length >= minChars;

      if (!shouldShow) {
        hideSuggestions();
        return;
      }

      // 防抖处理
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const items = await fetchSuggestions(context);

        if (items.length > 0) {
          setSuggestions(items);
          setPosition(calculatePosition(editor, context));
          setVisible(true);
          lastContextRef.current = context;
        } else {
          hideSuggestions();
        }
      }, debounceMs);

    } catch (error) {
      console.warn('显示智能提示失败:', error);
      hideSuggestions();
    }
  }, [getEditorContext, minChars, debounceMs, fetchSuggestions, calculatePosition]);

  /**
   * 隐藏智能提示
   */
  const hideSuggestions = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setVisible(false);
    setSuggestions([]);
    lastContextRef.current = null;
  }, []);

  /**
   * 选择提示项
   */
  const selectSuggestion = useCallback((
    item: SuggestionItem,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    const model = editor.getModel();
    const position = editor.getPosition();

    if (!model || !position || !lastContextRef.current) {
      return;
    }

    const context = lastContextRef.current;

    // 使用上下文中的位置信息
    const startColumn = context.wordStartColumn;
    const endColumn = context.wordEndColumn;

    const range = new monaco.Range(
      position.lineNumber,
      startColumn,
      position.lineNumber,
      endColumn
    );

    // 获取插入文本
    const insertText = item.insertText || item.value;

    // 执行替换
    editor.executeEdits('smart-suggestion', [{
      range,
      text: insertText,
    }]);

    // 如果是代码片段，设置光标位置
    if (item.insertTextRules === 4 && insertText.includes('$')) { // INSERT_AS_SNIPPET
      const snippetPosition = insertText.indexOf('$1');
      if (snippetPosition !== -1) {
        const newPosition = new monaco.Position(
          position.lineNumber,
          startColumn + snippetPosition
        );
        editor.setPosition(newPosition);
        editor.setSelection(new monaco.Selection(
          newPosition.lineNumber,
          newPosition.column,
          newPosition.lineNumber,
          newPosition.column
        ));
      }
    } else {
      // 设置光标到插入文本的末尾
      const newPosition = new monaco.Position(
        position.lineNumber,
        startColumn + insertText.length
      );
      editor.setPosition(newPosition);
    }

    // 隐藏提示
    hideSuggestions();

    // 聚焦编辑器
    editor.focus();
  }, [hideSuggestions]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    position,
    visible,
    loading,
    showSuggestions,
    hideSuggestions,
    selectSuggestion,
  };
}
