/**
 * 消息服务 - 完全基于 Sonner Toast 系统
 * 提供统一的消息提示接口，完全兼容 shadcn/ui 主题系统
 */

import React from 'react';
import {toast} from 'sonner';
import type {ExternalToast} from 'sonner';
import { safeTauriInvoke } from '@/utils/tauri';
import { getDatabaseConnectionError } from '@/utils/userFriendlyErrors';
import { addNotification } from '@/store/notifications';
import { errorHandler, formatErrorForDisplay } from '@/utils/errorHandler';
import type { ErrorDetails, RecoverySuggestion } from '@/types/error';
import {
  getNotificationSettings,
  isNotificationEnabled,
  isNotificationTypeEnabled
} from '@/stores/userPreferencesStore';

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
    onDismiss?: (toast: unknown) => void;
    onAutoClose?: (toast: unknown) => void;
    important?: boolean;
    position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
}

// 🔧 已移除旧的缓存机制，现在直接从 userPreferencesStore 同步读取

// 发送桌面通知
const sendDesktopNotification = async (title: string, message: string, _icon?: string) => {
    try {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();

        if (!settings.enabled || !settings.desktop) {
            return;
        }

        // 桌面应用专用：使用Tauri原生通知
        await safeTauriInvoke('send_notification', {
            title,
            message,
            notification_type: 'info',
            duration: 5000,
        });
    } catch (error) {
        console.warn('发送桌面通知失败:', error);
    }
};

// 智能消息系统 - 根据用户设置自动选择系统通知或shadcn通知
export const smartMessage = {
    success: async (content: string, title?: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();

        if (!settings.enabled) {
            return; // 如果通知被禁用，不显示任何消息
        }

        // 如果启用了桌面通知和系统警报，使用系统通知
        if (settings.desktop && settings.system_alerts && title) {
            await sendDesktopNotification(title, content);
        } else {
            // 否则使用shadcn通知
            const options = await createToastOptions();
            if (options === null) return; // 通知被禁用
            return toast.success(content, options);
        }
    },
    error: async (content: string, title?: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();

        if (!settings.enabled) {
            return;
        }

        if (settings.desktop && settings.system_alerts && title) {
            await sendDesktopNotification(title, content);
        } else {
            const options = await createToastOptions();
            if (options === null) return; // 通知被禁用
            return toast.error(content, options);
        }
    },
    warning: async (content: string, title?: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();

        if (!settings.enabled) {
            return;
        }

        if (settings.desktop && settings.system_alerts && title) {
            await sendDesktopNotification(title, content);
        } else {
            const options = await createToastOptions();
            if (options === null) return; // 通知被禁用
            return toast.warning(content, options);
        }
    },
    info: async (content: string, title?: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();

        if (!settings.enabled) {
            return;
        }

        if (settings.desktop && settings.system_alerts && title) {
            await sendDesktopNotification(title, content);
        } else {
            const options = await createToastOptions();
            if (options === null) return; // 通知被禁用
            return toast.info(content, options);
        }
    },
};

// 系统级别消息 - 强制使用原生系统通知
export const systemMessage = {
    success: async (title: string, message: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();
        if (settings.enabled && settings.desktop && settings.system_alerts) {
            await sendDesktopNotification(title, message);
        }
    },
    error: async (title: string, message: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();
        if (settings.enabled && settings.desktop && settings.system_alerts) {
            await sendDesktopNotification(title, message);
        }
    },
    warning: async (title: string, message: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();
        if (settings.enabled && settings.desktop && settings.system_alerts) {
            await sendDesktopNotification(title, message);
        }
    },
    info: async (title: string, message: string) => {
        // 🔧 从 store 同步读取通知设置
        const settings = getNotificationSettings();
        if (settings.enabled && settings.desktop && settings.system_alerts) {
            await sendDesktopNotification(title, message);
        }
    },
};

// 创建标准化的 Sonner 配置
const createToastOptions = async (
    duration?: number,
    options?: Partial<ExternalToast>
): Promise<ExternalToast | null> => {
    // 🔧 从 store 同步读取通知设置
    const settings = getNotificationSettings();

    // 如果通知被禁用，返回null让调用者决定
    if (!settings.enabled) {
        return null;
    }

    // 转换位置格式
    const positionMap: Record<string, string> = {
        'topLeft': 'top-left',
        'topCenter': 'top-center',
        'topRight': 'top-right',
        'bottomLeft': 'bottom-left',
        'bottomCenter': 'bottom-center',
        'bottomRight': 'bottom-right',
    };

    const position = positionMap[settings.position] || 'bottom-right';

    return {
        duration: duration ? duration * 1000 : undefined,
        position: position as ExternalToast['position'],
        ...options,
    };
};

// 兼容的 message 对象 - 简单消息提示
const message = {
    success: async (content: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return; // 通知被禁用
        return toast.success(content, options);
    },
    error: async (content: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return; // 通知被禁用
        return toast.error(content, options);
    },
    warning: async (content: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return; // 通知被禁用
        return toast.warning(content, options);
    },
    info: async (content: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return; // 通知被禁用
        return toast.info(content, options);
    },
    loading: async (content: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return; // 通知被禁用
        return toast.loading(content, options);
    },
    // 新增：自定义消息
    custom: (content: string, options?: ExternalToast) => {
        return toast(content, options);
    },
    // Promise 消息
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: unknown) => string);
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

