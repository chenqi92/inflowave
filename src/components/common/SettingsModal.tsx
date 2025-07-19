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
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import NotificationTest from '@/components/debug/NotificationTest';
import UserPreferencesComponent from '@/components/settings/UserPreferences';
import ControllerSettings from '@/components/settings/ControllerSettings';
import UserGuideModal from '@/components/common/UserGuideModal';
import { useNoticeStore } from '@/store/notice';
import { UpdateSettings } from '@/components/updater/UpdateSettings';
import { open } from '@tauri-apps/plugin-shell';
import type { AppConfig } from '@/types';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const dialog = useDialog();
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const { config, setConfig, setLanguage, resetConfig } = useAppStore();
  const { clearConnections } = useConnectionStore();
  const { resetNoticeSettings } = useNoticeStore();
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
        setTheme(values.theme as 'light' | 'dark' | 'system' | 'auto');
      }

      // 应用语言设置
      setLanguage(values.language as 'zh-CN' | 'en-US');

      // 保存到后端
      try {
        // 构建符合后端期望的设置结构
        const appSettings = {
          general: {
            theme: values.theme || 'auto',
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
  const handleResetSettings = () => {
    resetConfig();
    // 延迟设置表单值，确保 store 状态已更新
    setTimeout(() => {
      const latestConfig = useAppStore.getState().config;
      form.reset(latestConfig);
    }, 0);
    showMessage.success('设置已重置为默认值');
  };

  // 导出设置
  const exportSettings = async () => {
    try {
      const settings = {
        appConfig: config,
        connections: useConnectionStore.getState().connections,
        exportTime: new Date().toISOString(),
        version: '1.0.0',
      };

      if (isBrowserEnvironment()) {
        // 浏览器环境：显示文件保存对话框
        try {
          // 尝试使用现代浏览器的文件系统访问API
          if ('showSaveFilePicker' in window) {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: `inflowave-settings-${new Date().toISOString().split('T')[0]}.json`,
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
            showMessage.success('设置已导出到指定位置');
          } else {
            // 使用原生文件保存对话框作为降级方案
            const success = await saveJsonFile(settings, {
              filename: `inflowave-settings-${new Date().toISOString().split('T')[0]}.json`,
              filters: [
                { name: '配置文件', extensions: ['json'] },
                { name: '所有文件', extensions: ['*'] }
              ]
            });
            
            if (success) {
              showMessage.success('设置已导出');
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
        // Tauri 环境：调用原生文件保存对话框
        await safeTauriInvoke('export_settings', { settings });
        showMessage.success('设置已导出');
      }
    } catch (error) {
      console.error('导出设置失败:', error);
      showMessage.error(`导出设置失败: ${error}`);
    }
  };

  // 导入设置
  const importSettings = async () => {
    try {
      // 使用原生文件选择对话框
      const settings = await safeTauriInvoke('import_settings');
      if (settings) {
        setConfig(settings.appConfig);
        form.reset(settings.appConfig);
        showMessage.success('设置已导入');
      }
    } catch (error) {
      console.error('导入设置失败:', error);
      showMessage.error(`导入设置失败: ${error}`);
    }
  };

  // 清除所有数据
  const clearAllData = () => {
    clearConnections();
    resetConfig();
    setTimeout(() => {
      const latestConfig = useAppStore.getState().config;
      form.reset(latestConfig);
    }, 0);
    showMessage.success('所有数据已清除');
  };

  // 清除连接配置（带确认）
  const clearConnectionsWithConfirm = () => {
    clearConnections();
    showMessage.success('连接配置已清除');
  };

  const tabItems = [
    {
      key: 'general',
      icon: <Settings className='w-4 h-4' />,
      label: '常规设置',
      children: (
        <form onSubmit={form.handleSubmit((data) => saveSettings(data as AppConfig))} className='space-y-6'>
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
                      setTheme(value as 'light' | 'dark' | 'system' | 'auto')
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择主题' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='light'>浅色主题</SelectItem>
                      <SelectItem value='dark'>深色主题</SelectItem>
                      <SelectItem value='system'>跟随系统</SelectItem>
                      <SelectItem value='auto'>跟随系统</SelectItem>
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
      key: 'data',
      icon: <Database className='w-4 h-4' />,
      label: '数据管理',
      children: (
        <div className='space-y-6'>
          <div>
            <h4 className='text-sm font-medium mb-3'>数据备份与恢复</h4>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <Button
                variant='outline'
                onClick={exportSettings}
                className='w-full justify-start'
              >
                <FileDown className='w-4 h-4 mr-2' />
                导出设置
              </Button>
              <Button
                variant='outline'
                onClick={importSettings}
                className='w-full justify-start'
              >
                <FileUp className='w-4 h-4 mr-2' />
                导入设置
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className='text-sm font-medium mb-2 text-destructive'>
              危险操作区域
            </h4>
            <Alert className='mb-4'>
              <Info className='h-4 w-4' />
              <h5 className='font-medium'>注意</h5>
              <p className='text-sm text-muted-foreground'>
                以下操作将永久删除数据，请谨慎操作。建议在执行前先导出设置备份。
              </p>
            </Alert>

            <div className='space-y-4'>
              <div className='p-4 border rounded-lg'>
                <div className='mb-2'>
                  <p className='font-medium text-sm'>清除所有连接配置</p>
                  <p className='text-sm text-muted-foreground'>
                    删除所有保存的数据库连接配置
                  </p>
                </div>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={async () => {
                    const confirmed = await dialog.confirm(
                      '此操作将删除所有保存的数据库连接配置，且无法恢复。您确定要继续吗？'
                    );
                    if (confirmed) {
                      clearConnectionsWithConfirm();
                    }
                  }}
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  清除连接配置
                </Button>
              </div>

              <div className='p-4 border rounded-lg'>
                <div className='mb-2'>
                  <p className='font-medium text-sm'>重置所有设置</p>
                  <p className='text-sm text-muted-foreground'>
                    将所有设置恢复为默认值，并清除所有用户数据
                  </p>
                </div>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={async () => {
                    const confirmed = await dialog.confirm(
                      '此操作将删除所有连接配置和应用设置，且无法恢复。您确定要继续吗？'
                    );
                    if (confirmed) {
                      clearAllData();
                    }
                  }}
                >
                  <Trash2 className='w-4 h-4 mr-2' />
                  重置所有设置
                </Button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'about',
      icon: <Info className='w-4 h-4' />,
      label: '关于',
      children: (
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center gap-3 mb-4'>
            <Info className='w-6 h-6 text-blue-600' />
            <div>
              <h2 className='text-2xl font-bold'>关于应用</h2>
              <p className='text-muted-foreground'>应用信息和版本详情</p>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <p className='font-medium text-sm mb-1'>版本信息</p>
                <p className='text-sm text-muted-foreground'>v0.1.0-alpha</p>
              </div>

              <div>
                <p className='font-medium text-sm mb-1'>构建时间</p>
                <p className='text-sm text-muted-foreground'>
                  {new Date().toLocaleDateString()}
                </p>
              </div>

              <div>
                <p className='font-medium text-sm mb-1'>技术栈</p>
                <p className='text-sm text-muted-foreground'>
                  React + TypeScript + Rust + Tauri
                </p>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <p className='font-medium text-sm mb-1'>支持的 InfluxDB 版本</p>
                <p className='text-sm text-muted-foreground'>InfluxDB 1.x</p>
              </div>

              <div>
                <p className='font-medium text-sm mb-1'>开源协议</p>
                <p className='text-sm text-muted-foreground'>MIT License</p>
              </div>

              <div>
                <p className='font-medium text-sm mb-1'>项目地址</p>
                <p className='text-sm text-primary hover:text-blue-800 cursor-pointer'>
                  GitHub Repository
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <Alert>
            <Info className='h-4 w-4' />
            <h5 className='font-medium mb-2'>功能特性</h5>
            <ul className='space-y-1 text-sm text-muted-foreground'>
              <li>• 现代化的用户界面设计</li>
              <li>• 安全的连接管理和密码加密</li>
              <li>• 强大的查询编辑器和结果展示</li>
              <li>• 灵活的数据可视化功能</li>
              <li>• 便捷的数据写入和导入工具</li>
              <li>• 跨平台支持 (Windows, macOS, Linux)</li>
            </ul>
          </Alert>
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

          <div>
            <h4 className='text-sm font-medium mb-2'>预览模式说明</h4>
            <p className='text-sm text-muted-foreground'>
              管理在浏览器环境中运行时显示的功能说明提醒。
            </p>
          </div>

          {isBrowserEnvironment() && (
            <div className='space-y-4'>
              <Alert>
                <Info className='h-4 w-4' />
                <h5 className='font-medium'>当前运行在浏览器预览模式</h5>
                <p className='text-sm text-muted-foreground'>
                  您可以重新查看功能说明，或者重置提醒设置。
                </p>
              </Alert>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <Button
                  onClick={() => setUserGuideVisible(true)}
                  className='w-full justify-start'
                >
                  <Info className='w-4 h-4 mr-2' />
                  查看用户指引
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    resetNoticeSettings();
                    showMessage.success(
                      '提醒设置已重置，下次启动时会再次显示功能说明'
                    );
                  }}
                  className='w-full justify-start'
                >
                  <RefreshCw className='w-4 h-4 mr-2' />
                  重置提醒设置
                </Button>
              </div>
            </div>
          )}

          {!isBrowserEnvironment() && (
            <Alert>
              <Info className='h-4 w-4' />
              <h5 className='font-medium'>当前运行在桌面应用模式</h5>
              <p className='text-sm text-muted-foreground'>
                桌面应用环境中不需要显示浏览器模式提醒。
              </p>
            </Alert>
          )}
        </div>
      ),
    },
    {
      key: 'developer',
      icon: <Bug className='w-4 h-4' />,
      label: '开发者工具',
      children: (
        <div className='space-y-6'>
          {/* 页面标题 */}
          <div className='flex items-center gap-3 mb-4'>
            <Bug className='w-6 h-6 text-blue-600' />
            <div>
              <h2 className='text-2xl font-bold'>开发者工具</h2>
              <p className='text-muted-foreground'>调试和诊断工具</p>
            </div>
          </div>

          {/* 错误测试工具 - 仅开发环境显示 */}
          {(import.meta as any).env?.DEV && (
            <div>
              <h4 className='text-sm font-medium mb-2'>错误测试工具</h4>
            </div>
          )}

          {/* 通知功能测试 */}
          <div>
            <h4 className='text-sm font-medium mb-2'>通知功能测试</h4>
            <p className='text-sm text-muted-foreground mb-3'>
              测试各种通知功能是否正常工作，包括Toast通知和桌面通知。
            </p>
            <div className='p-3 bg-muted/50 border rounded-lg'>
              <NotificationTest />
            </div>
          </div>

          <div>
            <h4 className='text-sm font-medium mb-2'>应用错误日志</h4>
            <p className='text-sm text-muted-foreground mb-3'>
              查看和分析应用程序运行时的错误日志，帮助诊断问题和改进应用性能。
            </p>
            <div className='p-3 bg-muted/50 border rounded-lg min-h-[200px]'>
              {isBrowserEnvironment() ? (
                <Alert>
                  <Info className='h-4 w-4' />
                  <h5 className='font-medium'>浏览器环境提示</h5>
                  <p className='text-sm text-muted-foreground'>
                    在浏览器环境中，错误日志将显示在开发者工具的控制台中。请按F12打开开发者工具查看详细日志。
                  </p>
                </Alert>
              ) : (
                <ErrorLogViewer />
              )}
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
      key: 'about',
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
              defaultValue='general'
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
