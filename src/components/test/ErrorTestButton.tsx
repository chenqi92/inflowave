import React from 'react';
import { Button, toast } from '@/components/ui';
import { AlertTriangle, Bug, Zap, Info, Globe, Component } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorLogger } from '@/utils/errorLogger';

const ErrorTestButton: React.FC = () => {
  const { toast } = useToast();

  // 测试JavaScript错误
  const testJSError = () => {
    try {
      // 故意抛出一个错误
      throw new Error('测试JavaScript错误 - 这是一个模拟的运行时错误');
    } catch (error) {
      // 让错误传播到全局错误处理器
      setTimeout(() => {
        throw error;
      }, 0);
    }
    toast({ title: "信息", description: "JavaScript错误已触发，请查看错误日志" });
  };

  // 测试Promise拒绝
  const testPromiseRejection = () => {
    Promise.reject(new Error('测试Promise拒绝 - 这是一个未处理的Promise拒绝'));
    toast({ title: "信息", description: "Promise拒绝已触发，请查看错误日志" });
  };

  // 测试控制台错误
  const testConsoleError = () => {
    console.error('测试控制台错误', { 
      component: 'ErrorTestButton',
      timestamp: Date.now(),
      additionalData: { userId: 123, action: 'test' }
    });
    toast({ title: "信息", description: "控制台错误已记录，请查看错误日志" });
  };

  // 测试自定义错误记录
  const testCustomError = async () => {
    await errorLogger.logCustomError('测试自定义错误记录', {
      component: 'ErrorTestButton',
      action: 'manual-test',
      severity: 'high',
      context: {
        userTriggered: true,
        testType: 'custom-logging'
      }
    });
    toast({ title: "成功", description: "自定义错误已记录到日志" });
  };

  // 测试网络错误（模拟）
  const testNetworkError = async () => {
    try {
      // 故意请求一个不存在的端点
      await fetch('/api/nonexistent-endpoint');
    } catch (error) {
      // 这将被全局fetch拦截器捕获
    }
    toast({ title: "信息", description: "网络错误已触发，请查看错误日志" });
  };

  // 测试React组件错误
  const TestErrorComponent: React.FC = () => {
    throw new Error('测试React组件错误 - 这是一个组件渲染错误');
  };

  const [showErrorComponent, setShowErrorComponent] = React.useState(false);

  const testReactError = () => {
    setShowErrorComponent(true);
    toast({ title: "信息", description: "React组件错误已触发，请查看错误边界" });
  };

  if (showErrorComponent) {
    return <TestErrorComponent />;
  }

  return (
    <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-red-700 mb-2">
          🧪 错误日志系统测试工具
        </h4>
        <p className="text-red-600 text-sm">
          使用以下按钮测试不同类型的错误记录功能。测试完成后请到"设置 → 开发者工具"查看错误日志。
        </p>
      </div>

      <div className="space-y-4">
        {/* JavaScript 运行时错误 */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">JavaScript 运行时错误</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              icon={<Bug className="w-4 h-4" />}
              onClick={testJSError}
              variant="destructive"
              className="w-full justify-start"
            >
              JS错误
            </Button>

            <Button
              icon={<Zap className="w-4 h-4" />}
              onClick={testPromiseRejection}
              variant="destructive"
              className="w-full justify-start"
            >
              Promise拒绝
            </Button>

            <Button
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={testConsoleError}
              variant="destructive"
              className="w-full justify-start"
            >
              控制台错误
            </Button>
          </div>
        </div>

        {/* 应用程序错误 */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-3">应用程序错误</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              icon={<Component className="w-4 h-4" />}
              onClick={testReactError}
              variant="destructive"
              className="w-full justify-start"
            >
              React错误
            </Button>

            <Button
              icon={<Globe className="w-4 h-4" />}
              onClick={testNetworkError}
              variant="destructive"
              className="w-full justify-start"
            >
              网络错误
            </Button>

            <Button
              icon={<Info className="w-4 h-4" />}
              onClick={testCustomError}
              variant="default"
              className="w-full justify-start"
            >
              自定义错误
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
        💡 <strong>提示：</strong>触发错误后，请前往"设置 → 开发者工具 → 错误日志查看器"查看详细的错误记录和分析。
      </div>
    </div>
  );
};

export default ErrorTestButton;