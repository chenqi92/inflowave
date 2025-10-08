/**
 * Monaco Editor 全局配置工具
 * 统一管理Monaco编辑器的配置
 * 注意：这是桌面应用，完全支持剪贴板功能
 */

import * as monaco from 'monaco-editor';
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

/**
 * 获取Monaco编辑器配置（桌面应用版本）
 * 完全启用剪贴板和所有编辑器功能
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

    // 桌面应用：完全启用剪贴板功能
    copyWithSyntaxHighlighting: true, // 启用语法高亮复制
    links: true, // 启用链接检测
    dragAndDrop: true, // 启用拖拽
    selectionClipboard: false, // 禁用Linux风格的选择即复制（保持Windows/Mac行为）

    // 多光标配置
    multiCursorModifier: 'alt',

    // 查找配置
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'selection', // 从选择自动填充搜索
    },
  };
}

/**
 * 配置Monaco编辑器的全局设置
 * 在应用启动时调用一次
 * 桌面应用版本：使用Tauri剪贴板API替代浏览器API
 */
export function configureMonacoGlobally() {
  if (typeof window !== 'undefined') {
    try {
      // 为Monaco创建剪贴板polyfill，使用Tauri的剪贴板API
      // 这样Monaco内部的剪贴板操作会通过Tauri执行，避免权限错误
      const tauriClipboard = {
        writeText: async (text: string) => {
          try {
            await writeText(text);
            return Promise.resolve();
          } catch (error) {
            console.error('Tauri剪贴板写入失败:', error);
            return Promise.reject(error);
          }
        },
        readText: async () => {
          try {
            const text = await readText();
            return Promise.resolve(text || '');
          } catch (error) {
            console.error('Tauri剪贴板读取失败:', error);
            return Promise.reject(error);
          }
        },
        // write 和 read 方法用于处理富文本，这里简化处理
        write: async (data: any) => {
          try {
            // 尝试从ClipboardItem中提取文本
            if (data && data.length > 0) {
              const item = data[0];
              if (item && typeof item.getType === 'function') {
                try {
                  const blob = await item.getType('text/plain');
                  const text = await blob.text();
                  await writeText(text);
                  return Promise.resolve();
                } catch (e) {
                  // 如果无法提取，静默成功
                  return Promise.resolve();
                }
              }
            }
            return Promise.resolve();
          } catch (error) {
            console.error('Tauri剪贴板write失败:', error);
            return Promise.resolve(); // 静默成功，避免Monaco报错
          }
        },
        read: async () => {
          try {
            const text = await readText();
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
              ] as any);
            }
            return Promise.resolve([]);
          } catch (error) {
            console.error('Tauri剪贴板read失败:', error);
            return Promise.resolve([]);
          }
        }
      };

      // 替换navigator.clipboard
      try {
        Object.defineProperty(navigator, 'clipboard', {
          value: tauriClipboard,
          writable: false,
          configurable: true,
        });
        console.log('✅ 成功将navigator.clipboard重定向到Tauri剪贴板API');
      } catch (e) {
        console.warn('⚠️ 无法替换navigator.clipboard，Monaco可能无法使用剪贴板');
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

      console.log('✅ Monaco Editor全局配置已完成（桌面应用模式，使用Tauri剪贴板）');
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
