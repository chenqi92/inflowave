import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
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
  Trash2,
  Settings,
  Database,
  Bug,
  Bell,
  FileDown,
  FileUp,
  Monitor,
  User,
  Shield,
  Info,
  Download,
  ExternalLink,
} from 'lucide-react';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';
import { saveJsonFile } from '@/utils/nativeDownload';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { ThemeColorSelectorWithPreview } from '@/components/ui/theme-color-selector';
import UserPreferencesComponent from '@/components/settings/UserPreferences';
import ControllerSettings from '@/components/settings/ControllerSettings';
import UserGuideModal from '@/components/common/UserGuideModal';
import { useNoticeStore } from '@/store/notice';
import { UpdateSettings } from '@/components/updater/UpdateSettings';
import { open } from '@tauri-apps/plugin-shell';
import { dataExplorerRefresh } from '@/utils/refreshEvents';
import { performHealthCheck } from '@/utils/healthCheck';
import type { AppConfig } from '@/types';

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
      setLanguage(values.language as 'zh-CN' | 'en-US');

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

      showMessage.success('设置已保存');
    } catch (saveError) {
      showMessage.error(`保存设置失败: ${saveError}`);
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
        showMessage.success('设置已重置为默认值');
      } else {
        // Tauri 环境：调用后端重置命令
        const defaultSettings = await safeTauriInvoke('reset_all_settings');
        if (defaultSettings) {
          // 更新前端配置
          setConfig(defaultSettings);
          form.reset(defaultSettings);

          // 触发全局刷新事件
          window.dispatchEvent(new CustomEvent('refresh-connections'));
          window.dispatchEvent(new CustomEvent('userPreferencesUpdated', {
            detail: null // 表示重置
          }));

          showMessage.success('所有配置已重置为默认值');
        }
      }
    } catch (error) {
      console.error('重置配置失败:', error);
      showMessage.error(`重置配置失败: ${error}`);
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
            showMessage.success('配置已导出到指定位置');
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
              showMessage.success('配置已导出');
            }
          }
        } catch (exportError) {
          if ((exportError as Error).name === 'AbortError') {
            showMessage.info('导出已取消');
          } else {
            throw exportError;
          }
        }
      } else {
        // Tauri 环境：调用后端导出命令
        await safeTauriInvoke('export_settings');
        showMessage.success('配置已导出');
      }
    } catch (error) {
      console.error('导出配置失败:', error);
      if (String(error).includes('取消')) {
        showMessage.info('导出已取消');
      } else {
        showMessage.error(`导出配置失败: ${error}`);
      }
    }
  };

  // 导入配置
  const importSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用文件输入
        showMessage.info('浏览器环境下的配置导入功能开发中...');
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
          showMessage.success('配置已导入并应用，连接配置已更新');
        } catch (refreshError) {
          console.warn('刷新连接列表失败:', refreshError);
          showMessage.success('配置已导入并应用');
        }
      }
    } catch (error) {
      console.error('导入配置失败:', error);
      if (String(error).includes('取消')) {
        showMessage.info('导入已取消');
      } else {
        showMessage.error(`导入配置失败: ${error}`);
      }
    }
  };



  const tabItems = [
    {
      key: 'general',
      icon: <Settings className='w-4 h-4' />,
      label: '常规设置',
      children: (
        <form onSubmit={form.handleSubmit((data) => saveSettings(data as AppConfig))} className='space-y-6 settings-content'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Monitor className='w-6 h-6 text-blue-600' />
              <div>
                <h2 className='text-2xl font-bold'>界面设置</h2>
                <p className='text-muted-foreground'>
                  自定义应用程序的外观和行为
                </p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='theme'>主题</Label>
                  <Select
                    value={theme}
                    onValueChange={value =>
                      setTheme(value as 'light' | 'dark' | 'system')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择主题' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='light'>浅色主题</SelectItem>
                      <SelectItem value='dark'>深色主题</SelectItem>
                      <SelectItem value='system'>跟随系统</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='language'>语言</Label>
                  <Select
                    value={form.watch('language') || config.language}
                    onValueChange={value => form.setValue('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择语言' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='zh-CN'>简体中文</SelectItem>
                      <SelectItem value='en-US'>English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 软件风格设置 */}
              <div className='space-y-4'>
                <div>
                  <Label className='text-base font-medium'>软件风格</Label>
                  <p className='text-sm text-muted-foreground'>
                    选择您喜欢的界面颜色主题
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
                  <Label htmlFor='autoSave'>自动保存</Label>
                </div>

                <div className='flex items-center space-x-2'>
                  <Switch
                    checked={form.watch('autoConnect') ?? config.autoConnect}
                    onCheckedChange={checked =>
                      form.setValue('autoConnect', checked)
                    }
                  />
                  <Label htmlFor='autoConnect'>自动连接</Label>
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
                          showMessage.success('已开启内部数据库显示并刷新列表');
                        } else {
                          showMessage.success('已关闭内部数据库显示并刷新列表');
                        }
                      }).catch(error => {
                        console.error('保存设置失败:', error);
                        showMessage.error('保存设置失败');
                        // 回滚设置
                        form.setValue('showInternalDatabases', !checked);
                      });
                    }}
                  />
                  <Label htmlFor='showInternalDatabases'>显示内部数据库</Label>
                </div>
                <div className='text-sm text-muted-foreground'>
                  <p>是否在数据源树中显示 _internal 等系统数据库</p>
                  <p className='text-xs mt-1 text-amber-600'>
                    注意：监控功能始终可用，无论此设置如何
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='logLevel'>日志级别</Label>
                  <Select
                    value={form.watch('logLevel') || config.logLevel}
                    onValueChange={value => form.setValue('logLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择日志级别' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='debug'>调试 (Debug)</SelectItem>
                      <SelectItem value='info'>信息 (Info)</SelectItem>
                      <SelectItem value='warn'>警告 (Warn)</SelectItem>
                      <SelectItem value='error'>错误 (Error)</SelectItem>
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
                <h2 className='text-2xl font-bold'>应用行为</h2>
                <p className='text-muted-foreground'>
                  配置应用程序的自动化行为
                </p>
              </div>
            </div>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='space-y-0.5'>
                    <Label className='text-base'>自动保存</Label>
                    <p className='text-sm text-muted-foreground'>
                      自动保存查询和配置更改
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
                    <Label className='text-base'>自动连接</Label>
                    <p className='text-sm text-muted-foreground'>
                      启动时自动连接到上次使用的数据库
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
                  <Label className='text-base font-medium'>系统健康检查</Label>
                  <p className='text-sm text-muted-foreground'>
                    检查性能监控系统的运行状态
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
                          showMessage.success('健康检查完成，系统运行正常');
                        }
                      } catch (error) {
                        showMessage.error(`健康检查失败: ${error}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    <Monitor className='w-4 h-4 mr-2' />
                    执行健康检查
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-4 pb-4 border-t bg-background sticky'>
            <Button
              type='button'
              variant='outline'
              onClick={handleResetSettings}
            >
              <RefreshCw className='w-4 h-4 mr-2' />
              重置为默认
            </Button>
            <Button type='submit' disabled={loading}>
              <Save className='w-4 h-4 mr-2' />
              保存设置
            </Button>
          </div>
        </form>
      ),
    },
    {
      key: 'query',
      icon: <Shield className='w-4 h-4' />,
      label: '查询设置',
      children: <ControllerSettings />,
    },
    {
      key: 'preferences',
      icon: <User className='w-4 h-4' />,
      label: '用户偏好',
      children: <UserPreferencesComponent />,
    },
    {
      key: 'config',
      icon: <Database className='w-4 h-4' />,
      label: '配置管理',
      children: (
        <div className='space-y-6'>
          <div>
            <h4 className='text-sm font-medium mb-3'>配置备份与恢复</h4>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <Button
                variant='outline'
                onClick={exportSettings}
                className='w-full justify-start'
              >
                <FileDown className='w-4 h-4 mr-2' />
                导出配置
              </Button>
              <Button
                variant='outline'
                onClick={importSettings}
                className='w-full justify-start'
              >
                <FileUp className='w-4 h-4 mr-2' />
                导入配置
              </Button>
              <Button
                variant='outline'
                onClick={handleResetSettings}
                className='w-full justify-start'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                重置所有配置
              </Button>
            </div>
            <Alert className='mt-4'>
              <Info className='h-4 w-4' />
              <div>
                <h5 className='font-medium'>配置说明</h5>
                <p className='text-sm text-muted-foreground mt-1'>
                  • <strong>导出配置</strong>：将当前所有应用设置、连接配置、用户偏好保存到文件<br/>
                  • <strong>导入配置</strong>：从配置文件恢复应用设置、连接配置、用户偏好<br/>
                  • <strong>重置配置</strong>：将所有设置恢复为默认值（不影响连接配置）
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
      label: '用户引导',
      children: (
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center gap-3 mb-4'>
            <Bell className='w-6 h-6 text-blue-600' />
            <div>
              <h2 className='text-2xl font-bold'>用户引导</h2>
              <p className='text-muted-foreground'>管理用户引导和帮助提示</p>
            </div>
          </div>

          {/* 用户引导设置 */}
          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <div className='mb-4'>
                <h4 className='text-base font-medium'>启动时展示用户引导</h4>
                <p className='text-sm text-muted-foreground'>
                  控制应用启动时是否自动显示用户引导
                </p>
              </div>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label className='text-sm'>启用启动引导</Label>
                  <p className='text-xs text-muted-foreground'>
                    开启后，每次启动应用时会显示用户引导
                  </p>
                </div>
                <Switch
                  checked={!browserModeNoticeDismissed}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      resetNoticeSettings();
                      showMessage.success('已启用启动引导，下次启动时会显示用户引导');
                    } else {
                      useNoticeStore.getState().dismissBrowserModeNotice();
                      showMessage.success('已关闭启动引导');
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
                查看用户引导
              </Button>
              <Button
                variant='outline'
                onClick={() => {
                  resetNoticeSettings();
                  showMessage.success(
                    '引导设置已重置，下次启动时会再次显示用户引导'
                  );
                }}
                className='w-full justify-start'
              >
                <RefreshCw className='w-4 h-4 mr-2' />
                重置引导设置
              </Button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'updates',
      icon: <Download className='w-4 h-4' />,
      label: '更新设置',
      children: <UpdateSettings />,
    },
    {
      key: 'about-app',
      icon: <Info className='w-4 h-4' />,
      label: '关于',
      children: (
        <div className='space-y-6'>
          <div>
            <div className='flex items-center gap-3 mb-4'>
              <Info className='w-6 h-6 text-blue-600' />
              <div>
                <h2 className='text-2xl font-bold'>关于 InfloWave</h2>
                <p className='text-muted-foreground'>
                  现代化的 InfluxDB 数据库管理工具
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-4'>
            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>应用信息</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>应用名称:</span>
                  <span>InfloWave</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>版本:</span>
                  <span>1.1.1</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>构建时间:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>开源项目</h4>
              <p className='text-sm text-muted-foreground mb-3'>
                InfloWave 是一个开源项目，欢迎贡献代码和反馈问题。
              </p>
              <Button
                variant='outline'
                onClick={async () => {
                  try {
                    if (isBrowserEnvironment()) {
                      window.open('https://github.com/chenqi92/inflowave', '_blank');
                    } else {
                      await open('https://github.com/chenqi92/inflowave');
                    }
                    showMessage.success('正在打开GitHub项目页面');
                  } catch (error) {
                    console.error('打开GitHub页面失败:', error);
                    showMessage.error('打开GitHub页面失败');
                  }
                }}
                className='w-full justify-start'
              >
                <ExternalLink className='w-4 h-4 mr-2' />
                访问 GitHub 项目
              </Button>
            </div>

            <div className='p-4 border rounded-lg'>
              <h4 className='font-medium mb-2'>技术栈</h4>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>前端:</span>
                  <span>React + TypeScript</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>后端:</span>
                  <span>Rust + Tauri</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>UI框架:</span>
                  <span>Shadcn/ui</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>数据库:</span>
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
              偏好设置
            </DialogTitle>
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
                    <div className='max-w-3xl h-full pb-6'>{item.children}</div>
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
