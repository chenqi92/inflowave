import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const tagVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100",
        warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-100",
        processing: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface TagProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tagVariants> {
  closable?: boolean
  onClose?: () => void
  color?: string
}

const Tag = React.forwardRef<HTMLDivElement, TagProps>(
  ({ className, variant, closable, onClose, color, children, style, ...props }, ref) => {
    const customStyle = color ? {
      backgroundColor: color,
      borderColor: color,
      color: '#fff',
      ...style
    } : style

    return (
      <div
        ref={ref}
        className={cn(tagVariants({ variant }), className)}
        style={customStyle}
        {...props}
      >
        {children}
        {closable && onClose && (
          <button
            onClick={onClose}
            className="ml-1 rounded-full hover:bg-white/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }
)
Tag.displayName = "Tag"

export { Tag, tagVariants }