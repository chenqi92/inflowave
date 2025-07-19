/**
 * 消息服务 - 完全基于 Sonner Toast 系统
 * 提供统一的消息提示接口，完全兼容 shadcn/ui 主题系统
 */

import {toast} from 'sonner';
import type {ExternalToast} from 'sonner';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';

// 消息类型定义
export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'loading';

// 通知配置接口 - 基于 Sonner 的配置
export interface NotificationConfig {
    message: string;
    description?: string;
    duration?: number;
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
    };
    cancel?: {
        label: string;
        onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    };
    id?: string | number;
    dismissible?: boolean;
    onDismiss?: (toast: any) => void;
    onAutoClose?: (toast: any) => void;
    important?: boolean;
    position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
}

// 获取用户通知偏好设置
const getUserNotificationPreferences = async () => {
    try {
        if (isBrowserEnvironment()) {
            // 在浏览器环境中从localStorage获取设置
            const storedPrefs = localStorage.getItem('user-preferences');
            if (storedPrefs) {
                const prefs = JSON.parse(storedPrefs);
                return prefs.notifications || {
                    enabled: true,
                    desktop: true,
                    sound: false,
                    queryCompletion: true,
                    connectionStatus: true,
                    systemAlerts: true,
                };
            }
        } else {
            // 在Tauri环境中从后端获取设置
            const prefs = await safeTauriInvoke('get_user_preferences');
            return prefs?.notifications || {
                enabled: true,
                desktop: true,
                sound: false,
                queryCompletion: true,
                connectionStatus: true,
                systemAlerts: true,
            };
        }
    } catch (error) {
        console.warn('获取用户通知偏好失败，使用默认设置:', error);
    }
    
    // 默认设置
    return {
        enabled: true,
        desktop: true,
        sound: false,
        queryCompletion: true,
        connectionStatus: true,
        systemAlerts: true,
    };
};

// 发送桌面通知
const sendDesktopNotification = async (title: string, message: string, icon?: string) => {
    try {
        const prefs = await getUserNotificationPreferences();
        
        if (!prefs.enabled || !prefs.desktop) {
            return;
        }
        
        if (isBrowserEnvironment()) {
            // 在浏览器环境中使用 Web Notification API
            if ('Notification' in window) {
                if (Notification.permission === 'granted') {
                    new Notification(title, {
                        body: message,
                        icon: icon || '/icon.png',
                        tag: 'inflowave-notification',
                    });
                } else if (Notification.permission !== 'denied') {
                    const permission = await Notification.requestPermission();
                    if (permission === 'granted') {
                        new Notification(title, {
                            body: message,
                            icon: icon || '/icon.png',
                            tag: 'inflowave-notification',
                        });
                    }
                }
            }
        } else {
            // 在Tauri环境中使用原生通知
            await safeTauriInvoke('send_notification', {
                notification: {
                    title,
                    message,
                    notification_type: 'info',
                    duration: 5000,
                }
            });
        }
    } catch (error) {
        console.warn('发送桌面通知失败:', error);
    }
};

// 创建标准化的 Sonner 配置
const createToastOptions = (
    duration?: number,
    options?: Partial<ExternalToast>
): ExternalToast => ({
    duration: duration ? duration * 1000 : undefined,
    ...options,
});

// 兼容的 message 对象 - 简单消息提示
const message = {
    success: (content: string, duration?: number) => {
        return toast.success(content, createToastOptions(duration));
    },
    error: (content: string, duration?: number) => {
        return toast.error(content, createToastOptions(duration));
    },
    warning: (content: string, duration?: number) => {
        return toast.warning(content, createToastOptions(duration));
    },
    info: (content: string, duration?: number) => {
        return toast.info(content, createToastOptions(duration));
    },
    loading: (content: string, duration?: number) => {
        return toast.loading(content, createToastOptions(duration));
    },
    // 新增：自定义消息
    custom: (content: string, options?: ExternalToast) => {
        return toast(content, options);
    },
    // 新增：Promise 消息
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => {
        return toast.promise(promise, msgs);
    },
};

// 向后兼容的实例获取函数
export const getMessageInstance = () => message;
export const getNotificationInstance = () => ({
    success: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return message.success(config);
        }
        return showNotification.success(config);
    },
    error: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return message.error(config);
        }
        return showNotification.error(config);
    },
    info: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return message.info(config);
        }
        return showNotification.info(config);
    },
    warning: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return message.warning(config);
        }
        return showNotification.warning(config);
    },
});

// 便捷的消息方法 - 简单消息
export const showMessage = {
    success: (content: string, duration?: number) =>
        message.success(content, duration),
    error: (content: string, duration?: number) =>
        message.error(content, duration),
    warning: (content: string, duration?: number) =>
        message.warning(content, duration),
    info: (content: string, duration?: number) => message.info(content, duration),
    loading: (content: string, duration?: number) =>
        message.loading(content, duration),
    custom: (content: string, options?: ExternalToast) =>
        message.custom(content, options),
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => message.promise(promise, msgs),
};

// 便捷的通知方法 - 带描述的复杂通知
export const showNotification = {
    success: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return toast.success(config);
        }

        const options: ExternalToast = {
            description: config.description,
            duration: config.duration ? config.duration * 1000 : 4000,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
            onAutoClose: config.onAutoClose,
        };

        if (config.action) {
            options.action = {
                label: config.action.label,
                onClick: config.action.onClick,
            };
        }

        if (config.cancel) {
            options.cancel = {
                label: config.cancel.label,
                onClick: config.cancel.onClick || (() => {
                }),
            };
        }

        return toast.success(config.message, options);
    },

    error: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return toast.error(config);
        }

        const options: ExternalToast = {
            description: config.description,
            duration: config.duration ? config.duration * 1000 : 5000,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
            onAutoClose: config.onAutoClose,
        };

        if (config.action) {
            options.action = {
                label: config.action.label,
                onClick: config.action.onClick,
            };
        }

        if (config.cancel) {
            options.cancel = {
                label: config.cancel.label,
                onClick: config.cancel.onClick || (() => {
                }),
            };
        }

        return toast.error(config.message, options);
    },

    warning: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return toast.warning(config);
        }

        const options: ExternalToast = {
            description: config.description,
            duration: config.duration ? config.duration * 1000 : 4000,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
            onAutoClose: config.onAutoClose,
        };

        if (config.action) {
            options.action = {
                label: config.action.label,
                onClick: config.action.onClick,
            };
        }

        if (config.cancel) {
            options.cancel = {
                label: config.cancel.label,
                onClick: config.cancel.onClick || (() => {
                }),
            };
        }

        return toast.warning(config.message, options);
    },

    info: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return toast.info(config);
        }

        const options: ExternalToast = {
            description: config.description,
            duration: config.duration ? config.duration * 1000 : 4000,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
            onAutoClose: config.onAutoClose,
        };

        if (config.action) {
            options.action = {
                label: config.action.label,
                onClick: config.action.onClick,
            };
        }

        if (config.cancel) {
            options.cancel = {
                label: config.cancel.label,
                onClick: config.cancel.onClick || (() => {
                }),
            };
        }

        return toast.info(config.message, options);
    },

    loading: (config: NotificationConfig | string) => {
        if (typeof config === 'string') {
            return toast.loading(config);
        }

        const options: ExternalToast = {
            description: config.description,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
        };

        return toast.loading(config.message, options);
    },

    custom: (config: NotificationConfig & { icon?: React.ReactNode }) => {
        const options: ExternalToast = {
            description: config.description,
            duration: config.duration ? config.duration * 1000 : 4000,
            icon: config.icon,
            id: config.id,
            dismissible: config.dismissible,
            onDismiss: config.onDismiss,
            onAutoClose: config.onAutoClose,
        };

        if (config.action) {
            options.action = {
                label: config.action.label,
                onClick: config.action.onClick,
            };
        }

        if (config.cancel) {
            options.cancel = {
                label: config.cancel.label,
                onClick: config.cancel.onClick || (() => {
                }),
            };
        }

        return toast(config.message, options);
    },
};

// Toast 控制方法
export const toastControl = {
    dismiss: (id?: string | number) => toast.dismiss(id),
    dismissAll: () => toast.dismiss(),
    loading: (message: string, options?: ExternalToast) =>
        toast.loading(message, options),
    success: (message: string, options?: ExternalToast) =>
        toast.success(message, options),
    error: (message: string, options?: ExternalToast) =>
        toast.error(message, options),
    info: (message: string, options?: ExternalToast) =>
        toast.info(message, options),
    warning: (message: string, options?: ExternalToast) =>
        toast.warning(message, options),
    custom: (message: string, options?: ExternalToast) => toast(message, options),
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => toast.promise(promise, msgs),
};

