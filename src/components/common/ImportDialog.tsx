import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
  Alert,
  AlertDescription,
  Switch,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import { Upload as UploadIcon, Database, CheckCircle, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string | null;
  database: string;
  onSuccess?: () => void;
}

interface ImportData {
  headers: string[];
  rows: (string | number)[][];
  preview: (string | number)[][];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  fieldType: 'tag' | 'field' | 'time';
  dataType?: 'string' | 'number' | 'boolean' | 'timestamp';
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  onSuccess,
}) => {
  const form = useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);

  // 重置状态
  const resetState = useCallback(() => {
    setCurrentStep(0);
    setSelectedFile(null);
    setImportData(null);
    setFieldMappings([]);
    form.reset();
  }, [form]);

  // 加载测量列表
  const loadMeasurements = useCallback(async () => {
    if (!connectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>(
        'get_measurements',
        {
          connectionId,
          database,
        }
      );
      setMeasurements(measurementList);
    } catch (error) {
      console.error('加载测量列表失败:', error);
    }
  }, [connectionId, database]);

  useEffect(() => {
    if (open) {
      loadMeasurements();
    } else {
      resetState();
    }
  }, [open, connectionId, database, loadMeasurements, resetState]);

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseFile(file);
    }
  };

  // 移除文件
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setImportData(null);
    setCurrentStep(0);
  };

  // 解析文件
  const parseFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const fileType = file.name.toLowerCase().endsWith('.json')
        ? 'json'
        : 'csv';

      let data: ImportData;

      if (fileType === 'json') {
        data = parseJSONFile(text);
      } else {
        data = parseCSVFile(text);
      }

      setImportData(data);

      // 自动生成字段映射
      const mappings: FieldMapping[] = data.headers.map((header, index) => ({
        sourceField: header,
        targetField: header.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        fieldType: index === 0 ? 'time' : 'field',
        dataType: inferDataType(data.rows, index),
      }));

      setFieldMappings(mappings);
      setCurrentStep(1);
    } catch (error) {
      showNotification.error({
        message: '文件解析失败',
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // 解析 CSV 文件
  const parseCSVFile = (text: string): ImportData => {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('文件为空');
    }

    const headers = lines[0]
      .split(',')
      .map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
    });

    const preview = rows.slice(0, 10);

    return { headers, rows, preview };
  };

  // 解析 JSON 文件
  const parseJSONFile = (text: string): ImportData => {
    const jsonData = JSON.parse(text);

    if (!Array.isArray(jsonData)) {
      throw new Error('JSON 文件必须是数组格式');
    }

    if (jsonData.length === 0) {
      throw new Error('JSON 数组为空');
    }

    const headers = Object.keys(jsonData[0]);
    const rows = jsonData.map(item => headers.map(header => item[header]));
    const preview = rows.slice(0, 10);

    return { headers, rows, preview };
  };

  // 推断数据类型
  const inferDataType = (
    rows: (string | number)[][],
    columnIndex: number
  ): 'string' | 'number' | 'boolean' | 'timestamp' => {
    const samples = rows.slice(0, 10).map(row => row[columnIndex]);

    // 检查是否为时间戳
    if (
      samples.some(
        sample =>
          /^\d{4}-\d{2}-\d{2}/.test(String(sample)) || /^\d{10,13}$/.test(String(sample))
      )
    ) {
      return 'timestamp';
    }

    // 检查是否为数字
    if (samples.every(sample => !isNaN(Number(sample)))) {
      return 'number';
    }

    // 检查是否为布尔值
    if (
      samples.every(sample =>
        ['true', 'false', '1', '0'].includes(String(sample).toLowerCase())
      )
    ) {
      return 'boolean';
    }

    return 'string';
  };

  // 更新字段映射
  const updateFieldMapping = (
    index: number,
    field: keyof FieldMapping,
    value: string
  ) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFieldMappings(newMappings);
  };

  // 执行导入
  const handleImport = async () => {
    if (!connectionId || !importData) return;

    try {
      const values = form.getValues();
      setLoading(true);

      // 准备导入数据
      const importRequest = {
        connectionId,
        database,
        measurement: values.measurement,
        fieldMappings,
        data: importData.rows,
        options: {
          batchSize: values.batchSize || 1000,
          skipErrors: values.skipErrors || false,
        },
      };

      // 调用后端导入接口
      await safeTauriInvoke('import_data', importRequest);

      showMessage.success('数据导入成功');
      setCurrentStep(2);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showNotification.error({
        message: '数据导入失败',
        description: String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  // 渲染字段映射表格
  const renderMappingTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>源字段</TableHead>
          <TableHead>目标字段</TableHead>
          <TableHead>字段类型</TableHead>
          <TableHead>数据类型</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fieldMappings.map((mapping, index) => (
          <TableRow key={index}>
            <TableCell>{mapping.sourceField}</TableCell>
            <TableCell>
              <Input
                value={mapping.targetField}
                onChange={e =>
                  updateFieldMapping(index, 'targetField', e.target.value)
                }
                placeholder='输入目标字段名'
              />
            </TableCell>
            <TableCell>
              <Select
                value={mapping.fieldType}
                onValueChange={val => updateFieldMapping(index, 'fieldType', val)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='time'>时间</SelectItem>
                  <SelectItem value='tag'>标签</SelectItem>
                  <SelectItem value='field'>字段</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Select
                value={mapping.dataType}
                onValueChange={val => updateFieldMapping(index, 'dataType', val)}
                disabled={mapping.fieldType === 'time'}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='string'>字符串</SelectItem>
                  <SelectItem value='number'>数字</SelectItem>
                  <SelectItem value='boolean'>布尔值</SelectItem>
                  <SelectItem value='timestamp'>时间戳</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // 渲染数据预览表格
  const renderPreviewTable = () => {
    if (!importData) return null;

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {importData.headers.map((header, index) => (
              <TableHead key={index} className="min-w-[150px]">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {importData.preview.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="max-w-[200px] truncate">
                  {String(cell)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className='max-w-5xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>数据导入</DialogTitle>
        </DialogHeader>
        <div className='space-y-6'>
          {/* 步骤指示器 */}
          <div className='flex items-center justify-between mb-6'>
            {[
              { title: '上传文件', icon: <UploadIcon className='w-4 h-4' /> },
              { title: '配置映射', icon: <Database className='w-4 h-4' /> },
              { title: '导入完成', icon: <CheckCircle className='w-4 h-4' /> },
            ].map((step, index) => (
              <div key={index} className='flex items-center'>
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index <= currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-muted'
                  }`}
                >
                  {step.icon}
                </div>
                <div className='ml-2 text-sm font-medium'>{step.title}</div>
                {index < 2 && <div className='flex-1 h-px bg-border mx-4' />}
              </div>
            ))}
          </div>

          {/* 步骤 1: 文件上传 */}
          {currentStep === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>选择要导入的文件</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='border-2 border-dashed border-muted-foreground/25 rounded-lg p-8'>
                  <div className='flex flex-col items-center space-y-4'>
                    <UploadIcon className='w-12 h-12 text-muted-foreground' />
                    <div className='text-center space-y-2'>
                      <Text className='text-muted-foreground'>
                        点击选择文件或拖拽文件到此区域
                      </Text>
                      <Text className='text-sm text-muted-foreground'>
                        支持 CSV、JSON 格式文件。文件大小不超过 10MB。
                      </Text>
                    </div>
                    <Input
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={handleFileSelect}
                      className="max-w-xs"
                    />
                    {selectedFile && (
                      <div className="flex items-center gap-2 mt-4">
                        <Text className="text-sm">已选择: {selectedFile.name}</Text>
                        <Button variant="outline" size="sm" onClick={handleRemoveFile}>
                          移除
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <Alert className="border-blue-200 bg-blue-50">
                  <Info className='w-4 h-4 text-blue-600' />
                  <AlertDescription className="text-blue-800">
                    <div className="space-y-2">
                      <div className="font-medium">文件格式要求</div>
                      <div>
                        <strong>CSV 格式:</strong> 第一行为表头，数据用逗号分隔
                      </div>
                      <div>
                        <strong>JSON 格式:</strong> 对象数组，每个对象代表一行数据
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* 步骤 2: 配置映射 */}
          {currentStep === 1 && importData && (
            <div className='space-y-6'>
              {/* 基本配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>导入配置</CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="measurement"
                        rules={{ required: '请输入测量名称' }}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>目标测量</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="选择或输入测量名称" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {measurements.map(measurement => (
                                  <SelectItem key={measurement} value={measurement}>
                                    {measurement}
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
                        name="batchSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>批次大小</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={10000}
                                placeholder="1000"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="skipErrors"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">跳过错误</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </Form>
                </CardContent>
              </Card>

              {/* 字段映射 */}
              <Card>
                <CardHeader>
                  <CardTitle>字段映射配置</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className='w-4 h-4 text-blue-600' />
                    <AlertDescription className="text-blue-800">
                      请为每个源字段配置对应的目标字段名称和类型。至少需要一个时间字段。
                    </AlertDescription>
                  </Alert>

                  {renderMappingTable()}
                </CardContent>
              </Card>

              {/* 数据预览 */}
              <Card>
                <CardHeader>
                  <CardTitle>数据预览 (前10行)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    {renderPreviewTable()}
                  </div>
                </CardContent>
              </Card>

              {/* 操作按钮 */}
              <div className='flex justify-between'>
                <Button variant="outline" onClick={() => setCurrentStep(0)}>上一步</Button>
                <div className='flex gap-2'>
                  <Button variant="outline" onClick={onClose}>取消</Button>
                  <Button
                    disabled={loading || !fieldMappings.some(m => m.fieldType === 'time')}
                    onClick={handleImport}
                  >
                    开始导入
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 步骤 3: 导入完成 */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="pt-6">
                <div className='text-center space-y-4'>
                  <CheckCircle className='w-16 h-16 mx-auto text-green-600' />
                  <h3 className='text-lg font-semibold'>导入完成</h3>
                  <Text className='text-muted-foreground'>
                    数据已成功导入到数据库 <strong>{database}</strong> 中。
                  </Text>
                  <div className='flex gap-2 justify-center'>
                    <Button variant="outline" onClick={onClose}>关闭</Button>
                    <Button
                      onClick={() => {
                        resetState();
                        if (onSuccess) {
                          onSuccess();
                        }
                      }}
                    >
                      继续导入
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
