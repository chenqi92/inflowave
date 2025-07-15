"use client"

import { useToast } from "@/hooks/use-toast"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport} from "@/components/ui/Toast"

export function Toaster() {
  const { toasts } = useToast()
  const { preferences } = useUserPreferences()

  // 获取通知位置设置，默认为右上角
  const notificationPosition = preferences?.notifications?.position || 'topRight'

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport position={notificationPosition} />
    </ToastProvider>
  )
}
