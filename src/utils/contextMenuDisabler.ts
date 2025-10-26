/**
 * 上下文菜单禁用器
 * 在生产环境下禁用浏览器的右键菜单和一些快捷键
 */

import { isTauriEnvironment } from './tauri';

/**
 * 检查是否为生产环境
 */
const isProduction = (): boolean => {
  return import.meta.env.MODE === 'production';
};

/**
 * 禁用右键上下文菜单
 */
const disableContextMenu = (): void => {
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();
    return false;
  }, false);
};

/**
 * 禁用特定的键盘快捷键
 */
const disableKeyboardShortcuts = (): void => {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;

    // 检查是否在可编辑元素中
    const isEditable = target.isContentEditable ||
                     target.tagName === 'INPUT' ||
                     target.tagName === 'TEXTAREA' ||
                     target.closest('.cm-editor') ||  // CodeMirror 6
                     target.closest('.cm-content') ||  // CodeMirror 6 content area
                     target.closest('.cm6-editor-container') ||  // CodeMirror 6 container
                     target.closest('.CodeMirror') ||  // Legacy CodeMirror
                     target.closest('[contenteditable="true"]') ||
                     target.closest('.ProseMirror') ||
                     target.closest('[role="textbox"]');

    // 如果在可编辑元素中，不禁用任何键盘快捷键
    if (isEditable) {
      return;
    }

    // 只在非可编辑元素中禁用特定的浏览器快捷键

    // 禁用F5刷新
    if (e.key === 'F5') {
      e.preventDefault();
      return false;
    }

    // 禁用Ctrl+R刷新
    if (e.ctrlKey && e.key === 'r') {
      e.preventDefault();
      return false;
    }

    // 禁用F12开发者工具
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // 禁用Ctrl+Shift+I开发者工具
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }

    // 禁用Ctrl+U查看源码
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }

    // 禁用Ctrl+Shift+C开发者工具（但不是复制）
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      return false;
    }

    // 禁用Ctrl+Shift+J开发者工具
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    
    // 禁用Ctrl+Shift+K开发者工具 (Firefox)
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      return false;
    }
  }, false);
};

/**
 * 禁用文本选择（可选）
 */
const disableTextSelection = (): void => {
  document.addEventListener('selectstart', (e: Event) => {
    e.preventDefault();
    return false;
  }, false);
  
  document.addEventListener('dragstart', (e: DragEvent) => {
    e.preventDefault();
    return false;
  }, false);
};

/**
 * 初始化上下文菜单禁用器
 */
export const initializeContextMenuDisabler = (): void => {
  // 只在Tauri环境的生产版本中禁用
  if (!isTauriEnvironment() || !isProduction()) {
    console.log('开发环境或浏览器环境：保留右键菜单和快捷键用于调试');
    return;
  }
  
  console.log('生产环境：禁用右键菜单和浏览器快捷键');
  
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupDisablers();
    });
  } else {
    setupDisablers();
  }
};

/**
 * 设置禁用器
 */
const setupDisablers = (): void => {
  try {
    // 禁用右键菜单
    disableContextMenu();
    
    // 禁用键盘快捷键
    disableKeyboardShortcuts();
    
    // 可选：禁用文本选择（取消注释以启用）
    // disableTextSelection();
    
    console.log('✅ 生产环境安全措施已启用：已禁用右键菜单和浏览器快捷键');
  } catch (error) {
    console.error('❌ 设置上下文菜单禁用器失败:', error);
  }
};

/**
 * 移除上下文菜单禁用器（用于测试或特殊情况）
 */
export const removeContextMenuDisabler = (): void => {
  // 这个功能需要保存事件监听器的引用才能正确移除
  // 目前的实现不支持移除，如果需要可以重构
  console.warn('移除上下文菜单禁用器功能尚未实现');
};

/**
 * 检查上下文菜单禁用器是否已启用
 */
export const isContextMenuDisabled = (): boolean => {
  return isTauriEnvironment() && isProduction();
};
