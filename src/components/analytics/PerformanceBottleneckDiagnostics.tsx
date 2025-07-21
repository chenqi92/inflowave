import React, { useState, useEffect, useCallback } from 'react';
import SimpleChart from '@/components/common/SimpleChart';
import { DEFAULT_PERFORMANCE_CONFIG } from '@/config/defaults';
import { FormatUtils } from '@/utils/format';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Progress,
  Button,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Separator,
  Empty,
  Skeleton,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  InputNumber,
  Text,
  Statistic,
} from '@/components/ui';
import {
  RefreshCw,
  Download,
  Settings,
  Clock,
  Flame,
  Bug,
  Trophy,
  Rocket,
  Lock,
  Lightbulb,
  Webhook,
  Info,
  Minus,
  MinusCircle,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Monitor,
  TrendingUp,
  X,
  Eye,
  Database,
  Zap,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import {
  PerformanceBottleneckService,
  type PerformanceBottleneck,
} from '@/services/analyticsService';
import { showMessage } from '@/utils/message';
import { safeTauriInvoke } from '@/utils/tauri';
import dayjs from 'dayjs';

interface PerformanceBottleneckDiagnosticsProps {
  className?: string;
}

interface SlowQuery {
  query: string;
  duration: number;
  frequency: number;
  lastExecuted: Date;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  database: string;
  user: string;
}

interface LockWait {
  type: string;
  table: string;
  duration: number;
  waitingQueries: string[];
  blockingQuery: string;
  timestamp: Date;
}

interface Recommendation {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  implementation: string;
}

interface PerformanceMetricsResult {
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

interface SlowQueryAnalysisResult {
  queries: Array<{
    query: string;
    executionTime: number;
    timestamp: string;
  }>;
}

interface TableRowData {
  original: PerformanceBottleneck;
}

export const PerformanceBottleneckDiagnostics: React.FC<
  PerformanceBottleneckDiagnosticsProps
> = ({ className }) => {
  const { activeConnectionId } = useConnectionStore();
  const [bottlenecks, setBottlenecks] = useState<PerformanceBottleneck[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBottleneck, setSelectedBottleneck] =
    useState<PerformanceBottleneck | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<{ from: Date; to: Date } | null>(
    null
  );
  const [severityFilter, setSeverityFilter] = useState<
    'all' | 'critical' | 'high' | 'medium' | 'low'
  >('all');
  const [typeFilter, setTypeFilter] = useState<
    | 'all'
    | 'query'
    | 'connection'
    | 'memory'
    | 'disk'
    | 'network'
    | 'cpu'
    | 'lock'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'resolved' | 'ignored'
  >('all');
  const [searchText, setSearchText] = useState('');
  const [systemMetrics, setSystemMetrics] = useState<{
    cpu: { timestamp: Date; usage: number }[];
    memory: { timestamp: Date; usage: number; available: number }[];
    disk: {
      timestamp: Date;
      readIops: number;
      writeIops: number;
      readThroughput: number;
      writeThroughput: number;
    }[];
    network: {
      timestamp: Date;
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    }[];
    connections: {
      timestamp: Date;
      active: number;
      idle: number;
      total: number;
    }[];
    queries: {
      timestamp: Date;
      executing: number;
      queued: number;
      completed: number;
      failed: number;
    }[];
  } | null>(null);
  const [slowQueries, setSlowQueries] = useState<{
    queries: {
      query: string;
      duration: number;
      frequency: number;
      lastExecuted: Date;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      database: string;
      user: string;
    }[];
    total: number;
  } | null>(null);
  const [lockWaits, setLockWaits] = useState<{
    locks: {
      type: string;
      table: string;
      duration: number;
      waitingQueries: string[];
      blockingQuery: string;
      timestamp: Date;
    }[];
    summary: {
      totalLocks: number;
      avgWaitTime: number;
      maxWaitTime: number;
      mostBlockedTable: string;
      recommendations: string[];
    };
  }>({
    locks: [],
    summary: {
      totalLocks: 0,
      avgWaitTime: 0,
      maxWaitTime: 0,
      mostBlockedTable: '',
      recommendations: []
    }
  });

  // 连接池统计状态
  const [connectionPoolStats, setConnectionPoolStats] = useState<{
    stats: {
      timestamp: Date;
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      waitingRequests: number;
      connectionErrors: number;
      avgConnectionTime: number;
      maxConnectionTime: number;
    }[];
    summary: {
      avgUtilization: number;
      maxUtilization: number;
      avgWaitTime: number;
      maxWaitTime: number;
      errorRate: number;
      recommendations: string[];
    };
  } | null>(null);
  const [performanceReport, setPerformanceReport] = useState<{
    summary: {
      overallScore: number;
      period: { start: Date; end: Date };
      totalQueries: number;
      avgQueryTime: number;
      errorRate: number;
      throughput: number;
    };
    bottlenecks: PerformanceBottleneck[];
    recommendations: {
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      impact: string;
      implementation: string;
    }[];
    metrics: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
      database: number;
    };
    trends: {
      queryPerformance: { timestamp: Date; value: number }[];
      systemLoad: { timestamp: Date; value: number }[];
      errorRate: { timestamp: Date; value: number }[];
    };
  } | null>(null);

  // 基础性能指标状态
  const [basicMetrics, setBasicMetrics] = useState<{
    queryExecutionTime: { timestamp: string; value: number; }[];
    writeLatency: { timestamp: string; value: number; }[];
    memoryUsage: { timestamp: string; value: number; }[];
    cpuUsage: { timestamp: string; value: number; }[];
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
      recommendations: Array<{
        priority: string;
        description: string;
        estimatedSavings: number;
      }>;
    };
  } | null>(null);

  // 格式化网络数据单位的函数
  // 转换时间范围格式的函数
  const normalizeTimeRange = useCallback((range: { from: Date; to: Date } | null) => {
    if (!range) {
      return {
        start: new Date(Date.now() - 60 * 60 * 1000), // 1小时前
        end: new Date(),
      };
    }
    return {
      start: range.from,
      end: range.to,
    };
  }, []);

  const formatNetworkData = useCallback((bytes: number) => {
    return FormatUtils.formatNetworkSpeed(bytes);
  }, []);

  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);
  const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(DEFAULT_PERFORMANCE_CONFIG.connectionMonitorInterval);
  const [realTimeMode, setRealTimeMode] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState({
    cpuUsage: 80,
    memoryUsage: 85,
    diskIo: 90,
    networkIo: 95,
    queryExecutionTime: 5000,
    connectionCount: 100,
  });

  // 监控模式状态
  const [monitoringMode, setMonitoringMode] = useState<'local' | 'remote'>('remote'); // 默认远程监控

  // 清理数据状态的函数
  const clearAllData = useCallback(() => {
    console.log('🧹 开始清理所有性能监控数据...');
    setBottlenecks([]);
    setSystemMetrics(null);
    setSlowQueries(null);
    setLockWaits({
      locks: [],
      summary: {
        totalLocks: 0,
        avgWaitTime: 0,
        maxWaitTime: 0,
        mostBlockedTable: '',
        recommendations: []
      }
    });
    setConnectionPoolStats(null);
    setPerformanceReport(null);
    setBasicMetrics(null);
    setLoading(false);
    console.log('✅ 所有性能监控数据已清理完成');
  }, []);

  // 监控模式变化时清理数据
  useEffect(() => {
    console.log(`🔄 监控模式已变更为: ${monitoringMode}`);
    // 不在这里清理数据，由切换函数负责
  }, [monitoringMode]);

  // 从设置中加载监控模式
  useEffect(() => {
    const loadMonitoringSettings = async () => {
      try {
        const settings = await safeTauriInvoke<{
          default_mode: string;
          auto_refresh_interval: number;
          enable_auto_refresh: boolean;
          remote_metrics_timeout: number;
          fallback_to_local: boolean;
        }>('get_monitoring_settings');
        setMonitoringMode(settings.default_mode as 'local' | 'remote');
      } catch (error) {
        console.warn('Failed to load monitoring settings, using default:', error);
      }
    };
    loadMonitoringSettings();
  }, []);

  // 获取基础性能指标（使用真实数据）
  const getBasicMetrics = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      console.log(`📊 开始获取${monitoringMode}监控模式的性能指标...`, { activeConnectionId, monitoringMode });
      
      const [metricsResult, _slowQueryResult] = await Promise.all([
        safeTauriInvoke<PerformanceMetricsResult>('get_performance_metrics_result', {
          connectionId: activeConnectionId,
          monitoringMode,
        }),
        safeTauriInvoke<SlowQueryAnalysisResult>('get_slow_query_analysis', {
          connectionId: activeConnectionId,
        }),
      ]);

      console.log('获取到的指标结果:', {
        hasQueryTime: !!metricsResult.queryExecutionTime && metricsResult.queryExecutionTime.length > 0,
        hasMemoryUsage: !!metricsResult.memoryUsage && metricsResult.memoryUsage.length > 0,
        hasCpuUsage: !!metricsResult.cpuUsage && metricsResult.cpuUsage.length > 0,
        diskIO: metricsResult.diskIO,
        networkIO: metricsResult.networkIO,
        dataLength: {
          cpu: metricsResult.cpuUsage?.length || 0,
          memory: metricsResult.memoryUsage?.length || 0,
          queryTime: metricsResult.queryExecutionTime?.length || 0
        }
      });

      setBasicMetrics({
        queryExecutionTime: Array.isArray(metricsResult.queryExecutionTime) && metricsResult.queryExecutionTime.length > 0 && typeof metricsResult.queryExecutionTime[0] === 'object' 
          ? metricsResult.queryExecutionTime as { timestamp: string; value: number; }[]
          : (metricsResult.queryExecutionTime as unknown as number[] || []).map((value, index) => ({ timestamp: new Date(Date.now() - (index * 60000)).toISOString(), value })),
        writeLatency: Array.isArray(metricsResult.writeLatency) && metricsResult.writeLatency.length > 0 && typeof metricsResult.writeLatency[0] === 'object'
          ? metricsResult.writeLatency as { timestamp: string; value: number; }[]
          : (metricsResult.writeLatency as unknown as number[] || []).map((value, index) => ({ timestamp: new Date(Date.now() - (index * 60000)).toISOString(), value })),
        memoryUsage: Array.isArray(metricsResult.memoryUsage) && metricsResult.memoryUsage.length > 0 && typeof metricsResult.memoryUsage[0] === 'object'
          ? metricsResult.memoryUsage as { timestamp: string; value: number; }[]
          : (metricsResult.memoryUsage as unknown as number[] || []).map((value, index) => ({ timestamp: new Date(Date.now() - (index * 60000)).toISOString(), value })),
        cpuUsage: Array.isArray(metricsResult.cpuUsage) && metricsResult.cpuUsage.length > 0 && typeof metricsResult.cpuUsage[0] === 'object'
          ? metricsResult.cpuUsage as { timestamp: string; value: number; }[]
          : (metricsResult.cpuUsage as unknown as number[] || []).map((value, index) => ({ timestamp: new Date(Date.now() - (index * 60000)).toISOString(), value })),
        diskIO: metricsResult.diskIO || {
          readBytes: 0,
          writeBytes: 0,
          readOps: 0,
          writeOps: 0,
        },
        networkIO: metricsResult.networkIO || {
          bytesIn: 0,
          bytesOut: 0,
          packetsIn: 0,
          packetsOut: 0,
        },
        storageAnalysis: metricsResult.storageAnalysis ? {
          totalSize: metricsResult.storageAnalysis.totalSize || 0,
          compressionRatio: metricsResult.storageAnalysis.compressionRatio || 1.0,
          retentionPolicyEffectiveness: metricsResult.storageAnalysis.retentionPolicyEffectiveness || 0,
          recommendations: Array.isArray(metricsResult.storageAnalysis.recommendations) 
            ? (metricsResult.storageAnalysis.recommendations as any[]).map(rec => 
                typeof rec === 'string' 
                  ? { priority: 'medium', description: rec, estimatedSavings: 0 }
                  : rec as { priority: string; description: string; estimatedSavings: number; }
              )
            : [] as { priority: string; description: string; estimatedSavings: number; }[],
        } : {
          totalSize: 0,
          compressionRatio: 1.0,
          retentionPolicyEffectiveness: 0,
          recommendations: [] as { priority: string; description: string; estimatedSavings: number; }[],
        },
      });
    } catch (error) {
      console.error('获取基础性能指标失败:', error);
      showMessage.error('获取基础性能指标失败，请检查连接状态');
      // 清空指标数据以避免显示过期信息
      setBasicMetrics(null);
    }
  }, [activeConnectionId, monitoringMode]);



  // 获取性能瓶颈数据
  const getBottlenecks = useCallback(async () => {
    if (!activeConnectionId) return;

    setLoading(true);
    try {
      console.log(`🔍 开始获取${monitoringMode}监控模式的性能瓶颈数据...`, { activeConnectionId, monitoringMode });
      const range = normalizeTimeRange(timeRange);

      const [
        bottlenecksData,
        systemMetricsData,
        slowQueriesData,
        lockWaitsData,
        _connectionPoolData,
        performanceReportData,
      ] = await Promise.all([
        PerformanceBottleneckService.detectPerformanceBottlenecksWithMode(
          activeConnectionId,
          monitoringMode,
          range
        ),
        // 根据监控模式获取系统性能指标
        safeTauriInvoke('get_system_performance_metrics', {
          connectionId: activeConnectionId,
          timeRange: range,
          monitoringMode,
        }),
        // 只有远程监控才获取慢查询
        monitoringMode === 'remote'
          ? PerformanceBottleneckService.getSlowQueryLog(activeConnectionId, {
              limit: 50,
            }).then(queries => {
              if (Array.isArray(queries)) {
                return { queries, total: queries.length };
              } else if (queries && typeof queries === 'object' && 'queries' in queries) {
                return queries as { queries: any[], total: number };
              } else {
                return { queries: [], total: 0 };
              }
            })
          : Promise.resolve({ queries: [], total: 0 }),
        // 只有远程监控才分析锁等待
        monitoringMode === 'remote'
          ? PerformanceBottleneckService.analyzeLockWaits(
              activeConnectionId,
              range
            )
          : Promise.resolve({ locks: [], summary: { totalLocks: 0, avgWaitTime: 0, maxWaitTime: 0, mostBlockedTable: '', recommendations: [] } }),
        PerformanceBottleneckService.getConnectionPoolStats(
          activeConnectionId,
          range
        ),
        // 根据监控模式获取性能报告
        monitoringMode === 'remote'
          ? PerformanceBottleneckService.generatePerformanceReport(
              activeConnectionId,
              range
            )
          : safeTauriInvoke('generate_local_performance_report', {
              connectionId: activeConnectionId,
              timeRange: range,
              monitoringMode,
            }),
      ]);

      // 同时获取基础性能指标
      await getBasicMetrics();

      setBottlenecks(bottlenecksData);
      setSystemMetrics(systemMetricsData);
      setSlowQueries(slowQueriesData);
      setLockWaits(lockWaitsData);
      setConnectionPoolStats(_connectionPoolData);
      setPerformanceReport(performanceReportData);
    } catch (error) {
      console.error(`❌ 获取${monitoringMode}监控模式的性能瓶颈数据失败:`, error);
      showMessage.error(`获取${monitoringMode === 'local' ? '本地' : '远程'}监控数据失败`);
      // 清理可能的脏数据
      clearAllData();
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, timeRange, getBasicMetrics, monitoringMode]);



  // 自动刷新 - 支持本地和远程监控
  useEffect(() => {
    if (autoRefresh) {
      // 根据监控模式设置不同的刷新间隔
      const interval = monitoringMode === 'local'
        ? Math.max(refreshInterval * 1000, 10000) // 本地监控最少10秒
        : Math.max(refreshInterval * 1000, 30000); // 远程监控最少30秒

      const refreshTimer = setInterval(() => {
        getBottlenecks();
        getBasicMetrics(); // 同时刷新基础指标
      }, interval);

      return () => clearInterval(refreshTimer);
    }
  }, [autoRefresh, refreshInterval, getBottlenecks, getBasicMetrics, monitoringMode]);

  // 实时监控 - 更频繁的数据更新
  useEffect(() => {
    if (realTimeMode) {
      // 实时监控每5秒更新一次
      const realTimeTimer = setInterval(() => {
        getBasicMetrics(); // 实时监控主要更新基础指标
      }, 5000);

      return () => clearInterval(realTimeTimer);
    }
  }, [realTimeMode, getBasicMetrics]);



  // 监控状态管理
  const [isMonitoringActive, setIsMonitoringActive] = useState(false);

  // 同步监控状态
  const syncMonitoringStatus = useCallback(async () => {
    try {
      const status = await safeTauriInvoke<boolean>('get_system_monitoring_status');
      setIsMonitoringActive(status);
    } catch (error) {
      console.error('获取监控状态失败:', error);
    }
  }, []);

  // 启动监控的函数
  const startMonitoring = useCallback(async () => {
    try {
      await safeTauriInvoke<void>('start_system_monitoring', {});
      await syncMonitoringStatus(); // 同步状态
      console.log('系统监控已启动');
    } catch (error) {
      console.error('启动系统监控失败:', error);
      showMessage.error('启动系统监控失败');
    }
  }, [syncMonitoringStatus]);

  // 停止监控的函数
  const stopMonitoring = useCallback(async () => {
    try {
      await safeTauriInvoke<void>('stop_system_monitoring', {});
      await syncMonitoringStatus(); // 同步状态
      console.log('系统监控已停止');
    } catch (error) {
      console.error('停止系统监控失败:', error);
    }
  }, [syncMonitoringStatus]);

  // 初始化监控状态
  useEffect(() => {
    syncMonitoringStatus();
  }, [syncMonitoringStatus]);

  // 初始加载性能数据并启动监控
  useEffect(() => {
    if (activeConnectionId) {
      // 根据监控模式决定是否启动系统监控
      if (monitoringMode === 'local') {
        startMonitoring().then(() => {
          getBottlenecks();
          getBasicMetrics(); // 确保获取基础指标
        });
      } else {
        // 远程监控模式不需要启动本地系统监控
        getBottlenecks();
        getBasicMetrics(); // 确保获取基础指标
      }
    }

    // 组件卸载时停止监控
    return () => {
      if (monitoringMode === 'local' && isMonitoringActive) {
        stopMonitoring();
      }
    };
  }, [activeConnectionId, monitoringMode, startMonitoring, stopMonitoring, getBottlenecks, getBasicMetrics, isMonitoringActive]);

  // 获取严重程度颜色
  const getSeverityVariant = (severity: string) => {
    const variantMap: Record<
      string,
      'default' | 'secondary' | 'destructive' | 'outline'
    > = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      critical: 'destructive',
    };
    return variantMap[severity] || 'default';
  };

  // 获取严重程度图标
  const getSeverityIcon = (severity: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      low: <Info className='w-4 h-4 text-green-500' />,
      medium: <AlertTriangle className='w-4 h-4 text-yellow-500' />,
      high: <AlertCircle className='w-4 h-4 text-red-500' />,
      critical: <AlertCircle className='w-4 h-4 text-red-600' />,
    };
    return iconMap[severity] || <Info className='w-4 h-4' />;
  };

  // 获取类型图标
  const getTypeIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      query: <Bug className='w-4 h-4' />,
      connection: <Webhook className='w-4 h-4' />,
      memory: <Database className='w-4 h-4' />,
      disk: <Database className='w-4 h-4' />,
      network: <Webhook className='w-4 h-4' />,
      cpu: <Bug className='w-4 h-4' />,
      lock: <Lock className='w-4 h-4' />,
    };
    return iconMap[type] || <Info className='w-4 h-4' />;
  };

  // 获取状态图标
  const getStatusIcon = (status: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      active: <Flame className='w-4 h-4 text-red-500' />,
      resolved: <CheckCircle className='w-4 h-4 text-green-500' />,
      ignored: <MinusCircle className='w-4 h-4 text-gray-400' />,
    };
    return iconMap[status] || <Info className='w-4 h-4' />;
  };

  // 格式化时间
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 生成基于真实数据的系统监控图表数据
  const generateSystemChartData = (type: 'cpu-memory' | 'disk-network') => {
    if (!basicMetrics) {
      // 如果没有真实数据，显示提示信息而不是空图表
      return {
        timeColumn: '时间',
        valueColumns: type === 'cpu-memory'
          ? ['CPU使用率(%)', '内存使用率(%)']
          : ['磁盘读取(MB)', '磁盘写入(MB)', '网络入站(B/s)', '网络出站(B/s)'],
        data: [{
          时间: '暂无数据',
          ...(type === 'cpu-memory'
            ? { 'CPU使用率(%)': 0, '内存使用率(%)': 0 }
            : { '磁盘读取(MB)': 0, '磁盘写入(MB)': 0, '网络入站(B/s)': 0, '网络出站(B/s)': 0 })
        }],
      };
    }
    
    if (type === 'cpu-memory') {
      // 使用真实的CPU和内存数据
      const combinedData = basicMetrics.cpuUsage.map((cpuPoint, index) => {
        const memoryPoint = basicMetrics.memoryUsage[index];
        return {
          时间: new Date(cpuPoint.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          'CPU使用率(%)': Math.round(cpuPoint.value * 10) / 10,
          '内存使用率(%)': memoryPoint ? Math.round(memoryPoint.value * 10) / 10 : 0,
        };
      });
      
      return {
        timeColumn: '时间',
        valueColumns: ['CPU使用率(%)', '内存使用率(%)'],
        data: combinedData,
      };
    } else {
      // 使用真实的磁盘和网络数据
      const diskIO = basicMetrics.diskIO;
      const networkIO = basicMetrics.networkIO;
      
      // 基于真实数据创建时间序列，避免硬编码的时间循环
      if (basicMetrics.cpuUsage.length > 0) {
        // 使用已有的时间序列数据
        const data = basicMetrics.cpuUsage.map((point, index) => {
          // 将字节转换为合适的单位
          const readMBps = Math.round((diskIO.readBytes / (1024 * 1024)) * 10) / 10; // 转换为MB
          const writeMBps = Math.round((diskIO.writeBytes / (1024 * 1024)) * 10) / 10;
          // 网络数据自动转换单位
          const netInFormatted = formatNetworkData(networkIO.bytesIn);
          const netOutFormatted = formatNetworkData(networkIO.bytesOut);

          return {
            时间: new Date(point.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            '磁盘读取(MB)': readMBps,
            '磁盘写入(MB)': writeMBps,
            [`网络入站(${netInFormatted.unit})`]: netInFormatted.value,
            [`网络出站(${netOutFormatted.unit})`]: netOutFormatted.value,
          };
        });
        
        // 获取网络数据的单位（使用第一个数据点的单位）
        const firstNetInUnit = data.length > 0 ? Object.keys(data[0]).find(key => key.startsWith('网络入站')) || '网络入站(B/s)' : '网络入站(B/s)';
        const firstNetOutUnit = data.length > 0 ? Object.keys(data[0]).find(key => key.startsWith('网络出站')) || '网络出站(B/s)' : '网络出站(B/s)';

        return {
          timeColumn: '时间',
          valueColumns: ['磁盘读取(MB)', '磁盘写入(MB)', firstNetInUnit, firstNetOutUnit],
          data,
        };
      } else {
        // 如果没有时间序列数据，显示当前值
        const netInFormatted = formatNetworkData(networkIO.bytesIn);
        const netOutFormatted = formatNetworkData(networkIO.bytesOut);

        return {
          timeColumn: '时间',
          valueColumns: ['磁盘读取(MB)', '磁盘写入(MB)', `网络入站(${netInFormatted.unit})`, `网络出站(${netOutFormatted.unit})`],
          data: [{
            时间: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            '磁盘读取(MB)': Math.round((diskIO.readBytes / (1024 * 1024)) * 10) / 10,
            '磁盘写入(MB)': Math.round((diskIO.writeBytes / (1024 * 1024)) * 10) / 10,
            [`网络入站(${netInFormatted.unit})`]: netInFormatted.value,
            [`网络出站(${netOutFormatted.unit})`]: netOutFormatted.value,
          }],
        };
      }
    }
  };

  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 执行健康检查
  const performHealthCheck = async () => {
    if (!activeConnectionId) return;

    try {
      await safeTauriInvoke<void>('perform_health_check', {
        connectionId: activeConnectionId,
      });
      await getBottlenecks(); // 重新加载数据
      showMessage.success('健康检查完成');
    } catch (error) {
      console.error('健康检查失败:', error);
      showMessage.error('健康检查失败');
    }
  };

  // 过滤瓶颈数据
  const filteredBottlenecks = bottlenecks.filter(bottleneck => {
    if (severityFilter !== 'all' && bottleneck.severity !== severityFilter)
      return false;
    if (typeFilter !== 'all' && bottleneck.type !== typeFilter) return false;
    if (statusFilter !== 'all' && bottleneck.status !== statusFilter)
      return false;
    if (
      searchText &&
      !bottleneck.title.toLowerCase().includes(searchText.toLowerCase()) &&
      !bottleneck.description.toLowerCase().includes(searchText.toLowerCase())
    )
      return false;
    return true;
  });

  // 标记瓶颈已解决
  const markAsResolved = async (bottleneckId: string) => {
    try {
      await PerformanceBottleneckService.markBottleneckResolved(bottleneckId);
      showMessage.success('瓶颈已标记为已解决');
      getBottlenecks();
    } catch (error) {
      console.error('标记瓶颈失败:', error);
      showMessage.error('标记瓶颈失败');
    }
  };

  // 忽略瓶颈
  const ignoreBottleneck = async (bottleneckId: string) => {
    try {
      await PerformanceBottleneckService.ignoreBottleneck(bottleneckId);
      showMessage.success('瓶颈已忽略');
      getBottlenecks();
    } catch (error) {
      console.error('忽略瓶颈失败:', error);
      showMessage.error('忽略瓶颈失败');
    }
  };

  // 瓶颈表格列定义
  const bottleneckColumns = [
    {
      accessorKey: 'type',
      header: '类型',
      cell: ({ row }: { row: TableRowData }) => (
        <div className='flex items-center gap-2'>
          {getTypeIcon(row.original.type)}
          <Text>{row.original.type}</Text>
        </div>
      ),
    },
    {
      accessorKey: 'severity',
      header: '严重程度',
      cell: ({ row }: { row: TableRowData }) => (
        <div className='flex items-center gap-2'>
          {getSeverityIcon(row.original.severity)}
          <Badge variant={getSeverityVariant(row.original.severity)}>
            {row.original.severity.toUpperCase()}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }: { row: TableRowData }) => (
        <Text className='font-semibold'>{row.original.title}</Text>
      ),
    },
    {
      accessorKey: 'description',
      header: '描述',
      cell: ({ row }: { row: TableRowData }) => (
        <Text className='line-clamp-2 max-w-[300px]'>
          {row.original.description}
        </Text>
      ),
    },
    {
      accessorKey: 'duration',
      header: '持续时间',
      cell: ({ row }: { row: TableRowData }) => formatTime(row.original.duration),
    },
    {
      accessorKey: 'frequency',
      header: '频率',
      cell: ({ row }: { row: TableRowData }) => `${row.original.frequency}次`,
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }: { row: TableRowData }) => (
        <div className='flex items-center gap-2'>
          {getStatusIcon(row.original.status)}
          <Text>
            {row.original.status === 'active'
              ? '活跃'
              : row.original.status === 'resolved'
                ? '已解决'
                : '已忽略'}
          </Text>
        </div>
      ),
    },
    {
      accessorKey: 'detectedAt',
      header: '检测时间',
      cell: ({ row }: { row: TableRowData }) =>
        dayjs(row.original.detectedAt).format('MM-DD HH:mm'),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }: { row: TableRowData }) => (
        <div className='flex gap-1'>
          <Button
            size='sm'
            onClick={() => {
              setSelectedBottleneck(row.original);
              setDetailsDrawerVisible(true);
            }}
            variant='outline'
          >
            <Eye className='w-4 h-4' />
          </Button>
          {row.original.status === 'active' && (
            <>
              <Button
                size='sm'
                onClick={() => markAsResolved(row.original.id)}
                variant='outline'
              >
                <CheckCircle className='w-4 h-4' />
              </Button>
              <Button
                size='sm'
                onClick={() => ignoreBottleneck(row.original.id)}
                variant='outline'
              >
                <Minus className='w-4 h-4' />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // 渲染概览
  const renderOverview = () => {
    if (!bottlenecks.length) {
      return (
        <div className='text-center py-12'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center'>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
            <div>
              <Text className='text-lg font-semibold mb-2'>系统运行良好</Text>
              <Text className='text-muted-foreground'>
                {monitoringMode === 'local'
                  ? '本地系统监控未检测到性能瓶颈'
                  : '远程监控未检测到性能瓶颈'}
              </Text>
            </div>
          </div>
        </div>
      );
    }

    const activeBottlenecks = bottlenecks.filter(b => b.status === 'active');
    const criticalBottlenecks = bottlenecks.filter(
      b => b.severity === 'critical'
    );
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high');
    const totalImpact = bottlenecks.reduce(
      (sum, b) => sum + parseFloat(b.impact),
      0
    );

    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='活跃瓶颈'
                value={`${activeBottlenecks.length} / ${bottlenecks.length}`}
                icon={<Flame className='w-4 h-4' />}
                valueClassName={
                  activeBottlenecks.length > 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='严重瓶颈'
                value={criticalBottlenecks.length}
                icon={<AlertCircle className='w-4 h-4' />}
                valueClassName={
                  criticalBottlenecks.length > 0
                    ? 'text-red-500'
                    : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='高危瓶颈'
                value={highBottlenecks.length}
                icon={<AlertTriangle className='w-4 h-4' />}
                valueClassName={
                  highBottlenecks.length > 0
                    ? 'text-yellow-500'
                    : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='总体影响'
                value={`${totalImpact.toFixed(1)}%`}
                icon={<TrendingUp className='w-4 h-4' />}
                valueClassName={
                  totalImpact > 20
                    ? 'text-red-500'
                    : totalImpact > 10
                      ? 'text-yellow-500'
                      : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* 过滤器 */}
        <Card>
          <CardContent className='p-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end'>
              <div className='lg:col-span-2'>
                <Input
                  placeholder='搜索瓶颈...'
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
              <div>
                <Select
                  value={severityFilter}
                  onValueChange={(value: 'all' | 'high' | 'low' | 'medium' | 'critical') => setSeverityFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='严重程度' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>所有严重程度</SelectItem>
                    <SelectItem value='critical'>严重</SelectItem>
                    <SelectItem value='high'>高</SelectItem>
                    <SelectItem value='medium'>中</SelectItem>
                    <SelectItem value='low'>低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as 'all' | 'query' | 'connection' | 'memory' | 'disk' | 'network' | 'cpu' | 'lock')}>
                  <SelectTrigger>
                    <SelectValue placeholder='类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>所有类型</SelectItem>
                    <SelectItem value='query'>查询</SelectItem>
                    <SelectItem value='connection'>连接</SelectItem>
                    <SelectItem value='memory'>内存</SelectItem>
                    <SelectItem value='disk'>磁盘</SelectItem>
                    <SelectItem value='network'>网络</SelectItem>
                    <SelectItem value='cpu'>CPU</SelectItem>
                    <SelectItem value='lock'>锁</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'resolved' | 'ignored')}>
                  <SelectTrigger>
                    <SelectValue placeholder='状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>所有状态</SelectItem>
                    <SelectItem value='active'>活跃</SelectItem>
                    <SelectItem value='resolved'>已解决</SelectItem>
                    <SelectItem value='ignored'>已忽略</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='flex items-center gap-2'>
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Text className='text-sm text-muted-foreground'>自动刷新</Text>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    setSearchText('');
                    setSeverityFilter('all');
                    setTypeFilter('all');
                    setStatusFilter('all');
                    setTimeRange(null);
                  }}
                >
                  <X className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 瓶颈表格 */}
        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    {bottleneckColumns.map(column => (
                      <TableHead key={column.accessorKey || column.id}>
                        {column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBottlenecks.map(bottleneck => (
                    <TableRow
                      key={bottleneck.id}
                      className={
                        bottleneck.severity === 'critical'
                          ? 'bg-red-50 dark:bg-red-950/20'
                          : bottleneck.severity === 'high'
                            ? 'bg-yellow-50 dark:bg-yellow-950/20'
                            : ''
                      }
                    >
                      {bottleneckColumns.map(column => (
                        <TableCell key={column.accessorKey || column.id}>
                          {column.cell
                            ? column.cell({ row: { original: bottleneck } })
                            : String(bottleneck[
                                column.accessorKey as keyof PerformanceBottleneck
                              ] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染系统指标
  const renderSystemMetrics = () => {
    if (!systemMetrics) {
      return <Empty description='没有系统性能指标数据' />;
    }

    const cpuUsage =
      systemMetrics.cpu?.[systemMetrics.cpu.length - 1]?.usage || 0;
    const memoryUsage =
      systemMetrics.memory?.[systemMetrics.memory.length - 1]?.usage || 0;
    const diskIops =
      systemMetrics.disk?.[systemMetrics.disk.length - 1]?.readIops || 0;
    const networkBytes =
      systemMetrics.network?.[systemMetrics.network.length - 1]?.bytesIn || 0;

    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='CPU使用率'
                value={`${cpuUsage.toFixed(1)}%`}
                icon={<Bug className='w-4 h-4' />}
                valueClassName={
                  cpuUsage > 80 ? 'text-red-500' : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='内存使用率'
                value={`${memoryUsage.toFixed(1)}%`}
                icon={<Database className='w-4 h-4' />}
                valueClassName={
                  memoryUsage > 85 ? 'text-red-500' : 'text-green-500'
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='磁盘I/O'
                value={`${diskIops} IOPS`}
                icon={<Database className='w-4 h-4' />}
                valueClassName='text-blue-500'
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='网络I/O'
                value={FormatUtils.formatNetworkSpeed(networkBytes).formatted}
                icon={<Webhook className='w-4 h-4' />}
                valueClassName='text-purple-500'
              />
            </CardContent>
          </Card>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>CPU和内存使用率趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleChart
                data={generateSystemChartData('cpu-memory')}
                type="line"
                height={200}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>磁盘和网络I/O趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleChart
                data={generateSystemChartData('disk-network')}
                type="line"
                height={200}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // 渲染慢查询
  const renderSlowQueries = () => {
    if (!slowQueries || !slowQueries.queries.length) {
      return <Empty description='没有慢查询数据' />;
    }

    return (
      <div className='space-y-4'>
        <Alert>
          <Info className='h-4 w-4' />
          <AlertDescription>
            共检测到 {slowQueries.total} 个慢查询，显示前{' '}
            {slowQueries.queries.length} 个
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[300px]'>查询</TableHead>
                    <TableHead>平均执行时间</TableHead>
                    <TableHead>最大执行时间</TableHead>
                    <TableHead>执行频率</TableHead>
                    <TableHead>数据库</TableHead>
                    <TableHead>最近执行</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowQueries.queries.map((query: SlowQuery, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Text className='font-mono text-sm line-clamp-2 max-w-[300px]'>
                          {query.query}
                        </Text>
                      </TableCell>
                      <TableCell>{formatTime(query.avgDuration)}</TableCell>
                      <TableCell>{formatTime(query.maxDuration)}</TableCell>
                      <TableCell>{query.frequency}次</TableCell>
                      <TableCell>{query.database}</TableCell>
                      <TableCell>
                        {dayjs(query.lastExecuted).format('MM-DD HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染锁等待分析
  const renderLockWaits = () => {
    if (!lockWaits || !lockWaits.locks.length) {
      return <Empty description='没有锁等待数据' />;
    }

    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='总锁等待数'
                value={lockWaits.summary.totalLocks}
                icon={<Lock className='w-4 h-4' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='平均等待时间'
                value={`${lockWaits.summary.avgWaitTime.toFixed(2)} ms`}
                icon={<Clock className='w-4 h-4' />}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='最大等待时间'
                value={`${lockWaits.summary.maxWaitTime.toFixed(2)} ms`}
                icon={<AlertCircle className='w-4 h-4' />}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>锁类型</TableHead>
                    <TableHead>表名</TableHead>
                    <TableHead>等待时长</TableHead>
                    <TableHead>等待查询数</TableHead>
                    <TableHead className='w-[200px]'>阻塞查询</TableHead>
                    <TableHead>发生时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockWaits.locks.map((lock: LockWait, index: number) => (
                    <TableRow key={`${lock.table}-${lock.type}-${index}`}>
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='bg-orange-100 text-orange-700'
                        >
                          {lock.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{lock.table}</TableCell>
                      <TableCell>{formatTime(lock.duration)}</TableCell>
                      <TableCell>{lock.waitingQueries?.length || 0}</TableCell>
                      <TableCell>
                        <Text className='font-mono text-sm line-clamp-1 max-w-[200px]'>
                          {lock.blockingQuery}
                        </Text>
                      </TableCell>
                      <TableCell>
                        {dayjs(lock.timestamp).format('MM-DD HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {lockWaits.summary.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className='text-sm flex items-center gap-2'>
                <Lightbulb className='w-4 h-4 text-blue-500' />
                优化建议
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {lockWaits.summary.recommendations.map(
                  (recommendation: string, index: number) => (
                    <div
                      key={index}
                      className='flex items-start gap-2 p-2 bg-muted/20 rounded'
                    >
                      <div className='w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0' />
                      <Text className='text-sm'>{recommendation}</Text>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // 渲染基础性能监控
  const renderBasicMonitoring = () => {
    if (!basicMetrics) {
      return <Empty description='没有基础性能数据' />;
    }

    const { diskIO, networkIO, storageAnalysis } = basicMetrics;

    return (
      <div className='space-y-6'>
        {/* 系统资源概览 */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='磁盘读取'
                value={formatBytes(diskIO.readBytes)}
                icon={<Database className='w-4 h-4' />}
                valueClassName='text-blue-500'
              />
              <Text className='text-xs text-muted-foreground mt-1'>
                {diskIO.readOps} 操作/秒
              </Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='磁盘写入'
                value={formatBytes(diskIO.writeBytes)}
                icon={<Database className='w-4 h-4' />}
                valueClassName='text-green-500'
              />
              <Text className='text-xs text-muted-foreground mt-1'>
                {diskIO.writeOps} 操作/秒
              </Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='网络输入'
                value={FormatUtils.formatNetworkSpeed(networkIO.bytesIn).formatted}
                icon={<Webhook className='w-4 h-4' />}
                valueClassName='text-purple-500'
              />
              <Text className='text-xs text-muted-foreground mt-1'>
                {networkIO.packetsIn} 包/秒
              </Text>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='网络输出'
                value={FormatUtils.formatNetworkSpeed(networkIO.bytesOut).formatted}
                icon={<Webhook className='w-4 h-4' />}
                valueClassName='text-orange-500'
              />
              <Text className='text-xs text-muted-foreground mt-1'>
                {networkIO.packetsOut} 包/秒
              </Text>
            </CardContent>
          </Card>
        </div>

        {/* 存储分析 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Database className='w-5 h-5' />
              存储分析
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <div>
                <Text className='font-semibold mb-2 block'>总存储大小</Text>
                <Text className='text-2xl font-bold text-blue-600'>
                  {formatBytes(storageAnalysis.totalSize)}
                </Text>
              </div>
              <div>
                <Text className='font-semibold mb-2 block'>压缩比</Text>
                <Text className='text-2xl font-bold text-green-600'>
                  {storageAnalysis.compressionRatio.toFixed(2)}:1
                </Text>
              </div>
              <div>
                <Text className='font-semibold mb-2 block'>保留策略效果</Text>
                <Text className='text-2xl font-bold text-purple-600'>
                  {storageAnalysis.retentionPolicyEffectiveness.toFixed(1)}%
                </Text>
              </div>
            </div>

            {storageAnalysis.recommendations.length > 0 && (
              <div className='mt-6'>
                <Text className='font-semibold mb-3 block'>存储优化建议</Text>
                <div className='space-y-3'>
                  {storageAnalysis.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className='flex items-start gap-3 p-3 bg-muted/20 rounded'
                    >
                      <Badge
                        variant={
                          rec.priority === 'high' ? 'destructive' : 'secondary'
                        }
                        className='mt-0.5'
                      >
                        {rec.priority}
                      </Badge>
                      <div className='flex-1'>
                        <Text className='text-sm'>{rec.description}</Text>
                        <Text className='text-xs text-muted-foreground mt-1'>
                          预计节省: {formatBytes(rec.estimatedSavings)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // 渲染性能报告
  const renderPerformanceReport = () => {
    if (!performanceReport) {
      return <Empty description='没有性能报告数据' />;
    }

    const { summary, recommendations, metrics } = performanceReport;

    return (
      <div className='space-y-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <Statistic
                title='整体性能分数'
                value={`${summary.overallScore.toFixed(1)} / 100`}
                icon={<Trophy className='w-4 h-4' />}
                valueClassName={
                  summary.overallScore >= 80
                    ? 'text-green-500'
                    : summary.overallScore >= 60
                      ? 'text-yellow-500'
                      : 'text-red-500'
                }
              />
              <Text className='text-xs text-muted-foreground mt-1'>
                基于系统资源和查询性能的综合评估
              </Text>
            </CardContent>
          </Card>
          {monitoringMode === 'remote' && (
            <>
              <Card>
                <CardContent className='p-4'>
                  <Statistic
                    title='平均查询时间'
                    value={`${summary.avgQueryTime.toFixed(2)} ms`}
                    icon={<Clock className='w-4 h-4' />}
                    valueClassName={
                      summary.avgQueryTime > 1000 ? 'text-red-500' : 'text-green-500'
                    }
                  />
                  <Text className='text-xs text-muted-foreground mt-1'>
                    SQL查询的平均响应时间
                  </Text>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='p-4'>
                  <Statistic
                    title='慢查询率'
                    value={`${summary.errorRate.toFixed(2)}%`}
                    icon={<Bug className='w-4 h-4' />}
                    valueClassName={
                      summary.errorRate > 5 ? 'text-red-500' : 'text-green-500'
                    }
                  />
                  <Text className='text-xs text-muted-foreground mt-1'>
                    执行时间超过5秒的查询占比
                  </Text>
                </CardContent>
              </Card>
              <Card>
                <CardContent className='p-4'>
                  <Statistic
                    title='查询吞吐量'
                    value={`${summary.throughput.toFixed(1)} QPS`}
                    icon={<Rocket className='w-4 h-4' />}
                  />
                  <Text className='text-xs text-muted-foreground mt-1'>
                    每秒处理的查询数量
                  </Text>
                </CardContent>
              </Card>
            </>
          )}
          {monitoringMode === 'local' && (
            <Card>
              <CardContent className='p-4'>
                <Statistic
                  title='系统负载'
                  value={`${((metrics.cpu + metrics.memory) / 2).toFixed(1)}%`}
                  icon={<Rocket className='w-4 h-4' />}
                  valueClassName={
                    ((metrics.cpu + metrics.memory) / 2) > 80 ? 'text-red-500' : 'text-green-500'
                  }
                />
                <Text className='text-xs text-muted-foreground mt-1'>
                  CPU和内存的平均使用率
                </Text>
              </CardContent>
            </Card>
          )}
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>系统性能指标</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <Text className='font-semibold'>CPU使用率</Text>
                  <Text className='text-sm text-muted-foreground'>
                    {(metrics.cpu || 0).toFixed(2)}%
                  </Text>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, metrics.cpu || 0))}
                  className={`h-2 ${(metrics.cpu || 0) > 80 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                />
              </div>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <Text className='font-semibold'>内存使用率</Text>
                  <Text className='text-sm text-muted-foreground'>
                    {(metrics.memory || 0).toFixed(2)}%
                  </Text>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, metrics.memory || 0))}
                  className={`h-2 ${(metrics.memory || 0) > 85 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                />
              </div>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <Text className='font-semibold'>磁盘使用率</Text>
                  <Text className='text-sm text-muted-foreground'>
                    {(metrics.disk || 0).toFixed(2)}%
                  </Text>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, metrics.disk || 0))}
                  className={`h-2 ${(metrics.disk || 0) > 90 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                />
              </div>
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <Text className='font-semibold'>网络I/O</Text>
                  <Text className='text-sm text-muted-foreground'>
                    {(metrics.network || 0).toFixed(2)}%
                  </Text>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, metrics.network || 0))}
                  className={`h-2 ${(metrics.network || 0) > 95 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-sm'>性能优化建议</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations && recommendations.length > 0 ? (
                <div className='space-y-3'>
                  {recommendations
                    .slice(0, 5)
                    .map((recommendation: Recommendation, index: number) => (
                      <div
                        key={index}
                        className='flex items-start gap-3 p-3 bg-muted/20 rounded'
                      >
                        <Badge
                          variant={
                            recommendation.priority === 'critical'
                              ? 'destructive'
                              : recommendation.priority === 'high'
                                ? 'outline'
                                : recommendation.priority === 'medium'
                                  ? 'secondary'
                                  : 'default'
                          }
                          className='mt-0.5'
                        >
                          {recommendation.priority}
                        </Badge>
                        <div className='flex-1'>
                          <Text className='font-semibold text-sm'>
                            {recommendation.title}
                          </Text>
                          <Text className='text-sm text-muted-foreground mt-1'>
                            {recommendation.description}
                          </Text>
                          {recommendation.implementation && (
                            <Text className='text-xs text-blue-600 mt-1'>
                              建议措施: {recommendation.implementation}
                            </Text>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className='text-center py-8'>
                  <Text className='text-muted-foreground'>
                    {monitoringMode === 'local'
                      ? '系统运行良好，暂无优化建议'
                      : '正在分析性能数据，请稍候...'}
                  </Text>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Monitor className='w-5 h-5' />
              性能瓶颈诊断
              <div className='flex items-center gap-2 ml-4'>
                <div className={`w-2 h-2 rounded-full ${
                  monitoringMode === 'local'
                    ? (isMonitoringActive ? 'bg-green-500' : 'bg-gray-400')
                    : 'bg-blue-500'
                }`} />
                <span className='text-sm text-muted-foreground'>
                  {monitoringMode === 'local'
                    ? (isMonitoringActive ? '本地监控运行中' : '本地监控已停止')
                    : '远程监控模式'
                  }
                </span>
              </div>
            </CardTitle>
            <div className='flex gap-2'>
              <Select
                value={monitoringMode}
                onValueChange={async (value: 'local' | 'remote') => {
                  console.log(`🔄 切换监控模式: ${monitoringMode} -> ${value}`);

                  // 先停止当前监控
                  if (isMonitoringActive) {
                    await stopMonitoring();
                  }

                  // 清理所有现有数据，避免数据混乱
                  clearAllData();

                  setMonitoringMode(value);

                  // 根据新模式启动相应监控
                  if (value === 'local') {
                    await startMonitoring();
                  }

                  // 保存到设置
                  try {
                    const settings = await safeTauriInvoke<{
                      default_mode: string;
                      auto_refresh_interval: number;
                      enable_auto_refresh: boolean;
                      remote_metrics_timeout: number;
                      fallback_to_local: boolean;
                    }>('get_monitoring_settings');
                    await safeTauriInvoke('update_monitoring_settings', {
                      monitoringSettings: {
                        ...settings,
                        default_mode: value,
                      },
                    });

                    showMessage.success(`已切换到${value === 'local' ? '本地' : '远程'}监控模式`);
                  } catch (error) {
                    console.warn('Failed to save monitoring mode:', error);
                    showMessage.error('保存监控设置失败');
                  }

                  // 延迟加载新模式的数据，确保状态切换完成
                  setTimeout(() => {
                    console.log(`📊 开始加载${value === 'local' ? '本地' : '远程'}监控数据`);
                    getBottlenecks();
                    getBasicMetrics();
                  }, 500); // 增加延迟确保状态更新完成
                }}
              >
                <SelectTrigger className='w-[120px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='remote'>远程监控</SelectItem>
                  <SelectItem value='local'>本地监控</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size='sm'
                variant='outline'
                onClick={getBottlenecks}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新数据
              </Button>
              {monitoringMode === 'local' && (
                <Button
                  size='sm'
                  variant={isMonitoringActive ? 'destructive' : 'default'}
                  onClick={isMonitoringActive ? stopMonitoring : startMonitoring}
                  disabled={loading}
                >
                  {isMonitoringActive ? (
                    <>
                      <PauseCircle className='w-4 h-4 mr-2' />
                      停止监控
                    </>
                  ) : (
                    <>
                      <PlayCircle className='w-4 h-4 mr-2' />
                      启动监控
                    </>
                  )}
                </Button>
              )}
              <Button
                size='sm'
                variant='outline'
                onClick={performHealthCheck}
                disabled={loading}
              >
                <Zap className='w-4 h-4 mr-2' />
                健康检查
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => setDiagnosticsModalVisible(true)}
              >
                <Settings className='w-4 h-4 mr-2' />
                诊断设置
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  if (performanceReport) {
                    const blob = new Blob(
                      [JSON.stringify(performanceReport, null, 2)],
                      {
                        type: 'application/json',
                      }
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `performance-report-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
                disabled={!performanceReport}
              >
                <Download className='w-4 h-4 mr-2' />
                导出报告
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <Skeleton className='h-8 w-8 rounded-full animate-spin' />
              <Text className='ml-2'>加载中...</Text>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full ${monitoringMode === 'local' ? 'grid-cols-4' : 'grid-cols-6'}`}>
                <TabsTrigger value='overview'>瓶颈概览</TabsTrigger>
                <TabsTrigger value='basic'>基础监控</TabsTrigger>
                <TabsTrigger value='metrics'>系统指标</TabsTrigger>
                {monitoringMode === 'remote' && (
                  <TabsTrigger value='slow-queries'>慢查询</TabsTrigger>
                )}
                {monitoringMode === 'remote' && (
                  <TabsTrigger value='lock-waits'>锁等待</TabsTrigger>
                )}
                <TabsTrigger value='report'>性能报告</TabsTrigger>
              </TabsList>
              <TabsContent value='overview' className='mt-6'>
                {renderOverview()}
              </TabsContent>
              <TabsContent value='basic' className='mt-6'>
                <div className='mb-4 p-4 bg-muted/50 rounded-lg'>
                  <div className='flex items-center gap-2 mb-2'>
                    <div className={`w-3 h-3 rounded-full ${
                      monitoringMode === 'local'
                        ? (isMonitoringActive ? 'bg-green-500' : 'bg-gray-400')
                        : 'bg-blue-500'
                    }`} />
                    <Text className='font-medium'>
                      当前监控模式：{monitoringMode === 'local' ? '本地监控' : '远程监控'}
                    </Text>
                  </div>
                  <Text className='text-sm text-muted-foreground'>
                    {monitoringMode === 'local'
                      ? '正在监控本地系统资源使用情况，包括CPU、内存、磁盘和网络'
                      : '正在监控远程InfluxDB服务器的性能指标和系统状态'
                    }
                  </Text>
                </div>
                {renderBasicMonitoring()}
              </TabsContent>
              <TabsContent value='metrics' className='mt-6'>
                {renderSystemMetrics()}
              </TabsContent>
              {monitoringMode === 'remote' && (
                <TabsContent value='slow-queries' className='mt-6'>
                  {renderSlowQueries()}
                </TabsContent>
              )}
              {monitoringMode === 'remote' && (
                <TabsContent value='lock-waits' className='mt-6'>
                  {renderLockWaits()}
                </TabsContent>
              )}
              <TabsContent value='report' className='mt-6'>
                {renderPerformanceReport()}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* 瓶颈详情抽屉 */}
      <Sheet open={detailsDrawerVisible} onOpenChange={setDetailsDrawerVisible}>
        <SheetContent className='w-[600px] sm:max-w-[600px]'>
          <SheetHeader>
            <SheetTitle>性能瓶颈详情</SheetTitle>
          </SheetHeader>
          {selectedBottleneck && (
            <div className='mt-6 space-y-6'>
              <div className='grid gap-4'>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>类型</Text>
                  <div className='col-span-2 flex items-center gap-2'>
                    {getTypeIcon(selectedBottleneck.type)}
                    <span>{selectedBottleneck.type}</span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>严重程度</Text>
                  <div className='col-span-2 flex items-center gap-2'>
                    {getSeverityIcon(selectedBottleneck.severity)}
                    <Badge
                      variant={getSeverityVariant(selectedBottleneck.severity)}
                    >
                      {selectedBottleneck.severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>标题</Text>
                  <div className='col-span-2'>
                    <Text>{selectedBottleneck.title}</Text>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>描述</Text>
                  <div className='col-span-2'>
                    <Text>{selectedBottleneck.description}</Text>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>影响</Text>
                  <div className='col-span-2'>
                    <Text>{selectedBottleneck.impact}</Text>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>持续时间</Text>
                  <div className='col-span-2'>
                    <Text>{formatTime(selectedBottleneck.duration)}</Text>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>发生频率</Text>
                  <div className='col-span-2'>
                    <Text>{selectedBottleneck.frequency}次</Text>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>状态</Text>
                  <div className='col-span-2 flex items-center gap-2'>
                    {getStatusIcon(selectedBottleneck.status)}
                    <span>
                      {selectedBottleneck.status === 'active'
                        ? '活跃'
                        : selectedBottleneck.status === 'resolved'
                          ? '已解决'
                          : '已忽略'}
                    </span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-4 py-2 border-b'>
                  <Text className='font-semibold'>检测时间</Text>
                  <div className='col-span-2'>
                    <Text>
                      {dayjs(selectedBottleneck.detectedAt).format(
                        'YYYY-MM-DD HH:mm:ss'
                      )}
                    </Text>
                  </div>
                </div>
              </div>

              {selectedBottleneck.recommendations.length > 0 && (
                <div className='mt-6'>
                  <div className='flex items-center gap-2 mb-4'>
                    <Lightbulb className='w-4 h-4 text-blue-500' />
                    <Text className='font-semibold'>解决建议</Text>
                  </div>
                  <div className='space-y-2'>
                    {selectedBottleneck.recommendations.map(
                      (recommendation: string, index: number) => (
                        <div
                          key={index}
                          className='flex items-start gap-2 p-3 bg-muted/20 rounded'
                        >
                          <div className='w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0' />
                          <Text className='text-sm'>{recommendation}</Text>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className='mt-6 pt-4 border-t'>
                <div className='flex gap-2'>
                  {selectedBottleneck.status === 'active' && (
                    <>
                      <Button
                        onClick={() => {
                          markAsResolved(selectedBottleneck.id);
                          setDetailsDrawerVisible(false);
                        }}
                      >
                        <CheckCircle className='w-4 h-4 mr-2' />
                        标记为已解决
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => {
                          ignoreBottleneck(selectedBottleneck.id);
                          setDetailsDrawerVisible(false);
                        }}
                      >
                        <Minus className='w-4 h-4 mr-2' />
                        忽略此瓶颈
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 诊断设置模态框 */}
      <Dialog
        open={diagnosticsModalVisible}
        onOpenChange={setDiagnosticsModalVisible}
      >
        <DialogContent className='max-w-[600px]'>
          <DialogHeader>
            <DialogTitle>诊断设置</DialogTitle>
          </DialogHeader>
          <div className='space-y-6 py-4'>
            <div>
              <Text className='font-semibold mb-3 block'>自动刷新</Text>
              <div className='grid grid-cols-2 gap-4'>
                <div className='flex items-center space-x-2'>
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Text className='text-sm'>
                    {autoRefresh ? '开启' : '关闭'}
                  </Text>
                </div>
                <div>
                  <InputNumber
                    value={refreshInterval}
                    onChange={value => setRefreshInterval(value || 30)}
                    min={10}
                    max={300}
                    disabled={!autoRefresh}
                    addonAfter="秒"
                    className='w-full'
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Text className='font-semibold mb-3 block'>告警阈值</Text>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Text className='text-sm mb-2 block'>CPU使用率</Text>
                  <InputNumber
                    value={alertThresholds.cpuUsage}
                    onChange={value =>
                      setAlertThresholds({
                        ...alertThresholds,
                        cpuUsage: value || 80,
                      })
                    }
                    min={0}
                    max={100}
                    addonAfter="%"
                    className='w-full'
                  />
                </div>
                <div>
                  <Text className='text-sm mb-2 block'>内存使用率</Text>
                  <InputNumber
                    value={alertThresholds.memoryUsage}
                    onChange={value =>
                      setAlertThresholds({
                        ...alertThresholds,
                        memoryUsage: value || 85,
                      })
                    }
                    min={0}
                    max={100}
                    addonAfter="%"
                    className='w-full'
                  />
                </div>
                <div>
                  <Text className='text-sm mb-2 block'>磁盘I/O</Text>
                  <InputNumber
                    value={alertThresholds.diskIo}
                    onChange={value =>
                      setAlertThresholds({
                        ...alertThresholds,
                        diskIo: value || 90,
                      })
                    }
                    min={0}
                    max={100}
                    addonAfter="%"
                    className='w-full'
                  />
                </div>
                <div>
                  <Text className='text-sm mb-2 block'>网络I/O</Text>
                  <InputNumber
                    value={alertThresholds.networkIo}
                    onChange={value =>
                      setAlertThresholds({
                        ...alertThresholds,
                        networkIo: value || 95,
                      })
                    }
                    min={0}
                    max={100}
                    addonAfter="%"
                    className='w-full'
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Text className='font-semibold mb-3 block'>实时监控</Text>
              <div className='flex items-center space-x-2'>
                <Switch
                  checked={realTimeMode}
                  onCheckedChange={setRealTimeMode}
                />
                <Text className='text-sm'>
                  {realTimeMode ? '开启' : '关闭'}
                </Text>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceBottleneckDiagnostics;
