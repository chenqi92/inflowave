/**
 * 对话框管理器组件
 * 只导出 React 组件以支持 Vite Fast Refresh
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
import {
  setDialogStateUpdater,
  getCurrentDialog,
  closeDialog,
  type DialogConfig,
} from './dialog-api';

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

// 对话框管理器组件
export const DialogManager: React.FC = () => {
  const [dialogState, setDialogState] = React.useState(getCurrentDialog());

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

// 导出对话框管理器组件供App.tsx使用
export default DialogManager;

// 重新导出 API 函数以保持向后兼容
export {
  showInfoDialog,
  showSuccessDialog,
  showErrorDialog,
  showWarningDialog,
  showConfirmDialog,
  dialog,
} from './dialog-api';
