import React, { useState, useEffect, useCallback } from 'react';
import { generateUniqueId } from '@/utils/idGenerator';
import {
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui';
import { GlideDataTable } from '@/components/ui/GlideDataTable';
import type { ColumnConfig, DataRow } from '@/components/ui/GlideDataTable';
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
      console.log('🔄 执行定时状态刷新...');
      refreshAllStatuses();
    }, monitoringInterval * 1000);

    return () => {
      console.log('🚫 清理定时刷新间隔');
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
          showMessage.error('连接配置不存在，请重新加载页面');
          return;
        }

        console.log(`🧪 测试连接: ${connection.name}`);
        const result = await testConnection(connectionId);
        
        if (result) {
          showMessage.success(`连接测试成功: ${connection.name}`);
        } else {
          showMessage.error(`连接测试失败: ${connection.name}`);
        }
      } catch (error) {
        console.error('测试连接失败:', error);
        const errorMessage = String(error).replace('Error: ', '');
        showMessage.error(`测试连接失败: ${errorMessage}`);
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
        showMessage.success('🛑 连接监控已停止');
      } else {
        await startMonitoring(30); // 30秒间隔监控
        showMessage.success('🟢 连接监控已启动，每30秒检查一次连接状态');
        // 立即执行一次状态刷新
        setTimeout(() => {
          refreshAllStatuses();
        }, 1000);
      }
    } catch (error) {
      showMessage.error(`监控操作失败: ${error}`);
    }
  }, [monitoringActive, startMonitoring, stopMonitoring, refreshAllStatuses]);

  // 处理刷新所有连接状态 - 强制刷新连接列表
  const handleRefreshAllConnectionStatuses = useCallback(async () => {
    setIsRefreshingAll(true);
    console.log('🔄 开始强制刷新连接列表...');

    try {
      // 使用强制刷新方法重新加载所有连接
      await forceRefreshConnections();

      showMessage.success('连接列表已刷新');
      console.log('✅ 连接列表强制刷新完成');

    } catch (error) {
      console.error('❌ 刷新连接列表失败:', error);
      showMessage.error(`刷新连接列表失败: ${error}`);
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
      connected: { variant: 'success', text: '连接正常' },
      disconnected: { variant: 'secondary', text: '未测试' },
      connecting: { variant: 'warning', text: '测试中' },
      error: { variant: 'destructive', text: '连接失败' },
    };

    const config =
      statusConfig[actualStatus.status] || statusConfig.disconnected;

    // 构建tooltip内容
    let tooltipContent = '';
    if (actualStatus.error) {
      tooltipContent = `连接失败: ${actualStatus.error}`;
    } else if (actualStatus.latency && actualStatus.status === 'connected') {
      tooltipContent = `InfluxDB连接正常，延迟: ${actualStatus.latency}ms`;
    } else if (actualStatus.status === 'connecting') {
      tooltipContent = '正在测试InfluxDB连接...';
    } else if (actualStatus.status === 'connected') {
      tooltipContent = 'InfluxDB连接正常，可以正常使用';
    } else {
      tooltipContent = '尚未测试InfluxDB连接状态';
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
                最后测试:{' '}
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
          showMessage.success(`已连接到 ${connection.name}`);
          break;

        case 'disconnect':
          await disconnectFromDatabase(connection.id);
          showMessage.success(`已断开 ${connection.name}`);
          break;

        case 'test_connection':
          await testConnection(connection.id);
          showMessage.success(`连接测试完成: ${connection.name}`);
          break;

        case 'refresh_status':
          await refreshConnectionStatus(connection.id);
          showMessage.success(`状态已刷新: ${connection.name}`);
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
            name: `${connection.name} (副本)`,
          };
          showMessage.info(`连接复制功能开发中: ${duplicatedConnection.name}`);
          break;
        }

        case 'copy_connection_string': {
          const connectionString = `${connection.host}:${connection.port}`;
          await writeToClipboard(connectionString, {
            successMessage: `已复制连接字符串: ${connectionString}`,
          });
          break;
        }

        case 'copy_connection_info': {
          const connectionInfo = JSON.stringify(connection, null, 2);
          await writeToClipboard(connectionInfo, {
            successMessage: '已复制连接信息到剪贴板',
          });
          break;
        }


        case 'delete_connection': {
          const confirmed = await dialog.confirm(
            `确定要删除连接 "${connection.name}" 吗？此操作不可撤销。`
          );
          if (confirmed) {
            try {
              console.log('🗑️ 开始删除连接:', connection.id);

              // 先从后端删除
              await safeTauriInvoke('delete_connection', { connectionId: connection.id });
              console.log('✅ 后端删除成功');

              // 再从前端状态删除
              removeConnection(connection.id);
              console.log('✅ 前端状态删除成功');

              showMessage.success(`连接 ${connection.name} 已删除`);

              // 延迟刷新以确保状态同步
              setTimeout(() => {
                forceRefreshConnections();
              }, 100);

            } catch (error) {
              console.error('❌ 删除连接失败:', error);
              showMessage.error(`删除连接失败: ${error}`);
            }
          }
          break;
        }

        default:
          console.warn('未处理的右键菜单动作:', action);
          break;
      }
    } catch (error) {
      console.error('执行右键菜单动作失败:', error);
      showMessage.error(`操作失败: ${error}`);
    }

    hideContextMenu();
  };

  // 表格列定义
  const columns: ColumnConfig[] = [
    {
      title: '连接名称',
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
                    <span className='text-muted-foreground font-medium'>描述：</span>
                    <span className='text-foreground'>{record.description}</span>
                  </div>
                )}
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>地址：</span>
                  <span className='text-foreground'>{record.host}:{record.port}</span>
                </div>
                {record.username && (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>用户：</span>
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
      title: '数据库类型',
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
                  <span className='text-muted-foreground font-medium'>数据库：</span>
                  <span className='text-foreground'>{dbName}</span>
                </div>
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>配置版本：</span>
                  <span className='text-foreground'>{configVersion}</span>
                </div>
                {detectedVersion && (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>检测版本：</span>
                    <span className='text-success'>{detectedVersion}</span>
                  </div>
                )}
                {!detectedVersion && (
                  <div className='text-xs text-muted-foreground'>
                    测试连接后可检测实际版本
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: '数据库信息',
      dataIndex: 'databaseInfo',
      key: 'databaseInfo',
      width: 200,
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        const isConnected = status?.status === 'connected';

        // 根据版本显示不同的数据库信息
        const primaryInfo = record.version === '1.x'
          ? (record.database || '默认数据库')
          : (record.v2Config?.bucket || '未配置桶');

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
                    {record.version === '1.x' ? `策略: ${secondaryInfo}` : `组织: ${secondaryInfo}`}
                  </div>
                )}
                {record.v2Config?.v1CompatibilityApi && (
                  <div className='flex items-center gap-1'>
                    <span className='text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded'>V1兼容</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="start" className='max-w-sm'>
              <div className='space-y-1 p-1'>
                {record.version === '1.x' ? (
                  <>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>数据库：</span>
                      <span className='text-foreground'>{record.database || '默认'}</span>
                    </div>
                    {record.retentionPolicy && (
                      <div className='text-sm'>
                        <span className='text-muted-foreground font-medium'>保留策略：</span>
                        <span className='text-foreground'>{record.retentionPolicy}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>桶：</span>
                      <span className='text-foreground'>{record.v2Config?.bucket || '未配置'}</span>
                    </div>
                    <div className='text-sm'>
                      <span className='text-muted-foreground font-medium'>组织：</span>
                      <span className='text-foreground'>{record.v2Config?.organization || '未配置'}</span>
                    </div>
                    {record.v2Config?.v1CompatibilityApi && (
                      <div className='text-sm'>
                        <span className='text-blue-600'>启用 V1 兼容 API</span>
                      </div>
                    )}
                  </>
                )}
                {isConnected && status?.serverVersion && (
                  <div className='text-sm border-t pt-1 mt-1'>
                    <span className='text-muted-foreground font-medium'>服务器版本：</span>
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
      title: '认证信息',
      dataIndex: 'authInfo',
      key: 'authInfo',
      width: 180,
      render: (_: any, record: DataRow) => {
        const authInfo = record.version === '1.x'
          ? (record.username || '无认证')
          : '令牌认证';

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
                    <span className='text-muted-foreground font-medium'>用户名：</span>
                    <span className='text-foreground'>{record.username || '无'}</span>
                  </div>
                ) : (
                  <div className='text-sm'>
                    <span className='text-muted-foreground font-medium'>认证方式：</span>
                    <span className='text-foreground'>API Token</span>
                  </div>
                )}
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>SSL：</span>
                  <span className={record.ssl ? 'text-success' : 'text-muted-foreground'}>
                    {record.ssl ? '已启用' : '未启用'}
                  </span>
                </div>
                <div className='text-sm'>
                  <span className='text-muted-foreground font-medium'>超时：</span>
                  <span className='text-foreground'>{record.timeout || 30}秒</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      title: '状态',
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
                  活跃
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
      title: '操作',
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
                {isLoading ? '测试中...' : '测试连接'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={isLoading}
                  onClick={() => {
                    console.log('编辑连接:', record);
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
                编辑连接
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
                      `确定要删除连接 "${record.name}" 吗？此操作无法撤销。`
                    );
                    if (confirmed) {
                      try {
                        console.log('🗑️ 开始删除连接:', record.id);

                        // 先从后端删除
                        await safeTauriInvoke('delete_connection', { connectionId: record.id });
                        console.log('✅ 后端删除成功');

                        // 再从前端状态删除
                        removeConnection(record.id!);
                        console.log('✅ 前端状态删除成功');

                        showMessage.success(`连接 ${record.name} 已删除`);

                        // 延迟刷新以确保状态同步
                        setTimeout(() => {
                          forceRefreshConnections();
                        }, 100);

                      } catch (error) {
                        console.error('❌ 删除连接失败:', error);
                        showMessage.error(`删除连接失败: ${error}`);
                      }
                    }
                  }}
                  className='px-2'
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                删除连接
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
                {isRefreshingAll ? '测试中...' : '刷新状态'}
              </Button>
              <Button
                variant='default'
                onClick={() => onCreateConnection?.()}
                size='sm'
                className='h-9'
              >
                <Plus className='w-4 h-4 mr-2' />
                新建连接
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
            showRowNumbers={false}
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
