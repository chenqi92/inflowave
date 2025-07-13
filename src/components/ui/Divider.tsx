import * as React from "react"
import { cn } from "@/lib/utils"

interface DividerProps {
  className?: string
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
  children?: React.ReactNode
  dashed?: boolean
  type?: "horizontal" | "vertical"
}

const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = "horizontal", decorative = true, children, dashed, type, ...props }, ref) => {
    const isVertical = orientation === "vertical" || type === "vertical"
    
    if (children) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex items-center",
            isVertical ? "flex-col" : "flex-row",
            className
          )}
          {...props}
        >
          <div
            className={cn(
              "flex-1 border-border",
              dashed ? "border-dashed" : "border-solid",
              isVertical ? "border-t" : "border-l"
            )}
          />
          <div className={cn("px-3", isVertical && "py-3 px-0")}>
            <span className="text-sm text-muted-foreground">{children}</span>
          </div>
          <div
            className={cn(
              "flex-1 border-border",
              dashed ? "border-dashed" : "border-solid", 
              isVertical ? "border-t" : "border-l"
            )}
          />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "border-border",
          dashed ? "border-dashed" : "border-solid",
          isVertical 
            ? "h-full min-h-[1rem] border-l" 
            : "w-full border-t",
          className
        )}
        {...props}
      />
    )
  }
)
Divider.displayName = "Divider"

export { Divider }
export type { DividerProps }