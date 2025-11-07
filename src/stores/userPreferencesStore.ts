/**
 * 用户偏好设置全局状态管理
 * 
 * 功能：
 * 1. 应用启动时从后端加载一次用户偏好
 * 2. 提供同步读取接口，无异步开销
 * 3. 支持乐观更新，修改立即生效
 * 4. 后端保存失败时自动回滚
 * 5. 提供细粒度选择器，优化渲染性能
 */

import { create } from 'zustand';
import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface NotificationSettings {
  enabled: boolean;
  query_completion: boolean;
  connection_status: boolean;
  system_alerts: boolean;
  export_completion: boolean;
  sound: boolean;
  desktop: boolean;
  position: string;
}

export interface AccessibilitySettings {
  high_contrast: boolean;
  font_size: string;
  font_family: string;
  reduced_motion: boolean;
  screen_reader: boolean;
  keyboard_navigation: boolean;
}

export interface WorkspaceSettings {
  layout: string;
  panel_sizes: Record<string, number>;
  panel_positions: Record<string, number>;
  open_tabs: string[];
  pinned_queries: string[];
  recent_files: string[];
  restore_tabs_on_startup: boolean;
}

export interface LoggingSettings {
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  enable_file_logging: boolean;
  max_file_size_mb: number;
  max_files: number;
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  category: string;
  enabled: boolean;
}

export interface UserPreferences {
  shortcuts: KeyboardShortcut[];
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  workspace: WorkspaceSettings;
  logging: LoggingSettings;
}

// ============================================================================
// 默认值
// ============================================================================

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  query_completion: true,
  connection_status: true,
  system_alerts: true,
  export_completion: true,
  sound: false,
  desktop: true,
  position: 'bottomRight',
};

export const defaultAccessibilitySettings: AccessibilitySettings = {
  high_contrast: false,
  font_size: 'medium',
  font_family: 'system',
  reduced_motion: false,
  screen_reader: false,
  keyboard_navigation: true,
};

export const defaultWorkspaceSettings: WorkspaceSettings = {
  layout: 'comfortable',
  panel_sizes: {},
  panel_positions: {
    'left-panel': 25,
    'bottom-panel': 40,
  },
  open_tabs: [],
  pinned_queries: [],
  recent_files: [],
  restore_tabs_on_startup: true,
};

export const defaultLoggingSettings: LoggingSettings = {
  level: 'INFO', // 默认 INFO 级别
  enable_file_logging: true, // 默认启用文件日志
  max_file_size_mb: 10, // 默认最大 10MB
  max_files: 5, // 默认保留 5 个日志文件
};

export const defaultUserPreferences: UserPreferences = {
  shortcuts: [],
  notifications: defaultNotificationSettings,
  accessibility: defaultAccessibilitySettings,
  workspace: defaultWorkspaceSettings,
  logging: defaultLoggingSettings,
};

// ============================================================================
// Store 接口
// ============================================================================

interface UserPreferencesState {
  // 数据
  preferences: UserPreferences;
  
  // 加载状态
  loading: boolean;
  error: string | null;
  initialized: boolean; // 标记是否已初始化
  
