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
          message: '导出成功',
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
        showMessage.error('请填写必要信息');
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
        showMessage.warning('数据库查询导出功能开发中，请使用查询结果导出');
        setLoading(false);
        return;
      }

      setExportResult(result);

      if (result.success) {
        showMessage.success('数据导出成功');
        onSuccess?.(result);
        if (hasQueryResult) {
          onClose(); // 查询结果导出成功后自动关闭
        }
      } else {
        showMessage.error('数据导出失败');
      }
    } catch (error) {
      console.error('导出失败:', error);
      showMessage.error(`导出失败: ${error}`);
      setExportResult({
        success: false,
        message: `导出失败: ${error}`,
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
                <FormLabel>导出格式</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='选择导出格式' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='csv'>
                      <div className='flex items-center gap-2'>
                        <FileText className='w-4 h-4' />
                        CSV 格式
                      </div>
                    </SelectItem>
                    <SelectItem value='json'>
                      <div className='flex items-center gap-2'>
                        <Code className='w-4 h-4' />
                        JSON 格式
                      </div>
                    </SelectItem>
                    <SelectItem value='excel'>
                      <div className='flex items-center gap-2'>
                        <FileSpreadsheet className='w-4 h-4' />
                        Excel 格式
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
                <FormLabel>文件名</FormLabel>
                <FormControl>
                  <Input placeholder='请输入文件名（不含扩展名）' {...field} />
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
                <FormLabel className='text-base'>包含表头</FormLabel>
                <div className='text-sm text-muted-foreground'>
                  在导出文件中包含列标题
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
              <FormLabel>分隔符 (仅CSV格式)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择分隔符' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value=','>逗号 (,)</SelectItem>
                  <SelectItem value=';'>分号 (;)</SelectItem>
                  <SelectItem value='\t'>制表符 (\t)</SelectItem>
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
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {hasQueryResult ? '导出查询结果' : '数据导出'}
          </DialogTitle>
          <DialogDescription>
            {hasQueryResult ? '将查询结果导出为 CSV、JSON 或 Excel 格式' : '选择数据源和导出格式'}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {hasQueryResult && queryResult ? (
            // 查询结果导出模式
            <div>
              <Alert className='mb-4'>
                <CheckCircle className='w-4 h-4' />
                <div>
                  <div className='font-medium'>准备导出查询结果</div>
                  <div className='text-sm text-muted-foreground'>
                    共 {queryResult.data?.length || 0}{' '}
                    条记录，选择导出格式和文件名
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
                  <div className='font-medium'>数据库查询导出</div>
                  <div className='text-sm text-muted-foreground'>
                    配置连接信息和查询语句，然后导出数据
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
                  {exportResult.success ? '导出成功' : '导出失败'}
                </div>
                <div className='text-sm text-muted-foreground'>
                  {exportResult.message}
                </div>
              </div>
            </Alert>
          )}
        </div>

        {/* 底部按钮 */}
        <div className='flex justify-end gap-2 pt-4 border-t'>
          <Button variant='outline' onClick={onClose}>
            取消
          </Button>
          {!hasQueryResult && (
            <Button
              variant='outline'
              disabled={estimating}
              onClick={estimateExportSize}
            >
              <Info className='w-4 h-4 mr-2' />
              预估大小
            </Button>
          )}
          <Button disabled={loading || !canExport()} onClick={executeExport}>
            <Download className='w-4 h-4 mr-2' />
            {loading ? '导出中...' : '开始导出'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataExportDialog;
