import React from 'react';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';
import PerformanceMonitor from '@/components/performance/PerformanceMonitor';
import { useConnectionStore } from '@/store/connection';

const Performance: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();

  return (
    <DesktopPageWrapper
      title="性能监控"
      description="监控系统性能、查询执行情况和资源使用状况"
    >
      <PerformanceMonitor connectionId={activeConnectionId} />
    </DesktopPageWrapper>
  );
};

export default Performance;
