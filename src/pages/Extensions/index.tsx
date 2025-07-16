import React from 'react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import ExtensionManager from '@/components/extensions/ExtensionManager';

const Extensions: React.FC = () => {
  return (
    <DesktopPageWrapper
      title='扩展管理'
      description='管理插件、API集成、Webhook和自动化规则'
    >
      <ExtensionManager />
    </DesktopPageWrapper>
  );
};

export default Extensions;
