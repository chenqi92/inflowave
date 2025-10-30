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

  // 应用关闭处理
  handleAppClose: () => Promise<boolean>;
}

type TabStore = TabState & TabActions;

// 获取未保存的查询标签页
const getUnsavedQueryTabs = (tabs: EditorTab[]): EditorTab[] => {
  return tabs.filter(tab => tab.type === 'query' && !tab.saved);
};

// 获取已保存的查询标签页
const getSavedQueryTabs = (tabs: EditorTab[]): EditorTab[] => {
  return tabs.filter(tab => tab.type === 'query' && tab.saved);
};

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
      
      addTab: (tab) => {
        console.log(`➕ [TabStore] 添加Tab:`, {
          id: tab.id,
          title: tab.title,
          type: tab.type,
          contentLength: tab.content?.length || 0,
          contentPreview: tab.content?.substring(0, 50) || '(空)',
        });
        return set((state) => ({
          tabs: [...state.tabs, tab],
          activeKey: tab.id,
        }));
      },
      
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
      
      updateTab: (tabId, updates) => {
        console.log(`🔄 [TabStore] 更新Tab:`, {
          tabId,
          updates: {
            ...updates,
            content: updates.content ? `${updates.content.substring(0, 50)}... (${updates.content.length}字符)` : undefined,
          },
        });
        return set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, ...updates } : tab
          ),
        }));
      },
      
      setActiveKey: (key) => set({ activeKey: key }),
      
      // 数据库和时间范围
      setSelectedDatabase: (database) => set({ selectedDatabase: database }),
      setSelectedTimeRange: (timeRange) => set({ selectedTimeRange: timeRange }),
      
      // 内容更新
      updateTabContent: (tabId, content) => {
        console.log(`📝 [TabStore] 更新Tab内容:`, {
          tabId,
          contentLength: content.length,
          contentPreview: content.substring(0, 50),
        });

        // 🔧 获取当前状态，检查是否真的在更新正确的Tab
        const state = get();
        const targetTab = state.tabs.find(tab => tab.id === tabId);
        if (!targetTab) {
          console.error(`❌ [TabStore] 找不到Tab: ${tabId}`);
          return;
        }

        // 检查内容是否真的改变了
        if (targetTab.content === content) {
          console.log(`📝 [TabStore] 内容未改变，跳过更新`);
          return;
        }

        console.log(`📝 [TabStore] 目标Tab信息:`, {
          id: targetTab.id,
          title: targetTab.title,
          type: targetTab.type,
          oldContentLength: targetTab.content?.length || 0,
          newContentLength: content.length,
        });

        return set((state) => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, content, modified: true }
              : tab
          ),
        }));
      },
      
      // 批量操作
      clearAllTabs: () => set({
        tabs: [],
        activeKey: '',
        selectedDatabase: '',
      }),
      
      restoreFromBackup: (backup) => set(backup),

      // 处理应用关闭时的未保存标签页
      handleAppClose: async () => {
        const state = get();
        const unsavedQueryTabs = getUnsavedQueryTabs(state.tabs);

        if (unsavedQueryTabs.length === 0) {
          return true; // 没有未保存的标签页，可以直接关闭
        }

        // 触发显示未保存标签页对话框的事件
        // 这里使用事件系统来避免在store中直接操作UI
        const event = new CustomEvent('show-unsaved-tabs-dialog', {
          detail: { unsavedTabs: unsavedQueryTabs }
        });
        window.dispatchEvent(event);

        // 等待用户选择
        return new Promise<boolean>((resolve) => {
          const handleUserChoice = (event: CustomEvent) => {
            const { action } = event.detail;

            if (action === 'save') {
              // 用户选择保存，将未保存的标签页标记为已保存
              const updatedTabs = state.tabs.map(tab =>
                unsavedQueryTabs.includes(tab)
                  ? { ...tab, saved: true, modified: false }
                  : tab
              );
              set({ tabs: updatedTabs });
              console.log(`已保存 ${unsavedQueryTabs.length} 个查询标签页`);
              resolve(true);
            } else if (action === 'discard') {
              // 用户选择不保存，这些标签页将不会被持久化
              console.log(`丢弃 ${unsavedQueryTabs.length} 个未保存的查询标签页`);
              resolve(true);
            } else {
              // 用户取消关闭
              resolve(false);
            }

            // 移除事件监听器
            window.removeEventListener('unsaved-tabs-dialog-result', handleUserChoice as EventListener);
          };

          // 监听用户选择结果
          window.addEventListener('unsaved-tabs-dialog-result', handleUserChoice as EventListener);
        });
      },
    }),
    {
      name: 'tab-storage', // 存储键名
      // 只持久化已保存的查询标签页，不保存数据浏览标签页
      partialize: (state) => ({
        tabs: getSavedQueryTabs(state.tabs), // 只保存已保存的查询标签页
        activeKey: state.tabs.find(tab => tab.id === state.activeKey && tab.type === 'query' && tab.saved)
          ? state.activeKey
          : '', // 如果当前活跃tab不是已保存的查询tab，则清空
        selectedDatabase: state.selectedDatabase,
        selectedTimeRange: state.selectedTimeRange,
      }),
      // 版本控制，用于处理存储格式变更
      version: 3, // 增加版本号以支持新的保存逻辑
      // 迁移函数，处理版本升级
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // 从版本0升级到版本1的迁移逻辑
          return {
            ...persistedState,
            selectedTimeRange: undefined,
          };
        }
        if (version === 1) {
          // 从版本1升级到版本2，添加autoLoad属性
          return {
            ...persistedState,
            tabs: (persistedState.tabs || []).map((tab: any) => ({
              ...tab,
              autoLoad: tab.type === 'data-browser' ? false : undefined,
            })),
          };
        }
        if (version === 2) {
          // 从版本2升级到版本3，只保留已保存的查询标签页
          return {
            ...persistedState,
            tabs: (persistedState.tabs || []).filter((tab: any) =>
              tab.type === 'query' && tab.saved
            ),
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
  const store = useTabStore();
  const {
    tabs,
    activeKey,
    addTab,
    removeTab,
    updateTab,
    updateTabContent,
    setActiveKey,
    clearAllTabs,
  } = store;

  // 创建新的查询tab
  const createQueryTab = (database?: string, query?: string, connectionId?: string) => {
    console.log(`🆕 [createQueryTab] 开始创建查询Tab:`, {
      database,
      query: query?.substring(0, 50),
      connectionId,
      currentTabsCount: tabs.length,
    });

    // 生成唯一的 tab ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const tabId = `tab-${timestamp}-${random}`;

    // 计算新的标签页编号
    const queryTabs = tabs.filter(tab => tab.type === 'query');
    const tabNumber = queryTabs.length + 1;

    const content = query || '';
    const hasContent = content.trim().length > 0;

    const newTab: EditorTab = {
      id: tabId,
      title: `查询-${tabNumber}`,
      content,
      type: 'query',
      modified: hasContent, // 只有有内容时才标记为已修改
      saved: !hasContent,   // 空内容视为已保存
      database,
      connectionId, // 设置连接ID
    };

    console.log(`🆕 [createQueryTab] 新Tab信息:`, {
      id: newTab.id,
      title: newTab.title,
      content: newTab.content,
    });

    addTab(newTab);
    setActiveKey(newTab.id); // 自动切换到新创建的标签页

    console.log(`✅ [createQueryTab] Tab创建完成，当前Tab总数: ${tabs.length + 1}`);
    return newTab;
  };

  // 复制标签页
  const duplicateTab = (tabId: string) => {
    const originalTab = tabs.find(tab => tab.id === tabId);
    if (!originalTab) return null;

    const newTab: EditorTab = {
      ...originalTab,
      id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: `${originalTab.title} - 副本`,
      modified: true,
      saved: false,
      filePath: undefined,
      workspacePath: undefined,
    };

    addTab(newTab);
    setActiveKey(newTab.id);
    return newTab;
  };

  // 关闭其他标签页
  const closeOtherTabs = (keepTabId: string) => {
    const tabsToClose = tabs.filter(tab => tab.id !== keepTabId);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        tabsToClose.forEach(tab => removeTab(tab.id));
        setActiveKey(keepTabId);
      }
    };
  };

  // 关闭左侧标签页
  const closeLeftTabs = (targetTabId: string) => {
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);
    if (targetIndex <= 0) return { tabsToClose: [], unsavedTabs: [], execute: () => {} };

    const tabsToClose = tabs.slice(0, targetIndex);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        tabsToClose.forEach(tab => removeTab(tab.id));
      }
    };
  };

  // 关闭右侧标签页
  const closeRightTabs = (targetTabId: string) => {
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);
    if (targetIndex === -1 || targetIndex === tabs.length - 1) {
      return { tabsToClose: [], unsavedTabs: [], execute: () => {} };
    }

    const tabsToClose = tabs.slice(targetIndex + 1);
    const unsavedTabs = tabsToClose.filter(tab => tab.modified);

    return {
      tabsToClose,
      unsavedTabs,
      execute: () => {
        tabsToClose.forEach(tab => removeTab(tab.id));
      }
    };
  };

  // 获取未保存的标签页
  const getUnsavedTabs = () => {
    return tabs.filter(tab => tab.modified);
  };

  // 创建数据浏览tab（如果已存在则切换并刷新）
  const createDataBrowserTab = (connectionId: string, database: string, tableName: string) => {
    console.log(`🆕 [createDataBrowserTab] 开始创建数据浏览Tab:`, {
      connectionId,
      database,
      tableName,
      currentTabsCount: tabs.length,
    });

    // 检查是否已存在该表的tab
    const existingTab = tabs.find(tab =>
      tab.type === 'data-browser' &&
      tab.connectionId === connectionId &&
      tab.database === database &&
      tab.tableName === tableName
    );

    if (existingTab) {
      console.log(`ℹ️ [createDataBrowserTab] Tab已存在，切换并刷新:`, existingTab.id);
      // 如果tab已存在，切换到该tab并触发刷新
      setActiveKey(existingTab.id);
      refreshDataBrowserTab(existingTab.id);
      return existingTab;
    }

    // 如果不存在，创建新tab
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
      isLoading: true, // 🔧 新创建的 tab 默认为 loading 状态
    };

    console.log(`🆕 [createDataBrowserTab] 新Tab信息:`, {
      id: newTab.id,
      title: newTab.title,
      type: newTab.type,
    });

    addTab(newTab);
    setActiveKey(newTab.id); // 自动切换到新创建的数据浏览标签页

    console.log(`✅ [createDataBrowserTab] Tab创建完成，当前Tab总数: ${tabs.length + 1}`);
    return newTab;
  };

  // 🔧 刷新数据浏览tab（设置 loading 状态并触发重新加载）
  const refreshDataBrowserTab = (tabId: string) => {
    updateTab(tabId, { isLoading: true, refreshTrigger: Date.now() });
  };

  // 保存tab内容
  const saveTab = (tabId: string) => {
    updateTab(tabId, { saved: true, modified: false });
  };

  return {
    createQueryTab,
    createDataBrowserTab,
    refreshDataBrowserTab,
    duplicateTab,
    closeOtherTabs,
    closeLeftTabs,
    closeRightTabs,
    getUnsavedTabs,
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
