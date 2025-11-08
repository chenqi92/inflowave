import { useEffect } from 'react';
import { addNotification, useNotificationStore } from '@/store/notifications';
import { useNotificationsTranslation } from './useTranslation';

/**
 * 应用通知初始化 Hook
 * 在应用启动时添加欢迎通知和系统状态通知
 */
export const useAppNotifications = () => {
  const { clearAllNotifications } = useNotificationStore();
  const { t: tNotifications } = useNotificationsTranslation();

  useEffect(() => {
    // 应用启动时清空所有通知（软件重启后清除）
    clearAllNotifications();

    // 添加欢迎通知
    addNotification.success(
      tNotifications('welcomeTitle'),
      tNotifications('welcomeMessage'),
      'system'
    );

    // 添加功能介绍通知
    addNotification.info(
      tNotifications('notificationCenterTitle'),
      tNotifications('notificationCenterMessage'),
      'system'
    );

    // 模拟一些系统状态通知（可以根据实际情况调整）
    setTimeout(() => {
      addNotification.info(
        tNotifications('systemCheckTitle'),
        tNotifications('systemCheckMessage'),
        'system'
      );
    }, 2000);

  }, [clearAllNotifications, tNotifications]); // 只在组件挂载时执行一次
};

/**
 * 创建带翻译的通知函数
 * @param t - 翻译函数
 * @returns 通知对象
 */
export const createNotify = (t: (key: string) => string) => ({
  // 连接相关通知
  connection: {
    success: (message: string) => addNotification.success(t('connectionSuccess'), message, 'connection'),
    error: (message: string) => addNotification.error(t('connectionError'), message, 'connection'),
    warning: (message: string) => addNotification.warning(t('connectionWarning'), message, 'connection'),
  },

  // 查询相关通知
  query: {
    success: (message: string) => addNotification.success(t('querySuccess'), message, 'query'),
    error: (message: string) => addNotification.error(t('queryError'), message, 'query'),
    warning: (message: string) => addNotification.warning(t('queryWarning'), message, 'query'),
  },

  // 数据操作相关通知
  data: {
    success: (message: string) => addNotification.success(t('dataSuccess'), message, 'data'),
    error: (message: string) => addNotification.error(t('dataError'), message, 'data'),
    warning: (message: string) => addNotification.warning(t('dataWarning'), message, 'data'),
  },

  // 系统相关通知
  system: {
    info: (message: string) => addNotification.info(t('systemInfo'), message, 'system'),
    success: (message: string) => addNotification.success(t('systemSuccess'), message, 'system'),
    error: (message: string) => addNotification.error(t('systemError'), message, 'system'),
    warning: (message: string) => addNotification.warning(t('systemWarning'), message, 'system'),
  },

  // 导入导出相关通知
  export: {
    success: (message: string) => addNotification.success(t('exportSuccess'), message, 'export'),
    error: (message: string) => addNotification.error(t('exportError'), message, 'export'),
    warning: (message: string) => addNotification.warning(t('exportWarning'), message, 'export'),
  },

  // 通用通知
  general: {
    info: (title: string, message: string) => addNotification.info(title, message, 'general'),
    success: (title: string, message: string) => addNotification.success(title, message, 'general'),
    error: (title: string, message: string) => addNotification.error(title, message, 'general'),
    warning: (title: string, message: string) => addNotification.warning(title, message, 'general'),
  },
});

/**
 * 便捷的通知添加函数，可以在应用的任何地方使用
 * 注意：此对象使用中文标题，建议在组件中使用 createNotify 配合翻译函数
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
