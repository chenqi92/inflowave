import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Badge,
  Button,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
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

// 真实的性能指标类型
interface RealPerformanceMetrics {
  connectionId: string;
  connectionName: string;
  databaseName: string;
  dbType: string;
  status: string;
  timestamp: string;
  isConnected: boolean;
  connectionLatency: number;
  activeQueries: number;
  totalQueriesToday: number;
  averageQueryTime: number;
  slowQueriesCount: number;
  failedQueriesCount: number;
  databaseSize: number;
  tableCount: number;
  recordCount: number;
  healthScore: string;
  issues: string[];
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

export const MultiSourcePerformanceMonitor: React.FC<
  MultiSourcePerformanceMonitorProps
> = ({ className = '' }) => {
  // 状态管理
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<RealPerformanceMetrics[]>([]);
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
  const { connections } = useConnectionStore();
  const { openedDatabases } = useOpenedDatabasesStore();

  // 获取打开数据源的性能数据
  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);

      // 获取打开的数据源列表
      const openedDataSourcesList = Array.from(openedDatabases);

      if (openedDataSourcesList.length === 0) {
        setMetricsData([]);
        return;
      }

      const result = await safeTauriInvoke<RealPerformanceMetrics[]>(
        'get_opened_datasources_performance',
        {
          openedDatasources: openedDataSourcesList,
        }
      );

      setMetricsData(result);

