import React from 'react';
import { cn } from '@/utils/cn';
import { ExternalLink, Info } from 'lucide-react';

interface SimpleDragOverlayProps {
  active: boolean;
  className?: string;
}

const SimpleDragOverlay: React.FC<SimpleDragOverlayProps> = ({
  active,
  className
}) => {
  if (!active) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/10 backdrop-blur-sm',
        'flex items-center justify-center',
        'transition-all duration-200 pointer-events-none',
        className
      )}
    >
      {/* 提示信息 */}
      <div className="bg-primary/90 text-primary-foreground rounded-lg p-6 shadow-xl max-w-md mx-4">
        <div className="flex items-center gap-3 mb-3">
          <ExternalLink className="w-6 h-6" />
          <div className="font-semibold text-lg">拖拽分离Tab</div>
        </div>
        
        <div className="space-y-2 text-sm opacity-90">
          <p>🖱️ 拖拽到窗口边缘可以分离Tab</p>
          <p>📋 分离的Tab将在新窗口中打开</p>
          <p>⌨️ 按ESC键取消拖拽</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDragOverlay;