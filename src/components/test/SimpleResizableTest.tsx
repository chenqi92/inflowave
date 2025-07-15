import React from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui';

const SimpleResizableTest: React.FC = () => {
  return (
    <div className="h-screen p-4">
      <h2 className="text-xl font-bold mb-4">Resizable 测试</h2>
      <div className="h-96 border border-gray-300 rounded">
        <ResizablePanelGroup direction="horizontal">
          {/* 左侧面板 */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full p-4 bg-blue-50">
              <h3 className="font-semibold">左侧面板</h3>
              <p>水平拖动测试</p>
            </div>
          </ResizablePanel>

          {/* 水平分割线 */}
          <ResizableHandle withHandle />

          {/* 右侧面板组 */}
          <ResizablePanel defaultSize={70} minSize={50}>
            <ResizablePanelGroup direction="vertical">
              {/* 上半部分 */}
              <ResizablePanel defaultSize={60} minSize={30}>
                <div className="h-full p-4 bg-green-50">
                  <h3 className="font-semibold">右上面板</h3>
                  <p>垂直拖动测试</p>
                </div>
              </ResizablePanel>

              {/* 垂直分割线 */}
              <ResizableHandle withHandle />

              {/* 下半部分 */}
              <ResizablePanel defaultSize={40} minSize={25}>
                <div className="h-full p-4 bg-yellow-50">
                  <h3 className="font-semibold">右下面板</h3>
                  <p>垂直拖动测试</p>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>测试说明：</p>
        <ul className="list-disc list-inside">
          <li>左右拖动：拖动左侧和右侧面板之间的分割线</li>
          <li>上下拖动：拖动右上和右下面板之间的分割线</li>
          <li>两个方向的拖动都应该流畅无卡顿</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleResizableTest;
