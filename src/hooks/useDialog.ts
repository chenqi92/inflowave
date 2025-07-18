import { useState, useCallback } from 'react';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'confirm' | 'prompt';
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  options: DialogOptions;
  resolve?: (value: string | boolean | PromiseLike<string | boolean>) => void;
  reject?: (reason?: any) => void;
}

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    options: { message: '' },
  });

  const showDialog = useCallback((options: DialogOptions): Promise<string | boolean> => {
    return new Promise((resolve, reject) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
        reject,
      });
    });
  }, []);

  const hideDialog = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const handleConfirm = useCallback((value?: string) => {
    const { resolve, options } = dialogState;
    if (resolve) {
      if (options.type === 'prompt') {
        resolve(value || '');
      } else {
        resolve(true);
      }
    }
    hideDialog();
  }, [dialogState, hideDialog]);

  const handleCancel = useCallback(() => {
    const { resolve, options } = dialogState;
    if (resolve) {
      if (options.type === 'prompt') {
        resolve('');
      } else {
        resolve(false);
      }
    }
    hideDialog();
  }, [dialogState, hideDialog]);

  // 便利方法
  const alert = useCallback((message: string, title?: string) => {
    return showDialog({
      type: 'info',
      message,
      title,
      confirmText: '确定',
    });
  }, [showDialog]);

  const confirm = useCallback((message: string, title?: string) => {
    return showDialog({
      type: 'confirm',
      message,
      title,
      confirmText: '确定',
      cancelText: '取消',
    });
  }, [showDialog]);

  const prompt = useCallback((
    message: string,
    defaultValue?: string,
    placeholder?: string,
    title?: string
  ) => {
    return showDialog({
      type: 'prompt',
      message,
      defaultValue,
      placeholder,
      title,
      confirmText: '确定',
      cancelText: '取消',
    });
  }, [showDialog]);

  const warning = useCallback((message: string, title?: string) => {
    return showDialog({
      type: 'warning',
      message,
      title,
      confirmText: '确定',
    });
  }, [showDialog]);

  const error = useCallback((message: string, title?: string) => {
    return showDialog({
      type: 'error',
      message,
      title,
      confirmText: '确定',
    });
  }, [showDialog]);

  return {
    // 对话框状态
    dialogState,
    isOpen: dialogState.isOpen,
    
    // 对话框控制
    showDialog,
    hideDialog,
    handleConfirm,
    handleCancel,
    
    // 便利方法
    alert,
    confirm,
    prompt,
    warning,
    error,
  };
};