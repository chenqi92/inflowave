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
} from 'lucide-react';
import type { KeyboardShortcut } from '@/types';
import { useUserPreferencesStore, type UserPreferences } from '@/stores/userPreferencesStore';
import { useSettingsTranslation } from '@/hooks/useTranslation';

// 获取所有系统快捷键的函数
const getAllSystemShortcuts = (): KeyboardShortcut[] => {
  return [
    // 导航快捷键
    {
      id: 'nav_dashboard',
      name: '打开仪表板',
      description: '切换到仪表板页面',
      keys: ['Ctrl', '1'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_connections',
      name: '打开连接管理',
      description: '切换到连接管理页面',
      keys: ['Ctrl', '2'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_query',
      name: '打开数据查询',
      description: '切换到数据查询页面',
      keys: ['Ctrl', '3'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_database',
      name: '打开数据库管理',
      description: '切换到数据库管理页面',
      keys: ['Ctrl', '4'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_visualization',
      name: '打开数据可视化',
      description: '切换到数据可视化页面',
      keys: ['Ctrl', '5'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_performance',
      name: '打开性能监控',
      description: '切换到性能监控页面',
      keys: ['Ctrl', '6'],
      category: '导航',
      enabled: true,
    },
    {
      id: 'nav_settings',
      name: '打开应用设置',
      description: '切换到应用设置页面',
      keys: ['Ctrl', '7'],
      category: '导航',
      enabled: true,
    },

    // 文件操作快捷键
    {
      id: 'file_new_query',
      name: '新建查询',
      description: '创建新的SQL查询',
      keys: ['Ctrl', 'N'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_new_connection',
      name: '新建连接',
      description: '创建新的数据库连接',
      keys: ['Ctrl', 'Shift', 'N'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_save_query',
      name: '保存查询',
      description: '保存当前查询',
      keys: ['Ctrl', 'S'],
      category: '文件',
      enabled: true,
    },
    {
      id: 'file_open_query',
      name: '打开查询',
      description: '打开已保存的查询',
      keys: ['Ctrl', 'O'],
      category: '文件',
      enabled: true,
    },

    // 查询操作快捷键
    {
      id: 'query_execute',
      name: '执行查询',
      description: '执行当前查询',
      keys: ['Ctrl', 'Enter'],
      category: '查询',
      enabled: true,
    },
    {
      id: 'query_stop',
      name: '停止查询',
      description: '停止正在执行的查询',
      keys: ['Ctrl', 'Shift', 'C'],
      category: '查询',
      enabled: true,
    },
    {
      id: 'query_format',
      name: '格式化查询',
      description: '格式化SQL查询代码',
      keys: ['Ctrl', 'L'],
      category: '查询',
      enabled: true,
    },

    // 编辑操作快捷键
    {
      id: 'edit_copy_line',
      name: '复制当前行',
      description: '复制光标所在行',
      keys: ['Ctrl', 'D'],
      category: '编辑',
      enabled: true,
    },
    {
      id: 'edit_toggle_comment',
      name: '切换注释',
      description: '注释/取消注释选中行',
      keys: ['Ctrl', '/'],
      category: '编辑',
      enabled: true,
    },

    // 搜索快捷键
    {
      id: 'search_global',
      name: '全局搜索',
      description: '打开全局搜索',
      keys: ['Ctrl', 'Shift', 'P'],
      category: '搜索',
      enabled: true,
    },

    // 工具快捷键
    {
      id: 'tools_shortcuts',
      name: '显示快捷键帮助',
      description: '显示所有快捷键',
      keys: ['Ctrl', 'K'],
      category: '工具',
      enabled: true,
    },
    {
      id: 'tools_dev_tools',
      name: '切换开发者工具',
      description: '打开/关闭开发者工具',
      keys: ['F12'],
      category: '工具',
      enabled: true,
    },

    // 界面操作快捷键
    {
      id: 'layout_toggle_sidebar',
      name: '切换侧边栏',
      description: '显示/隐藏侧边栏',
      keys: ['Ctrl', 'B'],
      category: '界面',
      enabled: true,
    },
    {
      id: 'layout_refresh',
      name: '刷新页面',
      description: '刷新当前页面',
      keys: ['F5'],
      category: '界面',
      enabled: true,
    },

    // 视图操作快捷键
    {
      id: 'view_zoom_in',
      name: '放大',
      description: '放大界面',
      keys: ['Ctrl', '+'],
      category: '视图',
      enabled: true,
    },
    {
      id: 'view_zoom_out',
      name: '缩小',
      description: '缩小界面',
      keys: ['Ctrl', '-'],
      category: '视图',
      enabled: true,
    },
    {
      id: 'view_reset_zoom',
      name: '重置缩放',
      description: '重置界面缩放',
      keys: ['Ctrl', '0'],
      category: '视图',
      enabled: true,
    },

    // 数据库操作快捷键
    {
      id: 'db_refresh',
      name: '刷新数据库结构',
      description: '刷新数据库树结构',
      keys: ['F5'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_delete',
      name: '删除选中项',
      description: '删除选中的数据库项',
      keys: ['Delete'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_rename',
      name: '重命名选中项',
      description: '重命名选中的数据库项',
      keys: ['F2'],
      category: '数据库',
      enabled: true,
    },
    {
      id: 'db_new_table',
      name: '创建新表',
      description: '创建新的数据表',
      keys: ['Ctrl', 'T'],
      category: '数据库',
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
      shortcuts: getAllSystemShortcuts(),
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

  // 🔧 加载用户偏好（从 store 读取）
  const loadPreferences = useCallback(() => {
    console.log('从 store 加载用户偏好');

    if (storePreferences) {
      // 确保快捷键数据完整
      const preferences = {
        ...storePreferences,
        shortcuts:
          storePreferences.shortcuts && storePreferences.shortcuts.length > 0
            ? storePreferences.shortcuts
            : getAllSystemShortcuts(),
      };

      console.log('从 store 加载的偏好数据:', preferences);
      form.reset(preferences);

      // 确保布局字段被正确设置
      setTimeout(() => {
        form.setValue('workspace.layout', preferences.workspace?.layout || 'comfortable');
        console.log('form.reset完成，当前表单值:', form.getValues());
      }, 100);
    }
  }, [storePreferences, form]);

  // 防抖的字体保存函数
  const debouncedFontSave = useCallback((values: UserPreferences) => {
    // 清除之前的超时
    if (fontSaveTimeout) {
      clearTimeout(fontSaveTimeout);
    }

    // 设置新的超时
    const timeout = setTimeout(() => {
      console.log('防抖保存字体设置:', values.accessibility.font_family);
      savePreferences(values);
    }, 300); // 300ms 防抖

    setFontSaveTimeout(timeout);
  }, [fontSaveTimeout]);

  // 🔧 保存用户偏好（使用 store 的乐观更新）
  const savePreferences = async (values: UserPreferences) => {
    console.log('保存用户偏好被调用，数据:', values);
    console.log('通知设置:', values.notifications);

    setLoading(true);
    try {
      // 🔧 使用 store 的乐观更新，立即生效
      await updatePreferences(values as Partial<UserPreferences>);

      showMessage.success('偏好设置已保存');
      onSave?.(values);
    } catch (error) {
      // 🔧 store 会自动回滚，只需显示错误
      console.error('保存用户偏好失败:', error);
      showMessage.error('保存用户偏好失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = getAllSystemShortcuts();
      form.setValue('shortcuts', shortcuts);
      showMessage.success('已重置为默认快捷键');
    } catch (error) {
      console.error('加载默认快捷键失败:', error);
      showMessage.error('加载默认快捷键失败');
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

    showMessage.success('快捷键已更新');
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
    console.log('布局字段值变化:', watchedLayout);
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
        <Form {...form}>
          <div className='space-y-6'>
            {/* 通知设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Bell className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>{t('notification_settings_title')}</h2>
                  <p className='text-muted-foreground'>{t('notification_settings_desc')}</p>
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
                            onCheckedChange={field.onChange}
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
                            onCheckedChange={field.onChange}
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
                          onValueChange={field.onChange}
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
                <Eye className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>{t('accessibility_settings_title')}</h2>
                  <p className='text-muted-foreground'>{t('accessibility_settings_desc')}</p>
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
                <Layout className='w-6 h-6 text-blue-600' />
                <div>
                  <h2 className='text-2xl font-bold'>{t('workspace_settings_title')}</h2>
                  <p className='text-muted-foreground'>{t('workspace_settings_desc')}</p>
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
                              console.log('布局模式选择变更:', value);
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
                  <Keyboard className='w-6 h-6 text-blue-600' />
                  <div>
                    <h2 className='text-2xl font-bold'>{t('keyboard_shortcuts_title')}</h2>
                    <p className='text-muted-foreground'>{t('keyboard_shortcuts_desc')}</p>
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

      {/* 保存按钮 - 固定在底部 */}
      <div className='flex justify-end gap-2 pt-4 pb-4 border-t bg-background sticky'>
        <Button type='button' variant='outline' size='sm' onClick={() => form.reset()}>
          <RefreshCw className='w-4 h-4 mr-2' />
          {t('reset_shortcuts')}
        </Button>
        <Button
          size='sm'
          onClick={async () => {
            console.log('保存按钮被点击');
            const formData = form.getValues();
            console.log('当前表单数据:', formData);
            await savePreferences(formData);
          }}
          disabled={loading}
        >
          <Settings className='w-4 h-4 mr-2' />
          {t('save_settings_button') || '保存设置'}
        </Button>
      </div>
    </>
  );
};

export default UserPreferencesComponent;
