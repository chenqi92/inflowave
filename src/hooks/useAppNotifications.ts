import { useEffect } from 'react';
import { addNotification, useNotificationStore } from '@/store/notifications';

/**
 * 应用通知初始化 Hook
 * 在应用启动时添加欢迎通知和系统状态通知
 */
export const useAppNotifications = () => {
  const { clearAllNotifications } = useNotificationStore();

  useEffect(() => {
    // 应用启动时清空所有通知（软件重启后清除）
    clearAllNotifications();

    // 添加欢迎通知
    addNotification.success(
      '欢迎使用 InfluxDB GUI',
      '应用已成功启动，您可以开始管理您的时序数据库了。',
      'system'
    );

    // 添加功能介绍通知
    addNotification.info(
      '消息通知中心',
      '点击右侧的消息图标可以查看所有通知。软件关闭或重启后，通知记录将被清空。',
      'system'
    );

    // 模拟一些系统状态通知（可以根据实际情况调整）
    setTimeout(() => {
      addNotification.info(
        '系统检查完成',
        '数据库连接组件、查询引擎和可视化模块已就绪。',
        'system'
      );
    }, 2000);

  }, []); // 只在组件挂载时执行一次
};

/**
 * 便捷的通知添加函数，可以在应用的任何地方使用
 */
export const notify = {
  // 连接相关通知
  connection: {
    success: (message: string) => addNotification.success('连接成功', message, 'connection'),
    error: (message: string) => addNotification.error('连接失败', message, 'connection'),
    warning: (message: string) => addNotification.warning('连接警告', message, 'connection'),
  },

  // 查询相关通知
  query: {
    success: (message: string) => addNotification.success('查询完成', message, 'query'),
    error: (message: string) => addNotification.error('查询失败', message, 'query'),
    warning: (message: string) => addNotification.warning('查询警告', message, 'query'),
  },

  // 数据操作相关通知
  data: {
    success: (message: string) => addNotification.success('数据操作成功', message, 'data'),
    error: (message: string) => addNotification.error('数据操作失败', message, 'data'),
    warning: (message: string) => addNotification.warning('数据操作警告', message, 'data'),
  },

  // 系统相关通知
  system: {
    info: (message: string) => addNotification.info('系统信息', message, 'system'),
    success: (message: string) => addNotification.success('系统操作成功', message, 'system'),
    error: (message: string) => addNotification.error('系统错误', message, 'system'),
    warning: (message: string) => addNotification.warning('系统警告', message, 'system'),
  },

  // 导入导出相关通知
  export: {
    success: (message: string) => addNotification.success('导出成功', message, 'export'),
    error: (message: string) => addNotification.error('导出失败', message, 'export'),
    warning: (message: string) => addNotification.warning('导出警告', message, 'export'),
  },

  // 通用通知
  general: {
    info: (title: string, message: string) => addNotification.info(title, message, 'general'),
    success: (title: string, message: string) => addNotification.success(title, message, 'general'),
    error: (title: string, message: string) => addNotification.error(title, message, 'general'),
    warning: (title: string, message: string) => addNotification.warning(title, message, 'general'),
  },
};
