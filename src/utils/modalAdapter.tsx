import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ModalConfig {
  title?: React.ReactNode;
  content?: React.ReactNode;
  onOk?: () => void | Promise<void>;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  centered?: boolean;
  icon?: React.ReactNode;
  type?: 'info' | 'success' | 'error' | 'warning' | 'confirm';
}

// 创建一个全局的modal状态管理
let currentModal: {
  isOpen: boolean;
  config: ModalConfig;
  resolve?: (value: boolean) => void;
} = {
  isOpen: false,
  config: {},
};

// Modal状态更新回调
let updateModalState: ((state: typeof currentModal) => void) | null = null;

// 设置状态更新回调
export const setModalStateUpdater = (
  updater: (state: typeof currentModal) => void
) => {
  updateModalState = updater;
};

// 获取图标
const getIcon = (type?: string, customIcon?: React.ReactNode) => {
  if (customIcon) return customIcon;

  switch (type) {
    case 'info':
      return <Info className='w-5 h-5 text-primary' />;
    case 'success':
      return <CheckCircle className='w-5 h-5 text-success' />;
    case 'error':
      return <XCircle className='w-5 h-5 text-destructive' />;
    case 'warning':
    case 'confirm':
      return <AlertTriangle className='w-5 h-5 text-warning' />;
    default:
      return <Info className='w-5 h-5 text-primary' />;
  }
};

// 显示模态框的通用函数
const showModal = (config: ModalConfig): Promise<boolean> => {
  return new Promise(resolve => {
    currentModal = {
      isOpen: true,
      config,
      resolve,
    };

    if (updateModalState) {
      updateModalState({ ...currentModal });
    }
  });
};

// 关闭模态框
const closeModal = (result: boolean = false) => {
  if (currentModal.resolve) {
    currentModal.resolve(result);
  }

  currentModal = {
    isOpen: false,
    config: {},
    resolve: undefined,
  };

  if (updateModalState) {
    updateModalState({ ...currentModal });
  }
};

// 适配Ant Design的Modal.info API
export const info = (config: ModalConfig) => {
  return showModal({
    ...config,
    type: 'info',
  });
};

// 适配Ant Design的Modal.success API
export const success = (config: ModalConfig) => {
  return showModal({
    ...config,
    type: 'success',
  });
};

// 适配Ant Design的Modal.error API
export const error = (config: ModalConfig) => {
  return showModal({
    ...config,
    type: 'error',
  });
};

// 适配Ant Design的Modal.warning API
export const warning = (config: ModalConfig) => {
  return showModal({
    ...config,
    type: 'warning',
  });
};

// 适配Ant Design的Modal.confirm API
export const confirm = (config: ModalConfig): Promise<boolean> => {
  return showModal({
    ...config,
    type: 'confirm',
  });
};

// 注意：showMessage 已在 @/utils/message 中定义，这里不再重复定义
// 如果需要使用消息功能，请从 @/utils/message 导入 showMessage

// Modal适配器组件
export const ModalAdapter: React.FC = () => {
  const [modalState, setModalState] = React.useState(currentModal);

  React.useEffect(() => {
    setModalStateUpdater(setModalState);
    return () => {
      setModalStateUpdater(() => {});
    };
  }, []);

  const handleOk = async () => {
    if (modalState.config.onOk) {
      try {
        await modalState.config.onOk();
        closeModal(true);
      } catch (err) {
        console.error('Modal onOk error:', err);
        // 不关闭模态框，让用户处理错误
      }
    } else {
      closeModal(true);
    }
  };

  const handleCancel = () => {
    if (modalState.config.onCancel) {
      modalState.config.onCancel();
    }
    closeModal(false);
  };

  if (!modalState.isOpen) return null;

  const { config } = modalState;
  const icon = getIcon(config.type, config.icon);

  return (
    <Dialog
      open={modalState.isOpen}
      onOpenChange={open => !open && handleCancel()}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            {icon}
            {config.title || '提示'}
          </DialogTitle>
          {config.content && (
            <DialogDescription asChild>
              <div className='space-y-2'>
                {typeof config.content === 'string' ? (
                  <p>{config.content}</p>
                ) : (
                  config.content
                )}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className='flex gap-2'>
          {config.type === 'confirm' && (
            <Button variant='outline' onClick={handleCancel}>
              {config.cancelText || '取消'}
            </Button>
          )}
          <Button onClick={handleOk}>
            {config.okText || (config.type === 'confirm' ? '确定' : '知道了')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 兼容Ant Design的Modal对象
export const Modal = {
  info,
  success,
  error,
  warning,
  confirm,
};

// 导出适配器组件供App.tsx使用
export default ModalAdapter;
