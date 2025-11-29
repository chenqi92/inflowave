import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

/**
 * Switch 滑动开关组件 - JetBrains New UI 风格
 * 尺寸：32px x 18px，滑块 14px
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // 基础样式 - 使用 JetBrains New UI 紧凑尺寸
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
      // 尺寸：32px x 18px
      "h-[18px] w-[32px]",
      // 边框
      "border border-transparent",
      // 过渡动画
      "transition-colors duration-150",
      // 焦点状态
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
      // 禁用状态
      "disabled:cursor-not-allowed disabled:opacity-50",
      // 选中/未选中状态背景色
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        // 基础样式
        "pointer-events-none block rounded-full bg-background shadow-sm ring-0",
        // 尺寸：14px x 14px
        "h-[14px] w-[14px]",
        // 过渡动画
        "transition-transform duration-150",
        // 位置：未选中时 2px，选中时移动 14px（32 - 14 - 2*2 = 14）
        "data-[state=checked]:translate-x-[14px] data-[state=unchecked]:translate-x-[2px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
