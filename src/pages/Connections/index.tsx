import React from 'react';
import { Card, Typography } from 'antd';
import ConnectionManager from '@/components/ConnectionManager';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Connections: React.FC = () => {
  const navigate = useNavigate();

  const handleConnectionSelect = (connectionId: string) => {
    // 导航到数据库页面或其他相关页面
    navigate('/database', { state: { connectionId } });
  };

  return (
    <div className="connections-page">
      <Title level={2}>连接管理</Title>
      <ConnectionManager onConnectionSelect={handleConnectionSelect} />
    </div>
  );
};

export default Connections;
