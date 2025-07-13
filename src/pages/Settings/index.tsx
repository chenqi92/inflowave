import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Select, Button, Title, Text, Paragraph, Row, Col, Alert, AlertDescription, Tabs, TabsContent, TabsList, TabsTrigger, InputNumber, Switch, Card, Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle, Separator } from '@/components/ui';
import { Save, RefreshCw, Trash2, Info, FileDown, FileUp, Settings, Database, User, Bug, ChevronLeft, Home, Bell } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import { useNavigate } from 'react-router-dom';
import UserPreferences from '@/components/settings/UserPreferences';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import ErrorTestButton from '@/components/test/ErrorTestButton';
import BrowserModeModal from '@/components/common/BrowserModeModal';
import { useNoticeStore } from '@/store/notice';
import { isBrowserEnvironment } from '@/utils/tauri';
import { Modal } from '@/utils/modalAdapter';
import type { AppConfig } from '@/types';
import '@/styles/settings.css';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const form = useForm();
  const [browserModalVisible, setBrowserModalVisible] = useState(false);
  const navigate = useNavigate();
  const { config, setConfig, setTheme, setLanguage, resetConfig } = useAppStore();
  
  // 使用 memo 来确保 config 对象稳定性
  const stableConfig = useMemo(() => config, [
    config.theme,
    config.language,
    config.queryTimeout,
    config.maxQueryResults,
    config.autoSave,
    config.autoConnect,
    config.logLevel
  ]);
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

      toast({ title: "成功", description: "设置已保存" });
    } catch (error) {
      toast({ title: "错误", description: "保存设置失败: ${error}", variant: "destructive" });
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
        // 浏览器环境：下载为JSON文件
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
    Modal.confirm({
      title: '确认重置所有设置',
      content: '此操作将删除所有连接配置和应用设置，且无法恢复。您确定要继续吗？',
      okText: '确认重置',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        clearConnections();
        resetConfig();
        setTimeout(() => {
          const latestConfig = useAppStore.getState().config;
          form.reset(latestConfig);
        }, 0);
        toast({ title: "成功", description: "所有数据已清除" });
      }});
  };

  // 清除连接配置（带确认）
  const clearConnectionsWithConfirm = () => {
    Modal.confirm({
      title: '确认清除连接配置',
      content: '此操作将删除所有保存的数据库连接配置，且无法恢复。您确定要继续吗？',
      okText: '确认清除',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        clearConnections();
        toast({ title: "成功", description: "连接配置已清除" });
      }});
  };

  return (
    <div className="settings-page">
      {/* 页面头部 */}
      <div className="settings-header bg-white border-b border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              type="text" 
              icon={<ChevronLeft className="w-4 h-4"  />} 
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted cursor-pointer"
              title="返回"
            />
            <div>
              <Title level={2} className="mb-0">应用设置</Title>
              <Text type="secondary" className="text-sm">
                配置应用程序的行为和外观，个性化您的使用体验
              </Text>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              icon={<Home className="w-4 h-4"  />} 
              onClick={() => navigate('/')}
              type="default"
              className="cursor-pointer"
            >
              返回主页
            </Button>
          </div>
        </div>
      </div>

      {/* 设置内容 */}
      <div className="settings-content p-6 max-w-6xl mx-auto">

        <div className="space-y-6">
          <Tabs
            size="large"
            type="card"
            className="settings-tabs flex items-center space-x-2"
            items={[
              {
                key: 'general',
                label: (
                  <span >
                    <Settings className="w-4 h-4"  />
                    <span>常规设置</span>
                  </span>
                ),
                children: (
                  <div className="bg-muted/50 p-6 rounded-lg">
                    <Card className="shadow-sm border-0">
                      <div className="mb-6">
                        <Title level={4} className="mb-2 text-gray-800">基础配置</Title>
                        <Text type="secondary" className="text-base">设置应用程序的基本行为和外观</Text>
                      </div>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={saveSettings}
                    initialValues={stableConfig}
                  >
                    <Row gutter={24}>
                      <Col span={12}>
                        <FormItem
                          label="主题"
                          name="theme"
                          tooltip="选择应用程序的外观主题"
                        >
                          <Select>
                            <Option value="light">浅色主题</Option>
                            <Option value="dark">深色主题</Option>
                            <Option value="auto">跟随系统</Option>
                          </Select>
                        </FormItem>
                      </Col>
                      <Col span={12}>
                        <FormItem
                          label="语言"
                          name="language"
                          tooltip="选择应用程序的显示语言"
                        >
                          <Select>
                            <Option value="zh-CN">简体中文</Option>
                            <Option value="en-US">English</Option>
                          </Select>
                        </FormItem>
                      </Col>
                    </Row>

                    <Row gutter={24}>
                      <Col span={12}>
                        <FormItem
                          label="查询超时时间 (毫秒)"
                          name="queryTimeout"
                          tooltip="查询执行的最大等待时间"
                        >
                          <InputNumber
                            min={1000}
                            max={300000}
                            step={1000}
                            style={{ width: '100%' }}
                          />
                        </FormItem>
                      </Col>
                      <Col span={12}>
                        <FormItem
                          label="最大查询结果数"
                          name="maxQueryResults"
                          tooltip="单次查询返回的最大行数"
                        >
                          <InputNumber
                            min={100}
                            max={100000}
                            step={100}
                            style={{ width: '100%' }}
                          />
                        </FormItem>
                      </Col>
                    </Row>

                    <Row gutter={24}>
                      <Col span={12}>
                        <FormItem
                          label="自动保存"
                          name="autoSave"
                          valuePropName="checked"
                          tooltip="自动保存查询和配置"
                        >
                          <Switch />
                        </FormItem>
                      </Col>
                      <Col span={12}>
                        <FormItem
                          label="自动连接"
                          name="autoConnect"
                          valuePropName="checked"
                          tooltip="启动时自动连接到上次使用的数据库"
                        >
                          <Switch />
                        </FormItem>
                      </Col>
                    </Row>

                    <Row gutter={24}>
                      <Col span={12}>
                        <FormItem
                          label="日志级别"
                          name="logLevel"
                          tooltip="设置应用程序的日志详细程度"
                        >
                          <Select>
                            <Option value="debug">调试 (Debug)</Option>
                            <Option value="info">信息 (Info)</Option>
                            <Option value="warn">警告 (Warn)</Option>
                            <Option value="error">错误 (Error)</Option>
                          </Select>
                        </FormItem>
                      </Col>
                    </Row>

                    <Separator />

                    <div className="pt-4 border-t border">
                      <FormItem className="mb-0">
                        <div className="flex gap-2" size="middle">
                          <Button
                            type="primary"
                            htmlType="submit"
                            disabled={loading}
                            icon={<Save className="w-4 h-4"  />}
                            size="large"
                            className="cursor-pointer"
                          >
                            保存设置
                          </Button>
                          <Button
                            icon={<RefreshCw className="w-4 h-4"  />}
                            onClick={handleResetSettings}
                            size="large"
                            className="cursor-pointer"
                          >
                            重置为默认
                          </Button>
                        </div>
                      </FormItem>
                    </div>
                    </Form>
                  </Card>
                </div>
              )},
            {
              key: 'data',
              label: (
                <span className="flex items-center space-x-2">
                  <Database className="w-4 h-4"  />
                  <span>数据管理</span>
                </span>
              ),
              children: (
                <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                  <Card title="导入/导出" className="shadow-sm border-0">
                    <div className="mb-4">
                      <Title level={5} className="mb-2 text-gray-800">数据备份与恢复</Title>
                      <Paragraph className="text-muted-foreground">
                        您可以导出当前的应用设置和连接配置，或从文件中导入设置。
                      </Paragraph>
                    </div>

                    <div className="flex gap-2" size="large">
                      <Button
                        icon={<FileDown className="w-4 h-4"  />}
                        onClick={exportSettings}
                        size="large"
                        type="dashed"
                        className="cursor-pointer"
                      >
                        导出设置
                      </Button>
                      <Button
                        icon={<FileUp className="w-4 h-4"  />}
                        onClick={importSettings}
                        size="large"
                        type="dashed"
                        className="cursor-pointer"
                      >
                        导入设置
                      </Button>
                    </div>
                  </Card>

                  <Card title="数据清理" className="border-destructive shadow-sm border-0 bg-destructive/10">
                    <div className="mb-4">
                      <Title level={5} className="mb-2 text-red-600">危险操作区域</Title>
                      <Alert
                        message="危险操作"
                        description="以下操作将永久删除数据，请谨慎操作。建议在执行前先导出设置备份。"
                        type="warning"
                        showIcon
                        className="mb-4"
                      />
                    </div>

                    <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>清除所有连接配置</Text>
                        <br />
                        <Text type="secondary">
                          删除所有保存的数据库连接配置
                        </Text>
                        <br />
                        <Button
                          danger
                          icon={<Trash2 className="w-4 h-4"  />}
                          onClick={clearConnectionsWithConfirm}
                          className="mt-2 cursor-pointer"
                          size="large"
                        >
                          清除连接配置
                        </Button>
                      </div>

                      <Separator />

                      <div>
                        <Text strong>重置所有设置</Text>
                        <br />
                        <Text type="secondary">
                          将所有设置恢复为默认值，并清除所有用户数据
                        </Text>
                        <br />
                        <Button
                          danger
                          icon={<Trash2 className="w-4 h-4"  />}
                          onClick={clearAllData}
                          className="mt-2 cursor-pointer"
                          size="large"
                        >
                          重置所有设置
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )},
            {
              key: 'about',
              label: (
                <span className="flex items-center space-x-2">
                  <Info className="w-4 h-4"  />
                  <span>关于</span>
                </span>
              ),
              children: (
                <div className="bg-muted/50 p-6 rounded-lg">
                  <Card title="关于 InfloWave" className="shadow-sm border-0">
                    <Row gutter={24}>
                      <Col span={12}>
                        <div className="space-y-4">
                          <div>
                            <Text strong className="text-lg text-gray-800">版本信息</Text>
                            <br />
                            <Text className="text-base">v0.1.0-alpha</Text>
                          </div>

                          <div>
                            <Text strong className="text-lg text-gray-800">构建时间</Text>
                            <br />
                            <Text className="text-base">{new Date().toLocaleDateString()}</Text>
                          </div>

                          <div>
                            <Text strong className="text-lg text-gray-800">技术栈</Text>
                            <br />
                            <Text className="text-base">React + TypeScript + Rust + Tauri</Text>
                          </div>
                      </div>
                    </Col>

                      <Col span={12}>
                        <div className="space-y-4">
                          <div>
                            <Text strong className="text-lg text-gray-800">支持的 InfluxDB 版本</Text>
                            <br />
                            <Text className="text-base">InfluxDB 1.x</Text>
                          </div>

                          <div>
                            <Text strong className="text-lg text-gray-800">开源协议</Text>
                            <br />
                            <Text className="text-base">MIT License</Text>
                          </div>

                          <div>
                            <Text strong className="text-lg text-gray-800">项目地址</Text>
                            <br />
                            <Text className="text-base text-primary hover:text-blue-800 cursor-pointer">GitHub Repository</Text>
                          </div>
                      </div>
                    </Col>
                  </Row>

                  <Separator />

                  <Alert
                    message="功能特性"
                    description={
                      <ul className="mt-2 space-y-1">
                        <li>• 现代化的用户界面设计</li>
                        <li>• 安全的连接管理和密码加密</li>
                        <li>• 强大的查询编辑器和结果展示</li>
                        <li>• 灵活的数据可视化功能</li>
                        <li>• 便捷的数据写入和导入工具</li>
                        <li>• 跨平台支持 (Windows, macOS, Linux)</li>
                      </ul>
                    }
                    type="info"
                    showIcon
                    icon={<Info className="w-4 h-4"  />}
                  />
                  </Card>
                </div>
              )},
            {
              key: 'preferences',
              label: (
                <span className="flex items-center space-x-2">
                  <User className="w-4 h-4"  />
                  <span>用户偏好</span>
                </span>
              ),
              children: (
                <div className="bg-muted/50 p-6 rounded-lg">
                  <UserPreferences />
                </div>
              )},
            {
              key: 'notifications',
              label: (
                <span className="flex items-center space-x-2">
                  <Bell className="w-4 h-4"  />
                  <span>通知设置</span>
                </span>
              ),
              children: (
                <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                  <Card title="浏览器模式提醒" className="shadow-sm border-0">
                    <div className="mb-4">
                      <Title level={4} className="mb-2 text-gray-800">预览模式说明</Title>
                      <Text type="secondary">
                        管理在浏览器环境中运行时显示的功能说明提醒。
                      </Text>
                    </div>
                    
                    {isBrowserEnvironment() && (
                      <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
                        <Alert
                          message="当前运行在浏览器预览模式"
                          description="您可以重新查看功能说明，或者重置提醒设置。"
                          type="info"
                          showIcon
                          style={{ marginBottom: '16px' }}
                        />
                        
                        <div className="flex gap-2">
                          <Button
                            type="primary"
                            icon={<Info className="w-4 h-4"  />}
                            onClick={() => setBrowserModalVisible(true)}
                            className="cursor-pointer"
                          >
                            查看功能说明
                          </Button>
                          <Button
                            icon={<RefreshCw className="w-4 h-4"  />}
                            onClick={() => {
                              resetNoticeSettings();
                              toast({ title: "成功", description: "提醒设置已重置，下次启动时会再次显示功能说明" });
                            }}
                            className="cursor-pointer"
                          >
                            重置提醒设置
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {!isBrowserEnvironment() && (
                      <Alert
                        message="当前运行在桌面应用模式"
                        description="桌面应用环境中不需要显示浏览器模式提醒。"
                        type="success"
                        showIcon
                      />
                    )}
                  </Card>
                </div>
              )},
            {
              key: 'developer',
              label: (
                <span className="flex items-center space-x-2">
                  <Bug className="w-4 h-4"  />
                  <span>开发者工具</span>
                </span>
              ),
              children: (
                <div className="bg-muted/50 p-6 rounded-lg space-y-6">
                  {/* 错误测试工具 - 仅开发环境显示 */}
                  {(import.meta as any).env?.DEV && (
                    <Card title="错误测试工具" className="shadow-sm border-yellow-200 border-0 bg-yellow-50">
                      <ErrorTestButton />
                    </Card>
                  )}
                  
                  <Card title="错误日志查看器" className="shadow-sm border-0">
                    <div className="mb-4">
                      <Title level={4} className="mb-2 text-gray-800">应用错误日志</Title>
                      <Text type="secondary">
                        查看和分析应用程序运行时的错误日志，帮助诊断问题和改进应用性能。
                      </Text>
                    </div>
                    <ErrorLogViewer />
                  </Card>
                </div>
              )},
          ]}
        />
        </div>

        {/* 浏览器模式说明弹框 */}
        <BrowserModeModal
          open={browserModalVisible}
          onClose={() => setBrowserModalVisible(false)}
        />
      </div>
    </div>
  );
};

export default Settings;
