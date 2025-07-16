// Simple event system for triggering refreshes across components
type RefreshEventListener = () => void;

class RefreshEventManager {
  private listeners: RefreshEventListener[] = [];

  // 添加监听器
  addListener(listener: RefreshEventListener) {
    this.listeners.push(listener);

    // 返回移除监听器的函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // 触发所有监听器
  trigger() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Refresh listener error:', error);
      }
    });
  }
}

// 导出全局实例
export const dataExplorerRefresh = new RefreshEventManager();
