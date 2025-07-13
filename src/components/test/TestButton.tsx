import React, { useState } from 'react';
import { Button } from 'antd';
import { masterTestRunner } from '@/utils/masterTestRunner';

const TestButton: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testType, setTestType] = useState<'health' | 'complete' | 'ui' | 'feature'>('health');

  const runTest = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    console.clear();
    
    try {
      switch (testType) {
        case 'health':
          await masterTestRunner.quickHealthCheck();
          break;
        case 'complete':
          await masterTestRunner.runCompleteTestSuite();
          break;
        case 'ui':
          const { uiInteractionTester } = await import('@/utils/uiInteractionTest');
          await uiInteractionTester.runAllUITests();
          break;
        case 'feature':
          const { runFeatureTests } = await import('@/utils/featureTest');
          await runFeatureTests();
          break;
      }
    } catch (error) {
      console.error('测试运行失败:', error);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-medium text-gray-700">测试工具</div>
        
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={testType === 'health' ? 'primary' : 'outline'}
            onClick={() => setTestType('health')}
          >
            健康检查
          </Button>
          <Button
            size="sm"
            variant={testType === 'ui' ? 'primary' : 'outline'}
            onClick={() => setTestType('ui')}
          >
            UI测试
          </Button>
          <Button
            size="sm"
            variant={testType === 'feature' ? 'primary' : 'outline'}
            onClick={() => setTestType('feature')}
          >
            功能测试
          </Button>
          <Button
            size="sm"
            variant={testType === 'complete' ? 'primary' : 'outline'}
            onClick={() => setTestType('complete')}
          >
            完整测试
          </Button>
        </div>
        
        <Button
          variant="primary"
          loading={isRunning}
          onClick={runTest}
          className="w-full"
        >
          {isRunning ? '运行中...' : '运行测试'}
        </Button>
        
        <div className="text-xs text-gray-500">
          查看控制台输出结果
        </div>
      </div>
    </div>
  );
};

export default TestButton;