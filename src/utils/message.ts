/**
 * 消息服务 - 解决 Antd 静态方法上下文警告
 */

import { message, notification } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';
import type { NotificationInstance } from 'antd/es/notification/interface';

// 全局消息实例
let messageApi: MessageInstance;
let notificationApi: NotificationInstance;

// 设置消息实例
export const setMessageInstance = (instance: MessageInstance) => {
  messageApi = instance;
};

// 设置通知实例
export const setNotificationInstance = (instance: NotificationInstance) => {
  notificationApi = instance;
};

// 安全的消息方法
export const showMessage = {
  success: (content: string, duration?: number) => {
    if (messageApi) {
      messageApi.success(content, duration);
    } else {
      // 降级到静态方法
      message.success(content, duration);
    }
  },
  
  error: (content: string, duration?: number) => {
    if (messageApi) {
      messageApi.error(content, duration);
    } else {
      message.error(content, duration);
    }
  },
  
  warning: (content: string, duration?: number) => {
    if (messageApi) {
      messageApi.warning(content, duration);
    } else {
      message.warning(content, duration);
    }
  },
  
  info: (content: string, duration?: number) => {
    if (messageApi) {
      messageApi.info(content, duration);
    } else {
      message.info(content, duration);
    }
  },
  
  loading: (content: string, duration?: number) => {
    if (messageApi) {
      return messageApi.loading(content, duration);
    } else {
      return message.loading(content, duration);
    }
  }
};

// 安全的通知方法
export const showNotification = {
  success: (config: { message: string; description?: string; duration?: number }) => {
    if (notificationApi) {
      notificationApi.success(config);
    } else {
      notification.success(config);
    }
  },
  
  error: (config: { message: string; description?: string; duration?: number }) => {
    if (notificationApi) {
      notificationApi.error(config);
    } else {
      notification.error(config);
    }
  },
  
  warning: (config: { message: string; description?: string; duration?: number }) => {
    if (notificationApi) {
      notificationApi.warning(config);
    } else {
      notification.warning(config);
    }
  },
  
  info: (config: { message: string; description?: string; duration?: number }) => {
    if (notificationApi) {
      notificationApi.info(config);
    } else {
      notification.info(config);
    }
  }
};
