import React, { useState, useEffect, useCallback } from 'react';
import {
  DataTable,
  Button,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Progress,
  Typography,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { useGlobalDialog } from '@/components/providers/DialogProvider';
import type { Column } from '@/components/ui/DataTable';
import {
  Trash2,
  Edit,
  Eye,
  Wifi,
  RefreshCw,
  Plus,
  CheckCircle,
} from 'lucide-react';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { useConnectionStore } from '@/store/connection';
// import {safeTauriInvoke} from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import { dialog } from '@/utils/dialog';
import ContextMenu from '@/components/common/ContextMenu';
import './ConnectionManager.css';

interface ConnectionManagerProps {
  onConnectionSelect?: (connectionId: string) => void;
  onEditConnection?: (connection: ConnectionConfig) => void;
  onCreateConnection?: () => void;
}

interface ConnectionWithStatus extends ConnectionConfig {
  status?: ConnectionStatus;
  poolStats?: any;
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
    poolStats,
    connectToDatabase,
    disconnectFromDatabase,
    testConnection,
    startMonitoring,
    stopMonitoring,
    refreshAllStatuses,
    refreshConnectionStatus,
    getPoolStats,
    removeConnection,
    testAllConnections,
    getTableConnectionStatus,
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
  const [poolStatsModalVisible, setPoolStatsModalVisible] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);

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

  // 处理刷新所有连接状态 - 自动测试所有连接
  const handleRefreshAllConnectionStatuses = useCallback(async () => {
    if (connections.length === 0) {
      showMessage.info('暂无连接需要测试');
      return;
    }

    setIsRefreshingAll(true);
    console.log('🔄 开始测试所有连接状态...');

    try {
      // 使用专门的测试所有连接方法
      await testAllConnections();

      // 等待状态更新完成后统计结果
      setTimeout(() => {
        const successCount = Object.values(tableConnectionStatuses).filter(
          status => status?.status === 'connected'
        ).length;
        const totalCount = connections.length;

        showMessage.success(
          `连接状态刷新完成：${successCount}/${totalCount} 个连接可用`
        );

        console.log(`✅ 连接状态测试完成: ${successCount}/${totalCount} 个连接可用`);
      }, 500);

    } catch (error) {
      console.error('❌ 刷新连接状态失败:', error);
      showMessage.error(`刷新连接状态失败: ${error}`);
    } finally {
      setIsRefreshingAll(false);
    }
  }, [connections, testAllConnections, tableConnectionStatuses]);

  // 查看连接池统计
  const handleViewPoolStats = useCallback(
    async (connectionId: string) => {
      try {
        await getPoolStats(connectionId);
        setSelectedConnectionId(connectionId);
        setPoolStatsModalVisible(true);
      } catch (error) {
        showMessage.error(`获取连接池统计失败: ${error}`);
      }
    },
    [getPoolStats]
  );

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
            id: `${connection.id}_copy_${Date.now()}`,
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

        case 'view_pool_stats':
          if (poolStats[connection.id]) {
            setSelectedConnectionId(connection.id);
            setPoolStatsModalVisible(true);
          } else {
            showMessage.info('暂无连接池统计信息');
          }
          break;

        case 'delete_connection': {
          const confirmed = await dialog.confirm(
            `确定要删除连接 "${connection.name}" 吗？此操作不可撤销。`
          );
          if (confirmed) {
            await removeConnection(connection.id);
            showMessage.success(`连接 ${connection.name} 已删除`);
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
  const columns: Column[] = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => {
        const isLoading = connectionLoadingStates.get(record.id!);
        const status = tableConnectionStatuses[record.id!];

        // 确定状态点的颜色
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
          <div className='flex items-center space-x-3'>
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <div className='min-w-0 flex-1'>
              <div className='font-medium text-foreground truncate flex items-center gap-2'>
                {name}
                {isLoading && (
                  <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin' />
                )}
              </div>
              <div className='text-sm text-muted-foreground truncate'>
                {record.host}:{record.port}
              </div>
            </div>
            {activeConnectionId === record.id && (
              <Badge variant='default' className='ml-2 flex-shrink-0'>
                活跃
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      title: '连接信息',
      dataIndex: 'connectionInfo',
      key: 'connectionInfo',
      render: (_, record) => (
        <div className='space-y-1'>
          <div className='text-sm'>
            <span className='text-muted-foreground'>用户：</span>
            <span className='text-foreground font-medium'>
              {record.username || '无'}
            </span>
          </div>
          <div className='text-sm'>
            <span className='text-muted-foreground'>SSL：</span>
            <span
              className={
                record.ssl
                  ? 'text-success font-medium'
                  : 'text-muted-foreground'
              }
            >
              {record.ssl ? '已启用' : '未启用'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        return (
          <div className='space-y-1'>
            {getStatusTag(status)}
            {status?.latency && (
              <div className='text-xs text-muted-foreground'>
                延迟: {status.latency}ms
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '连接池统计',
      dataIndex: 'poolStats',
      key: 'poolStats',
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        const isTestFailed = status?.status === 'error';
        const isTestSuccessful = status?.status === 'connected' && !status?.error;
        const stats = poolStats[record.id!];

        // 如果测试失败，显示失败信息
        if (isTestFailed) {
          return <span className='text-destructive text-sm'>连接失败，无法获取</span>;
        }

        // 如果未测试或测试中，显示相应状态
        if (!isTestSuccessful) {
          const statusText = status?.status === 'connecting' ? '测试中...' : '未测试';
          return <span className='text-muted-foreground text-sm'>{statusText}</span>;
        }

        // 测试成功但没有统计数据时，显示查看按钮
        if (!stats) {
          return (
            <Button
              variant='outline'
              size='sm'
              onClick={() => handleViewPoolStats(record.id!)}
            >
              <Eye className='w-3 h-3 mr-1' />
              查看统计
            </Button>
          );
        }
        
        return (
          <div className='space-y-1'>
            <div className='text-sm'>
              <span className='text-muted-foreground'>活跃/总数：</span>
              <span className='text-foreground font-medium'>
                {stats.active_connections}/{stats.total_connections}
              </span>
            </div>
            <div className='text-sm'>
              <span className='text-muted-foreground'>空闲：</span>
              <span className='text-foreground font-medium'>
                {stats.idle_connections}
              </span>
              <span className='text-muted-foreground ml-2'>最大：</span>
              <span className='text-foreground font-medium'>
                {stats.max_connections}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: '最后测试',
      dataIndex: 'lastTested',
      key: 'lastTested',
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        return status?.lastConnected ? (
          <div className='text-sm text-muted-foreground'>
            {new Date(status.lastConnected).toLocaleString()}
          </div>
        ) : (
          <span className='text-muted-foreground'>从未测试</span>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'actions',
      key: 'actions',
      render: (_, record) => {
        const status = tableConnectionStatuses[record.id!];
        const isLoading = connectionLoadingStates.get(record.id!);
        const isTestSuccessful = status?.status === 'connected' && status?.error === undefined;

        return (
          <div className='flex items-center space-x-2'>
            <Button
              variant={isTestSuccessful ? 'secondary' : 'default'}
              size='sm'
              disabled={isLoading}
              onClick={() => handleTestConnection(record.id!)}
            >
              {isLoading ? (
                <RefreshCw className='w-4 h-4 mr-1 animate-spin' />
              ) : isTestSuccessful ? (
                <CheckCircle className='w-4 h-4 mr-1' />
              ) : (
                <Wifi className='w-4 h-4 mr-1' />
              )}
              {isLoading ? '测试中...' : '测试连接'}
            </Button>

            <Button
              variant='outline'
              size='sm'
              disabled={isLoading}
              onClick={() => {
                console.log('编辑连接:', record);
                onEditConnection?.(record);
              }}
            >
              <Edit className='w-4 h-4 mr-1' />
              编辑
            </Button>

            <Button
              variant='outline'
              size='sm'
              disabled={isLoading}
              onClick={async () => {
                const confirmed = await dialog.confirm(
                  `确定要删除连接 "${record.name}" 吗？此操作无法撤销。`
                );
                if (confirmed) {
                  removeConnection(record.id!);
                }
              }}
            >
              <Trash2 className='w-4 h-4 mr-1' />
              删除
            </Button>
          </div>
        );
      },
    },
  ];

  // 合并连接数据和状态
  const dataSource: ConnectionWithStatus[] = connections.map(conn => ({
    ...conn,
    status: tableConnectionStatuses[conn.id!],
    poolStats: poolStats[conn.id!],
  }));

  return (
    <div className='h-full flex flex-col'>
      {/* 统计信息和工具栏 */}
      <div className='border-b'>
        <div className='p-4'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-medium'>连接管理</h3>
            <div className='flex gap-2'>
              <Button
                variant='default'
                onClick={() => onCreateConnection?.()}
                size='sm'
              >
                <Plus className='w-4 h-4 mr-1' />
                新建连接
              </Button>
              <Button
                variant='outline'
                onClick={handleRefreshAllConnectionStatuses}
                disabled={isRefreshingAll}
                size='sm'
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshingAll ? 'animate-spin' : ''}`} />
                {isRefreshingAll ? '测试中...' : '刷新状态'}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* 连接表格 */}
      <div className='flex-1 overflow-hidden p-4'>
        <div className='h-full rounded-lg border'>
          <DataTable
            columns={columns}
            dataSource={dataSource}
            rowKey='id'
            loading={false}
            scroll={{
              y: 'calc(100vh - 400px)',
            }}
            size='middle'
            className='w-full h-full connection-table'
            rowClassName={(record: ConnectionWithStatus) =>
              activeConnectionId === record.id
                ? 'bg-primary/10 dark:bg-primary/20'
                : ''
            }
            onRow={(record: ConnectionWithStatus) => ({
              onContextMenu: (event: React.MouseEvent) => handleRowContextMenu(event, record),
            })}
          />
        </div>
      </div>

      {/* 连接池统计模态框 */}
      <Dialog
        open={poolStatsModalVisible}
        onOpenChange={setPoolStatsModalVisible}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>连接池统计信息</DialogTitle>
          </DialogHeader>
          {selectedConnectionId && poolStats[selectedConnectionId] && (
            <div className='space-y-6'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <div className='p-4'>
                    <div className='text-sm text-muted-foreground'>
                      总连接数
                    </div>
                    <div className='text-2xl font-bold'>
                      {poolStats[selectedConnectionId].total_connections}
                    </div>
                  </div>
                </div>
                <div>
                  <div className='p-4'>
                    <div className='text-sm text-muted-foreground'>
                      活跃连接数
                    </div>
                    <div className='text-2xl font-bold text-success'>
                      {poolStats[selectedConnectionId].active_connections}
                    </div>
                  </div>
                </div>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <div className='p-4'>
                    <div className='text-sm text-muted-foreground'>
                      空闲连接数
                    </div>
                    <div className='text-2xl font-bold'>
                      {poolStats[selectedConnectionId].idle_connections}
                    </div>
                  </div>
                </div>
                <div>
                  <div className='p-4'>
                    <div className='text-sm text-muted-foreground'>
                      最大连接数
                    </div>
                    <div className='text-2xl font-bold'>
                      {poolStats[selectedConnectionId].max_connections}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Typography.Title level={4}>连接池使用率</Typography.Title>
                <Progress
                  value={Math.round(
                    (poolStats[selectedConnectionId].active_connections /
                      poolStats[selectedConnectionId].max_connections) *
                      100
                  )}
                  className='mt-2'
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
