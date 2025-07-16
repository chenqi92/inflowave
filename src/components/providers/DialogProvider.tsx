import React, { createContext, useContext, useCallback, useState } from 'react';
import CustomDialog from '@/components/ui/CustomDialog';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'confirm' | 'prompt';
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  alert: (message: string, title?: string) => Promise<boolean>;
  confirm: (message: string, title?: string) => Promise<boolean>;
  prompt: (
    message: string,
    defaultValue?: string,
    placeholder?: string,
    title?: string
  ) => Promise<string>;
  warning: (message: string, title?: string) => Promise<boolean>;
  error: (message: string, title?: string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useGlobalDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useGlobalDialog must be used within a DialogProvider');
  }
  return context;
};

interface DialogProviderProps {
  children: React.ReactNode;
}

export const DialogProvider: React.FC<DialogProviderProps> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: DialogOptions;
    resolve?: (value: string | boolean) => void;
  }>({
    isOpen: false,
    options: { message: '' },
  });

  const showDialog = useCallback((options: DialogOptions): Promise<string | boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
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

  const alert = useCallback((message: string, title?: string): Promise<boolean> => {
    return showDialog({
      type: 'info',
      message,
      title,
      confirmText: '确定',
    }) as Promise<boolean>;
  }, [showDialog]);

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return showDialog({
      type: 'confirm',
      message,
      title,
      confirmText: '确定',
      cancelText: '取消',
    }) as Promise<boolean>;
  }, [showDialog]);

  const prompt = useCallback((
    message: string,
    defaultValue?: string,
    placeholder?: string,
    title?: string
  ): Promise<string> => {
    return showDialog({
      type: 'prompt',
      message,
      defaultValue,
      placeholder,
      title,
      confirmText: '确定',
      cancelText: '取消',
    }) as Promise<string>;
  }, [showDialog]);

  const warning = useCallback((message: string, title?: string): Promise<boolean> => {
    return showDialog({
      type: 'warning',
      message,
      title,
      confirmText: '确定',
    }) as Promise<boolean>;
  }, [showDialog]);

  const error = useCallback((message: string, title?: string): Promise<boolean> => {
    return showDialog({
      type: 'error',
      message,
      title,
      confirmText: '确定',
    }) as Promise<boolean>;
  }, [showDialog]);

  const contextValue: DialogContextType = {
    alert,
    confirm,
    prompt,
    warning,
    error,
  };

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      <CustomDialog
        isOpen={dialogState.isOpen}
        onClose={hideDialog}
        options={{
          ...dialogState.options,
          onConfirm: handleConfirm,
          onCancel: handleCancel,
        }}
      />
    </DialogContext.Provider>
  );
};