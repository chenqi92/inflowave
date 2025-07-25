import React from 'react';
import ExtensionManager from '@/components/extensions/ExtensionManager';

const Extensions: React.FC = () => {
  return (
    <div className='h-full bg-background flex flex-col'>
      {/* 内容区域 */}
      <div className='flex-1 overflow-hidden bg-background'>
        <ExtensionManager />
      </div>
    </div>
  );
};

export default Extensions;
