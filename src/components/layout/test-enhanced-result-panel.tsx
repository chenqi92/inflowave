import React from 'react';
import EnhancedResultPanel from './EnhancedResultPanel';
import type { QueryResult } from '@/types';

// 测试数据
const mockQueryResult: QueryResult = {
  results: [{
    series: [{
      name: 'test_measurement',
      columns: ['time', 'temperature', 'humidity', 'location'],
      values: [
        ['2024-01-01T00:00:00Z', 25.5, 60.2, 'sensor_1'],
        ['2024-01-01T01:00:00Z', 26.1, 58.7, 'sensor_1'],
        ['2024-01-01T02:00:00Z', 24.8, 62.1, 'sensor_1'],
        ['2024-01-01T03:00:00Z', 25.9, 59.4, 'sensor_1'],
        ['2024-01-01T04:00:00Z', 26.3, 57.8, 'sensor_1'],
      ]
    }]
  }],
  executionTime: 150,
  rowCount: 5
};

const mockExecutedQueries = [
  'SELECT temperature, humidity FROM test_measurement WHERE time >= now() - 5h',
  'SELECT * FROM test_measurement ORDER BY time DESC LIMIT 10'
];

// 测试组件
const TestEnhancedResultPanel: React.FC = () => {
  return (
    <div className="h-screen w-full">
      <EnhancedResultPanel
        collapsed={false}
        queryResult={mockQueryResult}
        executedQueries={mockExecutedQueries}
        executionTime={150}
        onClearResult={() => console.log('Clear result called')}
      />
    </div>
  );
};

export default TestEnhancedResultPanel;