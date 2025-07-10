import React, { useState, useEffect } from 'react';
import { Card, Tabs, Table, Button, Space, Typography, Modal, Form, Input, Select, message, Tag, Row, Col, Statistic, Alert } from '@/components/ui';
// TODO: Replace these Ant Design components: InputNumber, Popconfirm, Tooltip, Progress, 
import { DatabaseOutlined, PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, InfoCircleOutlined, ReloadOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@/components/ui';
// TODO: Replace these icons: ClockCircleOutlined
// You may need to find alternatives or create custom icons
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import type { RetentionPolicy, RetentionPolicyConfig, DatabaseStorageInfo } from '@/types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DatabaseManagerProps {
  connectionId?: string;
  database?: string;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  connectionId,
  database,
}) => {
  const { connections, activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(connectionId || activeConnectionId || '');
  const [selectedDatabase, setSelectedDatabase] = useState(database || '');
  const [databases, setDatabases] = useState<string[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [storageInfo, setStorageInfo] = useState<DatabaseStorageInfo | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [form] = Form.useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!selectedConnection) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: selectedConnection,
      });
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      message.error(`加载数据库列表失败: ${error}`);
    }
  };

  // 加载保留策略
  const loadRetentionPolicies = async () => {
    if (!selectedConnection || !selectedDatabase) return;

    setLoading(true);
    try {
      const policies = await safeTauriInvoke<RetentionPolicy[]>('get_retention_policies', {
        connectionId: selectedConnection,
        database: selectedDatabase,
      });
      setRetentionPolicies(policies || []);
    } catch (error) {
      message.error(`加载保留策略失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载存储信息
  const loadStorageInfo = async () => {
    if (!selectedConnection || !selectedDatabase) return;

    try {
      const info = await safeTauriInvoke<DatabaseStorageInfo>('get_storage_analysis_report', {
        connectionId: selectedConnection,
        database: selectedDatabase,
      });
      setStorageInfo(info);
    } catch (error) {
      console.error('加载存储信息失败:', error);
    }
  };

  // 创建保留策略
  const handleCreatePolicy = async (values: any) => {
    try {
      const policyConfig: RetentionPolicyConfig = {
        name: values.name,
        duration: values.duration,
        shardGroupDuration: values.shardGroupDuration,
        replicaN: values.replicaN || 1,
        default: values.default || false,
      };

      await safeTauriInvoke('create_retention_policy', {
        connectionId: selectedConnection,
        database: selectedDatabase,
        policy: policyConfig,
      });

      message.success('保留策略创建成功');
      setShowPolicyModal(false);
      form.resetFields();
      await loadRetentionPolicies();
    } catch (error) {
      message.error(`创建保留策略失败: ${error}`);
    }
  };

  // 更新保留策略
  const handleUpdatePolicy = async (values: any) => {
    if (!editingPolicy) return;

    try {
      await safeTauriInvoke('alter_retention_policy', {
        connectionId: selectedConnection,
        database: selectedDatabase,
        policyName: editingPolicy.name,
        updates: {
          duration: values.duration,
          shardGroupDuration: values.shardGroupDuration,
          replicaN: values.replicaN,
          default: values.default,
        },
      });

      message.success('保留策略更新成功');
      setShowPolicyModal(false);
      setEditingPolicy(null);
      form.resetFields();
      await loadRetentionPolicies();
    } catch (error) {
      message.error(`更新保留策略失败: ${error}`);
    }
  };

  // 删除保留策略
  const handleDeletePolicy = async (policyName: string) => {
    try {
      await safeTauriInvoke('drop_retention_policy', {
        connectionId: selectedConnection,
        database: selectedDatabase,
        policyName,
      });

      message.success('保留策略删除成功');
      await loadRetentionPolicies();
    } catch (error) {
      message.error(`删除保留策略失败: ${error}`);
    }
  };

  // 编辑保留策略
  const handleEditPolicy = (policy: RetentionPolicy) => {
    setEditingPolicy(policy);
    form.setFieldsValue({
      name: policy.name,
      duration: policy.duration,
      shardGroupDuration: policy.shardGroupDuration,
      replicaN: policy.replicationFactor,
      default: policy.default,
    });
    setShowPolicyModal(true);
  };

  // 保留策略表格列
  const policyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: RetentionPolicy) => (
        <Space>
          <Text strong>{name}</Text>
          {record.default && <Tag color="blue">默认</Tag>}
        </Space>
      ),
    },
    {
      title: '保留时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: string) => <Tag color="green">{duration}</Tag>,
    },
    {
      title: '分片组时间',
      dataIndex: 'shardGroupDuration',
      key: 'shardGroupDuration',
      render: (duration: string) => <Tag color="orange">{duration}</Tag>,
    },
    {
      title: '副本数',
      dataIndex: 'replicationFactor',
      key: 'replicationFactor',
      width: 80,
      align: 'center' as const,
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: RetentionPolicy) => (
        <Space>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditPolicy(record)}
              size="small"
            />
          </Tooltip>
          {!record.default && (
            <Tooltip title="删除">
              <Popconfirm
                title="确定删除这个保留策略吗？"
                onConfirm={() => handleDeletePolicy(record.name)}
              >
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 格式化字节数
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  };

  useEffect(() => {
    if (selectedConnection) {
      loadDatabases();
    }
  }, [selectedConnection]);

  useEffect(() => {
    if (selectedConnection && selectedDatabase) {
      loadRetentionPolicies();
      loadStorageInfo();
    }
  }, [selectedConnection, selectedDatabase]);

  return (
    <div style={{ padding: '16px' }}>
      {/* 工具栏 */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                <DatabaseOutlined /> 数据库管理
              </Title>
              <Select
                placeholder="选择连接"
                value={selectedConnection}
                onChange={setSelectedConnection}
                style={{ width: 200 }}
              >
                {connections.map(conn => (
                  <Select.Option key={conn.id} value={conn.id}>
                    {conn.name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="选择数据库"
                value={selectedDatabase}
                onChange={setSelectedDatabase}
                style={{ width: 200 }}
              >
                {databases.map(db => (
                  <Select.Option key={db} value={db}>
                    {db}
                  </Select.Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadRetentionPolicies();
                loadStorageInfo();
              }}
              loading={loading}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 存储概览 */}
      {storageInfo && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="数据库大小"
                value={formatBytes(storageInfo.size)}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="测量数量"
                value={storageInfo.measurementCount}
                prefix={<SettingOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="序列数量"
                value={storageInfo.seriesCount.toLocaleString()}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="压缩比"
                value={storageInfo.compressionRatio}
                suffix=":1"
                precision={2}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 管理标签页 */}
      <Tabs
        items={[
          {
            key: 'retention',
            label: (
              <Space>
                <ClockCircleOutlined />
                保留策略
              </Space>
            ),
            children: (
              <Card
                title="保留策略管理"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingPolicy(null);
                      form.resetFields();
                      setShowPolicyModal(true);
                    }}
                    disabled={!selectedDatabase}
                  >
                    新建策略
                  </Button>
                }
              >
                <Table
                  columns={policyColumns}
                  dataSource={retentionPolicies}
                  rowKey="name"
                  loading={loading}
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'storage',
            label: (
              <Space>
                <InfoCircleOutlined />
                存储分析
              </Space>
            ),
            children: (
              <Card title="存储分析报告">
                {storageInfo ? (
                  <div>
                    <Alert
                      message="存储统计"
                      description={`数据库 ${selectedDatabase} 包含 ${storageInfo.measurementCount} 个测量，${storageInfo.seriesCount.toLocaleString()} 个序列，总大小 ${formatBytes(storageInfo.size)}`}
                      type="info"
                      style={{ marginBottom: 16 }}
                    />
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Card size="small" title="数据时间范围">
                          <p><strong>最早数据:</strong> {new Date(storageInfo.oldestPoint).toLocaleString()}</p>
                          <p><strong>最新数据:</strong> {new Date(storageInfo.newestPoint).toLocaleString()}</p>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size="small" title="压缩效果">
                          <Progress
                            percent={Math.round((1 - 1/storageInfo.compressionRatio) * 100)}
                            format={percent => `节省 ${percent}%`}
                            status="success"
                          />
                          <p style={{ marginTop: 8 }}>
                            <Text type="secondary">压缩比: {storageInfo.compressionRatio.toFixed(2)}:1</Text>
                          </p>
                        </Card>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <Alert
                    message="暂无存储信息"
                    description="请选择数据库以查看存储分析报告"
                    type="warning"
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      {/* 保留策略模态框 */}
      <Modal
        title={editingPolicy ? '编辑保留策略' : '新建保留策略'}
        open={showPolicyModal}
        onOk={() => form.submit()}
        onCancel={() => {
          setShowPolicyModal(false);
          setEditingPolicy(null);
          form.resetFields();
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
        >
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input 
              placeholder="输入策略名称" 
              disabled={!!editingPolicy}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="duration"
                label="保留时间"
                rules={[{ required: true, message: '请输入保留时间' }]}
              >
                <Input placeholder="例如: 30d, 1w, 1h" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="shardGroupDuration"
                label="分片组时间"
              >
                <Input placeholder="例如: 1d, 1h (可选)" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="replicaN"
                label="副本数"
                initialValue={1}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="default"
                valuePropName="checked"
                label="设为默认策略"
              >
                <input type="checkbox" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DatabaseManager;
