import React, { useState } from 'react';
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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useConnectionStore, connectionUtils } from '@store/connection';
import type { ConnectionConfig } from '@types/index';

const { Title } = Typography;

const Connections: React.FC = () => {
  const {
    connections,
    connectionStatuses,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    setActiveConnection,
  } = useConnectionStore();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [form] = Form.useForm();

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

      if (editingConnection) {
        // 更新现有连接
        updateConnection(editingConnection.id!, values);
        message.success('连接配置已更新');
      } else {
        // 创建新连接
        addConnection(values);
        message.success('连接配置已创建');
      }

      handleCloseModal();
    } catch (error) {
      console.error('保存连接配置失败:', error);
    }
  };

  // 删除连接
  const handleDeleteConnection = (id: string) => {
    removeConnection(id);
    message.success('连接已删除');
  };

  // 测试连接
  const handleTestConnection = async (connection: ConnectionConfig) => {
    message.loading('正在测试连接...', 0);
    
    // 这里应该调用 Tauri 后端的测试连接接口
    // 暂时模拟测试结果
    setTimeout(() => {
      message.destroy();
      const success = Math.random() > 0.3; // 70% 成功率
      
      if (success) {
        message.success('连接测试成功');
      } else {
        message.error('连接测试失败');
      }
    }, 2000);
  };

  // 激活/停用连接
  const handleToggleConnection = (connection: ConnectionConfig) => {
    if (activeConnectionId === connection.id) {
      setActiveConnection(null);
      message.info('已断开连接');
    } else {
      setActiveConnection(connection.id!);
      message.success(`已连接到 ${connection.name}`);
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
      render: (_, record: ConnectionConfig) => {
        const status = connectionStatuses[record.id!];
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
            <Tag color={statusConfig.color}>
              {statusConfig.text}
            </Tag>
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
        <Title level={2}>连接管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          新建连接
        </Button>
      </div>

      {/* 连接列表 */}
      <Card>
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
        />
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
