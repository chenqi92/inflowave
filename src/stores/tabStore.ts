import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EditorTab } from '@/components/editor/TabManager';

interface TabState {
  tabs: EditorTab[];
  activeKey: string;
  selectedDatabase: string;
  selectedTimeRange?: {
    label: string;
    value: string;
    start: string;
    end: string;
  };
}

interface TabActions {
  // Tab管理
  setTabs: (tabs: EditorTab[]) => void;
  addTab: (tab: EditorTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<EditorTab>) => void;
  setActiveKey: (key: string) => void;
  
  // 数据库和时间范围
  setSelectedDatabase: (database: string) => void;
  setSelectedTimeRange: (timeRange: TabState['selectedTimeRange']) => void;
  
  // 内容更新
  updateTabContent: (tabId: string, content: string) => void;
  
  // 批量操作
  clearAllTabs: () => void;
  restoreFromBackup: (backup: TabState) => void;
}

type TabStore = TabState & TabActions;

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      tabs: [],
      activeKey: '',
      selectedDatabase: '',
      selectedTimeRange: undefined,

      // Tab管理方法
      setTabs: (tabs) => set({ tabs }),
      
      addTab: (tab) => set((state) => ({
        tabs: [...state.tabs, tab],
        activeKey: tab.id,
      })),
      
      removeTab: (tabId) => set((state) => {
        const newTabs = state.tabs.filter(tab => tab.id !== tabId);
        let newActiveKey = state.activeKey;
        
        // 如果删除的是当前活跃标签，切换到其他标签
        if (state.activeKey === tabId && newTabs.length > 0) {
          newActiveKey = newTabs[newTabs.length - 1].id;
        } else if (newTabs.length === 0) {
          newActiveKey = '';
        }
        
        return {
          tabs: newTabs,
          activeKey: newActiveKey,
        };
      }),
      
      updateTab: (tabId, updates) => set((state) => ({
        tabs: state.tabs.map(tab =>
          tab.id === tabId ? { ...tab, ...updates } : tab
        ),
      })),
      
      setActiveKey: (key) => set({ activeKey: key }),
      
      // 数据库和时间范围
      setSelectedDatabase: (database) => set({ selectedDatabase: database }),
      setSelectedTimeRange: (timeRange) => set({ selectedTimeRange: timeRange }),
      
      // 内容更新
      updateTabContent: (tabId, content) => set((state) => ({
        tabs: state.tabs.map(tab =>
          tab.id === tabId 
            ? { ...tab, content, modified: true }
            : tab
        ),
      })),
      
      // 批量操作
      clearAllTabs: () => set({
        tabs: [],
        activeKey: '',
        selectedDatabase: '',
      }),
      
      restoreFromBackup: (backup) => set(backup),
    }),
    {
      name: 'tab-storage', // 存储键名
      // 只持久化重要的状态，排除一些临时状态
      partialize: (state) => ({
        tabs: state.tabs,
        activeKey: state.activeKey,
        selectedDatabase: state.selectedDatabase,
        selectedTimeRange: state.selectedTimeRange,
      }),
      // 版本控制，用于处理存储格式变更
      version: 1,
      // 迁移函数，处理版本升级
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // 从版本0升级到版本1的迁移逻辑
          return {
            ...persistedState,
            selectedTimeRange: undefined,
          };
        }
        return persistedState;
      },
    }
  )
);

// 便捷的hook，用于获取当前活跃的tab
export const useCurrentTab = () => {
  const { tabs, activeKey } = useTabStore();
  return tabs.find(tab => tab.id === activeKey) || null;
};

// 便捷的hook，用于tab操作
export const useTabOperations = () => {
  const {
    addTab,
    removeTab,
    updateTab,
    updateTabContent,
    setActiveKey,
    clearAllTabs,
  } = useTabStore();

  // 创建新的查询tab
  const createQueryTab = (database?: string, query?: string) => {
    const newTab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `查询-${Date.now()}`,
      content: query || 'SELECT * FROM ',
      type: 'query',
      modified: true,
      saved: false,
    };
    
    addTab(newTab);
    return newTab;
  };

  // 创建数据浏览tab
  const createDataBrowserTab = (connectionId: string, database: string, tableName: string) => {
    const newTab: EditorTab = {
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: tableName,
      content: '',
      type: 'data-browser',
      modified: false,
      saved: true,
      connectionId,
      database,
      tableName,
    };
    
    addTab(newTab);
    return newTab;
  };

  // 保存tab内容
  const saveTab = (tabId: string) => {
    updateTab(tabId, { saved: true, modified: false });
  };

  return {
    createQueryTab,
    createDataBrowserTab,
    saveTab,
    removeTab,
    updateTab,
    updateTabContent,
    setActiveKey,
    clearAllTabs,
  };
};

// 用于调试的工具函数
export const getTabStoreState = () => useTabStore.getState();
export const subscribeToTabStore = (callback: (state: TabStore) => void) => 
  useTabStore.subscribe(callback);