  // Actions
  loadUserPreferences: () => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateNotifications: (updates: Partial<NotificationSettings>) => Promise<void>;
  updateAccessibility: (updates: Partial<AccessibilitySettings>) => Promise<void>;
  updateWorkspace: (updates: Partial<WorkspaceSettings>) => Promise<void>;
  updateLogging: (updates: Partial<LoggingSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;

  // 内部方法
  _setPreferences: (preferences: UserPreferences) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

// ============================================================================
// Store 实现
// ============================================================================

export const useUserPreferencesStore = create<UserPreferencesState>((set, get) => ({
  // 初始状态
  preferences: defaultUserPreferences,
  loading: false,
  error: null,
  initialized: false,
  
  // ============================================================================
  // 加载用户偏好（应用启动时调用一次）
  // ============================================================================
  loadUserPreferences: async () => {
    const { initialized } = get();
    
    // 避免重复加载
    if (initialized) {
      logger.debug('📦 [UserPreferencesStore] 已初始化，跳过重复加载');
      return;
    }
    
    logger.debug('📦 [UserPreferencesStore] 开始加载用户偏好');
    set({ loading: true, error: null });
    
    try {
      const result = await safeTauriInvoke<UserPreferences>('get_user_preferences');
      
      // 合并默认值，确保所有字段都存在
      const mergedPreferences: UserPreferences = {
        shortcuts: result?.shortcuts || defaultUserPreferences.shortcuts,
        notifications: {
          ...defaultNotificationSettings,
          ...(result?.notifications || {}),
        },
        accessibility: {
          ...defaultAccessibilitySettings,
          ...(result?.accessibility || {}),
        },
        workspace: {
          ...defaultWorkspaceSettings,
          ...(result?.workspace || {}),
        },
        logging: {
          ...defaultLoggingSettings,
          ...(result?.logging || {}),
        },
      };
      
      set({
        preferences: mergedPreferences,
        loading: false,
        initialized: true,
      });
      
      logger.debug('✅ [UserPreferencesStore] 用户偏好加载成功:', mergedPreferences);
    } catch (error) {
      logger.error('❌ [UserPreferencesStore] 加载用户偏好失败:', error);
      
      // 加载失败时使用默认值
      set({
        preferences: defaultUserPreferences,
        loading: false,
        error: String(error),
        initialized: true, // 即使失败也标记为已初始化，避免重复尝试
      });
    }
  },
  
  // ============================================================================
  // 更新完整偏好设置
  // ============================================================================
  updatePreferences: async (updates: Partial<UserPreferences>) => {
    const { preferences } = get();
    
    // 保存旧状态（用于回滚）
    const oldPreferences = preferences;
    
    // 乐观更新：立即更新 store
    const newPreferences = {
      ...preferences,
      ...updates,
    };
    
    set({ preferences: newPreferences });
    logger.info('🔄 [UserPreferencesStore] 乐观更新偏好设置:', updates);
    
    // 后台同步后端
    try {
      await safeTauriInvoke('update_user_preferences', {
        preferences: newPreferences,
      });
      logger.debug('✅ [UserPreferencesStore] 偏好设置已同步到后端');
    } catch (error) {
      logger.error('❌ [UserPreferencesStore] 同步后端失败，回滚:', error);
      
      // 回滚到旧状态
      set({
        preferences: oldPreferences,
        error: String(error),
      });
      
      throw error; // 抛出错误，让调用者处理
    }
  },
  
  // ============================================================================
  // 更新通知设置
  // ============================================================================
  updateNotifications: async (updates: Partial<NotificationSettings>) => {
    const { preferences, updatePreferences } = get();
    
    const newNotifications = {
      ...preferences.notifications,
      ...updates,
    };
    
    await updatePreferences({
      notifications: newNotifications,
    });
  },
  
  // ============================================================================
  // 更新无障碍设置
  // ============================================================================
  updateAccessibility: async (updates: Partial<AccessibilitySettings>) => {
    const { preferences, updatePreferences } = get();
    
    const newAccessibility = {
      ...preferences.accessibility,
      ...updates,
    };
    
    await updatePreferences({
      accessibility: newAccessibility,
    });
  },
  
  // ============================================================================
  // 更新工作区设置
  // ============================================================================
  updateWorkspace: async (updates: Partial<WorkspaceSettings>) => {
    const { preferences, updatePreferences } = get();

    const newWorkspace = {
      ...preferences.workspace,
      ...updates,
    };

    await updatePreferences({
      workspace: newWorkspace,
    });
  },

  // ============================================================================
  // 更新日志设置
  // ============================================================================
  updateLogging: async (updates: Partial<LoggingSettings>) => {
    const { preferences, updatePreferences } = get();

    const newLogging = {
      ...preferences.logging,
      ...updates,
    };

    await updatePreferences({
      logging: newLogging,
    });
  },

  // ============================================================================
  // 重置为默认值
  // ============================================================================
  resetToDefaults: async () => {
    logger.info('🔄 [UserPreferencesStore] 重置为默认值');
    
    set({ preferences: defaultUserPreferences });
    
    try {
      await safeTauriInvoke('update_user_preferences', {
        preferences: defaultUserPreferences,
      });
      logger.debug('✅ [UserPreferencesStore] 已重置为默认值');
    } catch (error) {
      logger.error('❌ [UserPreferencesStore] 重置失败:', error);
      set({ error: String(error) });
      throw error;
    }
  },
  
  // ============================================================================
  // 内部方法（供测试或特殊场景使用）
  // ============================================================================
  _setPreferences: (preferences: UserPreferences) => {
    set({ preferences });
  },
  
  _setLoading: (loading: boolean) => {
    set({ loading });
  },
  
  _setError: (error: string | null) => {
    set({ error });
  },
}));

// ============================================================================
// 便捷选择器（细粒度，优化渲染性能）
// ============================================================================

/**
 * 获取通知设置（同步）
 */
export const getNotificationSettings = (): NotificationSettings => {
  return useUserPreferencesStore.getState().preferences.notifications;
};

/**
 * 获取无障碍设置（同步）
 */
export const getAccessibilitySettings = (): AccessibilitySettings => {
  return useUserPreferencesStore.getState().preferences.accessibility;
};

/**
 * 获取工作区设置（同步）
 */
export const getWorkspaceSettings = (): WorkspaceSettings => {
  return useUserPreferencesStore.getState().preferences.workspace;
};

/**
 * 检查通知是否启用（同步）
 */
export const isNotificationEnabled = (): boolean => {
  return useUserPreferencesStore.getState().preferences.notifications.enabled;
};

/**
 * 检查特定类型的通知是否启用（同步）
 */
export const isNotificationTypeEnabled = (
  type: 'query_completion' | 'connection_status' | 'system_alerts' | 'export_completion'
): boolean => {
  const notifications = useUserPreferencesStore.getState().preferences.notifications;
  return notifications.enabled && notifications[type];
};

