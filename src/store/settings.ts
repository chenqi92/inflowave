import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SettingsAPI } from '@/services/api';

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  borderRadius: number;
  compact: boolean;
}

export interface EditorConfig {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  showMinimap: boolean;
  theme: 'vs-light' | 'vs-dark' | 'hc-black';
  autoComplete: boolean;
  autoFormat: boolean;
}

export interface QueryConfig {
  maxHistorySize: number;
  autoSaveInterval: number; // seconds
  defaultLimit: number;
  timeout: number; // seconds
  formatOnExecute: boolean;
  confirmBeforeExecute: boolean;
}

export interface ChartConfig {
  defaultChartType: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  animationEnabled: boolean;
  animationDuration: number;
  showDataLabels: boolean;
  showLegend: boolean;
  gridEnabled: boolean;
  tooltipEnabled: boolean;
  refreshInterval: number; // seconds, 0 = disabled
}

export interface SecurityConfig {
  encryptPasswords: boolean;
  autoLockTimeout: number; // minutes, 0 = disabled
  requirePasswordConfirmation: boolean;
  rememberConnections: boolean;
  maxFailedAttempts: number;
}

export interface PerformanceConfig {
  connectionPoolSize: number;
  queryTimeout: number; // seconds
  enableQueryCache: boolean;
  cacheSize: number; // MB
  maxConcurrentQueries: number;
  enablePagination: boolean;
  defaultPageSize: number;
}

export interface NotificationConfig {
  enableDesktopNotifications: boolean;
  enableSoundNotifications: boolean;
  notifyOnQueryComplete: boolean;
  notifyOnConnectionLost: boolean;
  notifyOnError: boolean;
  soundVolume: number; // 0-100
}

export interface UserSettings {
  theme: ThemeConfig;
  editor: EditorConfig;
  query: QueryConfig;
  chart: ChartConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  notification: NotificationConfig;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
}

interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;

  // 设置操作
  updateSettings: (updates: Partial<UserSettings>) => void;
  updateTheme: (theme: Partial<ThemeConfig>) => void;
  updateEditor: (editor: Partial<EditorConfig>) => void;
  updateQuery: (query: Partial<QueryConfig>) => void;
  updateChart: (chart: Partial<ChartConfig>) => void;
  updateSecurity: (security: Partial<SecurityConfig>) => void;
  updatePerformance: (performance: Partial<PerformanceConfig>) => void;
  updateNotification: (notification: Partial<NotificationConfig>) => void;

  // 文件操作
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  exportSettings: (filePath: string) => Promise<void>;
  importSettings: (filePath: string) => Promise<void>;

  // 快速设置
  setDarkMode: (enabled: boolean) => void;
  setCompactMode: (enabled: boolean) => void;
  setLanguage: (language: string) => void;

  // 状态管理
  markSaved: () => void;
  markUnsaved: () => void;
  clearUnsavedChanges: () => void;
}

