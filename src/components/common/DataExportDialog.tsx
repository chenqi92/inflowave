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
  Switch,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import { getFileOperationError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import {
  Download,
  Table,
  Info,
  FileText,
  Code,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { exportWithNativeDialog } from '@/utils/nativeExport';
import type { DataExportResult, Connection, QueryResult } from '@/types';
import { useDataTranslation } from '@/hooks/useTranslation';

interface DataExportDialogProps {
  open: boolean;
  onClose: () => void;
  connections: Connection[];
  currentConnection?: string;
  currentDatabase?: string;
  query?: string;
  queryResult?: QueryResult | null; // 新增：支持直接从查询结果导出
  defaultFilename?: string; // 新增：默认文件名
  onSuccess?: (result: DataExportResult) => void;
}

interface FormData {
  connection_id?: string;
  database?: string;
  query?: string;
  format: string;
  filename: string;
  filePath?: string;
  options: {
    includeHeaders: boolean;
    delimiter: string;
    encoding: string;
    compression: boolean;
    chunkSize: number;
  };
}

const DataExportDialog: React.FC<DataExportDialogProps> = ({
  open,
  onClose,
  connections,
  currentConnection,
  currentDatabase,
  query,
  queryResult,
  defaultFilename,
  onSuccess,
}) => {
  const { t } = useDataTranslation();
  const hasQueryResult = !!queryResult;

  const form = useForm<FormData>({
    defaultValues: {
      connection_id: currentConnection || '',
      database: currentDatabase || '',
      query: query || '',
      format: 'csv',
      filename: defaultFilename || '',
      filePath: '',
      options: {
        includeHeaders: true,
        delimiter: ',',
        encoding: 'utf-8',
        compression: false,
        chunkSize: 10000,
      },
    },
  });
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [exportFormats, setExportFormats] = useState<any[]>([]);
  const [exportResult, setExportResult] = useState<DataExportResult | null>(
    null
  );
  const [estimateInfo, setEstimateInfo] = useState<any>(null);

  // 格式图标映射
  const formatIcons: Record<string, React.ReactNode> = {
    csv: <FileText className='w-4 h-4' />,
    excel: <FileSpreadsheet className='w-4 h-4' />,
    json: <Code className='w-4 h-4' />,
    sql: <Table className='w-4 h-4' />,
  };

  // 从查询结果导出
  const exportFromQueryResult = async (
    queryResult: QueryResult,
    values: FormData
  ): Promise<DataExportResult> => {
    const { format, filename, options } = values;

    try {
      // 使用原生导出功能
      const success = await exportWithNativeDialog(queryResult, {
        format: format as 'csv' | 'json' | 'excel' | 'xlsx',
        includeHeaders: options.includeHeaders,
        delimiter: options.delimiter,
        defaultFilename: filename
      });

      if (success) {
        return {
          success: true,
          message: t('export.export_success'),
          filePath: `${filename}.${format}`,
          recordCount: queryResult.data?.length || 0,
          fileSize: 0,
          duration: 1000,
        };
      } else {
        // 用户取消导出，不视为错误
        return {
          success: true,
          message: '操作已取消',
          filePath: '',
          recordCount: 0,
          fileSize: 0,
          duration: 0,
        };
      }
    } catch (error) {
      const friendlyError = getFileOperationError(String(error), 'save');
      return {
        success: false,
        message: formatErrorMessage(friendlyError),
        filePath: '',
        recordCount: 0,
        fileSize: 0,
        duration: 0,
      };
    }
  };

  // 初始化表单
  useEffect(() => {
    if (open) {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, 19);
      const filename =
        defaultFilename ||
        (hasQueryResult ? `influxdb-query-${timestamp}` : '');

      form.reset({
        connection_id: currentConnection || '',
        database: currentDatabase || '',
        query: query || '',
        format: 'csv',
        filename,
        filePath: '',
        options: {
          includeHeaders: true,
          delimiter: ',',
          encoding: 'utf-8',
          compression: false,
          chunkSize: 10000,
        },
      });
      setExportResult(null);
      setEstimateInfo(null);
      if (!hasQueryResult) {
        loadExportFormats();
      }
    }
  }, [
    open,
    currentConnection,
    currentDatabase,
    query,
    defaultFilename,
    hasQueryResult,
    form,
  ]);

  // 加载导出格式
  const loadExportFormats = async () => {
    try {
      const formats = (await safeTauriInvoke('get_export_formats')) as any[];
      setExportFormats(formats);
    } catch (error) {
      console.error('加载导出格式失败:', error);
    }
  };

  // 预估导出大小
  const estimateExportSize = async () => {
    showMessage.info('预估功能开发中');
  };

  // 选择保存路径
  const selectSavePath = async () => {
    showMessage.info('文件选择功能开发中');
  };

  // 执行导出
  const executeExport = async () => {
    try {
      const values = form.getValues();

      if (!values.format || !values.filename) {
        showMessage.error(t('export.please_fill_required'));
        return;
      }

      setLoading(true);
      setExportResult(null);

      let result: DataExportResult;

      if (hasQueryResult && queryResult) {
        // 直接从查询结果导出
        result = await exportFromQueryResult(queryResult, values);
      } else {
        // 从数据库查询导出 - 暂时显示开发中提示
        showMessage.warning(t('export.db_export_in_development'));
        setLoading(false);
        return;
      }

      setExportResult(result);

      if (result.success) {
        showMessage.success(t('export.export_success'));
        onSuccess?.(result);
        if (hasQueryResult) {
          onClose(); // 查询结果导出成功后自动关闭
        }
      } else {
        showMessage.error(t('export.export_failed'));
      }
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(t('export.export_failed_with_error', { error: String(error) }));
      setExportResult({
        success: false,
        message: t('export.export_failed_with_error', { error: String(error) }),
        filePath: '',
        recordCount: 0,
        fileSize: 0,
        duration: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const canExport = () => {
    const values = form.getValues();

    if (hasQueryResult && queryResult) {
      // 查询结果模式：只需要格式和文件名
      return values.format && values.filename?.trim() && !loading;
    } else {
      // 数据库查询模式：需要完整的连接信息
      return (
        values.connection_id &&
        values.database &&
        values.query?.trim() &&
        values.filePath &&
        !loading
      );
    }
  };

  // 渲染查询结果导出表单
  const renderQueryResultExportForm = () => (
    <Form {...form}>
      <form className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='format'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('export.export_format')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('export.select_format')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='csv'>
                      <div className='flex items-center gap-2'>
                        <FileText className='w-4 h-4' />
                        {t('export.csv_format')}
                      </div>
                    </SelectItem>
                    <SelectItem value='json'>
                      <div className='flex items-center gap-2'>
                        <Code className='w-4 h-4' />
                        {t('export.json_format')}
                      </div>
                    </SelectItem>
                    <SelectItem value='excel'>
                      <div className='flex items-center gap-2'>
                        <FileSpreadsheet className='w-4 h-4' />
                        {t('export.excel_format')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='filename'
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
        </div>

        <FormField
          control={form.control}
          name='options.includeHeaders'
          render={({ field }) => (
            <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
              <div className='space-y-0.5'>
                <FormLabel className='text-base'>{t('export.include_headers')}</FormLabel>
                <div className='text-sm text-muted-foreground'>
                  {t('export.include_headers_desc')}
                </div>
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

        <FormField
          control={form.control}
          name='options.delimiter'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('export.delimiter')}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('export.select_delimiter')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value=','>{t('export.delimiter_comma')}</SelectItem>
                  <SelectItem value=';'>{t('export.delimiter_semicolon')}</SelectItem>
                  <SelectItem value='\t'>{t('export.delimiter_tab')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  // 渲染数据库导出表单（保持原有逻辑）
  const renderDatabaseExportForm = () => (
    <div>
      <Alert className='mb-4'>
        <Info className='w-4 h-4' />
        <div>
          <div className='font-medium'>功能开发中</div>
          <div className='text-sm text-muted-foreground'>
            数据库查询导出功能正在开发中，请使用查询结果导出功能
          </div>
        </div>
      </Alert>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className='max-w-4xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden'>
        <DialogHeader className='px-6 py-4 border-b shrink-0'>
          <DialogTitle>
            {hasQueryResult ? t('export.dialog_title_query_result') : t('export.dialog_title')}
          </DialogTitle>
          <DialogDescription>
            {hasQueryResult ? t('export.dialog_description_query_result') : t('export.dialog_description')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0'>
          {hasQueryResult && queryResult ? (
            // 查询结果导出模式
            <div>
              <Alert className='mb-4'>
                <CheckCircle className='w-4 h-4' />
                <div>
                  <div className='font-medium'>{t('export.prepare_export_query_result')}</div>
                  <div className='text-sm text-muted-foreground'>
                    {t('export.records_count', { count: queryResult.data?.length || 0 })}
                  </div>
                </div>
              </Alert>
              {renderQueryResultExportForm()}
            </div>
          ) : (
            // 数据库查询导出模式
            <div>
              <Alert className='mb-4'>
                <Info className='w-4 h-4' />
                <div>
                  <div className='font-medium'>{t('export.db_query_export')}</div>
                  <div className='text-sm text-muted-foreground'>
                    {t('export.db_query_export_desc')}
                  </div>
                </div>
              </Alert>
              {renderDatabaseExportForm()}
            </div>
          )}

          {/* 导出结果显示 */}
          {exportResult && (
            <Alert
              className={
                exportResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }
            >
              {exportResult.success ? (
                <CheckCircle className='w-4 h-4 text-green-600' />
              ) : (
                <AlertCircle className='w-4 h-4 text-red-600' />
              )}
              <div>
                <div className='font-medium'>
                  {exportResult.success ? t('export.export_result_success') : t('export.export_result_failed')}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {exportResult.message}
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* 底部按钮 - 固定在底部 */}
        <div className='flex justify-end gap-2 px-6 py-4 border-t shrink-0 bg-background'>
          <Button variant='outline' onClick={onClose}>
            {t('export.cancel_button')}
          </Button>
          {!hasQueryResult && (
            <Button
              variant='outline'
              disabled={estimating}
              onClick={estimateExportSize}
            >
              <Info className='w-4 h-4 mr-2' />
              {t('export.estimate_size')}
            </Button>
          )}
          <Button disabled={loading || !canExport()} onClick={executeExport}>
            <Download className='w-4 h-4 mr-2' />
            {loading ? t('export.exporting') : t('export.export_button')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataExportDialog;
