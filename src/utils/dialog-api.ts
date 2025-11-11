/**
 * 对话框 API 工具函数
 * 分离非组件导出以支持 Vite Fast Refresh
 */
import React from 'react';

export interface DialogConfig {
  title?: React.ReactNode;
  content?: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm';
  variant?: 'default' | 'destructive';
}

// 全局对话框状态管理
let currentDialog: {
  isOpen: boolean;
  config: DialogConfig;
  resolve?: (value: boolean) => void;
} = {
  isOpen: false,
  config: {},
};

// 对话框状态更新回调
let updateDialogState: ((state: typeof currentDialog) => void) | null = null;

// 设置状态更新回调
export const setDialogStateUpdater = (
  updater: (state: typeof currentDialog) => void
) => {
  updateDialogState = updater;
};

// 获取当前对话框状态
export const getCurrentDialog = () => currentDialog;

// 显示对话框的通用函数
const showDialog = (config: DialogConfig): Promise<boolean> => {
  return new Promise(resolve => {
    currentDialog = {
      isOpen: true,
      config,
      resolve,
    };

    if (updateDialogState) {
      updateDialogState({ ...currentDialog });
    }
  });
};

// 关闭对话框
export const closeDialog = (result: boolean = false) => {
  if (currentDialog.resolve) {
    currentDialog.resolve(result);
  }

  currentDialog = {
    isOpen: false,
    config: {},
    resolve: undefined,
  };

  if (updateDialogState) {
    updateDialogState({ ...currentDialog });
  }
};

// 纯 shadcn/ui 对话框 API
export const showInfoDialog = (config: Omit<DialogConfig, 'type'>) => {
  return showDialog({
    ...config,
    type: 'info',
    confirmText: config.confirmText || '知道了',
  });
};

export const showSuccessDialog = (config: Omit<DialogConfig, 'type'>) => {
  return showDialog({
    ...config,
    type: 'success',
    confirmText: config.confirmText || '知道了',
  });
};

export const showErrorDialog = (config: Omit<DialogConfig, 'type'>) => {
  return showDialog({
    ...config,
    type: 'error',
    confirmText: config.confirmText || '知道了',
  });
};

export const showWarningDialog = (config: Omit<DialogConfig, 'type'>) => {
  return showDialog({
    ...config,
    type: 'warning',
    confirmText: config.confirmText || '知道了',
  });
};

export const showConfirmDialog = (config: Omit<DialogConfig, 'type'>): Promise<boolean> => {
  return showDialog({
    ...config,
    type: 'confirm',
    confirmText: config.confirmText || '确定',
    cancelText: config.cancelText || '取消',
  });
};

// 便捷的对话框工具对象
export const dialog = {
  info: showInfoDialog,
  success: showSuccessDialog,
  error: showErrorDialog,
  warning: showWarningDialog,
  confirm: (config: Omit<DialogConfig, 'type'> | string): Promise<boolean> => {
    if (typeof config === 'string') {
      return showConfirmDialog({ content: config });
    }
    return showConfirmDialog(config);
  },
};

