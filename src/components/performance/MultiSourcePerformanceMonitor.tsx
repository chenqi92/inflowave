import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Activity,
  Database,
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
// 简化的性能指标类型
interface SimplePerformanceMetrics {
  connectionId: string;
  connectionName: string;
  dbType: string;
  status: string;
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  queryCount: number;
  averageQueryTime: number;
  errorRate: number;
  healthScore: string;
  recommendations: string[];
}

interface PerformanceMonitoringConfig {
  refreshInterval: number;
  autoRefresh: boolean;
  timeRange: string;
  alertThresholds: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    queryLatency: number;
  };
  enabledMetrics: string[];
}

interface MultiSourcePerformanceMonitorProps {
  className?: string;
}

export const MultiSourcePerformanceMonitor: React.FC<MultiSourcePerformanceMonitorProps> = ({ 
  className = '' 
}) => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts'>('overview');
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<SimplePerformanceMetrics[]>([]);
  const [config, setConfig] = useState<PerformanceMonitoringConfig>({
    refreshInterval: 30,
    autoRefresh: false,
    timeRange: '1h',
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      diskUsage: 90,
      queryLatency: 5000,
    },
    enabledMetrics: ['cpu', 'memory', 'disk', 'queries', 'errors'],
  });

  // Store hooks
  const { connections, connectedConnectionIds } = useConnectionStore();

  // 获取性能指标数据
  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);

      const result = await safeTauriInvoke<SimplePerformanceMetrics[]>(
        'get_multi_source_performance_overview'
      );

      setMetricsData(result);

      // 如果没有选中的数据源，选择第一个活跃的
      if (!selectedDataSource && result.length > 0) {
        const activeSource = result.find(m => m.status === 'connected');
        if (activeSource) {
          setSelectedDataSource(activeSource.connectionId);
        }
      }
    } catch (error) {
      console.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [selectedDataSource]);

  // 获取配置
  const fetchConfig = useCallback(async () => {
    try {
      const result = await safeTauriInvoke<PerformanceMonitoringConfig>(
        'get_performance_monitoring_config'
      );
      setConfig(result);
    } catch (error) {
      console.error('获取配置失败:', error);
    }
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (newConfig: Partial<PerformanceMonitoringConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      await safeTauriInvoke('update_performance_monitoring_config', { config: updatedConfig });
      setConfig(updatedConfig);
    } catch (error) {
      console.error('更新配置失败:', error);
      showMessage.error(`更新配置失败: ${error}`);
    }
  }, [config]);

  // 自动刷新
  useEffect(() => {
    if (config.autoRefresh) {
      const interval = setInterval(fetchPerformanceData, config.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, fetchPerformanceData]);

  // 初始化
  useEffect(() => {
    fetchConfig();
    fetchPerformanceData();
  }, [fetchConfig, fetchPerformanceData]);

  // 获取选中数据源的详细信息
  const getSelectedDataSourceDetails = useCallback(async (connectionId: string) => {
    try {
      setLoading(true);
      const result = await safeTauriInvoke<SimplePerformanceMetrics>(
        'get_single_source_performance_details',
        { connectionId }
      );

      // 更新该数据源的信息
      setMetricsData(prev =>
        prev.map(m => m.connectionId === connectionId ? result : m)
      );
    } catch (error) {
      console.error('获取详细信息失败:', error);
      showMessage.error(`获取详细信息失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 渲染数据源选择器
  const renderDataSourceSelector = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          数据源监控
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {metricsData.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">没有可监控的数据源</p>
            <p className="text-xs">请先连接数据库</p>
          </div>
        ) : (
          <div className="space-y-2">
            {metricsData.map(metrics => (
              <div
                key={metrics.connectionId}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedDataSource === metrics.connectionId
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSelectedDataSource(metrics.connectionId);
                  getSelectedDataSourceDetails(metrics.connectionId);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{metrics.connectionName}</div>
                    <div className="text-xs text-muted-foreground">
                      {metrics.dbType} • {metrics.queryCount} 查询
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={metrics.status === 'connected' ? 'default' : 'secondary'}>
                      {metrics.status === 'connected' ? '已连接' : '未连接'}
                    </Badge>
                    <Badge
                      variant={
                        metrics.healthScore === 'good' ? 'default' :
                        metrics.healthScore === 'warning' ? 'secondary' : 'destructive'
                      }
                    >
                      {metrics.healthScore === 'good' ? '良好' :
                       metrics.healthScore === 'warning' ? '警告' : '严重'}
                    </Badge>
                  </div>
                </div>

                {/* 简单的指标预览 */}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">CPU: </span>
                    <span className={metrics.cpuUsage > 80 ? 'text-red-500' : 'text-green-500'}>
                      {metrics.cpuUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">内存: </span>
                    <span className={metrics.memoryUsage > 85 ? 'text-red-500' : 'text-green-500'}>
                      {metrics.memoryUsage.toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">延迟: </span>
                    <span className={metrics.averageQueryTime > 1000 ? 'text-red-500' : 'text-green-500'}>
                      {metrics.averageQueryTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 渲染监控配置
  const renderMonitoringConfig = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          监控配置
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-refresh">自动刷新</Label>
          <Switch
            id="auto-refresh"
            checked={config.autoRefresh}
            onCheckedChange={(checked) =>
              updateConfig({ autoRefresh: checked })
            }
          />
        </div>

        <div className="space-y-2">
          <Label>刷新间隔</Label>
          <Select
            value={config.refreshInterval.toString()}
            onValueChange={(value) =>
              updateConfig({ refreshInterval: parseInt(value) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 秒</SelectItem>
              <SelectItem value="30">30 秒</SelectItem>
              <SelectItem value="60">1 分钟</SelectItem>
              <SelectItem value="300">5 分钟</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>时间范围</Label>
          <Select
            value={config.timeRange}
            onValueChange={(value) =>
              updateConfig({ timeRange: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 小时</SelectItem>
              <SelectItem value="6h">6 小时</SelectItem>
              <SelectItem value="24h">24 小时</SelectItem>
              <SelectItem value="7d">7 天</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={fetchPerformanceData}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          立即刷新
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 头部控制栏 */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">性能监控</h2>
            <p className="text-sm text-muted-foreground">
              多数据源性能监控和诊断
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {metricsData.length} 个数据源
            </Badge>
            <Badge variant="outline">
              {metricsData.filter(m => m.status === 'connected').length} 个已连接
            </Badge>
            {config.autoRefresh && (
              <Badge variant="default">
                <RefreshCw className="w-3 h-3 mr-1" />
                自动刷新
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="metrics">指标详情</TabsTrigger>
            <TabsTrigger value="alerts">告警设置</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 mt-4 mx-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              <div className="space-y-4">
                {renderDataSourceSelector()}
                {renderMonitoringConfig()}
              </div>
              <div className="lg:col-span-2">
                {/* 性能概览 */}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-sm">性能概览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDataSource ? (
                      (() => {
                        const selectedMetrics = metricsData.find(m => m.connectionId === selectedDataSource);
                        if (!selectedMetrics) {
                          return (
                            <div className="text-center py-8 text-muted-foreground">
                              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>未找到选中数据源的信息</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6">
                            {/* 数据源基本信息 */}
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-medium">{selectedMetrics.connectionName}</h3>
                                <p className="text-sm text-muted-foreground">{selectedMetrics.dbType}</p>
                              </div>
                              <Badge
                                variant={
                                  selectedMetrics.healthScore === 'good' ? 'default' :
                                  selectedMetrics.healthScore === 'warning' ? 'secondary' : 'destructive'
                                }
                              >
                                {selectedMetrics.healthScore === 'good' ? '健康' :
                                 selectedMetrics.healthScore === 'warning' ? '警告' : '严重'}
                              </Badge>
                            </div>

                            {/* 关键指标 */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="p-3 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <Cpu className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm font-medium">CPU</span>
                                </div>
                                <div className="text-2xl font-bold">{selectedMetrics.cpuUsage.toFixed(1)}%</div>
                              </div>

                              <div className="p-3 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <MemoryStick className="w-4 h-4 text-green-500" />
                                  <span className="text-sm font-medium">内存</span>
                                </div>
                                <div className="text-2xl font-bold">{selectedMetrics.memoryUsage.toFixed(1)}%</div>
                              </div>

                              <div className="p-3 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <HardDrive className="w-4 h-4 text-orange-500" />
                                  <span className="text-sm font-medium">磁盘</span>
                                </div>
                                <div className="text-2xl font-bold">{selectedMetrics.diskUsage.toFixed(1)}%</div>
                              </div>

                              <div className="p-3 border rounded">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-medium">查询</span>
                                </div>
                                <div className="text-2xl font-bold">{selectedMetrics.queryCount}</div>
                              </div>
                            </div>

                            {/* 性能指标 */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              <div className="p-3 border rounded">
                                <div className="text-sm font-medium mb-2">平均查询时间</div>
                                <div className="text-xl font-bold">
                                  {selectedMetrics.averageQueryTime.toFixed(0)}ms
                                </div>
                              </div>

                              <div className="p-3 border rounded">
                                <div className="text-sm font-medium mb-2">错误率</div>
                                <div className="text-xl font-bold">
                                  {(selectedMetrics.errorRate * 100).toFixed(2)}%
                                </div>
                              </div>
                            </div>

                            {/* 建议 */}
                            {selectedMetrics.recommendations.length > 0 && (
                              <div className="p-3 border rounded bg-muted/50">
                                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" />
                                  优化建议
                                </div>
                                <ul className="space-y-1">
                                  {selectedMetrics.recommendations.map((rec, index) => (
                                    <li key={index} className="text-sm text-muted-foreground">
                                      • {rec}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>请选择一个数据源查看详细信息</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 mt-4 mx-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-sm">详细指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>详细指标图表将在这里显示</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="flex-1 mt-4 mx-4">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-sm">告警配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>告警配置将在这里显示</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MultiSourcePerformanceMonitor;
