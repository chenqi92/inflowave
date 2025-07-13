import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import ConnectionsPage from '@/pages/Connections';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ visible, onClose }) => {
  return (
    <Dialog open={visible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>连接管理</DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-120px)] overflow-auto p-5">
          <ConnectionsPage />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionModal;