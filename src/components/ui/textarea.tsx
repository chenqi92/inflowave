import * as React from 'react';

import { cn } from '@/lib/utils';
import { readFromClipboard } from '@/utils/clipboard';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, onKeyDown, onChange, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 合并 refs
  React.useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 处理粘贴快捷键 (Cmd+V / Ctrl+V)
    if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      e.preventDefault();

      try {
        // 从 Tauri clipboard 读取内容
        const clipboardText = await readFromClipboard({ showError: false });

        if (clipboardText && textareaRef.current) {
          const textarea = textareaRef.current;
          const start = textarea.selectionStart || 0;
          const end = textarea.selectionEnd || 0;
          const currentValue = textarea.value;

          // 在光标位置插入剪贴板内容
          const newValue =
            currentValue.substring(0, start) +
            clipboardText +
            currentValue.substring(end);

          // 更新 textarea 的值
          textarea.value = newValue;

          // 设置光标位置到粘贴内容之后
          const newCursorPos = start + clipboardText.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);

          // 触发 onChange 事件以保持受控组件的同步
          if (onChange) {
            const syntheticEvent = {
              target: textarea,
              currentTarget: textarea,
            } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(syntheticEvent);
          }

          // 触发 input 事件以通知其他监听器
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (error) {
        console.error('粘贴失败:', error);
      }
    }

    // 调用原有的 onKeyDown 处理器
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      ref={textareaRef}
      onKeyDown={handleKeyDown}
      onChange={onChange}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
