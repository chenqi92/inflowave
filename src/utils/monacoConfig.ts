/**
 * Monaco Editor 全局配置工具
 * 统一管理Monaco编辑器的配置，特别是Worker和剪贴板相关设置
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

      // 配置Monaco Editor的Worker
      window.MonacoEnvironment.getWorkerUrl = function (moduleId: string, label: string) {
        console.log('Monaco Worker请求:', { moduleId, label });
        
        // 根据不同的语言服务返回相应的Worker
        switch (label) {
          case 'json':
            return new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url).href;
          case 'css':
          case 'scss':
          case 'less':
            return new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url).href;
          case 'html':
          case 'handlebars':
          case 'razor':
            return new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url).href;
          case 'typescript':
          case 'javascript':
            return new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url).href;
          default:
            return new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url).href;
        }
      };

      console.log('✅ Monaco Editor全局配置已完成，Worker配置已设置');
    } catch (error) {
      console.warn('⚠️ 无法配置Monaco全局设置:', error);
      
      // 回退到简单的Worker配置
      if (window.MonacoEnvironment) {
        window.MonacoEnvironment.getWorkerUrl = () => {
          return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
            self.onmessage = function(e) {
              self.postMessage(e.data);
            };
          `)}`;
        };
        console.log('🔄 使用回退Worker配置');
      }
    }
  }
}

/**
 * 创建安全的Monaco编辑器实例
 */
export function createSafeMonacoEditor(
  container: HTMLElement,
  options: Partial<monaco.editor.IStandaloneEditorConstructionOptions> = {}
): monaco.editor.IStandaloneCodeEditor {
  const safeOptions = getSafeMonacoOptions();
  const finalOptions = { ...safeOptions, ...options };
  
  const editor = monaco.editor.create(container, finalOptions);
  
  return editor;
}
