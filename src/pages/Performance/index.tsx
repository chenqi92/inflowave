import React from 'react';
import PerformanceBottleneckDiagnostics from '@/components/analytics/PerformanceBottleneckDiagnostics';

const Performance: React.FC = () => {
  return (
    <div className='h-full bg-background flex flex-col'>
      {/* 页面标题 */}
      <div className='border-b bg-background'>
        <div className='p-6'>
          <h1 className='text-2xl font-semibold text-foreground'>性能监控与诊断</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            全面的性能监控、瓶颈诊断和系统分析工具
          </p>
        </div>
      </div>

      {/* 内容区域 */}
      <div className='flex-1 overflow-hidden bg-background'>
        <PerformanceBottleneckDiagnostics />
      </div>
    </div>
  );
};

export default Performance;
