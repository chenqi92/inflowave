import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

interface StepItem {
  title: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}

interface StepsProps {
  className?: string
  current?: number
  direction?: "horizontal" | "vertical"
  size?: "default" | "small"
  status?: "wait" | "process" | "finish" | "error"
  items?: StepItem[]
  children?: React.ReactNode
  onChange?: (current: number) => void
}

const Steps = React.forwardRef<HTMLDivElement, StepsProps>(
  ({ 
    className, 
    current = 0, 
    direction = "horizontal", 
    size = "default",
    status = "process",
    items = [],
    children,
    onChange,
    ...props 
  }, ref) => {
    const isHorizontal = direction === "horizontal"
    const isSmall = size === "small"

    const getStepStatus = (index: number): "wait" | "process" | "finish" | "error" => {
      if (index < current) return "finish"
      if (index === current) return status
      return "wait"
    }

    const getStepIcon = (step: StepItem, index: number, stepStatus: string) => {
      if (step.icon) return step.icon
      
      switch (stepStatus) {
        case "finish":
          return <Check className={cn("h-4 w-4", isSmall && "h-3 w-3")} />
        case "error":
          return <X className={cn("h-4 w-4", isSmall && "h-3 w-3")} />
        default:
          return <span className={cn("text-sm font-medium", isSmall && "text-xs")}>{index + 1}</span>
      }
    }

    const handleStepClick = (index: number, step: StepItem) => {
      if (step.disabled) return
      onChange?.(index)
    }

    const renderStep = (step: StepItem, index: number) => {
      const stepStatus = getStepStatus(index)
      const isActive = index === current
      const isLast = index === items.length - 1

      const stepClasses = cn(
        "relative flex items-center",
        isHorizontal ? "flex-1" : "flex-col",
        !step.disabled && "cursor-pointer"
      )

      const iconClasses = cn(
        "flex items-center justify-center rounded-full border-2 transition-colors",
        isSmall ? "h-6 w-6" : "h-8 w-8",
        {
          "border-primary bg-primary text-primary-foreground": stepStatus === "finish",
          "border-primary bg-background text-primary": stepStatus === "process",
          "border-destructive bg-destructive text-destructive-foreground": stepStatus === "error",
          "border-muted-foreground bg-background text-muted-foreground": stepStatus === "wait",
        }
      )

      const contentClasses = cn(
        isHorizontal ? "ml-3 flex-1" : "mt-2 text-center",
        isSmall && "text-sm"
      )

      const titleClasses = cn(
        "font-medium transition-colors",
        {
          "text-primary": stepStatus === "process",
          "text-foreground": stepStatus === "finish",
          "text-destructive": stepStatus === "error",
          "text-muted-foreground": stepStatus === "wait",
        }
      )

      const descriptionClasses = cn(
        "text-sm text-muted-foreground mt-1",
        isSmall && "text-xs"
      )

      return (
        <div
          key={index}
          className={stepClasses}
          onClick={() => handleStepClick(index, step)}
        >
          <div className={cn("flex items-center", isHorizontal ? "flex-row" : "flex-col")}>
            <div className={iconClasses}>
              {getStepIcon(step, index, stepStatus)}
            </div>
            
            <div className={contentClasses}>
              <div className={titleClasses}>
                {step.title}
              </div>
              {step.description && (
                <div className={descriptionClasses}>
                  {step.description}
                </div>
              )}
            </div>
          </div>

          {/* 连接线 */}
          {!isLast && (
            <div
              className={cn(
                "bg-border",
                isHorizontal 
                  ? "absolute top-4 left-full w-full h-0.5 -translate-y-1/2" 
                  : "absolute left-4 top-full h-full w-0.5 -translate-x-1/2",
                isSmall && (isHorizontal ? "top-3" : "left-3")
              )}
            />
          )}
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          isHorizontal ? "flex-row items-start" : "flex-col space-y-4",
          className
        )}
        {...props}
      >
        {items.map((step, index) => renderStep(step, index))}
        {children}
      </div>
    )
  }
)
Steps.displayName = "Steps"

interface StepProps {
  className?: string
  children?: React.ReactNode
  title?: string
  description?: string
  icon?: React.ReactNode
  status?: "wait" | "process" | "finish" | "error"
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  }
)
Step.displayName = "Step"

export { Steps, Step }
export type { StepsProps, StepProps, StepItem }