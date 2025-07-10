import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Button, Space, Tag, Modal, Form, Input, message, Statistic, Row, Col, Tooltip, InputNumber, Switch, Dropdown, Progress, Badge } from '@/components/ui';
import { PlayCircleOutlined, PauseCircleOutlined, SettingOutlined, DeleteOutlined, EditOutlined, EyeOutlined, WifiOutlined, DisconnectOutlined } from '@/components/ui';
// TODO: Replace these icons: MoreOutlined
// You may need to find alternatives or create custom icons
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from '@/components/ui';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { useConnectionStore } from '@/store/connection';

interface ConnectionManagerProps {
  onConnectionSelect?: (connectionId: string) => void;
}

interface ConnectionWithStatus extends ConnectionConfig {
  status?: ConnectionStatus;
  poolStats?: any;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({ onConnectionSelect }) => {
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
    addConnection,
    updateConnection,
    removeConnection,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [poolStatsModalVisible, setPoolStatsModalVisible] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [form] = Form.useForm();

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
  }, []);

  // 处理连接操作
  const handleConnectionToggle = useCallback(async (connectionId: string) => {
    setLoading(true);
    try {
      const status = connectionStatuses[connectionId];
      if (status?.status === 'connected') {
        await disconnectFromDatabase(connectionId);
        message.success('连接已断开');
      } else {
        await connectToDatabase(connectionId);
        message.success('连接成功');
        onConnectionSelect?.(connectionId);
      }
    } catch (error) {
      message.error(`连接操作失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [connectionStatuses, connectToDatabase, disconnectFromDatabase, onConnectionSelect]);

  // 处理监控切换
  const handleMonitoringToggle = useCallback(async () => {
    try {
      if (monitoringActive) {
        await stopMonitoring();
        message.success('监控已停止');
      } else {
        await startMonitoring(30);
        message.success('监控已启动');
      }
    } catch (error) {
      message.error(`监控操作失败: ${error}`);
    }
  }, [monitoringActive, startMonitoring, stopMonitoring]);

  // 查看连接池统计
  const handleViewPoolStats = useCallback(async (connectionId: string) => {
    try {
      await getPoolStats(connectionId);
      setSelectedConnectionId(connectionId);
      setPoolStatsModalVisible(true);
    } catch (error) {
      message.error(`获取连接池统计失败: ${error}`);
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
  const columns: ColumnsType<ConnectionWithStatus> = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space>
          <Badge
            status={connectionStatuses[record.id!]?.status === 'connected' ? 'success' : 'default'}
          />
          <strong>{name}</strong>
          {activeConnectionId === record.id && <Tag color="blue">活跃</Tag>}
        </Space>
      ),
    },
    {
      title: '主机',
      dataIndex: 'host',
      key: 'host',
      render: (host: string, record) => `${host}:${record.port}`,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => getStatusTag(connectionStatuses[record.id!]),
    },
    {
      title: '延迟',
      key: 'latency',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return status?.latency ? `${status.latency}ms` : '-';
      },
    },
    {
      title: '最后连接',
      key: 'lastConnected',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        return status?.lastConnected
          ? new Date(status.lastConnected).toLocaleString()
          : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        const status = connectionStatuses[record.id!];
        const isConnected = status?.status === 'connected';
        
        const menuItems: MenuProps['items'] = [
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: '编辑',
            onClick: () => {
              setEditingConnection(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            },
          },
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
            label: '删除',
            danger: true,
            onClick: () => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除连接 "${record.name}" 吗？`,
                onOk: () => removeConnection(record.id!),
              });
            },
          },
        ];

        return (
          <Space>
            <Button
              type={isConnected ? 'default' : 'primary'}
              icon={isConnected ? <DisconnectOutlined /> : <WifiOutlined />}
              size="small"
              loading={loading}
              onClick={() => handleConnectionToggle(record.id!)}
            >
              {isConnected ? '断开' : '连接'}
            </Button>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>
          </Space>
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
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
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
        <div style={{ marginTop: '16px' }}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
            loading={loading}
            scroll={{ x: 'max-content' }}
            size="middle"
          />
        </div>
      </Card>

      {/* 连接配置模态框 */}
      <Modal
        title={editingConnection ? '编辑连接' : '新建连接'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            if (editingConnection) {
              updateConnection(editingConnection.id!, values);
              message.success('连接更新成功');
            } else {
              addConnection({
                ...values,
                id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              message.success('连接创建成功');
            }
            setModalVisible(false);
            form.resetFields();
          }}
        >
          <Form.Item
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="请输入连接名称" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="主机地址"
                name="host"
                rules={[{ required: true, message: '请输入主机地址' }]}
              >
                <Input placeholder="localhost" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="端口"
                name="port"
                rules={[{ required: true, message: '请输入端口' }]}
              >
                <InputNumber min={1} max={65535} placeholder="8086" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="用户名" name="username">
                <Input placeholder="用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="密码" name="password">
                <Input.Password placeholder="密码" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="默认数据库" name="database">
                <Input placeholder="数据库名称" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="SSL" name="ssl" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="超时(秒)" name="timeout">
                <InputNumber min={1} max={300} placeholder="30" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

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
