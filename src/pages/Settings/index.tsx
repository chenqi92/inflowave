import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const Settings: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2}>应用设置</Title>
      <p>应用设置功能正在开发中...</p>
    </div>
  );
};

export default Settings;
