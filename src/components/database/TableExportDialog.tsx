/**
 * TableExportDialog - 表数据导出对话框
 *
 * 从右键菜单打开，用于导出表/测量的数据
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Spin,
  Alert,
} from '@/components/ui';
import {
  Download,
  FileText,
  Code,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Database,
  Table,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import { showMessage } from '@/utils/message';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';
import type { QueryResult } from '@/types';
import logger from '@/utils/logger';

interface TableExportDialogProps {
  open: boolean;
  onClose: () => void;
  connectionId: string;
  database: string;
  table: string;
  dbType: string;
}

interface ExportFormData {
  format: 'csv' | 'json' | 'excel';
  filename: string;
  limit: number;
  includeHeaders: boolean;
  delimiter: string;
}

const TableExportDialog: React.FC<TableExportDialogProps> = ({
  open,
  onClose,
  connectionId,
  database,
  table,
  dbType,
}) => {
  const { t } = useDatabaseExplorerTranslation();
  const [loading, setLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ExportFormData>({
    defaultValues: {
      format: 'csv',
      filename: `${table}_export`,
      limit: 10000,
      includeHeaders: true,
      delimiter: ',',
    },
  });

  // 重置状态
  useEffect(() => {
    if (open) {
      setQueryResult(null);
      setError(null);
      form.reset({
        format: 'csv',
        filename: `${table}_export`,
        limit: 10000,
        includeHeaders: true,
        delimiter: ',',
      });
    }
  }, [open, table, form]);

  // 生成查询语句（根据数据库类型）
  const generateQuery = (limit: number): string => {
    switch (dbType.toLowerCase()) {
      case 'influxdb':
      case 'influxdb1':
        return `SELECT * FROM "${table}" LIMIT ${limit}`;
      case 'influxdb2':
        // InfluxDB 2.x 使用 Flux 查询
        return `from(bucket: "${database}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "${table}")
  |> limit(n: ${limit})`;
      case 'influxdb3':
        // InfluxDB 3.x 使用标准 SQL 查询
        return `SELECT * FROM "${table}" ORDER BY time DESC LIMIT ${limit}`;
      case 'iotdb':
        return `SELECT * FROM ${database}.${table} LIMIT ${limit}`;
      default:
        return `SELECT * FROM "${table}" LIMIT ${limit}`;
    }
  };

  // 查询数据
  const fetchData = async (limit: number): Promise<QueryResult | null> => {
    try {
      const query = generateQuery(limit);

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request: {
          connectionId,
          database,
          query,
        },
      });

      return result;
    } catch (err) {
      logger.error('查询数据失败:', err);
      throw err;
    }
  };

  // 执行导出
  const handleExport = async (values: ExportFormData) => {
    try {
      setLoading(true);
      setError(null);

      // 1. 查询数据
      const result = await fetchData(values.limit);

      if (!result || !result.data || result.data.length === 0) {
        setError(t('export.no_data'));
        return;
      }

      setQueryResult(result);

      // 2. 导出数据
      const success = await exportWithNativeDialog(result, {
        format: values.format,
        includeHeaders: values.includeHeaders,
        delimiter: values.delimiter,
        defaultFilename: values.filename,
      });

      if (success) {
        showMessage.success(t('export.success'));
        onClose();
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      showMessage.error(`${t('export.failed')}: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取数据库类型的显示名称
  const getDbTypeLabel = (): string => {
    switch (dbType.toLowerCase()) {
      case 'influxdb':
      case 'influxdb1':
        return 'InfluxDB 1.x';
      case 'influxdb2':
        return 'InfluxDB 2.x';
      case 'influxdb3':
        return 'InfluxDB 3.x';
      case 'iotdb':
        return 'IoTDB';
      default:
        return dbType;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            {t('export.title')}
          </DialogTitle>
          <DialogDescription>
            {t('export.description', { table, database })}
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
            <form onSubmit={form.handleSubmit(handleExport)} className="space-y-4">
              {/* 文件名 */}
              <FormField
                control={form.control}
                name="filename"
                rules={{ required: t('export.filename_required') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('export.filename')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('export.filename_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 导出格式 */}
              <FormField
                control={form.control}
                name="format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('export.format')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('export.select_format')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="csv">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            CSV
                          </div>
                        </SelectItem>
                        <SelectItem value="json">
                          <div className="flex items-center gap-2">
                            <Code className="w-4 h-4" />
                            JSON
                          </div>
                        </SelectItem>
                        <SelectItem value="excel">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4" />
                            Excel
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 数据限制 */}
              <FormField
                control={form.control}
                name="limit"
                rules={{
                  required: t('export.limit_required'),
                  min: { value: 1, message: t('export.limit_min') },
                  max: { value: 1000000, message: t('export.limit_max') },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('export.limit')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 10000)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('export.limit_hint')}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 包含表头 (仅 CSV) */}
              {form.watch('format') === 'csv' && (
                <>
                  <FormField
                    control={form.control}
                    name="includeHeaders"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>{t('export.include_headers')}</FormLabel>
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

                  {/* 分隔符 */}
                  <FormField
                    control={form.control}
                    name="delimiter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('export.delimiter')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=",">{t('export.delimiter_comma')}</SelectItem>
                            <SelectItem value=";">{t('export.delimiter_semicolon')}</SelectItem>
                            <SelectItem value="\t">{t('export.delimiter_tab')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* 错误提示 */}
              {error && (
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
            {t('export.cancel')}
          </Button>
          <Button
            onClick={form.handleSubmit(handleExport)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spin className="w-4 h-4 mr-2" />
                {t('export.exporting')}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                {t('export.export')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableExportDialog;
