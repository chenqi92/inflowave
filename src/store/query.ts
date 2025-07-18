import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueryResult, QueryRequest, QueryValidationResult } from '@/types';
import { QueryAPI } from '@/services/api';

export interface QueryHistoryItem {
  id: string;
  query: string;
  database: string;
  timestamp: Date;
  duration: number;
  rowCount?: number;
  success: boolean;
  error?: string;
}

export interface QueryTab {
  id: string;
  title: string;
  query: string;
  database?: string;
  result?: QueryResult;
  isRunning: boolean;
  lastModified: Date;
  saved: boolean;
}

interface QueryState {
  // 查询选项卡
  tabs: QueryTab[];
  activeTabId: string | null;

  // 查询历史
  history: QueryHistoryItem[];
  maxHistorySize: number;

  // 当前查询状态
  isExecuting: boolean;
  currentQuery: string;
  queryResult: QueryResult | null;
  queryError: string | null;

  // 验证状态
  validationResult: QueryValidationResult | null;

  // 查询建议
  suggestions: string[];

  // 格式化选项
  autoFormat: boolean;
  showLineNumbers: boolean;
  wordWrap: boolean;

  // 选项卡管理
  createTab: (query?: string, database?: string) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabQuery: (tabId: string, query: string) => void;
  updateTabResult: (tabId: string, result: QueryResult) => void;
  markTabSaved: (tabId: string, saved: boolean) => void;

  // 查询执行
  executeQuery: (request: QueryRequest) => Promise<QueryResult>;
  validateQuery: (query: string) => Promise<QueryValidationResult>;
  formatQuery: (query: string) => Promise<string>;
  getQuerySuggestions: (
    connectionId: string,
    database?: string,
    partialQuery?: string
  ) => Promise<string[]>;

  // 历史管理
  addToHistory: (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  getHistoryItem: (id: string) => QueryHistoryItem | undefined;

  // 设置管理
  setAutoFormat: (enabled: boolean) => void;
  setShowLineNumbers: (enabled: boolean) => void;
  setWordWrap: (enabled: boolean) => void;
  setMaxHistorySize: (size: number) => void;

  // 状态重置
  clearQueryResult: () => void;
  clearQueryError: () => void;
}

export const useQueryStore = create<QueryState>()(
  persist(
    (set, get) => ({
      // 初始状态
      tabs: [],
      activeTabId: null,
      history: [],
      maxHistorySize: 100,
      isExecuting: false,
      currentQuery: '',
      queryResult: null,
      queryError: null,
      validationResult: null,
      suggestions: [],
      autoFormat: true,
      showLineNumbers: true,
      wordWrap: false,

      // 选项卡管理
      createTab: (query = '', database) => {
        const id = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newTab: QueryTab = {
          id,
          title: `查询 ${get().tabs.length + 1}`,
          query,
          database,
          isRunning: false,
          lastModified: new Date(),
          saved: query === '',
        };

        set(state => ({
          tabs: [...state.tabs, newTab],
          activeTabId: id,
        }));

        return id;
      },

      closeTab: tabId => {
        set(state => {
          const newTabs = state.tabs.filter(tab => tab.id !== tabId);
          let newActiveTabId = state.activeTabId;

          // 如果关闭的是当前活跃的选项卡
          if (state.activeTabId === tabId) {
            if (newTabs.length > 0) {
              // 激活最后一个选项卡
              newActiveTabId = newTabs[newTabs.length - 1].id;
            } else {
              newActiveTabId = null;
            }
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
          };
        });
      },

      setActiveTab: tabId => {
        set({ activeTabId: tabId });
      },

      updateTabQuery: (tabId, query) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId
              ? { ...tab, query, saved: false, lastModified: new Date() }
              : tab
          ),
        }));
      },

      updateTabResult: (tabId, result) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, result, isRunning: false } : tab
          ),
        }));
      },

      markTabSaved: (tabId, saved) => {
        set(state => ({
          tabs: state.tabs.map(tab =>
            tab.id === tabId ? { ...tab, saved } : tab
          ),
        }));
      },

      // 查询执行
      executeQuery: async request => {
        set({ isExecuting: true, queryError: null });

        try {
          const result = await QueryAPI.executeQuery(request);

          // 添加到历史
          get().addToHistory({
            query: request.query,
            database: request.database || '',
            duration: result.executionTime || 0,
            rowCount: result.rowCount,
            success: true,
          });

          // 更新当前选项卡结果
          if (get().activeTabId) {
            get().updateTabResult(get().activeTabId!, result);
          }

          set({
            queryResult: result,
            isExecuting: false,
          });

          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // 添加错误到历史
          get().addToHistory({
            query: request.query,
            database: request.database || '',
            duration: 0,
            success: false,
            error: errorMessage,
          });

          set({
            queryError: errorMessage,
            isExecuting: false,
          });

          throw error;
        }
      },

      validateQuery: async query => {
        try {
          const result = await QueryAPI.validateQuery(query);
          set({ validationResult: result });
          return result;
        } catch (error) {
          console.error('查询验证失败:', error);
          throw error;
        }
      },

      formatQuery: async query => {
        try {
          const formatted = await QueryAPI.formatQuery(query);

          // 如果有活跃选项卡，更新其查询内容
          if (get().activeTabId) {
            get().updateTabQuery(get().activeTabId!, formatted);
          }

          return formatted;
        } catch (error) {
          console.error('查询格式化失败:', error);
          throw error;
        }
      },

      getQuerySuggestions: async (connectionId, database, partialQuery) => {
        try {
          const suggestions = await QueryAPI.getQuerySuggestions(
            connectionId,
            database,
            partialQuery
          );
          set({ suggestions });
          return suggestions;
        } catch (error) {
          console.error('获取查询建议失败:', error);
          set({ suggestions: [] });
          return [];
        }
      },

      // 历史管理
      addToHistory: item => {
        const id = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const historyItem: QueryHistoryItem = {
          ...item,
          id,
          timestamp: new Date(),
        };

        set(state => {
          const newHistory = [historyItem, ...state.history];

          // 限制历史记录数量
          if (newHistory.length > state.maxHistorySize) {
            newHistory.splice(state.maxHistorySize);
          }

          return { history: newHistory };
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      removeFromHistory: id => {
        set(state => ({
          history: state.history.filter(item => item.id !== id),
        }));
      },

      getHistoryItem: id => {
        return get().history.find(item => item.id === id);
      },

      // 设置管理
      setAutoFormat: enabled => {
        set({ autoFormat: enabled });
      },

      setShowLineNumbers: enabled => {
        set({ showLineNumbers: enabled });
      },

      setWordWrap: enabled => {
        set({ wordWrap: enabled });
      },

      setMaxHistorySize: size => {
        set({ maxHistorySize: size });
      },

      // 状态重置
      clearQueryResult: () => {
        set({ queryResult: null });
      },

      clearQueryError: () => {
        set({ queryError: null });
      },
    }),
    {
      name: 'query-store',
      partialize: state => ({
        history: state.history,
        maxHistorySize: state.maxHistorySize,
        autoFormat: state.autoFormat,
        showLineNumbers: state.showLineNumbers,
        wordWrap: state.wordWrap,
        tabs: state.tabs.map(tab => ({
          ...tab,
          result: undefined, // 不持久化查询结果
          isRunning: false, // 重置运行状态
        })),
        activeTabId: state.activeTabId,
      }),
    }
  )
);
