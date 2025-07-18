import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Upload,
  Textarea,
  Text,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import { Check, Eye, Inbox, CheckCircle, AlertCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DataWriteConfig, DataWriteResult, Connection } from '@/types';

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
  onSuccess,
}) => {
  const form = useForm<{
    connectionId: string;
    database: string;
    measurement: string;
    format: 'line-protocol' | 'csv' | 'json';
    data: string;
    options: {
      precision: 'ns' | 'u' | 'ms' | 's' | 'm' | 'h';
      batchSize: number;
      retentionPolicy: string;
      consistency: 'one' | 'quorum' | 'all' | 'any';
    };
  }>({
    defaultValues: {
      connectionId: '',
      database: '',
      measurement: '',
      format: 'line-protocol',
      data: '',
      options: {
        precision: 'ms',
        batchSize: 1000,
        retentionPolicy: '',
        consistency: 'one',
      },
    },
  });
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
      form.reset({
        connectionId: currentConnection || '',
        database: currentDatabase || '',
        measurement: '',
        format: 'line-protocol',
        data: '',
        options: {
          precision: 'ms',
          batchSize: 1000,
          retentionPolicy: '',
          consistency: 'one',
        },
      });
      setWriteResult(null);
      setPreviewData('');
      setShowPreview(false);
    }
  }, [visible, currentConnection, currentDatabase, form]);

  // 加载数据库列表
  const loadDatabases = async (connectionId: string) => {
    if (!connectionId) return;

    try {
      const dbList = (await safeTauriInvoke('get_databases', {
        connectionId,
      })) as string[];
      setDatabases(dbList);
    } catch (error) {
      console.error('获取数据库列表失败:', error);
      showMessage.error('获取数据库列表失败');
    }
  };

  // 监听连接变化
  const handleConnectionChange = (connectionId: string) => {
    form.setValue('connectionId', connectionId);
    loadDatabases(connectionId);
  };

  // 验证数据格式
  const validateData = async () => {
    try {
      const values = form.getValues();
      if (!values.data?.trim()) {
        showMessage.warning('请输入数据内容');
        return;
      }

      setValidating(true);
      const isValid = await safeTauriInvoke<boolean>('validate_data_format', {
        data: values.data,
        format: values.format,
        measurement: values.measurement,
      });

      if (isValid) {
        showMessage.success('数据格式验证通过');
      }
    } catch (error) {
      showNotification.error({
        message: '数据格式验证失败',
        description: String(error),
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
        showMessage.warning('请输入数据内容');
        return;
      }

      setPreviewing(true);
      const preview = await safeTauriInvoke<string>('preview_data_conversion', {
        data: values.data,
        format: values.format,
        measurement: values.measurement,
        limit: 10,
      });

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      showNotification.error({
        message: '预览转换失败',
        description: String(error),
      });
    } finally {
      setPreviewing(false);
    }
  };

  // 写入数据
  const handleSubmit = async (values: {
    connectionId: string;
    database: string;
    measurement: string;
    format: 'line-protocol' | 'csv' | 'json';
    data: string;
    options: {
      precision: 'ns' | 'u' | 'ms' | 's' | 'm' | 'h';
      batchSize: number;
      retentionPolicy: string;
      consistency: 'one' | 'quorum' | 'all' | 'any';
    };
  }) => {
    try {
      setLoading(true);
      setWriteResult(null);

      const writeConfig: DataWriteConfig = {
        connectionId: values.connectionId,
        database: values.database,
        measurement: values.measurement,
        format: values.format,
        data: values.data,
        options: values.options,
      };

      const result = await safeTauriInvoke<DataWriteResult>('write_data', {
        request: writeConfig,
      });
      setWriteResult(result);

      if (result.success) {
        showMessage.success('数据写入成功');
        onSuccess?.(result);
      } else {
        showMessage.error('数据写入失败');
      }
    } catch (error) {
      showNotification.error({
        message: '数据写入失败',
        description: String(error),
      });
      setWriteResult({
        success: false,
        message: `写入失败: ${error}`,
        pointsWritten: 0,
        errors: [String(error)],
        duration: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result as string;
      form.setValue('data', content);

      // 根据文件扩展名自动设置格式
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        form.setValue('format', 'csv');
      } else if (fileName.endsWith('.json')) {
        form.setValue('format', 'json');
      } else {
        form.setValue('format', 'line-protocol');
      }

      showMessage.success('文件内容已加载');
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
    const values = form.getValues();
    return (
      values.connectionId &&
      values.database &&
      values.measurement &&
      values.data?.trim() &&
      !loading
    );
  };

  return (
    <>
      <Dialog open={visible} onOpenChange={open => !open && onClose()}>
        <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>数据写入</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className='space-y-6'
            >
              {/* 基本配置 */}
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='connectionId'
                  rules={{ required: '请选择连接' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>连接</FormLabel>
                      <Select
                        onValueChange={value => {
                          field.onChange(value);
                          handleConnectionChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='选择连接' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {connections.map(conn => (
                            <SelectItem key={conn.id} value={conn.id || ''}>
                              {conn.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='database'
                  rules={{ required: '请选择数据库' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据库</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='选择数据库' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {databases.map(db => (
                            <SelectItem key={db} value={db}>
                              {db}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='measurement'
                  rules={{ required: '请输入测量名' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>测量名</FormLabel>
                      <FormControl>
                        <Input placeholder='输入测量名' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='format'
                  rules={{ required: '请选择数据格式' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据格式</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='选择数据格式' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='line-protocol'>
                            Line Protocol
                          </SelectItem>
                          <SelectItem value='csv'>CSV</SelectItem>
                          <SelectItem value='json'>JSON</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 数据输入 */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='manual'>手动输入</TabsTrigger>
                  <TabsTrigger value='upload'>文件上传</TabsTrigger>
                </TabsList>

                <TabsContent value='manual' className='mt-4'>
                  <FormField
                    control={form.control}
                    name='data'
                    rules={{ required: '请输入数据内容' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <div className='flex gap-2 items-center mb-2'>
                            <span>数据内容</span>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              disabled={validating}
                              onClick={validateData}
                            >
                              <Check className='w-4 h-4 mr-2' /> 验证格式
                            </Button>
                            <Button
                              type='button'
                              size='sm'
                              variant='outline'
                              disabled={previewing}
                              onClick={previewConversion}
                            >
                              <Eye className='w-4 h-4 mr-2' /> 预览转换
                            </Button>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={12}
                            placeholder={getDataPlaceholder(form.watch('format'))}
                            className='font-mono text-sm'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value='upload' className='mt-4'>
                  <Upload.Dragger
                    beforeUpload={handleFileUpload}
                    accept='.csv,.json,.txt'
                    showUploadList={false}
                  >
                    <div className='flex flex-col items-center space-y-2 p-8'>
                      <Inbox className='w-8 h-8 text-muted-foreground' />
                      <Text className='text-muted-foreground'>
                        点击或拖拽文件到此区域上传
                      </Text>
                      <Text className='text-sm text-muted-foreground'>
                        支持 CSV、JSON、TXT 格式文件，文件大小不超过 10MB
                      </Text>
                    </div>
                  </Upload.Dragger>
                </TabsContent>
              </Tabs>

              {/* 高级选项 */}
              <div className='border-t pt-6'>
                <h4 className='text-sm font-medium mb-4'>高级选项</h4>
                <div className='grid grid-cols-4 gap-4'>
                  <FormField
                    control={form.control}
                    name='options.precision'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>时间精度</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || 'ms'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='ns'>纳秒 (ns)</SelectItem>
                            <SelectItem value='u'>微秒 (u)</SelectItem>
                            <SelectItem value='ms'>毫秒 (ms)</SelectItem>
                            <SelectItem value='s'>秒 (s)</SelectItem>
                            <SelectItem value='m'>分钟 (m)</SelectItem>
                            <SelectItem value='h'>小时 (h)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='options.batchSize'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>批次大小</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={100}
                            max={10000}
                            value={field.value || 1000}
                            onChange={e =>
                              field.onChange(Number(e.target.value))
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='options.retentionPolicy'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>保留策略</FormLabel>
                        <FormControl>
                          <Input placeholder='默认' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='options.consistency'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>一致性级别</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value || 'one'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value='one'>One</SelectItem>
                            <SelectItem value='quorum'>Quorum</SelectItem>
                            <SelectItem value='all'>All</SelectItem>
                            <SelectItem value='any'>Any</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 写入结果 */}
              {writeResult && (
                <Alert
                  variant={writeResult.success ? 'default' : 'destructive'}
                  className='mt-4'
                >
                  {writeResult.success ? (
                    <CheckCircle className='h-4 w-4' />
                  ) : (
                    <AlertCircle className='h-4 w-4' />
                  )}
                  <AlertTitle>
                    {writeResult.success ? '写入成功' : '写入失败'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className='space-y-1'>
                      <p>{writeResult.message}</p>
                      <p>写入数据点: {writeResult.pointsWritten}</p>
                      <p>耗时: {writeResult.duration}ms</p>
                      {writeResult.errors && writeResult.errors.length > 0 && (
                        <div>
                          <p className='font-medium'>错误信息:</p>
                          <ul className='list-disc list-inside space-y-1'>
                            {writeResult.errors.map((error, index) => (
                              <li key={index} className='text-sm'>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>

          <DialogFooter className='flex gap-2'>
            <Button variant='outline' onClick={onClose}>
              取消
            </Button>
            <Button
              variant='default'
              disabled={loading || !canWrite()}
              onClick={form.handleSubmit(handleSubmit)}
              loading={loading}
            >
              写入数据
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 预览对话框 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>转换预览</DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <Text className='font-medium'>Line Protocol 格式预览 (前10行):</Text>
            <Textarea
              value={previewData}
              rows={15}
              readOnly
              className='font-mono text-sm'
            />
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowPreview(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DataWriteDialog;
