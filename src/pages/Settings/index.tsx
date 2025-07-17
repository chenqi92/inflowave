import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Text,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Switch,
  Separator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import {
  Save,
  RefreshCw,
  Trash2,
  Info,
  FileDown,
  FileUp,
  Settings as SettingsIcon,
  Database,
  User,
  Bug,
  ChevronLeft,
  Home,
  Bell,
  Download,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import UserPreferences from '@/components/settings/UserPreferences';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import UserGuideModal from '@/components/common/UserGuideModal';
import { UpdateSettings } from '@/components/updater/UpdateSettings';
import { useNoticeStore } from '@/store/notice';
import { isBrowserEnvironment } from '@/utils/tauri';
import { toast } from 'sonner';
import type { AppConfig } from '@/types';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [userGuideVisible, setUserGuideVisible] = useState(false);
  const navigate = useNavigate();
  const { config, setConfig, setTheme, setLanguage, resetConfig } =
    useAppStore();

  // 使用 memo 来确保 config 对象稳定性
  const stableConfig = useMemo(
    () => config,
    [
      config.theme,
      config.language,
      config.queryTimeout,
      config.maxQueryResults,
      config.autoSave,
      config.autoConnect,
      config.logLevel,
    ]
  );
  const { clearConnections } = useConnectionStore();
  const { resetNoticeSettings } = useNoticeStore();

  // 初始化表单值
  useEffect(() => {
    form.reset(stableConfig);
  }, [stableConfig]); // 使用稳定的 config 对象

  // 保存设置
  const saveSettings = async (values: AppConfig) => {
    setLoading(true);
    try {
      // 更新本地状态
      setConfig(values);

      // 应用主题设置
      setTheme(values.theme);

      // 应用语言设置
      setLanguage(values.language);

      // 保存到后端（如果需要）
      try {
        await safeTauriInvoke('save_app_config', { config: values });
      } catch (error) {
        console.warn('保存配置到后端失败:', error);
      }

      showMessage.success('设置已保存');
    } catch (error) {
      showNotification.error({
        message: '保存设置失败',
        description: String(error),
      });
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
        // 浏览器环境：下载为JSON文件
        const blob = new Blob([JSON.stringify(settings, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inflowave-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage.success('设置已导出到下载文件夹');
      } else {
        // Tauri 环境：调用原生文件保存对话框
        await safeTauriInvoke('export_settings', { settings });
        showMessage.success('设置已导出');
      }
    } catch (error) {
      console.error('导出设置失败:', error);
      showNotification.error({
        message: '导出设置失败',
        description: String(error),
      });
    }
  };

  // 导入设置
  const importSettings = async () => {
    try {
      if (isBrowserEnvironment()) {
        // 浏览器环境：使用文件输入
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const text = await file.text();
              const settings = JSON.parse(text);

              if (settings.appConfig) {
                setConfig(settings.appConfig);
                form.reset(settings.appConfig);
                showMessage.success('设置已导入');
              } else {
                showMessage.error('无效的设置文件格式');
              }
            } catch (parseError) {
              console.error('解析设置文件失败:', parseError);
              showMessage.error('设置文件格式错误');
            }
          }
        };
        input.click();
      } else {
        // Tauri 环境：调用原生文件选择对话框
        const settings = await safeTauriInvoke('import_settings');
        if (settings) {
          setConfig(settings.appConfig);
          form.reset(settings.appConfig);
          showMessage.success('设置已导入');
        }
      }
    } catch (error) {
      console.error('导入设置失败:', error);
      showNotification.error({
        message: '导入设置失败',
        description: String(error),
      });
    }
  };

  // 清除所有数据
  const clearAllData = () => {
    toast.error('确认重置所有设置', {
      description: '此操作将删除所有连接配置和应用设置，且无法恢复。您确定要继续吗？',
      action: {
        label: '确认重置',
        onClick: () => {
          clearConnections();
          resetConfig();
          setTimeout(() => {
            const latestConfig = useAppStore.getState().config;
            form.reset(latestConfig);
          }, 0);
          showMessage.success('所有数据已清除');
        },
      },
      duration: 10000,
    });
  };

  // 清除连接配置（带确认）
  const clearConnectionsWithConfirm = () => {
    toast.error('确认清除连接配置', {
      description: '此操作将删除所有保存的数据库连接配置，且无法恢复。您确定要继续吗？',
      action: {
        label: '确认清除',
        onClick: () => {
          clearConnections();
          showMessage.success('连接配置已清除');
        },
      },
      duration: 10000,
    });
  };

  return (
    <div className='settings-page'>
      {/* 页面头部 */}
      <div className='settings-header bg-background border-b border px-6 py-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => navigate(-1)}
              className='flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted cursor-pointer'
              title='返回'
            >
              <ChevronLeft className='w-4 h-4' />
            </Button>
            <div>
              <h1 className='text-2xl font-bold mb-1'>
                应用设置
              </h1>
              <Text className='text-sm text-muted-foreground'>
                配置应用程序的行为和外观，个性化您的使用体验
              </Text>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <Button
              onClick={() => navigate('/')}
              variant='outline'
              className='cursor-pointer'
            >
              <Home className='w-4 h-4 mr-2' />
              返回主页
            </Button>
          </div>
        </div>
      </div>

      {/* 设置内容 */}
      <div className='settings-content p-6 max-w-6xl mx-auto'>
        <div className='space-y-6'>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className='w-4 h-4' />
                <span>常规设置</span>
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className='w-4 h-4' />
                <span>数据管理</span>
              </TabsTrigger>
              <TabsTrigger value="updates" className="flex items-center gap-2">
                <Download className='w-4 h-4' />
                <span>更新设置</span>
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className='w-4 h-4' />
                <span>关于</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <User className='w-4 h-4' />
                <span>用户偏好</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className='w-4 h-4' />
                <span>通知设置</span>
              </TabsTrigger>
              <TabsTrigger value="developer" className="flex items-center gap-2">
                <Bug className='w-4 h-4' />
                <span>开发者工具</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>基础配置</CardTitle>
                  <Text className='text-muted-foreground'>
                    设置应用程序的基本行为和外观
                  </Text>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(saveSettings)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="theme"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>主题</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择应用程序的外观主题" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="light">浅色主题</SelectItem>
                                  <SelectItem value="dark">深色主题</SelectItem>
                                  <SelectItem value="auto">跟随系统</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="language"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>语言</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择应用程序的显示语言" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="zh-CN">简体中文</SelectItem>
                                  <SelectItem value="en-US">English</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="queryTimeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>查询超时时间 (毫秒)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1000}
                                  max={300000}
                                  step={1000}
                                  placeholder="查询执行的最大等待时间"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="maxQueryResults"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>最大查询结果数</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={100}
                                  max={100000}
                                  step={100}
                                  placeholder="单次查询返回的最大行数"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="autoSave"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">自动保存</FormLabel>
                                <Text className="text-sm text-muted-foreground">
                                  自动保存查询和配置
                                </Text>
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
                          name="autoConnect"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">自动连接</FormLabel>
                                <Text className="text-sm text-muted-foreground">
                                  启动时自动连接到上次使用的数据库
                                </Text>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="logLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>日志级别</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="设置应用程序的日志详细程度" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="debug">调试 (Debug)</SelectItem>
                                  <SelectItem value="info">信息 (Info)</SelectItem>
                                  <SelectItem value="warn">警告 (Warn)</SelectItem>
                                  <SelectItem value="error">错误 (Error)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <div className='flex gap-2 pt-4'>
                        <Button
                          type="submit"
                          disabled={loading}
                          className='cursor-pointer'
                        >
                          <Save className='w-4 h-4 mr-2' />
                          保存设置
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleResetSettings}
                          className='cursor-pointer'
                        >
                          <RefreshCw className='w-4 h-4 mr-2' />
                          重置为默认
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="data" className="mt-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>数据备份与恢复</CardTitle>
                    <Text className='text-muted-foreground'>
                      您可以导出当前的应用设置和连接配置，或从文件中导入设置。
                    </Text>
                  </CardHeader>
                  <CardContent>
                    <div className='flex gap-2'>
                      <Button
                        variant="outline"
                        onClick={exportSettings}
                        className='cursor-pointer'
                      >
                        <FileDown className='w-4 h-4 mr-2' />
                        导出设置
                      </Button>
                      <Button
                        variant="outline"
                        onClick={importSettings}
                        className='cursor-pointer'
                      >
                        <FileUp className='w-4 h-4 mr-2' />
                        导入设置
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-destructive bg-destructive/5">
                  <CardHeader>
                    <CardTitle className="text-destructive">危险操作区域</CardTitle>
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertDescription className="text-yellow-800">
                        以下操作将永久删除数据，请谨慎操作。建议在执行前先导出设置备份。
                      </AlertDescription>
                    </Alert>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <div>
                        <Text className="font-semibold">清除所有连接配置</Text>
                        <Text className="text-sm text-muted-foreground">
                          删除所有保存的数据库连接配置
                        </Text>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={clearConnectionsWithConfirm}
                        className='cursor-pointer'
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
                        清除连接配置
                      </Button>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div>
                        <Text className="font-semibold">重置所有设置</Text>
                        <Text className="text-sm text-muted-foreground">
                          将所有设置恢复为默认值，并清除所有用户数据
                        </Text>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={clearAllData}
                        className='cursor-pointer'
                      >
                        <Trash2 className='w-4 h-4 mr-2' />
                        重置所有设置
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="updates" className="mt-6">
              <UpdateSettings />
            </TabsContent>

            <TabsContent value="about" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>关于 InfloWave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className='space-y-4'>
                      <div>
                        <Text className='font-semibold text-lg'>
                          版本信息
                        </Text>
                        <Text className='text-base text-muted-foreground'>v0.1.0-alpha</Text>
                      </div>

                      <div>
                        <Text className='font-semibold text-lg'>
                          构建时间
                        </Text>
                        <Text className='text-base text-muted-foreground'>
                          {new Date().toLocaleDateString()}
                        </Text>
                      </div>

                      <div>
                        <Text className='font-semibold text-lg'>
                          技术栈
                        </Text>
                        <Text className='text-base text-muted-foreground'>
                          React + TypeScript + Rust + Tauri
                        </Text>
                      </div>
                    </div>

                    <div className='space-y-4'>
                      <div>
                        <Text className='font-semibold text-lg'>
                          支持的 InfluxDB 版本
                        </Text>
                        <Text className='text-base text-muted-foreground'>InfluxDB 1.x</Text>
                      </div>

                      <div>
                        <Text className='font-semibold text-lg'>
                          开源协议
                        </Text>
                        <Text className='text-base text-muted-foreground'>MIT License</Text>
                      </div>

                      <div>
                        <Text className='font-semibold text-lg'>
                          项目地址
                        </Text>
                        <Text className='text-base text-primary hover:text-blue-800 cursor-pointer'>
                          GitHub Repository
                        </Text>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-6" />

                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className='w-4 h-4 text-blue-600' />
                    <AlertDescription className="text-blue-800">
                      <div className="font-medium mb-2">功能特性</div>
                      <ul className='space-y-1'>
                        <li>• 现代化的用户界面设计</li>
                        <li>• 安全的连接管理和密码加密</li>
                        <li>• 强大的查询编辑器和结果展示</li>
                        <li>• 灵活的数据可视化功能</li>
                        <li>• 便捷的数据写入和导入工具</li>
                        <li>• 跨平台支持 (Windows, macOS, Linux)</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="preferences" className="mt-6">
              <Card>
                <CardContent>
                  <UserPreferences />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>预览模式说明</CardTitle>
                  <Text className='text-muted-foreground'>
                    管理在浏览器环境中运行时显示的功能说明提醒。
                  </Text>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className='w-4 h-4 text-blue-600' />
                    <AlertDescription className="text-blue-800">
                      <div className="font-medium mb-2">用户指引设置</div>
                      <div>您可以重新查看用户指引，或者重置启动时的指引显示设置。</div>
                    </AlertDescription>
                  </Alert>

                  <div className='flex gap-2'>
                    <Button
                      onClick={() => setUserGuideVisible(true)}
                      className='cursor-pointer'
                    >
                      <Info className='w-4 h-4 mr-2' />
                      查看用户指引
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetNoticeSettings();
                        showMessage.success(
                          '提醒设置已重置，下次启动时会再次显示用户指引'
                        );
                      }}
                      className='cursor-pointer'
                    >
                      <RefreshCw className='w-4 h-4 mr-2' />
                      重置提醒设置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="developer" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>应用错误日志</CardTitle>
                  <Text className='text-muted-foreground'>
                    查看和分析应用程序运行时的错误日志，帮助诊断问题和改进应用性能。
                  </Text>
                </CardHeader>
                <CardContent>
                  <ErrorLogViewer />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 用户指引弹框 */}
        <UserGuideModal
          isOpen={userGuideVisible}
          onClose={() => setUserGuideVisible(false)}
        />
      </div>
    </div>
  );
};

export default Settings;
