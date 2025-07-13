import * as React from "react"
import { cn } from "@/lib/utils"

interface SpaceProps {
  className?: string
  direction?: "horizontal" | "vertical"
  size?: "small" | "middle" | "large" | number
  align?: "start" | "end" | "center" | "baseline"
  wrap?: boolean
  split?: React.ReactNode
  children?: React.ReactNode
}

const Space = React.forwardRef<HTMLDivElement, SpaceProps>(
  ({
    className,
    direction = "horizontal",
    size = "small",
    align = "center",
    wrap = false,
    split,
    children,
    ...props
  }, ref) => {
    // Remove custom props to prevent them from being passed to DOM
    const { direction: _, size: __, align: ___, wrap: ____, split: _____, ...domProps } = props as any;
    const isHorizontal = direction === "horizontal"
    
    const sizeMap = {
      small: isHorizontal ? "space-x-2" : "space-y-2",
      middle: isHorizontal ? "space-x-4" : "space-y-4", 
      large: isHorizontal ? "space-x-8" : "space-y-8"
    }
    
    const alignMap = {
      start: "items-start",
      end: "items-end", 
      center: "items-center",
      baseline: "items-baseline"
    }
    
    const spaceClass = typeof size === "number" 
      ? isHorizontal 
        ? { gap: `${size}px` }
        : { gap: `${size}px` }
      : sizeMap[size]
    
    const style = typeof size === "number" ? spaceClass : undefined
    
    if (!children) return null
    
    const childrenArray = React.Children.toArray(children).filter(Boolean)
    
    if (childrenArray.length === 0) return null
    
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          isHorizontal ? "flex-row" : "flex-col",
          alignMap[align],
          wrap && isHorizontal && "flex-wrap",
          typeof size !== "number" && spaceClass,
          className
        )}
        style={style}
        {...domProps}
      >
        {childrenArray.map((child, index) => (
          <React.Fragment key={index}>
            {child}
            {split && index < childrenArray.length - 1 && (
              <div className={cn(
                "flex-shrink-0",
                isHorizontal ? "self-center" : "self-stretch w-full text-center"
              )}>
                {split}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }
)
Space.displayName = "Space"

export { Space }
export type { SpaceProps }