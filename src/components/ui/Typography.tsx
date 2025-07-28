import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// =========================================================================
// SHADCN标准的Typography组件 - 完全使用CSS变量，无硬编码颜色
// =========================================================================

// Heading/Title component
const headingVariants = cva('scroll-m-20 tracking-tight text-foreground', {
  variants: {
    level: {
      1: 'text-4xl font-extrabold lg:text-5xl',
      2: 'border-b border-border pb-2 text-3xl font-semibold first:mt-0',
      3: 'text-2xl font-semibold',
      4: 'text-xl font-semibold',
      5: 'text-lg font-semibold',
      6: 'text-base font-semibold',
    },
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
    },
  },
  defaultVariants: {
    level: 1,
    variant: 'default',
  },
});

export interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  asChild?: boolean;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level = 1, variant, asChild = false, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(headingVariants({ level, variant }), className)}
          ref={ref}
          {...props}
        />
      );
    }

    const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

    return React.createElement(HeadingTag, {
      className: cn(headingVariants({ level, variant }), className),
      ref,
      ...props,
    });
  }
);
Heading.displayName = 'Heading';

// 保持向后兼容的Title组件
const Title = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ level = 1, ...props }, ref) => {
    return <Heading ref={ref} level={level} {...props} />;
  }
);
Title.displayName = 'Title';

