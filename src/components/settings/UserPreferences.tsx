import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Switch,
  Badge,
} from '@/components/ui';
import CustomFontSelector from './CustomFontSelector';
import CustomFontImport from './CustomFontImport';
import { showMessage } from '@/utils/message';
import {
  Settings,
  Edit,
  Bell,
  Layout,
  Keyboard,
  Eye,
  RefreshCw,
  User,
} from 'lucide-react';
import type { KeyboardShortcut } from '@/types';
import { useUserPreferencesStore, type UserPreferences } from '@/stores/userPreferencesStore';
import { useSettingsTranslation } from '@/hooks/useTranslation';
import i18n from 'i18next';
import logger from '@/utils/logger';

// 获取所有系统快捷键的函数
// 创建快捷键工厂函数，接受翻译函数作为参数
const createSystemShortcuts = (t: (key: string) => string): KeyboardShortcut[] => {
  return [
    // 导航快捷键
    {
      id: 'nav_dashboard',
      name: t('shortcut_nav_dashboard'),
      description: t('shortcut_nav_dashboard_desc'),
      keys: ['Ctrl', '1'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_connections',
      name: t('shortcut_nav_connections'),
      description: t('shortcut_nav_connections_desc'),
      keys: ['Ctrl', '2'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_query',
      name: t('shortcut_nav_query'),
      description: t('shortcut_nav_query_desc'),
      keys: ['Ctrl', '3'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_database',
      name: t('shortcut_nav_database'),
      description: t('shortcut_nav_database_desc'),
      keys: ['Ctrl', '4'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_visualization',
      name: t('shortcut_nav_visualization'),
      description: t('shortcut_nav_visualization_desc'),
      keys: ['Ctrl', '5'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_performance',
      name: t('shortcut_nav_performance'),
      description: t('shortcut_nav_performance_desc'),
      keys: ['Ctrl', '6'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },
    {
      id: 'nav_settings',
      name: t('shortcut_nav_settings'),
      description: t('shortcut_nav_settings_desc'),
      keys: ['Ctrl', '7'],
      category: t('shortcut_category_navigation'),
      enabled: true,
    },

    // 文件操作快捷键
    {
      id: 'file_new_query',
      name: t('shortcut_file_new_query'),
      description: t('shortcut_file_new_query_desc'),
      keys: ['Ctrl', 'N'],
      category: t('shortcut_category_file'),
      enabled: true,
    },
    {
      id: 'file_new_connection',
      name: t('shortcut_file_new_connection'),
      description: t('shortcut_file_new_connection_desc'),
      keys: ['Ctrl', 'Shift', 'N'],
      category: t('shortcut_category_file'),
      enabled: true,
    },
    {
      id: 'file_save_query',
      name: t('shortcut_file_save_query'),
      description: t('shortcut_file_save_query_desc'),
      keys: ['Ctrl', 'S'],
      category: t('shortcut_category_file'),
      enabled: true,
    },
    {
      id: 'file_open_query',
      name: t('shortcut_file_open_query'),
      description: t('shortcut_file_open_query_desc'),
      keys: ['Ctrl', 'O'],
      category: t('shortcut_category_file'),
      enabled: true,
    },

    // 查询操作快捷键
    {
      id: 'query_execute',
      name: t('shortcut_query_execute'),
      description: t('shortcut_query_execute_desc'),
      keys: ['Ctrl', 'Enter'],
      category: t('shortcut_category_query'),
      enabled: true,
    },
    {
      id: 'query_stop',
      name: t('shortcut_query_stop'),
      description: t('shortcut_query_stop_desc'),
      keys: ['Ctrl', 'Shift', 'C'],
      category: t('shortcut_category_query'),
      enabled: true,
    },
    {
      id: 'query_format',
      name: t('shortcut_query_format'),
      description: t('shortcut_query_format_desc'),
      keys: ['Ctrl', 'L'],
      category: t('shortcut_category_query'),
      enabled: true,
    },

    // 编辑操作快捷键
    {
      id: 'edit_copy_line',
      name: t('shortcut_edit_copy_line'),
      description: t('shortcut_edit_copy_line_desc'),
      keys: ['Ctrl', 'D'],
      category: t('shortcut_category_edit'),
      enabled: true,
    },
    {
      id: 'edit_toggle_comment',
      name: t('shortcut_edit_toggle_comment'),
      description: t('shortcut_edit_toggle_comment_desc'),
      keys: ['Ctrl', '/'],
      category: t('shortcut_category_edit'),
      enabled: true,
    },

    // 搜索快捷键
    {
      id: 'search_global',
      name: t('shortcut_search_global'),
      description: t('shortcut_search_global_desc'),
      keys: ['Ctrl', 'Shift', 'P'],
      category: t('shortcut_category_search'),
      enabled: true,
    },

    // 工具快捷键
    {
      id: 'tools_shortcuts',
      name: t('shortcut_tools_shortcuts'),
      description: t('shortcut_tools_shortcuts_desc'),
      keys: ['Ctrl', 'K'],
      category: t('shortcut_category_tools'),
      enabled: true,
    },
    {
      id: 'tools_dev_tools',
      name: t('shortcut_tools_dev_tools'),
      description: t('shortcut_tools_dev_tools_desc'),
      keys: ['F12'],
      category: t('shortcut_category_tools'),
      enabled: true,
    },

    // 界面操作快捷键
    {
      id: 'layout_toggle_sidebar',
      name: t('shortcut_layout_toggle_sidebar'),
      description: t('shortcut_layout_toggle_sidebar_desc'),
      keys: ['Ctrl', 'B'],
      category: t('shortcut_category_layout'),
      enabled: true,
    },
    {
      id: 'layout_refresh',
      name: t('shortcut_layout_refresh'),
      description: t('shortcut_layout_refresh_desc'),
      keys: ['F5'],
      category: t('shortcut_category_layout'),
      enabled: true,
    },

    // 视图操作快捷键
    {
      id: 'view_zoom_in',
      name: t('shortcut_view_zoom_in'),
      description: t('shortcut_view_zoom_in_desc'),
      keys: ['Ctrl', '+'],
      category: t('shortcut_category_view'),
      enabled: true,
    },
    {
      id: 'view_zoom_out',
      name: t('shortcut_view_zoom_out'),
      description: t('shortcut_view_zoom_out_desc'),
      keys: ['Ctrl', '-'],
      category: t('shortcut_category_view'),
      enabled: true,
    },
    {
      id: 'view_reset_zoom',
      name: t('shortcut_view_reset_zoom'),
      description: t('shortcut_view_reset_zoom_desc'),
      keys: ['Ctrl', '0'],
      category: t('shortcut_category_view'),
      enabled: true,
    },

    // 数据库操作快捷键
    {
      id: 'db_refresh',
      name: t('shortcut_db_refresh'),
      description: t('shortcut_db_refresh_desc'),
      keys: ['F5'],
      category: t('shortcut_category_database'),
      enabled: true,
    },
    {
      id: 'db_delete',
      name: t('shortcut_db_delete'),
      description: t('shortcut_db_delete_desc'),
      keys: ['Delete'],
      category: t('shortcut_category_database'),
      enabled: true,
    },
    {
      id: 'db_rename',
      name: t('shortcut_db_rename'),
      description: t('shortcut_db_rename_desc'),
      keys: ['F2'],
      category: t('shortcut_category_database'),
      enabled: true,
    },
    {
      id: 'db_new_table',
      name: t('shortcut_db_new_table'),
      description: t('shortcut_db_new_table_desc'),
      keys: ['Ctrl', 'T'],
      category: t('shortcut_category_database'),
      enabled: true,
    },
  ];
};

interface UserPreferencesComponentProps {
  onSave?: (preferences: UserPreferences) => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesComponentProps> = ({
  onSave,
}) => {
  const { t } = useSettingsTranslation();

  // 🔧 使用 userPreferencesStore 替代本地状态
  const {
    preferences: storePreferences,
    loading: storeLoading,
    updatePreferences
  } = useUserPreferencesStore();

  const [loading, setLoading] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(
    null
  );
  const [editingKeys, setEditingKeys] = useState<string[]>([]);

  const [fontSaveTimeout, setFontSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<UserPreferences>({
    defaultValues: {
      shortcuts: createSystemShortcuts(t),
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
        font_family: 'system',
        reduced_motion: false,
        screen_reader: false,
        keyboard_navigation: true,
      },
      workspace: {
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
      },
    },
  });

  // 根据快捷键 ID 更新翻译文本
  const updateShortcutTranslations = useCallback((shortcuts: KeyboardShortcut[]): KeyboardShortcut[] => {
    // ID 前缀到分类名称的映射
    const categoryMapping: Record<string, string> = {
      'nav': 'navigation',
      'file': 'file',
      'query': 'query',
      'edit': 'edit',
      'search': 'search',
      'tools': 'tools',
      'layout': 'layout',
      'view': 'view',
      'db': 'database',
      'window': 'window',
      'general': 'general',
      'developer': 'developer',
    };

    return shortcuts.map(shortcut => {
      // 根据 ID 获取对应的翻译键
      const idParts = shortcut.id.split('_');
      const categoryPrefix = idParts[0]; // nav, file, edit, db, etc.
      const action = idParts.slice(1).join('_'); // dashboard, new_query, etc.

      // 获取完整的分类名称
      const fullCategoryName = categoryMapping[categoryPrefix] || categoryPrefix;

      // 构建翻译键
      const nameKey = `shortcut_${categoryPrefix}_${action}`;
      const descKey = `shortcut_${categoryPrefix}_${action}_desc`;
      const categoryKey = `shortcut_category_${fullCategoryName}`;

      // 尝试获取翻译，如果不存在则保留原值
      const translatedName = t(nameKey);
      const translatedDesc = t(descKey);
      const translatedCategory = t(categoryKey);

      return {
        ...shortcut,
        name: translatedName !== nameKey ? translatedName : shortcut.name,
        description: translatedDesc !== descKey ? translatedDesc : shortcut.description,
        category: translatedCategory !== categoryKey ? translatedCategory : shortcut.category,
      };
    });
  }, [t]);

  // 🔧 加载用户偏好（从 store 读取）
  const loadPreferences = useCallback(() => {
    logger.debug('从 store 加载用户偏好');

    if (storePreferences) {
      // 确保快捷键数据完整，并更新翻译
      let shortcuts = storePreferences.shortcuts && storePreferences.shortcuts.length > 0
        ? storePreferences.shortcuts
        : createSystemShortcuts(t);

      // 更新快捷键的翻译文本
      shortcuts = updateShortcutTranslations(shortcuts);

      const preferences = {
        ...storePreferences,
        shortcuts,
      };

      logger.info('从 store 加载的偏好数据:', preferences);
      form.reset(preferences);

      // 确保布局字段被正确设置
      setTimeout(() => {
        form.setValue('workspace.layout', preferences.workspace?.layout || 'comfortable');
        logger.info('form.reset完成，当前表单值:', form.getValues());
      }, 100);
    }
  }, [storePreferences, form, t, updateShortcutTranslations]);

  // 防抖的字体保存函数
  const debouncedFontSave = useCallback((values: UserPreferences) => {
    // 清除之前的超时
    if (fontSaveTimeout) {
      clearTimeout(fontSaveTimeout);
    }

    // 设置新的超时
    const timeout = setTimeout(() => {
      logger.info('防抖保存字体设置:', values.accessibility.font_family);
      savePreferences(values);
    }, 300); // 300ms 防抖

    setFontSaveTimeout(timeout);
  }, [fontSaveTimeout]);

  // 🔧 保存用户偏好（使用 store 的乐观更新）
  const savePreferences = async (values: UserPreferences) => {
    logger.debug('保存用户偏好被调用，数据:', values);
    logger.debug('通知设置:', values.notifications);

    setLoading(true);
    try {
      // 🔧 使用 store 的乐观更新，立即生效
      await updatePreferences(values as Partial<UserPreferences>);

      onSave?.(values);
    } catch (error) {
      // 🔧 store 会自动回滚，只需显示错误
      logger.error('保存用户偏好失败:', error);
      showMessage.error(t('preferences_save_failed') || '保存用户偏好失败');
    } finally {
      setLoading(false);
    }
  };

  // 即时保存单个字段
  const saveFieldImmediately = async (fieldName: string, value: any) => {
    const currentValues = form.getValues();
    const updatedValues = { ...currentValues };

    // 处理嵌套字段（如 notifications.enabled）
    const keys = fieldName.split('.');
    let target: any = updatedValues;
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    await savePreferences(updatedValues);
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = createSystemShortcuts(t);
      form.setValue('shortcuts', shortcuts);
      showMessage.success(t('shortcuts_reset_success') || '已重置为默认快捷键');
    } catch (error) {
      logger.error('加载默认快捷键失败:', error);
      showMessage.error(t('shortcuts_reset_failed') || '加载默认快捷键失败');
    }
  };

  // 开始编辑快捷键
  const startEditingShortcut = (shortcut: KeyboardShortcut) => {
    setEditingShortcutId(shortcut.id);
    setEditingKeys([...shortcut.keys]);
  };

  // 取消编辑快捷键
  const cancelEditingShortcut = () => {
    setEditingShortcutId(null);
    setEditingKeys([]);
  };

  // 保存编辑的快捷键
  const saveEditingShortcut = (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, keys: editingKeys } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
    setEditingShortcutId(null);
    setEditingKeys([]);

    showMessage.success(t('shortcut_updated') || '快捷键已更新');
  };

  // 切换快捷键启用状态
  const toggleShortcutEnabled = (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, enabled: !s.enabled } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
  };

  // 处理键盘输入
  const handleKeyDown = (event: React.KeyboardEvent, shortcutId: string) => {
    if (editingShortcutId !== shortcutId) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    if (event.ctrlKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    if (event.metaKey) keys.push('Meta');

    // 处理特殊键
    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (
      key === 'Control' ||
      key === 'Shift' ||
      key === 'Alt' ||
      key === 'Meta'
    ) {
      // 如果只按了修饰键，不做处理
      return;
    }

    keys.push(key);
    setEditingKeys(keys);
  };

  // 🔧 从 store 加载偏好设置
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // 🔧 监听语言变化，更新快捷键翻译
  useEffect(() => {
    const handleLanguageChange = () => {
      logger.debug('语言已切换，更新快捷键翻译');
      const currentShortcuts = form.getValues('shortcuts');
      if (currentShortcuts && currentShortcuts.length > 0) {
        const updatedShortcuts = updateShortcutTranslations(currentShortcuts);
        form.setValue('shortcuts', updatedShortcuts);
      }
    };

    // 监听 i18n 的语言变化事件
    i18n.on('languageChanged', handleLanguageChange);

    // 清理监听器
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [form, updateShortcutTranslations]);

  // 清理超时
  useEffect(() => {
    return () => {
      if (fontSaveTimeout) {
        clearTimeout(fontSaveTimeout);
      }
    };
  }, [fontSaveTimeout]);

  // 监听表单字段变化以调试布局字段问题
  const watchedLayout = form.watch('workspace.layout');
  useEffect(() => {
    logger.debug('布局字段值变化:', watchedLayout);
  }, [watchedLayout]);

  // 🔧 使用 store 的 loading 状态
  if (storeLoading || !storePreferences) {
    return (
      <div className='flex items-center justify-center p-8'>{t('loading_text')}</div>
    );
  }

  return (
    <>
      <div className='space-y-6 settings-content'>
        {/* 主标题 */}
        <div className='flex items-center gap-3 mb-4'>
          <User className='w-6 h-6 text-blue-600' />
          <div>
            <h2 className='text-2xl font-bold'>{t('user_preferences')}</h2>
            <p className='text-muted-foreground'>{t('user_preferences_description')}</p>
          </div>
        </div>

        <Form {...form}>
          <div className='space-y-6'>
            {/* 通知设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Bell className='w-5 h-5 text-blue-600' />
                <div>
                  <h3 className='text-lg font-semibold'>{t('notification_settings_title')}</h3>
                  <p className='text-sm text-muted-foreground'>{t('notification_settings_desc')}</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.enabled'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('enable_notifications_label')}</FormLabel>
                          <FormDescription>{t('enable_notifications_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              saveFieldImmediately('notifications.enabled', value);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='notifications.desktop'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('desktop_notifications_label')}</FormLabel>
                          <FormDescription>{t('desktop_notifications_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              saveFieldImmediately('notifications.desktop', value);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.sound'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('sound_notifications_label')}</FormLabel>
                          <FormDescription>{t('sound_notifications_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              saveFieldImmediately('notifications.sound', value);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='notifications.position'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('notification_position_label')}</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            saveFieldImmediately('notifications.position', value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='h-9'>
                              <SelectValue placeholder={t('notification_position_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='topLeft'>{t('notification_position_top_left')}</SelectItem>
                            <SelectItem value='topCenter'>{t('notification_position_top_center')}</SelectItem>
                            <SelectItem value='topRight'>{t('notification_position_top_right')}</SelectItem>
                            <SelectItem value='bottomLeft'>{t('notification_position_bottom_left')}</SelectItem>
                            <SelectItem value='bottomCenter'>
                              {t('notification_position_bottom_center')}
                            </SelectItem>
                            <SelectItem value='bottomRight'>{t('notification_position_bottom_right')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='notifications.query_completion'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('query_completion_notification')}</FormLabel>
                          <FormDescription>{t('query_completion_notification_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='notifications.connection_status'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('connection_status_notification')}</FormLabel>
                          <FormDescription>{t('connection_status_notification_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 无障碍设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Eye className='w-5 h-5 text-blue-600' />
                <div>
                  <h3 className='text-lg font-semibold'>{t('accessibility_settings_title')}</h3>
                  <p className='text-sm text-muted-foreground'>{t('accessibility_settings_desc')}</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='accessibility.high_contrast'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('high_contrast_label')}</FormLabel>
                          <FormDescription>{t('high_contrast_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='accessibility.reduced_motion'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('reduced_motion_label')}</FormLabel>
                          <FormDescription>{t('reduced_motion_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='accessibility.font_size'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('font_size_label')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className='h-9'>
                              <SelectValue placeholder={t('font_size_placeholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='small'>{t('font_size_small')}</SelectItem>
                            <SelectItem value='medium'>{t('font_size_medium')}</SelectItem>
                            <SelectItem value='large'>{t('font_size_large')}</SelectItem>
                            <SelectItem value='extraLarge'>{t('font_size_extra_large')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='accessibility.font_family'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('font_family_label')}</FormLabel>
                        <FormControl>
                          <CustomFontSelector
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value);
                              // 立即应用字体变化 - 使用防抖避免无限循环
                              const currentValues = form.getValues();
                              const updatedValues = {
                                ...currentValues,
                                accessibility: {
                                  ...currentValues.accessibility,
                                  font_family: value
                                }
                              };
                              debouncedFontSave(updatedValues);
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* 自定义字体导入 */}
                <div className='mt-6'>
                  <CustomFontImport onFontImported={() => {
                    // 字体导入后可以刷新字体列表
                    showMessage.success(t('font_import_success') || '字体导入成功，请在字体选择器中查看');
                  }} />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='accessibility.keyboard_navigation'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('keyboard_navigation_label')}</FormLabel>
                          <FormDescription>{t('keyboard_navigation_desc')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 工作区设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Layout className='w-5 h-5 text-blue-600' />
                <div>
                  <h3 className='text-lg font-semibold'>{t('workspace_settings_title')}</h3>
                  <p className='text-sm text-muted-foreground'>{t('workspace_settings_desc')}</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='workspace.layout'
                    render={({ field }) => {
                      // 确保值始终有效
                      const currentValue = field.value || 'comfortable';
                      const validValues = ['compact', 'comfortable', 'spacious', 'minimal'];
                      const safeValue = validValues.includes(currentValue) ? currentValue : 'comfortable';

                      return (
                        <FormItem>
                          <FormLabel>{t('layout_mode_label')}</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              logger.info('布局模式选择变更:', value);
                              field.onChange(value);
                            }}
                            value={safeValue}
                            defaultValue="comfortable"
                          >
                            <FormControl>
                              <SelectTrigger className='h-9'>
                                <SelectValue
                                  placeholder={safeValue ?
                                    (safeValue === 'compact' ? t('layout_mode_compact') :
                                     safeValue === 'comfortable' ? t('layout_mode_comfortable') :
                                     safeValue === 'spacious' ? t('layout_mode_spacious') :
                                     safeValue === 'minimal' ? t('layout_mode_minimal') : t('layout_mode_placeholder'))
                                    : t('layout_mode_placeholder')}
                                />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='compact'>{t('layout_mode_compact')}</SelectItem>
                              <SelectItem value='comfortable'>{t('layout_mode_comfortable')}</SelectItem>
                              <SelectItem value='spacious'>{t('layout_mode_spacious')}</SelectItem>
                              <SelectItem value='minimal'>{t('layout_mode_minimal')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {t('layout_mode_desc')} (当前: {safeValue})
                          </FormDescription>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name={'workspace.restore_tabs_on_startup' as any}
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('restore_tabs_label')}</FormLabel>
                          <FormDescription>
                            {t('restore_tabs_desc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='workspace.pinned_queries'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('pinned_queries_label')}</FormLabel>
                          <FormDescription>
                            {t('pinned_queries_desc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={Array.isArray(field.value) ? field.value.length > 0 : false}
                            onCheckedChange={(checked) => field.onChange(checked ? ['default'] : [])}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='workspace.recent_files'
                    render={({ field }) => (
                      <FormItem className='flex items-center justify-between'>
                        <div className='space-y-0.5'>
                          <FormLabel>{t('recent_files_label')}</FormLabel>
                          <FormDescription>
                            {t('recent_files_desc')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={Array.isArray(field.value) ? field.value.length > 0 : false}
                            onCheckedChange={(checked) => field.onChange(checked ? ['default'] : [])}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 键盘快捷键 */}
            <div>
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <Keyboard className='w-5 h-5 text-blue-600' />
                  <div>
                    <h3 className='text-lg font-semibold'>{t('keyboard_shortcuts_title')}</h3>
                    <p className='text-sm text-muted-foreground'>{t('keyboard_shortcuts_desc')}</p>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={loadDefaultShortcuts}
                >
                  {t('reset_shortcuts')}
                </Button>
              </div>
              <div>
                <div className='space-y-6'>
                  {/* 按分类分组显示快捷键 */}
                  {Object.entries(
                    form.watch('shortcuts')?.reduce(
                      (groups, shortcut) => {
                        const category = shortcut.category;
                        if (!groups[category]) {
                          groups[category] = [];
                        }
                        groups[category].push(shortcut);
                        return groups;
                      },
                      {} as Record<string, KeyboardShortcut[]>
                    ) || {}
                  ).map(([category, shortcuts]) => (
                    <div key={category} className='space-y-3'>
                      <h4 className='text-sm font-medium text-muted-foreground border-b pb-1'>
                        {category}
                      </h4>
                      <div className='grid gap-2'>
                        {shortcuts.map(shortcut => (
                          <div
                            key={shortcut.id}
                            className='flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50'
                          >
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-3'>
                                <div className='flex-1'>
                                  <p className='text-sm font-medium'>
                                    {shortcut.name}
                                  </p>
                                  <p className='text-xs text-muted-foreground'>
                                    {shortcut.description}
                                  </p>
                                </div>
                                <div className='flex items-center gap-2'>
                                  {editingShortcutId === shortcut.id ? (
                                    <div className='flex items-center gap-2'>
                                      <div
                                        className='flex gap-1 p-2 border rounded-md bg-background min-w-[120px] focus-within:ring-2 focus-within:ring-ring'
                                        tabIndex={0}
                                        onKeyDown={e =>
                                          handleKeyDown(e, shortcut.id)
                                        }
                                      >
                                        {editingKeys.length > 0 ? (
                                          editingKeys.map((key, index) => (
                                            <Badge
                                              key={index}
                                              variant='secondary'
                                            >
                                              {key}
                                            </Badge>
                                          ))
                                        ) : (
                                          <span className='text-xs text-muted-foreground'>
                                            {t('press_keys')}
                                          </span>
                                        )}
                                      </div>
                                      <Button
                                        size='sm'
                                        onClick={() =>
                                          saveEditingShortcut(shortcut.id)
                                        }
                                        disabled={editingKeys.length === 0}
                                      >
                                        {t('save_shortcut')}
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={cancelEditingShortcut}
                                      >
                                        {t('cancel_shortcut')}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className='flex gap-1'>
                                      {shortcut.keys.map((key, index) => (
                                        <Badge key={index} variant='secondary'>
                                          {key}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className='flex items-center gap-2 ml-4'>
                              <Switch
                                checked={shortcut.enabled}
                                onCheckedChange={() =>
                                  toggleShortcutEnabled(shortcut.id)
                                }
                              />
                              {editingShortcutId !== shortcut.id && (
                                <Button
                                  size='sm'
                                  variant='outline'
                                  onClick={() => startEditingShortcut(shortcut)}
                                >
                                  <Edit className='w-3 h-3 mr-1' />
                                  {t('edit_shortcut')}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Form>
      </div>

    </>
  );
};

export default UserPreferencesComponent;
