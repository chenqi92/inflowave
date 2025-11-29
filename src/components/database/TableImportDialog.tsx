/**
 * TableImportDialog - 表数据导入对话框
 *
 * 从右键菜单打开，用于导入数据到表/测量
 * 支持不同数据库类型 (InfluxDB 1.x, InfluxDB 2.x, IoTDB)
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Spin,
  Alert,
  Textarea,
} from '@/components/ui';
import {
  Upload,
  FileText,
  Code,
  Database,
  Table,
  AlertCircle,
  CheckCircle,
  File,
  X,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';
import logger from '@/utils/logger';

interface TableImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  connectionId: string;
  database: string;
  table: string;
  dbType: string;
}

interface ImportFormData {
  format: 'csv' | 'json' | 'line_protocol';
  data: string;
  precision: 'ns' | 'us' | 'ms' | 's';
  hasHeader: boolean;
}

const TableImportDialog: React.FC<TableImportDialogProps> = ({
  open,
  onClose,
  onSuccess,
  connectionId,
  database,
  table,
  dbType,
}) => {
  const { t } = useDatabaseExplorerTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

  const form = useForm<ImportFormData>({
    defaultValues: {
      format: 'line_protocol',
      data: '',
      precision: 'ns',
      hasHeader: true,
    },
  });

  // 重置状态
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setFileContent('');
      setError(null);
      setImportResult(null);
      form.reset({
        format: dbType.toLowerCase() === 'iotdb' ? 'csv' : 'line_protocol',
        data: '',
        precision: 'ns',
        hasHeader: true,
      });
    }
  }, [open, table, dbType, form]);

  // 处理文件选择
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSelectedFile(file);
      const content = await file.text();
      setFileContent(content);
      form.setValue('data', content);

      // 自动检测格式
      if (file.name.endsWith('.csv')) {
        form.setValue('format', 'csv');
      } else if (file.name.endsWith('.json')) {
        form.setValue('format', 'json');
      } else if (file.name.endsWith('.txt') || file.name.endsWith('.lp')) {
        form.setValue('format', 'line_protocol');
      }
    } catch (err) {
      logger.error('读取文件失败:', err);
      setError(t('import.file_read_error'));
    }
  };

  // 清除选中的文件
  const clearFile = () => {
    setSelectedFile(null);
    setFileContent('');
    form.setValue('data', '');
  };

  // 执行导入
  const handleImport = async (values: ImportFormData) => {
    const data = values.data.trim();
    if (!data) {
      setError(t('import.no_data'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setImportResult(null);

      // 根据数据库类型和格式执行导入
      if (dbType.toLowerCase() === 'iotdb') {
        await importToIoTDB(data, values);
      } else if (dbType.toLowerCase() === 'influxdb2') {
        await importToInfluxDB2(data, values);
      } else {
        await importToInfluxDB1(data, values);
      }

      setImportResult({ success: true, message: t('import.success') });
      showMessage.success(t('import.success'));

      if (onSuccess) {
        onSuccess();
      }

      // 延迟关闭对话框
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      setImportResult({ success: false, message: errorMsg });
      showMessage.error(`${t('import.failed')}: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 导入到 InfluxDB 1.x
  const importToInfluxDB1 = async (data: string, values: ImportFormData) => {
    if (values.format === 'line_protocol') {
      await safeTauriInvoke('write_points', {
        connectionId,
        database,
        data,
        precision: values.precision,
      });
    } else if (values.format === 'csv') {
      // 转换 CSV 为 Line Protocol
      const lineProtocol = convertCsvToLineProtocol(data, table, values.hasHeader);
      await safeTauriInvoke('write_points', {
        connectionId,
        database,
        data: lineProtocol,
        precision: values.precision,
      });
    } else if (values.format === 'json') {
      // 转换 JSON 为 Line Protocol
      const lineProtocol = convertJsonToLineProtocol(data, table);
      await safeTauriInvoke('write_points', {
        connectionId,
        database,
        data: lineProtocol,
        precision: values.precision,
      });
    }
  };

  // 导入到 InfluxDB 2.x
  const importToInfluxDB2 = async (data: string, values: ImportFormData) => {
    if (values.format === 'line_protocol') {
      await safeTauriInvoke('write_points_v2', {
        connectionId,
        bucket: database,
        data,
        precision: values.precision,
      });
    } else if (values.format === 'csv') {
      const lineProtocol = convertCsvToLineProtocol(data, table, values.hasHeader);
      await safeTauriInvoke('write_points_v2', {
        connectionId,
        bucket: database,
        data: lineProtocol,
        precision: values.precision,
      });
    } else if (values.format === 'json') {
      const lineProtocol = convertJsonToLineProtocol(data, table);
      await safeTauriInvoke('write_points_v2', {
        connectionId,
        bucket: database,
        data: lineProtocol,
        precision: values.precision,
      });
    }
  };

  // 导入到 IoTDB
  const importToIoTDB = async (data: string, values: ImportFormData) => {
    if (values.format === 'csv') {
      await safeTauriInvoke('import_iotdb_csv', {
        connectionId,
        storageGroup: database,
        device: table,
        csvData: data,
        hasHeader: values.hasHeader,
      });
    } else {
      throw new Error(t('import.iotdb_csv_only'));
    }
  };

  // CSV 转 Line Protocol
  const convertCsvToLineProtocol = (csv: string, measurement: string, hasHeader: boolean): string => {
    const lines = csv.trim().split('\n');
    if (lines.length < (hasHeader ? 2 : 1)) {
      throw new Error(t('import.csv_empty'));
    }

    const headers = hasHeader ? lines[0].split(',').map(h => h.trim()) : [];
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const result: string[] = [];

    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim());
      if (values.length === 0) continue;

      let timestamp = Date.now() * 1000000; // 默认当前时间（纳秒）
      const fields: string[] = [];

      for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const header = hasHeader && headers[i] ? headers[i] : `field${i}`;

        // 检查是否是时间戳列
        if (header.toLowerCase() === 'time' || header.toLowerCase() === 'timestamp') {
          const parsed = parseInt(value);
          if (!isNaN(parsed)) {
            timestamp = parsed;
          }
          continue;
        }

        // 尝试解析为数字
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          fields.push(`${header}=${numValue}`);
        } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
          fields.push(`${header}=${value.toLowerCase()}`);
        } else {
          // 字符串值
          fields.push(`${header}="${value.replace(/"/g, '\\"')}"`);
        }
      }

      if (fields.length > 0) {
        result.push(`${measurement} ${fields.join(',')} ${timestamp}`);
      }
    }

    return result.join('\n');
  };

  // JSON 转 Line Protocol
  const convertJsonToLineProtocol = (json: string, measurement: string): string => {
    const data = JSON.parse(json);
    const items = Array.isArray(data) ? data : [data];

    const result: string[] = [];

    for (const item of items) {
      let timestamp = Date.now() * 1000000;
      const fields: string[] = [];
      const tags: string[] = [];

      for (const [key, value] of Object.entries(item)) {
        if (key.toLowerCase() === 'time' || key.toLowerCase() === 'timestamp') {
          const parsed = parseInt(value as string);
          if (!isNaN(parsed)) {
            timestamp = parsed;
          }
          continue;
        }

        if (typeof value === 'number') {
          fields.push(`${key}=${value}`);
        } else if (typeof value === 'boolean') {
          fields.push(`${key}=${value}`);
        } else if (typeof value === 'string') {
          // 短字符串作为 tag，长字符串作为 field
          if (value.length < 50 && !value.includes(' ')) {
            tags.push(`${key}=${value}`);
          } else {
            fields.push(`${key}="${value.replace(/"/g, '\\"')}"`);
          }
        }
      }

      if (fields.length > 0) {
        const tagStr = tags.length > 0 ? `,${tags.join(',')}` : '';
        result.push(`${measurement}${tagStr} ${fields.join(',')} ${timestamp}`);
      }
    }

    return result.join('\n');
  };

  // 获取数据库类型的显示名称
  const getDbTypeLabel = (): string => {
    switch (dbType.toLowerCase()) {
      case 'influxdb':
      case 'influxdb1':
        return 'InfluxDB 1.x';
      case 'influxdb2':
        return 'InfluxDB 2.x';
      case 'iotdb':
        return 'IoTDB';
      default:
        return dbType;
    }
  };

  // 获取支持的格式
  const getSupportedFormats = () => {
    if (dbType.toLowerCase() === 'iotdb') {
      return [{ value: 'csv', label: 'CSV', icon: FileText }];
    }
    return [
      { value: 'line_protocol', label: 'Line Protocol', icon: Code },
      { value: 'csv', label: 'CSV', icon: FileText },
      { value: 'json', label: 'JSON', icon: Code },
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-green-500" />
            {t('import.title')}
          </DialogTitle>
          <DialogDescription>
            {t('import.description', { table, database })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {/* 表信息 */}
          <Alert className="mb-4">
            <Database className="w-4 h-4" />
            <div className="ml-2">
              <div className="text-sm font-medium">
                {getDbTypeLabel()} - {database}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Table className="w-3 h-3" />
                {table}
              </div>
            </div>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleImport)} className="space-y-4">
              {/* 导入格式 */}
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('import.format')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('import.select_format')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getSupportedFormats().map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div className="flex items-center gap-2">
                              <format.icon className="w-4 h-4" />
                              {format.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 时间精度 (仅 InfluxDB Line Protocol) */}
              {dbType.toLowerCase() !== 'iotdb' && form.watch('format') === 'line_protocol' && (
                <FormField
                  control={form.control}
                  name="precision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('import.precision')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ns">{t('import.precision_ns')}</SelectItem>
                          <SelectItem value="us">{t('import.precision_us')}</SelectItem>
                          <SelectItem value="ms">{t('import.precision_ms')}</SelectItem>
                          <SelectItem value="s">{t('import.precision_s')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('import.precision_hint')}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* CSV 包含表头选项 */}
              {form.watch('format') === 'csv' && (
                <FormField
                  control={form.control}
                  name="hasHeader"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>{t('import.has_header')}</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {t('import.has_header_hint')}
                        </p>
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
              )}

              {/* 文件选择 */}
              <div className="space-y-2">
                <FormLabel>{t('import.file')}</FormLabel>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv,.json,.txt,.lp"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <File className="w-4 h-4 mr-2" />
                    {t('import.select_file')}
                  </Button>
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">{selectedFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 数据输入 */}
              <FormField
                control={form.control}
                name="data"
                rules={{ required: t('import.data_required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('import.data')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('import.data_placeholder')}
                        className="font-mono text-xs h-40"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('import.data_hint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 结果提示 */}
              {importResult && (
                <Alert variant={importResult.success ? 'default' : 'destructive'}>
                  {importResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <div className="ml-2">{importResult.message}</div>
                </Alert>
              )}

              {/* 错误提示 */}
              {error && !importResult && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <div className="ml-2">{error}</div>
                </Alert>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('import.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleImport)}
            disabled={loading || !form.watch('data').trim()}
          >
            {loading ? (
              <>
                <Spin className="w-4 h-4 mr-2" />
                {t('import.importing')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('import.import')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableImportDialog;
