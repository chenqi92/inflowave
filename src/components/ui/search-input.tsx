import * as React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  onClear?: () => void;
  showClearButton?: boolean;
  iconSize?: 'sm' | 'md';
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ 
    className, 
    value, 
    onClear, 
    showClearButton = true, 
    iconSize = 'md',
    ...props 
  }, ref) => {
    const hasValue = value && String(value).length > 0;
    const iconSizeClass = iconSize === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
    const paddingClass = iconSize === 'sm' ? 'pl-8' : 'pl-10';
    const leftPosition = iconSize === 'sm' ? 'left-2.5' : 'left-3';
    const rightPosition = iconSize === 'sm' ? 'right-2' : 'right-3';

    return (
      <div className="relative">
        {/* 搜索图标 - 使用 flex 容器来确保垂直居中 */}
        <div className={cn(
          "absolute inset-y-0 flex items-center pointer-events-none z-10",
          leftPosition
        )}>
          <Search className={cn(iconSizeClass, "text-muted-foreground")} />
        </div>
        
        {/* 输入框 */}
        <input
          type="text"
          className={cn(
            // 基础样式
            'flex w-full rounded-md border border-input bg-background text-sm ring-offset-background',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // 高度和内边距
            iconSize === 'sm' ? 'h-8 py-1.5' : 'h-9 py-2',
            paddingClass,
            // 右侧内边距（为清除按钮留空间）
            showClearButton && hasValue ? (iconSize === 'sm' ? 'pr-8' : 'pr-10') : 'pr-3',
            className
          )}
          value={value}
          ref={ref}
          {...props}
        />
        
        {/* 清除按钮 */}
        {showClearButton && hasValue && onClear && (
          <div className={cn(
            "absolute inset-y-0 flex items-center",
            rightPosition
          )}>
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded-sm hover:bg-muted/50 transition-colors"
              tabIndex={-1}
            >
              <X className={cn(iconSizeClass, "text-muted-foreground hover:text-foreground")} />
            </button>
          </div>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export { SearchInput };