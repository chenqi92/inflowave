/**
 * @deprecated 此 hook 已废弃，请使用 `useUserPreferencesStore` 替代
 *
 * 迁移指南：
 *
 * 旧代码：
 * ```typescript
 * import { useUserPreferences } from '@/hooks/useUserPreferences';
 * const { preferences, updateNotifications } = useUserPreferences();
 * ```
 *
 * 新代码：
 * ```typescript
 * import { useUserPreferencesStore } from '@/stores/userPreferencesStore';
 * const { preferences, updateNotifications } = useUserPreferencesStore();
 * ```
 *
 * 优势：
 * - 统一的全局状态管理
 * - 减少后端调用次数（从多次减少到启动时1次）
 * - 同步读取，无延迟
 * - 乐观更新，设置修改立即生效
 * - 自动错误回滚
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { getUserPreferencesError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import logger from '@/utils/logger';

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
  font_family: string;
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
  restore_tabs_on_startup: boolean; // 启动时恢复标签页
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
    position: 'bottomRight',
  },
  accessibility: {
    high_contrast: false,
    font_size: 'medium',
    font_family: 'system',
    reduced_motion: false,
    screen_reader: false,
    keyboard_navigation: true,
  },
  workspace: {
    layout: 'comfortable',
    panel_sizes: {},
    panel_positions: {
      'left-panel': 25, // 左侧面板默认25%宽度
      'bottom-panel': 40, // 底部面板默认40%高度
    },
    open_tabs: [],
    pinned_queries: [],
    recent_files: [],
    restore_tabs_on_startup: true, // 默认启用启动时恢复标签页
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
        // 确保所有字段都有默认值，特别是 layout 字段
        const mergedPreferences: UserPreferences = {
          ...defaultPreferences,
          ...result,
          workspace: {
            ...defaultPreferences.workspace,
            ...result.workspace,
            layout: result.workspace?.layout || defaultPreferences.workspace.layout,
          },
        };
        setPreferences(mergedPreferences);
      } else {
        // 如果没有用户偏好，使用默认值
        setPreferences(defaultPreferences);
      }
    } catch (err) {
      logger.error('加载用户偏好失败:', err);
      const friendlyError = getUserPreferencesError(String(err), 'load');
      setError(formatErrorMessage(friendlyError));
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
        logger.error('更新用户偏好失败:', err);
        const friendlyError = getUserPreferencesError(String(err), 'save');
        setError(formatErrorMessage(friendlyError));
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

  // 更新工作区设置 - 添加防抖机制
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

  // 创建防抖版本的工作区设置更新函数
  const debouncedUpdateWorkspaceSettings = useMemo(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastCallTime = 0;

    return async (workspace: WorkspaceSettings) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallTime;

      // 如果距离上次调用少于3秒，清除之前的定时器并重新设置
      if (timeSinceLastCall < 3000 && timeoutId) {
        clearTimeout(timeoutId);
      }

      return new Promise<boolean>((resolve) => {
        timeoutId = setTimeout(async () => {
          lastCallTime = Date.now();
          const result = await updateWorkspaceSettings(workspace);
          resolve(result);
        }, 500); // 500ms 防抖延迟
      });
    };
  }, [updateWorkspaceSettings]);

  // 重置为默认设置
  const resetToDefaults = useCallback(async () => {
    return updatePreferences(defaultPreferences);
  }, [updatePreferences]);

  // 初始化加载
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 🔧 已移除 userPreferencesUpdated 事件监听，现在使用 userPreferencesStore 统一管理

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
    updateNotificationSettings,
    updateAccessibilitySettings,
    updateWorkspaceSettings,
    debouncedUpdateWorkspaceSettings, // 导出防抖版本
    resetToDefaults,
  };
};

export default useUserPreferences;
