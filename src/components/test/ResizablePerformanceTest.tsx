import React, { useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui';
import { Button } from '@/components/ui';
import { useResizableOptimization } from '@/hooks/useResizableOptimization';

const ResizablePerformanceTest: React.FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  const [lastResizeTime, setLastResizeTime] = useState<number>(0);
  const { handleResizeStart, handleResizeEnd } = useResizableOptimization();

  // 模拟重内容组件
  const HeavyContent = React.memo(({ title, color }: { title: string; color: string }) => {
    const [localRenderCount, setLocalRenderCount] = useState(0);
    
    React.useEffect(() => {
      setLocalRenderCount(prev => prev + 1);
    });

    return (
      <div className={`h-full p-4 ${color}`}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          组件渲染次数: {localRenderCount}
        </p>
        <div className="space-y-2">
          {Array.from({ length: 20 }, (_, i) => (
            <div key={i} className="p-2 bg-muted/50 rounded">
              模拟内容项 {i + 1}
            </div>
          ))}
        </div>
      </div>
    );
  });

  const handleResize = useCallback((sizes: number[]) => {
    setLastResizeTime(Date.now());
    setRenderCount(prev => prev + 1);
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 border-b bg-background">
        <h2 className="text-xl font-bold mb-2">Resizable 性能测试</h2>
        <div className="flex gap-4 text-sm">
          <span>总渲染次数: {renderCount}</span>
          <span>最后调整时间: {lastResizeTime ? new Date(lastResizeTime).toLocaleTimeString() : '未调整'}</span>
        </div>
        <div className="mt-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setRenderCount(0);
              setLastResizeTime(0);
            }}
          >
            重置计数器
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal" onLayout={handleResize}>
          {/* 左侧面板 */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <HeavyContent title="左侧面板" color="bg-blue-50" />
          </ResizablePanel>

          {/* 水平分割线 */}
          <ResizableHandle withHandle />

          {/* 右侧面板组 */}
          <ResizablePanel defaultSize={70} minSize={50}>
            <ResizablePanelGroup direction="vertical" onLayout={handleResize}>
              {/* 上半部分 */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <HeavyContent title="右上面板" color="bg-green-50" />
              </ResizablePanel>

              {/* 垂直分割线 */}
              <ResizableHandle withHandle />

              {/* 下半部分 */}
              <ResizablePanel defaultSize={40} minSize={25}>
                <HeavyContent title="右下面板" color="bg-yellow-50" />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="p-2 border-t bg-muted/50 text-xs text-muted-foreground">
        <p>测试说明：拖动分割线观察渲染次数变化。优化后的组件应该减少不必要的重新渲染。</p>
        <p>水平拖动（左右）和垂直拖动（上下）的性能应该都很流畅。</p>
      </div>
    </div>
  );
};

export default ResizablePerformanceTest;
