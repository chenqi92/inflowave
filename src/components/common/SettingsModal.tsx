import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, Button, Typography, Space, Row, Col, Alert, Tabs, InputNumber, Switch } from '@/components/ui';
// TODO: Replace these Ant Design components: message, Divider
import { Card } from '@/components/ui';

import { Save, RefreshCw, Trash2, Download, Upload, Settings, Database, User, Bug, Bell } from 'lucide-react';
import { Info, X } from 'lucide-react';
import { safeTauriInvoke, isBrowserEnvironment } from '@/utils/tauri';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import UserPreferences from '@/components/settings/UserPreferences';
import ErrorLogViewer from '@/components/debug/ErrorLogViewer';
import ErrorTestButton from '@/components/test/ErrorTestButton';
import BrowserModeModal from '@/components/common/BrowserModeModal';
import { useNoticeStore } from '@/store/notice';
import type { AppConfig } from '@/types';
import '@/styles/settings-modal.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [browserModalVisible, setBrowserModalVisible] = useState(false);
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
    if (visible) {
      form.setFieldsValue(stableConfig);
    }
  }, [stableConfig, visible, form]);

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
    Modal.confirm({
      title: '确认重置设置',
      content: '此操作将重置所有设置为默认值，您确定要继续吗？',
      okText: '确认重置',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        resetConfig();
        // 延迟设置表单值，确保 store 状态已更新
        setTimeout(() => {
          const latestConfig = useAppStore.getState().config;
          form.setFieldsValue(latestConfig);
        }, 0);
        toast({ title: "成功", description: "设置已重置为默认值" });
      }});
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
                form.setFieldsValue(settings.appConfig);
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
          form.setFieldsValue(settings.appConfig);
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
          form.setFieldsValue(latestConfig);
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

  const tabItems = [
    {
      key: 'general',
      label: (
        <span className="flex items-center space-x-2">
          <Settings className="w-4 h-4"  />
          <span>常规设置</span>
        </span>
      ),
      children: (
        <div className="max-h-96 overflow-y-auto px-1">
          <Form
            form={form}
            layout="vertical"
            onFinish={saveSettings}
            initialValues={stableConfig}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="主题"
                  name="theme"
                  tooltip="选择应用程序的外观主题"
                >
                  <Select>
                    <Option value="light">浅色主题</Option>
                    <Option value="dark">深色主题</Option>
                    <Option value="auto">跟随系统</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="语言"
                  name="language"
                  tooltip="选择应用程序的显示语言"
                >
                  <Select>
                    <Option value="zh-CN">简体中文</Option>
                    <Option value="en-US">English</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
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
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
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
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="自动保存"
                  name="autoSave"
                  valuePropName="checked"
                  tooltip="自动保存查询和配置"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="自动连接"
                  name="autoConnect"
                  valuePropName="checked"
                  tooltip="启动时自动连接到上次使用的数据库"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
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
                </Form.Item>
              </Col>
            </Row>

            <div className="border-t border-gray-200 my-4" />

            <div className="flex justify-end">
              <div className="flex gap-2">
                <Button
                  icon={<RefreshCw className="w-4 h-4"  />}
                  onClick={handleResetSettings}
                >
                  重置为默认
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<Save className="w-4 h-4"  />}
                >
                  保存设置
                </Button>
              </div>
            </div>
          </Form>
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
        <div className="max-h-96 overflow-y-auto space-y-4 px-1">
          <div>
            <Title level={5} className="mb-3">数据备份与恢复</Title>
            <div className="flex gap-2" size="middle" wrap>
              <Button
                icon={<FileDown className="w-4 h-4"  />}
                onClick={exportSettings}
                type="dashed"
              >
                导出设置
              </Button>
              <Button
                icon={<FileUp className="w-4 h-4"  />}
                onClick={importSettings}
                type="dashed"
              >
                导入设置
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4" />

          <div>
            <Title level={5} className="mb-2 text-red-600">危险操作区域</Title>
            <Alert
              message="危险操作"
              description="以下操作将永久删除数据，请谨慎操作。建议在执行前先导出设置备份。"
              type="warning"
              showIcon
              className="mb-4"
            />
            
            <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>清除所有连接配置</Text>
                <br />
                <Text type="secondary" className="text-sm">
                  删除所有保存的数据库连接配置
                </Text>
                <br />
                <Button
                  danger
                  icon={<Trash2 className="w-4 h-4"  />}
                  onClick={clearConnectionsWithConfirm}
                  className="mt-2"
                  size="small"
                >
                  清除连接配置
                </Button>
              </div>

              <div>
                <Text strong>重置所有设置</Text>
                <br />
                <Text type="secondary" className="text-sm">
                  将所有设置恢复为默认值，并清除所有用户数据
                </Text>
                <br />
                <Button
                  danger
                  icon={<Trash2 className="w-4 h-4"  />}
                  onClick={clearAllData}
                  className="mt-2"
                  size="small"
                >
                  重置所有设置
                </Button>
              </div>
            </div>
          </div>
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
        <div className="max-h-96 overflow-y-auto px-1">
          <Row gutter={16}>
            <Col span={12}>
              <div className="space-y-3">
                <div>
                  <Text strong className="text-base">版本信息</Text>
                  <br />
                  <Text>v0.1.0-alpha</Text>
                </div>

                <div>
                  <Text strong className="text-base">构建时间</Text>
                  <br />
                  <Text>{new Date().toLocaleDateString()}</Text>
                </div>

                <div>
                  <Text strong className="text-base">技术栈</Text>
                  <br />
                  <Text>React + TypeScript + Rust + Tauri</Text>
                </div>
              </div>
            </Col>

            <Col span={12}>
              <div className="space-y-3">
                <div>
                  <Text strong className="text-base">支持的 InfluxDB 版本</Text>
                  <br />
                  <Text>InfluxDB 1.x</Text>
                </div>

                <div>
                  <Text strong className="text-base">开源协议</Text>
                  <br />
                  <Text>MIT License</Text>
                </div>

                <div>
                  <Text strong className="text-base">项目地址</Text>
                  <br />
                  <Text className="text-blue-600 hover:text-blue-800 cursor-pointer">GitHub Repository</Text>
                </div>
              </div>
            </Col>
          </Row>

          <div className="border-t border-gray-200 my-4" />

          <Alert
            message="功能特性"
            description={
              <ul className="mt-2 space-y-1 text-sm">
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
        <div className="max-h-96 overflow-y-auto px-1">
          <div className="mb-4">
            <Title level={5} className="mb-2">预览模式说明</Title>
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
                >
                  查看功能说明
                </Button>
                <Button
                  icon={<RefreshCw className="w-4 h-4"  />}
                  onClick={() => {
                    resetNoticeSettings();
                    toast({ title: "成功", description: "提醒设置已重置，下次启动时会再次显示功能说明" });
                  }}
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
        <div className="max-h-96 overflow-y-auto space-y-4 px-1">
          {/* 错误测试工具 - 仅开发环境显示 */}
          {(import.meta as any).env?.DEV && (
            <div>
              <Title level={5} className="mb-2">错误测试工具</Title>
              <ErrorTestButton />
            </div>
          )}
          
          <div>
            <Title level={5} className="mb-2">应用错误日志</Title>
            <Text type="secondary" className="text-sm">
              查看和分析应用程序运行时的错误日志，帮助诊断问题和改进应用性能。
            </Text>
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded" style={{ maxHeight: '200px', overflow: 'auto' }}>
              {isBrowserEnvironment() ? (
                <Alert
                  message="浏览器环境提示"
                  description="在浏览器环境中，错误日志将显示在开发者工具的控制台中。请按F12打开开发者工具查看详细日志。"
                  type="info"
                  showIcon
                  size="small"
                />
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
      <Dialog
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="w-4 h-4"  />
              <span>偏好设置</span>
            </div>
          </div>
        }
        open={visible}
        onCancel={onClose}
        footer={null}
        width={1000}
        styles={{
          body: { padding: '16px 0' },
          header: { borderBottom: '1px solid #f0f0f0', marginBottom: 0 }}}
        destroyOnClose
        centered
        className="settings-modal"
      >
        <Tabs
          items={tabItems}
          tabPosition="left"
          style={{ minHeight: '400px' }}
          tabBarStyle={{ width: '140px', marginRight: '16px' }}
        />
      </Dialog>

      {/* 浏览器模式说明弹框 */}
      <BrowserModeModal
        visible={browserModalVisible}
        onClose={() => setBrowserModalVisible(false)}
      />
    </>
  );
};

export default SettingsModal;