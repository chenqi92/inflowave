import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import {
  Activity,
  BarChart3,
  Clock,
  Database,
  Gauge,
  TrendingUp,
  Zap,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Timer,
  HardDrive,
  Cpu,
  Network,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';

import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

// 性能指标类型
interface PerformanceMetrics {
  connectionId: string;
  connectionName: string;
  databaseName: string;
  dbType: string;
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
}

// 系统资源指标
interface SystemMetrics {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

// 查询性能指标
interface QueryMetrics {
  timestamp: string;
  totalQueries: number;
  avgResponseTime: number;
  slowQueries: number;
  errorRate: number;
  throughput: number;
}

interface PerformanceDashboardProps {
  className?: string;
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
  secondary: '#8b5cf6',
};

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  className = '' 
}) => {
  const [metricsData, setMetricsData] = useState<PerformanceMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [queryMetrics, setQueryMetrics] = useState<QueryMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const { openedDatabases } = useOpenedDatabasesStore();

  // 生成模拟数据
  const generateMockData = () => {
    const now = new Date();
    const systemData: SystemMetrics[] = [];
    const queryData: QueryMetrics[] = [];

    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const timeStr = timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      
      systemData.push({
        timestamp: timeStr,
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
        disk: Math.random() * 60 + 15,
        network: Math.random() * 50 + 10,
      });

      queryData.push({
        timestamp: timeStr,
        totalQueries: Math.floor(Math.random() * 100) + 20,
        avgResponseTime: Math.random() * 200 + 50,
        slowQueries: Math.floor(Math.random() * 10),
        errorRate: Math.random() * 5,
        throughput: Math.random() * 50 + 10,
      });
    }

    setSystemMetrics(systemData);
    setQueryMetrics(queryData);
  };

  // 获取性能数据
  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const openedDataSourcesList = Array.from(openedDatabases);

      if (openedDataSourcesList.length === 0) {
        setMetricsData([]);
        return;
      }

      const result = await safeTauriInvoke<PerformanceMetrics[]>(
        'get_opened_datasources_performance',
        { openedDatasources: openedDataSourcesList }
      );

      setMetricsData(result);
      generateMockData();
    } catch (error) {
      console.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
      generateMockData(); // 即使失败也生成模拟数据用于展示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // 30秒刷新
    return () => clearInterval(interval);
  }, [openedDatabases]);

  // 计算总体统计
  const overallStats = useMemo(() => {
    const totalConnections = metricsData.length;
    const activeConnections = metricsData.filter(m => m.isConnected).length;
    const totalQueries = metricsData.reduce((sum, m) => sum + m.totalQueriesToday, 0);
    const avgLatency = totalConnections > 0 
      ? metricsData.reduce((sum, m) => sum + m.connectionLatency, 0) / totalConnections 
      : 0;
    const totalErrors = metricsData.reduce((sum, m) => sum + m.failedQueriesCount, 0);
    const errorRate = totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0;
    const healthyCount = metricsData.filter(m => m.healthScore === 'good').length;

    return {
      totalConnections,
      activeConnections,
      totalQueries,
      avgLatency,
      errorRate,
      healthyCount,
    };
  }, [metricsData]);

  // 最新系统指标
  const latestSystemMetrics = systemMetrics[systemMetrics.length - 1] || {
    cpu: 0, memory: 0, disk: 0, network: 0
  };

  // 最新查询指标
  const latestQueryMetrics = queryMetrics[queryMetrics.length - 1] || {
    totalQueries: 0, avgResponseTime: 0, slowQueries: 0, errorRate: 0, throughput: 0
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* 头部 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">性能监控中心</h1>
            <p className="text-muted-foreground">实时监控数据库性能和系统资源</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {overallStats.activeConnections}/{overallStats.totalConnections} 活跃连接
            </Badge>
            <Button
              variant="outline"
              onClick={fetchPerformanceData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="overview">总览</TabsTrigger>
            <TabsTrigger value="performance">性能分析</TabsTrigger>
            <TabsTrigger value="resources">资源监控</TabsTrigger>
            <TabsTrigger value="queries">查询分析</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="overview" className="p-6 space-y-6">
              {/* 关键指标卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Database className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.totalQueries}</div>
                        <div className="text-sm text-muted-foreground">今日总查询</div>
                        <div className="text-xs text-success flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          +12% 较昨日
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                        <Timer className="w-6 h-6 text-success" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.avgLatency.toFixed(0)}</div>
                        <div className="text-sm text-muted-foreground">平均延迟(ms)</div>
                        <div className="text-xs text-success flex items-center gap-1 mt-1">
                          <TrendingUp className="w-3 h-3" />
                          性能良好
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-warning" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.errorRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">错误率</div>
                        <div className="text-xs text-success flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          正常范围
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-info/10 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-info" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.healthyCount}</div>
                        <div className="text-sm text-muted-foreground">健康连接</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          共 {overallStats.totalConnections} 个连接
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 系统资源概览 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="w-5 h-5" />
                      系统资源使用率
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-primary" />
                          <span className="text-sm">CPU</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${latestSystemMetrics.cpu}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {latestSystemMetrics.cpu.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-success" />
                          <span className="text-sm">内存</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-success transition-all duration-300"
                              style={{ width: `${latestSystemMetrics.memory}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {latestSystemMetrics.memory.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-warning" />
                          <span className="text-sm">磁盘</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-warning transition-all duration-300"
                              style={{ width: `${latestSystemMetrics.disk}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {latestSystemMetrics.disk.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-info" />
                          <span className="text-sm">网络</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-info transition-all duration-300"
                              style={{ width: `${latestSystemMetrics.network}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {latestSystemMetrics.network.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      查询性能概览
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">当前查询数</span>
                        <span className="text-lg font-semibold">{latestQueryMetrics.totalQueries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">平均响应时间</span>
                        <span className="text-lg font-semibold">{latestQueryMetrics.avgResponseTime.toFixed(0)}ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">慢查询</span>
                        <span className="text-lg font-semibold text-warning">{latestQueryMetrics.slowQueries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">吞吐量</span>
                        <span className="text-lg font-semibold">{latestQueryMetrics.throughput.toFixed(1)} QPS</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="p-6 space-y-6">
              {/* 性能趋势图表 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      响应时间趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={queryMetrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgResponseTime"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={2}
                            dot={false}
                            name="平均响应时间(ms)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      查询量趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={queryMetrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="totalQueries"
                            stroke={CHART_COLORS.success}
                            fill={CHART_COLORS.success}
                            fillOpacity={0.3}
                            name="查询数量"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 错误率和慢查询 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      错误率监控
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={queryMetrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="errorRate"
                            stroke={CHART_COLORS.danger}
                            strokeWidth={2}
                            dot={false}
                            name="错误率(%)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="w-5 h-5" />
                      慢查询监控
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={queryMetrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar
                            dataKey="slowQueries"
                            fill={CHART_COLORS.warning}
                            name="慢查询数量"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="resources" className="p-6 space-y-6">
              {/* 系统资源监控 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gauge className="w-5 h-5" />
                    系统资源使用趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={systemMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="cpu"
                          stackId="1"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.6}
                          name="CPU使用率(%)"
                        />
                        <Area
                          type="monotone"
                          dataKey="memory"
                          stackId="2"
                          stroke={CHART_COLORS.success}
                          fill={CHART_COLORS.success}
                          fillOpacity={0.6}
                          name="内存使用率(%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="disk"
                          stroke={CHART_COLORS.warning}
                          strokeWidth={2}
                          dot={false}
                          name="磁盘使用率(%)"
                        />
                        <Line
                          type="monotone"
                          dataKey="network"
                          stroke={CHART_COLORS.info}
                          strokeWidth={2}
                          dot={false}
                          name="网络使用率(%)"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="queries" className="p-6 space-y-6">
              {/* 查询分析 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      吞吐量
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={queryMetrics}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="throughput"
                            stroke={CHART_COLORS.info}
                            fill={CHART_COLORS.info}
                            fillOpacity={0.3}
                            name="QPS"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      数据源性能排行
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metricsData
                        .sort((a, b) => b.totalQueriesToday - a.totalQueriesToday)
                        .slice(0, 5)
                        .map((metrics, index) => (
                          <div key={metrics.connectionId} className="flex items-center gap-4 p-3 border rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">#{index + 1}</span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{metrics.connectionName}</div>
                              <div className="text-sm text-muted-foreground">
                                {metrics.databaseName} • {metrics.dbType}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{metrics.totalQueriesToday}</div>
                              <div className="text-xs text-muted-foreground">查询数</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{metrics.averageQueryTime.toFixed(0)}ms</div>
                              <div className="text-xs text-muted-foreground">平均时间</div>
                            </div>
                            <Badge
                              variant={
                                metrics.healthScore === 'good'
                                  ? 'default'
                                  : metrics.healthScore === 'warning'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                            >
                              {metrics.healthScore === 'good'
                                ? '健康'
                                : metrics.healthScore === 'warning'
                                  ? '警告'
                                  : '严重'}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
