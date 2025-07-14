import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge, Alert, Progress, Typography } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
// AlertDialog components not available in current UI library
// Using Dialog and Modal components instead
import { Database, Plus, Edit, Trash2, Settings, Info, RefreshCw, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import { showMessage } from '@/utils/message';
import type { RetentionPolicy, RetentionPolicyConfig, DatabaseStorageInfo } from '@/types';

// Removed Typography and Tabs destructuring - using direct components

interface DatabaseManagerProps {
  connectionId?: string;
  database?: string;
}

const DatabaseManager: React.FC<DatabaseManagerProps> = ({
  connectionId,
  database}) => {
  const { connections, activeConnectionId, addConnection, getConnection } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(connectionId || activeConnectionId || '');
  const [selectedDatabase, setSelectedDatabase] = useState(database || '');
  const [databases, setDatabases] = useState<string[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [storageInfo, setStorageInfo] = useState<DatabaseStorageInfo | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const form = useForm();

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
            
            // 如果ID发生变化，需要同步到前端存储
            if (newConnectionId !== selectedConnection) {
              const newConnection = { ...connection, id: newConnectionId };
              addConnection(newConnection);
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
    form.setValue('name', policy.name);
    form.setValue('duration', policy.duration);
    form.setValue('shardGroupDuration', policy.shardGroupDuration);
    form.setValue('replicaN', policy.replicationFactor);
    form.setValue('default', policy.default);
    setShowPolicyModal(true);
  };

  // 渲染保留策略表格
  const renderPolicyTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>策略名称</TableHead>
          <TableHead>保留时间</TableHead>
          <TableHead>分片组时间</TableHead>
          <TableHead className="text-center">副本数</TableHead>
          <TableHead className="text-center">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {retentionPolicies.map((policy) => (
          <TableRow key={policy.name}>
            <TableCell>
              <div className="flex gap-2 items-center">
                <Typography.Text className="font-medium">{policy.name}</Typography.Text>
                {policy.default && <Badge variant="default">默认</Badge>}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{policy.duration}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{policy.shardGroupDuration}</Badge>
            </TableCell>
            <TableCell className="text-center">
              {policy.replicationFactor}
            </TableCell>
            <TableCell>
              <div className="flex gap-1 justify-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPolicy(policy)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>编辑</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {!policy.default && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>删除保留策略</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定删除保留策略 "{policy.name}" 吗？此操作无法撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePolicy(policy.name)}>
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

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
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div className="flex gap-2">
              <Title level={4} style={{ margin: 0 }}>
                <Database className="w-4 h-4"  /> 数据库管理
              </Title>
              <Select
                placeholder="选择连接"
                value={selectedConnection}
                onValueChange={setSelectedConnection}
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
                onValueChange={setSelectedDatabase}
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
              disabled={loading}
            >
              刷新
            </Button>
          </Col>
        </Row>
      </div>

      {/* 存储概览 */}
      {storageInfo && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <div>
              <Statistic
                title="数据库大小"
                value={formatBytes(storageInfo.size)}
                prefix={<Database className="w-4 h-4"  />}
              />
            </div>
          </Col>
          <Col span={6}>
            <div>
              <Statistic
                title="测量数量"
                value={storageInfo.measurementCount}
                prefix={<Settings className="w-4 h-4"  />}
              />
            </div>
          </Col>
          <Col span={6}>
            <div>
              <Statistic
                title="序列数量"
                value={storageInfo.seriesCount.toLocaleString()}
                prefix={<Info className="w-4 h-4"  />}
              />
            </div>
          </Col>
          <Col span={6}>
            <div>
              <Statistic
                title="压缩比"
                value={storageInfo.compressionRatio}
                suffix=":1"
                precision={2}
                prefix={<CheckCircle />}
              />
            </div>
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
              <div
                title="保留策略管理"
                extra={
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4"  />}
                    onClick={() => {
                      setEditingPolicy(null);
                      form.reset();
                      setShowPolicyModal(true);
                    }}
                    disabled={!selectedDatabase}
                  >
                    新建策略
                  </Button>
                }
              >
{renderPolicyTable()}
              </div>
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
              <div title="存储分析报告">
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
                        <div size="small" title="数据时间范围">
                          <p><strong>最早数据:</strong> {new Date(storageInfo.oldestPoint).toLocaleString()}</p>
                          <p><strong>最新数据:</strong> {new Date(storageInfo.newestPoint).toLocaleString()}</p>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div size="small" title="压缩效果">
                          <Progress
                            percent={Math.round((1 - 1/storageInfo.compressionRatio) * 100)}
                            format={percent => `节省 ${percent}%`}
                            status="success"
                          />
                          <p style={{ marginTop: 8 }}>
                            <Text type="secondary">压缩比: {storageInfo.compressionRatio.toFixed(2)}:1</Text>
                          </p>
                        </div>
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
              </div>
            )},
        ]}
      />

      {/* 保留策略模态框 */}
      <Modal
        title={editingPolicy ? '编辑保留策略' : '新建保留策略'}
        open={showPolicyModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowPolicyModal(false);
            setEditingPolicy(null);
            form.resetFields();
          }
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingPolicy ? handleUpdatePolicy : handleCreatePolicy}
        >
          <FormItem name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input 
              placeholder="输入策略名称" 
              disabled={!!editingPolicy}
            />
          </FormItem>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem name="duration"
                label="保留时间"
                rules={[{ required: true, message: '请输入保留时间' }]}
              >
                <Input placeholder="例如: 30d, 1w, 1h" />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem name="shardGroupDuration"
                label="分片组时间"
              >
                <Input placeholder="例如: 1d, 1h (可选)" />
              </FormItem>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem name="replicaN"
                label="副本数"
                initialValue={1}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem name="default"
                valuePropName="checked"
                label="设为默认策略"
              >
                <input type="checkbox" />
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default DatabaseManager;
