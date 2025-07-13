import * as React from "react"
import { cn } from "@/lib/utils"

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

const Title = React.forwardRef<
  HTMLHeadingElement,
  TypographyProps & { level?: 1 | 2 | 3 | 4 | 5 }
>(({ className, level = 1, children, ...props }, ref) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements
  
  const variants = {
    1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
    2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
    3: "scroll-m-20 text-2xl font-semibold tracking-tight",
    4: "scroll-m-20 text-xl font-semibold tracking-tight",
    5: "scroll-m-20 text-lg font-semibold tracking-tight"
  }
  
  return (
    <Component
      ref={ref}
      className={cn(variants[level], className)}
      {...props}
    >
      {children}
    </Component>
  )
})
Title.displayName = "Title"

const Text = React.forwardRef<
  HTMLSpanElement,
  TypographyProps & {
    type?: "secondary" | "success" | "warning" | "danger"
    strong?: boolean
    code?: boolean
  }
>(({ className, type, strong, code, children, ...props }, ref) => {
  const variants = {
    secondary: "text-muted-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600"
  }

  // Remove code, strong, and type from props to prevent them from being passed to DOM
  const { code: _, strong: __, type: ___, ...domProps } = props as any;

  if (code) {
    return (
      <code
        ref={ref}
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
          type && variants[type],
          className
        )}
        {...domProps}
      >
        {children}
      </code>
    )
  }

  return (
    <span
      ref={ref}
      className={cn(
        "text-sm",
        strong && "font-semibold",
        type && variants[type],
        className
      )}
      {...domProps}
    >
      {children}
    </span>
  )
})
Text.displayName = "Text"

const Paragraph = React.forwardRef<
  HTMLParagraphElement,
  TypographyProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("leading-7 [&:not(:first-child)]:mt-6", className)}
      {...props}
    >
      {children}
    </p>
  )
})
Paragraph.displayName = "Paragraph"

// Ant Design compatible Paragraph component
interface AntParagraphProps extends TypographyProps {
  wrap?: boolean;
  code?: boolean;
  copyable?: boolean;
  ellipsis?: boolean;
  mark?: boolean;
  underline?: boolean;
  delete?: boolean;
  strong?: boolean;
  type?: "secondary" | "success" | "warning" | "danger";
}

const AntParagraph = React.forwardRef<
  HTMLParagraphElement,
  AntParagraphProps
>(({
  className,
  children,
  wrap = true,
  code = false,
  copyable = false,
  ellipsis = false,
  mark = false,
  underline = false,
  delete: del = false,
  strong = false,
  type,
  ...props
}, ref) => {
  // Filter out Ant Design specific props that shouldn't be passed to DOM
  const {
    wrap: _wrap,
    code: _code,
    copyable: _copyable,
    ellipsis: _ellipsis,
    mark: _mark,
    underline: _underline,
    delete: _delete,
    strong: _strong,
    type: _type,
    ...domProps
  } = props as any;

  const typeVariants = {
    secondary: "text-muted-foreground",
    success: "text-green-600",
    warning: "text-yellow-600",
    danger: "text-red-600"
  };

  let content = children;

  // Build className for the paragraph element
  let paragraphClassName = cn(
    "leading-7 [&:not(:first-child)]:mt-6",
    !wrap && "whitespace-nowrap",
    ellipsis && "truncate",
    type && typeVariants[type],
    code && "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
    mark && "bg-yellow-200 px-1",
    strong && "font-semibold",
    underline && "underline",
    del && "line-through",
    className
  );

  return (
    <p
      ref={ref}
      className={paragraphClassName}
      {...domProps}
    >
      {children}
      {copyable && (
        <button
          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (typeof children === 'string') {
              navigator.clipboard.writeText(children);
            }
          }}
        >
          📋
        </button>
      )}
    </p>
  );
});

AntParagraph.displayName = "AntParagraph";

export { Title, Text, Paragraph, AntParagraph }
export type { TypographyProps, AntParagraphProps }