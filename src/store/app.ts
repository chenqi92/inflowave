import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, Theme, Language } from '@/types';
import { DEFAULT_APP_CONFIG } from '@/config/defaults';

interface AppState {
  // 应用配置
  config: AppConfig;

  // UI 状态
  sidebarCollapsed: boolean;
  loading: boolean;

  // 当前选中的连接
  currentConnectionId: string | null;

  // 操作方法
  setConfig: (config: Partial<AppConfig>) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCurrentConnectionId: (id: string | null) => void;
  resetConfig: () => void;
}

// 默认配置
const defaultConfig: AppConfig = {
  theme: 'system',
  language: 'zh-CN',
  queryTimeout: DEFAULT_APP_CONFIG.queryTimeout,
  maxQueryResults: DEFAULT_APP_CONFIG.maxQueryResults,
  logLevel: DEFAULT_APP_CONFIG.logLevel,
};

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      // 初始状态
      config: defaultConfig,
      sidebarCollapsed: false,
      loading: false,
      currentConnectionId: null,

      // 设置配置
      setConfig: newConfig => {
        set(state => ({
          config: { ...state.config, ...newConfig },
        }));
      },

      // 设置主题 - 已移除，使用 ThemeProvider 统一管理
      setTheme: theme => {
        set(state => ({
          config: { ...state.config, theme },
        }));
        // 主题切换逻辑已移至 ThemeProvider，避免冲突
      },

      // 设置语言
      setLanguage: language => {
        set(state => ({
          config: { ...state.config, language },
        }));
      },

      // 设置侧边栏折叠状态
      setSidebarCollapsed: collapsed => {
        set({ sidebarCollapsed: collapsed });
      },

      // 设置加载状态
      setLoading: loading => {
        set({ loading });
      },

      // 设置当前连接ID
      setCurrentConnectionId: id => {
        set({ currentConnectionId: id });
      },

      // 重置配置
      resetConfig: () => {
        set({ config: defaultConfig });
      },
    }),
    {
      name: 'inflowave-app-store',
      partialize: state => ({
        config: state.config,
        sidebarCollapsed: state.sidebarCollapsed,
        currentConnectionId: state.currentConnectionId,
      }),
    }
  )
);

// 主题监听已移至 ThemeProvider，避免冲突
