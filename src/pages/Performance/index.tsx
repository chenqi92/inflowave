import React from 'react';
import PerformanceBottleneckDiagnostics from '@/components/analytics/PerformanceBottleneckDiagnostics';

const Performance: React.FC = () => {
  return (
    <div className='h-full bg-background flex flex-col'>
      {/* 内容区域 */}
      <div className='flex-1 overflow-hidden bg-background'>
        <PerformanceBottleneckDiagnostics />
      </div>
    </div>
  );
};

export default Performance;
