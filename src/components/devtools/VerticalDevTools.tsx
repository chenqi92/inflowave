import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Input,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Progress,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Terminal,
  Database,
  Bell,
  Bug,
  Activity,
  RefreshCw,
  Download,
  Trash2,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Search,
  Filter,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Code,
  FileText,
  Zap,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: 'app' | 'system' | 'browser';
  message: string;
  details?: Record<string, unknown>;
}

interface SystemInfo {
  os: string;
  arch: string;
  version: string;
  memory: {
    total: number;
    used: number;
    available: number;
  };
  cpu: {
    cores: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
  };
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface VerticalDevToolsProps {
  className?: string;
}

export const VerticalDevTools: React.FC<VerticalDevToolsProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'system' | 'performance' | 'tools'>('console');
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [logLevel, setLogLevel] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 数据状态
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadLogs(),
        loadSystemInfo(),
        loadPerformanceMetrics(),
      ]);
    } catch (error) {
      console.error('加载开发工具数据失败:', error);
      showMessage.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const appLogs = await safeTauriInvoke<LogEntry[]>('get_app_logs');
      setLogs(appLogs || []);
    } catch (error) {
      console.error('加载日志失败:', error);
      setLogs([]);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const info = await safeTauriInvoke<SystemInfo>('get_system_info');
      setSystemInfo(info);
    } catch (error) {
      console.error('加载系统信息失败:', error);
      setSystemInfo(null);
    }
  };

  const loadPerformanceMetrics = async () => {
    try {
      const metrics = await safeTauriInvoke<PerformanceMetric[]>('get_performance_metrics');
      setPerformanceMetrics(metrics || []);
    } catch (error) {
      console.error('加载性能指标失败:', error);
      setPerformanceMetrics([]);
    }
  };

  // 清空日志
  const clearLogs = async () => {
    try {
      await safeTauriInvoke('clear_app_logs');
      setLogs([]);
      showMessage.success('日志已清空');
    } catch (error) {
      showMessage.error('清空日志失败');
    }
  };

  // 导出日志
  const exportLogs = async () => {
    try {
      const logData = logs.map(log => ({
        timestamp: log.timestamp.toISOString(),
        level: log.level,
        source: log.source,
        message: log.message,
        details: log.details,
      }));
      
      await safeTauriInvoke('export_logs', { logs: logData });
      showMessage.success('日志已导出');
    } catch (error) {
      showMessage.error('导出日志失败');
    }
  };

  // 切换开发者工具
  const toggleDevTools = async () => {
    try {
      await safeTauriInvoke('toggle_devtools');
      showMessage.success('开发者工具已切换');
    } catch (error) {
      showMessage.error('切换开发者工具失败');
    }
  };

  // 过滤日志
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchText || 
      log.message.toLowerCase().includes(searchText.toLowerCase());
    const matchesLevel = logLevel === 'all' || log.level === logLevel;
    return matchesSearch && matchesLevel;
  });

  // 获取日志级别颜色
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-foreground';
    }
  };

  // 获取日志级别图标
  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-3 h-3 text-red-500" />;
      case 'warn':
        return <AlertCircle className="w-3 h-3 text-yellow-500" />;
      case 'info':
        return <Info className="w-3 h-3 text-blue-500" />;
      case 'debug':
        return <Bug className="w-3 h-3 text-gray-500" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const timeString = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);

    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${milliseconds}`;
  };

  // 格式化字节
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取性能状态颜色
  const getPerformanceStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-foreground';
    }
  };

  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* 头部 */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">开发工具</h2>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`h-7 w-7 p-0 ${autoRefresh ? 'text-green-500' : ''}`}
                  >
                    {autoRefresh ? <Activity className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-7 w-7 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="搜索日志..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* 日志级别过滤 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs justify-between">
                <span className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {logLevel === 'all' ? '所有级别' : logLevel.toUpperCase()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => setLogLevel('all')}>
                所有级别
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLogLevel('error')}>
                <XCircle className="w-4 h-4 mr-2 text-red-500" />
                错误
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLogLevel('warn')}>
                <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                警告
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLogLevel('info')}>
                <Info className="w-4 h-4 mr-2 text-blue-500" />
                信息
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLogLevel('debug')}>
                <Bug className="w-4 h-4 mr-2 text-gray-500" />
                调试
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'console' | 'system' | 'performance' | 'tools')} className="flex-1 flex flex-col">
          <div className="px-3 border-b">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="console" className="text-xs">
                <Terminal className="w-3 h-3 mr-1" />
                控制台
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs">
                <Activity className="w-3 h-3 mr-1" />
                系统
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                性能
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                工具
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="console" className="flex-1 mt-0">
            <div className="flex flex-col h-full">
              {/* 控制台操作栏 */}
              <div className="p-3 border-b flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {filteredLogs.length} 条日志
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exportLogs}
                    className="h-6 px-2 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    导出
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearLogs}
                    className="h-6 px-2 text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空
                  </Button>
                </div>
              </div>

              {/* 日志列表 */}
              <ScrollArea className="flex-1">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : filteredLogs.length > 0 ? (
                    <div className="space-y-1">
                      {filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 text-xs">
                          <div className="flex-shrink-0 mt-0.5">
                            {getLogLevelIcon(log.level)}
                          </div>
                          <div className="flex-shrink-0 text-muted-foreground font-mono">
                            {formatTime(log.timestamp)}
                          </div>
                          <div className="flex-shrink-0">
                            <Badge variant="outline" className="text-xs h-4">
                              {log.source}
                            </Badge>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`${getLogLevelColor(log.level)} break-words`}>
                              {log.message}
                            </div>
                            {log.details && (
                              <div className="text-muted-foreground mt-1 font-mono text-xs">
                                {JSON.stringify(log.details, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Terminal className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {searchText || logLevel !== 'all' ? '没有匹配的日志' : '暂无日志'}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="system" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : systemInfo ? (
                  <div className="space-y-3">
                    {/* 基本信息 */}
                    <Card>
                      <CardHeader className="p-3">
                        <h4 className="text-sm font-medium">系统信息</h4>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">操作系统:</span>
                            <div className="font-medium">{systemInfo.os}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">架构:</span>
                            <div className="font-medium">{systemInfo.arch}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">版本:</span>
                            <div className="font-medium">{systemInfo.version}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 资源使用情况 */}
                    <Card>
                      <CardHeader className="p-3">
                        <h4 className="text-sm font-medium">资源使用</h4>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-3">
                        {/* 内存 */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>内存</span>
                            <span>{formatBytes(systemInfo.memory.used)} / {formatBytes(systemInfo.memory.total)}</span>
                          </div>
                          <Progress 
                            value={(systemInfo.memory.used / systemInfo.memory.total) * 100} 
                            className="h-2"
                          />
                        </div>

                        {/* CPU */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>CPU ({systemInfo.cpu.cores} 核)</span>
                            <span>{systemInfo.cpu.usage.toFixed(1)}%</span>
                          </div>
                          <Progress value={systemInfo.cpu.usage} className="h-2" />
                        </div>

                        {/* 磁盘 */}
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>磁盘</span>
                            <span>{formatBytes(systemInfo.disk.used)} / {formatBytes(systemInfo.disk.total)}</span>
                          </div>
                          <Progress 
                            value={(systemInfo.disk.used / systemInfo.disk.total) * 100} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">无法获取系统信息</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="performance" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : performanceMetrics.length > 0 ? (
                  <div className="space-y-2">
                    {performanceMetrics.map((metric, index) => (
                      <Card key={index}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium">{metric.name}</div>
                              <div className={`text-xs ${getPerformanceStatusColor(metric.status)}`}>
                                {metric.value} {metric.unit}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant={
                                metric.status === 'good' ? 'default' :
                                metric.status === 'warning' ? 'secondary' : 'destructive'
                              }>
                                {metric.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Zap className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">暂无性能指标</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tools" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {/* 开发工具 */}
                <Card>
                  <CardHeader className="p-3">
                    <h4 className="text-sm font-medium">开发工具</h4>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleDevTools}
                      className="w-full justify-start text-xs"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      切换浏览器开发者工具
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-xs"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      打开日志文件夹
                    </Button>
                  </CardContent>
                </Card>

                {/* 调试选项 */}
                <Card>
                  <CardHeader className="p-3">
                    <h4 className="text-sm font-medium">调试选项</h4>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs">详细日志</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">性能监控</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs">错误报告</span>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                {/* 环境信息 */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    当前运行在 {import.meta.env.DEV ? '开发' : '生产'} 模式下
                  </AlertDescription>
                </Alert>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default VerticalDevTools;
