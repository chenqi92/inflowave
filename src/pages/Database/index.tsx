import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  DataTable,
  Button,
  Tag,
  Form,
  Input,
  Spin,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Statistic,
  Row,
  Col,
  Alert,
  Popconfirm,
  Tooltip,
  TooltipProvider,
  Descriptions,
  DescriptionsItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Typography
} from '@/components/ui';
import { useToast, toast } from '@/hooks/use-toast';
import { Database as DatabaseIcon, Plus, Trash2, Info, RefreshCw, BarChart, Edit, AlertCircle } from 'lucide-react';
import { Modal } from '@/utils/modalAdapter';
import '@/styles/database-management.css';

import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import ContextMenu from '@/components/common/ContextMenu';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import DatabaseContextMenu from '@/components/database/DatabaseContextMenu';
import TableContextMenu from '@/components/database/TableContextMenu';
import type { RetentionPolicy } from '@/types';
import { useNavigate } from 'react-router-dom';

const { Text } = Typography;

// 生成图表查询的辅助函数
const generateChartQuery = (params: any): string => {
  const { database, measurement, chartType } = params;

  switch (chartType) {
    case 'timeSeries':
      return `SELECT * FROM "${measurement}" WHERE time >= now() - 1h ORDER BY time DESC`;
    case 'fieldDistribution':
      return `SELECT * FROM "${measurement}" WHERE time >= now() - 24h ORDER BY time DESC LIMIT 1000`;
    case 'tagStats':
      return `SELECT COUNT(*) FROM "${measurement}" WHERE time >= now() - 24h GROUP BY *`;
    default:
      return `SELECT * FROM "${measurement}" WHERE time >= now() - 1h ORDER BY time DESC LIMIT 100`;
  }
};

const generateFieldChartQuery = (params: any): string => {
  const { database, measurement, field, chartType } = params;

  switch (chartType) {
    case 'timeSeries':
      return `SELECT time, "${field}" FROM "${measurement}" WHERE time >= now() - 1h ORDER BY time DESC`;
    case 'histogram':
      return `SELECT "${field}" FROM "${measurement}" WHERE time >= now() - 24h AND "${field}" IS NOT NULL LIMIT 10000`;
    case 'boxplot':
      return `SELECT MIN("${field}"), MAX("${field}"), MEAN("${field}"), PERCENTILE("${field}", 25), PERCENTILE("${field}", 75) FROM "${measurement}" WHERE time >= now() - 24h`;
    default:
      return `SELECT time, "${field}" FROM "${measurement}" WHERE time >= now() - 1h ORDER BY time DESC`;
  }
};

const generateTagChartQuery = (params: any): string => {
  const { database, measurement, tagKey, chartType } = params;

  switch (chartType) {
    case 'distribution':
      return `SELECT COUNT(*) FROM "${measurement}" WHERE time >= now() - 24h GROUP BY "${tagKey}"`;
    default:
      return `SELECT COUNT(*) FROM "${measurement}" WHERE time >= now() - 24h GROUP BY "${tagKey}"`;
  }
};

interface DatabaseStats {
  name: string;
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
  lastUpdate: Date;
}

