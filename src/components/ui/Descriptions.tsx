import * as React from "react"
import { cn } from "@/lib/utils"

interface DescriptionItem {
  key?: string
  label?: React.ReactNode
  children?: React.ReactNode
  span?: number
  labelStyle?: React.CSSProperties
  contentStyle?: React.CSSProperties
}

interface DescriptionsProps {
  className?: string
  title?: React.ReactNode
  extra?: React.ReactNode
  bordered?: boolean
  column?: number
  size?: "default" | "middle" | "small"
  layout?: "horizontal" | "vertical"
  colon?: boolean
  labelStyle?: React.CSSProperties
  contentStyle?: React.CSSProperties
  items?: DescriptionItem[]
  children?: React.ReactNode
}

const Descriptions = React.forwardRef<HTMLDivElement, DescriptionsProps>(
  ({ 
    className, 
    title, 
    extra, 
    bordered = false, 
    column = 3, 
    size = "default", 
    layout = "horizontal",
    colon = true,
    labelStyle,
    contentStyle,
    items = [],
    children,
    ...props 
  }, ref) => {
    const sizeClasses = {
      small: "text-xs",
      default: "text-sm", 
      middle: "text-base"
    }

    const paddingClasses = {
      small: "p-2",
      default: "p-3",
      middle: "p-4"
    }

    // 处理items数据
    const processedItems = items.length > 0 ? items : []
    
    // 如果有children，转换为items格式
    const childItems = React.Children.toArray(children).filter(
      child => React.isValidElement(child) && child.type === DescriptionsItem
    ).map((child: any, index) => ({
      key: child.key || index.toString(),
      label: child.props.label,
      children: child.props.children,
      span: child.props.span || 1,
      labelStyle: child.props.labelStyle,
      contentStyle: child.props.contentStyle
    }))

    const allItems = processedItems.length > 0 ? processedItems : childItems

    // 按行分组items
    const groupItemsByRow = (items: DescriptionItem[]) => {
      const rows: DescriptionItem[][] = []
      let currentRow: DescriptionItem[] = []
      let currentSpan = 0

      items.forEach(item => {
        const span = item.span || 1
        
        if (currentSpan + span > column) {
          // 当前行放不下，开始新行
          if (currentRow.length > 0) {
            rows.push(currentRow)
          }
          currentRow = [item]
          currentSpan = span
        } else {
          // 可以放在当前行
          currentRow.push(item)
          currentSpan += span
        }
      })

      if (currentRow.length > 0) {
        rows.push(currentRow)
      }

      return rows
    }

    const rows = groupItemsByRow(allItems)

    const renderItem = (item: DescriptionItem, index: number) => {
      const span = item.span || 1
      const colSpan = Math.floor((span / column) * 12) // 转换为12列网格
      
      if (layout === "vertical") {
        return (
          <div 
            key={item.key || index}
            className={cn(
              "flex flex-col",
              bordered && "border border-border",
              paddingClasses[size]
            )}
            style={{ gridColumn: `span ${colSpan}` }}
          >
            <div 
              className={cn(
                "font-medium text-foreground mb-1",
                sizeClasses[size]
              )}
              style={{ ...labelStyle, ...item.labelStyle }}
            >
              {item.label}{colon && item.label ? ':' : ''}
            </div>
            <div 
              className={cn(
                "text-muted-foreground",
                sizeClasses[size]
              )}
              style={{ ...contentStyle, ...item.contentStyle }}
            >
              {item.children}
            </div>
          </div>
        )
      }

      return (
        <div 
          key={item.key || index}
          className={cn(
            "grid grid-cols-3 gap-2",
            bordered && "border border-border",
            paddingClasses[size]
          )}
          style={{ gridColumn: `span ${colSpan}` }}
        >
          <div 
            className={cn(
              "font-medium text-foreground",
              sizeClasses[size]
            )}
            style={{ ...labelStyle, ...item.labelStyle }}
          >
            {item.label}{colon && item.label ? ':' : ''}
          </div>
          <div 
            className={cn(
              "col-span-2 text-muted-foreground",
              sizeClasses[size]
            )}
            style={{ ...contentStyle, ...item.contentStyle }}
          >
            {item.children}
          </div>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-4",
          bordered && "border border-border rounded-md",
          className
        )}
        {...props}
      >
        {(title || extra) && (
          <div className={cn(
            "flex items-center justify-between",
            bordered && "border-b border-border pb-3 mb-3 px-4 pt-4"
          )}>
            {title && (
              <div className="text-lg font-semibold text-foreground">
                {title}
              </div>
            )}
            {extra && <div>{extra}</div>}
          </div>
        )}
        
        <div 
          className={cn(
            "grid gap-1",
            !bordered && "space-y-2"
          )}
          style={{ 
            gridTemplateColumns: `repeat(${column}, 1fr)` 
          }}
        >
          {rows.map((row, rowIndex) => 
            row.map((item, itemIndex) => 
              renderItem(item, rowIndex * column + itemIndex)
            )
          )}
        </div>
      </div>
    )
  }
)
Descriptions.displayName = "Descriptions"

interface DescriptionsItemProps {
  className?: string
  label?: React.ReactNode
  children?: React.ReactNode
  span?: number
  labelStyle?: React.CSSProperties
  contentStyle?: React.CSSProperties
}

const DescriptionsItem = React.forwardRef<HTMLDivElement, DescriptionsItemProps>(
  ({ children, ...props }, ref) => {
    // 这个组件主要是为了API兼容，实际渲染在Descriptions中处理
    return <div ref={ref} {...props}>{children}</div>
  }
)
DescriptionsItem.displayName = "DescriptionsItem"

export { Descriptions, DescriptionsItem }
export type { DescriptionsProps, DescriptionsItemProps, DescriptionItem }