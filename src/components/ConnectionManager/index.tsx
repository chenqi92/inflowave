import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Statistic, Row, Col, Tooltip, Progress, Typography } from '@/components/ui';
import { Badge, Dialog, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Popconfirm } from '@/components/ui';
import { Settings, Trash2, Edit, Eye, Wifi, Unlink, PlayCircle, PauseCircle, MoreHorizontal } from 'lucide-react';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import './ConnectionManager.css';

interface ConnectionManagerProps {
  onConnectionSelect?: (connectionId: string) => void;
  onEditConnection?: (connection: ConnectionConfig) => void;
}

interface ConnectionWithStatus extends ConnectionConfig {
  status?: ConnectionStatus;
  poolStats?: any;
}

interface ColumnType<T = any> {
  title: string;
  dataIndex?: string;
  key: string;
  width?: number | string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ onConnectionSelect, onEditConnection }) => {
  const {
    connections,
    connectionStatuses,
    activeConnectionId,
    monitoringActive,
    monitoringInterval,
    poolStats,
    connectToDatabase,
    disconnectFromDatabase,
    startMonitoring,
    stopMonitoring,
    refreshAllStatuses,
    getPoolStats,
    removeConnection} = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [poolStatsModalVisible, setPoolStatsModalVisible] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // 自动刷新状态
  useEffect(() => {
    const interval = setInterval(() => {
      if (monitoringActive) {
        refreshAllStatuses();
      }
    }, monitoringInterval * 1000);

    return () => clearInterval(interval);
  }, [monitoringActive, monitoringInterval, refreshAllStatuses]);

  // 初始加载
  useEffect(() => {
    refreshAllStatuses();
  }, [refreshAllStatuses]);

  // 处理连接操作
  const handleConnectionToggle = useCallback(async (connectionId: string) => {
    setLoading(true);
    try {
      // 首先确保连接配置存在
      const connection = connections.find(c => c.id === connectionId);
      if (!connection) {
        showMessage.error('连接配置不存在，请重新加载页面');
        refreshAllStatuses();
        return;
      }

      const status = connectionStatuses[connectionId];
      if (status?.status === 'connected') {
        await disconnectFromDatabase(connectionId);
        showMessage.success('连接已断开');
      } else {
        try {
          await connectToDatabase(connectionId);
          showMessage.success('连接成功');
          onConnectionSelect?.(connectionId);
        } catch (connectError) {
          // 如果连接失败，尝试重新创建连接配置
          console.warn('直接连接失败，尝试重新创建连接配置:', connectError);
          try {
            // 确保连接配置有正确的时间戳
            const connectionWithTimestamp = {
              ...connection,
              created_at: connection.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            console.log('重新创建连接配置:', connectionWithTimestamp.name);
            const newConnectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });

            if (newConnectionId) {
              console.log('连接配置重新创建成功，尝试连接:', newConnectionId);
              await connectToDatabase(newConnectionId);
              showMessage.success('连接成功');
              onConnectionSelect?.(newConnectionId);
            }
          } catch (recreateError) {
            console.error('重新创建连接失败:', recreateError);
            showMessage.error(`连接失败: ${recreateError}`);
          }
        }
      }
    } catch (error) {
      console.error('连接操作失败:', error);
      showMessage.error(`连接操作失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [connections, connectionStatuses, connectToDatabase, disconnectFromDatabase, onConnectionSelect, refreshAllStatuses]);

  // 处理监控切换
  const handleMonitoringToggle = useCallback(async () => {
    try {
      if (monitoringActive) {
        await stopMonitoring();
        showMessage.success('监控已停止');
      } else {
        await startMonitoring(30);
        showMessage.success('监控已启动');
      }
    } catch (error) {
      showMessage.error(`监控操作失败: ${error}`);
    }
  }, [monitoringActive, startMonitoring, stopMonitoring]);

  // 查看连接池统计
  const handleViewPoolStats = useCallback(async (connectionId: string) => {
    try {
      await getPoolStats(connectionId);
      setSelectedConnectionId(connectionId);
      setPoolStatsModalVisible(true);
    } catch (error) {
      showMessage.error(`获取连接池统计失败: ${error}`);
    }
  }, [getPoolStats]);

  // 获取状态标签
  const getStatusTag = (status?: ConnectionStatus) => {
    // 如果没有状态信息，显示默认的断开状态而不是"未知"
    const actualStatus = status || {
      id: '',
      status: 'disconnected' as const,
      error: undefined,
      lastConnected: undefined,
      latency: undefined
    };

    const statusConfig = {
      connected: { color: 'success', text: '已连接' },
      disconnected: { color: 'default', text: '已断开' },
      connecting: { color: 'processing', text: '连接中' },
      error: { color: 'error', text: '错误' }
    };

    const config = statusConfig[actualStatus.status] || statusConfig.disconnected;

    // 构建tooltip内容
    let tooltipContent = '';
    if (actualStatus.error) {
      tooltipContent = `错误: ${actualStatus.error}`;
    } else if (actualStatus.latency) {
      tooltipContent = `延迟: ${actualStatus.latency}ms`;
    } else if (actualStatus.status === 'disconnected') {
      tooltipContent = '连接已断开';
    }

    return (
      <Tooltip title={tooltipContent || config.text}>
        <Tag color={config.color}>{config.text}</Tag>
      </Tooltip>
    );
  };

  // 表格列定义
  const columns: ColumnType<ConnectionWithStatus>[] = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      ellipsis: true,
      render: (name: string, record) => (
        <div className="flex items-center space-x-3">
          <Badge
            status={connectionStatuses[record.id!]?.status === 'connected' ? 'success' : 'default'}
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 truncate">{name}</div>
            <div className="text-sm text-muted-foreground truncate">{record.host}:{record.port}</div>
          </div>
          {activeConnectionId === record.id && (
            <Tag color="blue" className="ml-2 flex-shrink-0">活跃</Tag>
          )}
        </div>
      )},
    {
      title: '连接信息',
      key: 'connectionInfo',
      width: '25%',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-muted-foreground">用户：</span>
            <span className="text-gray-900 truncate">{record.username || '无'}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">SSL：</span>
            <span className={record.ssl ? 'text-success' : 'text-gray-400'}>
              {record.ssl ? '已启用' : '未启用'}
            </span>
          </div>
        </div>
      )},
    {
      title: '状态',
      key: 'status',
      width: '15%',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return (
          <div className="space-y-1">
            {getStatusTag(status)}
            {status?.latency && (
              <div className="text-xs text-muted-foreground">
                延迟: {status.latency}ms
              </div>
            )}
          </div>
        );
      }},
    {
      title: '最后连接',
      key: 'lastConnected',
      width: '20%',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return status?.lastConnected ? (
          <div className="text-sm text-muted-foreground">
            {new Date(status.lastConnected).toLocaleString()}
          </div>
        ) : (
          <span className="text-gray-400">从未连接</span>
        );
      }},
    {
      title: '操作',
      key: 'actions',
      width: '10%',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        const isConnected = status?.status === 'connected';

        return (
          <div className="flex items-center space-x-1">
            <Button
              type={isConnected ? 'default' : 'primary'}
              icon={isConnected ? <Unlink className="w-4 h-4"  /> : <Wifi className="w-4 h-4"  />}
              size="small"
              disabled={loading}
              onClick={() => handleConnectionToggle(record.id!)}
              className={isConnected ? '' : 'bg-green-600 hover:bg-green-700 border-green-600'}
            >
              {isConnected ? '断开' : '连接'}
            </Button>

            <Button
              icon={<Edit className="w-4 h-4"  />}
              size="small"
              onClick={() => {
                console.log('编辑连接:', record);
                onEditConnection?.(record);
              }}
            >
              编辑
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button icon={<MoreHorizontal className="w-4 h-4" />} size="small">
                  更多
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  disabled={!isConnected}
                  onClick={() => handleViewPoolStats(record.id!)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  连接池统计
                </DropdownMenuItem>
                <Popconfirm
                  title="确认删除"
                  description={`确定要删除连接 "${record.name}" 吗？此操作无法撤销。`}
                  onConfirm={() => removeConnection(record.id!)}
                  okText="确认删除"
                  cancelText="取消"
                >
                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除连接
                  </DropdownMenuItem>
                </Popconfirm>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }},
  ];

  // 合并连接数据和状态
  const dataSource: ConnectionWithStatus[] = connections.map(conn => ({
    ...conn,
    status: connectionStatuses[conn.id!],
    poolStats: poolStats[conn.id!]}));

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex justify-between items-center p-3 border-b border">
        <div className="text-sm text-muted-foreground">
          连接状态监控
        </div>
        <Button
          type={monitoringActive ? 'default' : 'primary'}
          icon={monitoringActive ? <PauseCircle /> : <PlayCircle />}
          onClick={handleMonitoringToggle}
          size="small"
        >
          {monitoringActive ? '停止监控' : '启动监控'}
        </Button>
      </div>
      {/* 统计信息 */}
      <div className="flex items-center justify-between p-3 bg-muted/50 border-b border">
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-muted-foreground"   />
            <span className="text-muted-foreground">总连接:</span>
            <Typography.Text className="font-medium">{connections.length}</Typography.Text>
          </div>
          <div className="flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-success"   />
            <span className="text-muted-foreground">已连接:</span>
            <span className="font-medium text-success">
              {Object.values(connectionStatuses).filter(s => s.status === 'connected').length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">监控:</span>
            <span className={`font-medium ${monitoringActive ? 'text-success' : 'text-red-600'}`}>
              {monitoringActive ? '运行中' : '已停止'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">间隔:</span>
            <Typography.Text className="font-medium">{monitoringInterval}秒</Typography.Text>
          </div>
        </div>
      </div>

      {/* 连接表格 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full overflow-auto">
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              size: 'small'
            }}
            disabled={loading}
            scroll={{ y: 'calc(100vh - 320px)', x: '100%' }}
            size="small"
            className="connection-table w-full"
            rowClassName={(record) =>
              activeConnectionId === record.id
                ? 'bg-blue-50'
                : 'hover:bg-muted/50'
            }
          />
        </div>
      </div>

      {/* 连接池统计模态框 */}
      <Dialog
        title="连接池统计信息"
        open={poolStatsModalVisible}
        onOpenChange={(open) => !open && (() => setPoolStatsModalVisible(false))()}
        footer={null}
        width={600}
      >
        {selectedConnectionId && poolStats[selectedConnectionId] && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="总连接数"
                  value={poolStats[selectedConnectionId].total_connections}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="活跃连接数"
                  value={poolStats[selectedConnectionId].active_connections}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Statistic
                  title="空闲连接数"
                  value={poolStats[selectedConnectionId].idle_connections}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="最大连接数"
                  value={poolStats[selectedConnectionId].max_connections}
                />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Typography variant="h4">连接池使用率</Typography>
              <Progress
                percent={Math.round(
                  (poolStats[selectedConnectionId].active_connections /
                    poolStats[selectedConnectionId].max_connections) * 100
                )}
                status="active"
              />
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default ConnectionManager;
