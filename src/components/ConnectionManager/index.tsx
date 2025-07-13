import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Statistic, Row, Col, Tooltip, Dropdown, Progress, Badge } from '@/components/ui';
import { PlayCircleOutlined, PauseCircleOutlined, SettingOutlined, DeleteOutlined, EditOutlined, EyeOutlined, WifiOutlined, DisconnectOutlined, MoreOutlined } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { MenuProps } from '@/components/ui';
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
    removeConnection,
  } = useConnectionStore();

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
            const connectionWithTimestamp = {
              ...connection,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            const newConnectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });
            if (newConnectionId) {
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
    if (!status) {
      return <Tag color="default">未知</Tag>;
    }

    const statusConfig = {
      connected: { color: 'success', text: '已连接' },
      disconnected: { color: 'default', text: '已断开' },
      connecting: { color: 'processing', text: '连接中' },
      error: { color: 'error', text: '错误' },
    };

    const config = statusConfig[status.status] || statusConfig.disconnected;
    return (
      <Tooltip title={status.error || `延迟: ${status.latency || 0}ms`}>
        <Tag color={config.color}>{config.text}</Tag>
      </Tooltip>
    );
  };

  // 表格列定义
  const columns: TableColumn<ConnectionWithStatus>[] = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <div className="flex items-center space-x-3">
          <Badge
            status={connectionStatuses[record.id!]?.status === 'connected' ? 'success' : 'default'}
          />
          <div>
            <div className="font-medium text-gray-900">{name}</div>
            <div className="text-sm text-gray-500">{record.host}:{record.port}</div>
          </div>
          {activeConnectionId === record.id && (
            <Tag color="blue" className="ml-2">活跃</Tag>
          )}
        </div>
      ),
    },
    {
      title: '连接信息',
      key: 'connectionInfo',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-gray-500">用户：</span>
            <span className="text-gray-900">{record.username || '无'}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">SSL：</span>
            <span className={record.ssl ? 'text-green-600' : 'text-gray-400'}>
              {record.ssl ? '已启用' : '未启用'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return (
          <div className="space-y-1">
            {getStatusTag(status)}
            {status?.latency && (
              <div className="text-xs text-gray-500">
                延迟: {status.latency}ms
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '最后连接',
      key: 'lastConnected',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return status?.lastConnected ? (
          <div className="text-sm text-gray-600">
            {new Date(status.lastConnected).toLocaleString()}
          </div>
        ) : (
          <span className="text-gray-400">从未连接</span>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        const isConnected = status?.status === 'connected';

        return (
          <div className="flex items-center space-x-2">
            <Button
              type={isConnected ? 'default' : 'primary'}
              icon={isConnected ? <DisconnectOutlined /> : <WifiOutlined />}
              size="small"
              loading={loading}
              onClick={() => handleConnectionToggle(record.id!)}
              className={isConnected ? '' : 'bg-green-600 hover:bg-green-700 border-green-600'}
            >
              {isConnected ? '断开' : '连接'}
            </Button>
            
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => {
                console.log('编辑连接:', record);
                onEditConnection?.(record);
              }}
              title="编辑连接"
            />
            
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'poolStats',
                    icon: <EyeOutlined />,
                    label: '连接池统计',
                    disabled: !isConnected,
                    onClick: () => handleViewPoolStats(record.id!),
                  },
                  {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: '删除连接',
                    danger: true,
                    onClick: () => {
                      Modal.confirm({
                        title: '确认删除',
                        content: `确定要删除连接 "${record.name}" 吗？此操作无法撤销。`,
                        okText: '确认删除',
                        cancelText: '取消',
                        closable: true,
                        keyboard: true,
                        maskClosable: true,
                        okButtonProps: { danger: true },
                        onOk: () => removeConnection(record.id!),
                      });
                    },
                  },
                ]
              }}
              trigger={['click']}
            >
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </div>
        );
      },
    },
  ];

  // 合并连接数据和状态
  const dataSource: ConnectionWithStatus[] = connections.map(conn => ({
    ...conn,
    status: connectionStatuses[conn.id!],
    poolStats: poolStats[conn.id!],
  }));

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Card
        title="连接管理"
        extra={
          <Button
            type={monitoringActive ? 'default' : 'primary'}
            icon={monitoringActive ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handleMonitoringToggle}
            size="small"
          >
            {monitoringActive ? '停止监控' : '启动监控'}
          </Button>
        }
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '0',
          boxShadow: 'none'
        }}
        bodyStyle={{
          height: 'calc(100% - 65px)',
          overflow: 'auto',
          padding: '24px'
        }}
      >
        {/* 统计信息 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="总连接数"
                value={connections.length}
                prefix={<SettingOutlined />}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="已连接"
                value={Object.values(connectionStatuses).filter(s => s.status === 'connected').length}
                valueStyle={{ color: '#3f8600' }}
                prefix={<WifiOutlined />}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="监控状态"
                value={monitoringActive ? '运行中' : '已停止'}
                valueStyle={{ color: monitoringActive ? '#3f8600' : '#cf1322' }}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="监控间隔"
                value={monitoringInterval}
                suffix="秒"
              />
            </div>
          </Col>
        </Row>

        {/* 连接表格 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            pagination={{
              pageSize: 8,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              size: 'default'
            }}
            loading={loading}
            scroll={{ x: 'max-content' }}
            size="middle"
            className="connection-table"
            rowClassName={(record) => 
              activeConnectionId === record.id 
                ? 'bg-blue-50 border-blue-200' 
                : 'hover:bg-gray-50'
            }
          />
        </div>
      </Card>


      {/* 连接池统计模态框 */}
      <Modal
        title="连接池统计信息"
        open={poolStatsModalVisible}
        onCancel={() => setPoolStatsModalVisible(false)}
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
              <h4>连接池使用率</h4>
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
      </Modal>
    </div>
  );
};

export default ConnectionManager;
