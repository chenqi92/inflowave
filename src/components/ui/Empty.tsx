import * as React from "react"
import { cn } from "@/lib/utils"
import { FileX, Database, Search } from "lucide-react"

interface EmptyProps {
  className?: string
  image?: React.ReactNode
  imageStyle?: React.CSSProperties
  description?: React.ReactNode
  children?: React.ReactNode
}

const Empty = React.forwardRef<HTMLDivElement, EmptyProps>(
  ({ className, image, imageStyle, description, children, ...props }, ref) => {
    const defaultImage = (
      <FileX 
        className="h-16 w-16 text-muted-foreground/50" 
        style={imageStyle}
      />
    )

    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-[200px] flex-col items-center justify-center space-y-4 p-8 text-center",
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center space-y-2">
          {image || defaultImage}
          {description && (
            <p className="text-sm text-muted-foreground max-w-sm">
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    )
  }
)
Empty.displayName = "Empty"

const EmptyDatabase = React.forwardRef<HTMLDivElement, Omit<EmptyProps, 'image'>>(
  (props, ref) => (
    <Empty
      ref={ref}
      image={<Database className="h-16 w-16 text-muted-foreground/50" />}
      description="暂无数据库连接"
      {...props}
    />
  )
)
EmptyDatabase.displayName = "EmptyDatabase"

const EmptySearch = React.forwardRef<HTMLDivElement, Omit<EmptyProps, 'image'>>(
  (props, ref) => (
    <Empty
      ref={ref}
      image={<Search className="h-16 w-16 text-muted-foreground/50" />}
      description="未找到搜索结果"
      {...props}
    />
  )
)
EmptySearch.displayName = "EmptySearch"

export { Empty, EmptyDatabase, EmptySearch }
export type { EmptyProps }