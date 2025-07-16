import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { themeColors, getThemeColorOptions } from '@/lib/theme-colors';

interface ThemeColorSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ThemeColorSelector({
  value,
  onChange,
  className,
}: ThemeColorSelectorProps) {
  const colorOptions = getThemeColorOptions();

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {colorOptions.map(option => {
        const isSelected = value === option.value;
        const primaryHsl = option.primary;

        return (
          <div
            key={option.value}
            className={cn(
              'relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onChange(option.value)}
          >
            {/* 颜色预览圆圈 */}
            <div
              className='w-8 h-8 rounded-full border-2 border-white shadow-sm relative'
              style={{
                backgroundColor: `hsl(${primaryHsl})`,
              }}
            >
              {isSelected && (
                <div className='absolute inset-0 flex items-center justify-center'>
                  <Check className='w-4 h-4 text-white' />
                </div>
              )}
            </div>

            {/* 颜色名称 */}
            <span
              className={cn(
                'text-xs font-medium text-center',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {option.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 简化版本的颜色选择器，只显示颜色圆圈
export function SimpleThemeColorSelector({
  value,
  onChange,
  className,
}: ThemeColorSelectorProps) {
  const colorOptions = getThemeColorOptions();

  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {colorOptions.map(option => {
        const isSelected = value === option.value;
        const primaryHsl = option.primary;

        return (
          <div
            key={option.value}
            className={cn(
              'relative w-8 h-8 rounded-full border-2 cursor-pointer transition-all hover:scale-110',
              isSelected
                ? 'border-primary shadow-md'
                : 'border-white shadow-sm hover:border-primary/50'
            )}
            style={{
              backgroundColor: `hsl(${primaryHsl})`,
            }}
            onClick={() => onChange(option.value)}
            title={option.label}
          >
            {isSelected && (
              <div className='absolute inset-0 flex items-center justify-center'>
                <Check className='w-4 h-4 text-white' />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 带预览的主题颜色选择器
export function ThemeColorSelectorWithPreview({
  value,
  onChange,
  className,
}: ThemeColorSelectorProps) {
  const colorOptions = getThemeColorOptions();
  const selectedColor = themeColors[value];

  return (
    <div className={cn('space-y-4', className)}>
      {/* 当前选择的颜色预览 */}
      {selectedColor && (
        <div className='p-4 rounded-lg border bg-card'>
          <div className='flex items-center gap-3 mb-3'>
            <div
              className='w-6 h-6 rounded-full border-2 border-white shadow-sm'
              style={{ backgroundColor: `hsl(${selectedColor.primary})` }}
            />
            <span className='font-medium'>{selectedColor.label}</span>
          </div>

          {/* 颜色组合预览 */}
          <div className='grid grid-cols-3 gap-2 text-xs'>
            <div
              className='p-2 rounded text-center'
              style={{
                backgroundColor: `hsl(${selectedColor.primary})`,
                color: `hsl(${selectedColor.primaryForeground})`,
              }}
            >
              主色
            </div>
            <div
              className='p-2 rounded text-center'
              style={{
                backgroundColor: `hsl(${selectedColor.secondary})`,
                color: `hsl(${selectedColor.secondaryForeground})`,
              }}
            >
              次要
            </div>
            <div
              className='p-2 rounded text-center'
              style={{
                backgroundColor: `hsl(${selectedColor.accent})`,
                color: `hsl(${selectedColor.accentForeground})`,
              }}
            >
              强调
            </div>
          </div>
        </div>
      )}

      {/* 颜色选择器 */}
      <ThemeColorSelector value={value} onChange={onChange} />
    </div>
  );
}
