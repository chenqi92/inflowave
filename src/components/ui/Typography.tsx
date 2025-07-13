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

export { Title, Text, Paragraph }
export type { TypographyProps }