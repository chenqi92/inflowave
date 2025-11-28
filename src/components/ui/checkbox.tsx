import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Checkbox 组件 - JetBrains New UI 风格
 *
 * 尺寸规范:
 * - 默认: 14px x 14px
 * - 圆角: 2px (更方正的桌面应用风格)
 */
const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => {
  // 检查className中是否有自定义尺寸，如果有则调整对勾大小
  const hasCustomSize = className?.includes('h-3.5') || className?.includes('h-3 ');
  const checkSize = hasCustomSize ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        // JetBrains New UI 风格: 14px 尺寸, 2px 圆角
        'peer h-3.5 w-3.5 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn('flex items-center justify-center text-current')}
      >
        <Check className={checkSize} strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
