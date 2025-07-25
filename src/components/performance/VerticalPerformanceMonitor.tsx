import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Progress,
  Badge,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Eye,
  BarChart3,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useTheme } from '@/components/providers/ThemeProvider';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ReactECharts from 'echarts-for-react';

interface PerformanceMetrics {
  queryExecutionTime: Array<{ timestamp: string; value: number }>;
  writeLatency: Array<{ timestamp: string; value: number }>;
  memoryUsage: Array<{ timestamp: string; value: number }>;
  cpuUsage: Array<{ timestamp: string; value: number }>;
  diskIO: {
    readBytes: number;
    writeBytes: number;
    readOps: number;
    writeOps: number;
  };
  networkIO: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  storageAnalysis: {
    totalSize: number;
    compressionRatio: number;
    retentionPolicyEffectiveness: number;
    recommendations: string[];
  };
}

interface PerformanceBottleneck {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'ignored';
}

interface VerticalPerformanceMonitorProps {
  className?: string;
}

export const VerticalPerformanceMonitor: React.FC<
  VerticalPerformanceMonitorProps
> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'metrics' | 'bottlenecks'
  >('overview');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const [timeRange, setTimeRange] = useState('1h');

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<PerformanceBottleneck[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    overall: 0,
  });

  const { activeConnectionId } = useConnectionStore();
  const { resolvedTheme } = useTheme();

  // 获取性能指标
  const fetchMetrics = useCallback(async () => {
    if (!activeConnectionId) {
      return;
    }

    try {
      setLoading(true);

      // 获取性能指标
      const metricsData = await safeTauriInvoke<PerformanceMetrics>(
        'get_performance_metrics_result',
        {
          connectionId: activeConnectionId,
          monitoringMode: 'remote',
          timeRange,
        }
      );

      // 获取性能瓶颈
      const hours =
        parseInt(timeRange.replace('h', '').replace('d', '')) *
        (timeRange.includes('d') ? 24 : 1);
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const endTime = new Date();

      const bottlenecksData = await safeTauriInvoke<PerformanceBottleneck[]>(
        'detect_performance_bottlenecks_with_mode',
        {
          connectionId: activeConnectionId || '',
          mode: 'remote',
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            hours,
          },
        }
      );

      setMetrics(metricsData);
      setBottlenecks(bottlenecksData || []);

      // 计算系统健康度
      const latestCpu =
        metricsData.cpuUsage[metricsData.cpuUsage.length - 1]?.value || 0;
      const latestMemory =
        metricsData.memoryUsage[metricsData.memoryUsage.length - 1]?.value || 0;

      // 修复磁盘使用率计算 - 基于磁盘IO速率
      const diskUsage = metricsData.diskIO
        ? Math.min(
            // 将磁盘IO速率转换为使用率百分比 (假设100MB/s为100%使用率)
            ((metricsData.diskIO.readBytes + metricsData.diskIO.writeBytes) / (1024 * 1024)) / 100 * 100,
            100
          )
        : 0;

      // 修复网络使用率计算 - 基于网络流量速率
      const networkUsage = metricsData.networkIO
        ? Math.min(
            // 将网络流量速率转换为使用率百分比 (假设10MB/s为100%使用率)
            ((metricsData.networkIO.bytesIn + metricsData.networkIO.bytesOut) / (1024 * 1024)) / 10 * 100,
            100
          )
        : 0;

      const health = {
        cpu: latestCpu,
        memory: latestMemory,
        disk: Math.max(diskUsage, Math.min((metricsData.diskIO?.readOps || 0) / 50, 100)), // 使用IOPS作为备用指标
        network: Math.max(networkUsage, Math.min((metricsData.networkIO?.packetsIn || 0) / 100, 100)), // 使用包数作为备用指标
        overall: 0,
      };
      health.overall =
        (health.cpu + health.memory + health.disk + health.network) / 4;

      setSystemHealth(health);
    } catch (error) {
      console.error('获取性能指标失败:', error);
      showMessage.error('获取远程性能指标失败');
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, timeRange]);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchMetrics]);

  // 初始加载
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // 生成图表配置
  const generateChartOption = useCallback(
    (
      data: Array<{
        timestamp: string;
        value: number;
      }>,
      title: string,
      unit: string = ''
    ) => {
      const isDark = resolvedTheme === 'dark';

      return {
        backgroundColor: 'transparent',
        textStyle: { color: isDark ? '#ffffff' : '#000000' },
        tooltip: {
          trigger: 'axis',
          backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
          borderColor: isDark ? '#404040' : '#d9d9d9',
          textStyle: { color: isDark ? '#ffffff' : '#000000' },
          formatter: (params: any) => {
            const point = params[0];
            const value =
              typeof point.value === 'number'
                ? point.value.toFixed(2)
                : point.value;
            return `${title}<br/>${point.name}<br/>${value}${unit}`;
          },
        },
        xAxis: {
          type: 'category',
          data: data.map(item => new Date(item.timestamp).toLocaleTimeString()),
          axisLabel: { color: isDark ? '#ffffff' : '#000000', fontSize: 10 },
          axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: isDark ? '#ffffff' : '#000000', fontSize: 10 },
          axisLine: { lineStyle: { color: isDark ? '#404040' : '#d9d9d9' } },
          splitLine: { lineStyle: { color: isDark ? '#404040' : '#f0f0f0' } },
        },
        series: [
          {
            name: title,
            type: 'line',
            data: data.map(item => parseFloat(item.value.toFixed(2))),
            smooth: true,
            lineStyle: { width: 2 },
            areaStyle: { opacity: 0.3 },
          },
        ],
        grid: {
          left: '10%',
          right: '10%',
          bottom: '15%',
          top: '10%',
        },
      };
    },
    [resolvedTheme]
  );

  // 过滤瓶颈
  const filteredBottlenecks = useMemo(() => {
    return bottlenecks
      .filter(bottleneck => bottleneck.status === 'active')
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
  }, [bottlenecks]);

  // 获取健康状态颜色
  const getHealthColor = (value: number) => {
    if (value >= 80) return 'text-red-500';
    if (value >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 获取健康状态图标
  const getHealthIcon = (value: number) => {
    if (value >= 80) return <AlertTriangle className='w-4 h-4 text-red-500' />;
    if (value >= 60)
      return <AlertTriangle className='w-4 h-4 text-yellow-500' />;
    return <CheckCircle className='w-4 h-4 text-green-500' />;
  };

  // 格式化字节
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (!activeConnectionId) {
    return (
      <div className='h-full flex flex-col items-center justify-center p-6 text-center'>
        <Database className='w-12 h-12 text-muted-foreground mb-4' />
        <h3 className='text-lg font-medium mb-2'>需要连接数据库</h3>
        <p className='text-sm text-muted-foreground'>
          请先在连接管理中选择一个活跃的数据库连接
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col bg-background ${className}`}>
        {/* 头部控制 */}
        <div className='p-3 border-b'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-sm font-semibold'>性能监控</h2>
            <div className='flex items-center gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`h-7 w-7 p-0 ${autoRefresh ? 'text-green-500' : ''}`}
                  >
                    {autoRefresh ? (
                      <Activity className='w-4 h-4' />
                    ) : (
                      <Activity className='w-4 h-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
                </TooltipContent>
              </Tooltip>
              <Button
                variant='ghost'
                size='sm'
                onClick={fetchMetrics}
                disabled={loading}
                className='h-7 w-7 p-0'
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* 控制选项 */}
          <div className='space-y-2'>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='1h'>最近1小时</SelectItem>
                <SelectItem value='6h'>最近6小时</SelectItem>
                <SelectItem value='24h'>最近24小时</SelectItem>
                <SelectItem value='7d'>最近7天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 标签页 */}
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as any)}
          className='flex-1 flex flex-col'
        >
          <div className='px-3 border-b'>
            <TabsList className='grid w-full grid-cols-3 h-8'>
              <TabsTrigger value='overview' className='text-xs'>
                <Eye className='w-3 h-3 mr-1' />
                概览
              </TabsTrigger>
              <TabsTrigger value='metrics' className='text-xs'>
                <BarChart3 className='w-3 h-3 mr-1' />
                指标
              </TabsTrigger>
              <TabsTrigger value='bottlenecks' className='text-xs'>
                <AlertTriangle className='w-3 h-3 mr-1' />
                瓶颈 ({filteredBottlenecks.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='overview' className='flex-1 mt-0'>
            <ScrollArea className='h-full'>
              <div className='p-3 space-y-3'>
                {loading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                  </div>
                ) : (
                  <>
                    {/* 系统健康概览 */}
                    <Card>
                      <CardHeader className='p-3'>
                        <div className='flex items-center justify-between'>
                          <h4 className='text-sm font-medium'>系统健康</h4>
                          <Badge
                            variant={
                              systemHealth.overall >= 80
                                ? 'destructive'
                                : systemHealth.overall >= 60
                                  ? 'secondary'
                                  : 'default'
                            }
                          >
                            {systemHealth.overall.toFixed(0)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className='p-3 pt-0 space-y-3'>
                        {/* CPU */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Cpu className='w-4 h-4 text-blue-500' />
                            <span className='text-xs'>CPU</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Progress
                              value={systemHealth.cpu}
                              className='w-16 h-2'
                            />
                            <span
                              className={`text-xs ${getHealthColor(systemHealth.cpu)}`}
                            >
                              {systemHealth.cpu.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* 内存 */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <MemoryStick className='w-4 h-4 text-green-500' />
                            <span className='text-xs'>内存</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Progress
                              value={systemHealth.memory}
                              className='w-16 h-2'
                            />
                            <span
                              className={`text-xs ${getHealthColor(systemHealth.memory)}`}
                            >
                              {systemHealth.memory.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* 磁盘 */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <HardDrive className='w-4 h-4 text-purple-500' />
                            <span className='text-xs'>磁盘</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Progress
                              value={systemHealth.disk}
                              className='w-16 h-2'
                            />
                            <span
                              className={`text-xs ${getHealthColor(systemHealth.disk)}`}
                            >
                              {systemHealth.disk.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* 网络 */}
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Network className='w-4 h-4 text-orange-500' />
                            <span className='text-xs'>网络</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <Progress
                              value={systemHealth.network}
                              className='w-16 h-2'
                            />
                            <span
                              className={`text-xs ${getHealthColor(systemHealth.network)}`}
                            >
                              {systemHealth.network.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 关键指标 */}
                    {metrics && (
                      <Card>
                        <CardHeader className='p-3'>
                          <h4 className='text-sm font-medium'>关键指标</h4>
                        </CardHeader>
                        <CardContent className='p-3 pt-0 space-y-2'>
                          <div className='grid grid-cols-2 gap-2 text-xs'>
                            <div className='text-center p-2 bg-muted/50 rounded'>
                              <div className='font-medium'>查询延迟</div>
                              <div className='text-muted-foreground'>
                                {metrics.queryExecutionTime.length > 0
                                  ? `${metrics.queryExecutionTime[metrics.queryExecutionTime.length - 1].value.toFixed(0)}ms`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className='text-center p-2 bg-muted/50 rounded'>
                              <div className='font-medium'>写入延迟</div>
                              <div className='text-muted-foreground'>
                                {metrics.writeLatency.length > 0
                                  ? `${metrics.writeLatency[metrics.writeLatency.length - 1].value.toFixed(0)}ms`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className='text-center p-2 bg-muted/50 rounded'>
                              <div className='font-medium'>磁盘读取</div>
                              <div className='text-muted-foreground'>
                                {metrics.diskIO
                                  ? `${formatBytes(metrics.diskIO.readBytes)}/s`
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className='text-center p-2 bg-muted/50 rounded'>
                              <div className='font-medium'>网络流入</div>
                              <div className='text-muted-foreground'>
                                {metrics.networkIO
                                  ? `${formatBytes(metrics.networkIO.bytesIn)}/s`
                                  : 'N/A'}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 活跃瓶颈 */}
                    {filteredBottlenecks.length > 0 && (
                      <Card>
                        <CardHeader className='p-3'>
                          <h4 className='text-sm font-medium'>活跃瓶颈</h4>
                        </CardHeader>
                        <CardContent className='p-3 pt-0 space-y-2'>
                          {filteredBottlenecks.slice(0, 3).map(bottleneck => (
                            <div
                              key={bottleneck.id}
                              className='flex items-start gap-2 p-2 bg-muted/50 rounded'
                            >
                              <div className='mt-0.5'>
                                {bottleneck.severity === 'critical' && (
                                  <AlertTriangle className='w-3 h-3 text-red-500' />
                                )}
                                {bottleneck.severity === 'high' && (
                                  <AlertTriangle className='w-3 h-3 text-orange-500' />
                                )}
                                {bottleneck.severity === 'medium' && (
                                  <AlertTriangle className='w-3 h-3 text-yellow-500' />
                                )}
                                {bottleneck.severity === 'low' && (
                                  <AlertTriangle className='w-3 h-3 text-blue-500' />
                                )}
                              </div>
                              <div className='flex-1 min-w-0'>
                                <div className='text-xs font-medium truncate'>
                                  {bottleneck.title}
                                </div>
                                <div className='text-xs text-muted-foreground truncate'>
                                  {bottleneck.description}
                                </div>
                              </div>
                            </div>
                          ))}
                          {filteredBottlenecks.length > 3 && (
                            <div className='text-xs text-center text-muted-foreground'>
                              还有 {filteredBottlenecks.length - 3} 个瓶颈...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value='metrics' className='flex-1 mt-0'>
            <ScrollArea className='h-full'>
              <div className='p-3 space-y-3'>
                {loading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                  </div>
                ) : metrics ? (
                  <>
                    {/* CPU 使用率 */}
                    {metrics.cpuUsage.length > 0 && (
                      <Card>
                        <CardHeader className='p-3'>
                          <h4 className='text-sm font-medium flex items-center gap-2'>
                            <Cpu className='w-4 h-4 text-blue-500' />
                            CPU 使用率
                          </h4>
                        </CardHeader>
                        <CardContent className='p-3 pt-0'>
                          <div className='h-32'>
                            <ReactECharts
                              option={generateChartOption(
                                metrics.cpuUsage,
                                'CPU 使用率',
                                '%'
                              )}
                              style={{ height: '100%', width: '100%' }}
                              opts={{ renderer: 'canvas' }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 内存使用率 */}
                    {metrics.memoryUsage.length > 0 && (
                      <Card>
                        <CardHeader className='p-3'>
                          <h4 className='text-sm font-medium flex items-center gap-2'>
                            <MemoryStick className='w-4 h-4 text-green-500' />
                            内存使用率
                          </h4>
                        </CardHeader>
                        <CardContent className='p-3 pt-0'>
                          <div className='h-32'>
                            <ReactECharts
                              option={generateChartOption(
                                metrics.memoryUsage,
                                '内存使用率',
                                '%'
                              )}
                              style={{ height: '100%', width: '100%' }}
                              opts={{ renderer: 'canvas' }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 查询执行时间 */}
                    <Card>
                      <CardHeader className='p-3'>
                        <h4 className='text-sm font-medium flex items-center gap-2'>
                          <Clock className='w-4 h-4 text-purple-500' />
                          查询执行时间
                        </h4>
                      </CardHeader>
                      <CardContent className='p-3 pt-0'>
                        {metrics.queryExecutionTime.length > 0 ? (
                          <div className='h-32'>
                            <ReactECharts
                              option={generateChartOption(
                                metrics.queryExecutionTime,
                                '查询执行时间',
                                'ms'
                              )}
                              style={{ height: '100%', width: '100%' }}
                              opts={{ renderer: 'canvas' }}
                            />
                          </div>
                        ) : (
                          <div className='h-32 flex items-center justify-center text-muted-foreground'>
                            <div className='text-center'>
                              <Clock className='w-8 h-8 mx-auto mb-2 opacity-50' />
                              <div className='text-sm'>
                                暂无查询执行时间数据
                              </div>
                              <div className='text-xs'>
                                请检查数据库连接状态
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* 写入延迟 */}
                    <Card>
                      <CardHeader className='p-3'>
                        <h4 className='text-sm font-medium flex items-center gap-2'>
                          <Zap className='w-4 h-4 text-orange-500' />
                          写入延迟
                        </h4>
                      </CardHeader>
                      <CardContent className='p-3 pt-0'>
                        {metrics.writeLatency.length > 0 ? (
                          <div className='h-32'>
                            <ReactECharts
                              option={generateChartOption(
                                metrics.writeLatency,
                                '写入延迟',
                                'ms'
                              )}
                              style={{ height: '100%', width: '100%' }}
                              opts={{ renderer: 'canvas' }}
                            />
                          </div>
                        ) : (
                          <div className='h-32 flex items-center justify-center text-muted-foreground'>
                            <div className='text-center'>
                              <Zap className='w-8 h-8 mx-auto mb-2 opacity-50' />
                              <div className='text-sm'>暂无写入延迟数据</div>
                              <div className='text-xs'>
                                请检查数据库连接状态
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <Activity className='w-8 h-8 text-muted-foreground mb-2' />
                    <p className='text-sm text-muted-foreground'>
                      暂无性能指标数据
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value='bottlenecks' className='flex-1 mt-0'>
            <ScrollArea className='h-full'>
              <div className='p-3'>
                {loading ? (
                  <div className='flex items-center justify-center py-8'>
                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary'></div>
                  </div>
                ) : filteredBottlenecks.length > 0 ? (
                  <div className='space-y-3'>
                    {filteredBottlenecks.map(bottleneck => (
                      <Card key={bottleneck.id}>
                        <CardContent className='p-3'>
                          <div className='flex items-start gap-3'>
                            <div className='mt-0.5'>
                              {bottleneck.severity === 'critical' && (
                                <AlertTriangle className='w-4 h-4 text-red-500' />
                              )}
                              {bottleneck.severity === 'high' && (
                                <AlertTriangle className='w-4 h-4 text-orange-500' />
                              )}
                              {bottleneck.severity === 'medium' && (
                                <AlertTriangle className='w-4 h-4 text-yellow-500' />
                              )}
                              {bottleneck.severity === 'low' && (
                                <AlertTriangle className='w-4 h-4 text-blue-500' />
                              )}
                            </div>
                            <div className='flex-1 min-w-0'>
                              <div className='flex items-center justify-between mb-1'>
                                <h5 className='text-sm font-medium truncate'>
                                  {bottleneck.title}
                                </h5>
                                <Badge
                                  variant={
                                    bottleneck.severity === 'critical'
                                      ? 'destructive'
                                      : bottleneck.severity === 'high'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                >
                                  {bottleneck.severity}
                                </Badge>
                              </div>
                              <p className='text-xs text-muted-foreground mb-2'>
                                {bottleneck.description}
                              </p>
                              <div className='text-xs'>
                                <div className='mb-1'>
                                  <span className='font-medium'>影响：</span>
                                  <span className='text-muted-foreground'>
                                    {bottleneck.impact}
                                  </span>
                                </div>
                                <div>
                                  <span className='font-medium'>建议：</span>
                                  <span className='text-muted-foreground'>
                                    {bottleneck.recommendation}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className='flex flex-col items-center justify-center py-8 text-center'>
                    <CheckCircle className='w-8 h-8 text-green-500 mb-2' />
                    <p className='text-sm text-muted-foreground'>
                      暂无性能瓶颈
                    </p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      系统运行良好
                    </p>
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

export default VerticalPerformanceMonitor;
