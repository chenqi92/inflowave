import { useState, useEffect, useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import logger from '@/utils/logger';

/**
 * 控制器设置接口
 */
export interface ControllerSettings {
  allow_delete_statements: boolean;
  allow_drop_statements: boolean;
  allow_dangerous_operations: boolean;
  require_confirmation_for_delete: boolean;
  require_confirmation_for_drop: boolean;
}

/**
 * 查询设置接口
 */
export interface QuerySettings {
  timeout: number;
  max_results: number;
  auto_complete: boolean;
  syntax_highlight: boolean;
  format_on_save: boolean;
  enable_lazy_loading: boolean;
  lazy_loading_batch_size: number;
}

/**
 * 组合设置接口
 */
export interface CombinedSettings {
  controller: ControllerSettings;
  query: QuerySettings;
}

/**
 * 设置变更事件类型
 */
type SettingsChangeListener = (settings: CombinedSettings) => void;

/**
 * 事件发射器 - 用于跨组件同步设置
 */
class SettingsEventEmitter {
  private listeners: Set<SettingsChangeListener> = new Set();

  subscribe(listener: SettingsChangeListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(settings: CombinedSettings) {
    this.listeners.forEach(listener => listener(settings));
  }
}

// 全局事件发射器实例
const settingsEmitter = new SettingsEventEmitter();

/**
 * 默认设置
 */
const defaultSettings: CombinedSettings = {
  controller: {
    allow_delete_statements: false,
    allow_drop_statements: false,
    allow_dangerous_operations: false,
    require_confirmation_for_delete: true,
    require_confirmation_for_drop: true,
  },
  query: {
    timeout: 30000,
    max_results: 10000,
    auto_complete: true,
    syntax_highlight: true,
    format_on_save: false,
    enable_lazy_loading: true,
    lazy_loading_batch_size: 500,
  },
};

/**
 * 查询和控制器设置管理 Hook
 * 
 * 提供统一的设置管理接口，支持跨组件实时同步
 * 
 * @returns 设置状态和操作方法
 */
export function useQueryControllerSettings() {
  const [settings, setSettings] = useState<CombinedSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  /**
   * 从后端加载设置
   */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [controllerSettings, querySettings] = await Promise.all([
        safeTauriInvoke<ControllerSettings>('get_controller_settings'),
        safeTauriInvoke<QuerySettings>('get_query_settings'),
      ]);

      const newSettings: CombinedSettings = {
        controller: controllerSettings,
        query: querySettings,
      };

      setSettings(newSettings);
      setInitialized(true);
      
      // 发射事件通知其他组件
      settingsEmitter.emit(newSettings);
    } catch (error) {
      logger.error('加载设置失败:', error);
      showMessage.error('加载设置失败');
      // 使用默认值
      setSettings(defaultSettings);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新控制器设置
   */
  const updateControllerSettings = useCallback(
    async (updates: Partial<ControllerSettings>) => {
      const newControllerSettings = {
        ...settings.controller,
        ...updates,
      };

      // 乐观更新
      const newSettings: CombinedSettings = {
        ...settings,
        controller: newControllerSettings,
      };
      setSettings(newSettings);

      // 发射事件通知其他组件
      settingsEmitter.emit(newSettings);

      try {
        await safeTauriInvoke('update_controller_settings', {
          controllerSettings: newControllerSettings,
        });
      } catch (error) {
        logger.error('更新控制器设置失败:', error);
        showMessage.error('更新设置失败');
        // 回滚
        setSettings(settings);
        settingsEmitter.emit(settings);
        throw error;
      }
    },
    [settings]
  );

  /**
   * 更新查询设置
   */
  const updateQuerySettings = useCallback(
    async (updates: Partial<QuerySettings>) => {
      const newQuerySettings = {
        ...settings.query,
        ...updates,
      };

      // 乐观更新
      const newSettings: CombinedSettings = {
        ...settings,
        query: newQuerySettings,
      };
      setSettings(newSettings);

      // 发射事件通知其他组件
      settingsEmitter.emit(newSettings);

      try {
        await safeTauriInvoke('update_query_settings', {
          querySettings: newQuerySettings,
        });
      } catch (error) {
        logger.error('更新查询设置失败:', error);
        showMessage.error('更新设置失败');
        // 回滚
        setSettings(settings);
        settingsEmitter.emit(settings);
        throw error;
      }
    },
    [settings]
  );

  /**
   * 批量更新设置
   */
  const updateSettings = useCallback(
    async (updates: {
      controller?: Partial<ControllerSettings>;
      query?: Partial<QuerySettings>;
    }) => {
      const newSettings: CombinedSettings = {
        controller: updates.controller
          ? { ...settings.controller, ...updates.controller }
          : settings.controller,
        query: updates.query
          ? { ...settings.query, ...updates.query }
          : settings.query,
      };

      // 乐观更新
      setSettings(newSettings);
      settingsEmitter.emit(newSettings);

      try {
        const promises: Promise<any>[] = [];
        
        if (updates.controller) {
          promises.push(
            safeTauriInvoke('update_controller_settings', {
              controllerSettings: newSettings.controller,
            })
          );
        }
        
        if (updates.query) {
          promises.push(
            safeTauriInvoke('update_query_settings', {
              querySettings: newSettings.query,
            })
          );
        }

        await Promise.all(promises);
      } catch (error) {
        logger.error('批量更新设置失败:', error);
        showMessage.error('更新设置失败');
        // 回滚
        setSettings(settings);
        settingsEmitter.emit(settings);
        throw error;
      }
    },
    [settings]
  );

  /**
   * 重置为默认设置
   */
  const resetSettings = useCallback(async () => {
    setSettings(defaultSettings);
    settingsEmitter.emit(defaultSettings);

    try {
      await Promise.all([
        safeTauriInvoke('update_controller_settings', {
          controllerSettings: defaultSettings.controller,
        }),
        safeTauriInvoke('update_query_settings', {
          querySettings: defaultSettings.query,
        }),
      ]);
      showMessage.success('设置已重置为默认值');
    } catch (error) {
      logger.error('重置设置失败:', error);
      showMessage.error('重置设置失败');
      throw error;
    }
  }, []);

  // 初始化时加载设置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 订阅设置变更事件
  useEffect(() => {
    const unsubscribe = settingsEmitter.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  return {
    settings,
    loading,
    initialized,
    loadSettings,
    updateControllerSettings,
    updateQuerySettings,
    updateSettings,
    resetSettings,
  };
}

