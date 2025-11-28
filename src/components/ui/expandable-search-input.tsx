import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface ExpandableSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  inputClassName?: string;
  disabled?: boolean;
}

export const ExpandableSearchInput = React.forwardRef<
  HTMLInputElement,
  ExpandableSearchInputProps
>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = '搜索...',
      className,
      buttonClassName,
      inputClassName,
      disabled = false,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const hasValue = value && String(value).length > 0;

    // 合并外部ref和内部ref
    React.useImperativeHandle(ref, () => inputRef.current!);

    // 当Popover打开时,自动聚焦输入框
    React.useEffect(() => {
      if (open && inputRef.current) {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    }, [open]);

    // 处理输入变化
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    // 处理清除
    const handleClear = () => {
      onChange('');
      onClear?.();
      inputRef.current?.focus();
    };

    // 处理键盘事件
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'Enter') {
        // Enter键确认,可以选择关闭或保持打开
        // 这里保持打开,让用户可以继续编辑
      }
    };

    // 如果有值,自动打开Popover
    React.useEffect(() => {
      if (hasValue && !open) {
        setOpen(true);
      }
    }, [hasValue, open]);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant={hasValue ? 'default' : 'ghost'}
                size="sm"
                className={cn('relative', buttonClassName)}
                disabled={disabled}
              >
                <Search className="w-4 h-4" />
                {hasValue && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{placeholder}</TooltipContent>
        </Tooltip>

        <PopoverContent
          className={cn('w-80 p-2', className)}
          align="start"
          onOpenAutoFocus={(e) => {
            // 阻止默认的自动聚焦行为,我们在useEffect中手动处理
            e.preventDefault();
          }}
        >
          <div className="relative">
            {/* 搜索图标 - JetBrains New UI: 14px图标 */}
            <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
            </div>

            {/* 输入框 */}
            {/* JetBrains New UI: h-7(28px), text-[13px] */}
            <input
              ref={inputRef}
              type="text"
              className={cn(
                'flex w-full rounded-md border border-input bg-background text-[13px] ring-offset-background',
                'placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'h-7 py-1.5 pl-9',
                hasValue ? 'pr-9' : 'pr-3',
                inputClassName
              )}
              value={value}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
            />

            {/* 清除按钮 - JetBrains New UI: 14px图标 */}
            {hasValue && (
              <div className="absolute inset-y-0 right-2.5 flex items-center">
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 rounded-sm hover:bg-muted/50 transition-colors"
                  tabIndex={-1}
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

ExpandableSearchInput.displayName = 'ExpandableSearchInput';

