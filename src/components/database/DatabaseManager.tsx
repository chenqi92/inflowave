import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Typography, Form, Input, Select, Tag, Row, Col, Statistic, Alert, InputNumber, Progress } from '@/components/ui';
// TODO: Replace these Ant Design components: Popconfirm, Tooltip
import { Card, Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Database, Plus, Edit, Trash2, Settings, Info, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import type { RetentionPolicy, RetentionPolicyConfig, DatabaseStorageInfo } from '@/types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface DatabaseManagerProps {
  connectionId?: string;
  database?: string;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  connectionId,
  database}) => {
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
      // 首先验证连接是否在后端存在
      const backendConnections = await safeTauriInvoke<any[]>('get_connections');
      const backendConnection = backendConnections?.find((c: any) => c.id === selectedConnection);
      
      if (!backendConnection) {
        console.warn(`⚠️ 连接 ${selectedConnection} 在后端不存在，尝试重新创建...`);
        
        // 从前端获取连接配置
        const connection = connections.find(c => c.id === selectedConnection);
        if (connection) {
          try {
            // 重新创建连接到后端
            const connectionWithTimestamp = {
              ...connection,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            const newConnectionId = await safeTauriInvoke<string>('create_connection', { config: connectionWithTimestamp });
            console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);
            
            // 如果ID发生变化，需要通知用户
            if (newConnectionId !== selectedConnection) {
              showMessage.warning('连接配置已重新同步，请刷新页面或重新选择连接');
              return;
            }
          } catch (createError) {
            console.error(`❌ 重新创建连接失败:`, createError);
            showMessage.error(`连接 ${selectedConnection} 不存在且重新创建失败`);
            return;
          }
        } else {
          console.error(`❌ 前端也没有找到连接 ${selectedConnection} 的配置`);
          showMessage.error(`连接配置不存在: ${selectedConnection}`);
          return;
        }
      }

      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: selectedConnection});
      setDatabases(dbList || []);
      if (dbList && dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      console.error(`❌ 加载数据库列表失败:`, error);
      
      // 如果是连接不存在的错误，显示更友好的消息
      const errorStr = String(error);
      if (errorStr.includes('连接') && errorStr.includes('不存在')) {
        showMessage.error(`连接不存在，请检查连接配置: ${selectedConnection}`);
      } else {
        showMessage.error(`加载数据库列表失败: ${error}`);
      }
    }
  };

  // 加载保留策略
  const loadRetentionPolicies = async () => {
    if (!selectedConnection || !selectedDatabase) return;

    setLoading(true);
    try {
      const policies = await safeTauriInvoke<RetentionPolicy[]>('get_retention_policies', {
        connectionId: selectedConnection,
        database: selectedDatabase});
      setRetentionPolicies(policies || []);
    } catch (error) {
      showMessage.error(`加载保留策略失败: ${error}`);
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
        database: selectedDatabase});
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
        default: values.default || false};

      await safeTauriInvoke('create_retention_policy', {
        connectionId: selectedConnection,
        database: selectedDatabase,
        policy: policyConfig});

      showMessage.success('保留策略创建成功');
      setShowPolicyModal(false);
      form.resetFields();
      await loadRetentionPolicies();
    } catch (error) {
      showMessage.error(`创建保留策略失败: ${error}`);
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
          default: values.default}});

      showMessage.success('保留策略更新成功');
      setShowPolicyModal(false);
      setEditingPolicy(null);
      form.resetFields();
      await loadRetentionPolicies();
    } catch (error) {
      showMessage.error(`更新保留策略失败: ${error}`);
    }
  };

  // 删除保留策略
  const handleDeletePolicy = async (policyName: string) => {
    try {
      await safeTauriInvoke('drop_retention_policy', {
        connectionId: selectedConnection,
        database: selectedDatabase,
        policyName});

      showMessage.success('保留策略删除成功');
      await loadRetentionPolicies();
    } catch (error) {
      showMessage.error(`删除保留策略失败: ${error}`);
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
      default: policy.default});
    setShowPolicyModal(true);
  };

  // 保留策略表格列
  const policyColumns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: RetentionPolicy) => (
        <div className="flex gap-2">
          <Text strong>{name}</Text>
          {record.default && <Tag color="blue">默认</Tag>}
        </div>
      )},
    {
      title: '保留时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: string) => <Tag color="green">{duration}</Tag>},
    {
      title: '分片组时间',
      dataIndex: 'shardGroupDuration',
      key: 'shardGroupDuration',
      render: (duration: string) => <Tag color="orange">{duration}</Tag>},
    {
      title: '副本数',
      dataIndex: 'replicationFactor',
      key: 'replicationFactor',
      width: 80,
      align: 'center' as const},
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: RetentionPolicy) => (
        <div className="flex gap-2">
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<Edit className="w-4 h-4"  />}
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
                  icon={<Trash2 className="w-4 h-4"  />}
                  danger
                  size="small"
                />
              </Popconfirm>
            </Tooltip>
          )}
        </div>
      )},
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
            <div className="flex gap-2">
              <Title level={4} style={{ margin: 0 }}>
                <Database className="w-4 h-4"  /> 数据库管理
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
            </div>
          </Col>
          <Col>
            <Button
              icon={<RefreshCw className="w-4 h-4"  />}
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
                prefix={<Database className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="测量数量"
                value={storageInfo.measurementCount}
                prefix={<Settings className="w-4 h-4"  />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="序列数量"
                value={storageInfo.seriesCount.toLocaleString()}
                prefix={<Info className="w-4 h-4"  />}
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
                prefix={<CheckCircle />}
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
              <div className="flex gap-2">
                <Clock className="w-4 h-4"  />
                保留策略
              </div>
            ),
            children: (
              <Card
                title="保留策略管理"
                extra={
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4"  />}
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
            )},
          {
            key: 'storage',
            label: (
              <div className="flex gap-2">
                <Info className="w-4 h-4"  />
                存储分析
              </div>
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
            )},
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
