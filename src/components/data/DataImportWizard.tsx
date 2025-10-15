/**
 * 数据导入向导
 * 支持 CSV 和 JSON 文件导入，包含数据预览和验证
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input,
  Label,
  Switch,
  ScrollArea,
  TableSkeleton,
} from '@/components/ui';
import { Upload } from '@/components/ui/Upload';
import {
  FileUp,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Upload as UploadIcon,
  Database,
  Settings,
  Eye,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { UploadFile } from '@/components/ui/Upload';

/**
 * 导入步骤
 */
type ImportStep = 'upload' | 'preview' | 'configure' | 'import' | 'complete';

/**
 * 字段映射
 */
interface FieldMapping {
  sourceField: string;
  targetField: string;
  fieldType: 'tag' | 'field' | 'time';
  dataType: 'string' | 'number' | 'boolean' | 'timestamp';
}

/**
 * 导入数据
 */
interface ImportData {
  headers: string[];
  rows: any[][];
  preview: any[][];
  totalRows: number;
}

/**
 * 验证结果
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 组件属性
 */
export interface DataImportWizardProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 连接 ID */
  connectionId: string;
  /** 数据库 */
  database: string;
  /** 导入成功回调 */
  onSuccess?: () => void;
}

/**
 * 数据导入向导组件
 */