// 默认设置
const defaultSettings: UserSettings = {
  theme: {
    mode: 'auto',
    primaryColor: '#1890ff',
    borderRadius: 6,
    compact: false,
  },
  editor: {
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    lineHeight: 1.5,
    tabSize: 2,
    wordWrap: false,
    showLineNumbers: true,
    showMinimap: true,
    theme: 'vs-light',
    autoComplete: true,
    autoFormat: true,
  },
  query: {
    maxHistorySize: 100,
    autoSaveInterval: 30,
    defaultLimit: 1000,
    timeout: 60,
    formatOnExecute: false,
    confirmBeforeExecute: false,
  },
  chart: {
    defaultChartType: 'line',
    animationEnabled: true,
    animationDuration: 1000,
    showDataLabels: false,
    showLegend: true,
    gridEnabled: true,
    tooltipEnabled: true,
    refreshInterval: 0,
  },
  security: {
    encryptPasswords: true,
    autoLockTimeout: 0,
    requirePasswordConfirmation: true,
    rememberConnections: true,
    maxFailedAttempts: 3,
  },
  performance: {
    connectionPoolSize: 10,
    queryTimeout: 30,
    enableQueryCache: true,
    cacheSize: 100,
    maxConcurrentQueries: 5,
    enablePagination: true,
    defaultPageSize: 1000,
  },
  notification: {
    enableDesktopNotifications: true,
    enableSoundNotifications: false,
    notifyOnQueryComplete: true,
    notifyOnConnectionLost: true,
    notifyOnError: true,
    soundVolume: 50,
  },
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm:ss',
  numberFormat: '0,0.00',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,
      lastSaved: null,
      hasUnsavedChanges: false,

      // 设置操作
      updateSettings: updates => {
        set(state => ({
          settings: { ...state.settings, ...updates },
          hasUnsavedChanges: true,
        }));
      },

      updateTheme: theme => {
        set(state => ({
          settings: {
            ...state.settings,
            theme: { ...state.settings.theme, ...theme },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateEditor: editor => {
        set(state => ({
          settings: {
            ...state.settings,
            editor: { ...state.settings.editor, ...editor },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateQuery: query => {
        set(state => ({
          settings: {
            ...state.settings,
            query: { ...state.settings.query, ...query },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateChart: chart => {
        set(state => ({
          settings: {
            ...state.settings,
            chart: { ...state.settings.chart, ...chart },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateSecurity: security => {
        set(state => ({
          settings: {
            ...state.settings,
            security: { ...state.settings.security, ...security },
          },
          hasUnsavedChanges: true,
        }));
      },

      updatePerformance: performance => {
        set(state => ({
          settings: {
            ...state.settings,
            performance: { ...state.settings.performance, ...performance },
          },
          hasUnsavedChanges: true,
        }));
      },

      updateNotification: notification => {
        set(state => ({
          settings: {
            ...state.settings,
            notification: { ...state.settings.notification, ...notification },
          },
          hasUnsavedChanges: true,
        }));
      },

      // 文件操作
      saveSettings: async () => {
        set({ isLoading: true });

        try {
          await SettingsAPI.saveUserSettings(get().settings);
          set({
            lastSaved: new Date(),
            hasUnsavedChanges: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loadSettings: async () => {
        set({ isLoading: true });

        try {
          const settings = await SettingsAPI.getUserSettings();
          set({
            settings: { ...defaultSettings, ...settings },
            isLoading: false,
            hasUnsavedChanges: false,
          });
        } catch (error) {
          set({ isLoading: false });
          console.warn('加载用户设置失败，使用默认设置:', error);
        }
      },

      resetSettings: async () => {
        try {
          await SettingsAPI.resetSettings();
          set({
            settings: defaultSettings,
            hasUnsavedChanges: false,
            lastSaved: new Date(),
          });
        } catch (error) {
          throw error;
        }
      },

      exportSettings: async filePath => {
        try {
          await SettingsAPI.exportSettings(filePath);
        } catch (error) {
          throw error;
        }
      },

      importSettings: async filePath => {
        try {
          await SettingsAPI.importSettings(filePath);
          // 重新加载设置
          await get().loadSettings();
        } catch (error) {
          throw error;
        }
      },

      // 快速设置
      setDarkMode: enabled => {
        get().updateTheme({ mode: enabled ? 'dark' : 'light' });
      },

      setCompactMode: enabled => {
        get().updateTheme({ compact: enabled });
      },

      setLanguage: language => {
        get().updateSettings({ language });
      },

      // 状态管理
      markSaved: () => {
        set({
          lastSaved: new Date(),
          hasUnsavedChanges: false,
        });
      },

      markUnsaved: () => {
        set({ hasUnsavedChanges: true });
      },

      clearUnsavedChanges: () => {
        set({ hasUnsavedChanges: false });
      },
    }),
    {
      name: 'settings-store',
      partialize: state => ({
        settings: state.settings,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