// Text component - 纯shadcn实现
const textVariants = cva('', {
  variants: {
    variant: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-success',
      warning: 'text-warning',
      secondary: 'text-muted-foreground', // 向后兼容
      danger: 'text-destructive', // 向后兼容
    },
    size: {
      xs: 'text-xs',
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'sm',
    weight: 'normal',
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  asChild?: boolean;
  code?: boolean;
  kbd?: boolean;
  mark?: boolean;
  strong?: boolean;
  // 向后兼容的props
  type?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
  italic?: boolean;
  underline?: boolean;
  delete?: boolean;
}

const Text = React.forwardRef<HTMLElement, TextProps>(
  (
    {
      className,
      variant,
      size,
      weight,
      asChild = false,
      code = false,
      kbd = false,
      mark = false,
      strong = false,
      italic = false,
      underline = false,
      delete: del = false,
      type,
      ...props
    },
    ref
  ) => {
    // 向后兼容：type prop映射到variant
    const finalVariant = type ? type : variant;
    const finalWeight = strong ? 'semibold' : weight;

    if (code) {
      return (
        <code
          className={cn(
            'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
            textVariants({ variant: finalVariant, size }),
            className
          )}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        />
      );
    }

    if (kbd) {
      return (
        <kbd
          className={cn(
            'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100',
            className
          )}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        />
      );
    }

    if (mark) {
      return (
        <mark
          className={cn(
            'bg-warning/10 dark:bg-warning/20 px-1 py-0.5 rounded',
            textVariants({ variant: finalVariant, size, weight: finalWeight }),
            className
          )}
          ref={ref as React.Ref<HTMLElement>}
          {...props}
        />
      );
    }

    const Comp = asChild ? Slot : 'span';

    return (
      <Comp
        className={cn(
          textVariants({ variant: finalVariant, size, weight: finalWeight }),
          italic && 'italic',
          underline && 'underline',
          del && 'line-through',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Text.displayName = 'Text';

// Paragraph component - 纯shadcn实现
const paragraphVariants = cva(
  'leading-7 text-foreground [&:not(:first-child)]:mt-6',
  {
    variants: {
      size: {
        xs: 'text-xs',
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
        xl: 'text-xl',
      },
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        destructive: 'text-destructive',
        success: 'text-success',
        warning: 'text-warning',
      },
    },
    defaultVariants: {
      size: 'base',
      variant: 'default',
    },
  }
);

export interface ParagraphProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof paragraphVariants> {
  asChild?: boolean;
}

const Paragraph = React.forwardRef<HTMLParagraphElement, ParagraphProps>(
  ({ className, size, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';

    return (
      <Comp
        className={cn(paragraphVariants({ size, variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Paragraph.displayName = 'Paragraph';

// Lead text component
const Lead = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xl text-muted-foreground', className)}
    {...props}
  />
));
Lead.displayName = 'Lead';

// Large text component
const Large = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));
Large.displayName = 'Large';

// Small text component
const Small = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <small
      ref={ref}
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    />
  )
);
Small.displayName = 'Small';

// Muted text component
const Muted = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
Muted.displayName = 'Muted';

// Code block component
const CodeBlock = React.forwardRef<
  HTMLPreElement,
  React.HTMLAttributes<HTMLPreElement>
>(({ className, ...props }, ref) => (
  <pre
    ref={ref}
    className={cn(
      'mb-4 mt-6 overflow-x-auto rounded-lg border bg-muted px-6 py-4',
      className
    )}
    {...props}
  />
));
CodeBlock.displayName = 'CodeBlock';

// Inline code component
const InlineCode = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn(
      'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
      className
    )}
    {...props}
  />
));
InlineCode.displayName = 'InlineCode';

// =========================================================================
// 向后兼容的AntParagraph组件
// =========================================================================
export interface AntParagraphProps extends ParagraphProps {
  wrap?: boolean;
  code?: boolean;
  copyable?: boolean;
  ellipsis?: boolean;
  mark?: boolean;
  underline?: boolean;
  delete?: boolean;
  strong?: boolean;
  type?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

const AntParagraph = React.forwardRef<HTMLParagraphElement, AntParagraphProps>(
  (
    {
      className,
      size,
      variant,
      wrap = true,
      code = false,
      copyable = false,
      ellipsis = false,
      mark = false,
      underline = false,
      delete: del = false,
      strong = false,
      type,
      asChild = false,
      children,
      ...props
    },
    ref
  ) => {
    // 向后兼容：type prop映射到variant
    const finalVariant =
      type === 'secondary'
        ? 'muted'
        : type === 'danger'
          ? 'destructive'
          : type || variant;

    const Comp = asChild ? Slot : 'p';

    return (
      <Comp
        className={cn(
          paragraphVariants({ size, variant: finalVariant }),
          !wrap && 'whitespace-nowrap overflow-hidden',
          ellipsis && 'truncate',
          code && 'font-mono bg-muted rounded px-1',
          mark && 'bg-warning/10 dark:bg-warning/20 px-1 rounded',
          strong && 'font-semibold',
          underline && 'underline',
          del && 'line-through',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
        {copyable && (
          <button
            className='ml-2 text-xs text-muted-foreground hover:text-foreground transition-colors'
            onClick={async () => {
              if (typeof children === 'string') {
                const { writeToClipboard } = await import('@/utils/clipboard');
                await writeToClipboard(children, {
                  successMessage: '已复制到剪贴板',
                  showSuccess: false
                });
              }
            }}
            type='button'
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </Comp>
    );
  }
);
AntParagraph.displayName = 'AntParagraph';

// =========================================================================
// Typography namespace object for organized access
// =========================================================================
// Individual heading components
const H1 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 1, ref, ...props })
);
H1.displayName = 'H1';

const H2 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 2, ref, ...props })
);
H2.displayName = 'H2';

const H3 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 3, ref, ...props })
);
H3.displayName = 'H3';

const H4 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 4, ref, ...props })
);
H4.displayName = 'H4';

const H5 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 5, ref, ...props })
);
H5.displayName = 'H5';

const H6 = React.forwardRef<HTMLHeadingElement, Omit<HeadingProps, 'level'>>(
  (props, ref) => React.createElement(Heading, { level: 6, ref, ...props })
);
H6.displayName = 'H6';

export const Typography = {
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Title,
  Text,
  Paragraph,
  Lead,
  Large,
  Small,
  Muted,
  Code: InlineCode,
  CodeBlock,
} as const;

// =========================================================================
// 导出所有组件和类型
// =========================================================================
export {
  Heading,
  Title,
  Text,
  Paragraph,
  Lead,
  Large,
  Small,
  Muted,
  InlineCode,
  CodeBlock,
  AntParagraph,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  headingVariants,
  textVariants,
  paragraphVariants,
};

// 保持向后兼容的类型别名
export type TypographyProps = TextProps;
