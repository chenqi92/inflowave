import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"},
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"}},
    defaultVariants: {
      variant: "default",
      size: "default"}}
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  icon?: React.ReactNode
  type?: "button" | "submit" | "reset" | "primary" | "default" | "dashed" | "text" | "link"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, icon, type, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    // 处理Ant Design兼容性
    let finalVariant = variant
    let finalSize = size
    
    // 转换type到variant
    if (type === "primary") finalVariant = "default"
    if (type === "default") finalVariant = "outline"
    if (type === "dashed") finalVariant = "outline"
    if (type === "text") finalVariant = "ghost"
    if (type === "link") finalVariant = "link"
    
    // 转换size
    if (size === "small") finalSize = "sm"
    if (size === "middle") finalSize = "default"
    if (size === "large") finalSize = "lg"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant: finalVariant, size: finalSize, className }))}
        ref={ref}
        disabled={disabled || loading}
        type={type === "primary" || type === "default" || type === "dashed" || type === "text" || type === "link" ? "button" : type}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {icon && !loading && <span className="mr-2">{icon}</span>}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
