import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  source?: string; // 消息来源，如 'system', 'query', 'connection' 等
}

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  
  // 添加通知
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  
  // 标记为已读
  markAsRead: (id: string) => void;
  
  // 标记所有为已读
  markAllAsRead: () => void;
  
  // 删除通知
  removeNotification: (id: string) => void;
  
  // 清空所有通知
  clearAllNotifications: () => void;
  
  // 获取未读通知数量
  getUnreadCount: () => number;
}

// 生成唯一ID
const generateId = () => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotification: NotificationItem = {
          ...notification,
          id: generateId(),
          timestamp: Date.now(),
          read: false,
        };

        set((state) => {
          const newNotifications = [newNotification, ...state.notifications];
          const unreadCount = newNotifications.filter(n => !n.read).length;
          
          return {
            notifications: newNotifications,
            unreadCount,
          };
        });
      },

      markAsRead: (id) => {
        set((state) => {
          const notifications = state.notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
          );
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return {
            notifications,
            unreadCount,
          };
        });
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        }));
      },

      removeNotification: (id) => {
        set((state) => {
          const notifications = state.notifications.filter(n => n.id !== id);
          const unreadCount = notifications.filter(n => !n.read).length;
          
          return {
            notifications,
            unreadCount,
          };
        });
      },

      clearAllNotifications: () => {
        set({
          notifications: [],
          unreadCount: 0,
        });
      },

      getUnreadCount: () => {
        return get().unreadCount;
      },
    }),
    {
      name: 'notification-storage',
      // 只持久化通知数据，软件重启后清空
      partialize: (state) => ({
        notifications: [],
        unreadCount: 0,
      }),
    }
  )
);

// 便捷的通知添加函数
export const addNotification = {
  info: (title: string, message: string, source?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'info',
      title,
      message,
      source,
    });
  },
  
  success: (title: string, message: string, source?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'success',
      title,
      message,
      source,
    });
  },
  
  warning: (title: string, message: string, source?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      source,
    });
  },
  
  error: (title: string, message: string, source?: string) => {
    useNotificationStore.getState().addNotification({
      type: 'error',
      title,
      message,
      source,
    });
  },
};
