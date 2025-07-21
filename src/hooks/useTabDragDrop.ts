import { useState, useCallback, useRef, useEffect } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { Window } from '@tauri-apps/api/window';
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

interface DetachedWindow {
  id: string;
  tabId: string;
  windowLabel: string;
  tab: DraggedTab;
}

export interface TabDragDropProps {
  onTabDetach: (tabId: string) => void;
  onTabReattach: (tab: DraggedTab) => void;
  onTabMove: (fromIndex: number, toIndex: number) => void;
}

export const useTabDragDrop = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTab, setDraggedTab] = useState<DraggedTab | null>(null);
  const [detachedWindows, setDetachedWindows] = useState<DetachedWindow[]>([]);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 50; // 拖拽阈值，超过这个距离才算开始拖拽

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
    dragImage.className = 'bg-primary text-primary-foreground px-3 py-2 rounded shadow-lg text-sm font-medium';
    dragImage.textContent = tab.title;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    
    event.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // 清理临时元素
    setTimeout(() => {
      document.body.removeChild(dragImage);
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
    }
  }, [draggedTab, dropZoneActive, dragThreshold]);

  // 拖拽结束
  const handleTabDragEnd = useCallback(async (
    event: React.DragEvent<HTMLElement>,
    onTabDetach?: (tabId: string) => void
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

    // 如果拖拽距离足够远，分离tab
    if (distance > dragThreshold) {
      await detachTab(draggedTab, currentX, currentY, onTabDetach);
    }

    setIsDragging(false);
    setDraggedTab(null);
    setDropZoneActive(false);
    dragStartPosition.current = null;
  }, [draggedTab, dragThreshold]);

  // 分离tab到新窗口
  const detachTab = useCallback(async (
    tab: DraggedTab,
    x: number,
    y: number,
    onTabDetach?: (tabId: string) => void
  ) => {
    try {
      const windowLabel = `detached-tab-${tab.id}-${Date.now()}`;
      
      // 创建新的分离窗口
      const detachedWindow = await safeTauriInvoke<string>('create_detached_window', {
        label: windowLabel,
        title: `📋 ${tab.title}`,
        x: Math.max(0, x - 200),
        y: Math.max(0, y - 100),
        width: 1000,
        height: 700,
        tab
      });

      if (detachedWindow) {
        const newDetachedWindow: DetachedWindow = {
          id: Date.now().toString(),
          tabId: tab.id,
          windowLabel,
          tab
        };

        setDetachedWindows(prev => [...prev, newDetachedWindow]);
        
        // 通知主组件移除tab
        onTabDetach?.(tab.id);
        
        showMessage.success(`Tab "${tab.title}" 已分离到新窗口`);
      }
    } catch (error) {
      console.error('分离tab失败:', error);
      showMessage.error('分离tab失败');
    }
  }, []);

  // 重新附加tab
  const reattachTab = useCallback((
    tab: DraggedTab,
    onTabReattach?: (tab: DraggedTab) => void
  ) => {
    // 找到对应的分离窗口
    const detachedWindow = detachedWindows.find(w => w.tabId === tab.id);
    if (detachedWindow) {
      // 关闭分离的窗口
      safeTauriInvoke('close_detached_window', { label: detachedWindow.windowLabel })
        .then(() => {
          setDetachedWindows(prev => prev.filter(w => w.id !== detachedWindow.id));
          // 通知主组件重新添加tab
          onTabReattach?.(tab);
          showMessage.success(`Tab "${tab.title}" 已重新附加`);
        })
        .catch(error => {
          console.error('重新附加tab失败:', error);
          showMessage.error('重新附加tab失败');
        });
    }
  }, [detachedWindows]);

  // 处理tab在tab栏内的拖拽排序
  const handleTabMove = useCallback((
    fromIndex: number,
    toIndex: number,
    onTabMove?: (fromIndex: number, toIndex: number) => void
  ) => {
    onTabMove?.(fromIndex, toIndex);
  }, []);

  // 处理外部窗口的拖拽放置
  const handleTabDrop = useCallback((
    event: React.DragEvent<HTMLElement>,
    onTabReattach?: (tab: DraggedTab) => void
  ) => {
    event.preventDefault();
    
    const tabData = event.dataTransfer.getData('application/tab');
    if (tabData) {
      try {
        const tab: DraggedTab = JSON.parse(tabData);
        reattachTab(tab, onTabReattach);
      } catch (error) {
        console.error('解析拖拽数据失败:', error);
      }
    }
  }, [reattachTab]);

  // 允许拖拽放置
  const handleTabDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // 清理分离的窗口
  const closeDetachedWindow = useCallback((windowId: string) => {
    const detachedWindow = detachedWindows.find(w => w.id === windowId);
    if (detachedWindow) {
      safeTauriInvoke('close_detached_window', { label: detachedWindow.windowLabel })
        .then(() => {
          setDetachedWindows(prev => prev.filter(w => w.id !== windowId));
        })
        .catch(error => {
          console.error('关闭分离窗口失败:', error);
        });
    }
  }, [detachedWindows]);

  // 监听窗口关闭事件
  useEffect(() => {
    const unlisten = Window.getCurrent().onCloseRequested(async () => {
      // 关闭所有分离的窗口
      for (const window of detachedWindows) {
        try {
          await safeTauriInvoke('close_detached_window', { label: window.windowLabel });
        } catch (error) {
          console.error('关闭分离窗口失败:', error);
        }
      }
    });

    return () => {
      try {
        unlisten.then((fn: any) => fn()).catch((error: any) => {
          console.debug('清理窗口监听器时出错:', error);
        });
      } catch (error) {
        console.debug('清理窗口监听器时出错:', error);
      }
    };
  }, [detachedWindows]);

  return {
    // 状态
    isDragging,
    draggedTab,
    detachedWindows,
    dropZoneActive,
    
    // 方法
    handleTabDragStart,
    handleTabDrag,
    handleTabDragEnd,
    handleTabDrop,
    handleTabDragOver,
    handleTabMove,
    reattachTab,
    closeDetachedWindow,
    
    // 工具方法
    detachTab,
  };
};

export default useTabDragDrop;