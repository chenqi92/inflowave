import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig } from '@/types';

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
  theme: 'auto',
  language: 'zh-CN',
  queryTimeout: 30000,
  maxQueryResults: 10000,
  autoSave: true,
  autoConnect: false,
  logLevel: 'info',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      config: defaultConfig,
      sidebarCollapsed: false,
      loading: false,
      currentConnectionId: null,
      
      // 设置配置
      setConfig: (newConfig) => {
        set((state) => ({
          config: { ...state.config, ...newConfig },
        }));
      },
      
      // 设置主题
      setTheme: (theme) => {
        set((state) => ({
          config: { ...state.config, theme },
        }));
        
        // 更新 HTML 类名以支持 CSS 主题切换
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // auto 模式，根据系统偏好设置
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },
      
      // 设置语言
      setLanguage: (language) => {
        set((state) => ({
          config: { ...state.config, language },
        }));
      },
      
      // 设置侧边栏折叠状态
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },
      
      // 设置加载状态
      setLoading: (loading) => {
        set({ loading });
      },
      
      // 设置当前连接ID
      setCurrentConnectionId: (id) => {
        set({ currentConnectionId: id });
      },
      
      // 重置配置
      resetConfig: () => {
        set({ config: defaultConfig });
      },
    }),
    {
      name: 'influx-gui-app-store',
      partialize: (state) => ({
        config: state.config,
        sidebarCollapsed: state.sidebarCollapsed,
        currentConnectionId: state.currentConnectionId,
      }),
    }
  )
);

// 监听系统主题变化
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleThemeChange = () => {
    const { config, setTheme } = useAppStore.getState();
    if (config.theme === 'auto') {
      setTheme('auto'); // 触发主题更新
    }
  };
  
  mediaQuery.addEventListener('change', handleThemeChange);
  
  // 初始化主题
  const { config, setTheme } = useAppStore.getState();
  setTheme(config.theme);
}
