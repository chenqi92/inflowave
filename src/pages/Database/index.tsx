import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Spin,
  Select,
  Descriptions,
  Statistic,
  Row,
  Col,
  Alert,
} from 'antd';
import {
  DatabaseOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '@/store/connection';
import type { RetentionPolicy } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

interface DatabaseStats {
  name: string;
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
  lastUpdate: Date;
}

const Database: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) {
      return;
    }

    setLoading(true);
    try {
      const dbList = await invoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList);

      // 如果有数据库且没有选中的，选择第一个
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      message.error(`加载数据库列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载数据库详细信息
  const loadDatabaseDetails = async (database: string) => {
    if (!activeConnectionId || !database) return;

    setLoading(true);
    try {
      // 并行加载测量、保留策略和统计信息
      const [measurementList, retentionPolicyList, stats] = await Promise.all([
        invoke<string[]>('get_measurements', {
          connectionId: activeConnectionId,
          database,
        }).catch(() => []),
        invoke<RetentionPolicy[]>('get_retention_policies', {
          connectionId: activeConnectionId,
          database,
        }).catch(() => []),
        invoke<DatabaseStats>('get_database_stats', {
          connectionId: activeConnectionId,
          database,
        }).catch(() => null),
      ]);

      setMeasurements(measurementList);
      setRetentionPolicies(retentionPolicyList);
      setDatabaseStats(stats);
    } catch (error) {
      message.error(`加载数据库详细信息失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建数据库
  const createDatabase = async (values: any) => {
    if (!activeConnectionId) {
      message.warning('请先选择一个连接');
      return;
    }

    try {
      await invoke('create_database', {
        connectionId: activeConnectionId,
        config: {
          name: values.name,
          retentionPolicy: values.retentionPolicy,
        },
      });

      message.success('数据库创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      await loadDatabases();
    } catch (error) {
      message.error(`创建数据库失败: ${error}`);
    }
  };

  // 删除数据库
  const deleteDatabase = async (database: string) => {
    if (!activeConnectionId) {
      message.warning('请先选择一个连接');
      return;
    }

    try {
      await invoke('drop_database', {
        connectionId: activeConnectionId,
        database,
      });

      message.success('数据库删除成功');

      // 如果删除的是当前选中的数据库，清空选择
      if (selectedDatabase === database) {
        setSelectedDatabase('');
        setMeasurements([]);
        setRetentionPolicies([]);
        setDatabaseStats(null);
      }

      await loadDatabases();
    } catch (error) {
      message.error(`删除数据库失败: ${error}`);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 选中数据库变化时加载详细信息
  useEffect(() => {
    if (selectedDatabase) {
      loadDatabaseDetails(selectedDatabase);
    }
  }, [selectedDatabase]);

  if (!activeConnectionId) {
    return (
      <div className="p-6">
        <Alert
          message="请先连接到 InfluxDB"
          description="在连接管理页面选择一个连接并激活后，才能管理数据库。"
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            <Button size="small" type="primary">
              去连接
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2}>数据库管理</Title>
          <Text type="secondary">
            管理 InfluxDB 数据库、测量和保留策略
          </Text>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadDatabases}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建数据库
          </Button>
        </Space>
      </div>

      {/* 数据库选择器 */}
      <Card className="mb-6">
        <div className="flex items-center space-x-4">
          <Text strong>选择数据库:</Text>
          <Select
            style={{ width: 200 }}
            placeholder="选择数据库"
            value={selectedDatabase}
            onChange={setSelectedDatabase}
            loading={loading}
          >
            {databases.map(db => (
              <Option key={db} value={db}>
                <Space>
                  <DatabaseOutlined />
                  {db}
                </Space>
              </Option>
            ))}
          </Select>
          {selectedDatabase && (
            <Popconfirm
              title="确定要删除这个数据库吗？"
              description="删除后数据将无法恢复！"
              onConfirm={() => deleteDatabase(selectedDatabase)}
              okText="确定"
              cancelText="取消"
              okType="danger"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除数据库
              </Button>
            </Popconfirm>
          )}
        </div>
      </Card>

      {selectedDatabase && (
        <>
          {/* 数据库统计信息 */}
          {databaseStats && (
            <Card title="数据库统计" className="mb-6">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="测量数量"
                    value={databaseStats.measurementCount}
                    prefix={<BarChartOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="序列数量"
                    value={databaseStats.seriesCount}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="数据点数量"
                    value={databaseStats.pointCount}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="磁盘使用"
                    value={databaseStats.diskSize}
                    suffix="MB"
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* 测量列表 */}
          <Card title="测量列表" className="mb-6">
            <Spin spinning={loading}>
              <Table
                dataSource={measurements.map(m => ({ name: m }))}
                rowKey="name"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 个测量`,
                }}
                locale={{
                  emptyText: '暂无测量数据',
                }}
              >
                <Table.Column
                  title="测量名称"
                  dataIndex="name"
                  key="name"
                  render={(name: string) => (
                    <Space>
                      <BarChartOutlined />
                      <Text strong>{name}</Text>
                    </Space>
                  )}
                />
                <Table.Column
                  title="操作"
                  key="actions"
                  width={150}
                  render={(_, record: { name: string }) => (
                    <Space>
                      <Tooltip title="查看详情">
                        <Button
                          type="text"
                          icon={<InfoCircleOutlined />}
                          onClick={() => message.info('查看测量详情功能开发中...')}
                        />
                      </Tooltip>
                      <Popconfirm
                        title="确定要删除这个测量吗？"
                        onConfirm={() => message.info('删除测量功能开发中...')}
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
                  )}
                />
              </Table>
            </Spin>
          </Card>

          {/* 保留策略 */}
          <Card title="保留策略">
            <Spin spinning={loading}>
              <Table
                dataSource={retentionPolicies}
                rowKey="name"
                pagination={false}
                locale={{
                  emptyText: '暂无保留策略',
                }}
              >
                <Table.Column
                  title="策略名称"
                  dataIndex="name"
                  key="name"
                  render={(name: string, record: RetentionPolicy) => (
                    <Space>
                      <Text strong>{name}</Text>
                      {record.default && <Tag color="blue">默认</Tag>}
                    </Space>
                  )}
                />
                <Table.Column
                  title="保留时间"
                  dataIndex="duration"
                  key="duration"
                />
                <Table.Column
                  title="分片组时间"
                  dataIndex="shardGroupDuration"
                  key="shardGroupDuration"
                />
                <Table.Column
                  title="副本数"
                  dataIndex="replicaN"
                  key="replicaN"
                />
                <Table.Column
                  title="操作"
                  key="actions"
                  width={100}
                  render={(_, record: RetentionPolicy) => (
                    <Space>
                      <Tooltip title="编辑">
                        <Button
                          type="text"
                          icon={<InfoCircleOutlined />}
                          onClick={() => message.info('编辑保留策略功能开发中...')}
                        />
                      </Tooltip>
                      {!record.default && (
                        <Popconfirm
                          title="确定要删除这个保留策略吗？"
                          onConfirm={() => message.info('删除保留策略功能开发中...')}
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
                      )}
                    </Space>
                  )}
                />
              </Table>
            </Spin>
          </Card>
        </>
      )}

      {/* 创建数据库模态框 */}
      <Modal
        title="创建数据库"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createDatabase}
        >
          <Form.Item
            label="数据库名称"
            name="name"
            rules={[
              { required: true, message: '请输入数据库名称' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '数据库名称只能包含字母、数字和下划线，且不能以数字开头' },
            ]}
          >
            <Input placeholder="请输入数据库名称" />
          </Form.Item>

          <Form.Item
            label="默认保留策略"
            name="retentionPolicy"
            tooltip="可选，如果不指定将使用系统默认策略"
          >
            <Input placeholder="例如: autogen" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Database;
