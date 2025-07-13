import React from 'react';
import { Modal } from 'antd';
import ConnectionsPage from '@/pages/Connections';

interface ConnectionModalProps {
  visible: boolean;
  onClose: () => void;
}

const ConnectionModal: React.FC<ConnectionModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      title="连接管理"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1400}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}
      zIndex={1000}
      maskClosable={true}
      keyboard={true}
      destroyOnClose={true}
      getContainer={false}
    >
      <div style={{ padding: '20px' }}>
        <ConnectionsPage />
      </div>
    </Modal>
  );
};

export default ConnectionModal;