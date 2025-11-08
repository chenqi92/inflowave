import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, Badge, Switch, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import {
  Database,
  Activity,
  AlertTriangle,
  Clock,
  HardDrive,
  TrendingUp,
  BarChart3,
  Gauge,
  Timer,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

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
  const { t } = useTranslation();

  // 状态管理
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [metricsData, setMetricsData] = useState<PerformanceMetrics[]>([]);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('24h');

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const { connections } = useConnectionStore();
  const { openedDatabases } = useOpenedDatabasesStore();
  
  // 响应式布局计算 - 始终显示所有内容
  const layout = useMemo(() => {
    return {
      showHeader: true,      // 始终显示头部
      showStats: true,       // 始终显示统计
      showCharts: true,      // 始终显示图表
      showDetailed: true,    // 始终显示详细内容
      isNarrow: false,       // 不使用窄屏模式
      isVeryNarrow: false,   // 不使用极窄屏模式
      gridCols: 1,           // 使用单列布局以适应侧边栏
    };
  }, []);

  // 获取性能数据
  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
      const openedDataSourcesList = Array.from(openedDatabases);

      // 🔍 调试日志：查看打开的数据源列表
      logger.debug('📊 [性能监控] 打开的数据源列表:', {
        count: openedDataSourcesList.length,
        list: openedDataSourcesList
      });

      if (openedDataSourcesList.length === 0) {
        setMetricsData([]);
        setHistoryData([]);
        return;
      }

      const result = await safeTauriInvoke<PerformanceMetrics[]>(
        'get_opened_datasources_performance',
        { openedDatasources: openedDataSourcesList }
      );

      // 🔍 调试日志：查看返回的性能数据
      logger.debug('📊 [性能监控] 返回的性能数据:', {
        count: result.length,
        data: result.map(m => ({
          connectionId: m.connectionId,
          databaseName: m.databaseName,
          dbType: m.dbType
        }))
      });

      setMetricsData(result);

      // 获取第一个数据源的历史数据
      if (result.length > 0) {
        const firstDataSource = result[0];
        const datasourceKey = `${firstDataSource.connectionId}/${firstDataSource.databaseName}`;
        await fetchHistoryData(datasourceKey, timeRange);
      }
    } catch (error) {
      logger.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [openedDatabases]);

  // 获取历史数据
  const fetchHistoryData = useCallback(async (datasourceKey: string, timeRange: string = '24h') => {
    try {
      interface HistoryResponse {
        connectionId: string;
        databaseName: string;
        history: HistoryDataPoint[];
      }

      const result = await safeTauriInvoke<HistoryResponse>(
        'get_datasource_performance_history',
        {
          datasourceKey,
          timeRange
        }
      );

      // 转换时间戳格式为本地时间显示
      const formattedHistory = result.history.map(point => ({
        ...point,
        timestamp: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        }),
      }));

      setHistoryData(formattedHistory);
    } catch (error) {
      logger.error('获取历史数据失败:', error);
      // 失败时不显示错误消息，保持当前数据
    }
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
      { name: t('healthy'), value: distribution.good, color: CHART_COLORS.success },
      { name: t('warning'), value: distribution.warning, color: CHART_COLORS.warning },
      { name: t('critical'), value: distribution.critical, color: CHART_COLORS.danger },
    ].filter(item => item.value > 0);
  }, [metricsData, t]);



  return (
    <div ref={containerRef} className={`w-full h-full border-r border-border bg-background ${className}`}>
      <div className="h-full w-full flex flex-col">
        {/* 头部控制栏 */}
        {layout.showHeader && (
          <div className={`${layout.isNarrow ? 'p-2' : 'p-4'} border-b border-border flex-shrink-0`}>
            {/* 自动刷新控制 - 只在非窄屏显示 */}
            {!layout.isNarrow && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    {t('auto_refresh')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={timeRange}
                    onValueChange={(value: '1h' | '6h' | '24h') => {
                      setTimeRange(value);
                      // 重新获取历史数据
                      if (selectedDataSource) {
                        fetchHistoryData(selectedDataSource, value);
                      } else if (metricsData.length > 0) {
                        const firstDataSource = metricsData[0];
                        const datasourceKey = `${firstDataSource.connectionId}/${firstDataSource.databaseName}`;
                        fetchHistoryData(datasourceKey, value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px] h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">{t('time_range_1h')}</SelectItem>
                      <SelectItem value="6h">{t('time_range_6h')}</SelectItem>
                      <SelectItem value="24h">{t('time_range_24h')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-xs">
                    {overallStats.activeConnections}/{overallStats.totalConnections} {t('active')}
                  </Badge>
                </div>
              </div>
            )}

            {/* 窄屏时的简化状态显示 */}
            {layout.isNarrow && (
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="text-xs">
                  {overallStats.activeConnections}/{overallStats.totalConnections}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* 主要内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {metricsData.length === 0 ? (
            <div className={`${layout.isNarrow ? 'p-3' : 'p-6'} text-center`}>
              <Database className={`${layout.isNarrow ? 'w-8 h-8' : 'w-12 h-12'} mx-auto mb-4 text-muted-foreground/50`} />
              {!layout.isNarrow && (
                <>
                  <h3 className="text-lg font-medium mb-2">{t('no_datasource')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('no_datasource_desc')}
                  </p>
                </>
              )}
              {layout.isNarrow && (
                <p className="text-xs text-muted-foreground">{t('no_data')}</p>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6 w-full min-w-[280px]">
              {/* 总体统计卡片 - 固定2列布局 */}
              {layout.showStats && (
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Card className="flex-shrink-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Database className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-2xl font-bold truncate">
                            {overallStats.totalQueries}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            今日查询
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-shrink-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                          <Timer className="w-5 h-5 text-success" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-2xl font-bold truncate">
                            {overallStats.avgLatency.toFixed(3)}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            平均延迟(ms)
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-shrink-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-5 h-5 text-warning" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-2xl font-bold truncate">
                            {overallStats.errorRate.toFixed(3)}%
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            错误率
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="flex-shrink-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-5 h-5 text-info" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-2xl font-bold truncate">
                            {overallStats.activeConnections}/{overallStats.totalConnections}
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            活跃连接
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 健康状态分布 */}
              {layout.showCharts && healthDistribution.length > 0 && (
                <Card className="flex-shrink-0 w-full min-w-[280px]">
                  <CardHeader className="pb-2 flex-shrink-0">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gauge className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">健康状态分布</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-shrink-0">
                    <div className="h-32 w-full">
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
                    <div className="flex justify-center gap-4 mt-2 flex-wrap">
                      {healthDistribution.map((item, index) => (
                        <div key={index} className="flex items-center gap-1 flex-shrink-0">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-xs whitespace-nowrap">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 性能趋势图表 */}
              {layout.showDetailed && historyData.length > 0 && (
                <>
                  <Card className="flex-shrink-0 w-full min-w-[280px]">
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">延迟与查询趋势</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-shrink-0">
                      <div className="h-40 w-full">
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
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
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

                  {/* CPU和内存使用率图表 */}
                  <Card className="flex-shrink-0 w-full min-w-[280px]">
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">资源使用率</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-shrink-0">
                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={historyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                              dataKey="timestamp"
                              tick={{ fontSize: 10 }}
                              interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Area
                              type="monotone"
                              dataKey="cpu"
                              stroke={CHART_COLORS.warning}
                              fill={CHART_COLORS.warning}
                              fillOpacity={0.3}
                              name="CPU使用率(%)"
                            />
                            <Area
                              type="monotone"
                              dataKey="memory"
                              stroke={CHART_COLORS.info}
                              fill={CHART_COLORS.info}
                              fillOpacity={0.3}
                              name="内存使用率(%)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 错误统计图表 */}
                  <Card className="flex-shrink-0 w-full min-w-[280px]">
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">错误统计</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-shrink-0">
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={historyData}>
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
                            <Bar
                              dataKey="errors"
                              fill={CHART_COLORS.danger}
                              name="错误数"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* 数据源列表 */}
              <Card className="flex-shrink-0 w-full min-w-[280px]">
                <CardHeader className="pb-2 flex-shrink-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">数据源列表</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metricsData.map(metrics => {
                    const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
                    const isSelected = selectedDataSource === datasourceKey;

                    return (
                      <div
                        key={datasourceKey}
                        className={`p-3 border rounded-lg cursor-pointer transition-all flex-shrink-0 ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                        }`}
                        onClick={() => {
                          const newSelection = isSelected ? null : datasourceKey;
                          setSelectedDataSource(newSelection);
                          // 切换数据源时获取对应的历史数据
                          if (newSelection) {
                            fetchHistoryData(newSelection, timeRange);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              metrics.isConnected ? 'bg-success' : 'bg-muted-foreground'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-sm truncate">
                                {metrics.connectionName}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
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
                            className="text-xs flex-shrink-0"
                          >
                            {metrics.healthScore === 'good' ? '健康' : metrics.healthScore === 'warning' ? '警告' : '严重'}
                          </Badge>
                        </div>

                        {/* 完整指标 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className={
                              metrics.connectionLatency > 500 ? 'text-danger' : 'text-success'
                            }>
                              {metrics.connectionLatency >= 0
                                  ? `${metrics.connectionLatency.toFixed(3)}ms`
                                  : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{metrics.totalQueriesToday}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{(metrics.databaseSize / 1024 / 1024).toFixed(3)}MB</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Database className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{metrics.tableCount} 表</span>
                          </div>
                        </div>

                        {/* 展开的详细信息 */}
                        {isSelected && layout.showDetailed && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <div className="text-xs">
                              <div className="font-medium mb-1">性能指标</div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="truncate">平均查询时间: {metrics.averageQueryTime.toFixed(3)}ms</div>
                                <div className="truncate">慢查询: {metrics.slowQueriesCount}</div>
                                <div className="truncate">失败查询: {metrics.failedQueriesCount}</div>
                                <div className="truncate">记录数: {metrics.recordCount.toLocaleString()}</div>
                              </div>
                            </div>

                            {metrics.issues.length > 0 && (
                              <div className="text-xs">
                                <div className="font-medium mb-1 text-warning">问题</div>
                                <ul className="space-y-1">
                                  {metrics.issues.slice(0, 2).map((issue, index) => (
                                    <li key={index} className="flex items-start gap-1">
                                      <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                                      <span className="break-words">{issue}</span>
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
                                      <span className="break-words">{rec}</span>
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
