import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Alert, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Progress, Separator, Typography, Title, Text } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';

import { RefreshCw, Settings, Database, Zap, Clock, LayoutDashboard, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { PerformanceMetrics, SlowQueryInfo, ConnectionHealthMetrics } from '@/types';

interface PerformanceMonitorProps {
  connectionId?: string;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  connectionId}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [slowQueries, setSlowQueries] = useState<SlowQueryInfo[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 加载性能指标
  const loadMetrics = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke<PerformanceMetrics>('get_performance_metrics', {
        connectionId,
        timeRange});
      setMetrics(result || {
        queryExecutionTime: [],
        writeLatency: [],
        memoryUsage: [],
        cpuUsage: [],
        diskIO: { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 },
        networkIO: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
        storageAnalysis: {
          totalSize: 0,
          compressionRatio: 1,
          retentionPolicyEffectiveness: 0,
          recommendations: []
        }
      });
    } catch (error) {
      console.error('加载性能指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载慢查询分析
  const loadSlowQueries = async () => {
    try {
      const result = await safeTauriInvoke<SlowQueryInfo[]>('get_slow_query_analysis', {
        limit: 20});
      setSlowQueries(result || []);
    } catch (error) {
      console.error('加载慢查询失败:', error);
    }
  };

  // 执行健康检查
  const performHealthCheck = async (connId: string) => {
    try {
      await safeTauriInvoke('perform_health_check', { connectionId: connId });
      loadMetrics();
    } catch (error) {
      console.error('健康检查失败:', error);
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'warning': return 'orange';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  // 格式化时间
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 慢查询表格列
  const slowQueryColumns = [
    {
      title: '查询',
      dataIndex: 'query',
      key: 'query',
      ellipsis: true,
      render: (text: string) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <code className="text-xs">
                {text.length > 50 ? `${text.substring(0, 50)}...` : text}
              </code>
            </TooltipTrigger>
            <TooltipContent>
              <p>{text}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )},
    {
      title: '数据库',
      dataIndex: 'database',
      key: 'database',
      width: 120},
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      width: 100,
      render: (time: number) => (
        <Badge variant={time > 10000 ? 'destructive' : time > 5000 ? 'secondary' : 'default'}>
          {formatDuration(time)}
        </Badge>
      )},
    {
      title: '返回行数',
      dataIndex: 'rowsReturned',
      key: 'rowsReturned',
      width: 100,
      render: (rows: number) => (rows || 0).toLocaleString()},
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (time: string) => new Date(time).toLocaleString()},
    {
      title: '优化',
      key: 'optimization',
      width: 80,
      render: (record: SlowQueryInfo) => (
        record.optimization ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-orange-500"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{record.optimization.suggestions.join(', ')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null
      )},
  ];

  useEffect(() => {
    loadMetrics();
    loadSlowQueries();
  }, [connectionId, timeRange]);

  useEffect(() => {
    let interval: number;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadMetrics();
        loadSlowQueries();
      }, 30000); // 30秒刷新
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, connectionId, timeRange]);

  if (!metrics) {
    return <div>加载中...</div>;
  }

  return (
    <div className="performance-monitor space-y-4 pb-8">
      {/* 控制栏 */}
      <div className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">最近1小时</SelectItem>
                <SelectItem value="6h">最近6小时</SelectItem>
                <SelectItem value="24h">最近24小时</SelectItem>
                <SelectItem value="7d">最近7天</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              自动刷新
            </Button>
          </div>
        </div>
      </div>

      {/* 概览指标 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
            <div>
              <Text className="text-sm text-muted-foreground">查询执行次数</Text>
              <Text className="text-2xl font-bold">{metrics?.queryExecutionTime?.length || 0}</Text>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <Text className="text-sm text-muted-foreground">平均执行时间</Text>
              <p className="text-2xl font-bold">
                {metrics?.queryExecutionTime?.length > 0
                  ? Math.round(metrics.queryExecutionTime.reduce((a, b) => a + b, 0) / metrics.queryExecutionTime.length)
                  : 0
                }ms
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <Text className="text-sm text-muted-foreground">写入延迟</Text>
              <p className="text-2xl font-bold">
                {metrics?.writeLatency?.length > 0
                  ? Math.round(metrics.writeLatency.reduce((a, b) => a + b, 0) / metrics.writeLatency.length)
                  : 0
                }ms
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
            <div>
              <Text className="text-sm text-muted-foreground">网络 I/O</Text>
              <Text className="text-2xl font-bold">{formatBytes((metrics?.networkIO?.bytesIn || 0) + (metrics?.networkIO?.bytesOut || 0))}</Text>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 系统资源 */}
        <div className="p-4">
          <Title level={3} className="text-lg font-medium mb-4">系统资源</Title>
          <div className="space-y-4">
            <div>
              <Text className="text-sm mb-2">内存使用情况</Text>
              <Progress
                value={metrics?.memoryUsage?.length > 0
                  ? Math.round(metrics.memoryUsage[metrics.memoryUsage.length - 1])
                  : 0
                }
                className={metrics?.memoryUsage?.length > 0 && metrics.memoryUsage[metrics.memoryUsage.length - 1] > 80 ? 'text-destructive' : ''}
              />
            </div>
            <div>
              <Text className="text-sm mb-2">CPU 使用率</Text>
              <Progress
                value={metrics?.cpuUsage?.length > 0
                  ? Math.round(metrics.cpuUsage[metrics.cpuUsage.length - 1])
                  : 0
                }
                className={metrics?.cpuUsage?.length > 0 && metrics.cpuUsage[metrics.cpuUsage.length - 1] > 80 ? 'text-destructive' : ''}
              />
            </div>
            <div>
              <Text className="text-sm mb-2">磁盘 I/O</Text>
              <p className="text-xs text-muted-foreground">
                读取: {formatBytes(metrics?.diskIO?.readBytes || 0)} | 写入: {formatBytes(metrics?.diskIO?.writeBytes || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* 网络状态 */}
        <div className="p-4">
          <Title level={3} className="text-lg font-medium mb-4">网络 I/O 状态</Title>
          <div className="space-y-4">
            <div>
              <Text className="text-sm mb-1">输入流量</Text>
              <p className="text-lg font-bold">
                {formatBytes(metrics?.networkIO?.bytesIn || 0)}
              </p>
              <Text className="text-sm text-muted-foreground">{(metrics?.networkIO?.packetsIn || 0).toLocaleString()} 包</Text>
            </div>
            <Separator />
            <div>
              <Text className="text-sm mb-1">输出流量</Text>
              <p className="text-lg font-bold">
                {formatBytes(metrics?.networkIO?.bytesOut || 0)}
              </p>
              <Text className="text-sm text-muted-foreground">{(metrics?.networkIO?.packetsOut || 0).toLocaleString()} 包</Text>
            </div>
          </div>
        </div>
      </div>

      {/* 慢查询分析 */}
      <div className="p-4">
        <Title level={3} className="text-lg font-medium mb-4">慢查询分析</Title>
        {slowQueries.length > 0 ? (
          <div className="table-container">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">查询</TableHead>
                  <TableHead className="min-w-[100px]">数据库</TableHead>
                  <TableHead className="min-w-[100px]">执行时间</TableHead>
                  <TableHead className="min-w-[100px]">返回行数</TableHead>
                  <TableHead className="min-w-[150px]">时间</TableHead>
                  <TableHead className="min-w-[80px]">优化</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {slowQueries.slice(0, 10).map((query, index) => (
                <TableRow key={query.id || index}>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <code className="text-xs">
                            {query.query.length > 50 ? `${query.query.substring(0, 50)}...` : query.query}
                          </code>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{query.query}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>{query.database}</TableCell>
                  <TableCell>
                    <Badge variant={query.executionTime > 10000 ? 'destructive' : query.executionTime > 5000 ? 'secondary' : 'default'}>
                      {formatDuration(query.executionTime)}
                    </Badge>
                  </TableCell>
                  <TableCell>{(query.rowsReturned || 0).toLocaleString()}</TableCell>
                  <TableCell>{new Date(query.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    {query.optimization ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-orange-500">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{query.optimization.suggestions.join(', ')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        ) : (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <div>
              <Title level={4}>暂无慢查询</Title>
              <p>当前时间范围内没有检测到慢查询</p>
            </div>
          </Alert>
        )}
      </div>

      {/* 存储分析 */}
      <div className="p-4">
        <Title level={3} className="text-lg font-medium mb-4">存储分析</Title>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <div>
              <Text className="text-sm text-muted-foreground">总存储大小</Text>
              <Text className="text-2xl font-bold">{formatBytes(metrics?.storageAnalysis?.totalSize || 0)}</Text>
            </div>
          </div>
          <div>
            <Text className="text-sm text-muted-foreground">压缩比</Text>
            <Text className="text-2xl font-bold">{(metrics?.storageAnalysis?.compressionRatio || 0).toFixed(2)}x</Text>
          </div>
          <div>
            <Text className="text-sm text-muted-foreground">保留策略效果</Text>
            <Text className="text-2xl font-bold">{((metrics?.storageAnalysis?.retentionPolicyEffectiveness || 0) * 100).toFixed(1)}%</Text>
          </div>
        </div>

        {(metrics?.storageAnalysis?.recommendations?.length || 0) > 0 && (
          <>
            <Separator className="my-4" />
            <Title level={4} className="text-md font-medium mb-4">优化建议</Title>
            <div className="space-y-3">
              {(metrics?.storageAnalysis?.recommendations || []).map((item, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'secondary' : 'default'}>
                    {item.priority}
                  </Badge>
                  <div>
                    <Text className="font-medium">{item.description}</Text>
                    <Text className="text-sm text-muted-foreground">预计节省: {formatBytes(item.estimatedSavings)}</Text>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;
