import * as React from "react"
import { cn } from "@/lib/utils"
import { Clock, CheckCircle, XCircle, AlertCircle, Circle } from "lucide-react"

interface TimelineItem {
  key?: string
  children?: React.ReactNode
  color?: "blue" | "green" | "red" | "yellow" | "gray" | string
  dot?: React.ReactNode
  label?: React.ReactNode
  position?: "left" | "right"
}

interface TimelineProps {
  className?: string
  pending?: React.ReactNode | boolean
  pendingDot?: React.ReactNode
  reverse?: boolean
  mode?: "left" | "alternate" | "right"
  items?: TimelineItem[]
  children?: React.ReactNode
}

const Timeline = React.forwardRef<HTMLDivElement, TimelineProps>(
  ({ 
    className, 
    pending, 
    pendingDot, 
    reverse = false, 
    mode = "left",
    items = [],
    children,
    ...props 
  }, ref) => {
    // 处理items数据
    const processedItems = items.length > 0 ? items : []
    
    // 如果有children，转换为items格式
    const childItems = React.Children.toArray(children).filter(
      child => React.isValidElement(child) && child.type === TimelineItem
    ).map((child: any, index) => ({
      key: child.key || index.toString(),
      children: child.props.children,
      color: child.props.color,
      dot: child.props.dot,
      label: child.props.label,
      position: child.props.position
    }))

    let allItems = processedItems.length > 0 ? processedItems : childItems

    // 添加pending项
    if (pending) {
      const pendingItem: TimelineItem = {
        key: 'pending',
        children: typeof pending === 'boolean' ? null : pending,
        dot: pendingDot || <Clock className="h-3 w-3 animate-spin" />,
        color: 'blue'
      }
      allItems = [...allItems, pendingItem]
    }

    // 如果reverse为true，反转数组
    if (reverse) {
      allItems = [...allItems].reverse()
    }

    const getDefaultDot = (color?: string) => {
      switch (color) {
        case 'green':
          return <CheckCircle className="h-3 w-3 text-success" />
        case 'red':
          return <XCircle className="h-3 w-3 text-destructive" />
        case 'yellow':
          return <AlertCircle className="h-3 w-3 text-yellow-500" />
        case 'blue':
          return <Circle className="h-3 w-3 text-primary fill-current" />
        default:
          return <Circle className="h-3 w-3 text-gray-400 fill-current" />
      }
    }

    const getItemPosition = (item: TimelineItem, index: number) => {
      if (mode === "alternate") {
        return item.position || (index % 2 === 0 ? "left" : "right")
      }
      return mode
    }

    const renderItem = (item: TimelineItem, index: number, isLast: boolean) => {
      const position = getItemPosition(item, index)
      const isRight = position === "right"

      return (
        <div 
          key={item.key || index}
          className={cn(
            "relative flex",
            mode === "alternate" ? "w-full" : "items-start gap-3"
          )}
        >
          {mode === "alternate" && (
            <div className={cn(
              "flex w-full",
              isRight ? "flex-row-reverse" : "flex-row"
            )}>
              {/* 内容区域 */}
              <div className={cn(
                "flex-1 px-4",
                isRight ? "text-right" : "text-left"
              )}>
                {item.label && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.label}
                  </div>
                )}
                <div className="text-sm text-foreground">
                  {item.children}
                </div>
              </div>

              {/* 时间轴中心线和点 */}
              <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-border z-10">
                  {item.dot || getDefaultDot(item.color)}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-12 bg-border mt-2" />
                )}
              </div>

              {/* 占位区域 */}
              <div className="flex-1" />
            </div>
          )}

          {mode !== "alternate" && (
            <>
              {/* 时间轴点 */}
              <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-border z-10">
                  {item.dot || getDefaultDot(item.color)}
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-border mt-2 min-h-[2rem]" />
                )}
              </div>

              {/* 内容区域 */}
              <div className="flex-1 pb-8">
                {item.label && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.label}
                  </div>
                )}
                <div className="text-sm text-foreground">
                  {item.children}
                </div>
              </div>
            </>
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          mode === "alternate" && "space-y-4",
          className
        )}
        {...props}
      >
        {mode === "alternate" && (
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-0.5" />
        )}
        
        {allItems.map((item, index) => 
          renderItem(item, index, index === allItems.length - 1)
        )}
      </div>
    )
  }
)
Timeline.displayName = "Timeline"

interface TimelineItemProps {
  className?: string
  children?: React.ReactNode
  color?: "blue" | "green" | "red" | "yellow" | "gray" | string
  dot?: React.ReactNode
  label?: React.ReactNode
  position?: "left" | "right"
}

const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ children, ...props }, ref) => {
    // 这个组件主要是为了API兼容，实际渲染在Timeline中处理
    return <div ref={ref} {...props}>{children}</div>
  }
)
TimelineItem.displayName = "TimelineItem"

export { Timeline, TimelineItem }
export type { TimelineProps, TimelineItemProps, TimelineItem as TimelineItemType }