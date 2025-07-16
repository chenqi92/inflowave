import React from 'react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import PerformanceBottleneckDiagnostics from '@/components/analytics/PerformanceBottleneckDiagnostics';

const Performance: React.FC = () => {
  return (
    <DesktopPageWrapper
      title="性能监控与诊断"
      description="全面的性能监控、瓶颈诊断和系统分析工具"
    >
      <PerformanceBottleneckDiagnostics />
    </DesktopPageWrapper>
  );
};

export default Performance;
