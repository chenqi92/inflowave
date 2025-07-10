import React from 'react';
import { Typography } from '@/components/ui';
import ExtensionManager from '@/components/extensions/ExtensionManager';

const { Title } = Typography;

const Extensions: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>扩展管理</Title>
        <Typography.Paragraph type="secondary">
          管理插件、API集成、Webhook和自动化规则
        </Typography.Paragraph>
      </div>

      <ExtensionManager />
    </div>
  );
};

export default Extensions;
