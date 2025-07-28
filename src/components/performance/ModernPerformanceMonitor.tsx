import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Badge, Switch, Label } from '@/components/ui';
import {
  Database,
  RefreshCw,
  Activity,
  AlertTriangle,
  Wifi,
  Clock,
  HardDrive,
  Cpu,
  Network,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Gauge,
  Zap,
  Timer,
  CheckCircle,
  AlertCircle,
  Lightbulb,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';

// 性能指标类型
interface PerformanceMetrics {
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

// 历史数据点
interface HistoryDataPoint {
  timestamp: string;
  latency: number;
  queries: number;
  errors: number;
  cpu: number;
  memory: number;
}

// 组件属性
interface ModernPerformanceMonitorProps {
  className?: string;
}

// 图表颜色配置
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
  secondary: '#8b5cf6',
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const ModernPerformanceMonitor: React.FC<ModernPerformanceMonitorProps> = ({ 
  className = '' 
}) => {
  // 状态管理
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<PerformanceMetrics[]>([]);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Store hooks
  const { connections } = useConnectionStore();
  const { openedDatabases } = useOpenedDatabasesStore();

  // 获取性能数据
  const fetchPerformanceData = useCallback(async () => {
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
      
      // 生成模拟历史数据
      generateMockHistoryData();
    } catch (error) {
      console.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [openedDatabases]);

  // 生成模拟历史数据
  const generateMockHistoryData = useCallback(() => {
    const now = new Date();
    const data: HistoryDataPoint[] = [];
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      data.push({
        timestamp: timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        latency: Math.random() * 100 + 50,
        queries: Math.floor(Math.random() * 50) + 10,
        errors: Math.floor(Math.random() * 5),
        cpu: Math.random() * 80 + 10,
        memory: Math.random() * 70 + 20,
      });
    }
    
    setHistoryData(data);
  }, []);

  // 自动刷新
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchPerformanceData, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchPerformanceData]);

  // 初始加载
  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // 计算总体统计
  const overallStats = useMemo(() => {
    if (metricsData.length === 0) {
      return {
        totalConnections: 0,
        activeConnections: 0,
        totalQueries: 0,
        avgLatency: 0,
        errorRate: 0,
        healthyCount: 0,
      };
    }

    const activeConnections = metricsData.filter(m => m.isConnected).length;
    const totalQueries = metricsData.reduce((sum, m) => sum + m.totalQueriesToday, 0);
    const avgLatency = metricsData.reduce((sum, m) => sum + m.connectionLatency, 0) / metricsData.length;
    const totalErrors = metricsData.reduce((sum, m) => sum + m.failedQueriesCount, 0);
    const errorRate = totalQueries > 0 ? (totalErrors / totalQueries) * 100 : 0;
    const healthyCount = metricsData.filter(m => m.healthScore === 'good').length;

    return {
      totalConnections: metricsData.length,
      activeConnections,
      totalQueries,
      avgLatency,
      errorRate,
      healthyCount,
    };
  }, [metricsData]);

  // 健康状态分布数据
  const healthDistribution = useMemo(() => {
    const distribution = { good: 0, warning: 0, critical: 0 };
    metricsData.forEach(m => {
      if (m.healthScore in distribution) {
        distribution[m.healthScore as keyof typeof distribution]++;
      }
    });
    
    return [
      { name: '健康', value: distribution.good, color: CHART_COLORS.success },
      { name: '警告', value: distribution.warning, color: CHART_COLORS.warning },
      { name: '严重', value: distribution.critical, color: CHART_COLORS.danger },
    ].filter(item => item.value > 0);
  }, [metricsData]);

  // 响应式宽度计算
  const getResponsiveWidth = () => {
    if (isCollapsed) return 'w-16 min-w-16 max-w-16';
    return 'w-80 min-w-80 max-w-96';
  };

  // 渲染折叠状态的简化视图
  const renderCollapsedView = () => (
    <div className="h-full flex flex-col">
      {/* 折叠状态头部 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="p-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 折叠状态指标 */}
      <div className="flex-1 p-2 space-y-4">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xs font-medium">{overallStats.activeConnections}</div>
          <div className="text-xs text-muted-foreground">活跃</div>
        </div>

        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <div className="text-xs font-medium">{overallStats.healthyCount}</div>
          <div className="text-xs text-muted-foreground">健康</div>
        </div>

        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-warning/10 flex items-center justify-center">
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <div className="text-xs font-medium">{overallStats.avgLatency.toFixed(0)}</div>
          <div className="text-xs text-muted-foreground">ms</div>
        </div>
      </div>
    </div>
  );

  if (isCollapsed) {
    return (
      <div className={`${getResponsiveWidth()} h-full border-r border-border bg-background ${className}`}>
        {renderCollapsedView()}
      </div>
    );
  }

  return (
    <div className={`${getResponsiveWidth()} h-full border-r border-border bg-background ${className}`}>
      <div className="h-full flex flex-col">
        {/* 头部控制栏 */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">性能监控</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                className="p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPerformanceData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* 自动刷新控制 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                自动刷新
              </Label>
            </div>
            <Badge variant="outline">
              {overallStats.activeConnections}/{overallStats.totalConnections} 活跃
            </Badge>
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {metricsData.length === 0 ? (
            <div className="p-6 text-center">
              <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">暂无数据源</h3>
              <p className="text-sm text-muted-foreground">
                请在左侧数据源树中打开数据库以查看性能监控
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* 总体统计卡片 */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.totalQueries}</div>
                        <div className="text-xs text-muted-foreground">今日查询</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                        <Timer className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{overallStats.avgLatency.toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">平均延迟(ms)</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 健康状态分布 */}
              {healthDistribution.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      健康状态分布
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={healthDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={20}
                            outerRadius={50}
                            dataKey="value"
                          >
                            {healthDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 mt-2">
                      {healthDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 性能趋势图表 */}
              {historyData.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      24小时性能趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="timestamp"
                            tick={{ fontSize: 10 }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '12px'
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="latency"
                            stroke={CHART_COLORS.primary}
                            strokeWidth={2}
                            dot={false}
                            name="延迟(ms)"
                          />
                          <Line
                            type="monotone"
                            dataKey="queries"
                            stroke={CHART_COLORS.success}
                            strokeWidth={2}
                            dot={false}
                            name="查询数"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 数据源列表 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    数据源列表
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metricsData.map(metrics => {
                    const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
                    const isSelected = selectedDataSource === datasourceKey;

                    return (
                      <div
                        key={datasourceKey}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                        }`}
                        onClick={() => setSelectedDataSource(isSelected ? null : datasourceKey)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              metrics.isConnected ? 'bg-success' : 'bg-muted-foreground'
                            }`} />
                            <div>
                              <div className="font-medium text-sm">{metrics.connectionName}</div>
                              <div className="text-xs text-muted-foreground">
                                {metrics.databaseName} • {metrics.dbType}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={
                              metrics.healthScore === 'good'
                                ? 'default'
                                : metrics.healthScore === 'warning'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                            className="text-xs"
                          >
                            {metrics.healthScore === 'good'
                              ? '健康'
                              : metrics.healthScore === 'warning'
                                ? '警告'
                                : '严重'}
                          </Badge>
                        </div>

                        {/* 关键指标 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className={
                              metrics.connectionLatency > 500 ? 'text-danger' : 'text-success'
                            }>
                              {metrics.connectionLatency >= 0
                                ? `${metrics.connectionLatency.toFixed(0)}ms`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-muted-foreground" />
                            <span>{metrics.totalQueriesToday}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-muted-foreground" />
                            <span>{(metrics.databaseSize / 1024 / 1024).toFixed(1)}MB</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="w-3 h-3 text-muted-foreground" />
                            <span>{metrics.tableCount} 表</span>
                          </div>
                        </div>

                        {/* 展开的详细信息 */}
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <div className="text-xs">
                              <div className="font-medium mb-1">性能指标</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>平均查询时间: {metrics.averageQueryTime.toFixed(0)}ms</div>
                                <div>慢查询: {metrics.slowQueriesCount}</div>
                                <div>失败查询: {metrics.failedQueriesCount}</div>
                                <div>记录数: {metrics.recordCount.toLocaleString()}</div>
                              </div>
                            </div>

                            {metrics.issues.length > 0 && (
                              <div className="text-xs">
                                <div className="font-medium mb-1 text-warning">问题</div>
                                <ul className="space-y-1">
                                  {metrics.issues.slice(0, 2).map((issue, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                      <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                                      <span>{issue}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {metrics.recommendations.length > 0 && (
                              <div className="text-xs">
                                <div className="font-medium mb-1 text-info">建议</div>
                                <ul className="space-y-1">
                                  {metrics.recommendations.slice(0, 2).map((rec, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                      <Lightbulb className="w-3 h-3 text-info mt-0.5 flex-shrink-0" />
                                      <span>{rec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
