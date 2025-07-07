import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

const Visualization: React.FC = () => {
  return (
    <div className="p-6">
      <Title level={2}>数据可视化</Title>
      <p>数据可视化功能正在开发中...</p>
    </div>
  );
};

export default Visualization;
