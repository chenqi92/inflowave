import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Alert, Typography, Tabs, TabsList, TabsTrigger, TabsContent, Row, Col, Upload } from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import { Space, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Check, Eye, Inbox } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DataWriteConfig, DataWriteResult, Connection } from '@/types';

const { Textarea } = Input;
const { Text } = Typography;

interface DataWriteDialogProps {
  visible: boolean;
  onClose: () => void;
  connections: Connection[];
  currentConnection?: string;
  currentDatabase?: string;
  onSuccess?: (result: DataWriteResult) => void;
}

const DataWriteDialog: React.FC<DataWriteDialogProps> = ({
  visible,
  onClose,
  connections,
  currentConnection,
  currentDatabase,
  onSuccess}) => {
  const form = useForm();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [writeResult, setWriteResult] = useState<DataWriteResult | null>(null);
  const [previewData, setPreviewData] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  // 初始化表单
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        connectionId: currentConnection || '',
        database: currentDatabase || '',
        measurement: '',
        format: 'line-protocol',
        data: '',
        options: {
          precision: 'ms',
          batchSize: 1000,
          retentionPolicy: '',
          consistency: 'one'}});
      setWriteResult(null);
      setPreviewData('');
      setShowPreview(false);
    }
  }, [visible, currentConnection, currentDatabase, form]);

  // 加载数据库列表
  const loadDatabases = async (connectionId: string) => {
    if (!connectionId) return;
    
    try {
      const dbList = await safeTauriInvoke('get_databases', { connectionId: connectionId }) as string[];
      setDatabases(dbList);
    } catch (error) {
      console.error('获取数据库列表失败:', error);
      showMessage.error("获取数据库列表失败");
    }
  };

  // 监听连接变化
  const handleConnectionChange = (connectionId: string) => {
    form.setFieldValue('connectionId', connectionId);
    loadDatabases(connectionId);
  };

  // 验证数据格式
  const validateData = async () => {
    try {
      const values = form.getValues();
      if (!values.data?.trim()) {
        showMessage.warning("请输入数据内容" );
        return;
      }

      setValidating(true);
      const isValid = await safeTauriInvoke('validate_data_format', {
        data: values.data,
        format: values.format,
        measurement: values.measurement});

      if (isValid) {
        showMessage.success("数据格式验证通过" );
      }
    } catch (error) {
      showNotification.error({
        message: "数据格式验证失败",
        description: String(error)
      });
    } finally {
      setValidating(false);
    }
  };

  // 预览转换结果
  const previewConversion = async () => {
    try {
      const values = form.getValues();
      if (!values.data?.trim()) {
        showMessage.warning("请输入数据内容" );
        return;
      }

      setPreviewing(true);
      const preview = await safeTauriInvoke('preview_data_conversion', {
        data: values.data,
        format: values.format,
        measurement: values.measurement,
        limit: 10}) as string;

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      showNotification.error({
        message: "预览转换失败",
        description: String(error)
      });
    } finally {
      setPreviewing(false);
    }
  };

  // 写入数据
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setWriteResult(null);

      const writeConfig: DataWriteConfig = {
        connectionId: values.connectionId,
        database: values.database,
        measurement: values.measurement,
        format: values.format,
        data: values.data,
        options: values.options};

      const result = await safeTauriInvoke('write_data', { request: writeConfig }) as DataWriteResult;
      setWriteResult(result);

      if (result.success) {
        showMessage.success("数据写入成功" );
        onSuccess?.(result);
      } else {
        showMessage.error("数据写入失败");
      }
    } catch (error) {
      showNotification.error({
        message: "数据写入失败",
        description: String(error)
      });
      setWriteResult({
        success: false,
        message: `写入失败: ${error}`,
        pointsWritten: 0,
        errors: [String(error)],
        duration: 0});
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      form.setValue('data', content);

      // 根据文件扩展名自动设置格式
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        form.setFieldValue('format', 'csv');
      } else if (fileName.endsWith('.json')) {
        form.setFieldValue('format', 'json');
      } else {
        form.setFieldValue('format', 'line-protocol');
      }

      showMessage.success("文件内容已加载" );
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  // 获取数据格式示例
  const getDataPlaceholder = (format: string) => {
    switch (format) {
      case 'line-protocol':
        return 'measurement,tag1=value1,tag2=value2 field1=1.0,field2=2.0 1609459200000000000';
      case 'csv':
        return 'time,tag1,tag2,field1,field2\n2021-01-01T00:00:00Z,value1,value2,1.0,2.0';
      case 'json':
        return '{"time": "2021-01-01T00:00:00Z", "tag1": "value1", "field1": 1.0}';
      default:
        return '';
    }
  };

  const canWrite = () => {
    const values = form.getFieldsValue();
    return values.connectionId &&
           values.database &&
           values.measurement &&
           values.data?.trim() &&
           !loading;
  };

  return (
    <>
      <Dialog
        title="数据写入"
        open={visible}
        onOpenChange={(open) => !open && (onClose)()}
        width={800}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button
            key="write"
            type="primary"
            disabled={loading}
            disabled={!canWrite()}
            onClick={writeData}>
            写入数据
          </Button>,
        ]}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 基本配置 */}
          <Row gutter={16}>
            <Col span={12}>
              <FormField
                control={form.control}
                name="connectionId"
                rules={{ required: '请选择连接' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>连接</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      handleConnectionChange(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择连接" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {connections.map(conn => (
                          <SelectItem key={conn.id} value={conn.id}>{conn.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Col>
            <Col span={12}>
              <FormField
                control={form.control}
                name="database"
                rules={{ required: '请选择数据库' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数据库</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择数据库" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {databases.map(db => (
                          <SelectItem key={db} value={db}>{db}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <FormField
                control={form.control}
                name="measurement"
                rules={{ required: '请输入测量名' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>测量名</FormLabel>
                    <FormControl>
                      <Input placeholder="输入测量名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Col>
            <Col span={12}>
              <FormField
                control={form.control}
                name="format"
                rules={{ required: '请选择数据格式' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数据格式</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择数据格式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="line-protocol">Line Protocol</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Col>
          </Row>

          {/* 数据输入 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">手动输入</TabsTrigger>
              <TabsTrigger value="upload">文件上传</TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <FormField
                control={form.control}
                name="data"
                rules={{ required: '请输入数据内容' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <div className="flex gap-2">
                        <span>数据内容</span>
                        <Button size="sm" disabled={validating} onClick={validateData}>
                          <Check className="w-4 h-4 mr-2" /> 验证格式
                        </Button>
                        <Button size="sm" disabled={previewing} onClick={previewConversion}>
                          <Eye className="w-4 h-4 mr-2" /> 预览转换
                        </Button>
                      </div>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={12}
                        placeholder={getDataPlaceholder(form.watch('format'))}
                        className="font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="upload">
              <Upload.Dragger
                beforeUpload={handleFileUpload}
                accept=".csv,.json,.txt"
                showUploadList={false}>
                <div className="flex flex-col items-center space-y-2">
                  <Inbox className="w-8 h-8 text-gray-400" />
                  <Typography.Text className="text-muted-foreground">点击或拖拽文件到此区域上传</Typography.Text>
                  <p className="text-sm text-muted-foreground">
                    支持 CSV、JSON、TXT 格式文件，文件大小不超过 10MB
                  </p>
                </div>
              </Upload.Dragger>
            </TabsContent>
          </Tabs>

          {/* 高级选项 */}
          <div className="border-t border-gray-200 my-6 pt-6">
            <h4 className="text-sm font-medium mb-4">高级选项</h4>
            <Row gutter={16}>
              <Col span={6}>
                <FormField
                  control={form.control}
                  name="options.precision"
                  defaultValue="ns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>时间精度</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ns">纳秒 (ns)</SelectItem>
                          <SelectItem value="u">微秒 (u)</SelectItem>
                          <SelectItem value="ms">毫秒 (ms)</SelectItem>
                          <SelectItem value="s">秒 (s)</SelectItem>
                          <SelectItem value="m">分钟 (m)</SelectItem>
                          <SelectItem value="h">小时 (h)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Col>
              <Col span={6}>
                <FormField
                  control={form.control}
                  name="options.batchSize"
                  defaultValue={1000}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>批次大小</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={100}
                          max={10000}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Col>
              <Col span={6}>
                <FormField
                  control={form.control}
                  name="options.retentionPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>保留策略</FormLabel>
                      <FormControl>
                        <Input placeholder="默认" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Col>
              <Col span={6}>
                <FormField
                  control={form.control}
                  name="options.consistency"
                  defaultValue="one"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>一致性级别</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one">One</SelectItem>
                          <SelectItem value="quorum">Quorum</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="any">Any</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Col>
            </Row>
          </div>

          {/* 写入结果 */}
          {writeResult && (
            <Alert
              type={writeResult.success ? 'success' : 'error'}
              message={writeResult.message}
              description={
                <div>
                  <p>写入数据点: {writeResult.pointsWritten}</p>
                  <p>耗时: {writeResult.duration}ms</p>
                  {writeResult.errors && writeResult.errors.length> 0 && (
                    <div>
                      <p>错误信息:</p>
                      <ul>
                        {writeResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              }
              showIcon
              style={{ marginTop: 16 }}
            />
          )}
          </form>
        </Form>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog
        title="转换预览"
        open={showPreview}
        onOpenChange={(open) => !open && (() => setShowPreview(false))()}
        footer={[
          <Button key="close" onClick={() => setShowPreview(false)}>
            关闭
          </Button>,
        ]}
        width={600}>
        <div>
          <Text strong>Line Protocol 格式预览 (前10行):</Text>
          <Textarea
            value={previewData}
            rows={15}
            readOnly
            style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
      </Dialog>
    </>
  );
};

export default DataWriteDialog;
