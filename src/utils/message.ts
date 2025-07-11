/**
 * 消息服务 - 使用自定义消息系统
 */

import { message } from '@/components/ui';

// 为了向后兼容，保留这些空函数
export const setMessageInstance = () => {};
export const setNotificationInstance = () => {};
export const getMessageInstance = () => message;
export const getNotificationInstance = () => ({
  success: (config: any) => message.success(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  error: (config: any) => message.error(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  info: (config: any) => message.info(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  warning: (config: any) => message.warning(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
});

// 便捷的消息方法
export const showMessage = {
  success: (content: string, duration?: number) => message.success(content, duration),
  error: (content: string, duration?: number) => message.error(content, duration),
  warning: (content: string, duration?: number) => message.warning(content, duration),
  info: (content: string, duration?: number) => message.info(content, duration),
  loading: (content: string, duration?: number) => message.loading(content, duration),
};

// 便捷的通知方法 (使用消息系统)
export const showNotification = {
  success: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : `${config.message}${config.description ? `: ${config.description}` : ''}`;
    return message.success(content, typeof config === 'object' ? config.duration : undefined);
  },

  error: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : `${config.message}${config.description ? `: ${config.description}` : ''}`;
    return message.error(content, typeof config === 'object' ? config.duration : undefined);
  },

  warning: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : `${config.message}${config.description ? `: ${config.description}` : ''}`;
    return message.warning(content, typeof config === 'object' ? config.duration : undefined);
  },

  info: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : `${config.message}${config.description ? `: ${config.description}` : ''}`;
    return message.info(content, typeof config === 'object' ? config.duration : undefined);
  }
};
