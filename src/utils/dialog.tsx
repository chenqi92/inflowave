/**
 * 纯 shadcn/ui 对话框工具
 * 完全移除 antd 兼容性，使用 Tailwind CSS 样式
 */
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { Button } from '@/components/ui';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import logger from '@/utils/logger';

interface DialogConfig {
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

// 获取图标和样式
const getIconAndVariant = (type?: string, customIcon?: React.ReactNode) => {
  if (customIcon) return { icon: customIcon, variant: 'default' as const };

  switch (type) {
    case 'info':
      return { 
        icon: <Info className='w-5 h-5 text-blue-500' />, 
        variant: 'default' as const 
      };
    case 'success':
      return { 
        icon: <CheckCircle className='w-5 h-5 text-green-500' />, 
        variant: 'default' as const 
      };
    case 'error':
      return { 
        icon: <XCircle className='w-5 h-5 text-red-500' />, 
        variant: 'destructive' as const 
      };
    case 'warning':
    case 'confirm':
      return { 
        icon: <AlertTriangle className='w-5 h-5 text-yellow-500' />, 
        variant: 'default' as const 
      };
    default:
      return { 
        icon: <Info className='w-5 h-5 text-blue-500' />, 
        variant: 'default' as const 
      };
  }
};

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
const closeDialog = (result: boolean = false) => {
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

// 纯 shadcn/ui 对话框组件
export const DialogManager: React.FC = () => {
  const [dialogState, setDialogState] = React.useState(currentDialog);

  React.useEffect(() => {
    setDialogStateUpdater(setDialogState);
    return () => {
      setDialogStateUpdater(() => {});
    };
  }, []);

  const handleConfirm = async () => {
    if (dialogState.config.onConfirm) {
      try {
        await dialogState.config.onConfirm();
        closeDialog(true);
      } catch (err) {
        logger.error('Dialog onConfirm error:', err);
        // 不关闭对话框，让用户处理错误
      }
    } else {
      closeDialog(true);
    }
  };

  const handleCancel = () => {
    if (dialogState.config.onCancel) {
      dialogState.config.onCancel();
    }
    closeDialog(false);
  };

  if (!dialogState.isOpen) return null;

  const { config } = dialogState;
  const { icon, variant } = getIconAndVariant(config.type, config.icon);

  return (
    <Dialog
      open={dialogState.isOpen}
      onOpenChange={open => !open && handleCancel()}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-3'>
            {icon}
            <span className='text-foreground'>
              {config.title || '提示'}
            </span>
          </DialogTitle>
          {config.content && (
            <DialogDescription asChild>
              <div className='space-y-2 text-muted-foreground'>
                {typeof config.content === 'string' ? (
                  <p className='leading-relaxed'>{config.content}</p>
                ) : (
                  config.content
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className='flex gap-2 sm:gap-2'>
          {config.type === 'confirm' && (
            <Button 
              variant='outline' 
              onClick={handleCancel}
              className='flex-1 sm:flex-none'
            >
              {config.cancelText || '取消'}
            </Button>
          )}
          <Button 
            variant={variant}
            onClick={handleConfirm}
            className='flex-1 sm:flex-none'
          >
            {config.confirmText || (config.type === 'confirm' ? '确定' : '知道了')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

// 导出对话框管理器组件供App.tsx使用
export default DialogManager;
