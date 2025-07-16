import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Alert,
  Switch,
  Separator,
  Textarea,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Typography,
  Empty
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import { Settings, Trash2, Plus, PlayCircle, PauseCircle, Package, Zap, Webhook, Bot, TestTube, ExternalLink } from 'lucide-react';
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

  const apiForm = useForm({
    defaultValues: {
      name: '',
      type: '',
      endpoint: '',
      authType: 'none'
    }
  });

  const webhookForm = useForm({
    defaultValues: {
      name: '',
      url: '',
      events: [],
      secret: ''
    }
  });

  const automationForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      triggerType: ''
    }
  });

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
      showNotification.success({
        message: "操作成功",
        description: `插件已${enabled ? '启用' : '禁用'}`
      });
      loadPlugins();
    } catch (error) {
      console.error('切换插件状态失败:', error);
      showMessage.error("操作失败");
    }
  };

  const uninstallPlugin = async (pluginId: string) => {
    try {
      await safeTauriInvoke('uninstall_plugin', { pluginId });
      showMessage.success("插件已卸载" );
      loadPlugins();
    } catch (error) {
      console.error('卸载插件失败:', error);
      showMessage.error("卸载失败");
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
      showMessage.success("API集成创建成功" );
      setApiModalOpen(false);
      apiForm.reset();
      loadApiIntegrations();
    } catch (error) {
      console.error('创建API集成失败:', error);
      showMessage.error("创建失败");
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
      showNotification.error({
        message: "测试失败",
        description: String(error)
      });
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
      showMessage.success("Webhook创建成功" );
      setWebhookModalOpen(false);
      webhookForm.reset();
      loadWebhooks();
    } catch (error) {
      console.error('创建Webhook失败:', error);
      showMessage.error("创建失败");
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
      showMessage.success("自动化规则创建成功" );
      setAutomationModalOpen(false);
      automationForm.reset();
      loadAutomationRules();
    } catch (error) {
      console.error('创建自动化规则失败:', error);
      showMessage.error("创建失败");
    }
  };

  const executeAutomationRule = async (ruleId: string) => {
    try {
      const result = await safeTauriInvoke('execute_automation_rule', {
        ruleId,
        context: {}});
      showMessage.success("自动化规则执行成功" );
      console.log('执行结果:', result);
    } catch (error) {
      console.error('执行自动化规则失败:', error);
      showMessage.error("执行失败");
    }
  };

  useEffect(() => {
    loadPlugins();
    loadApiIntegrations();
    loadWebhooks();
    loadAutomationRules();
  }, []);

  return (
    <div className="p-6 space-y-6">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>已安装的插件</CardTitle>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                安装插件
              </Button>
            </CardHeader>
            <CardContent>
              {plugins.length === 0 ? (
                <Empty description="暂无已安装的插件" />
              ) : (
                <div className="space-y-4">
                  {plugins.map((plugin) => (
                    <Card key={plugin.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Typography.Text className="font-medium">{plugin.name}</Typography.Text>
                            <Badge variant="secondary">v{plugin.version}</Badge>
                            <Badge variant={plugin.enabled ? "default" : "destructive"}>
                              {plugin.enabled ? '已启用' : '已禁用'}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <Typography.Text className="text-muted-foreground">
                              {plugin.description}
                            </Typography.Text>
                            <Typography.Text className="text-xs text-muted-foreground">
                              作者: {plugin.author}
                            </Typography.Text>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch
                            checked={plugin.enabled}
                            onCheckedChange={(checked) => togglePlugin(plugin.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => uninstallPlugin(plugin.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            卸载
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>API 集成</CardTitle>
              <Button
                className="flex items-center gap-2"
                onClick={() => setApiModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                新建集成
              </Button>
            </CardHeader>
            <CardContent>
              {apiIntegrations.length === 0 ? (
                <Empty description="暂无API集成" />
              ) : (
                <div className="space-y-4">
                  {apiIntegrations.map((integration) => (
                    <Card key={integration.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Typography.Text className="font-medium">{integration.name}</Typography.Text>
                            <Badge variant="secondary">{integration.integration_type}</Badge>
                          </div>
                          <Typography.Text className="text-muted-foreground">
                            {integration.endpoint}
                          </Typography.Text>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testApiIntegration(integration)}
                            disabled={loading}
                          >
                            <TestTube className="w-4 h-4 mr-1" />
                            测试
                          </Button>
                          <Switch checked={integration.enabled} onCheckedChange={(checked) => {/* TODO: 实现切换功能 */}} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Webhook 配置</CardTitle>
              <Button
                className="flex items-center gap-2"
                onClick={() => setWebhookModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                新建 Webhook
              </Button>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <Empty description="暂无Webhook配置" />
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => (
                    <Card key={webhook.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2">
                            <Typography.Text className="font-medium">{webhook.name}</Typography.Text>
                          </div>
                          <div className="space-y-2">
                            <Typography.Text className="text-muted-foreground">
                              {webhook.url}
                            </Typography.Text>
                            <div className="flex gap-2 flex-wrap">
                              {webhook.events.map(event => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Switch checked={webhook.enabled} onCheckedChange={(checked) => {/* TODO: 实现切换功能 */}} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>自动化规则</CardTitle>
              <Button
                className="flex items-center gap-2"
                onClick={() => setAutomationModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                新建规则
              </Button>
            </CardHeader>
            <CardContent>
              {automationRules.length === 0 ? (
                <Empty description="暂无自动化规则" />
              ) : (
                <div className="space-y-4">
                  {automationRules.map((rule) => (
                    <Card key={rule.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Typography.Text className="font-medium">{rule.name}</Typography.Text>
                            <Badge variant="secondary">执行 {rule.execution_count} 次</Badge>
                          </div>
                          <div className="space-y-1">
                            <Typography.Text className="text-muted-foreground">
                              {rule.description}
                            </Typography.Text>
                            <Typography.Text className="text-xs text-muted-foreground">
                              触发器: {rule.trigger.trigger_type}
                            </Typography.Text>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => executeAutomationRule(rule.id)}
                          >
                            <PlayCircle className="w-4 h-4 mr-1" />
                            执行
                          </Button>
                          <Switch checked={rule.enabled} onCheckedChange={(checked) => {/* TODO: 实现切换功能 */}} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API 集成创建对话框 */}
      <Dialog open={apiModalOpen} onOpenChange={setApiModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>创建 API 集成</DialogTitle>
          </DialogHeader>
          <Form {...apiForm}>
            <form onSubmit={apiForm.handleSubmit(createApiIntegration)} className="space-y-4">
              <FormField
                control={apiForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>集成名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入集成名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={apiForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>集成类型</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择集成类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rest">REST API</SelectItem>
                          <SelectItem value="graphql">GraphQL</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={apiForm.control}
                name="endpoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API 端点</FormLabel>
                    <FormControl>
                      <Input placeholder="https://api.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={apiForm.control}
                name="authType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>认证类型</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择认证类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">无认证</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="apikey">API Key</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setApiModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  创建
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Webhook 创建对话框 */}
      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>创建 Webhook</DialogTitle>
          </DialogHeader>
          <Form {...webhookForm}>
            <form onSubmit={webhookForm.handleSubmit(createWebhook)} className="space-y-4">
              <FormField
                control={webhookForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook 名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入 Webhook 名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={webhookForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Webhook URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://hooks.example.com/webhook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={webhookForm.control}
                name="events"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>监听事件</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择要监听的事件" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="query_completed">查询完成</SelectItem>
                          <SelectItem value="connection_status">连接状态变化</SelectItem>
                          <SelectItem value="export_completed">导出完成</SelectItem>
                          <SelectItem value="alert_triggered">警报触发</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={webhookForm.control}
                name="secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密钥（可选）</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="用于签名验证的密钥" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWebhookModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  创建
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 自动化规则创建对话框 */}
      <Dialog open={automationModalOpen} onOpenChange={setAutomationModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>创建自动化规则</DialogTitle>
          </DialogHeader>
          <Form {...automationForm}>
            <form onSubmit={automationForm.handleSubmit(createAutomationRule)} className="space-y-4">
              <FormField
                control={automationForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规则名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入规则名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={automationForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>规则描述</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="描述这个自动化规则的用途" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={automationForm.control}
                name="triggerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>触发器类型</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择触发器类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="schedule">定时触发</SelectItem>
                          <SelectItem value="event">事件触发</SelectItem>
                          <SelectItem value="threshold">阈值触发</SelectItem>
                          <SelectItem value="manual">手动触发</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAutomationModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit">
                  创建
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExtensionManager;