export const DataImportWizard: React.FC<DataImportWizardProps> = ({
  open,
  onClose,
  connectionId,
  database,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [fileType, setFileType] = useState<'csv' | 'json'>('csv');
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [measurement, setMeasurement] = useState('');
  const [batchSize, setBatchSize] = useState(1000);
  const [skipErrors, setSkipErrors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);

  // 步骤配置
  const steps: { key: ImportStep; label: string; icon: any }[] = [
    { key: 'upload', label: '上传文件', icon: UploadIcon },
    { key: 'preview', label: '预览数据', icon: Eye },
    { key: 'configure', label: '配置映射', icon: Settings },
    { key: 'import', label: '导入数据', icon: Database },
    { key: 'complete', label: '完成', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // 重置状态
  const resetState = () => {
    setCurrentStep('upload');
    setFileList([]);
    setImportData(null);
    setFieldMappings([]);
    setMeasurement('');
    setImportProgress(0);
    setImportResult(null);
  };

  // 处理文件上传
  const handleFileChange = async (info: {
    file: UploadFile;
    fileList: UploadFile[];
  }) => {
    setFileList(info.fileList);

    if (info.file.originFileObj) {
      const file = info.file.originFileObj;
      const type = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
      setFileType(type);

      // 解析文件
      await parseFile(file, type);
    }
  };

  // 解析文件
  const parseFile = async (file: File, type: 'csv' | 'json') => {
    setLoading(true);
    try {
      const text = await file.text();
      let data: ImportData;

      if (type === 'json') {
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
      setCurrentStep('preview');
    } catch (error) {
      showMessage.error(`文件解析失败: ${error}`);
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
      .map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map((line) => {
      return line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
    });

    const preview = rows.slice(0, 10);

    return { headers, rows, preview, totalRows: rows.length };
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
    const rows = jsonData.map((item) => headers.map((header) => item[header]));
    const preview = rows.slice(0, 10);

    return { headers, rows, preview, totalRows: rows.length };
  };

  // 推断数据类型
  const inferDataType = (
    rows: any[][],
    columnIndex: number
  ): 'string' | 'number' | 'boolean' | 'timestamp' => {
    const samples = rows.slice(0, 10).map((row) => row[columnIndex]);

    // 检查是否为数字
    if (samples.every((v) => !isNaN(Number(v)))) {
      return 'number';
    }

    // 检查是否为布尔值
    if (
      samples.every(
        (v) =>
          v === 'true' ||
          v === 'false' ||
          v === '1' ||
          v === '0' ||
          v === true ||
          v === false
      )
    ) {
      return 'boolean';
    }

    // 检查是否为时间戳
    if (
      samples.every((v) => {
        const date = new Date(v);
        return !isNaN(date.getTime());
      })
    ) {
      return 'timestamp';
    }

    return 'string';
  };

  // 验证配置
  const validateConfiguration = (): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!measurement) {
      errors.push('请输入测量名称');
    }

    const timeFields = fieldMappings.filter((m) => m.fieldType === 'time');
    if (timeFields.length === 0) {
      errors.push('至少需要一个时间字段');
    } else if (timeFields.length > 1) {
      warnings.push('存在多个时间字段，将使用第一个');
    }

    const dataFields = fieldMappings.filter((m) => m.fieldType === 'field');
    if (dataFields.length === 0) {
      errors.push('至少需要一个数据字段');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  };

  // 执行导入
  const handleImport = async () => {
    if (!importData) return;

    const validation = validateConfiguration();
    if (!validation.valid) {
      showMessage.error(validation.errors.join('; '));
      return;
    }

    setLoading(true);
    setCurrentStep('import');
    setImportProgress(0);

    try {
      const importRequest = {
        connectionId,
        database,
        measurement,
        fieldMappings,
        data: importData.rows,
        options: {
          batchSize,
          skipErrors,
        },
      };

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const result = await safeTauriInvoke<{ imported: number; errors: string[] }>(
        'import_data',
        importRequest
      );

      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setCurrentStep('complete');

      if (result.errors.length === 0) {
        showMessage.success(`成功导入 ${result.imported} 条记录`);
      } else {
        showMessage.warning(
          `导入完成，成功 ${result.imported} 条，失败 ${result.errors.length} 条`
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showMessage.error(`导入失败: ${error}`);
      setCurrentStep('configure');
    } finally {
      setLoading(false);
    }
  };

  // 下一步
  const handleNext = () => {
    if (currentStep === 'preview') {
      setCurrentStep('configure');
    } else if (currentStep === 'configure') {
      handleImport();
    }
  };

  // 上一步
  const handlePrevious = () => {
    if (currentStep === 'preview') {
      setCurrentStep('upload');
    } else if (currentStep === 'configure') {
      setCurrentStep('preview');
    }
  };

  // 关闭对话框
  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            数据导入向导
          </DialogTitle>
          <DialogDescription>
            导入 CSV 或 JSON 文件到 {database}
          </DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-between py-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                        ? 'bg-primary/20 text-primary border-2 border-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-xs ${
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* 步骤内容 */}
        <div className="flex-1 min-h-0">
          {/* 步骤 1: 上传文件 */}
          {currentStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  选择要导入的文件
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Upload.Dragger
                  accept=".csv,.json"
                  fileList={fileList}
                  onChange={handleFileChange}
                  maxCount={1}
                >
                  <div className="py-8">
                    <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-base mb-2">点击或拖拽文件到此区域</p>
                    <p className="text-sm text-muted-foreground">
                      支持 CSV 和 JSON 格式文件
                    </p>
                  </div>
                </Upload.Dragger>

                {fileList.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {fileType === 'json' ? (
                          <FileJson className="w-5 h-5 text-blue-500" />
                        ) : (
                          <FileSpreadsheet className="w-5 h-5 text-green-500" />
                        )}
                        <span className="font-medium">{fileList[0].name}</span>
                        <Badge variant="secondary">{fileType.toUpperCase()}</Badge>
                      </div>
                      {loading && <span className="text-sm text-muted-foreground">解析中...</span>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 步骤 2: 预览数据 */}
          {currentStep === 'preview' && importData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  数据预览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        总行数: {importData.totalRows}
                      </Badge>
                      <Badge variant="outline">
                        列数: {importData.headers.length}
                      </Badge>
                    </div>
                  </div>

                  <ScrollArea className="h-96 border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {importData.headers.map((header, index) => (
                            <th
                              key={index}
                              className="px-4 py-2 text-left font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.preview.map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-b hover:bg-muted/50"
                          >
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-4 py-2">
                                {String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>

                  {importData.totalRows > 10 && (
                    <p className="text-sm text-muted-foreground">
                      显示前 10 行数据，共 {importData.totalRows} 行
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 3: 配置映射 */}
          {currentStep === 'configure' && importData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  配置字段映射
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 基本配置 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>测量名称 *</Label>
                      <Input
                        placeholder="例如: temperature"
                        value={measurement}
                        onChange={(e) => setMeasurement(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>批量大小</Label>
                      <Input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        min={100}
                        max={10000}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label>跳过错误行</Label>
                      <p className="text-sm text-muted-foreground">
                        遇到错误时继续导入其他数据
                      </p>
                    </div>
                    <Switch
                      checked={skipErrors}
                      onCheckedChange={setSkipErrors}
                    />
                  </div>

                  {/* 字段映射 */}
                  <div className="space-y-2">
                    <Label>字段映射</Label>
                    <ScrollArea className="h-64 border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left">源字段</th>
                            <th className="px-4 py-2 text-left">目标字段</th>
                            <th className="px-4 py-2 text-left">字段类型</th>
                            <th className="px-4 py-2 text-left">数据类型</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldMappings.map((mapping, index) => (
                            <tr key={index} className="border-b">
                              <td className="px-4 py-2 font-medium">
                                {mapping.sourceField}
                              </td>
                              <td className="px-4 py-2">
                                <Input
                                  value={mapping.targetField}
                                  onChange={(e) => {
                                    const newMappings = [...fieldMappings];
                                    newMappings[index].targetField =
                                      e.target.value;
                                    setFieldMappings(newMappings);
                                  }}
                                  className="h-8"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <Select
                                  value={mapping.fieldType}
                                  onValueChange={(value: any) => {
                                    const newMappings = [...fieldMappings];
                                    newMappings[index].fieldType = value;
                                    setFieldMappings(newMappings);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="time">时间</SelectItem>
                                    <SelectItem value="tag">标签</SelectItem>
                                    <SelectItem value="field">字段</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-2">
                                <Select
                                  value={mapping.dataType}
                                  onValueChange={(value: any) => {
                                    const newMappings = [...fieldMappings];
                                    newMappings[index].dataType = value;
                                    setFieldMappings(newMappings);
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">字符串</SelectItem>
                                    <SelectItem value="number">数字</SelectItem>
                                    <SelectItem value="boolean">布尔</SelectItem>
                                    <SelectItem value="timestamp">
                                      时间戳
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>

                  {/* 验证提示 */}
                  {(() => {
                    const validation = validateConfiguration();
                    return (
                      <>
                        {validation.errors.length > 0 && (
                          <Alert variant="destructive">
                            <XCircle className="w-4 h-4" />
                            <AlertDescription>
                              {validation.errors.join('; ')}
                            </AlertDescription>
                          </Alert>
                        )}
                        {validation.warnings.length > 0 && (
                          <Alert>
                            <AlertTriangle className="w-4 h-4" />
                            <AlertDescription>
                              {validation.warnings.join('; ')}
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 4: 导入进度 */}
          {currentStep === 'import' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  正在导入数据
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-center text-sm text-muted-foreground">
                    {importProgress}% 完成
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 5: 完成 */}
          {currentStep === 'complete' && importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  导入完成
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                      <h3 className="text-lg font-medium">导入成功！</h3>
                      <p className="text-muted-foreground">
                        成功导入 {importResult.imported} 条记录
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="w-4 h-4" />
                      <AlertDescription>
                        <p className="font-medium mb-2">
                          {importResult.errors.length} 条记录导入失败
                        </p>
                        <ScrollArea className="h-32">
                          <ul className="text-sm space-y-1">
                            {importResult.errors.slice(0, 10).map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                            {importResult.errors.length > 10 && (
                              <li>... 还有 {importResult.errors.length - 10} 条错误</li>
                            )}
                          </ul>
                        </ScrollArea>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={
              currentStep === 'upload' ||
              currentStep === 'import' ||
              currentStep === 'complete'
            }
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            上一步
          </Button>

          <div className="flex gap-2">
            {currentStep === 'complete' ? (
              <Button onClick={handleClose}>完成</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>
                  取消
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 'upload' && fileList.length === 0) ||
                    currentStep === 'import' ||
                    loading
                  }
                >
                  {currentStep === 'configure' ? '开始导入' : '下一步'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataImportWizard;

