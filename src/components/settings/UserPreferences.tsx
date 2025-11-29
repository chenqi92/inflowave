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
  Switch,
} from '@/components/ui';
import CustomFontSelector from './CustomFontSelector';
import CustomFontImport from './CustomFontImport';
import { showMessage } from '@/utils/message';
import {
  Bell,
  Layout,
  Eye,
  User,
} from 'lucide-react';
import { useUserPreferencesStore, type UserPreferences } from '@/stores/userPreferencesStore';
import { useSettingsTranslation } from '@/hooks/useTranslation';
import logger from '@/utils/logger';

interface UserPreferencesComponentProps {
  onSave?: (preferences: UserPreferences) => void;
}

const UserPreferencesComponent: React.FC<UserPreferencesComponentProps> = ({
  onSave,
}) => {
  const { t } = useSettingsTranslation();

  const {
    preferences: storePreferences,
    loading: storeLoading,
    updatePreferences
  } = useUserPreferencesStore();

  const [loading, setLoading] = useState(false);
  const [fontSaveTimeout, setFontSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<UserPreferences>({
    defaultValues: {
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

  // 加载用户偏好（从 store 读取）
  const loadPreferences = useCallback(() => {
    logger.debug('从 store 加载用户偏好');

    if (storePreferences) {
      const preferences = { ...storePreferences };
      logger.info('从 store 加载的偏好数据:', preferences);
      form.reset(preferences);

      // 确保布局字段被正确设置
      setTimeout(() => {
        form.setValue('workspace.layout', preferences.workspace?.layout || 'comfortable');
        logger.info('form.reset完成，当前表单值:', form.getValues());
      }, 100);
    }
  }, [storePreferences, form]);

  // 防抖的字体保存函数
  const debouncedFontSave = useCallback((values: UserPreferences) => {
    if (fontSaveTimeout) {
      clearTimeout(fontSaveTimeout);
    }

    const timeout = setTimeout(() => {
      logger.info('防抖保存字体设置:', values.accessibility.font_family);
      savePreferences(values);
    }, 300);

    setFontSaveTimeout(timeout);
  }, [fontSaveTimeout]);

  // 保存用户偏好（使用 store 的乐观更新）
  const savePreferences = async (values: UserPreferences) => {
    logger.debug('保存用户偏好被调用，数据:', values);
    logger.debug('通知设置:', values.notifications);

    setLoading(true);
    try {
      await updatePreferences(values as Partial<UserPreferences>);
      onSave?.(values);
    } catch (error) {
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

  // 从 store 加载偏好设置
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
    logger.debug('布局字段值变化:', watchedLayout);
  }, [watchedLayout]);

  // 使用 store 的 loading 状态
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
          <User className='w-5 h-5 text-blue-600' />
          <div>
            <h2 className='text-lg font-semibold'>{t('user_preferences')}</h2>
            <p className='text-xs text-muted-foreground'>{t('user_preferences_description')}</p>
          </div>
        </div>

        <Form {...form}>
          <div className='space-y-6'>
            {/* 通知设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Bell className='w-4 h-4 text-blue-600' />
                <div>
                  <h3 className='text-base font-medium'>{t('notification_settings_title')}</h3>
                  <p className='text-xs text-muted-foreground'>{t('notification_settings_desc')}</p>
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
                            <SelectTrigger>
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

            {/* 工作区设置 - 放在字体设置上方 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Layout className='w-4 h-4 text-blue-600' />
                <div>
                  <h3 className='text-base font-medium'>{t('workspace_settings_title')}</h3>
                  <p className='text-xs text-muted-foreground'>{t('workspace_settings_desc')}</p>
                </div>
              </div>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <FormField
                    control={form.control}
                    name='workspace.layout'
                    render={({ field }) => {
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
                              saveFieldImmediately('workspace.layout', value);
                            }}
                            value={safeValue}
                            defaultValue="comfortable"
                          >
                            <FormControl>
                              <SelectTrigger>
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
                            {t('layout_mode_desc')}
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

            {/* 无障碍设置 / 字体设置 */}
            <div>
              <div className='flex items-center gap-3 mb-4'>
                <Eye className='w-4 h-4 text-blue-600' />
                <div>
                  <h3 className='text-base font-medium'>{t('accessibility_settings_title')}</h3>
                  <p className='text-xs text-muted-foreground'>{t('accessibility_settings_desc')}</p>
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
                          onValueChange={(value) => {
                            field.onChange(value);
                            saveFieldImmediately('accessibility.font_size', value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                    showMessage.success(t('font_import_success') || '字体导入成功，请在字体选择器中查看');
                  }} />
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
