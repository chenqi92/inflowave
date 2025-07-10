import React from 'react';
import { Typography } from '@/components/ui';
import PerformanceMonitor from '@/components/performance/PerformanceMonitor';
import { useConnectionStore } from '@/store/connection';

const { Title } = Typography;

const Performance: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>性能监控</Title>
        <Typography.Paragraph type="secondary">
          监控系统性能、查询执行情况和资源使用状况
        </Typography.Paragraph>
      </div>

      <PerformanceMonitor connectionId={activeConnectionId} />
    </div>
  );
};

export default Performance;
