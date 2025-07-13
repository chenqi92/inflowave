import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Tabs, Button, Form, Input, Select, Typography, Tag, Alert, Row, Col, Modal } from '@/components/ui';
import { Card, Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';


// TODO: Replace these Ant Design components: List, Switch, Divider, 
import { Settings, Trash2, Plus, PlayCircle, PauseCircle } from 'lucide-react';
// TODO: Replace these icons: AppstoreOutlined, ApiOutlined, LinkOutlined, RobotOutlined, ExperimentOutlined
// You may need to find alternatives or create custom icons
import { safeTauriInvoke } from '@/utils/tauri';
import type { Plugin, APIIntegration, WebhookConfig, AutomationRule } from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ExtensionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plugins');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [apiIntegrations, setApiIntegrations] = useState<APIIntegration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [webhookModalVisible, setWebhookModalVisible] = useState(false);
  const [automationModalVisible, setAutomationModalVisible] = useState(false);
  const [testModalVisible, setTestModalVisible] = useState(false);

  const apiForm = useForm();
  const webhookForm = useForm();
  const automationForm = useForm();

  // 加载数据
  const loadPlugins = async () => {
    try {
      const result = await safeTauriInvoke<Plugin[]>('get_installed_plugins');
      setPlugins(result || []);
    } catch (error) {
      console.error('加载插件失败:', error);
    }
  };

  const loadApiIntegrations = async () => {
    try {
      const result = await safeTauriInvoke<APIIntegration[]>('get_api_integrations');
      setApiIntegrations(result || []);
    } catch (error) {
      console.error('加载API集成失败:', error);
    }
  };

  const loadWebhooks = async () => {
    try {
      const result = await safeTauriInvoke<WebhookConfig[]>('get_webhooks');
      setWebhooks(result || []);
    } catch (error) {
      console.error('加载Webhook失败:', error);
    }
  };

  const loadAutomationRules = async () => {
    try {
      const result = await safeTauriInvoke<AutomationRule[]>('get_automation_rules');
      setAutomationRules(result || []);
    } catch (error) {
      console.error('加载自动化规则失败:', error);
    }
  };

  // 插件操作
  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      await safeTauriInvoke('toggle_plugin', { pluginId, enabled });
      message.success(`插件已${enabled ? '启用' : '禁用'}`);
      loadPlugins();
    } catch (error) {
      console.error('切换插件状态失败:', error);
      toast({ title: "错误", description: "操作失败", variant: "destructive" });
    }
  };

  const uninstallPlugin = async (pluginId: string) => {
    try {
      await safeTauriInvoke('uninstall_plugin', { pluginId });
      toast({ title: "成功", description: "插件已卸载" });
      loadPlugins();
    } catch (error) {
      console.error('卸载插件失败:', error);
      toast({ title: "错误", description: "卸载失败", variant: "destructive" });
    }
  };

  // API 集成操作
  const createApiIntegration = async (values: any) => {
    try {
      await safeTauriInvoke('create_api_integration', {
        integration: {
          id: Date.now().toString(),
          name: values.name,
          integration_type: values.type,
          endpoint: values.endpoint,
          authentication: {
            auth_type: values.authType,
            credentials: values.credentials || {}},
          headers: values.headers || {},
          enabled: true}});
      toast({ title: "成功", description: "API集成创建成功" });
      setApiModalVisible(false);
      apiForm.resetFields();
      loadApiIntegrations();
    } catch (error) {
      console.error('创建API集成失败:', error);
      toast({ title: "错误", description: "创建失败", variant: "destructive" });
    }
  };

  const testApiIntegration = async (integration: APIIntegration) => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('test_api_integration', { integration });
      Modal.info({
        title: 'API 测试结果',
        content: (
          <div>
            <p>状态: {result.success ? '成功' : '失败'}</p>
            <p>HTTP 状态码: {result.status}</p>
            {result.body && (
              <div>
                <p>响应内容:</p>
                <pre style={{ maxHeight: 200, overflow: 'auto' }}>
                  {JSON.stringify(result.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )});
    } catch (error) {
      toast({ title: "错误", description: "测试失败: ${error}", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Webhook 操作
  const createWebhook = async (values: any) => {
    try {
      await safeTauriInvoke('create_webhook', {
        webhook: {
          id: Date.now().toString(),
          name: values.name,
          url: values.url,
          events: values.events || [],
          headers: values.headers || {},
          secret: values.secret,
          enabled: true,
          retry_policy: {
            max_retries: values.maxRetries || 3,
            backoff_multiplier: values.backoffMultiplier || 2.0,
            max_backoff_time: values.maxBackoffTime || 300}}});
      toast({ title: "成功", description: "Webhook创建成功" });
      setWebhookModalVisible(false);
      webhookForm.resetFields();
      loadWebhooks();
    } catch (error) {
      console.error('创建Webhook失败:', error);
      toast({ title: "错误", description: "创建失败", variant: "destructive" });
    }
  };

  // 自动化规则操作
  const createAutomationRule = async (values: any) => {
    try {
      await safeTauriInvoke('create_automation_rule', {
        rule: {
          id: Date.now().toString(),
          name: values.name,
          description: values.description,
          trigger: {
            trigger_type: values.triggerType,
            config: values.triggerConfig || {}},
          conditions: values.conditions || [],
          actions: values.actions || [],
          enabled: true,
          execution_count: 0}});
      toast({ title: "成功", description: "自动化规则创建成功" });
      setAutomationModalVisible(false);
      automationForm.resetFields();
      loadAutomationRules();
    } catch (error) {
      console.error('创建自动化规则失败:', error);
      toast({ title: "错误", description: "创建失败", variant: "destructive" });
    }
  };

  const executeAutomationRule = async (ruleId: string) => {
    try {
      const result = await safeTauriInvoke('execute_automation_rule', {
        ruleId,
        context: {}});
      toast({ title: "成功", description: "自动化规则执行成功" });
      console.log('执行结果:', result);
    } catch (error) {
      console.error('执行自动化规则失败:', error);
      toast({ title: "错误", description: "执行失败", variant: "destructive" });
    }
  };

  useEffect(() => {
    loadPlugins();
    loadApiIntegrations();
    loadWebhooks();
    loadAutomationRules();
  }, []);

  return (
    <div className="extension-manager">
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* 插件管理 */}
        <Tabs.TabPane tab={<><Grid3X3 className="w-4 h-4"  /> 插件</>} key="plugins">
          <Card
            title="已安装的插件"
            extra={
              <Button type="primary" icon={<Plus className="w-4 h-4"  />}>
                安装插件
              </Button>
            }
          >
            <List
              dataSource={plugins}
              locale={{ emptyText: '暂无已安装的插件' }}
              renderItem={(plugin) => (
                <List.Item
                  actions={[
                    <Switch
                      checked={plugin.enabled}
                      onChange={(checked) => togglePlugin(plugin.id, checked)}
                    />,
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 className="w-4 h-4"  />}
                      onClick={() => uninstallPlugin(plugin.id)}
                    >
                      卸载
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex gap-2">
                        {plugin.name}
                        <Tag color="blue">v{plugin.version}</Tag>
                        <Tag color={plugin.enabled ? 'green' : 'red'}>
                          {plugin.enabled ? '已启用' : '已禁用'}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary">{plugin.description}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          作者: {plugin.author}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>

        {/* API 集成 */}
        <Tabs.TabPane tab={<><Webhook className="w-4 h-4"  /> API 集成</>} key="api">
          <Card
            title="API 集成"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setApiModalVisible(true)}
              >
                新建集成
              </Button>
            }
          >
            <List
              dataSource={apiIntegrations}
              locale={{ emptyText: '暂无API集成' }}
              renderItem={(integration) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<ExperimentOutlined />}
                      onClick={() => testApiIntegration(integration)}
                      loading={loading}
                    >
                      测试
                    </Button>,
                    <Switch checked={integration.enabled} />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex gap-2">
                        {integration.name}
                        <Tag color="blue">{integration.integration_type}</Tag>
                      </div>
                    }
                    description={integration.endpoint}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>

        {/* Webhook */}
        <Tabs.TabPane tab={<><Link className="w-4 h-4"  /> Webhook</>} key="webhooks">
          <Card
            title="Webhook 配置"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setWebhookModalVisible(true)}
              >
                新建 Webhook
              </Button>
            }
          >
            <List
              dataSource={webhooks}
              locale={{ emptyText: '暂无Webhook配置' }}
              renderItem={(webhook) => (
                <List.Item
                  actions={[
                    <Switch checked={webhook.enabled} />,
                  ]}
                >
                  <List.Item.Meta
                    title={webhook.name}
                    description={
                      <div>
                        <Text type="secondary">{webhook.url}</Text>
                        <br />
                        <div className="flex gap-2" size="small">
                          {webhook.events.map(event => (
                            <Tag key={event} size="small">{event}</Tag>
                          ))}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>

        {/* 自动化规则 */}
        <Tabs.TabPane tab={<><RobotOutlined /> 自动化</>} key="automation">
          <Card
            title="自动化规则"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setAutomationModalVisible(true)}
              >
                新建规则
              </Button>
            }
          >
            <List
              dataSource={automationRules}
              locale={{ emptyText: '暂无自动化规则' }}
              renderItem={(rule) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<PlayCircle />}
                      onClick={() => executeAutomationRule(rule.id)}
                    >
                      执行
                    </Button>,
                    <Switch checked={rule.enabled} />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <div className="flex gap-2">
                        {rule.name}
                        <Tag color="green">执行 {rule.executionCount} 次</Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary">{rule.description}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          触发器: {rule.trigger.trigger_type}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Tabs.TabPane>
      </Tabs>

      {/* API 集成创建对话框 */}
      <Modal
        title="创建 API 集成"
        open={apiModalVisible}
        onCancel={() => setApiModalVisible(false)}
        onOk={() => apiForm.submit()}
        width={600}
      >
        <Form form={apiForm} layout="vertical" onFinish={createApiIntegration}>
          <Form.Item name="name" label="集成名称" rules={[{ required: true }]}>
            <Input placeholder="输入集成名称" />
          </Form.Item>

          <Form.Item name="type" label="集成类型" rules={[{ required: true }]}>
            <Select>
              <Option value="rest">REST API</Option>
              <Option value="graphql">GraphQL</Option>
              <Option value="webhook">Webhook</Option>
            </Select>
          </Form.Item>

          <Form.Item name="endpoint" label="API 端点" rules={[{ required: true }]}>
            <Input placeholder="https://api.example.com" />
          </Form.Item>

          <Form.Item name="authType" label="认证类型">
            <Select>
              <Option value="none">无认证</Option>
              <Option value="basic">Basic Auth</Option>
              <Option value="bearer">Bearer Token</Option>
              <Option value="apikey">API Key</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Webhook 创建对话框 */}
      <Modal
        title="创建 Webhook"
        open={webhookModalVisible}
        onCancel={() => setWebhookModalVisible(false)}
        onOk={() => webhookForm.submit()}
        width={600}
      >
        <Form form={webhookForm} layout="vertical" onFinish={createWebhook}>
          <Form.Item name="name" label="Webhook 名称" rules={[{ required: true }]}>
            <Input placeholder="输入 Webhook 名称" />
          </Form.Item>

          <Form.Item name="url" label="Webhook URL" rules={[{ required: true }]}>
            <Input placeholder="https://hooks.example.com/webhook" />
          </Form.Item>

          <Form.Item name="events" label="监听事件">
            <Select mode="multiple" placeholder="选择要监听的事件">
              <Option value="query_completed">查询完成</Option>
              <Option value="connection_status">连接状态变化</Option>
              <Option value="export_completed">导出完成</Option>
              <Option value="alert_triggered">警报触发</Option>
            </Select>
          </Form.Item>

          <Form.Item name="secret" label="密钥（可选）">
            <Input.Password placeholder="用于签名验证的密钥" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 自动化规则创建对话框 */}
      <Modal
        title="创建自动化规则"
        open={automationModalVisible}
        onCancel={() => setAutomationModalVisible(false)}
        onOk={() => automationForm.submit()}
        width={700}
      >
        <Form form={automationForm} layout="vertical" onFinish={createAutomationRule}>
          <Form.Item name="name" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="输入规则名称" />
          </Form.Item>

          <Form.Item name="description" label="规则描述">
            <TextArea rows={2} placeholder="描述这个自动化规则的用途" />
          </Form.Item>

          <Form.Item name="triggerType" label="触发器类型" rules={[{ required: true }]}>
            <Select>
              <Option value="schedule">定时触发</Option>
              <Option value="event">事件触发</Option>
              <Option value="threshold">阈值触发</Option>
              <Option value="manual">手动触发</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExtensionManager;
