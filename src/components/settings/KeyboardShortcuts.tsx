/**
 * 键盘快捷键设置组件
 * 从 UserPreferences 中独立出来的快捷键管理功能
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  Button,
  Switch,
  Badge,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import { Keyboard, Edit } from 'lucide-react';
import type { KeyboardShortcut } from '@/types';
import { useUserPreferencesStore, type UserPreferences } from '@/stores/userPreferencesStore';
import { useSettingsTranslation } from '@/hooks/useTranslation';
import i18n from 'i18next';
import logger from '@/utils/logger';

// 创建快捷键工厂函数
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

const KeyboardShortcuts: React.FC = () => {
  const { t } = useSettingsTranslation();

  const {
    preferences: storePreferences,
    loading: storeLoading,
    updatePreferences
  } = useUserPreferencesStore();

  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [editingKeys, setEditingKeys] = useState<string[]>([]);

  const form = useForm<{ shortcuts: KeyboardShortcut[] }>({
    defaultValues: {
      shortcuts: createSystemShortcuts(t),
    },
  });

  // 根据快捷键 ID 更新翻译文本
  const updateShortcutTranslations = useCallback((shortcuts: KeyboardShortcut[]): KeyboardShortcut[] => {
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
      const idParts = shortcut.id.split('_');
      const categoryPrefix = idParts[0];
      const action = idParts.slice(1).join('_');
      const fullCategoryName = categoryMapping[categoryPrefix] || categoryPrefix;

      const nameKey = `shortcut_${categoryPrefix}_${action}`;
      const descKey = `shortcut_${categoryPrefix}_${action}_desc`;
      const categoryKey = `shortcut_category_${fullCategoryName}`;

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

  // 加载快捷键设置
  const loadShortcuts = useCallback(() => {
    if (storePreferences) {
      let shortcuts = storePreferences.shortcuts && storePreferences.shortcuts.length > 0
        ? storePreferences.shortcuts
        : createSystemShortcuts(t);

      shortcuts = updateShortcutTranslations(shortcuts);
      form.reset({ shortcuts });
    }
  }, [storePreferences, form, t, updateShortcutTranslations]);

  // 保存快捷键设置
  const saveShortcuts = async (shortcuts: KeyboardShortcut[]) => {
    try {
      await updatePreferences({ shortcuts } as Partial<UserPreferences>);
    } catch (error) {
      logger.error('保存快捷键失败:', error);
      showMessage.error(t('preferences_save_failed') || '保存快捷键失败');
    }
  };

  // 加载默认快捷键
  const loadDefaultShortcuts = async () => {
    try {
      const shortcuts = createSystemShortcuts(t);
      form.setValue('shortcuts', shortcuts);
      await saveShortcuts(shortcuts);
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
  const saveEditingShortcut = async (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, keys: editingKeys } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
    await saveShortcuts(updatedShortcuts);
    setEditingShortcutId(null);
    setEditingKeys([]);

    showMessage.success(t('shortcut_updated') || '快捷键已更新');
  };

  // 切换快捷键启用状态
  const toggleShortcutEnabled = async (shortcutId: string) => {
    const currentShortcuts = form.getValues('shortcuts');
    const updatedShortcuts = currentShortcuts.map(s =>
      s.id === shortcutId ? { ...s, enabled: !s.enabled } : s
    );

    form.setValue('shortcuts', updatedShortcuts);
    await saveShortcuts(updatedShortcuts);
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

    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
      return;
    }

    keys.push(key);
    setEditingKeys(keys);
  };

  // 加载设置
  useEffect(() => {
    loadShortcuts();
  }, [loadShortcuts]);

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChange = () => {
      const currentShortcuts = form.getValues('shortcuts');
      if (currentShortcuts && currentShortcuts.length > 0) {
        const updatedShortcuts = updateShortcutTranslations(currentShortcuts);
        form.setValue('shortcuts', updatedShortcuts);
      }
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [form, updateShortcutTranslations]);

  if (storeLoading || !storePreferences) {
    return (
      <div className='flex items-center justify-center p-8'>{t('loading_text')}</div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 页面标题 */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <Keyboard className='w-5 h-5 text-blue-600' />
          <div>
            <h2 className='text-lg font-semibold'>{t('keyboard_shortcuts_title')}</h2>
            <p className='text-xs text-muted-foreground'>{t('keyboard_shortcuts_desc')}</p>
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

      <Form {...form}>
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
                                onKeyDown={e => handleKeyDown(e, shortcut.id)}
                              >
                                {editingKeys.length > 0 ? (
                                  editingKeys.map((key, index) => (
                                    <Badge key={index} variant='secondary'>
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
                                onClick={() => saveEditingShortcut(shortcut.id)}
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
                        onCheckedChange={() => toggleShortcutEnabled(shortcut.id)}
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
      </Form>
    </div>
  );
};

export default KeyboardShortcuts;
