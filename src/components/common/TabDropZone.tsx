import React from 'react';
import { cn } from '@/utils/cn';
import { MousePointer2, ExternalLink } from 'lucide-react';

interface TabDropZoneProps {
  active: boolean;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  className?: string;
}

const TabDropZone: React.FC<TabDropZoneProps> = ({
  active,
  onDrop,
  onDragOver,
  className
}) => {
  if (!active) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/20 backdrop-blur-sm',
        'flex items-center justify-center',
        'transition-all duration-200',
        className
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {/* 中央放置区域 */}
      <div className="relative">
        {/* 分离区域 */}
        <div className="bg-primary/20 border-2 border-dashed border-primary rounded-lg p-8 mb-6">
          <div className="flex flex-col items-center gap-3 text-primary">
            <ExternalLink className="w-8 h-8" />
            <div className="text-center">
              <div className="font-semibold">分离到新窗口</div>
              <div className="text-sm opacity-75">继续拖拽以分离Tab到独立窗口</div>
            </div>
          </div>
        </div>

        {/* 重新附加区域 */}
        <div className="bg-green-500/20 border-2 border-dashed border-green-500 rounded-lg p-8">
          <div className="flex flex-col items-center gap-3 text-green-600">
            <MousePointer2 className="w-8 h-8" />
            <div className="text-center">
              <div className="font-semibold">重新附加</div>
              <div className="text-sm opacity-75">拖拽到此处重新附加到主窗口</div>
            </div>
          </div>
        </div>
      </div>

      {/* 指示说明 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-background/90 backdrop-blur border rounded-lg px-4 py-2 shadow-lg">
          <div className="text-sm text-muted-foreground text-center">
            🖱️ 继续拖拽分离 • 🔄 拖拽到此处重新附加 • ⌨️ 按 ESC 取消
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabDropZone;