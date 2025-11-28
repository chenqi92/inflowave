import * as React from 'react';

import { cn } from '@/lib/utils';
import { readFromClipboard } from '@/utils/clipboard';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, onKeyDown, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // 合并 refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 处理粘贴快捷键 (Cmd+V / Ctrl+V)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();

        try {
          // 从 Tauri clipboard 读取内容
          const clipboardText = await readFromClipboard({ showError: false });

          if (clipboardText && inputRef.current) {
            const input = inputRef.current;
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const currentValue = input.value;

            // 在光标位置插入剪贴板内容
            const newValue =
              currentValue.substring(0, start) +
              clipboardText +
              currentValue.substring(end);

            // 更新 input 的值
            input.value = newValue;

            // 设置光标位置到粘贴内容之后
            const newCursorPos = start + clipboardText.length;
            input.setSelectionRange(newCursorPos, newCursorPos);

            // 触发 onChange 事件以保持受控组件的同步
            if (onChange) {
              const syntheticEvent = {
                target: input,
                currentTarget: input,
              } as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }

            // 触发 input 事件以通知其他监听器
            input.dispatchEvent(new Event('input', { bubbles: true }));
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
      <input
        type={type}
        className={cn(
          // JetBrains New UI 风格: 28px 高度, 4px 圆角, 13px 字体, 100ms 过渡
          'flex h-7 w-full rounded border border-input bg-background px-2 py-1 text-[13px] ring-offset-background transition-colors duration-100',
          'file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={inputRef}
        onKeyDown={handleKeyDown}
        onChange={onChange}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
