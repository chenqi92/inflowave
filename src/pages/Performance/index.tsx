import React from 'react';
import { MultiSourcePerformanceMonitor } from '@/components/performance/MultiSourcePerformanceMonitor';

const Performance: React.FC = () => {
  return (
    <div className="h-full">
      <MultiSourcePerformanceMonitor />
    </div>
  );
};

export default Performance;
