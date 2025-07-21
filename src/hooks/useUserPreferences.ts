import { useState, useEffect, useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';

// 用户偏好设置类型定义
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
  reduced_motion: boolean;
  screen_reader: boolean;
  keyboard_navigation: boolean;
}

export interface WorkspaceSettings {
  layout: string;
  panel_sizes: Record<string, number>;
  panel_positions: Record<string, number>; // 新增：存储分栏位置和尺寸
  open_tabs: string[];
  pinned_queries: string[];
  recent_files: string[];
}

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  action: string;
  category: string;
  enabled: boolean;
}

export interface UserPreferences {
  shortcuts: KeyboardShortcut[];
  notifications: NotificationSettings;
  accessibility: AccessibilitySettings;
  workspace: WorkspaceSettings;
}

// 默认用户偏好设置
const defaultPreferences: UserPreferences = {
  shortcuts: [],
  notifications: {
    enabled: true,
    query_completion: true,
    connection_status: true,
    system_alerts: true,
    export_completion: true,
    sound: false,
    desktop: true,
    position: 'topRight',
  },
  accessibility: {
    high_contrast: false,
    font_size: 'medium',
    reduced_motion: false,
    screen_reader: false,
    keyboard_navigation: true,
  },
  workspace: {
    layout: 'default',
    panel_sizes: {},
    panel_positions: {
      'left-panel': 25, // 左侧面板默认25%宽度
      'bottom-panel': 40, // 底部面板默认40%高度
    },
    open_tabs: [],
    pinned_queries: [],
    recent_files: [],
  },
};

/**
 * 用户偏好设置 Hook
 */
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载用户偏好设置
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeTauriInvoke<UserPreferences>(
        'get_user_preferences'
      );
      if (result) {
        setPreferences(result);
      } else {
        // 如果没有用户偏好，使用默认值
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      console.error('加载用户偏好失败:', err);
      setError(String(err));
      // 即使加载失败，也使用默认偏好
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新用户偏好设置
  const updatePreferences = useCallback(
    async (newPreferences: UserPreferences) => {
      try {
        await safeTauriInvoke('update_user_preferences', {
          preferences: newPreferences,
        });
        setPreferences(newPreferences);
        return true;
      } catch (err) {
        console.error('更新用户偏好失败:', err);
        setError(String(err));
        return false;
      }
    },
    []
  );

  // 更新通知设置
  const updateNotificationSettings = useCallback(
    async (notifications: NotificationSettings) => {
      if (!preferences) return false;

      const newPreferences = {
        ...preferences,
        notifications,
      };

      return updatePreferences(newPreferences);
    },
    [preferences, updatePreferences]
  );

  // 更新无障碍设置
  const updateAccessibilitySettings = useCallback(
    async (accessibility: AccessibilitySettings) => {
      if (!preferences) return false;

      const newPreferences = {
        ...preferences,
        accessibility,
      };

      return updatePreferences(newPreferences);
    },
    [preferences, updatePreferences]
  );

  // 更新工作区设置
  const updateWorkspaceSettings = useCallback(
    async (workspace: WorkspaceSettings) => {
      if (!preferences) return false;

      const newPreferences = {
        ...preferences,
        workspace,
      };

      return updatePreferences(newPreferences);
    },
    [preferences, updatePreferences]
  );

  // 重置为默认设置
  const resetToDefaults = useCallback(async () => {
    return updatePreferences(defaultPreferences);
  }, [updatePreferences]);

  // 初始化加载
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 监听用户偏好设置更新事件
  useEffect(() => {
    const handlePreferencesUpdate = (event: CustomEvent) => {
      console.log('收到用户偏好设置更新事件:', event.detail);
      setPreferences(event.detail);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('userPreferencesUpdated', handlePreferencesUpdate as EventListener);

      return () => {
        window.removeEventListener('userPreferencesUpdated', handlePreferencesUpdate as EventListener);
      };
    }
  }, []);

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
    updateNotificationSettings,
    updateAccessibilitySettings,
    updateWorkspaceSettings,
    resetToDefaults,
  };
};

export default useUserPreferences;
