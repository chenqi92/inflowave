import React from 'react';
import { VerticalPerformanceMonitor } from '@/components/performance/VerticalPerformanceMonitor';

const Performance: React.FC = () => {
  return (
    <div className="h-full">
      <VerticalPerformanceMonitor />
    </div>
  );
};

export default Performance;
