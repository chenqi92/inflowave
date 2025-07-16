import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Row,
  Col,
  Tag,
  Typography,
  Textarea,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Plus, Trash2, Upload, Save, Info, AlertCircle, X } from 'lucide-react';
import { showMessage } from '@/utils/message';
import { DatePicker, InputNumber, Separator } from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import ImportDialog from '@/components/common/ImportDialog';
import type { DataPoint, BatchWriteRequest, WriteResult } from '@/types';
import dayjs from 'dayjs';

interface DataPointForm extends Omit<DataPoint, 'timestamp'> {
  timestamp?: dayjs.Dayjs;
}

interface TagField {
  key: string;
  value: string;
}

interface FieldField {
  key: string;
  value: number | string | boolean;
}

const DataWrite: React.FC = () => {
  const { activeconnection_id } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<DataPointForm[]>([]);
  const [importDialogVisible, setImportDialogVisible] = useState(false);

  const form = useForm({
    defaultValues: {
      measurement: '',
      tagList: [] as TagField[],
      fieldList: [] as FieldField[],
      timestamp: undefined,
    },
  });

  const batchForm = useForm({
    defaultValues: {
      lineProtocol: '',
    },
  });

  const {
    fields: tagFields,
    append: appendTag,
    remove: removeTag,
  } = useFieldArray({
    control: form.control,
    name: 'tagList',
  });

  const {
    fields: fieldFields,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: form.control,
    name: 'fieldList',
  });

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeconnection_id) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeconnection_id,
      });
      setDatabases(dbList);
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      showMessage.error(`加载数据库列表失败: ${error}`);
    }
  };

  // 添加数据点
  const addDataPoint = () => {
    const values = form.getValues();
    if (!values.measurement) {
      showMessage.success('请输入测量名称');
      return;
    }

    // 转换标签和字段数组为对象
    const tags: Record<string, string> = {};
    values.tagList?.forEach(tag => {
      if (tag.key && tag.value) {
        tags[tag.key] = tag.value;
      }
    });

    const fields: Record<string, any> = {};
    values.fieldList?.forEach(field => {
      if (field.key && field.value !== undefined) {
        fields[field.key] = field.value;
      }
    });

    const newDataPoint: DataPointForm = {
      measurement: values.measurement,
      tags,
      fields,
      timestamp: values.timestamp || dayjs(),
    };

    setDataPoints(prev => [...prev, newDataPoint]);
    form.reset({
      measurement: '',
      tagList: [],
      fieldList: [],
      timestamp: undefined,
    });
    showMessage.success('数据点已添加到批次');
  };

  // 删除数据点
  const removeDataPoint = (index: number) => {
    setDataPoints(prev => prev.filter((_, i) => i !== index));
    showMessage.success('数据点已删除');
  };

  // 清空所有数据点
  const clearDataPoints = () => {
    setDataPoints([]);
    showMessage.success('已清空所有数据点');
  };

  // 写入单个数据点
  const writeSinglePoint = async (values: any) => {
    if (!activeconnection_id || !selectedDatabase) {
      showMessage.success('请先选择连接和数据库');
      return;
    }

    setLoading(true);
    try {
      // 转换标签和字段数组为对象
      const tags: Record<string, string> = {};
      values.tagList?.forEach((tag: TagField) => {
        if (tag.key && tag.value) {
          tags[tag.key] = tag.value;
        }
      });

      const fields: Record<string, any> = {};
      values.fieldList?.forEach((field: FieldField) => {
        if (field.key && field.value !== undefined) {
          fields[field.key] = field.value;
        }
      });

      const dataPoint: DataPoint = {
        measurement: values.measurement,
        tags,
        fields,
        timestamp: values.timestamp ? values.timestamp.toDate() : new Date(),
      };

      const request: BatchWriteRequest = {
        connectionId: activeconnection_id,
        database: selectedDatabase,
        points: [dataPoint],
        precision: 'ms',
      };

      const result = await safeTauriInvoke<WriteResult>('write_data_points', {
        request,
      });

      if (result.success) {
        showMessage.success(
          `数据写入成功，写入 ${result.pointsWritten} 个数据点`
        );
        form.reset();
      } else {
        showMessage.error(
          `数据写入失败: ${result.errors[0]?.error || '未知错误'}`
        );
      }
    } catch (error) {
      showMessage.error(`数据写入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 批量写入数据点
  const writeBatchPoints = async () => {
    if (!activeconnection_id || !selectedDatabase) {
      showMessage.success('请先选择连接和数据库');
      return;
    }

    if (dataPoints.length === 0) {
      showMessage.success('请先添加数据点');
      return;
    }

    setLoading(true);
    try {
      const points: DataPoint[] = dataPoints.map(point => ({
        measurement: point.measurement,
        tags: point.tags,
        fields: point.fields,
        timestamp: point.timestamp ? point.timestamp.toDate() : new Date(),
      }));

      const request: BatchWriteRequest = {
        connectionId: activeconnection_id,
        database: selectedDatabase,
        points,
        precision: 'ms',
      };

      const result = await safeTauriInvoke<WriteResult>('write_data_points', {
        request,
      });

      if (result.success) {
        showMessage.success(
          `批量写入成功，写入 ${result.pointsWritten} 个数据点`
        );
        setDataPoints([]);
      } else {
        showMessage.error(`批量写入失败: ${result.errors.length} 个错误`);
        console.error('写入错误:', result.errors);
      }
    } catch (error) {
      showMessage.error(`批量写入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 解析 Line Protocol 格式
  const parseLineProtocol = (lineProtocol: string) => {
    const lines = lineProtocol.trim().split('\n');
    const points: DataPointForm[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        // 简单的 Line Protocol 解析
        // 格式: measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
        const parts = line.trim().split(' ');
        if (parts.length < 2) continue;

        const measurementAndTags = parts[0];
        const fieldsStr = parts[1];
        const timestamp = parts[2] ? parseInt(parts[2]) : Date.now();

        const [measurement, ...tagParts] = measurementAndTags.split(',');
        const tags: Record<string, string> = {};

        for (const tagPart of tagParts) {
          const [key, value] = tagPart.split('=');
          if (key && value) {
            tags[key] = value;
          }
        }

        const fields: Record<string, any> = {};
        const fieldPairs = fieldsStr.split(',');
        for (const fieldPair of fieldPairs) {
          const [key, value] = fieldPair.split('=');
          if (key && value) {
            // 尝试解析数值
            if (!isNaN(Number(value))) {
              fields[key] = Number(value);
            } else if (value === 'true' || value === 'false') {
              fields[key] = value === 'true';
            } else {
              // 移除引号
              fields[key] = value.replace(/^"(.*)"$/, '$1');
            }
          }
        }

        points.push({
          measurement,
          tags,
          fields,
          timestamp: dayjs(timestamp),
        });
      } catch (error) {
        console.error('解析行失败:', line, error);
      }
    }

    return points;
  };

  // 处理 Line Protocol 输入
  const handleLineProtocolSubmit = (values: any) => {
    try {
      const points = parseLineProtocol(values.lineProtocol);
      if (points.length > 0) {
        setDataPoints(prev => [...prev, ...points]);
        showMessage.success(`解析成功，添加了 ${points.length} 个数据点`);
        batchForm.reset();
      } else {
        showMessage.success('未能解析出有效的数据点');
      }
    } catch (error) {
      showMessage.error(`解析失败: ${error}`);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeconnection_id) {
      loadDatabases();
    }
  }, [activeconnection_id]);

  if (!activeconnection_id) {
    return (
      <div className='p-6'>
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            请先连接到
            InfluxDB。在连接管理页面选择一个连接并激活后，才能写入数据。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 渲染数据点表格
  const renderDataPointsTable = () => {
    if (dataPoints.length === 0) {
      return (
        <div className='text-center py-8 text-muted-foreground'>
          暂无数据点，请添加数据点到批次
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>测量</TableHead>
            <TableHead>标签</TableHead>
            <TableHead>字段</TableHead>
            <TableHead>时间戳</TableHead>
            <TableHead className='w-20'>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataPoints.map((point, index) => (
            <TableRow key={index}>
              <TableCell>{point.measurement}</TableCell>
              <TableCell>
                <div className='flex gap-1 flex-wrap'>
                  {Object.entries(point.tags).map(([key, value]) => (
                    <Tag key={key} variant='secondary'>
                      {key}={value}
                    </Tag>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className='flex gap-1 flex-wrap'>
                  {Object.entries(point.fields).map(([key, value]) => (
                    <Tag key={key} variant='outline'>
                      {key}={String(value)}
                    </Tag>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                {point.timestamp?.format('YYYY-MM-DD HH:mm:ss')}
              </TableCell>
              <TableCell>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => removeDataPoint(index)}
                >
                  <Trash2 className='w-4 h-4' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className='p-6'>
      {/* 页面标题和数据库选择 */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <Typography.Title level={2} className='text-2xl font-bold mb-1'>
            数据写入
          </Typography.Title>
          <p className='text-muted-foreground'>向 InfluxDB 写入时序数据</p>
        </div>
        <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
          <SelectTrigger className='w-48'>
            <SelectValue placeholder='选择数据库' />
          </SelectTrigger>
          <SelectContent>
            {databases.map(db => (
              <SelectItem key={db} value={db}>
                {db}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue='single' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='single'>单点写入</TabsTrigger>
          <TabsTrigger value='batch'>批量写入</TabsTrigger>
          <TabsTrigger value='import'>文件导入</TabsTrigger>
        </TabsList>

        <TabsContent value='single' className='space-y-6'>
          <div className='space-y-6'>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(writeSinglePoint)}
                className='space-y-6'
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <FormField
                      control={form.control}
                      name='measurement'
                      rules={{ required: '请输入测量名称' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>测量名称</FormLabel>
                          <FormControl>
                            <Input placeholder='例如: temperature' {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Col>
                  <Col span={12}>
                    <FormField
                      control={form.control}
                      name='timestamp'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>时间戳 (留空则使用当前时间)</FormLabel>
                          <FormControl>
                            <DatePicker
                              showTime
                              placeholder='选择时间戳'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </Col>
                </Row>

                <div className='space-y-4'>
                  <FormLabel>标签 (Tags)</FormLabel>
                  {tagFields.map((field, index) => (
                    <div key={field.id} className='flex gap-2 items-end'>
                      <FormField
                        control={form.control}
                        name={`tagList.${index}.key`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <Input placeholder='标签键' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`tagList.${index}.value`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <Input placeholder='标签值' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeTag(index)}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => appendTag({ key: '', value: '' })}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    添加标签
                  </Button>
                </div>

                <div className='space-y-4'>
                  <FormLabel>字段 (Fields)</FormLabel>
                  {fieldFields.map((field, index) => (
                    <div key={field.id} className='flex gap-2 items-end'>
                      <FormField
                        control={form.control}
                        name={`fieldList.${index}.key`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <Input placeholder='字段键' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fieldList.${index}.value`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <InputNumber placeholder='字段值' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={() => removeField(index)}
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => appendField({ key: '', value: 0 })}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    添加字段
                  </Button>
                </div>

                <div className='flex gap-2'>
                  <Button type='submit' disabled={loading}>
                    <Save className='w-4 h-4 mr-2' />
                    立即写入
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={addDataPoint}
                  >
                    <Plus className='w-4 h-4 mr-2' />
                    添加到批次
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>
        <TabsContent value='batch' className='space-y-6'>
          <div className='space-y-6'>
            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                <div className='space-y-2'>
                  <p>
                    格式:{' '}
                    <code className='bg-muted px-1 rounded'>
                      measurement,tag1=value1,tag2=value2
                      field1=value1,field2=value2 timestamp
                    </code>
                  </p>
                  <p>
                    示例:{' '}
                    <code className='bg-muted px-1 rounded'>
                      temperature,host=server01,region=us-west
                      value=23.5,status="ok" 1609459200000
                    </code>
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <Separator />

            <Form {...batchForm}>
              <form
                onSubmit={batchForm.handleSubmit(handleLineProtocolSubmit)}
                className='space-y-4'
              >
                <FormField
                  control={batchForm.control}
                  name='lineProtocol'
                  rules={{ required: '请输入 Line Protocol 数据' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line Protocol 数据</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={8}
                          placeholder={`temperature,host=server01,region=us-west value=23.5,status="ok"
cpu_usage,host=server01,cpu=cpu0 usage_percent=85.2
memory,host=server01 used_bytes=8589934592,available_bytes=4294967296`}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type='submit'>解析并添加到批次</Button>
              </form>
            </Form>

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-medium'>
                  批次数据点 ({dataPoints.length})
                </h3>
                <div className='flex gap-2'>
                  <Button
                    variant='outline'
                    onClick={clearDataPoints}
                    disabled={dataPoints.length === 0}
                  >
                    <X className='w-4 h-4 mr-2' />
                    清空
                  </Button>
                  <Button
                    onClick={writeBatchPoints}
                    disabled={loading || dataPoints.length === 0}
                  >
                    <Save className='w-4 h-4 mr-2' />
                    批量写入
                  </Button>
                </div>
              </div>
              {renderDataPointsTable()}
            </div>
          </div>
        </TabsContent>

        <TabsContent value='import' className='space-y-6'>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-lg font-medium'>文件导入</h3>
                <p className='text-sm text-muted-foreground'>
                  支持导入 CSV 和 JSON
                  格式的数据文件，自动映射字段并批量写入数据库
                </p>
              </div>
              <Button
                onClick={() => setImportDialogVisible(true)}
                disabled={!selectedDatabase}
              >
                <Upload className='w-4 h-4 mr-2' />
                导入文件
              </Button>
            </div>

            <Alert>
              <Info className='h-4 w-4' />
              <AlertDescription>
                支持导入 CSV 和 JSON
                格式的数据文件，自动映射字段并批量写入数据库。
              </AlertDescription>
            </Alert>

            <Row gutter={16}>
              <Col span={8}>
                <div className='p-4 border rounded-lg'>
                  <h4 className='font-medium mb-2'>CSV 格式</h4>
                  <div className='text-sm text-muted-foreground space-y-1'>
                    <div>• 第一行为表头</div>
                    <div>• 数据用逗号分隔</div>
                    <div>• 支持时间戳字段</div>
                    <div>• 自动推断数据类型</div>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className='p-4 border rounded-lg'>
                  <h4 className='font-medium mb-2'>JSON 格式</h4>
                  <div className='text-sm text-muted-foreground space-y-1'>
                    <div>• 对象数组格式</div>
                    <div>• 每个对象一行数据</div>
                    <div>• 支持嵌套字段</div>
                    <div>• 灵活的数据结构</div>
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div className='p-4 border rounded-lg'>
                  <h4 className='font-medium mb-2'>字段映射</h4>
                  <div className='text-sm text-muted-foreground space-y-1'>
                    <div>• 自动字段映射</div>
                    <div>• 支持标签和字段</div>
                    <div>• 时间字段识别</div>
                    <div>• 数据类型转换</div>
                  </div>
                </div>
              </Col>
            </Row>

            {!selectedDatabase && (
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  请先选择数据库。在开始导入之前，请先选择要导入数据的目标数据库。
                </AlertDescription>
              </Alert>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 导入对话框 */}
      <ImportDialog
        open={importDialogVisible}
        onClose={() => setImportDialogVisible(false)}
        connectionId={activeconnection_id}
        database={selectedDatabase}
        onSuccess={() => {
          showMessage.success('数据导入成功');
          setImportDialogVisible(false);
        }}
      />
    </div>
  );
};

export default DataWrite;
