import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Button 组件 - JetBrains New UI 风格
 *
 * 尺寸规范:
 * - sm: 24px 高度
 * - default: 28px 高度
 * - lg: 32px 高度
 * - icon: 28px x 28px
 *
 * 样式特点:
 * - 4px 圆角 (桌面应用风格)
 * - 13px 字体
 * - 100ms 过渡动画
 * - 微妙的 hover 效果
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-[13px] font-medium transition-colors duration-100 flex-shrink-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:lucide-icon',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:outline-none',
      },
      size: {
        default: 'h-7 px-3 py-1',
        sm: 'h-6 px-2 py-0.5',
        lg: 'h-8 px-4 py-1.5',
        icon: 'h-7 w-7',
        'icon-sm': 'h-6 w-6',
        'icon-lg': 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
