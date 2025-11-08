import React, { useState, useEffect, useCallback } from 'react';
import { generateUniqueId } from '@/utils/idGenerator';
import {
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { GlideDataTable } from '@/components/ui/glide-data-table';
import type { ColumnConfig, DataRow } from '@/components/ui/glide-data-table';
import { useGlobalDialog } from '@/components/providers/DialogProvider';
import {
  Trash2,
  Edit,
  Wifi,
  RefreshCw,
  Plus,
  CheckCircle,
} from 'lucide-react';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import ContextMenu from '@/components/common/ContextMenu';
import { getDatabaseBrandIcon } from '@/utils/iconLoader';
import { logger } from '@/utils/logger';
import { useTranslation } from '@/hooks/useTranslation';
import './ConnectionManager.css';

interface ConnectionManagerProps {
  onConnectionSelect?: (connectionId: string) => void;
  onEditConnection?: (connection: ConnectionConfig) => void;
  onCreateConnection?: () => void;
}

interface ConnectionWithStatus extends ConnectionConfig {
  status?: ConnectionStatus;
}

// interface ColumnType<T = any> {
//     title: string;
//     dataIndex?: string;
//     key: string;
//     width?: number | string;
//     render?: (value: any, record: T, index: number) => React.ReactNode;
//     ellipsis?: boolean;
// }

const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  onConnectionSelect,
  onEditConnection,
  onCreateConnection,
}) => {
  const dialog = useGlobalDialog();
  const { t } = useTranslation();
  const {
    connections,
    connectionStatuses,
    tableConnectionStatuses,
    activeConnectionId,
    monitoringActive,
    monitoringInterval,
    connectToDatabase,
    disconnectFromDatabase,
    testConnection,
    startMonitoring,
    stopMonitoring,
    refreshAllStatuses,
    refreshConnectionStatus,
    removeConnection,
    testAllConnections,
    getTableConnectionStatus,
    forceRefreshConnections,
  } = useConnectionStore();

  // 刷新状态按钮的加载状态
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });

  // const [loading, setLoading] = useState(false);
  const [connectionLoadingStates, setConnectionLoadingStates] = useState<
    Map<string, boolean>
  >(new Map());

  // 自动刷新状态 - 仅在用户手动启动监控时执行
  useEffect(() => {
    if (!monitoringActive) return;

    const interval = setInterval(() => {
      logger.debug('执行定时状态刷新...');
      refreshAllStatuses();
    }, monitoringInterval * 1000);

    return () => {
      logger.debug('🚫 清理定时刷新间隔');
      clearInterval(interval);
    };
  }, [monitoringActive, monitoringInterval]); // 移除refreshAllStatuses依赖

  // 初始加载 - 移除自动刷新，由用户手动触发
  // useEffect(() => {
  //   refreshAllStatuses();
  // }, []); // 禁用自动刷新以减少网络请求

  // 处理测试连接操作
  const handleTestConnection = useCallback(
    async (connectionId: string) => {
      // 设置单个连接的loading状态
      setConnectionLoadingStates(prev => new Map(prev).set(connectionId, true));

      try {
        // 首先确保连接配置存在
        const connection = connections.find(c => c.id === connectionId);
        if (!connection) {
          showMessage.error(t('connections.connection_config_not_exist'));
          return;
        }

        logger.debug(`🧪 测试连接: ${connection.name}`);
        const result = await testConnection(connectionId);
        
        if (result) {
          showMessage.success(t('connections.test_success') + `: ${connection.name}`);
        } else {
          showMessage.error(t('connections.test_failed') + `: ${connection.name}`);
        }
      } catch (error) {
        logger.error('测试连接失败:', error);
        const errorMessage = String(error).replace('Error: ', '');
        showMessage.error(t('connections.test_failed') + `: ${errorMessage}`);
      } finally {
        // 清除单个连接的loading状态
        setConnectionLoadingStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(connectionId);
          return newMap;
        });
      }
    },
    [connections, testConnection]
  );

  // 处理监控切换
  const handleMonitoringToggle = useCallback(async () => {
    try {
      if (monitoringActive) {
        await stopMonitoring();
        showMessage.success(t('connections.monitoring_stopped'));
      } else {
        await startMonitoring(30); // 30秒间隔监控
        showMessage.success(t('connections.monitoring_started'));
        // 立即执行一次状态刷新
        setTimeout(() => {
          refreshAllStatuses();
        }, 1000);
      }
    } catch (error) {
      showMessage.error(t('connections.monitoring_operation_failed', { interpolation: { error } }));
    }
  }, [monitoringActive, startMonitoring, stopMonitoring, refreshAllStatuses]);

  // 处理刷新所有连接状态 - 强制刷新连接列表
  const handleRefreshAllConnectionStatuses = useCallback(async () => {
    setIsRefreshingAll(true);
    logger.debug('开始强制刷新连接列表...');

    try {
      // 使用强制刷新方法重新加载所有连接
      await forceRefreshConnections();

      showMessage.success(t('connections.connection_list_refreshed'));
      logger.info('连接列表强制刷新完成');

    } catch (error) {
      logger.error('刷新连接列表失败:', error);
      showMessage.error(t('connections.refresh_connection_list_failed', { interpolation: { error } }));
    } finally {
      setIsRefreshingAll(false);
    }
  }, [connections, testAllConnections, tableConnectionStatuses]);


  // 获取状态标签
  const getStatusTag = (status?: ConnectionStatus) => {
    // 如果没有状态信息，显示默认的未测试状态
    const actualStatus = status || {
      id: '',
      status: 'disconnected' as const,
      error: undefined,
      lastConnected: undefined,
      latency: undefined,
    };

    const statusConfig = {
      connected: { variant: 'success', text: t('connections.connection_normal') },
      disconnected: { variant: 'secondary', text: t('connections.not_tested') },
      connecting: { variant: 'warning', text: t('connections.testing') },
      error: { variant: 'destructive', text: t('connections.connection_failed') },
    };

    const config =
      statusConfig[actualStatus.status] || statusConfig.disconnected;

    // 构建tooltip内容
    let tooltipContent = '';
    if (actualStatus.error) {
      tooltipContent = t('connections.connection_failed_error', { interpolation: { error: actualStatus.error } });
    } else if (actualStatus.latency && actualStatus.status === 'connected') {
      tooltipContent = t('connections.influxdb_connection_normal_latency', { interpolation: { latency: actualStatus.latency } });
    } else if (actualStatus.status === 'connecting') {
      tooltipContent = t('connections.testing_influxdb_connection');
    } else if (actualStatus.status === 'connected') {
      tooltipContent = t('connections.influxdb_connection_normal_ready');
    } else {
      tooltipContent = t('connections.not_tested_influxdb_connection');
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant as any} className='text-xs'>
            {config.text}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className='max-w-xs'>
            <p className='text-sm'>{tooltipContent}</p>
            {actualStatus.lastConnected && (
              <p className='text-xs text-muted-foreground mt-1'>
                {t('connections.last_tested')}:{' '}
                {new Date(actualStatus.lastConnected).toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  // 处理行右键菜单
  const handleRowContextMenu = (event: React.MouseEvent, record: ConnectionWithStatus) => {
    event.preventDefault();
    event.stopPropagation();

    const target = {
      type: 'connection_row',
      connection: record,
      connectionId: record.id,
      name: record.name,
      status: record.id ? connectionStatuses[record.id] : undefined,
    };

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      target,
    });
  };

  // 隐藏右键菜单
  const hideContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      target: null,
    });
  };

  // 处理右键菜单动作
  const handleContextMenuAction = async (action: string, params?: any) => {
    const { target } = contextMenu;
    if (!target || target.type !== 'connection_row') return;

    const connection = target.connection;

    try {
      switch (action) {
        case 'connect':
          await connectToDatabase(connection.id);
          showMessage.success(t('connections.connected_to', { interpolation: { name: connection.name } }));
          break;

        case 'disconnect':
          await disconnectFromDatabase(connection.id);
          showMessage.success(t('connections.disconnected_from', { interpolation: { name: connection.name } }));
          break;

        case 'test_connection':
          await testConnection(connection.id);
          showMessage.success(t('connections.connection_test_completed', { interpolation: { name: connection.name } }));
          break;

        case 'refresh_status':
          await refreshConnectionStatus(connection.id);
          showMessage.success(t('connections.status_refreshed', { interpolation: { name: connection.name } }));
          break;

        case 'edit_connection':
          if (onEditConnection) {
            onEditConnection(connection);
          }
          break;

        case 'duplicate_connection': {
          // 复制连接配置
          const duplicatedConnection = {
            ...connection,
            id: generateUniqueId(`${connection.id}_copy`),
            name: `${connection.name} (${t('connections.copy')})`,
          };
          showMessage.info(t('connections.connection_copy_in_development', { interpolation: { name: duplicatedConnection.name } }));
          break;
        }

        case 'copy_connection_string': {
          const connectionString = `${connection.host}:${connection.port}`;
          await writeToClipboard(connectionString, {
            successMessage: t('connections.connection_string_copied', { interpolation: { connectionString } }),
          });
          break;
        }

        case 'copy_connection_info': {
          const connectionInfo = JSON.stringify(connection, null, 2);
          await writeToClipboard(connectionInfo, {
            successMessage: t('connections.connection_info_copied'),
          });
          break;
        }


        case 'delete_connection': {
          const confirmed = await dialog.confirm(
            t('connections.delete_connection_confirm_irreversible', { interpolation: { name: connection.name } })
          );
          if (confirmed) {
            try {
              logger.debug('开始删除连接:', connection.id);

              // 先从后端删除
              await safeTauriInvoke('delete_connection', { connectionId: connection.id });
              logger.info('后端删除成功');

              // 从后端重新加载连接列表以确保状态同步
              await forceRefreshConnections();
              logger.info('从后端重新加载连接列表成功');

              showMessage.success(t('connections.connection_deleted', { interpolation: { name: connection.name } }));

            } catch (error) {
              logger.error('删除连接失败:', error);
              showMessage.error(t('connections.delete_connection_failed', { interpolation: { error } }));
            }
          }
          break;
        }

        default:
          logger.warn('未处理的右键菜单动作:', action);
          break;
      }
    } catch (error) {
      logger.error('执行右键菜单动作失败:', error);
      showMessage.error(t('connections.operation_failed', { interpolation: { error } }));
    }

    hideContextMenu();
  };

  // 表格列定义
  const columns: ColumnConfig[] = [
    {
      title: t('connections.connection_name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record: DataRow) => {
        const isLoading = connectionLoadingStates.get(record.id!);
        const status = tableConnectionStatuses[record.id!];

        // 确定状态点的颜色 - 使用CSS变量
        const getStatusColor = () => {
          if (!status) return 'bg-muted-foreground';

          switch (status.status) {
            case 'connected':
              // 只有在没有错误时才显示绿色
              return status.error ? 'bg-destructive' : 'bg-success';
            case 'error':
              return 'bg-destructive';
            case 'connecting':
              return 'bg-warning animate-pulse';
            default:
              return 'bg-muted-foreground';
          }
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='space-y-1'>
                {/* 连接名称和状态 */}
                <div className='flex items-center space-x-2'>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor()}`} />
                  <div className='font-medium text-foreground truncate flex items-center gap-1 flex-1'>
                    {name}
                    {isLoading && (
                      <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin' />
                    )}
                  </div>
                </div>

                {/* 连接地址 */}
                <div className='text-sm text-muted-foreground truncate'>
                  {record.host}:{record.port}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className='max-w-sm'>
              <div className='space-y-1 p-1'>
                {record.description && (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>{t('connections.description')}：</span>
                    <span className='text-foreground'>{record.description}</span>
                  </div>
                )}
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>{t('connections.address')}：</span>
                  <span className='text-foreground'>{record.host}:{record.port}</span>
                </div>
                {record.username && (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>{t('connections.user')}：</span>
                    <span className='text-foreground'>{record.username}</span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: t('connections.database_type'),
      dataIndex: 'dbType',
      key: 'dbType',
      width: 150,
      render: (_: any, record: DataRow) => {
        const dbName = record.dbType === 'influxdb' ? 'InfluxDB' : record.dbType || 'InfluxDB';
        const configVersion = record.version || '1.x';
        const status = tableConnectionStatuses[record.id!];
        const detectedVersion = status?.serverVersion;

        // 优先显示检测到的版本，否则显示配置的版本
        const displayVersion = detectedVersion || configVersion;
        const isDetected = !!detectedVersion;

        // 获取品牌图标
        const getBrandIcon = () => {
          if (record.dbType === 'influxdb') {
            switch (displayVersion) {
              case '1.x':
                return getDatabaseBrandIcon('InfluxDB');
              case '2.x':
                return getDatabaseBrandIcon('InfluxDB2');
              case '3.x':
                return getDatabaseBrandIcon('InfluxDB3');
              default:
                return getDatabaseBrandIcon('InfluxDB');
            }
          }
          return getDatabaseBrandIcon('IoTDB');
        };

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='relative inline-flex items-center gap-2'>
                <img
                  src={getBrandIcon()}
                  alt={`${dbName} icon`}
                  className="w-4 h-4"
                />
                <div className='inline-flex items-baseline'>
                  <span className='font-medium text-foreground'>{dbName}</span>
                  {displayVersion && (
                    <sup className={`ml-1 text-xs px-1.5 py-0.5 rounded-md font-medium ${
                      isDetected
                        ? 'text-green-700 bg-green-100 border border-green-200'
                        : 'text-blue-700 bg-blue-100 border border-blue-200'
                    }`}>
                      {displayVersion}
                    </sup>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start">
              <div className='space-y-1 p-1'>
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>{t('connections.database')}：</span>
                  <span className='text-foreground'>{dbName}</span>
                </div>
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>{t('connections.configured_version')}：</span>
                  <span className='text-foreground'>{configVersion}</span>
                </div>
                {detectedVersion && (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>{t('connections.detected_version')}：</span>
                    <span className='text-success'>{detectedVersion}</span>
                  </div>
                )}
                {!detectedVersion && (
                  <div className='text-xs text-muted-foreground'>
                    {t('connections.test_connection_to_detect_version')}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: t('connections.database_info'),
      dataIndex: 'databaseInfo',
      key: 'databaseInfo',
      width: 200,
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        const isConnected = status?.status === 'connected';

        // 根据版本显示不同的数据库信息
        const primaryInfo = record.version === '1.x'
          ? (record.database || t('connections.default_database'))
          : (record.v2Config?.bucket || t('connections.not_configured'));

        const secondaryInfo = record.version === '1.x'
          ? record.retentionPolicy
          : record.v2Config?.organization;

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='space-y-1'>
                <div className='text-sm font-medium text-foreground truncate'>
                  {primaryInfo}
                </div>
                {secondaryInfo && (
                  <div className='text-xs text-muted-foreground truncate'>
                    {record.version === '1.x' ? `${t('connections.policy')}: ${secondaryInfo}` : `${t('connections.organization')}: ${secondaryInfo}`}
                  </div>
                )}
                {record.v2Config?.v1CompatibilityApi && (
                  <div className='flex items-center gap-1'>
                    <span className='text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded'>{t('connections.v1_compatibility')}</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className='max-w-sm'>
              <div className='space-y-1 p-1'>
                {record.version === '1.x' ? (
                  <>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>{t('connections.database')}：</span>
                      <span className='text-foreground'>{record.database || t('connections.default')}</span>
                    </div>
                    {record.retentionPolicy && (
                      <div className='text-sm'>
                        <span className='text-muted-foreground font-medium'>{t('connections.retention_policy')}：</span>
                        <span className='text-foreground'>{record.retentionPolicy}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>{t('connections.bucket')}：</span>
                      <span className='text-foreground'>{record.v2Config?.bucket || t('connections.not_configured')}</span>
                    </div>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>{t('connections.organization')}：</span>
                      <span className='text-foreground'>{record.v2Config?.organization || t('connections.not_configured')}</span>
                    </div>
                    {record.v2Config?.v1CompatibilityApi && (
                      <div className='text-sm'>
                        <span className='text-blue-600'>{t('connections.enable_v1_compatibility_api')}</span>
                      </div>
                    )}
                  </>
                )}
                {isConnected && status?.serverVersion && (
                  <div className='text-sm border-t pt-1 mt-1'>
                    <span className='text-muted-foreground font-medium'>{t('connections.server_version')}：</span>
                    <span className='text-success'>{status.serverVersion}</span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: t('connections.auth_info'),
      dataIndex: 'authInfo',
      key: 'authInfo',
      width: 180,
      render: (_: any, record: DataRow) => {
        const authInfo = record.version === '1.x'
          ? (record.username || t('connections.no_auth'))
          : t('connections.token_auth');

        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='space-y-1'>
                <div className='text-sm font-medium text-foreground truncate'>
                  {authInfo}
                </div>
                <div className='flex items-center gap-1'>
                  {record.ssl && (
                    <span className='text-xs text-green-600 bg-green-50 px-1 py-0.5 rounded'>SSL</span>
                  )}
                  {record.timeout && record.timeout !== 30 && (
                    <span className='text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded'>
                      {record.timeout}s
                    </span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className='max-w-sm'>
              <div className='space-y-1 p-1'>
                {record.version === '1.x' ? (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>{t('connections.username')}：</span>
                    <span className='text-foreground'>{record.username || t('connections.no_auth')}</span>
                  </div>
                ) : (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>{t('connections.auth_method')}：</span>
                    <span className='text-foreground'>{t('connections.api_token')}</span>
                  </div>
                )}
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>{t('connections.ssl')}：</span>
                  <span className={record.ssl ? 'text-success' : 'text-muted-foreground'}>
                    {record.ssl ? t('connections.enabled') : t('connections.disabled')}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>{t('connections.timeout')}：</span>
                  <span className='text-foreground'>{t('connections.timeout_seconds', { interpolation: { timeout: record.timeout || 30 } })}</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: t('connections.status'),
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (_: any, record: DataRow) => {
        const status = tableConnectionStatuses[record.id!];
        const isActive = activeConnectionId === record.id;

        return (
          <div className='flex flex-col items-start gap-1.5'>
            <div className='flex items-center gap-2'>
              {getStatusTag(status)}
              {isActive && (
                <Badge variant='default' className='text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 border-blue-200'>
                  {t('connections.active')}
                </Badge>
              )}
            </div>
            {status?.latency && (
              <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                <div className='w-1 h-1 bg-muted-foreground/30 rounded-full'></div>
                <span className='font-mono'>{status.latency}ms</span>
              </div>
            )}
          </div>
        );
      },
    },

    {
      title: t('connections.actions'),
      dataIndex: 'actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: DataRow) => {
        const status = tableConnectionStatuses[record.id!];
        const isLoading = connectionLoadingStates.get(record.id!);
        const isTestSuccessful = status?.status === 'connected' && status?.error === undefined;

        return (
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isTestSuccessful ? 'secondary' : 'default'}
                  size='sm'
                  disabled={isLoading}
                  onClick={() => handleTestConnection(record.id!)}
                  className='px-2'
                >
                  {isLoading ? (
                    <RefreshCw className='w-4 h-4 animate-spin' />
                  ) : isTestSuccessful ? (
                    <CheckCircle className='w-4 h-4' />
                  ) : (
                    <Wifi className='w-4 h-4' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLoading ? t('connections.testing_connection') : t('connections.test_connection')}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isLoading}
                  onClick={() => {
                    logger.debug('编辑连接:', record);
                    // 将 DataRow 转换为 ConnectionConfig
                    const connection = record as any as ConnectionConfig;
                    onEditConnection?.(connection);
                  }}
                  className='px-2'
                >
                  <Edit className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('connections.edit_connection')}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isLoading}
                  onClick={async () => {
                    const confirmed = await dialog.confirm(
                      t('connections.delete_connection_confirm', { interpolation: { name: record.name } })
                    );
                    if (confirmed) {
                      try {
                        logger.debug('开始删除连接:', record.id);

                        // 先从后端删除
                        await safeTauriInvoke('delete_connection', { connectionId: record.id });
                        logger.info('后端删除成功');

                        // 从后端重新加载连接列表以确保状态同步
                        await forceRefreshConnections();
                        logger.info('从后端重新加载连接列表成功');

                        showMessage.success(t('connections.connection_deleted', { interpolation: { name: record.name } }));

                      } catch (error) {
                        logger.error('删除连接失败:', error);
                        showMessage.error(t('connections.delete_connection_failed', { interpolation: { error } }));
                      }
                    }
                  }}
                  className='px-2'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('connections.delete_connection')}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  // 合并连接数据和状态
  const dataSource: ConnectionWithStatus[] = connections.map(conn => ({
    ...conn,
    // 确保 dbType 字段存在，如果不存在则设置默认值
    dbType: conn.dbType || 'influxdb',
    status: tableConnectionStatuses[conn.id!],
  }));

  return (
    <div className='h-full flex flex-col'>
      {/* 页面头部 - 标题和操作按钮在同一行 */}
      <div className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='px-6 py-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-semibold tracking-tight'></h1>
            <div className='flex items-center gap-3'>
              <Button
                variant='outline'
                onClick={handleRefreshAllConnectionStatuses}
                disabled={isRefreshingAll}
                size='sm'
                className='h-9'
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                {isRefreshingAll ? t('connections.testing_connection') : t('connections.refresh_status')}
              </Button>
              <Button
                variant='default'
                onClick={() => onCreateConnection?.()}
                size='sm'
                className='h-9'
              >
                <Plus className='w-4 h-4 mr-2' />
                {t('connections.create_connection')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 连接表格 */}
      <div className='flex-1 overflow-hidden px-6 py-6'>
        <div className='h-full rounded-lg border overflow-hidden bg-background'>
          <GlideDataTable
            columns={columns}
            data={dataSource}
            loading={false}
            className='w-full h-full connection-table'
            showToolbar={false}
            searchable={false}
            filterable={false}
            sortable={false}
            exportable={false}
            columnManagement={false}
          />
        </div>
      </div>


      {/* 右键菜单 */}
      <ContextMenu
        open={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        target={contextMenu.target}
        onClose={hideContextMenu}
        onAction={handleContextMenuAction}
      />
    </div>
  );
};

export default ConnectionManager;
