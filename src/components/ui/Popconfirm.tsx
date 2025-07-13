import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"
import { Button } from "./Button"
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react"

interface PopconfirmProps {
  title?: React.ReactNode
  description?: React.ReactNode
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  okText?: string
  cancelText?: string
  okType?: "default" | "primary" | "danger"
  placement?: "top" | "bottom" | "left" | "right"
  icon?: React.ReactNode
  disabled?: boolean
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Popconfirm = React.forwardRef<HTMLDivElement, PopconfirmProps>(
  ({ 
    title,
    description, 
    onConfirm, 
    onCancel,
    okText = "确定",
    cancelText = "取消", 
    okType = "primary",
    placement = "top",
    icon,
    disabled = false,
    children,
    open,
    onOpenChange,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const controlled = open !== undefined
    const actualOpen = controlled ? open : isOpen
    const setActualOpen = controlled ? onOpenChange : setIsOpen

    const handleConfirm = async () => {
      if (onConfirm) {
        setLoading(true)
        try {
          await onConfirm()
          setActualOpen?.(false)
        } catch (error) {
          console.error("Popconfirm confirm error:", error)
        } finally {
          setLoading(false)
        }
      } else {
        setActualOpen?.(false)
      }
    }

    const handleCancel = () => {
      onCancel?.()
      setActualOpen?.(false)
    }

    const defaultIcon = <AlertTriangle className="h-4 w-4 text-orange-500" />

    const getOkButtonProps = () => {
      const variants = {
        default: "outline" as const,
        primary: "default" as const,
        danger: "destructive" as const
      }
      return {
        variant: variants[okType],
        loading
      }
    }

    return (
      <PopoverPrimitive.Root open={actualOpen} onOpenChange={setActualOpen}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          {children}
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            ref={ref}
            className={cn(
              "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            )}
            side={placement}
            sideOffset={4}
            {...props}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {icon || defaultIcon}
                </div>
                <div className="flex-1 space-y-1">
                  {title && (
                    <div className="text-sm font-medium leading-none">
                      {title}
                    </div>
                  )}
                  {description && (
                    <div className="text-sm text-muted-foreground">
                      {description}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {cancelText}
                </Button>
                <Button
                  {...getOkButtonProps()}
                  size="sm"
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {okText}
                </Button>
              </div>
            </div>
            <PopoverPrimitive.Arrow className="fill-popover" />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    )
  }
)
Popconfirm.displayName = "Popconfirm"

export { Popconfirm }
export type { PopconfirmProps }