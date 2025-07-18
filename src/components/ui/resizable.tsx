import React from 'react';
import { GripVertical, GripHorizontal } from 'lucide-react';
import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@/lib/utils';
import '../../styles/resizable-optimizations.css';

const ResizablePanelGroup = React.memo(
  ({
    className,
    ...props
  }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
    <ResizablePrimitive.PanelGroup
      className={cn(
        'resizable-panel-group flex h-full w-full data-[panel-group-direction=vertical]:flex-col',
        className
      )}
      {...props}
    />
  )
);

ResizablePanelGroup.displayName = 'ResizablePanelGroup';

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = React.memo(
  ({
    withHandle,
    className,
    ...props
  }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
    withHandle?: boolean;
  }) => {
    const [isResizing, setIsResizing] = React.useState(false);

    // 预计算样式类名以避免在拖动时重复计算
    const handleClassName = React.useMemo(
      () =>
        cn(
          // 基础优化样式
          'resizable-handle-optimized group relative flex items-center justify-center bg-border',
          // 焦点样式
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1',
          // 水平方向样式（默认）
          'resizable-handle-horizontal w-px cursor-col-resize',
          'after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
          // 垂直方向样式
          'data-[panel-group-direction=vertical]:resizable-handle-vertical data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize',
          'data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0',
          // 悬停效果
          'hover:bg-border/80',
          // 拖拽时的优化类
          isResizing && 'will-change-transform',
          className
        ),
      [className, isResizing]
    );

    const gripClassName = React.useMemo(
      () =>
        'resizable-grip z-10 opacity-0 flex h-4 w-3 items-center justify-center rounded-sm border bg-background shadow-sm data-[panel-group-direction=vertical]:rotate-90',
      []
    );

    // 优化的事件处理
    const handleMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(true);
        props.onMouseDown?.(e);
      },
      [props.onMouseDown]
    );

    const handleMouseUp = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        setIsResizing(false);
        props.onMouseUp?.(e);
      },
      [props.onMouseUp]
    );

    // 监听全局鼠标事件以确保拖拽结束
    React.useEffect(() => {
      const handleGlobalMouseUp = () => setIsResizing(false);
      if (isResizing) {
        document.addEventListener('mouseup', handleGlobalMouseUp);
        return () =>
          document.removeEventListener('mouseup', handleGlobalMouseUp);
      }
    }, [isResizing]);

    return (
      <ResizablePrimitive.PanelResizeHandle
        className={handleClassName}
        onMouseDown={handleMouseDown as any}
        onMouseUp={handleMouseUp as any}
        {...props}
      >
        {withHandle && (
          <div className={gripClassName}>
            <GripVertical className='h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground data-[panel-group-direction=vertical]:hidden' />
            <GripHorizontal className='h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground hidden data-[panel-group-direction=vertical]:block' />
          </div>
        )}
      </ResizablePrimitive.PanelResizeHandle>
    );
  }
);

ResizableHandle.displayName = 'ResizableHandle';

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