// 便捷的消息方法 - 简单消息（同时添加到通知中心）
export const showMessage = {
    success: (content: string, duration?: number, source?: string) => {
        // 添加到通知中心
        addNotification.success('操作成功', content, source || 'general');
        // 显示 toast
        return message.success(content, duration);
    },
    error: (content: string, duration?: number, source?: string) => {
        // 添加到通知中心
        addNotification.error('操作失败', content, source || 'general');
        // 显示 toast
        return message.error(content, duration);
    },
    warning: (content: string, duration?: number, source?: string) => {
        // 添加到通知中心
        addNotification.warning('警告', content, source || 'general');
        // 显示 toast
        return message.warning(content, duration);
    },
    info: (content: string, duration?: number, source?: string) => {
        // 添加到通知中心
        addNotification.info('信息', content, source || 'general');
        // 显示 toast
        return message.info(content, duration);
    },
    loading: (content: string, duration?: number, source?: string) => {
        // 添加到通知中心
        addNotification.info('加载中', content, source || 'general');
        // 显示 toast
        return message.loading(content, duration);
    },
    custom: (content: string, options?: ExternalToast) =>
        message.custom(content, options),
    promise: <T>(
        promise: Promise<T>,
        msgs: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: unknown) => string);
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
            error: string | ((error: unknown) => string);
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('connection_status')) {
            await sendDesktopNotification('连接成功', `已成功连接到 ${name}`);
        }

        return result;
    },

    connectionError: async (name: string, error: string) => {
        const friendlyError = getDatabaseConnectionError(error);
        const result = showNotification.error({
            message: friendlyError.title,
            description: `连接 ${name} 失败: ${friendlyError.message}${friendlyError.suggestion ? `\n建议：${  friendlyError.suggestion}` : ''}`,
            duration: 6,
            action: {
                label: '重试',
                onClick: () => console.log(`重试连接: ${name}`),
            },
        });

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('connection_status')) {
            await sendDesktopNotification(friendlyError.title, `连接 ${name} 失败: ${friendlyError.message}`);
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('connection_status')) {
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('query_completion')) {
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('query_completion')) {
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('query_completion')) {
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('system_alerts')) {
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

        // 🔧 使用便捷选择器检查特定类型的通知是否启用
        if (isNotificationTypeEnabled('system_alerts')) {
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

/**
 * 增强的错误提示系统
 * 集成错误分析和恢复建议
 */
export const enhancedError = {
    /**
     * 显示增强的错误提示
     */
    show: async (error: Error | unknown, context?: Record<string, any>) => {
        // 分析错误
        const details = errorHandler.analyzeError(error, context);
        const formatted = formatErrorForDisplay(details);

        // 构建 toast 选项
        const options = await createToastOptions();
        if (options === null) return; // 通知被禁用

        // 显示错误 toast
        const toastId = toast.error(formatted.message, {
            ...options,
            description: formatted.description,
            duration: 8000, // 错误提示显示更长时间
            action: formatted.suggestions.length > 0 ? {
                label: '查看建议',
                onClick: () => {
                    // 显示详细的恢复建议
                    showRecoverySuggestions(formatted.suggestions);
                },
            } : undefined,
        });

        // 添加到通知中心
        addNotification.error(
            formatted.title,
            formatted.message,
            'error-handler'
        );

        // 记录日志
        await errorHandler.handleError(error, {
            context,
            shouldDisplay: false, // 已经显示了
            shouldLog: true,
        });

        return toastId;
    },

    /**
     * 显示带有自定义建议的错误
     */
    showWithSuggestions: async (
        error: Error | unknown,
        customSuggestions: RecoverySuggestion[],
        context?: Record<string, any>
    ) => {
        const details = errorHandler.analyzeError(error, context);
        const formatted = formatErrorForDisplay(details);

        // 合并自定义建议
        const allSuggestions = [
            ...customSuggestions,
            ...formatted.suggestions,
        ];

        const options = await createToastOptions();
        if (options === null) return;

        const toastId = toast.error(formatted.message, {
            ...options,
            description: formatted.description,
            duration: 8000,
            action: {
                label: '查看建议',
                onClick: () => {
                    showRecoverySuggestions(allSuggestions);
                },
            },
        });

        addNotification.error(
            formatted.title,
            formatted.message,
            'error-handler'
        );

        await errorHandler.handleError(error, {
            context,
            customSuggestions,
            shouldDisplay: false,
            shouldLog: true,
        });

        return toastId;
    },

    /**
     * 快速显示错误（不分析）
     */
    quick: async (message: string, duration?: number) => {
        const options = await createToastOptions(duration);
        if (options === null) return;

        return toast.error(message, options);
    },
};

/**
 * 显示恢复建议对话框
 */
function showRecoverySuggestions(suggestions: RecoverySuggestion[]) {
    // 使用 toast 显示建议列表
    suggestions.forEach((suggestion, index) => {
        setTimeout(() => {
            toast.info(suggestion.title, {
                description: suggestion.description,
                duration: 6000,
                action: suggestion.action && suggestion.actionLabel ? {
                    label: suggestion.actionLabel,
                    onClick: suggestion.action,
                } : undefined,
            });
        }, index * 300); // 错开显示时间
    });
}

// 便捷的全局访问
export {
    showMessage as message,
    showNotification as notification,
    toastControl as toast,
};
