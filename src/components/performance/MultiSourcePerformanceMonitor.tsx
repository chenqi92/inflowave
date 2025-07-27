import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Database,
  Eye,
  HardDrive,
  Network,
  RefreshCw,
  Settings,
  TrendingUp,
  XCircle,
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['datasources', 'metrics'])
  );
  const [compactMode, setCompactMode] = useState<boolean>(false);
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

  // 切换折叠状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 获取健康状态图标
  const getHealthIcon = (healthScore: string, isConnected: boolean) => {
    if (!isConnected) return <XCircle className='w-3 h-3 text-red-500' />;
    
    switch (healthScore) {
      case 'good':
        return <CheckCircle className='w-3 h-3 text-green-500' />;
      case 'warning':
        return <AlertTriangle className='w-3 h-3 text-yellow-500' />;
      case 'critical':
        return <XCircle className='w-3 h-3 text-red-500' />;
      default:
        return <Circle className='w-3 h-3 text-gray-400' />;
    }
  };

  // 格式化数值
  const formatValue = (value: number, unit: string = '') => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M${unit}`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K${unit}`;
    }
    return `${value}${unit}`;
  };

  // 渲染紧凑的数据源列表
  const renderCompactDataSources = () => (
    <div className='space-y-1'>
      {metricsData.map(metrics => {
        const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
        const isSelected = selectedDataSource === datasourceKey;
        
        return (
          <TooltipProvider key={datasourceKey}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`p-2 rounded cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedDataSource(datasourceKey);
                    getSelectedDataSourceDetails(datasourceKey);
                  }}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2 min-w-0 flex-1'>
                      {getHealthIcon(metrics.healthScore, metrics.isConnected)}
                      <div className='min-w-0 flex-1'>
                        <div className='text-xs font-medium truncate'>
                          {metrics.connectionName}
                        </div>
                        <div className='text-xs text-muted-foreground truncate'>
                          {metrics.databaseName}
                        </div>
                      </div>
                    </div>
                    <div className='text-xs text-muted-foreground'>
                      {metrics.connectionLatency >= 0 ? `${metrics.connectionLatency}ms` : 'N/A'}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side='right' className='max-w-xs'>
                <div className='space-y-1'>
                  <div className='font-medium'>{metrics.connectionName}</div>
                  <div className='text-xs'>{metrics.databaseName} • {metrics.dbType}</div>
                  <Separator className='my-1' />
                  <div className='grid grid-cols-2 gap-2 text-xs'>
                    <div>延迟: {metrics.connectionLatency >= 0 ? `${metrics.connectionLatency}ms` : 'N/A'}</div>
                    <div>表数: {metrics.tableCount}</div>
                    <div>大小: {(metrics.databaseSize / 1024 / 1024).toFixed(1)}MB</div>
                    <div>记录: {formatValue(metrics.recordCount)}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );

  // 渲染详细的数据源列表
  const renderDetailedDataSources = () => (
    <div className='space-y-2'>
      {metricsData.map(metrics => {
        const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
        const isSelected = selectedDataSource === datasourceKey;
        
        return (
          <div
            key={datasourceKey}
            className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'hover:bg-muted/30 hover:border-muted-foreground/20'
            }`}
            onClick={() => {
              setSelectedDataSource(datasourceKey);
              getSelectedDataSourceDetails(datasourceKey);
            }}
          >
            <div className='flex items-start justify-between mb-2'>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  {getHealthIcon(metrics.healthScore, metrics.isConnected)}
                  <div className='font-medium text-sm truncate'>
                    {metrics.connectionName}
                  </div>
                </div>
                <div className='text-xs text-muted-foreground mt-1'>
                  {metrics.databaseName} • {metrics.dbType}
                </div>
              </div>
            </div>
            
            <div className='grid grid-cols-2 gap-2 text-xs'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>延迟:</span>
                <span className={metrics.connectionLatency > 500 ? 'text-red-500' : 'text-green-600'}>
                  {metrics.connectionLatency >= 0 ? `${metrics.connectionLatency}ms` : 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>表数:</span>
                <span>{metrics.tableCount}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>大小:</span>
                <span>{(metrics.databaseSize / 1024 / 1024).toFixed(1)}MB</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>记录:</span>
                <span>{formatValue(metrics.recordCount)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // 渲染监控配置
  const renderMonitoringConfig = () => (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label htmlFor='auto-refresh' className='text-sm font-medium'>
          自动刷新
        </Label>
        <Switch
          id='auto-refresh'
          checked={config.autoRefresh}
          onCheckedChange={checked => updateConfig({ autoRefresh: checked })}
        />
      </div>

      {config.autoRefresh && (
        <div className='space-y-2'>
          <Label className='text-xs text-muted-foreground'>刷新间隔</Label>
          <Select
            value={config.refreshInterval.toString()}
            onValueChange={value =>
              updateConfig({ refreshInterval: parseInt(value) })
            }
          >
            <SelectTrigger className='h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='10'>10秒</SelectItem>
              <SelectItem value='30'>30秒</SelectItem>
              <SelectItem value='60'>1分钟</SelectItem>
              <SelectItem value='300'>5分钟</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className='space-y-2'>
        <Label className='text-xs text-muted-foreground'>时间范围</Label>
        <Select
          value={config.timeRange}
          onValueChange={value => updateConfig({ timeRange: value })}
        >
          <SelectTrigger className='h-8'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1h'>1小时</SelectItem>
            <SelectItem value='6h'>6小时</SelectItem>
            <SelectItem value='24h'>24小时</SelectItem>
            <SelectItem value='7d'>7天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={fetchPerformanceData}
        disabled={loading}
        size='sm'
        variant='outline'
        className='w-full'
      >
        <RefreshCw
          className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
        />
        手动刷新
      </Button>
    </div>
  );

  // 渲染选中数据源的详细信息
  const renderSelectedDataSourceDetails = () => {
    if (!selectedDataSource) {
      return (
        <div className='text-center py-8 text-muted-foreground'>
          <Activity className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>选择数据源查看详情</p>
        </div>
      );
    }

    const selectedMetrics = metricsData.find(
      m => `${m.connectionId}/${m.databaseName}` === selectedDataSource
    );

    if (!selectedMetrics) {
      return (
        <div className='text-center py-8 text-muted-foreground'>
          <AlertTriangle className='w-8 h-8 mx-auto mb-2 opacity-50' />
          <p className='text-sm'>数据源信息不可用</p>
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        {/* 基本信息 */}
        <div className='p-3 bg-muted/30 rounded-lg'>
          <div className='flex items-center gap-2 mb-2'>
            {getHealthIcon(selectedMetrics.healthScore, selectedMetrics.isConnected)}
            <div className='min-w-0 flex-1'>
              <div className='font-medium text-sm truncate'>
                {selectedMetrics.connectionName}
              </div>
              <div className='text-xs text-muted-foreground truncate'>
                {selectedMetrics.databaseName} • {selectedMetrics.dbType}
              </div>
            </div>
          </div>
        </div>

        {/* 关键指标 */}
        <div className='grid grid-cols-2 gap-2'>
          <div className='p-2 border rounded text-center'>
            <Network className='w-4 h-4 mx-auto mb-1 text-blue-500' />
            <div className='text-xs text-muted-foreground'>延迟</div>
            <div className='text-sm font-bold'>
              {selectedMetrics.connectionLatency >= 0 ? `${selectedMetrics.connectionLatency}ms` : 'N/A'}
            </div>
          </div>
          
          <div className='p-2 border rounded text-center'>
            <Database className='w-4 h-4 mx-auto mb-1 text-green-500' />
            <div className='text-xs text-muted-foreground'>表数</div>
            <div className='text-sm font-bold'>{selectedMetrics.tableCount}</div>
          </div>
          
          <div className='p-2 border rounded text-center'>
            <HardDrive className='w-4 h-4 mx-auto mb-1 text-orange-500' />
            <div className='text-xs text-muted-foreground'>大小</div>
            <div className='text-sm font-bold'>
              {(selectedMetrics.databaseSize / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>
          
          <div className='p-2 border rounded text-center'>
            <TrendingUp className='w-4 h-4 mx-auto mb-1 text-purple-500' />
            <div className='text-xs text-muted-foreground'>活跃查询</div>
            <div className='text-sm font-bold'>{selectedMetrics.activeQueries}</div>
          </div>
        </div>

        {/* 性能统计 */}
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>平均查询时间:</span>
            <span className='font-medium'>{selectedMetrics.averageQueryTime.toFixed(0)}ms</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>失败查询:</span>
            <span className='font-medium'>{selectedMetrics.failedQueriesCount}</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>今日查询:</span>
            <span className='font-medium'>{formatValue(selectedMetrics.totalQueriesToday)}</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>记录数:</span>
            <span className='font-medium'>{formatValue(selectedMetrics.recordCount)}</span>
          </div>
        </div>

        {/* 优化建议 */}
        {selectedMetrics.recommendations.length > 0 && (
          <div className='p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <AlertTriangle className='w-4 h-4 text-yellow-600' />
              <span className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>优化建议</span>
            </div>
            <ul className='space-y-1'>
              {selectedMetrics.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className='text-xs text-yellow-700 dark:text-yellow-300'>
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className={`h-full flex flex-col ${className}`}>
        {/* 头部 */}
        <div className='p-3 border-b bg-muted/30'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-sm font-semibold flex items-center gap-2'>
              <Activity className='w-4 h-4' />
              性能监控
            </h2>
            <div className='flex items-center gap-1'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => setCompactMode(!compactMode)}
                    className='h-6 w-6 p-0'
                  >
                    <Eye className='w-3 h-3' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {compactMode ? '详细视图' : '紧凑视图'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <div className='flex flex-wrap gap-1 text-xs'>
            <Badge variant='outline' className='text-xs'>
              {metricsData.length} 个数据源
            </Badge>
            <Badge variant='outline' className='text-xs'>
              {metricsData.filter(m => m.isConnected).length} 个已连接
            </Badge>
            {config.autoRefresh && (
              <Badge variant='default' className='text-xs'>
                <RefreshCw className='w-2 h-2 mr-1' />
                自动刷新
              </Badge>
            )}
          </div>
        </div>

        {/* 主要内容 */}
        <ScrollArea className='flex-1'>
          <div className='p-3 space-y-4'>
            {/* 数据源列表 */}
            <div>
              <div
                className='flex items-center justify-between cursor-pointer p-2 hover:bg-muted/50 rounded'
                onClick={() => toggleSection('datasources')}
              >
                <div className='flex items-center gap-2'>
                  {expandedSections.has('datasources') ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                  <Database className='w-4 h-4' />
                  <span className='text-sm font-medium'>数据源</span>
                </div>
                <Badge variant='secondary' className='text-xs'>
                  {metricsData.length}
                </Badge>
              </div>
              
              {expandedSections.has('datasources') && (
                <div className='mt-2 pl-6'>
                  {metricsData.length === 0 ? (
                    <div className='text-center py-4 text-muted-foreground'>
                      <Database className='w-6 h-6 mx-auto mb-1 opacity-50' />
                      <p className='text-xs'>暂无数据源</p>
                    </div>
                  ) : compactMode ? (
                    renderCompactDataSources()
                  ) : (
                    renderDetailedDataSources()
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* 详细指标 */}
            <div>
              <div
                className='flex items-center justify-between cursor-pointer p-2 hover:bg-muted/50 rounded'
                onClick={() => toggleSection('metrics')}
              >
                <div className='flex items-center gap-2'>
                  {expandedSections.has('metrics') ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                  <TrendingUp className='w-4 h-4' />
                  <span className='text-sm font-medium'>详细指标</span>
                </div>
              </div>
              
              {expandedSections.has('metrics') && (
                <div className='mt-2 pl-6'>
                  {renderSelectedDataSourceDetails()}
                </div>
              )}
            </div>

            <Separator />

            {/* 监控配置 */}
            <div>
              <div
                className='flex items-center justify-between cursor-pointer p-2 hover:bg-muted/50 rounded'
                onClick={() => toggleSection('config')}
              >
                <div className='flex items-center gap-2'>
                  {expandedSections.has('config') ? (
                    <ChevronDown className='w-4 h-4' />
                  ) : (
                    <ChevronRight className='w-4 h-4' />
                  )}
                  <Settings className='w-4 h-4' />
                  <span className='text-sm font-medium'>监控配置</span>
                </div>
              </div>
              
              {expandedSections.has('config') && (
                <div className='mt-2 pl-6'>
                  {renderMonitoringConfig()}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};

export default MultiSourcePerformanceMonitor;