// 特殊场景的消息方法 - 针对应用的具体业务场景
export const specialMessage = {
    // 连接相关消息
    connectionSuccess: async (name: string) => {
        const result = showNotification.success({
            message: '连接成功',
            description: `已成功连接到 ${name}`,
            action: {
                label: '查看',
                onClick: () => console.log(`查看连接: ${name}`),
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.connectionStatus) {
            await sendDesktopNotification('连接成功', `已成功连接到 ${name}`);
        }
        
        return result;
    },

    connectionError: async (name: string, error: string) => {
        const result = showNotification.error({
            message: '连接失败',
            description: `连接 ${name} 失败: ${error}`,
            duration: 6,
            action: {
                label: '重试',
                onClick: () => console.log(`重试连接: ${name}`),
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.connectionStatus) {
            await sendDesktopNotification('连接失败', `连接 ${name} 失败: ${error}`);
        }
        
        return result;
    },

    connectionLost: async (name: string) => {
        const result = showNotification.warning({
            message: '连接中断',
            description: `与 ${name} 的连接已中断`,
            duration: 0, // 不自动关闭，替代 important
            action: {
                label: '重连',
                onClick: () => console.log(`重连: ${name}`),
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.connectionStatus) {
            await sendDesktopNotification('连接中断', `与 ${name} 的连接已中断`);
        }
        
        return result;
    },

    // 查询相关消息
    querySuccess: async (rowCount: number, duration: number) => {
        const result = showNotification.success({
            message: '查询完成',
            description: `返回 ${rowCount} 行数据，耗时 ${duration}ms`,
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.queryCompletion) {
            await sendDesktopNotification('查询完成', `返回 ${rowCount} 行数据，耗时 ${duration}ms`);
        }
        
        return result;
    },

    queryError: async (error: string) => {
        const result = showNotification.error({
            message: '查询失败',
            description: error,
            duration: 5,
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.queryCompletion) {
            await sendDesktopNotification('查询失败', error);
        }
        
        return result;
    },

    queryTimeout: async (timeout: number) => {
        const result = showNotification.warning({
            message: '查询超时',
            description: `查询执行超过 ${timeout}s，已自动取消`,
            action: {
                label: '优化查询',
                onClick: () => console.log('打开查询优化建议'),
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.queryCompletion) {
            await sendDesktopNotification('查询超时', `查询执行超过 ${timeout}s，已自动取消`);
        }
        
        return result;
    },

    // 导出相关消息
    exportSuccess: (format: string, filename?: string) =>
        showNotification.success({
            message: '导出成功',
            description: filename
                ? `已导出为 ${filename}`
                : `已导出为 ${format.toUpperCase()} 格式`,
            action: {
                label: '打开文件夹',
                onClick: () => console.log('打开导出文件夹'),
            },
        }),

    exportError: (error: string) =>
        showNotification.error({
            message: '导出失败',
            description: error,
            action: {
                label: '重试',
                onClick: () => console.log('重试导出'),
            },
        }),

    exportProgress: (progress: number, total: number) => {
        const percentage = Math.round((progress / total) * 100);
        return showNotification.loading({
            message: '正在导出',
            description: `进度: ${progress}/${total} (${percentage}%)`,
        });
    },

    // 保存相关消息
    saveSuccess: (type: string) => showMessage.success(`${type}已保存`),
    saveError: (type: string, error: string) =>
        showNotification.error({
            message: `保存${type}失败`,
            description: error,
        }),

    // 删除相关消息
    deleteSuccess: (type: string, name?: string) =>
        showMessage.success(name ? `${type} "${name}" 已删除` : `${type}已删除`),
    deleteError: (type: string, error: string) =>
        showNotification.error({
            message: `删除${type}失败`,
            description: error,
        }),

    // 系统相关消息
    updateAvailable: async (version: string) => {
        const result = showNotification.info({
            message: '发现新版本',
            description: `版本 ${version} 已发布`,
            action: {
                label: '立即更新',
                onClick: () => console.log('开始更新'),
            },
            cancel: {
                label: '稍后提醒',
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.systemAlerts) {
            await sendDesktopNotification('发现新版本', `版本 ${version} 已发布`);
        }
        
        return result;
    },

    systemError: async (error: string) => {
        const result = showNotification.error({
            message: '系统错误',
            description: error,
            duration: 0, // 不自动关闭，替代 important
            action: {
                label: '报告问题',
                onClick: () => console.log('打开问题报告'),
            },
        });
        
        // 发送桌面通知
        const prefs = await getUserNotificationPreferences();
        if (prefs.enabled && prefs.systemAlerts) {
            await sendDesktopNotification('系统错误', error);
        }
        
        return result;
    },

    // 数据相关消息
    dataImportSuccess: (count: number) =>
        showNotification.success({
            message: '数据导入完成',
            description: `成功导入 ${count} 条记录`,
        }),

    dataImportError: (error: string) =>
        showNotification.error({
            message: '数据导入失败',
            description: error,
            action: {
                label: '查看详情',
                onClick: () => console.log('查看导入错误详情'),
            },
        }),
};

// 向后兼容的函数
export const setMessageInstance = () => {
};
export const setNotificationInstance = () => {
};

// 便捷的全局访问
export {
    showMessage as message,
    showNotification as notification,
    toastControl as toast,
};
