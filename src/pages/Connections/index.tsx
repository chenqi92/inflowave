import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Popconfirm,
  Tag,
  Typography,
  Tooltip,
  Badge,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ApiOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore, connectionUtils } from '@/store/connection';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

interface ConnectionListItem extends ConnectionConfig {
  status?: ConnectionStatus;
}

const { Title } = Typography;

const Connections: React.FC = () => {
  const {
    connections: storeConnections,
    connectionStatuses,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
    setConnectionStatus,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [form] = Form.useForm();

  // 加载连接列表
  const loadConnections = async () => {
    setLoading(true);
    try {
      const connectionList = await invoke<ConnectionConfig[]>('get_connections');
      const connectionsWithStatus: ConnectionListItem[] = [];

      // 获取每个连接的状态
      for (const conn of connectionList) {
        try {
          const status = await invoke<ConnectionStatus>('get_connection_status', {
            connectionId: conn.id
          });
          connectionsWithStatus.push({ ...conn, status });
          setConnectionStatus(conn.id!, status);
        } catch (error) {
          const errorStatus: ConnectionStatus = {
            id: conn.id!,
            status: 'disconnected' as const,
            error: String(error)
          };
          connectionsWithStatus.push({ ...conn, status: errorStatus });
          setConnectionStatus(conn.id!, errorStatus);
        }
      }

      setConnections(connectionsWithStatus);
    } catch (error) {
      message.error(`加载连接列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 组件挂载时加载连接列表
  useEffect(() => {
    loadConnections();
  }, []);

  // 打开新建/编辑连接对话框
  const handleOpenModal = (connection?: ConnectionConfig) => {
    setEditingConnection(connection || null);
    setIsModalVisible(true);
    
    if (connection) {
      form.setFieldsValue(connection);
    } else {
      form.setFieldsValue(connectionUtils.createDefaultConfig());
    }
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingConnection(null);
    form.resetFields();
  };

  // 保存连接配置
  const handleSaveConnection = async () => {
    try {
      const values = await form.validateFields();
      const errors = connectionUtils.validateConnection(values);

      if (errors.length > 0) {
        message.error(errors[0]);
        return;
      }

      const config: ConnectionConfig = {
        ...values,
        id: editingConnection?.id || `conn_${Date.now()}`,
        createdAt: editingConnection?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingConnection) {
        // 更新现有连接
        await safeTauriInvoke('update_connection', {
          connectionId: config.id,
          config
        });
        updateConnection(config.id!, config);
        message.success('连接配置已更新');
      } else {
        // 创建新连接
        const connectionId = await invoke<string>('create_connection', { config });
        addConnection({ ...config, id: connectionId });
        message.success('连接配置已创建');
      }

      handleCloseModal();
      await loadConnections(); // 重新加载连接列表
    } catch (error) {
      console.error('保存连接配置失败:', error);
      message.error(`保存连接配置失败: ${error}`);
    }
  };

  // 删除连接
  const handleDeleteConnection = async (id: string) => {
    try {
      await safeTauriInvoke('delete_connection', { connectionId: id });
      removeConnection(id);
      message.success('连接已删除');
      await loadConnections();
    } catch (error) {
      message.error(`删除连接失败: ${error}`);
    }
  };

  // 测试连接
  const handleTestConnection = async (connection: ConnectionConfig) => {
    const hide = message.loading('正在测试连接...', 0);

    try {
      const result = await safeTauriInvoke('test_connection', {
        connectionId: connection.id
      });
      hide();
      message.success('连接测试成功');
      await loadConnections(); // 刷新状态
    } catch (error) {
      hide();
      message.error(`连接测试失败: ${error}`);
    }
  };

  // 激活/停用连接
  const handleToggleConnection = async (connection: ConnectionConfig) => {
    try {
      if (activeConnectionId === connection.id) {
        await safeTauriInvoke('disconnect_from_database', { connectionId: connection.id });
        setActiveConnection(null);
        message.info('已断开连接');
      } else {
        await safeTauriInvoke('connect_to_database', { connectionId: connection.id });
        setActiveConnection(connection.id!);
        message.success(`已连接到 ${connection.name}`);
      }
      await loadConnections();
    } catch (error) {
      message.error(`连接操作失败: ${error}`);
    }
  };

  // 表格列定义
  const columns: ColumnsType<ConnectionConfig> = [
    {
      title: '连接名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ConnectionConfig) => (
        <Space>
          <ApiOutlined />
          <span className="font-medium">{name}</span>
          {activeConnectionId === record.id && (
            <Tag color="green">活跃</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '主机地址',
      dataIndex: 'host',
      key: 'host',
    },
    {
      title: '端口',
      dataIndex: 'port',
      key: 'port',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'SSL',
      dataIndex: 'ssl',
      key: 'ssl',
      width: 60,
      render: (ssl: boolean) => (
        <Tag color={ssl ? 'green' : 'default'}>
          {ssl ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record: ConnectionListItem) => {
        const status = record.status || connectionStatuses[record.id!];
        if (!status) {
          return <Tag color="default">未知</Tag>;
        }

        const statusConfig = {
          connected: { color: 'green', text: '已连接' },
          connecting: { color: 'orange', text: '连接中' },
          disconnected: { color: 'red', text: '已断开' },
          error: { color: 'red', text: '错误' },
        }[status.status];

        return (
          <Tooltip title={status.error || `延迟: ${status.latency || 0}ms`}>
            <Badge
              status={status.status === 'connected' ? 'success' :
                     status.status === 'connecting' ? 'processing' : 'error'}
              text={
                <Tag color={statusConfig.color}>
                  {statusConfig.text}
                </Tag>
              }
            />
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: ConnectionConfig) => (
        <Space>
          <Tooltip title="测试连接">
            <Button
              type="text"
              icon={<PlayCircleOutlined />}
              onClick={() => handleTestConnection(record)}
            />
          </Tooltip>
          
          <Tooltip title={activeConnectionId === record.id ? '断开连接' : '连接'}>
            <Button
              type="text"
              icon={activeConnectionId === record.id ? <StopOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggleConnection(record)}
            />
          </Tooltip>
          
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenModal(record)}
            />
          </Tooltip>
          
          <Popconfirm
            title="确定要删除这个连接吗？"
            onConfirm={() => handleDeleteConnection(record.id!)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2}>连接管理</Title>
          <p className="text-gray-600 mt-1">
            管理 InfluxDB 数据库连接配置
          </p>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadConnections}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={() => message.info('导入功能开发中...')}
          >
            导入
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={() => message.info('导出功能开发中...')}
          >
            导出
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            新建连接
          </Button>
        </Space>
      </div>

      {/* 连接列表 */}
      <Card>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={connections}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 个连接`,
            }}
            locale={{
              emptyText: loading ? '加载中...' : '暂无连接配置，点击"新建连接"开始使用',
            }}
          />
        </Spin>
      </Card>

      {/* 新建/编辑连接对话框 */}
      <Modal
        title={editingConnection ? '编辑连接' : '新建连接'}
        open={isModalVisible}
        onOk={handleSaveConnection}
        onCancel={handleCloseModal}
        width={600}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={connectionUtils.createDefaultConfig()}
        >
          <Form.Item
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="请输入连接名称" />
          </Form.Item>

          <Form.Item
            label="主机地址"
            name="host"
            rules={[{ required: true, message: '请输入主机地址' }]}
          >
            <Input placeholder="localhost" />
          </Form.Item>

          <Form.Item
            label="端口"
            name="port"
            rules={[
              { required: true, message: '请输入端口号' },
              { type: 'number', min: 1, max: 65535, message: '端口号必须在 1-65535 之间' },
            ]}
          >
            <InputNumber
              placeholder="8086"
              className="w-full"
              min={1}
              max={65535}
            />
          </Form.Item>

          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            label="超时时间 (毫秒)"
            name="timeout"
            rules={[
              { type: 'number', min: 1000, max: 300000, message: '超时时间必须在 1-300 秒之间' },
            ]}
          >
            <InputNumber
              placeholder="5000"
              className="w-full"
              min={1000}
              max={300000}
              step={1000}
            />
          </Form.Item>

          <Form.Item
            label="启用 SSL"
            name="ssl"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Connections;
