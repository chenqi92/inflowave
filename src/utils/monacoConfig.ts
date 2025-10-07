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
      // 在最早的时机拦截剪贴板 API，防止 Monaco Editor 触发权限请求
      if (navigator.clipboard) {
        const originalClipboard = navigator.clipboard;

        // 创建一个代理对象，静默处理所有剪贴板操作
        const silentClipboard = {
          writeText: async (text: string) => {
            console.debug('[Monaco] 拦截剪贴板写入操作');
            // 静默成功，不实际操作剪贴板
            return Promise.resolve();
          },
          readText: async () => {
            console.debug('[Monaco] 拦截剪贴板读取操作');
            // 返回空字符串
            return Promise.resolve('');
          },
          write: async () => {
            console.debug('[Monaco] 拦截剪贴板 write 操作');
            return Promise.resolve();
          },
          read: async () => {
            console.debug('[Monaco] 拦截剪贴板 read 操作');
            return Promise.resolve([]);
          },
        };

        // 尝试替换 navigator.clipboard（可能会失败，因为它是只读的）
        try {
          Object.defineProperty(navigator, 'clipboard', {
            value: silentClipboard,
            writable: false,
            configurable: true,
          });
          console.log('✅ 成功拦截 navigator.clipboard API');
        } catch (e) {
          console.warn('⚠️ 无法替换 navigator.clipboard，将在编辑器挂载时处理');
        }
      }

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
