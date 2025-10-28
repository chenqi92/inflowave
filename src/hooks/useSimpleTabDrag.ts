import { useState, useCallback, useRef } from 'react';
import { showMessage } from '@/utils/message';

interface DraggedTab {
  id: string;
  title: string;
  content: string;
  type: 'query' | 'table' | 'database' | 'data-browser';
  connectionId?: string;
  database?: string;
  tableName?: string;
}

export const useSimpleTabDrag = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTab, setDraggedTab] = useState<DraggedTab | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 100; // 拖拽阈值

  // 开始拖拽tab
  const handleTabDragStart = useCallback((
    event: React.DragEvent<HTMLElement>,
    tab: DraggedTab
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/tab', JSON.stringify(tab));
    
    setDraggedTab(tab);
    setIsDragging(true);
    
    // 记录拖拽开始位置
    dragStartPosition.current = {
      x: event.clientX,
      y: event.clientY
    };

    // 设置拖拽图像
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-primary text-primary-foreground px-3 py-2 rounded shadow-lg text-sm font-medium flex items-center gap-2';
    dragImage.innerHTML = `
      <span>📋</span>
      <span>${tab.title}</span>
    `;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    
    event.dataTransfer.setDragImage(dragImage, 50, 20);
    
    // 清理临时元素
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 0);
  }, []);

  // 拖拽过程中
  const handleTabDrag = useCallback((event: React.DragEvent<HTMLElement>) => {
    if (!dragStartPosition.current || !draggedTab) return;

    const currentX = event.clientX;
    const currentY = event.clientY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragStartPosition.current.x, 2) +
      Math.pow(currentY - dragStartPosition.current.y, 2)
    );

    // 如果拖拽距离超过阈值，显示分离提示
    if (distance > dragThreshold && !dropZoneActive) {
      setDropZoneActive(true);
      showMessage.info('拖拽到窗口外边缘可以分离Tab');
    }
  }, [draggedTab, dropZoneActive, dragThreshold]);

  // 拖拽结束
  const handleTabDragEnd = useCallback(async (
    event: React.DragEvent<HTMLElement>,
    onTabAction?: (tabId: string, action: 'detach' | 'reorder') => void
  ) => {
    if (!draggedTab || !dragStartPosition.current) {
      setIsDragging(false);
      setDraggedTab(null);
      setDropZoneActive(false);
      return;
    }

    const currentX = event.clientX;
    const currentY = event.clientY;
    const distance = Math.sqrt(
      Math.pow(currentX - dragStartPosition.current.x, 2) +
      Math.pow(currentY - dragStartPosition.current.y, 2)
    );

    // 检查是否拖拽到窗口边缘（模拟分离）
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const edgeThreshold = 50;

    const nearLeftEdge = currentX < edgeThreshold;
    const nearRightEdge = currentX > windowWidth - edgeThreshold;
    const nearTopEdge = currentY < edgeThreshold;
    const nearBottomEdge = currentY > windowHeight - edgeThreshold;

    if (distance > dragThreshold && (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge)) {
      // 模拟分离功能
      showTabInPopup(draggedTab);
    } else if (distance > 20) {
      // 如果有移动但不是分离，可能是重新排序
      onTabAction?.(draggedTab.id, 'reorder');
    }

    setIsDragging(false);
    setDraggedTab(null);
    setDropZoneActive(false);
    dragStartPosition.current = null;
  }, [draggedTab, dragThreshold]);

  // 在弹窗中显示tab内容（模拟分离）
  const showTabInPopup = useCallback((tab: DraggedTab) => {
    const popup = window.open(
      '',
      `tab-${tab.id}`,
      'width=1000,height=700,scrollbars=yes,resizable=yes'
    );

    if (popup) {
      popup.document.title = `📋 ${tab.title}`;
      popup.document.body.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif; margin: 20px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
            <span style="font-size: 24px;">📋</span>
            <h1 style="margin: 0; font-size: 20px; color: #374151;">${tab.title}</h1>
            <span style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #6b7280;">${tab.type}</span>
            ${tab.database ? `<span style="background: #dbeafe; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #2563eb;">${tab.database}</span>` : ''}
          </div>
          
          ${tab.type === 'data-browser' ? `
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center;">
              <h2 style="color: #374151; margin: 0 0 10px 0;">📊 数据浏览器</h2>
              <p style="color: #6b7280; margin: 0 0 15px 0;">表: ${tab.tableName}</p>
              <p style="color: #9ca3af; font-size: 14px; margin: 0;">此功能需要在主窗口中运行</p>
              <button onclick="window.close()" style="margin-top: 15px; background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">返回主窗口</button>
            </div>
          ` : `
            <div style="background: #1f2937; color: #f9fafb; padding: 20px; border-radius: 8px; font-family: 'Monaco', 'Menlo', monospace; font-size: 14px; line-height: 1.5; white-space: pre-wrap; overflow: auto; max-height: 500px;">
${tab.content || '-- 空查询'}
            </div>
          `}
          

        </div>
      `;

      // 添加样式
      const style = popup.document.createElement('style');
      style.textContent = `
        body { margin: 0; padding: 0; background: #ffffff; }
        button:hover { background: #2563eb !important; }
      `;
      popup.document.head.appendChild(style);

      showMessage.success(`Tab "${tab.title}" 已在新窗口中打开`);
    } else {
      showMessage.error('无法打开新窗口，请检查浏览器弹窗设置');
    }
  }, []);

  // 处理tab在tab栏内的拖拽排序
  const handleTabMove = useCallback((
    fromIndex: number,
    toIndex: number,
    onTabMove?: (fromIndex: number, toIndex: number) => void
  ) => {
    onTabMove?.(fromIndex, toIndex);
  }, []);

  // 处理拖拽放置
  const handleTabDrop = useCallback((
    event: React.DragEvent<HTMLElement>,
    onTabReattach?: (tab: DraggedTab) => void
  ) => {
    event.preventDefault();
    
    const tabData = event.dataTransfer.getData('application/tab');
    if (tabData) {
      try {
        const tab: DraggedTab = JSON.parse(tabData);
        // 在简化版本中，只是显示消息
        showMessage.info(`Tab "${tab.title}" 放置操作`);
      } catch (error) {
        console.error('解析拖拽数据失败:', error);
      }
    }
  }, []);

  // 允许拖拽放置
  const handleTabDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    // 状态
    isDragging,
    draggedTab,
    dropZoneActive,
    
    // 方法
    handleTabDragStart,
    handleTabDrag,
    handleTabDragEnd,
    handleTabDrop,
    handleTabDragOver,
    handleTabMove,
    showTabInPopup,
  };
};

export default useSimpleTabDrag;