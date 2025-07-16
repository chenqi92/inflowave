import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@/components/ui';
import { AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface DialogOptions {
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'confirm' | 'prompt';
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  options: DialogOptions;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  onClose,
  options,
}) => {
  const [inputValue, setInputValue] = useState(options.defaultValue || '');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    title,
    message,
    type = 'info',
    placeholder,
    confirmText = '确定',
    cancelText = '取消',
    onConfirm,
    onCancel,
  } = options;

  useEffect(() => {
    if (isOpen) {
      setInputValue(options.defaultValue || '');
    }
  }, [isOpen, options.defaultValue]);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      if (type === 'prompt') {
        await onConfirm?.(inputValue.trim());
      } else {
        await onConfirm?.();
      }
    } catch (error) {
      console.error('Dialog confirm error:', error);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'warning':
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'confirm':
        return <HelpCircle className="w-6 h-6 text-blue-500" />;
      case 'info':
      case 'prompt':
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'warning':
        return '警告';
      case 'error':
        return '错误';
      case 'confirm':
        return '确认';
      case 'prompt':
        return '输入';
      case 'info':
      default:
        return '信息';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title || getDefaultTitle()}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {message}
          </DialogDescription>
        </DialogHeader>

        {type === 'prompt' && (
          <div className="py-4">
            <Label htmlFor="dialog-input" className="text-right">
              输入内容
            </Label>
            <Input
              id="dialog-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="mt-2"
              autoFocus
            />
          </div>
        )}

        <DialogFooter>
          {(type === 'confirm' || type === 'prompt') && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={
              type === 'warning' || type === 'error'
                ? 'bg-red-600 hover:bg-red-700'
                : ''
            }
          >
            {isProcessing ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomDialog;