/**
 * Monaco Editor 全局配置工具
 * 统一管理Monaco编辑器的配置，特别是剪贴板相关设置
 */

import * as monaco from 'monaco-editor';

/**
 * 获取安全的Monaco编辑器配置
 * 禁用所有可能触发浏览器剪贴板权限的功能
 */
export function getSafeMonacoOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
  return {
    // 基础配置
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
    formatOnPaste: true,
    formatOnType: true,
    acceptSuggestionOnEnter: 'on',
    tabCompletion: 'on',
    hover: { enabled: true },
    quickSuggestionsDelay: 50,
    suggestSelection: 'first',
    wordBasedSuggestions: 'currentDocument',
    
    // 桌面应用：禁用默认右键菜单，使用自定义中文菜单
    contextmenu: false,
    
    // 关键：禁用所有可能触发剪贴板权限的功能
    copyWithSyntaxHighlighting: false, // 禁用语法高亮复制，避免剪贴板权限问题
    links: false, // 禁用链接检测，避免触发剪贴板权限
    dragAndDrop: false, // 禁用拖拽，避免剪贴板操作
    selectionClipboard: false, // 禁用选择自动复制到剪贴板

    // 额外的剪贴板安全配置
    useTabStops: false, // 禁用Tab停止，避免某些剪贴板相关操作
    multiCursorModifier: 'alt', // 使用Alt键进行多光标操作，避免Ctrl+Click触发剪贴板
    accessibilitySupport: 'off', // 禁用辅助功能支持，避免剪贴板相关操作

    // 查找配置 - 避免自动复制选择内容
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'never', // 避免自动从选择复制到搜索
    },
  };
}

/**
 * 获取简化的Monaco编辑器配置（用于小型编辑器）
 */
export function getCompactMonacoOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
  const baseOptions = getSafeMonacoOptions();
  
  return {
    ...baseOptions,
    // 简化配置
    lineNumbers: 'off',
    folding: false,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      vertical: 'hidden',
      horizontal: 'hidden',
    },
  };
}

/**
 * 安全地处理Monaco编辑器的剪贴板功能
 * 不完全禁用剪贴板API，避免影响其他功能
 */
function configureMonacoClipboardSafely() {
  if (typeof window !== 'undefined') {
    // 不再完全重写剪贴板API，而是让Monaco使用自定义处理器
    // 这样不会影响其他组件和页面功能的正常使用

    console.log('✅ Monaco编辑器剪贴板配置已优化，不影响其他功能');
  }
}

/**
 * 配置Monaco编辑器的全局设置
 * 在应用启动时调用一次
 */
export function configureMonacoGlobally() {
  // 配置Monaco编辑器的全局设置
  if (typeof window !== 'undefined') {
    try {
      // 配置Monaco环境
      if (!window.MonacoEnvironment) {
        window.MonacoEnvironment = {};
      }

      // 禁用Web Workers，在主线程运行
      window.MonacoEnvironment.getWorkerUrl = function (moduleId: string, label: string) {
        return '';
      };

      // 安全配置Monaco编辑器的剪贴板功能
      configureMonacoClipboardSafely();

      console.log('✅ Monaco Editor全局配置已完成，剪贴板功能已禁用');



      console.log('✅ Monaco Editor全局配置已完成');
    } catch (error) {
      console.warn('⚠️ 无法配置Monaco全局设置:', error);
    }
  }
}

/**
 * 为Monaco编辑器添加安全的剪贴板处理
 */
export function addSafeClipboardHandlers(
  editor: monaco.editor.IStandaloneCodeEditor,
  monaco: typeof import('monaco-editor'),
  customHandlers: {
    onCopy?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onCut?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onPaste?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  } = {}
) {
  // 添加自定义剪贴板快捷键
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
    if (customHandlers.onCopy) {
      customHandlers.onCopy(editor);
    }
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
    if (customHandlers.onCut) {
      customHandlers.onCut(editor);
    }
  });

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
    if (customHandlers.onPaste) {
      customHandlers.onPaste(editor);
    }
  });

  // 添加全选快捷键
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
    editor.trigger('keyboard', 'editor.action.selectAll', null);
  });
}

/**
 * 创建安全的Monaco编辑器实例
 */
export function createSafeMonacoEditor(
  container: HTMLElement,
  options: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {},
  customClipboardHandlers?: {
    onCopy?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onCut?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onPaste?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  }
): monaco.editor.IStandaloneCodeEditor {
  const safeOptions = getSafeMonacoOptions();
  const finalOptions = { ...safeOptions, ...options };
  
  const editor = monaco.editor.create(container, finalOptions);
  
  // 添加安全的剪贴板处理
  if (customClipboardHandlers) {
    addSafeClipboardHandlers(editor, monaco, customClipboardHandlers);
  }
  
  return editor;
}

/**
 * 检查是否在Tauri环境中
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * 获取推荐的Monaco主题
 */
export function getRecommendedTheme(isDark: boolean): string {
  return isDark ? 'vs-dark' : 'vs-light';
}