      // 如果没有选中的数据源，选择第一个
      if (!selectedDataSource && result.length > 0) {
        const firstSource = result[0];
        setSelectedDataSource(
          `${firstSource.connectionId}/${firstSource.databaseName}`
        );
      }
    } catch (error) {
      console.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [openedDatabases, selectedDataSource]);

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
  const updateConfig = useCallback(
    async (newConfig: Partial<PerformanceMonitoringConfig>) => {
      try {
        const updatedConfig = { ...config, ...newConfig };
        await safeTauriInvoke('update_performance_monitoring_config', {
          config: updatedConfig,
        });
        setConfig(updatedConfig);
      } catch (error) {
        console.error('更新配置失败:', error);
        showMessage.error(`更新配置失败: ${error}`);
      }
    },
    [config]
  );

  // 自动刷新
  useEffect(() => {
    if (config.autoRefresh) {
      const interval = setInterval(
        fetchPerformanceData,
        config.refreshInterval * 1000
      );
      return () => clearInterval(interval);
    }
  }, [config.autoRefresh, config.refreshInterval, fetchPerformanceData]);

  // 初始化
  useEffect(() => {
    fetchConfig();
    fetchPerformanceData();
  }, [fetchConfig, fetchPerformanceData]);

  // 获取选中数据源的详细信息
  const getSelectedDataSourceDetails = useCallback(
    async (datasourceKey: string) => {
      try {
        setLoading(true);
        const result = await safeTauriInvoke<RealPerformanceMetrics>(
          'get_datasource_performance_details',
          { datasourceKey }
        );

        // 更新该数据源的信息
        setMetricsData(prev =>
          prev.map(m =>
            `${m.connectionId}/${m.databaseName}` === datasourceKey ? result : m
          )
        );
      } catch (error) {
        console.error('获取详细信息失败:', error);
        showMessage.error(`获取详细信息失败: ${error}`);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 渲染打开的数据源列表
  const renderOpenedDataSources = () => (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm flex items-center gap-2'>
          <Database className='w-4 h-4' />
          打开的数据源
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {metricsData.length === 0 ? (
          <div className='text-center py-4 text-muted-foreground'>
            <Database className='w-8 h-8 mx-auto mb-2 opacity-50' />
            <p className='text-sm'>没有打开的数据源</p>
            <p className='text-xs'>请在左侧数据源树中打开数据库</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {metricsData.map(metrics => {
              const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
              return (
                <div
                  key={datasourceKey}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedDataSource === datasourceKey
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedDataSource(datasourceKey);
                    getSelectedDataSourceDetails(datasourceKey);
                  }}
                >
                  <div className='flex items-center justify-between mb-2'>
                    <div>
                      <div className='font-medium text-sm'>
                        {metrics.connectionName}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {metrics.databaseName} • {metrics.dbType}
                      </div>
                    </div>
                    <div className='flex flex-col items-end gap-1'>
                      <Badge
                        variant={metrics.isConnected ? 'default' : 'secondary'}
                        className='text-xs'
                      >
                        {metrics.isConnected ? '已连接' : '未连接'}
                      </Badge>
                      <Badge
                        variant={
                          metrics.healthScore === 'good'
                            ? 'default'
                            : metrics.healthScore === 'warning'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className='text-xs'
                      >
                        {metrics.healthScore === 'good'
                          ? '良好'
                          : metrics.healthScore === 'warning'
                            ? '警告'
                            : metrics.healthScore === 'critical'
                              ? '严重'
                              : '未知'}
                      </Badge>
                    </div>
                  </div>

                  {/* 关键指标预览 */}
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div>
                      <span className='text-muted-foreground'>延迟: </span>
                      <span
                        className={
                          metrics.connectionLatency > 500
                            ? 'text-red-500'
                            : 'text-green-500'
                        }
                      >
                        {metrics.connectionLatency >= 0
                          ? `${metrics.connectionLatency.toFixed(0)}ms`
                          : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>表数: </span>
                      <span>{metrics.tableCount}</span>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>大小: </span>
                      <span>
                        {(metrics.databaseSize / 1024 / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    <div>
                      <span className='text-muted-foreground'>记录: </span>
                      <span>{metrics.recordCount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 渲染监控配置
  const renderMonitoringConfig = () => (
    <div className='flex items-center gap-4 p-4 bg-muted/30 rounded-lg'>
      <div className='flex items-center gap-2'>
        <Label htmlFor='auto-refresh' className='text-sm'>
          自动刷新
        </Label>
        <Switch
          id='auto-refresh'
          checked={config.autoRefresh}
          onCheckedChange={checked => updateConfig({ autoRefresh: checked })}
        />
      </div>

      <div className='flex items-center gap-2'>
        <Label className='text-sm'>间隔:</Label>
        <Select
          value={config.refreshInterval.toString()}
          onValueChange={value =>
            updateConfig({ refreshInterval: parseInt(value) })
          }
        >
          <SelectTrigger className='w-20'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='10'>10s</SelectItem>
            <SelectItem value='30'>30s</SelectItem>
            <SelectItem value='60'>1m</SelectItem>
            <SelectItem value='300'>5m</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='flex items-center gap-2'>
        <Label className='text-sm'>范围:</Label>
        <Select
          value={config.timeRange}
          onValueChange={value => updateConfig({ timeRange: value })}
        >
          <SelectTrigger className='w-20'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1h'>1h</SelectItem>
            <SelectItem value='6h'>6h</SelectItem>
            <SelectItem value='24h'>24h</SelectItem>
            <SelectItem value='7d'>7d</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={fetchPerformanceData}
        disabled={loading}
        size='sm'
        variant='outline'
      >
        <RefreshCw
          className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
        />
        刷新
      </Button>
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 头部控制栏 */}
      <div className='p-4 border-b border-border bg-muted/30'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-semibold'>性能监控</h2>
            <p className='text-sm text-muted-foreground'>
              多数据源性能监控和诊断
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{metricsData.length} 个数据源</Badge>
            <Badge variant='outline'>
              {metricsData.filter(m => m.status === 'connected').length}{' '}
              个已连接
            </Badge>
            {config.autoRefresh && (
              <Badge variant='default'>
                <RefreshCw className='w-3 h-3 mr-1' />
                自动刷新
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className='flex-1 overflow-hidden'>
        <Tabs
          value={activeTab}
          onValueChange={(value: any) => setActiveTab(value)}
          className='h-full flex flex-col'
        >
          <TabsList className='mx-4 mt-4'>
            <TabsTrigger value='overview'>概览</TabsTrigger>
            <TabsTrigger value='metrics'>指标详情</TabsTrigger>
            <TabsTrigger value='alerts'>告警设置</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='flex-1 mt-4 mx-4'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 h-full'>
              <div className='space-y-4'>
                {renderOpenedDataSources()}
                {renderMonitoringConfig()}
              </div>
              <div className='lg:col-span-2'>
                {/* 性能概览 */}
                <Card className='h-full'>
                  <CardHeader>
                    <CardTitle className='text-sm'>性能概览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDataSource ? (
                      (() => {
                        const selectedMetrics = metricsData.find(
                          m => `${m.connectionId}/${m.databaseName}` === selectedDataSource
                        );
                        if (!selectedMetrics) {
                          return (
                            <div className='text-center py-8 text-muted-foreground'>
                              <Activity className='w-8 h-8 mx-auto mb-2 opacity-50' />
                              <p>未找到选中数据源的信息</p>
                            </div>
                          );
                        }

                        return (
                          <div className='space-y-6'>
                            {/* 数据源基本信息 */}
                            <div className='flex items-center justify-between'>
                              <div>
                                <h3 className='font-medium'>
                                  {selectedMetrics.connectionName}
                                </h3>
                                <p className='text-sm text-muted-foreground'>
                                  {selectedMetrics.dbType}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  selectedMetrics.healthScore === 'good'
                                    ? 'default'
                                    : selectedMetrics.healthScore === 'warning'
                                      ? 'secondary'
                                      : 'destructive'
                                }
                              >
                                {selectedMetrics.healthScore === 'good'
                                  ? '健康'
                                  : selectedMetrics.healthScore === 'warning'
                                    ? '警告'
                                    : '严重'}
                              </Badge>
                            </div>

                            {/* 关键指标 */}
                            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                              <div className='p-3 border rounded'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <Network className='w-4 h-4 text-blue-500' />
                                  <span className='text-sm font-medium'>
                                    延迟
                                  </span>
                                </div>
                                <div className='text-2xl font-bold'>
                                  {selectedMetrics.connectionLatency}ms
                                </div>
                              </div>

                              <div className='p-3 border rounded'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <Database className='w-4 h-4 text-green-500' />
                                  <span className='text-sm font-medium'>
                                    表数
                                  </span>
                                </div>
                                <div className='text-2xl font-bold'>
                                  {selectedMetrics.tableCount}
                                </div>
                              </div>

                              <div className='p-3 border rounded'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <HardDrive className='w-4 h-4 text-orange-500' />
                                  <span className='text-sm font-medium'>
                                    大小
                                  </span>
                                </div>
                                <div className='text-2xl font-bold'>
                                  {(selectedMetrics.databaseSize / 1024 / 1024).toFixed(1)}MB
                                </div>
                              </div>

                              <div className='p-3 border rounded'>
                                <div className='flex items-center gap-2 mb-1'>
                                  <TrendingUp className='w-4 h-4 text-purple-500' />
                                  <span className='text-sm font-medium'>
                                    查询
                                  </span>
                                </div>
                                <div className='text-2xl font-bold'>
                                  {selectedMetrics.activeQueries}
                                </div>
                              </div>
                            </div>

                            {/* 性能指标 */}
                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                              <div className='p-3 border rounded'>
                                <div className='text-sm font-medium mb-2'>
                                  平均查询时间
                                </div>
                                <div className='text-xl font-bold'>
                                  {selectedMetrics.averageQueryTime.toFixed(0)}
                                  ms
                                </div>
                              </div>

                              <div className='p-3 border rounded'>
                                <div className='text-sm font-medium mb-2'>
                                  失败查询
                                </div>
                                <div className='text-xl font-bold'>
                                  {selectedMetrics.failedQueriesCount}
                                </div>
                              </div>
                            </div>

                            {/* 建议 */}
                            {selectedMetrics.recommendations.length > 0 && (
                              <div className='p-3 border rounded bg-muted/50'>
                                <div className='text-sm font-medium mb-2 flex items-center gap-2'>
                                  <AlertTriangle className='w-4 h-4' />
                                  优化建议
                                </div>
                                <ul className='space-y-1'>
                                  {selectedMetrics.recommendations.map(
                                    (rec, index) => (
                                      <li
                                        key={index}
                                        className='text-sm text-muted-foreground'
                                      >
                                        • {rec}
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className='text-center py-8 text-muted-foreground'>
                        <Activity className='w-8 h-8 mx-auto mb-2 opacity-50' />
                        <p>请选择一个数据源查看详细信息</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='metrics' className='flex-1 mt-4 mx-4'>
            <Card className='h-full'>
              <CardHeader>
                <CardTitle className='text-sm'>详细指标</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-center py-8 text-muted-foreground'>
                  <TrendingUp className='w-8 h-8 mx-auto mb-2 opacity-50' />
                  <p>详细指标图表将在这里显示</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='alerts' className='flex-1 mt-4 mx-4'>
            <Card className='h-full'>
              <CardHeader>
                <CardTitle className='text-sm'>告警配置</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-center py-8 text-muted-foreground'>
                  <AlertTriangle className='w-8 h-8 mx-auto mb-2 opacity-50' />
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
