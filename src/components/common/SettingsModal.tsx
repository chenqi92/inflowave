import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Alert,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  CustomDialog,
  Label,
} from '@/components/ui';
import { useDialog } from '@/hooks/useDialog';
import { showMessage } from '@/utils/message';
import {
  Save,
  RefreshCw,
  Settings,
  Database,
  Bell,
  FileDown,
  FileUp,
  Monitor,
  User,
  Shield,
  Info,
  Download,
  ExternalLink,
  FileText,
  Globe,
} from 'lucide-react';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';
import { saveJsonFile } from '@/utils/nativeDownload';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeColorSelectorWithPreview } from '@/components/ui/theme-color-selector';
import UserPreferencesComponent from '@/components/settings/UserPreferences';
import ControllerSettings from '@/components/settings/ControllerSettings';
import LoggingSettings from '@/components/settings/LoggingSettings';
import UserGuideModal from '@/components/common/UserGuideModal';
import LanguageManagement from '@/components/settings/LanguageManagement';
import { useNoticeStore } from '@/store/notice';
import { UpdateSettings } from '@/components/updater/UpdateSettings';
import { openExternalLink } from '@/utils/externalLinks';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import { performHealthCheck } from '@/utils/healthCheck';
import type { AppConfig } from '@/types';
import { getAppVersion } from '@/utils/version';
import { useTranslation, useSettingsTranslation, useCommonTranslation } from '@/hooks/useTranslation';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { LanguageSelector } from '@/components/settings/LanguageSelector';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose, initialTab = 'general' }) => {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const { config, setConfig, setLanguage, resetConfig } = useAppStore();
  const { clearConnections } = useConnectionStore();
  const { resetNoticeSettings, browserModeNoticeDismissed } = useNoticeStore();
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
  
  // 国际化 hooks
  const { t: tSettings } = useSettingsTranslation();
  const { t: tCommon } = useCommonTranslation();
  const { switchLanguage } = useLanguageSwitcher();

  // 初始化表单值
  useEffect(() => {
    if (visible) {
      form.reset(config);
    }
  }, [config, visible, form]);

  // 保存设置
  const saveSettings = async (values: AppConfig) => {
    setLoading(true);
    try {
      // 更新本地状态
      setConfig(values);

      // 应用主题设置 - 使用新的主题系统
      if (values.theme) {
        setTheme(values.theme as 'light' | 'dark' | 'system');
      }

      // 应用语言设置
      if (values.language && values.language !== config.language) {
        await switchLanguage(values.language);
      }

      // 保存到后端
      try {
        // 构建符合后端期望的设置结构
        const appSettings = {
          general: {
            theme: values.theme || 'system',
            language: values.language || 'zh-CN',
            auto_save: values.autoSave || false,
            auto_connect: values.autoConnect || false,
            startup_connection: null,
          },
          editor: {
            font_size: 14,
            font_family: "Monaco, 'Courier New', monospace",
            tab_size: 2,
            word_wrap: true,
            line_numbers: true,
            minimap: true,
          },
          query: {
            timeout: 30000,
            max_results: 10000,
            auto_complete: true,
            syntax_highlight: true,
            format_on_save: false,
          },
          visualization: {
            default_chart_type: 'line',
            refresh_interval: 5000,
            max_data_points: 1000,
            color_scheme: values.colorScheme || 'default',
          },
          security: {
            encrypt_connections: true,
            session_timeout: 3600,
            require_confirmation: true,
            controller: {
              allow_delete_statements: false,
              allow_drop_statements: false,
              allow_dangerous_operations: false,
              require_confirmation_for_delete: true,
              require_confirmation_for_drop: true,
            },
          },
        };

        await safeTauriInvoke('update_app_settings', {
          newSettings: appSettings,
        });
      } catch (saveError) {
        console.warn('保存配置到后端失败:', saveError);
        // 如果后端不支持保存配置，只保存到前端状态
        console.info('仅保存到前端状态，后端配置保存功能暂未实现');
      }

      showMessage.success(tCommon('success'));
    } catch (saveError) {
      showMessage.error(`${tCommon('error')}: ${saveError}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleResetSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：只重置前端配置
        resetConfig();
        setTimeout(() => {
          const latestConfig = useAppStore.getState().config;
          form.reset(latestConfig);
        }, 0);
        showMessage.success(tSettings('reset_to_default'));
      } else {
        // Tauri 环境：调用后端重置命令
        const defaultSettings = await safeTauriInvoke('reset_all_settings');
        if (defaultSettings) {
          // 更新前端配置
          setConfig(defaultSettings);
          form.reset(defaultSettings);

          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-connections'));
          // 🔧 已移除 userPreferencesUpdated 事件派发，现在使用 userPreferencesStore 统一管理

          showMessage.success(tSettings('reset_all_config'));
        }
      }
    } catch (error) {
      console.error('重置配置失败:', error);
      showMessage.error(`${tCommon('error')}: ${error}`);
    }
  };

  // 导出配置
  const exportSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用浏览器API导出
        const settings = {
          version: '1.0.0',
          exportTime: new Date().toISOString(),
          appSettings: config,
          connections: useConnectionStore.getState().connections,
          metadata: {
            application: 'InfloWave',
            description: 'InfloWave应用配置文件'
          }
        };

        try {
          // 尝试使用现代浏览器的文件系统访问API
          if ('showSaveFilePicker' in window) {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: `inflowave-config-${new Date().toISOString().split('T')[0]}.json`,
              types: [
                {
                  description: 'JSON files',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(settings, null, 2));
            await writable.close();
            showMessage.success(tSettings('export_config'));
          } else {
            // 使用原生文件保存对话框作为降级方案
            const success = await saveJsonFile(settings, {
              filename: `inflowave-config-${new Date().toISOString().split('T')[0]}.json`,
              filters: [
                { name: '配置文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });

            if (success) {
              showMessage.success(tSettings('export_config'));
            }
          }
        } catch (exportError) {
          if ((exportError as Error).name === 'AbortError') {
            showMessage.info(tCommon('cancel'));
          } else {
            throw exportError;
          }
        }
      } else {
        // Tauri 环境：调用后端导出命令
        await safeTauriInvoke('export_settings');
        showMessage.success(tSettings('export_config'));
      }
    } catch (error) {
      console.error('导出配置失败:', error);
      if (String(error).includes('取消') || String(error).includes('cancel')) {
        showMessage.info(tCommon('cancel'));
      } else {
        showMessage.error(`${tCommon('error')}: ${error}`);
      }
    }
  };

  // 导入配置
  const importSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用文件输入
        showMessage.info('Browser import feature in development...');
        return;
      }

      // Tauri 环境：调用后端导入命令
      const importedSettings = await safeTauriInvoke('import_settings');
      if (importedSettings) {
        // 更新应用配置
        setConfig(importedSettings);
        form.reset(importedSettings);

        // 刷新连接列表（因为后端已经处理了连接配置的导入）
        try {
          // 触发连接列表刷新
          window.dispatchEvent(new CustomEvent('refresh-connections'));
          showMessage.success(tSettings('import_config'));
        } catch (refreshError) {
          console.warn('刷新连接列表失败:', refreshError);
          showMessage.success(tSettings('import_config'));
        }
      }
    } catch (error) {
      console.error('导入配置失败:', error);
      if (String(error).includes('取消') || String(error).includes('cancel')) {
        showMessage.info(tCommon('cancel'));
      } else {
        showMessage.error(`${tCommon('error')}: ${error}`);
      }
    }
  };



  const tabItems = [
    {
      key: 'general',
      icon: <Settings className='w-4 h-4' />,
      label: tSettings('general'),
      children: (
        <form onSubmit={form.handleSubmit((data) => saveSettings(data as AppConfig))} className='space-y-6 settings-content'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Monitor className='w-6 h-6 text-blue-600' />
              <div>
                <h2 className='text-2xl font-bold'>{tSettings('interface_settings')}</h2>
                <p className='text-muted-foreground'>
                  {tSettings('interface_settings_description')}
                </p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='theme'>{tSettings('theme')}</Label>
                  <Select
                    value={theme}
                    onValueChange={value =>
                      setTheme(value as 'light' | 'dark' | 'system')
                    }
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue placeholder={tSettings('select_theme')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='light'>{tSettings('light_theme')}</SelectItem>
                      <SelectItem value='dark'>{tSettings('dark_theme')}</SelectItem>
                      <SelectItem value='system'>{tSettings('system_theme')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <LanguageSelector
                    value={form.watch('language') || config.language}
                    onValueChange={async (value) => {
                      form.setValue('language', value);
                      // 立即切换语言
                      try {
                        await switchLanguage(value);
                      } catch (error) {
                        console.error('Language switch failed:', error);
                      }
                    }}
                    showProgress={true}
                    showNativeName={true}
                    showFlag={true}
                  />
                </div>
              </div>

              {/* 软件风格设置 */}
              <div className='space-y-4'>
                <div>
                  <Label className='text-base font-medium'>{tSettings('software_style')}</Label>
                  <p className='text-sm text-muted-foreground'>
                    {tSettings('software_style_description')}
                  </p>
                </div>
                <ThemeColorSelectorWithPreview
                  value={colorScheme}
                  onChange={setColorScheme}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='flex items-center space-x-2'>
                  <Switch
                    checked={form.watch('autoSave') ?? config.autoSave}
                    onCheckedChange={checked =>
                      form.setValue('autoSave', checked)
                    }
                  />
                  <Label htmlFor='autoSave'>{tSettings('auto_save')}</Label>
                </div>

                <div className='flex items-center space-x-2'>
                  <Switch
                    checked={form.watch('autoConnect') ?? config.autoConnect}
                    onCheckedChange={checked =>
                      form.setValue('autoConnect', checked)
                    }
                  />
                  <Label htmlFor='autoConnect'>{tSettings('auto_connect')}</Label>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='flex items-center space-x-2'>
                  <Switch
                    checked={form.watch('showInternalDatabases') ?? config.showInternalDatabases}
                    onCheckedChange={checked => {
                      form.setValue('showInternalDatabases', checked);

                      // 立即保存设置并刷新数据库列表
                      const currentConfig = form.getValues();
                      const updatedConfig = { ...currentConfig, showInternalDatabases: checked };

                      // 保存设置
                      saveSettings(updatedConfig as AppConfig).then(() => {
                        // 触发数据库列表刷新
                        dataExplorerRefresh.trigger();

                        // 提供即时反馈
                        if (checked) {
                          showMessage.success(tSettings('internal_db_enabled'));
                        } else {
                          showMessage.success(tSettings('internal_db_disabled'));
                        }
                      }).catch(error => {
                        console.error('保存设置失败:', error);
                        showMessage.error(tSettings('save_settings_failed'));
                        // 回滚设置
                        form.setValue('showInternalDatabases', !checked);
                      });
                    }}
                  />
                  <Label htmlFor='showInternalDatabases'>{tSettings('show_internal_databases')}</Label>
                </div>
                <div className='text-sm text-muted-foreground'>
                  <p>{tSettings('show_internal_databases_description')}</p>
                  <p className='text-xs mt-1 text-amber-600'>
                    {tSettings('show_internal_databases_note')}
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='logLevel'>{tSettings('log_level')}</Label>
                  <Select
                    value={form.watch('logLevel') || config.logLevel}
                    onValueChange={value => form.setValue('logLevel', value)}
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue placeholder={tSettings('select_log_level')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='debug'>{tSettings('log_level_debug')}</SelectItem>
                      <SelectItem value='info'>{tSettings('log_level_info')}</SelectItem>
                      <SelectItem value='warn'>{tSettings('log_level_warn')}</SelectItem>
                      <SelectItem value='error'>{tSettings('log_level_error')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 应用行为设置 */}
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Settings className='w-6 h-6 text-blue-600' />
              <div>
                <h2 className='text-2xl font-bold'>{tSettings('app_behavior')}</h2>
                <p className='text-muted-foreground'>
                  {tSettings('app_behavior_description')}
                </p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-0.5'>
                    <Label className='text-base'>{tSettings('auto_save')}</Label>
                    <p className='text-sm text-muted-foreground'>
                      {tSettings('auto_save_description')}
                    </p>
                  </div>
                  <Switch
                    checked={config.autoSave || false}
                    onCheckedChange={checked =>
                      form.setValue('autoSave', checked)
                    }
                  />
                </div>

                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-0.5'>
                    <Label className='text-base'>{tSettings('auto_connect')}</Label>
                    <p className='text-sm text-muted-foreground'>
                      {tSettings('auto_connect_description')}
                    </p>
                  </div>
                  <Switch
                    checked={config.autoConnect || false}
                    onCheckedChange={checked =>
                      form.setValue('autoConnect', checked)
                    }
                  />
                </div>
              </div>

              {/* 系统健康检查 */}
              <div className='space-y-4'>
                <div>
                  <Label className='text-base font-medium'>{tSettings('system_health_check')}</Label>
                  <p className='text-sm text-muted-foreground'>
                    {tSettings('system_health_check_description')}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const result = await performHealthCheck();
                        if (result) {
                          showMessage.success(tSettings('health_check_success'));
                        }
                      } catch (error) {
                        showMessage.error(`${tSettings('health_check_failed')}: ${error}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <Monitor className='w-4 h-4 mr-2' />
                    {tSettings('perform_health_check')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-4 pb-4 border-t bg-background sticky'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleResetSettings}
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              {tSettings('reset_to_default')}
            </Button>
            <Button type='submit' size='sm' disabled={loading}>
              <Save className='w-4 h-4 mr-2' />
              {tSettings('save_settings')}
            </Button>
          </div>
        </form>
      ),
    },
    {
      key: 'query',
      icon: <Shield className='w-4 h-4' />,
      label: tSettings('query_settings'),
      children: <ControllerSettings />,
    },
    {
      key: 'preferences',
      icon: <User className='w-4 h-4' />,
      label: tSettings('user_preferences'),
      children: <UserPreferencesComponent />,
    },
    {
      key: 'config',
      icon: <Database className='w-4 h-4' />,
      label: tSettings('config_management'),
      children: (
        <div className='space-y-6'>
          <div>
            <h4 className='text-sm font-medium mb-3'>{tSettings('config_backup_restore')}</h4>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <Button
                variant='outline'
                onClick={exportSettings}
                className='w-full justify-start'
              >
                <FileDown className='w-4 h-4 mr-2' />
                {tSettings('export_config')}
              </Button>
              <Button
                variant='outline'
                onClick={importSettings}
                className='w-full justify-start'
              >
                <FileUp className='w-4 h-4 mr-2' />
                {tSettings('import_config')}
              </Button>
              <Button
                variant='outline'
                onClick={handleResetSettings}
                className='w-full justify-start'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                {tSettings('reset_all_config')}
              </Button>
            </div>
            <Alert className='mt-4'>
              <Info className='h-4 w-4' />
              <div>
                <h5 className='font-medium'>{tSettings('config_description')}</h5>
                <p className='text-sm text-muted-foreground mt-1'>
                  • <strong>{tSettings('export_config')}</strong>：{tSettings('export_config_description')}<br/>
                  • <strong>{tSettings('import_config')}</strong>：{tSettings('import_config_description')}<br/>
                  • <strong>{tSettings('reset_config')}</strong>：{tSettings('reset_config_description')}
                </p>
              </div>
            </Alert>
          </div>
        </div>
      ),
    },

    {
      key: 'user-guide',
      icon: <Bell className='w-4 h-4' />,
      label: tSettings('user_guide'),
      children: (
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center gap-3 mb-4'>
            <Bell className='w-6 h-6 text-blue-600' />
            <div>
              <h2 className='text-2xl font-bold'>{tSettings('user_guide_title')}</h2>
              <p className='text-muted-foreground'>{tSettings('user_guide_description')}</p>
            </div>
          </div>

          {/* User guide settings */}
          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <div className='mb-4'>
                <h4 className='text-base font-medium'>{tSettings('startup_guide')}</h4>
                <p className='text-sm text-muted-foreground'>
                  {tSettings('startup_guide_description')}
                </p>
              </div>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label className='text-sm'>{tSettings('enable_startup_guide')}</Label>
                  <p className='text-xs text-muted-foreground'>
                    {tSettings('enable_startup_guide_description')}
                  </p>
                </div>
                <Switch
                  checked={!browserModeNoticeDismissed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resetNoticeSettings();
                      showMessage.success(tSettings('startup_guide_enabled'));
                    } else {
                      useNoticeStore.getState().dismissBrowserModeNotice();
                      showMessage.success(tSettings('startup_guide_disabled'));
                    }
                  }}
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <Button
                onClick={() => setUserGuideVisible(true)}
                className='w-full justify-start'
              >
                <Info className='w-4 h-4 mr-2' />
                {tSettings('view_user_guide')}
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  resetNoticeSettings();
                  showMessage.success(tSettings('guide_settings_reset'));
                }}
                className='w-full justify-start'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                {tSettings('reset_guide_settings')}
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'logging',
      icon: <FileText className='w-4 h-4' />,
      label: tSettings('logging'),
      children: <LoggingSettings />,
    },
    {
      key: 'language-management',
      icon: <Globe className='w-4 h-4' />,
      label: tSettings('language_management'),
      children: <LanguageManagement />,
    },
    {
      key: 'updates',
      icon: <Download className='w-4 h-4' />,
      label: tSettings('updates'),
      children: <UpdateSettings />,
    },
    {
      key: 'about-app',
      icon: <Info className='w-4 h-4' />,
      label: tSettings('about_app'),
      children: (
        <div className='space-y-6'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Info className='w-6 h-6 text-blue-600' />
              <div>
                <h2 className='text-2xl font-bold'>{tSettings('about_inflowave')}</h2>
                <p className='text-muted-foreground'>
                  {tSettings('about_inflowave_description')}
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('app_info')}</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('app_name')}:</span>
                  <span>InfloWave</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('version')}:</span>
                  <span>{getAppVersion()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('build_time')}:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('open_source_project')}</h4>
              <p className='text-sm text-muted-foreground mb-3'>
                {tSettings('open_source_description')}
              </p>
              <Button
                variant='outline'
                onClick={async () => {
                  await openExternalLink('https://github.com/chenqi92/inflowave', {
                    showSuccessMessage: true,
                    successMessage: '正在打开GitHub项目页面',
                    showErrorMessage: true,
                    errorMessage: '打开GitHub页面失败'
                  });
                }}
                className='w-full justify-start'
              >
                <ExternalLink className='w-4 h-4 mr-2' />
                {tSettings('visit_github')}
              </Button>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>{tSettings('tech_stack')}</h4>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('frontend')}:</span>
                  <span>React + TypeScript</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('backend')}:</span>
                  <span>Rust + Tauri</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('ui_framework')}:</span>
                  <span>Shadcn/ui</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{tSettings('database')}:</span>
                  <span>InfluxDB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <Dialog
        open={visible}
        onOpenChange={open => {
          if (!open) onClose();
        }}
      >
        <DialogContent className='max-w-5xl w-full h-[90vh] p-0 flex flex-col gap-0 settings-modal'>
          <DialogHeader className='px-6 py-3 border-b shrink-0 space-y-0'>
            <DialogTitle className='flex items-center gap-2'>
              <Settings className='w-5 h-5' />
              {tSettings('title')}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              {tSettings('description')}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-1 min-h-0'>
            <Tabs
              defaultValue={initialTab}
              orientation='vertical'
              className='flex flex-1 h-full'
            >
              <TabsList className='flex flex-col h-fit w-48 bg-muted/50 py-4 px-2 items-start justify-start shrink-0 rounded-none border-r space-y-1'>
                {tabItems.map(item => (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className='w-full justify-start p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-sm h-auto'
                  >
                    <div className='flex items-center gap-2'>
                      {item.icon}
                      <span className='text-sm'>{item.label}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className='flex-1 min-w-0 overflow-hidden'>
                {tabItems.map(item => (
                  <TabsContent
                    key={item.key}
                    value={item.key}
                    className='h-full mt-0 px-6 py-4 data-[state=inactive]:hidden overflow-y-auto'
                  >
                    <div className='max-w-3xl pb-12'>{item.children}</div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* 用户指引弹框 */}
      <UserGuideModal
        isOpen={userGuideVisible}
        onClose={() => setUserGuideVisible(false)}
      />

      {/* 对话框组件 */}
      <CustomDialog
        isOpen={dialog.isOpen}
        onClose={dialog.hideDialog}
        options={{
          ...dialog.dialogState.options,
          onConfirm: dialog.handleConfirm,
          onCancel: dialog.handleCancel,
        }}
      />
    </>
  );
};

export default SettingsModal;
