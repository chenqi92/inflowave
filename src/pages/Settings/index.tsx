import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Button, Typography, Space, message, Row, Col, Alert, Tabs, InputNumber, Switch, Divider } from '@/components/ui';
import { SaveOutlined, ReloadOutlined, DeleteOutlined, InfoCircleOutlined, ExportOutlined, ImportOutlined } from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { useAppStore } from '@/store/app';
import { useConnectionStore } from '@/store/connection';
import UserPreferences from '@/components/settings/UserPreferences';
import type { AppConfig } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { config, setConfig, setTheme, setLanguage, resetConfig } = useAppStore();
  const { clearConnections } = useConnectionStore();

  // 初始化表单值
  useEffect(() => {
    form.setFieldsValue(config);
  }, [config, form]);

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

      message.success('设置已保存');
    } catch (error) {
      message.error(`保存设置失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 重置设置
  const handleResetSettings = () => {
    resetConfig();
    form.setFieldsValue(useAppStore.getState().config);
    message.success('设置已重置为默认值');
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

      // 这里应该调用 Tauri 的文件保存对话框
      await safeTauriInvoke('export_settings', { settings });
      message.success('设置已导出');
    } catch (error) {
      message.error(`导出设置失败: ${error}`);
    }
  };

  // 导入设置
  const importSettings = async () => {
    try {
      // 这里应该调用 Tauri 的文件选择对话框
      const settings = await safeTauriInvoke('import_settings');

      if (settings) {
        // 应用导入的设置
        setConfig(settings.appConfig);
        message.success('设置已导入');
      }
    } catch (error) {
      message.error(`导入设置失败: ${error}`);
    }
  };

  // 清除所有数据
  const clearAllData = () => {
    clearConnections();
    resetConfig();
    form.setFieldsValue(useAppStore.getState().config);
    message.success('所有数据已清除');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Title level={2} className="mb-2">应用设置</Title>
        <Text type="secondary" className="text-base">
          配置应用程序的行为和外观，个性化您的使用体验
        </Text>
      </div>

      <div className="space-y-6">
        <Tabs
          items={[
            {
              key: 'general',
              label: '常规设置',
              children: (
                <Card className="shadow-sm">
                  <div className="mb-4">
                    <Title level={4} className="mb-2">基础配置</Title>
                    <Text type="secondary">设置应用程序的基本行为和外观</Text>
                  </div>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={saveSettings}
                    initialValues={config}
                  >
                    <Row gutter={24}>
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

                    <Row gutter={24}>
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

                    <Row gutter={24}>
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

                    <Row gutter={24}>
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

                    <Divider />

                    <div className="pt-4 border-t border-gray-200">
                      <Form.Item className="mb-0">
                        <Space size="middle">
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={<SaveOutlined />}
                            size="large"
                          >
                            保存设置
                          </Button>
                          <Button
                            icon={<ReloadOutlined />}
                            onClick={handleResetSettings}
                            size="large"
                          >
                            重置为默认
                          </Button>
                        </Space>
                      </Form.Item>
                    </div>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'data',
              label: '数据管理',
              children: (
                <div className="space-y-6">
                  <Card title="导入/导出" className="shadow-sm">
                    <div className="mb-4">
                      <Title level={5} className="mb-2">数据备份与恢复</Title>
                      <Paragraph className="text-gray-600">
                        您可以导出当前的应用设置和连接配置，或从文件中导入设置。
                      </Paragraph>
                    </div>

                    <Space size="large">
                      <Button
                        icon={<ExportOutlined />}
                        onClick={exportSettings}
                        size="large"
                        type="dashed"
                      >
                        导出设置
                      </Button>
                      <Button
                        icon={<ImportOutlined />}
                        onClick={importSettings}
                        size="large"
                        type="dashed"
                      >
                        导入设置
                      </Button>
                    </Space>
                  </Card>

                  <Card title="数据清理" className="border-red-200 shadow-sm">
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

                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>清除所有连接配置</Text>
                        <br />
                        <Text type="secondary">
                          删除所有保存的数据库连接配置
                        </Text>
                        <br />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            clearConnections();
                            message.success('连接配置已清除');
                          }}
                          className="mt-2"
                          size="large"
                        >
                          清除连接配置
                        </Button>
                      </div>

                      <Divider />

                      <div>
                        <Text strong>重置所有设置</Text>
                        <br />
                        <Text type="secondary">
                          将所有设置恢复为默认值，并清除所有用户数据
                        </Text>
                        <br />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={clearAllData}
                          className="mt-2"
                          size="large"
                        >
                          重置所有设置
                        </Button>
                      </div>
                    </Space>
                  </Card>
                </div>
              ),
            },
            {
              key: 'about',
              label: '关于',
              children: (
                <Card title="关于 InfluxDB GUI Manager" className="shadow-sm">
                  <Row gutter={24}>
                    <Col span={12}>
                      <div className="space-y-4">
                        <div>
                          <Text strong className="text-lg">版本信息</Text>
                          <br />
                          <Text className="text-base">v0.1.0-alpha</Text>
                        </div>

                        <div>
                          <Text strong className="text-lg">构建时间</Text>
                          <br />
                          <Text className="text-base">{new Date().toLocaleDateString()}</Text>
                        </div>

                        <div>
                          <Text strong className="text-lg">技术栈</Text>
                          <br />
                          <Text className="text-base">React + TypeScript + Rust + Tauri</Text>
                        </div>
                      </div>
                    </Col>

                    <Col span={12}>
                      <div className="space-y-4">
                        <div>
                          <Text strong className="text-lg">支持的 InfluxDB 版本</Text>
                          <br />
                          <Text className="text-base">InfluxDB 1.x</Text>
                        </div>

                        <div>
                          <Text strong className="text-lg">开源协议</Text>
                          <br />
                          <Text className="text-base">MIT License</Text>
                        </div>

                        <div>
                          <Text strong className="text-lg">项目地址</Text>
                          <br />
                          <Text className="text-base text-blue-600 hover:text-blue-800 cursor-pointer">GitHub Repository</Text>
                        </div>
                      </div>
                    </Col>
                  </Row>

                  <Divider />

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
                    icon={<InfoCircleOutlined />}
                  />
                </Card>
              ),
            },
            {
              key: 'preferences',
              label: '用户偏好',
              children: <UserPreferences />,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Settings;
