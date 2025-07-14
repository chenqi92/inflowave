import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Alert, Tabs, TabsContent, TabsList, TabsTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input, InputNumber, Switch, Separator, Label, toast } from '@/components/ui';
import { Save, RefreshCw, Trash2, Settings, Database, Bug, Bell, FileDown, FileUp } from 'lucide-react';
import { Info } from 'lucide-react';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import ErrorTestButton from '@/components/test/ErrorTestButton';
import BrowserModeModal from '@/components/common/BrowserModeModal';
import { useNoticeStore } from '@/store/notice';
import type { AppConfig } from '@/types';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [browserModalVisible, setBrowserModalVisible] = useState(false);
  const { config, setConfig, setTheme, setLanguage, resetConfig } = useAppStore();
  const { clearConnections } = useConnectionStore();
  const { resetNoticeSettings } = useNoticeStore();

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

      // 应用主题设置
      setTheme(values.theme);

      // 应用语言设置
      setLanguage(values.language);

      // 保存到后端（如果需要）
      try {
        await safeTauriInvoke('save_app_config', { config: values });
      } catch (saveError) {
        console.warn('保存配置到后端失败:', saveError);
      }

      toast({ title: "成功", description: "设置已保存" });
    } catch (saveError) {
      toast({ title: "错误", description: `保存设置失败: ${saveError}`, variant: "destructive" });
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
    toast({ title: "成功", description: "设置已重置为默认值" });
  };

  // 导出设置
  const exportSettings = async () => {
    try {
      const settings = {
        appConfig: config,
        connections: useConnectionStore.getState().connections,
        exportTime: new Date().toISOString(),
        version: '1.0.0'};

      if (isBrowserEnvironment()) {
        // 浏览器环境：显示文件保存对话框
        try {
          // 尝试使用现代浏览器的文件系统访问API
          if ('showSaveFilePicker' in window) {
            const fileHandle = await (window as any).showSaveFilePicker({
              suggestedName: `inflowave-settings-${new Date().toISOString().split('T')[0]}.json`,
              types: [{
                description: 'JSON files',
                accept: { 'application/json': ['.json'] }}]});
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(settings, null, 2));
            await writable.close();
            toast({ title: "成功", description: "设置已导出到指定位置" });
          } else {
            // 降级到传统下载方式
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inflowave-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "成功", description: "设置已导出到下载文件夹" });
          }
        } catch (exportError) {
          if ((exportError as Error).name === 'AbortError') {
            toast({ title: "信息", description: "导出已取消" });
          } else {
            throw exportError;
          }
        }
      } else {
        // Tauri 环境：调用原生文件保存对话框
        await safeTauriInvoke('export_settings', { settings });
        toast({ title: "成功", description: "设置已导出" });
      }
    } catch (error) {
      console.error('导出设置失败:', error);
      toast({ title: "错误", description: "导出设置失败: ${error}", variant: "destructive" });
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
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            try {
              const text = await file.text();
              const settings = JSON.parse(text);
              
              if (settings.appConfig) {
                setConfig(settings.appConfig);
                form.reset(settings.appConfig);
                toast({ title: "成功", description: "设置已导入" });
              } else {
                toast({ title: "错误", description: "无效的设置文件格式", variant: "destructive" });
              }
            } catch (parseError) {
              console.error('解析设置文件失败:', parseError);
              toast({ title: "错误", description: "设置文件格式错误", variant: "destructive" });
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
          toast({ title: "成功", description: "设置已导入" });
        }
      }
    } catch (error) {
      console.error('导入设置失败:', error);
      toast({ title: "错误", description: "导入设置失败: ${error}", variant: "destructive" });
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
    toast({ title: "成功", description: "所有数据已清除" });
  };

  // 清除连接配置（带确认）
  const clearConnectionsWithConfirm = () => {
    clearConnections();
    toast({ title: "成功", description: "连接配置已清除" });
  };

  const tabItems = [
    {
      key: 'general',
      icon: <Settings className="w-4 h-4" />,
      label: '常规设置',
      children: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="theme">主题</Label>
              <Select 
                value={form.watch('theme') || config.theme}
                onValueChange={(value) => form.setValue('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择主题" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">浅色主题</SelectItem>
                  <SelectItem value="dark">深色主题</SelectItem>
                  <SelectItem value="auto">跟随系统</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">语言</Label>
              <Select 
                value={form.watch('language') || config.language}
                onValueChange={(value) => form.setValue('language', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择语言" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="queryTimeout">查询超时时间 (毫秒)</Label>
              <InputNumber
                min={1000}
                max={300000}
                step={1000}
                value={form.watch('queryTimeout') || config.queryTimeout}
                onChange={(value) => form.setValue('queryTimeout', value || 30000)}
                placeholder="输入超时时间"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxQueryResults">最大查询结果数</Label>
              <InputNumber
                min={100}
                max={100000}
                step={100}
                value={form.watch('maxQueryResults') || config.maxQueryResults}
                onChange={(value) => form.setValue('maxQueryResults', value || 10000)}
                placeholder="输入结果数量"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch('autoSave') ?? config.autoSave}
                onCheckedChange={(checked) => form.setValue('autoSave', checked)}
              />
              <Label htmlFor="autoSave">自动保存</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch('autoConnect') ?? config.autoConnect}
                onCheckedChange={(checked) => form.setValue('autoConnect', checked)}
              />
              <Label htmlFor="autoConnect">自动连接</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logLevel">日志级别</Label>
              <Select 
                value={form.watch('logLevel') || config.logLevel}
                onValueChange={(value) => form.setValue('logLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择日志级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debug">调试 (Debug)</SelectItem>
                  <SelectItem value="info">信息 (Info)</SelectItem>
                  <SelectItem value="warn">警告 (Warn)</SelectItem>
                  <SelectItem value="error">错误 (Error)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleResetSettings}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重置为默认
            </Button>
            <Button
              onClick={() => saveSettings(form.getValues())}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              保存设置
            </Button>
          </div>
        </div>
      )},
    {
      key: 'data',
      icon: <Database className="w-4 h-4" />,
      label: '数据管理',
      children: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">数据备份与恢复</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportSettings}
              >
                <FileDown className="w-4 h-4 mr-2" />
                导出设置
              </Button>
              <Button
                variant="outline"
                onClick={importSettings}
              >
                <FileUp className="w-4 h-4 mr-2" />
                导入设置
              </Button>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-2 text-destructive">危险操作区域</h4>
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <h5 className="font-medium">注意</h5>
              <p className="text-sm text-muted-foreground">
                以下操作将永久删除数据，请谨慎操作。建议在执行前先导出设置备份。
              </p>
            </Alert>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="mb-2">
                  <p className="font-medium text-sm">清除所有连接配置</p>
                  <p className="text-sm text-muted-foreground">
                    删除所有保存的数据库连接配置
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('此操作将删除所有保存的数据库连接配置，且无法恢复。您确定要继续吗？')) {
                      clearConnectionsWithConfirm();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除连接配置
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="mb-2">
                  <p className="font-medium text-sm">重置所有设置</p>
                  <p className="text-sm text-muted-foreground">
                    将所有设置恢复为默认值，并清除所有用户数据
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('此操作将删除所有连接配置和应用设置，且无法恢复。您确定要继续吗？')) {
                      clearAllData();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  重置所有设置
                </Button>
              </div>
            </div>
          </div>
        </div>
      )},
    {
      key: 'about',
      icon: <Info className="w-4 h-4" />,
      label: '关于',
      children: (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1">版本信息</p>
                <p className="text-sm text-muted-foreground">v0.1.0-alpha</p>
              </div>

              <div>
                <p className="font-medium text-sm mb-1">构建时间</p>
                <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString()}</p>
              </div>

              <div>
                <p className="font-medium text-sm mb-1">技术栈</p>
                <p className="text-sm text-muted-foreground">React + TypeScript + Rust + Tauri</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-medium text-sm mb-1">支持的 InfluxDB 版本</p>
                <p className="text-sm text-muted-foreground">InfluxDB 1.x</p>
              </div>

              <div>
                <p className="font-medium text-sm mb-1">开源协议</p>
                <p className="text-sm text-muted-foreground">MIT License</p>
              </div>

              <div>
                <p className="font-medium text-sm mb-1">项目地址</p>
                <p className="text-sm text-primary hover:text-blue-800 cursor-pointer">GitHub Repository</p>
              </div>
            </div>
          </div>

          <Separator />

          <Alert>
            <Info className="h-4 w-4" />
            <h5 className="font-medium mb-2">功能特性</h5>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 现代化的用户界面设计</li>
              <li>• 安全的连接管理和密码加密</li>
              <li>• 强大的查询编辑器和结果展示</li>
              <li>• 灵活的数据可视化功能</li>
              <li>• 便捷的数据写入和导入工具</li>
              <li>• 跨平台支持 (Windows, macOS, Linux)</li>
            </ul>
          </Alert>
        </div>
      )},
    {
      key: 'notifications',
      icon: <Bell className="w-4 h-4" />,
      label: '通知设置',
      children: (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-2">预览模式说明</h4>
            <p className="text-sm text-muted-foreground">
              管理在浏览器环境中运行时显示的功能说明提醒。
            </p>
          </div>
          
          {isBrowserEnvironment() && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <h5 className="font-medium">当前运行在浏览器预览模式</h5>
                <p className="text-sm text-muted-foreground">
                  您可以重新查看功能说明，或者重置提醒设置。
                </p>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => setBrowserModalVisible(true)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  查看功能说明
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetNoticeSettings();
                    toast({ title: "成功", description: "提醒设置已重置，下次启动时会再次显示功能说明" });
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重置提醒设置
                </Button>
              </div>
            </div>
          )}
          
          {!isBrowserEnvironment() && (
            <Alert>
              <Info className="h-4 w-4" />
              <h5 className="font-medium">当前运行在桌面应用模式</h5>
              <p className="text-sm text-muted-foreground">
                桌面应用环境中不需要显示浏览器模式提醒。
              </p>
            </Alert>
          )}
        </div>
      )},
    {
      key: 'developer',
      icon: <Bug className="w-4 h-4" />,
      label: '开发者工具',
      children: (
        <div className="space-y-6">
          {/* 错误测试工具 - 仅开发环境显示 */}
          {(import.meta as any).env?.DEV && (
            <div>
              <h4 className="text-sm font-medium mb-2">错误测试工具</h4>
              <ErrorTestButton />
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium mb-2">应用错误日志</h4>
            <p className="text-sm text-muted-foreground mb-3">
              查看和分析应用程序运行时的错误日志，帮助诊断问题和改进应用性能。
            </p>
            <div className="p-3 bg-muted/50 border rounded-lg min-h-[200px]">
              {isBrowserEnvironment() ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <h5 className="font-medium">浏览器环境提示</h5>
                  <p className="text-sm text-muted-foreground">
                    在浏览器环境中，错误日志将显示在开发者工具的控制台中。请按F12打开开发者工具查看详细日志。
                  </p>
                </Alert>
              ) : (
                <ErrorLogViewer />
              )}
            </div>
          </div>
        </div>
      )},
  ];

  return (
    <>
      <Dialog open={visible} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-5xl w-full h-[85vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              偏好设置
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 min-h-0">
            <Tabs defaultValue="general" orientation="vertical" className="flex h-full gap-6">
              <TabsList className="flex flex-col h-fit w-48 bg-muted/50 p-1">
                {tabItems.map((item) => (
                  <TabsTrigger
                    key={item.key}
                    value={item.key}
                    className="w-full justify-start p-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      {item.icon}
                      <span className="text-sm">{item.label}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="flex-1 min-w-0">
                {tabItems.map((item) => (
                  <TabsContent key={item.key} value={item.key} className="mt-0 h-full">
                    <div className="h-full overflow-y-auto pr-2">
                      <div className="max-w-2xl">
                        {item.children}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* 浏览器模式说明弹框 */}
      <BrowserModeModal
        open={browserModalVisible}
        onClose={() => setBrowserModalVisible(false)}
      />
    </>
  );
};

export default SettingsModal;