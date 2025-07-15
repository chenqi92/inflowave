/**
 * 消息服务 - 使用 Sonner Toast系统
 */

import { toast } from 'sonner';


// 为了向后兼容，保留这些空函数
export const setMessageInstance = () => {};
export const setNotificationInstance = () => {};

// 创建兼容的message对象
const message = {
  success: (content: string, duration?: number) => {
    toast({
      title: "成功",
      description: content,
      duration: duration ? duration * 1000 : 3000});
  },
  error: (content: string, duration?: number) => {
    toast({
      title: "错误",
      description: content,
      variant: "destructive",
      duration: duration ? duration * 1000 : 3000});
  },
  warning: (content: string, duration?: number) => {
    toast({
      title: "警告",
      description: content,
      duration: duration ? duration * 1000 : 3000});
  },
  info: (content: string, duration?: number) => {
    toast({
      title: "信息",
      description: content,
      duration: duration ? duration * 1000 : 3000});
  },
  loading: (content: string, duration?: number) => {
    toast({
      title: "加载中",
      description: content,
      duration: duration ? duration * 1000 : 3000});
  }};

export const getMessageInstance = () => message;
export const getNotificationInstance = () => ({
  success: (config: any) => message.success(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  error: (config: any) => message.error(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  info: (config: any) => message.info(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`),
  warning: (config: any) => message.warning(typeof config === 'string' ? config : `${config.message}: ${config.description || ''}`)});

// 便捷的消息方法
export const showMessage = {
  success: (content: string, duration?: number) => message.success(content, duration),
  error: (content: string, duration?: number) => message.error(content, duration),
  warning: (content: string, duration?: number) => message.warning(content, duration),
  info: (content: string, duration?: number) => message.info(content, duration),
  loading: (content: string, duration?: number) => message.loading(content, duration)};

// 便捷的通知方法 (使用Toast系统)
export const showNotification = {
  success: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message;
    const description = typeof config === 'object' ? config.description : undefined;
    toast({
      title: content,
      description: description,
      duration: typeof config === 'object' ? (config.duration ? config.duration * 1000 : 3000) : 3000});
  },

  error: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message;
    const description = typeof config === 'object' ? config.description : undefined;
    toast({
      title: content,
      description: description,
      variant: "destructive",
      duration: typeof config === 'object' ? (config.duration ? config.duration * 1000 : 3000) : 3000});
  },

  warning: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message;
    const description = typeof config === 'object' ? config.description : undefined;
    toast({
      title: content,
      description: description,
      duration: typeof config === 'object' ? (config.duration ? config.duration * 1000 : 3000) : 3000});
  },

  info: (config: { message: string; description?: string; duration?: number } | string) => {
    const content = typeof config === 'string' ? config : config.message;
    const description = typeof config === 'object' ? config.description : undefined;
    toast({
      title: content,
      description: description,
      duration: typeof config === 'object' ? (config.duration ? config.duration * 1000 : 3000) : 3000});
  }
};
