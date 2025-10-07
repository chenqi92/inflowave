import React from 'react';
import {
  ScrollArea,
} from '@/components/ui';
import DataGenerator from '@/components/tools/DataGenerator';

interface VerticalDevToolsProps {
  className?: string;
}

export const VerticalDevTools: React.FC<VerticalDevToolsProps> = ({
  className = '',
}) => {
  return (
    <div className={`h-full flex flex-col bg-background ${className}`}>
      {/* 头部 */}
      <div className='p-3 border-b'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-semibold'>测试数据生成</h2>
        </div>
      </div>

      {/* 内容区域 - 直接显示数据生成器 */}
      <ScrollArea className='flex-1'>
        <div className='p-3'>
          <DataGenerator />
        </div>
      </ScrollArea>
    </div>
  );
};

export default VerticalDevTools;