const Database: React.FC = () => {
  const { toast } = useToast();
  const { activeConnectionId } = useConnectionStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [retentionPolicyDialog, setRetentionPolicyDialog] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    policy?: RetentionPolicy;
  }>({
    visible: false,
    mode: 'create',
    policy: undefined});
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    target: null});
  const [deleteMeasurementParams, setDeleteMeasurementParams] = useState<any>(null);
  const form = useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) {
      return;
    }

    setLoading(true);
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', { connectionId: activeConnectionId});
      setDatabases(Array.isArray(dbList) ? dbList : []);

      // 如果有数据库且没有选中的，选择第一个
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      toast({ title: "错误", description: "加载数据库列表失败: ${error}", variant: "destructive" });
      // Reset databases to prevent null/undefined errors
      setDatabases([]);
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
        safeTauriInvoke<string[]>('get_measurements', { connection_id: activeConnectionId,
          database}).catch(() => []),
        safeTauriInvoke<RetentionPolicy[]>('get_retention_policies', { connection_id: activeConnectionId,
          database}).catch(() => []),
        safeTauriInvoke<DatabaseStats>('get_database_stats', { connection_id: activeConnectionId,
          database}).catch(() => null),
      ]);

      setMeasurements(Array.isArray(measurementList) ? measurementList : []);
      setRetentionPolicies(Array.isArray(retentionPolicyList) ? retentionPolicyList : []);
      setDatabaseStats(stats);
    } catch (error) {
      toast({ title: "错误", description: "加载数据库详细信息失败: ${error}", variant: "destructive" });
      // Reset arrays to prevent null/undefined errors
      setMeasurements([]);
      setRetentionPolicies([]);
      setDatabaseStats(null);
    } finally {
      setLoading(false);
    }
  };

  // 创建数据库
  const createDatabase = async (values: any) => {
    if (!activeConnectionId) {
      toast({ title: "警告", description: "请先选择一个连接" });
      return;
    }

    try {
      await safeTauriInvoke('create_database', { connection_id: activeConnectionId,
        config: {
          name: values.name,
          retentionPolicy: values.retentionPolicy}});

      toast({ title: "成功", description: "数据库创建成功" });
      setCreateModalVisible(false);
      form.reset();
      await loadDatabases();
    } catch (error) {
      toast({ title: "错误", description: "创建数据库失败: ${error}", variant: "destructive" });
    }
  };

  // 删除测量
  const deleteMeasurement = async () => {
    if (!deleteMeasurementParams || !activeConnectionId) return;

    try {
      await safeTauriInvoke('drop_measurement', { connection_id: activeConnectionId,
        database: deleteMeasurementParams.database,
        measurement: deleteMeasurementParams.measurement});
      toast({ title: "成功", description: `测量 "${deleteMeasurementParams.measurement}" 删除成功` });
      loadDatabaseDetails(selectedDatabase);
      setDeleteMeasurementParams(null);
    } catch (error) {
      toast({ title: "错误", description: `删除测量失败: ${error}`, variant: "destructive" });
    }
  };

  // 删除数据库
  const deleteDatabase = async (database: string) => {
    if (!activeConnectionId) {
      toast({ title: "警告", description: "请先选择一个连接" });
      return;
    }

    try {
      await safeTauriInvoke('drop_database', { connection_id: activeConnectionId,
        database});

      toast({ title: "成功", description: "数据库删除成功" });

      // 如果删除的是当前选中的数据库，清空选择
      if (selectedDatabase === database) {
        setSelectedDatabase('');
        setMeasurements([]);
        setRetentionPolicies([]);
        setDatabaseStats(null);
      }

      await loadDatabases();
    } catch (error) {
      toast({ title: "错误", description: "删除数据库失败: ${error}", variant: "destructive" });
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
          icon={<AlertCircle />}
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
    <TooltipProvider>
      <div className="p-6 database-management">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Typography variant="h2" className="text-2xl font-bold mb-1">数据库管理</Typography>
          <p className="text-muted-foreground">
            管理 InfluxDB 数据库、测量和保留策略
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            icon={<RefreshCw className="w-4 h-4"  />}
            onClick={loadDatabases}
            disabled={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4"  />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建数据库
          </Button>
        </div>
      </div>

      {/* 数据库选择器 */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Typography.Text className="font-semibold text-base">选择数据库:</Typography.Text>
          <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="选择数据库" />
            </SelectTrigger>
            <SelectContent>
              {(databases || []).map(db => (
                <SelectItem key={db} value={db}>
                  <DatabaseContextMenu
                    databaseName={db}
                    onAction={(action, dbName) => {
                      console.log('数据库操作:', action, dbName);
                      // 根据操作类型执行相应的处理
                      if (action === 'refresh_database') {
                        loadDatabaseDetails(dbName);
                      } else if (action === 'drop_database') {
                        loadDatabases(); // 重新加载数据库列表
                      }
                    }}
                  >
                    <div className="flex gap-2">
                      <DatabaseIcon className="w-4 h-4"  />
                      {db}
                    </div>
                  </DatabaseContextMenu>
                </SelectItem>
              ))}
            </SelectContent>
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
              <Button danger icon={<Trash2 className="w-4 h-4"  />}>
                删除数据库
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {selectedDatabase && (
        <>
          {/* 数据库统计信息 */}
          {databaseStats && (
            <div className="mb-6">
              <div>
                <h3>数据库统计</h3>
              </div>
              <div>
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="测量数量"
                      value={databaseStats.measurementCount}
                      prefix={<BarChart className="w-4 h-4"  />}
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
              </div>
            </div>
          )}

          {/* 测量列表 */}
          <div className="mb-6">
            <div>
              <h3>测量列表</h3>
            </div>
            <div>
              <Spin spinning={loading}>
              <DataTable
                dataSource={measurements?.map(m => ({ name: m })) || []}
                columns={[
                  {
                    title: '测量名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string) => (
                      <TableContextMenu
                        tableName={name}
                        databaseName={selectedDatabase}
                        onAction={(action, tableName) => {
                          console.log('表操作:', action, tableName);
                          // 根据操作类型执行相应的处理
                          if (action === 'view_data') {
                            // 跳转到查询页面并执行查看数据的查询
                            navigate('/query', {
                              state: {
                                query: `SELECT * FROM "${tableName}" LIMIT 100`,
                                database: selectedDatabase
                              }
                            });
                          } else if (action === 'refresh_table') {
                            loadDatabaseDetails(selectedDatabase);
                          }
                        }}
                      >
                        <div className="flex gap-2">
                          <BarChart className="w-4 h-4"  />
                          <Typography.Text className="font-semibold">{name}</Typography.Text>
                        </div>
                      </TableContextMenu>
                    )},
                  {
                    title: '操作',
                    key: 'actions',
                    width: 180,
                    render: (_, record: { name: string }) => (
                      <div className="flex gap-2">
                        <Tooltip title="查看详情">
                          <Button
                            type="text"
                            icon={<Info className="w-4 h-4"  />}
                            onClick={() => toast({ title: "信息", description: "查看测量详情功能开发中..." })}
                          />
                        </Tooltip>
                        <Popconfirm
                          title="确定要删除这个测量吗？"
                          onConfirm={() => toast({ title: "信息", description: "删除测量功能开发中..." })}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Tooltip title="删除">
                            <Button
                              type="text"
                              danger
                              icon={<Trash2 className="w-4 h-4"  />}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </div>
                    )},
                ]}
                rowKey="name"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: true,
                  showTotal: (total) => `共 ${total} 个测量`}}
                locale={{
                  emptyText: '暂无测量数据'}}
                onRow={(record) => ({
                  onContextMenu: (event) => {
                    event.preventDefault();
                    setContextMenu({
                      visible: true,
                      x: event.clientX,
                      y: event.clientY,
                      target: {
                        type: 'measurement',
                        name: record.name,
                        database: selectedDatabase}});
                  }})}
              />
              </Spin>
            </div>
          </div>

          {/* 保留策略 */}
          <div>
            <div>
              <div className="flex items-center justify-between">
                <h3>保留策略</h3>
                <Button
                  type="primary"
                  icon={<Plus className="w-4 h-4"  />}
                  onClick={() => setRetentionPolicyDialog({
                    visible: true,
                    mode: 'create',
                    policy: undefined})}
                >
                  创建策略
                </Button>
              </div>
            </div>
            <div>
              <Spin spinning={loading}>
              <Table
                dataSource={Array.isArray(retentionPolicies) ? retentionPolicies : []}
                columns={[
                  {
                    title: '策略名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (name: string, record: RetentionPolicy) => (
                      <div className="flex gap-2">
                        <Typography.Text className="font-semibold">{name}</Typography.Text>
                        {record.default && <Tag color="blue">默认</Tag>}
                      </div>
                    )},
                  {
                    title: '保留时间',
                    dataIndex: 'duration',
                    key: 'duration'},
                  {
                    title: '分片组时间',
                    dataIndex: 'shardGroupDuration',
                    key: 'shardGroupDuration'},
                  {
                    title: '副本数',
                    dataIndex: 'replicaN',
                    key: 'replicaN'},
                  {
                    title: '操作',
                    key: 'actions',
                    width: 120,
                    render: (_, record: RetentionPolicy) => (
                      <div className="flex gap-2">
                        <Tooltip title="编辑">
                          <Button
                            type="text"
                            icon={<Edit className="w-4 h-4"  />}
                            onClick={() => setRetentionPolicyDialog({
                              visible: true,
                              mode: 'edit',
                              policy: record})}
                          />
                        </Tooltip>
                        {!record.default && (
                          <Popconfirm
                            title="确定要删除这个保留策略吗？"
                            description="删除后数据将无法恢复！"
                            onConfirm={async () => {
                              try {
                                await safeTauriInvoke('drop_retention_policy', { connection_id: activeConnectionId,
                                  database: selectedDatabase,
                                  policyName: record.name});
                                toast.success(`保留策略 "${record.name}" 删除成功`);
                                loadDatabaseDetails(selectedDatabase);
                              } catch (error) {
                                toast({ title: "错误", description: "删除保留策略失败: ${error}", variant: "destructive" });
                              }
                            }}
                            okText="确定"
                            cancelText="取消"
                            okType="danger"
                          >
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                danger
                                icon={<Trash2 className="w-4 h-4"  />}
                              />
                            </Tooltip>
                          </Popconfirm>
                        )}
                      </div>
                    )},
                ]}
                rowKey="name"
                pagination={false}
                locale={{
                  emptyText: '暂无保留策略'}}
              />
              </Spin>
            </div>
          </div>
        </>
      )}

      {/* 上下文菜单处理函数 */}
      {React.useMemo(() => {
        const handleContextMenuAction = async (action: string, params?: any) => {
          setContextMenu({ visible: false, x: 0, y: 0, target: null });

          try {
            switch (action) {
              case 'showMeasurements':
                // 已经在当前页面显示
                toast({ title: "信息", description: "测量列表已在当前页面显示" });
                break;

              case 'showRetentionPolicies':
                // 已经在当前页面显示
                toast({ title: "信息", description: "保留策略已在当前页面显示" });
                break;

              case 'showDatabaseInfo':
                // 显示数据库详细信息对话框
                Modal.info({
                  title: `数据库信息 - ${params.database}`,
                  width: 600,
                  content: (
                    <div className="space-y-4">
                      <Descriptions column={1} bordered size="small">
                        <DescriptionsItem label="数据库名称">{params.database}</DescriptionsItem>
                        <DescriptionsItem label="测量数量">{measurements.length}</DescriptionsItem>
                        <DescriptionsItem label="保留策略数量">{retentionPolicies.length}</DescriptionsItem>
                        {databaseStats && (
                          <>
                            <DescriptionsItem label="序列数量">{databaseStats.seriesCount}</DescriptionsItem>
                            <DescriptionsItem label="数据点数量">{databaseStats.pointCount}</DescriptionsItem>
                            <DescriptionsItem label="磁盘使用">{databaseStats.diskSize} MB</DescriptionsItem>
                          </>
                        )}
                      </Descriptions>
                    </div>
                  )});
                break;

              case 'showDatabaseStats':
                // 显示数据库统计信息
                if (databaseStats) {
                  Modal.info({
                    title: `数据库统计 - ${params.database}`,
                    width: 700,
                    content: (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic title="测量数量" value={databaseStats.measurementCount} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="序列数量" value={databaseStats.seriesCount} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="数据点数量" value={databaseStats.pointCount} />
                        </Col>
                        <Col span={12}>
                          <Statistic title="磁盘使用" value={databaseStats.diskSize} suffix="MB" />
                        </Col>
                      </Row>
                    )});
                } else {
                  toast({ title: "信息", description: "正在加载数据库统计信息..." });
                  loadDatabaseDetails(params.database);
                }
                break;

              case 'exportDatabaseStructure':
                // 导出数据库结构
                try {
                  const structure = {
                    database: params.database,
                    measurements,
                    retentionPolicies,
                    exportTime: new Date().toISOString()};

                  const dataStr = JSON.stringify(structure, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${params.database}_structure.json`;
                  link.click();
                  URL.revokeObjectURL(url);

                  toast({ title: "成功", description: "数据库结构导出成功" });
                } catch (error) {
                  toast({ title: "错误", description: "导出失败: ${error}", variant: "destructive" });
                }
                break;

              case 'deleteDatabase':
                Modal.confirm({
                  title: '确认删除数据库',
                  content: `确定要删除数据库 "${params.database}" 吗？此操作不可撤销！`,
                  okText: '删除',
                  okType: 'danger',
                  cancelText: '取消',
                  closable: true,
                  keyboard: true,
                  maskClosable: true,
                  onOk: () => deleteDatabase(params.database),
                  onCancel: () => {
                    // 明确处理取消操作
                  }});
                break;

              case 'previewData':
                // 预览测量数据
                try {
                  let query = `SELECT * FROM "${params.measurement}"`;

                  if (params.timeRange) {
                    query += ` WHERE time >= now() - ${params.timeRange}`;
                  }

                  if (params.limit) {
                    query += ` LIMIT ${params.limit}`;
                  }

                  if (params.orderBy) {
                    query += ` ORDER BY ${params.orderBy}`;
                  }

                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  // 在新窗口或对话框中显示结果
                  Modal.info({
                    title: `数据预览 - ${params.measurement}`,
                    width: 1000,
                    content: (
                      <div>
                        <span className="text-muted-foreground">查询: {query}</span>
                        <div className="mt-4">
                          {/* 这里可以添加一个简单的表格来显示结果 */}
                          <pre className="bg-muted p-4 rounded max-h-96 overflow-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "数据预览失败: ${error}", variant: "destructive" });
                }
                break;

              case 'showFields':
                // 查看字段信息
                try {
                  const fields = await safeTauriInvoke('get_field_keys', { connection_id: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement});

                  Modal.info({
                    title: `字段信息 - ${params.measurement}`,
                    width: 600,
                    content: (
                      <div>
                        <Text strong>字段列表:</Text>
                        <ul className="mt-2">
                          {Array.isArray(fields) ? fields.map((field: any, index: number) => (
                            <li key={index} className="py-1">
                              <Text code>{field.fieldKey || field}</Text>
                              {field.fieldType && <Text type="secondary"> ({field.fieldType})</Text>}
                            </li>
                          )) : (
                            <li><Text type="secondary">无字段信息</Text></li>
                          )}
                        </ul>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取字段信息失败: ${error}", variant: "destructive" });
                }
                break;

              case 'showTagKeys':
                // 查看标签键
                try {
                  const tagKeys = await safeTauriInvoke('get_tag_keys', { connectionId: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement});

                  Modal.info({
                    title: `标签键 - ${params.measurement}`,
                    width: 500,
                    content: (
                      <div>
                        <Text strong>标签键列表:</Text>
                        <ul className="mt-2">
                          {Array.isArray(tagKeys) ? tagKeys.map((tagKey: string, index: number) => (
                            <li key={index} className="py-1">
                              <Text code>{tagKey}</Text>
                            </li>
                          )) : (
                            <li><Text type="secondary">无标签键</Text></li>
                          )}
                        </ul>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取标签键失败: ${error}", variant: "destructive" });
                }
                break;

              case 'showTagValues':
                // 查看标签值
                try {
                  const tagKeys = await safeTauriInvoke('get_tag_keys', { connectionId: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement});

                  if (!Array.isArray(tagKeys) || tagKeys.length === 0) {
                    toast({ title: "信息", description: "该测量没有标签键" });
                    return;
                  }

                  // 获取第一个标签键的值作为示例
                  const tagValues = await safeTauriInvoke('get_tag_values', { connection_id: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement,
                    tagKey: tagKeys[0]});

                  Modal.info({
                    title: `标签值 - ${params.measurement}`,
                    width: 600,
                    content: (
                      <div>
                        <Text strong>标签键 "{tagKeys[0]}" 的值:</Text>
                        <ul className="mt-2 max-h-64 overflow-auto">
                          {Array.isArray(tagValues) ? tagValues.map((tagValue: string, index: number) => (
                            <li key={index} className="py-1">
                              <Text code>{tagValue}</Text>
                            </li>
                          )) : (
                            <li><Text type="secondary">无标签值</Text></li>
                          )}
                        </ul>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取标签值失败: ${error}", variant: "destructive" });
                }
                break;

              case 'showSeries':
                // 查看序列信息
                try {
                  const query = `SHOW SERIES FROM "${params.measurement}"`;
                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  Modal.info({
                    title: `序列信息 - ${params.measurement}`,
                    width: 800,
                    content: (
                      <div>
                        <span className="text-muted-foreground">查询: {query}</span>
                        <div className="mt-4">
                          <pre className="bg-muted p-4 rounded max-h-96 overflow-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取序列信息失败: ${error}", variant: "destructive" });
                }
                break;

              case 'getRecordCount':
                // 获取记录总数
                try {
                  const query = `SELECT COUNT(*) FROM "${params.measurement}"`;
                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  Modal.info({
                    title: `记录统计 - ${params.measurement}`,
                    content: (
                      <div>
                        <Statistic
                          title="总记录数"
                          value={result.rowCount || 0}
                          prefix={<DatabaseIcon className="w-4 h-4"  />}
                        />
                        <div className="mt-4">
                          <span className="text-muted-foreground">查询: {query}</span>
                        </div>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取记录数失败: ${error}", variant: "destructive" });
                }
                break;

              case 'getTimeRange':
                // 获取时间范围
                try {
                  const query = `SELECT MIN(time), MAX(time) FROM "${params.measurement}"`;
                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  Modal.info({
                    title: `时间范围 - ${params.measurement}`,
                    content: (
                      <div>
                        <Descriptions column={1} bordered>
                          <DescriptionsItem label="查询">
                            <code className="bg-muted px-1 rounded">{query}</code>
                          </DescriptionsItem>
                          <DescriptionsItem label="结果">
                            <pre className="bg-muted p-2 rounded">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </DescriptionsItem>
                        </Descriptions>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取时间范围失败: ${error}", variant: "destructive" });
                }
                break;

              case 'getFieldStats':
                // 获取字段统计
                try {
                  const fields = await safeTauriInvoke('get_field_keys', { connection_id: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement});

                  if (!Array.isArray(fields) || fields.length === 0) {
                    toast({ title: "信息", description: "该测量没有字段" });
                    return;
                  }

                  // 为第一个字段生成统计查询
                  const firstField = typeof fields[0] === 'string' ? fields[0] : fields[0].fieldKey;
                  const query = `SELECT MIN("${firstField}"), MAX("${firstField}"), MEAN("${firstField}") FROM "${params.measurement}"`;

                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  Modal.info({
                    title: `字段统计 - ${params.measurement}`,
                    width: 600,
                    content: (
                      <div>
                        <Alert
                          message={`字段 "${firstField}" 的统计信息`}
                          type="info"
                          className="mb-4"
                        />
                        <span className="text-muted-foreground">查询: {query}</span>
                        <div className="mt-4">
                          <pre className="bg-muted p-4 rounded">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取字段统计失败: ${error}", variant: "destructive" });
                }
                break;

              case 'getTagDistribution':
                // 获取标签分布
                try {
                  const tagKeys = await safeTauriInvoke('get_tag_keys', { connectionId: activeConnectionId,
                    database: params.database,
                    measurement: params.measurement});

                  if (!Array.isArray(tagKeys) || tagKeys.length === 0) {
                    toast({ title: "信息", description: "该测量没有标签" });
                    return;
                  }

                  // 获取第一个标签的分布
                  const firstTagKey = tagKeys[0];
                  const query = `SELECT COUNT(*) FROM "${params.measurement}" GROUP BY "${firstTagKey}"`;

                  const result = await safeTauriInvoke('execute_query', { connection_id: activeConnectionId,
                    query});

                  Modal.info({
                    title: `标签分布 - ${params.measurement}`,
                    width: 700,
                    content: (
                      <div>
                        <Alert
                          message={`标签 "${firstTagKey}" 的分布统计`}
                          type="info"
                          className="mb-4"
                        />
                        <span className="text-muted-foreground">查询: {query}</span>
                        <div className="mt-4">
                          <pre className="bg-muted p-4 rounded max-h-64 overflow-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )});
                } catch (error) {
                  toast({ title: "错误", description: "获取标签分布失败: ${error}", variant: "destructive" });
                }
                break;

              case 'createChart':
                // 跳转到可视化页面并预填充查询
                const chartQuery = generateChartQuery(params);
                navigate('/visualization', {
                  state: {
                    presetQuery: chartQuery,
                    database: params.database,
                    measurement: params.measurement,
                    chartType: params.chartType
                  }
                });
                toast({ title: "成功", description: "正在跳转到可视化页面..." });
                break;

              case 'createFieldChart':
                // 为字段创建图表
                const fieldChartQuery = generateFieldChartQuery(params);
                navigate('/visualization', {
                  state: {
                    presetQuery: fieldChartQuery,
                    database: params.database,
                    measurement: params.measurement,
                    field: params.field,
                    chartType: params.chartType
                  }
                });
                toast({ title: "成功", description: "正在跳转到可视化页面..." });
                break;

              case 'createTagChart':
                // 为标签创建图表
                const tagChartQuery = generateTagChartQuery(params);
                navigate('/visualization', {
                  state: {
                    presetQuery: tagChartQuery,
                    database: params.database,
                    measurement: params.measurement,
                    tagKey: params.tagKey,
                    chartType: params.chartType
                  }
                });
                toast({ title: "成功", description: "正在跳转到可视化页面..." });
                break;

              case 'customChart':
                // 跳转到可视化页面创建自定义图表
                navigate('/visualization', {
                  state: {
                    database: params.database,
                    measurement: params.measurement
                  }
                });
                toast({ title: "成功", description: "正在跳转到可视化页面..." });
                break;

              case 'exportData':
                toast.info(`导出测量 "${params.measurement}" 为 ${params.format} 格式功能开发中...`);
                break;

              case 'deleteMeasurement':
                // 删除测量的逻辑将通过 Popconfirm 组件处理
                setDeleteMeasurementParams(params);
                break;

              default:
                toast.info(`功能 "${action}" 开发中...`);
            }
          } catch (error) {
            toast({ title: "错误", description: "操作失败: ${error}", variant: "destructive" });
          }
        };

        return (
          <ContextMenu
            open={contextMenu.visible}
            x={contextMenu.x}
            y={contextMenu.y}
            target={contextMenu.target}
            onClose={() => setContextMenu({ visible: false, x: 0, y: 0, target: null })}
            onAction={handleContextMenuAction}
          />
        );
      }, [contextMenu, activeConnectionId, selectedDatabase])}

      {/* 创建数据库模态框 */}
      <Dialog
        title="创建数据库"
        open={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          form.reset();
        }}
        width={500}
        footer={
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setCreateModalVisible(false);
                form.reset();
              }}
            >
              取消
            </Button>
            <Button
              variant="default"
              onClick={() => form.handleSubmit(createDatabase)()}
            >
              创建
            </Button>
          </div>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createDatabase}
        >
          <FormItem
            label="数据库名称"
            name="name"
            rules={[
              { required: true, message: '请输入数据库名称' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '数据库名称只能包含字母、数字和下划线，且不能以数字开头' },
            ]}
          >
            <Input placeholder="请输入数据库名称" />
          </FormItem>

          <FormItem
            label="默认保留策略"
            name="retentionPolicy"
            tooltip="可选，如果不指定将使用系统默认策略"
          >
            <Input placeholder="例如: autogen" />
          </FormItem>
        </Form>
      </Dialog>

      {/* 保留策略管理对话框 */}
      <RetentionPolicyDialog
        open={retentionPolicyDialog.visible}
        mode={retentionPolicyDialog.mode}
        policy={retentionPolicyDialog.policy}
        database={selectedDatabase}
        connectionId={activeConnectionId || ''}
        onClose={() => setRetentionPolicyDialog({
          visible: false,
          mode: 'create',
          policy: undefined})}
        onSuccess={() => {
          loadDatabaseDetails(selectedDatabase);
        }}
      />

      {/* 删除测量确认对话框 */}
      {deleteMeasurementParams && (
        <Popconfirm
          title="确认删除测量"
          description={`确定要删除测量 "${deleteMeasurementParams.measurement}" 吗？此操作将删除所有相关数据！`}
          open={!!deleteMeasurementParams}
          onConfirm={deleteMeasurement}
          onOpenChange={(open) => !open && (() => setDeleteMeasurementParams(null))()}
          okText="删除"
          cancelText="取消"
          okType="danger"
        >
          <div />
        </Popconfirm>
      )}
      </div>
    </TooltipProvider>
  );
};

export default Database;
