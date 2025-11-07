import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  SearchInput,
  ExpandableSearchInput,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, TooltipProvider,
} from '@/components/ui';
import {
  Package,
  Webhook,
  Zap,
  Bot,
  Plus,
  RefreshCw,
  MoreVertical,
  Settings,
  Play,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import logger from '@/utils/logger';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  status: 'active' | 'inactive' | 'error';
  lastUpdated: Date;
  size: number;
}

interface APIIntegration {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'webhook';
  endpoint: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: Date;
  config: Record<string, unknown>;
}

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  enabled: boolean;
  events: string[];
  headers: Record<string, string>;
  lastTriggered?: Date;
  triggerCount: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  enabled: boolean;
  executionCount: number;
  lastExecuted?: Date;
  status: 'active' | 'paused' | 'error';
}

interface VerticalExtensionManagerProps {
  className?: string;
}

export const VerticalExtensionManager: React.FC<VerticalExtensionManagerProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'plugins' | 'api' | 'webhooks' | 'automation'>('plugins');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 数据状态
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [apiIntegrations, setApiIntegrations] = useState<APIIntegration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);

  // 模态框状态
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Plugin | APIIntegration | WebhookConfig | AutomationRule | null>(null);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载插件数据
      const pluginsData = await safeTauriInvoke<Plugin[]>('get_installed_plugins');
      setPlugins(pluginsData || []);

      // 加载API集成数据
      const apiData = await safeTauriInvoke<APIIntegration[]>('get_api_integrations');
      setApiIntegrations(apiData || []);

      // 加载Webhook配置
      const webhooksData = await safeTauriInvoke<WebhookConfig[]>('get_webhook_configs');
      setWebhooks(webhooksData || []);

      // 加载自动化规则
      const automationData = await safeTauriInvoke<AutomationRule[]>('get_automation_rules');
      setAutomationRules(automationData || []);
    } catch (error) {
      logger.error('加载扩展数据失败:', error);
      showMessage.error('加载数据失败');
      // 设置空数组作为fallback
      setPlugins([]);
      setApiIntegrations([]);
      setWebhooks([]);
      setAutomationRules([]);
    } finally {
      setLoading(false);
    }
  };

  // 切换插件状态
  const togglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      await safeTauriInvoke('toggle_plugin', { pluginId, enabled });
      setPlugins(prev => prev.map(p => 
        p.id === pluginId ? { ...p, enabled, status: enabled ? 'active' : 'inactive' } : p
      ));
      showMessage.success(`插件已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      showMessage.error('操作失败');
    }
  };

  // 切换 API 集成状态
  const toggleApiIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      await safeTauriInvoke('toggle_api_integration', { integrationId, enabled });
      setApiIntegrations(prev => prev.map(api => 
        api.id === integrationId ? { ...api, enabled, status: enabled ? 'connected' : 'disconnected' } : api
      ));
      showMessage.success(`API集成已${enabled ? '启用' : '禁用'}`);
    } catch (error) {
      showMessage.error('操作失败');
    }
  };

  // 测试 API 集成
  const testApiIntegration = async (integration: APIIntegration) => {
    setLoading(true);
    try {
      await safeTauriInvoke('test_api_integration', { integration });
      showMessage.success('API 连接测试成功');
    } catch (error) {
      showMessage.error('API 连接测试失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除项目
  const deleteItem = async (type: string, id: string) => {
    try {
      await safeTauriInvoke(`delete_${type}`, { id });
      
      switch (type) {
        case 'plugin':
          setPlugins(prev => prev.filter(p => p.id !== id));
          break;
        case 'api_integration':
          setApiIntegrations(prev => prev.filter(api => api.id !== id));
          break;
        case 'webhook':
          setWebhooks(prev => prev.filter(w => w.id !== id));
          break;
        case 'automation_rule':
          setAutomationRules(prev => prev.filter(r => r.id !== id));
          break;
      }
      
      showMessage.success('删除成功');
    } catch (error) {
      showMessage.error('删除失败');
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive':
      case 'disconnected':
      case 'paused':
        return <XCircle className="w-3 h-3 text-gray-500" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // 渲染插件项
  const renderPluginItem = (plugin: Plugin) => (
    <Card key={plugin.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* 插件信息 */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="text-sm font-medium truncate">{plugin.name}</h5>
                <Badge variant="outline" className="text-xs">v{plugin.version}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                {plugin.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getStatusIcon(plugin.status)}
                <span>{plugin.author}</span>
                <span>•</span>
                <span>{formatFileSize(plugin.size)}</span>
              </div>
            </div>
          </div>

          {/* 操作区域 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={plugin.enabled}
                onCheckedChange={(enabled) => togglePlugin(plugin.id, enabled)}
              />
              <span className="text-xs text-muted-foreground">
                {plugin.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  设置
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  详情
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => deleteItem('plugin', plugin.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  卸载
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // 渲染 API 集成项
  const renderApiIntegrationItem = (integration: APIIntegration) => (
    <Card key={integration.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="text-sm font-medium truncate">{integration.name}</h5>
                <Badge variant="outline" className="text-xs">{integration.type}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1 truncate">
                {integration.endpoint}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {getStatusIcon(integration.status)}
                <span>最后同步: {formatTime(integration.lastSync)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={integration.enabled}
                onCheckedChange={(enabled) => toggleApiIntegration(integration.id, enabled)}
              />
              <span className="text-xs text-muted-foreground">
                {integration.enabled ? '已启用' : '已禁用'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => testApiIntegration(integration)}
                className="h-6 px-2 text-xs"
              >
                <TestTube className="w-3 h-3 mr-1" />
                测试
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    配置
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteItem('api_integration', integration.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* 头部 */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-start gap-1">
            <ExpandableSearchInput
              placeholder="搜索扩展..."
              value={searchText}
              onChange={(value: string) => setSearchText(value)}
              onClear={() => setSearchText('')}
            />

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant={filterStatus !== 'all' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Filter className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>状态过滤</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                  所有状态
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                  活跃
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('inactive')}>
                  非活跃
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('error')}>
                  错误
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>

            <Popover open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>添加扩展</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-80" align="end" side="bottom">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">添加扩展</h4>
                  <p className="text-xs text-muted-foreground">
                    选择要添加的扩展类型
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      <Package className="w-5 h-5" />
                      <span className="text-xs">插件</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      <Webhook className="w-5 h-5" />
                      <span className="text-xs">API集成</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      <Zap className="w-5 h-5" />
                      <span className="text-xs">Webhook</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex flex-col gap-1"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      <Bot className="w-5 h-5" />
                      <span className="text-xs">自动化</span>
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'plugins' | 'api' | 'webhooks' | 'automation')} className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b bg-transparent p-0 h-auto grid grid-cols-4">
            <TabsTrigger
              value="plugins"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Package className="w-4 h-4 mr-2" />
              插件
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Webhook className="w-4 h-4 mr-2" />
              API
            </TabsTrigger>
            <TabsTrigger
              value="webhooks"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Zap className="w-4 h-4 mr-2" />
              Hook
            </TabsTrigger>
            <TabsTrigger
              value="automation"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              <Bot className="w-4 h-4 mr-2" />
              自动化
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plugins" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : plugins.length > 0 ? (
                  plugins.map(renderPluginItem)
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无插件</p>
                    <p className="text-xs text-muted-foreground mt-1">点击"添加"安装新插件</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="api" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : apiIntegrations.length > 0 ? (
                  apiIntegrations.map(renderApiIntegrationItem)
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Webhook className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无API集成</p>
                    <p className="text-xs text-muted-foreground mt-1">点击"添加"创建新集成</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="webhooks" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : webhooks.length > 0 ? (
                  webhooks.map(webhook => (
                    <Card key={webhook.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium truncate">{webhook.name}</h5>
                              <p className="text-xs text-muted-foreground mb-1 truncate">
                                {webhook.method} {webhook.url}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>触发 {webhook.triggerCount} 次</span>
                                {webhook.lastTriggered && (
                                  <>
                                    <span>•</span>
                                    <span>最后: {formatTime(webhook.lastTriggered)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch checked={webhook.enabled} />
                              <span className="text-xs text-muted-foreground">
                                {webhook.enabled ? '已启用' : '已禁用'}
                              </span>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <MoreVertical className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <TestTube className="w-4 h-4 mr-2" />
                                  测试
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Settings className="w-4 h-4 mr-2" />
                                  配置
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => deleteItem('webhook', webhook.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Zap className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无Webhook</p>
                    <p className="text-xs text-muted-foreground mt-1">点击"添加"创建新Webhook</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="automation" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : automationRules.length > 0 ? (
                  automationRules.map(rule => (
                    <Card key={rule.id} className="mb-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:hover:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-all duration-200">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="text-sm font-medium truncate">{rule.name}</h5>
                                {getStatusIcon(rule.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                                {rule.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>执行 {rule.executionCount} 次</span>
                                {rule.lastExecuted && (
                                  <>
                                    <span>•</span>
                                    <span>最后: {formatTime(rule.lastExecuted)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Switch checked={rule.enabled} />
                              <span className="text-xs text-muted-foreground">
                                {rule.enabled ? '已启用' : '已禁用'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <Play className="w-3 h-3 mr-1" />
                                执行
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Settings className="w-4 h-4 mr-2" />
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => deleteItem('automation_rule', rule.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    删除
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bot className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无自动化规则</p>
                    <p className="text-xs text-muted-foreground mt-1">点击"添加"创建新规则</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default VerticalExtensionManager;
