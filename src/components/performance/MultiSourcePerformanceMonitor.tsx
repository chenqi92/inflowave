import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Button,
  ScrollArea,
  Switch,
} from '@/components/ui';
import {
  Activity,
  RefreshCw,
  Database,
  Zap,
  ChevronDown,
  ChevronUp,
  Signal,
  Clock,
  HardDrive,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import logger from '@/utils/logger';

// 性能指标类型
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
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
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

  // 检测容器宽度
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 响应式断点
  const isMobile = containerWidth > 0 && containerWidth < 500;
  const isTablet = containerWidth > 0 && containerWidth < 800;

  // 获取性能数据
  const fetchPerformanceData = useCallback(async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      logger.error('获取性能数据失败:', error);
      showMessage.error(`获取性能数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [openedDatabases]);

  // 获取配置
  const fetchConfig = useCallback(async () => {
    try {
      const result = await safeTauriInvoke<PerformanceMonitoringConfig>(
        'get_performance_monitoring_config'
      );
      setConfig(result);
    } catch (error) {
      logger.error('获取配置失败:', error);
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
        logger.error('更新配置失败:', error);
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

  // 获取健康状态样式
  const getHealthStyle = (healthScore: string, isConnected: boolean) => {
    if (!isConnected) {
      return {
        dotColor: 'bg-red-500',
        ringColor: 'ring-red-200',
        bgGradient: 'from-red-50 to-red-100',
        textColor: 'text-red-700',
        borderColor: 'border-red-200'
      };
    }
    
    switch (healthScore) {
      case 'good':
        return {
          dotColor: 'bg-green-500',
          ringColor: 'ring-green-200',
          bgGradient: 'from-green-50 to-emerald-100',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'warning':
        return {
          dotColor: 'bg-yellow-500',
          ringColor: 'ring-yellow-200',
          bgGradient: 'from-yellow-50 to-amber-100',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      case 'critical':
        return {
          dotColor: 'bg-red-500',
          ringColor: 'ring-red-200',
          bgGradient: 'from-red-50 to-red-100',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      default:
        return {
          dotColor: 'bg-gray-400',
          ringColor: 'ring-gray-200',
          bgGradient: 'from-gray-50 to-gray-100',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
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

  // 格式化延迟显示
  const formatLatency = (latency: number) => {
    if (latency < 0) return '—';
    if (latency < 100) return `${latency}ms`;
    if (latency < 1000) return `${latency}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  // 渲染数据源卡片
  const renderDataSourceCard = (metrics: RealPerformanceMetrics) => {
    const datasourceKey = `${metrics.connectionId}/${metrics.databaseName}`;
    const isExpanded = expandedCard === datasourceKey;
    const healthStyle = getHealthStyle(metrics.healthScore, metrics.isConnected);

    return (
      <div
        key={datasourceKey}
        className={`relative overflow-hidden bg-gradient-to-br ${healthStyle.bgGradient} 
                   border ${healthStyle.borderColor} rounded-xl shadow-sm hover:shadow-md 
                   transition-all duration-300 ${isMobile ? 'mb-3' : 'mb-4'}`}
      >
        {/* 状态指示条 */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${healthStyle.dotColor}`} />
        
        {/* 主要内容 */}
        <div 
          className='p-4 cursor-pointer'
          onClick={() => setExpandedCard(isExpanded ? null : datasourceKey)}
        >
          {/* 头部信息 */}
          <div className='flex items-start justify-between mb-3'>
            <div className='flex items-start gap-3 min-w-0 flex-1'>
              {/* 状态指示器 */}
              <div className='flex-shrink-0 relative mt-1'>
                <div className={`w-3 h-3 rounded-full ${healthStyle.dotColor} 
                              ring-4 ${healthStyle.ringColor} animate-pulse`} />
              </div>
              
              {/* 基本信息 */}
              <div className='min-w-0 flex-1'>
                <h3 className={`font-semibold ${healthStyle.textColor} truncate 
                              ${isMobile ? 'text-sm' : 'text-base'}`}>
                  {metrics.connectionName}
                </h3>
                <p className={`text-xs ${healthStyle.textColor} opacity-70 truncate mt-0.5`}>
                  {metrics.databaseName} • {metrics.dbType}
                </p>
              </div>
            </div>

            {/* 延迟显示 */}
            <div className='flex-shrink-0 text-right'>
              <div className={`font-mono font-bold ${healthStyle.textColor} 
                            ${isMobile ? 'text-sm' : 'text-base'}`}>
                {formatLatency(metrics.connectionLatency)}
              </div>
              <div className={`text-xs ${healthStyle.textColor} opacity-60`}>
                延迟
              </div>
            </div>
          </div>

          {/* 快速指标 */}
          <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-3'} gap-3 mb-3`}>
            <div className='flex items-center gap-2'>
              <Database className={`${healthStyle.textColor} opacity-60 
                                  ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              <div>
                <div className={`font-bold ${healthStyle.textColor} 
                              ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {metrics.tableCount}
                </div>
                <div className={`text-xs ${healthStyle.textColor} opacity-60`}>表</div>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <HardDrive className={`${healthStyle.textColor} opacity-60 
                                   ${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} />
              <div>
                <div className={`font-bold ${healthStyle.textColor} 
                              ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {(metrics.databaseSize / 1024 / 1024).toFixed(1)}MB
                </div>
                <div className={`text-xs ${healthStyle.textColor} opacity-60`}>大小</div>
              </div>
            </div>

            {!isMobile && (
              <div className='flex items-center gap-2'>
                <Zap className={`${healthStyle.textColor} opacity-60 w-4 h-4`} />
                <div>
                  <div className={`font-bold ${healthStyle.textColor} text-sm`}>
                    {metrics.activeQueries}
                  </div>
                  <div className={`text-xs ${healthStyle.textColor} opacity-60`}>查询</div>
                </div>
              </div>
            )}
          </div>

          {/* 展开/收起指示器 */}
          <div className='flex justify-center'>
            {isExpanded ? (
              <ChevronUp className={`${healthStyle.textColor} opacity-40 
                                   ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            ) : (
              <ChevronDown className={`${healthStyle.textColor} opacity-40 
                                     ${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            )}
          </div>
        </div>

        {/* 展开的详细信息 */}
        {isExpanded && (
          <div className='border-t border-white/20 bg-white/10 backdrop-blur-sm'>
            <div className='p-4 space-y-4'>
              {/* 性能指标 */}
              <div>
                <h4 className={`font-medium ${healthStyle.textColor} mb-3 
                              ${isMobile ? 'text-sm' : 'text-base'}`}>
                  性能指标
                </h4>
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                  <div className='flex justify-between items-center p-2 rounded-lg bg-white/20'>
                    <span className={`text-sm ${healthStyle.textColor} opacity-70`}>
                      平均查询时间
                    </span>
                    <span className={`font-mono font-bold ${healthStyle.textColor}`}>
                      {metrics.averageQueryTime.toFixed(0)}ms
                    </span>
                  </div>
                  
                  <div className='flex justify-between items-center p-2 rounded-lg bg-white/20'>
                    <span className={`text-sm ${healthStyle.textColor} opacity-70`}>
                      今日查询
                    </span>
                    <span className={`font-mono font-bold ${healthStyle.textColor}`}>
                      {formatValue(metrics.totalQueriesToday)}
                    </span>
                  </div>
                  
                  <div className='flex justify-between items-center p-2 rounded-lg bg-white/20'>
                    <span className={`text-sm ${healthStyle.textColor} opacity-70`}>
                      记录总数
                    </span>
                    <span className={`font-mono font-bold ${healthStyle.textColor}`}>
                      {formatValue(metrics.recordCount)}
                    </span>
                  </div>
                  
                  <div className='flex justify-between items-center p-2 rounded-lg bg-white/20'>
                    <span className={`text-sm ${healthStyle.textColor} opacity-70`}>
                      失败查询
                    </span>
                    <span className={`font-mono font-bold ${healthStyle.textColor}`}>
                      {metrics.failedQueriesCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* 优化建议 */}
              {metrics.recommendations.length > 0 && (
                <div>
                  <h4 className={`font-medium ${healthStyle.textColor} mb-2 
                                ${isMobile ? 'text-sm' : 'text-base'}`}>
                    优化建议
                  </h4>
                  <div className='space-y-2'>
                    {metrics.recommendations.slice(0, isMobile ? 2 : 3).map((rec, index) => (
                      <div key={index} className='flex items-start gap-2 p-2 rounded-lg bg-white/10'>
                        <div className={`w-1.5 h-1.5 rounded-full ${healthStyle.dotColor} 
                                       mt-1.5 flex-shrink-0`} />
                        <span className={`text-sm ${healthStyle.textColor} opacity-80`}>
                          {rec}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`h-full flex flex-col ${className}`}>
      {/* 现代化头部 */}
      <div className='relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700'>
        <div className='absolute inset-0 bg-black/10' />
        <div className='relative p-4'>
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-white/20 rounded-lg backdrop-blur-sm'>
                <Activity className='w-5 h-5 text-white' />
              </div>
              <div>
                <h1 className='text-white font-bold text-lg'>性能监控</h1>
                <p className='text-white/70 text-sm'>实时数据源性能监控</p>
              </div>
            </div>
            
            <Button
              onClick={fetchPerformanceData}
              disabled={loading}
              size='sm'
              variant='secondary'
              className='bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm'
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '刷新中' : '刷新'}
            </Button>
          </div>

          {/* 统计信息 */}
          <div className={`flex gap-4 ${isMobile ? 'text-sm' : ''}`}>
            <div className='flex items-center gap-2 text-white/90'>
              <Database className='w-4 h-4' />
              <span>{metricsData.length} 个数据源</span>
            </div>
            <div className='flex items-center gap-2 text-white/90'>
              <Signal className='w-4 h-4' />
              <span>{metricsData.filter(m => m.isConnected).length} 个在线</span>
            </div>
            {config.autoRefresh && (
              <div className='flex items-center gap-2 text-white/90'>
                <Clock className='w-4 h-4' />
                <span>自动刷新</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className='flex-1 bg-gray-50 dark:bg-gray-900'>
        <ScrollArea className='h-full'>
          <div className='p-4'>
            {metricsData.length === 0 ? (
              <div className='text-center py-12'>
                <div className='w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-purple-100 
                              rounded-full flex items-center justify-center'>
                  <Database className='w-10 h-10 text-blue-600' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 dark:text-gray-100 mb-2'>
                  暂无数据源
                </h3>
                <p className='text-gray-500 dark:text-gray-400'>
                  请先打开一些数据库连接以查看性能监控信息
                </p>
              </div>
            ) : (
              <div className={`${isMobile ? 'space-y-3' : isTablet ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}`}>
                {metricsData.map(renderDataSourceCard)}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 底部控制栏 */}
      <div className='border-t bg-white dark:bg-gray-800 p-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              自动刷新
            </span>
            <Switch
              checked={config.autoRefresh}
              onCheckedChange={checked => updateConfig({ autoRefresh: checked })}
            />
          </div>
          
          {config.autoRefresh && (
            <div className='text-xs text-gray-500 dark:text-gray-400'>
              每 {config.refreshInterval} 秒
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSourcePerformanceMonitor;