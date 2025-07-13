import React from 'react';

// 临时禁用这个组件以避免构建错误
// TODO: 需要完全重写以使用Shadcn/ui组件
interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  target: any;
  onClose: () => void;
  onAction: (action: string, params?: any) => void;
  onExecuteQuery: (sql: string, description?: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = () => {
  return null;
};

export default ContextMenu;
