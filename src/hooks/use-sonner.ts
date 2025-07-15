import { toast } from 'sonner'

// 创建兼容的 message 对象，使用 Sonner
export const message = {
  success: (content: string, duration?: number) => {
    toast.success(content, {
      duration: duration ? duration * 1000 : 3000,
    })
  },
  error: (content: string, duration?: number) => {
    toast.error(content, {
      duration: duration ? duration * 1000 : 3000,
    })
  },
  warning: (content: string, duration?: number) => {
    toast.warning(content, {
      duration: duration ? duration * 1000 : 3000,
    })
  },
  info: (content: string, duration?: number) => {
    toast.info(content, {
      duration: duration ? duration * 1000 : 3000,
    })
  },
  loading: (content: string) => {
    return toast.loading(content)
  },
}

// 兼容现有的 toast 调用方式
export const compatToast = ({
  title,
  description,
  variant = 'default',
  duration = 3000,
  action,
}: {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
  action?: any
}) => {
  const content = title || description || ''
  const options = {
    description: title && description ? description : undefined,
    duration,
    action,
  }

  switch (variant) {
    case 'destructive':
      return toast.error(content, options)
    default:
      return toast(content, options)
  }
}

// 便捷的通知方法 (使用 Sonner)
export const showNotification = {
  success: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message
    const options = typeof config === 'object' ? {
      description: config.description,
      duration: config.duration ? config.duration * 1000 : 3000,
    } : { duration: 3000 }
    
    toast.success(content, options)
  },

  error: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message
    const options = typeof config === 'object' ? {
      description: config.description,
      duration: config.duration ? config.duration * 1000 : 3000,
    } : { duration: 3000 }
    
    toast.error(content, options)
  },

  warning: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message
    const options = typeof config === 'object' ? {
      description: config.description,
      duration: config.duration ? config.duration * 1000 : 3000,
    } : { duration: 3000 }
    
    toast.warning(content, options)
  },

  info: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message
    const options = typeof config === 'object' ? {
      description: config.description,
      duration: config.duration ? config.duration * 1000 : 3000,
    } : { duration: 3000 }
    
    toast.info(content, options)
  }
}

// 导出 Sonner 的 toast 函数
export { toast }

// 默认导出兼容的 toast 函数
export default compatToast
