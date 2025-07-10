﻿import React, { useState, useEffect } from 'react';
import { Typography, Button, Space, Modal, Form, Input, Row, Col, InputNumber, Switch } from '@/components/ui';
import { PlusOutlined, ReloadOutlined } from '@/components/ui';
// TODO: Replace these icons: ImportOutlined, ExportOutlined
// You may need to find alternatives or create custom icons
import { useNavigate } from 'react-router-dom';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import ConnectionManager from '@/components/ConnectionManager';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

const { Title } = Typography;

interface ConnectionListItem extends ConnectionConfig {
  status?: ConnectionStatus;
}

const Connections: React.FC = () => {
  const navigate = useNavigate();
  const {
    addConnection,
    updateConnection,
    removeConnection,
    setConnectionStatus,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);
  const [form] = Form.useForm();

  // 加载连接列表
  const loadConnections = async () => {
    setLoading(true);
    try {
      const connectionList = await safeTauriInvoke<ConnectionConfig[]>('get_connections');

      if (connectionList) {
        // 获取每个连接的状态
        for (const conn of connectionList) {
          try {
            const status = await safeTauriInvoke<ConnectionStatus>('get_connection_status', {
              connectionId: conn.id
            });
            if (status) {
              setConnectionStatus(conn.id!, status);
            }
          } catch (error) {
            const errorStatus: ConnectionStatus = {
              id: conn.id!,
              status: 'disconnected' as const,
              error: String(error)
            };
            setConnectionStatus(conn.id!, errorStatus);
          }
        }
      }
    } catch (error) {
      showMessage.error(`加载连接列表失败: ${error}`);
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
      form.setFieldsValue({
        name: '',
        host: 'localhost',
        port: 8086,
        username: '',
        password: '',
        database: '',
        ssl: false,
        timeout: 30,
      });
    }
  };

  // 关闭对话框
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingConnection(null);
    form.resetFields();
  };

  // 保存连接配置
  const handleSaveConnection = async (values: any) => {
    try {
      const config: ConnectionConfig = {
        ...values,
        id: editingConnection?.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
        showMessage.success('连接配置已更新');
      } else {
        // 创建新连接
        const connectionId = await safeTauriInvoke<string>('create_connection', { config });
        if (connectionId) {
          addConnection({ ...config, id: connectionId });
          showMessage.success('连接配置已创建');
        }
      }

      handleCloseModal();
      await loadConnections(); // 重新加载连接列表
    } catch (error) {
      console.error('保存连接配置失败:', error);
      showMessage.error(`保存连接配置失败: ${error}`);
    }
  };



  // 处理连接选择
  const handleConnectionSelect = (connectionId: string) => {
    // 导航到数据库页面或其他相关页面
    navigate('/database', { state: { connectionId } });
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      padding: '20px',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 页面标题和操作 */}
      <div style={{ marginBottom: '20px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              连接管理
            </Title>
            <p style={{
              color: '#666',
              margin: 0,
              fontSize: '14px'
            }}>
              管理 InfluxDB 数据库连接配置
            </p>
          </Col>
          <Col>
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
                onClick={() => showMessage.info('导入功能开发中...')}
              >
                导入
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={() => showMessage.info('导出功能开发中...')}
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
          </Col>
        </Row>
      </div>

      {/* 连接管理器 */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ConnectionManager onConnectionSelect={handleConnectionSelect} />
      </div>

      {/* 连接配置模态框 */}
      <Modal
        title={editingConnection ? '编辑连接' : '新建连接'}
        open={isModalVisible}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConnection}
          preserve={false}
        >
          <Form.Item
            label="连接名称"
            name="name"
            rules={[{ required: true, message: '请输入连接名称' }]}
          >
            <Input placeholder="例如: 本地 InfluxDB" />
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
                <InputNumber
                  min={1}
                  max={65535}
                  placeholder="8086"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="用户名" name="username">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="密码" name="password">
                <Input.Password placeholder="可选" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="默认数据库" name="database">
                <Input placeholder="可选" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="使用 SSL" name="ssl" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="超时时间(秒)" name="timeout">
                <InputNumber
                  min={1}
                  max={300}
                  placeholder="30"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Connections;
