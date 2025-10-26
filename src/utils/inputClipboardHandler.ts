/**
 * 输入框剪贴板处理器
 * 专门处理输入框的复制粘贴快捷键，确保在 Tauri 环境中正常工作
 */

import { writeToClipboard, readFromClipboard } from './clipboard';

/**
 * 检查元素是否是可编辑的输入元素
 */
function isEditableElement(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (!element) return false;

  // 排除 CodeMirror 编辑器（检查所有可能的类名）
  if (element.closest('.cm-editor') ||
      element.closest('.cm-content') ||
      element.closest('.cm6-editor-container') ||
      element.closest('.CodeMirror')) {
    return false;
  }

  const htmlElement = element as HTMLElement;

  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    htmlElement.isContentEditable ||
    element.closest('[contenteditable="true"]') !== null ||
    element.closest('.ProseMirror') !== null ||
    element.closest('[role="textbox"]') !== null
  );
}

/**
 * 处理输入框的复制操作
 */
async function handleInputCopy(element: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
  try {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const selectedText = element.value.substring(start, end);
    
    if (selectedText) {
      await writeToClipboard(selectedText, { showSuccess: false });
      return true;
    }
    return false;
  } catch (error) {
    console.error('输入框复制失败:', error);
    return false;
  }
}

/**
 * 处理输入框的剪切操作
 */
async function handleInputCut(element: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
  try {
    const start = element.selectionStart || 0;
    const end = element.selectionEnd || 0;
    const selectedText = element.value.substring(start, end);
    
    if (selectedText) {
      // 复制到剪贴板
      await writeToClipboard(selectedText, { showSuccess: false });
      
      // 删除选中的文本
      const newValue = element.value.substring(0, start) + element.value.substring(end);
      element.value = newValue;
      element.selectionStart = element.selectionEnd = start;
      
      // 触发input事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      
      return true;
    }
    return false;
  } catch (error) {
    console.error('输入框剪切失败:', error);
    return false;
  }
}

/**
 * 处理输入框的粘贴操作
 */
async function handleInputPaste(element: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
  try {
    const text = await readFromClipboard({ showError: false });

    // 检查文本是否有效（不为空且不只是空白字符）
    if (text && text.trim()) {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const currentValue = element.value;
      const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

      element.value = newValue;
      element.selectionStart = element.selectionEnd = start + text.length;

      // 触发input事件
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));

      element.focus();

      console.log('输入框粘贴成功:', {
        elementType: element.tagName,
        textLength: text.length,
        preview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      });

      return true;
    } else {
      console.warn('剪贴板内容无效，跳过粘贴操作:', { text, isEmpty: !text, isWhitespace: text && !text.trim() });
      return false;
    }
  } catch (error) {
    console.error('输入框粘贴失败:', error);
    return false;
  }
}

/**
 * 处理输入框的全选操作
 */
function handleInputSelectAll(element: HTMLInputElement | HTMLTextAreaElement): boolean {
  try {
    element.select();
    return true;
  } catch (error) {
    console.error('输入框全选失败:', error);
    return false;
  }
}

/**
 * 全局键盘事件处理器
 */
function handleGlobalKeyDown(event: KeyboardEvent): void {
  const target = event.target as Element;

  // 添加详细日志用于调试
  const isSystemKey = (event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a', 'z', 'y'].includes(event.key.toLowerCase());

  // ⚠️ 重要：先检查 CodeMirror，因为 isEditableElement 会排除它
  const isCodeMirror = target.closest('.cm-editor') ||
                       target.closest('.cm-content') ||
                       target.closest('.cm6-editor-container') ||
                       target.closest('.CodeMirror');

  if (isSystemKey) {
    console.log('🔍 [InputClipboardHandler] 捕获阶段拦截到系统快捷键', {
      key: event.key,
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      isCodeMirror,
      targetTag: (target as HTMLElement).tagName,
      targetClass: (target as HTMLElement).className,
      targetClosest_cm_editor: !!target.closest('.cm-editor'),
      targetClosest_cm_content: !!target.closest('.cm-content'),
      targetClosest_cm6_container: !!target.closest('.cm6-editor-container'),
    });
  }

  if (isCodeMirror) {
    if (isSystemKey) {
      console.log('✅ [InputClipboardHandler] 检测到 CodeMirror，不拦截事件');
    }
    // CodeMirror 有自己的剪贴板处理，完全不干预
    return;
  }

  // 只处理其他输入元素
  if (!isEditableElement(target)) {
    if (isSystemKey) {
      console.log('🔍 [InputClipboardHandler] 不是可编辑元素，不处理');
    }
    return;
  }

  if (isSystemKey) {
    console.log('⚠️ [InputClipboardHandler] 将处理此快捷键（非 CodeMirror 的输入元素）', {
      key: event.key,
      targetTag: (target as HTMLElement).tagName,
      targetClass: (target as HTMLElement).className,
      targetId: (target as HTMLElement).id,
    });
  }

  const isCtrlOrCmd = event.ctrlKey || event.metaKey;

  if (!isCtrlOrCmd) {
    return;
  }

  const inputElement = target as HTMLInputElement | HTMLTextAreaElement;

  switch (event.key.toLowerCase()) {
    case 'c':
      // Ctrl+C 复制
      console.log('❌ [InputClipboardHandler] 阻止 Ctrl+C 并手动处理');
      event.preventDefault();
      event.stopPropagation();
      handleInputCopy(inputElement);
      break;

    case 'x':
      // Ctrl+X 剪切
      console.log('❌ [InputClipboardHandler] 阻止 Ctrl+X 并手动处理');
      event.preventDefault();
      event.stopPropagation();
      handleInputCut(inputElement);
      break;

    case 'v':
      // Ctrl+V 粘贴
      console.log('❌ [InputClipboardHandler] 阻止 Ctrl+V 并手动处理');
      event.preventDefault();
      event.stopPropagation();
      handleInputPaste(inputElement);
      break;

    case 'a':
      // Ctrl+A 全选
      console.log('❌ [InputClipboardHandler] 阻止 Ctrl+A 并手动处理');
      event.preventDefault();
      event.stopPropagation();
      handleInputSelectAll(inputElement);
      break;
  }
}

/**
 * 初始化输入框剪贴板处理器
 */
export function initializeInputClipboardHandler(): () => void {
  // 在捕获阶段添加事件监听器，确保优先处理
  document.addEventListener('keydown', handleGlobalKeyDown, true);
  
  console.log('✅ 输入框剪贴板处理器已初始化');
  
  // 返回清理函数
  return () => {
    document.removeEventListener('keydown', handleGlobalKeyDown, true);
    console.log('🧹 输入框剪贴板处理器已清理');
  };
}

// 导出便捷方法
export const inputClipboard = {
  copy: handleInputCopy,
  cut: handleInputCut,
  paste: handleInputPaste,
  selectAll: handleInputSelectAll,
  initialize: initializeInputClipboardHandler,
};
