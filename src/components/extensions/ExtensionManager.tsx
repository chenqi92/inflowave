import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Alert, Switch, Separator, Textarea } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Settings, Trash2, Plus, PlayCircle, PauseCircle, Package, Zap, Webhook, Bot, TestTube } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { Plugin, APIIntegration, WebhookConfig, AutomationRule } from '@/types';

// Removed Typography and Input destructuring - using direct components

const ExtensionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plugins');
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [apiIntegrations, setApiIntegrations] = useState<APIIntegration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);

  // 模态框状态
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

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
      toast({ title: "成功", description: `插件已${enabled ? '启用' : '禁用'}` });
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
      setApiModalOpen(false);
      apiForm.reset();
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
      setTestModalOpen(true);
      // Store result for modal display
      console.log('API 测试结果:', result);
    } catch (error) {
      toast({ title: "错误", description: `测试失败: ${error}`, variant: "destructive" });
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
      setWebhookModalOpen(false);
      webhookForm.reset();
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
      setAutomationModalOpen(false);
      automationForm.reset();
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plugins" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            插件
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            API 集成
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            自动化
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plugins">
          <div
            title="已安装的插件"
            extra={
              <Button type="primary" icon={<Plus className="w-4 h-4"  />}>
                安装插件
              </Button>
            }>
            <List
              dataSource={plugins}
              locale={{ emptyText: '暂无已安装的插件' }}
              renderItem={(plugin) => (
                <List.Item
                  actions={[
                    <Switch
                      checked={plugin.enabled}
                      onValueChange={(checked) => togglePlugin(plugin.id, checked)}
                    />,
                    <Button
                      type="text"
                      danger
                      icon={<Trash2 className="w-4 h-4"  />}
                      onClick={() => uninstallPlugin(plugin.id)}>
                      卸载
                    </Button>,
                  ]}>
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
          </div>
        </TabsContent>

        <TabsContent value="api">
          <div
            title="API 集成"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setApiModalOpen(true)}>
                新建集成
              </Button>
            }>
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
                      disabled={loading}>
                      测试
                    </Button>,
                    <Switch checked={integration.enabled} />,
                  ]}>
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
          </div>
        </TabsContent>

        <TabsContent value="webhooks">
          <div
            title="Webhook 配置"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setWebhookModalOpen(true)}>
                新建 Webhook
              </Button>
            }>
            <List
              dataSource={webhooks}
              locale={{ emptyText: '暂无Webhook配置' }}
              renderItem={(webhook) => (
                <List.Item
                  actions={[
                    <Switch checked={webhook.enabled} />,
                  ]}>
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
          </div>
        </TabsContent>

        <TabsContent value="automation">
          <div
            title="自动化规则"
            extra={
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4"  />}
                onClick={() => setAutomationModalOpen(true)}>
                新建规则
              </Button>
            }>
            <List
              dataSource={automationRules}
              locale={{ emptyText: '暂无自动化规则' }}
              renderItem={(rule) => (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      icon={<PlayCircle />}
                      onClick={() => executeAutomationRule(rule.id)}>
                      执行
                    </Button>,
                    <Switch checked={rule.enabled} />,
                  ]}>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* API 集成创建对话框 */}
      <Modal
        title="创建 API 集成"
        open={apiModalVisible}
        onOpenChange={(open) => !open && (() => setApiModalVisible(false))()}
        width={600}>
        <Form form={form} layout="vertical" onFinish={createApiIntegration}>
          <FormItem name="name" label="集成名称" rules={[{ required: true }]}>
            <Input placeholder="输入集成名称" />
          </FormItem>

          <FormItem name="type" label="集成类型" rules={[{ required: true }]}>
            <Select>
              <Option value="rest">REST API</Option>
              <Option value="graphql">GraphQL</Option>
              <Option value="webhook">Webhook</Option>
            </Select>
          </FormItem>

          <FormItem name="endpoint" label="API 端点" rules={[{ required: true }]}>
            <Input placeholder="https://api.example.com" />
          </FormItem>

          <FormItem name="authType" label="认证类型">
            <Select>
              <Option value="none">无认证</Option>
              <Option value="basic">Basic Auth</Option>
              <Option value="bearer">Bearer Token</Option>
              <Option value="apikey">API Key</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* Webhook 创建对话框 */}
      <Modal
        title="创建 Webhook"
        open={webhookModalVisible}
        onOpenChange={(open) => !open && (() => setWebhookModalVisible(false))()}
        width={600}>
        <Form form={form} layout="vertical" onFinish={createWebhook}>
          <FormItem name="name" label="Webhook 名称" rules={[{ required: true }]}>
            <Input placeholder="输入 Webhook 名称" />
          </FormItem>

          <FormItem name="url" label="Webhook URL" rules={[{ required: true }]}>
            <Input placeholder="https://hooks.example.com/webhook" />
          </FormItem>

          <FormItem name="events" label="监听事件">
            <Select mode="multiple" placeholder="选择要监听的事件">
              <Option value="query_completed">查询完成</Option>
              <Option value="connection_status">连接状态变化</Option>
              <Option value="export_completed">导出完成</Option>
              <Option value="alert_triggered">警报触发</Option>
            </Select>
          </FormItem>

          <FormItem name="secret" label="密钥（可选）">
            <Input.Password placeholder="用于签名验证的密钥" />
          </FormItem>
        </Form>
      </Modal>

      {/* 自动化规则创建对话框 */}
      <Modal
        title="创建自动化规则"
        open={automationModalVisible}
        onOpenChange={(open) => !open && (() => setAutomationModalVisible(false))()}
        width={700}>
        <Form form={form} layout="vertical" onFinish={createAutomationRule}>
          <FormItem name="name" label="规则名称" rules={[{ required: true }]}>
            <Input placeholder="输入规则名称" />
          </FormItem>

          <FormItem name="description" label="规则描述">
            <Textarea rows={2} placeholder="描述这个自动化规则的用途" />
          </FormItem>

          <FormItem name="triggerType" label="触发器类型" rules={[{ required: true }]}>
            <Select>
              <Option value="schedule">定时触发</Option>
              <Option value="event">事件触发</Option>
              <Option value="threshold">阈值触发</Option>
              <Option value="manual">手动触发</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
};

export default ExtensionManager;
