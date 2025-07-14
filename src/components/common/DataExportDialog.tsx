﻿import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Alert, Switch, Separator, Textarea, Row, Col, InputNumber } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Download, Table, Info, FileText, Code, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
// import { save } from '@tauri-apps/api/dialog'; // TODO: Update to Tauri v2 API
import type { DataExportConfig, DataExportResult, Connection } from '@/types';

interface DataExportDialogProps {
  open: boolean;
  onClose: () => void;
  connections: Connection[];
  currentConnection?: string;
  currentDatabase?: string;
  query?: string;
  onSuccess?: (result: DataExportResult) => void;
}

// Form validation schema
const formSchema = z.object({
  connectionId: z.string().min(1, '请选择连接'),
  database: z.string().min(1, '请输入数据库名'),
  query: z.string().min(1, '请输入查询语句'),
  format: z.string().min(1, '请选择导出格式'),
  filePath: z.string().optional(),
  options: z.object({
    includeHeaders: z.boolean().default(true),
    delimiter: z.string().default(','),
    encoding: z.string().default('utf-8'),
    compression: z.boolean().default(false),
    chunkSize: z.number().min(1000).max(100000).default(10000),
  }).default({
    includeHeaders: true,
    delimiter: ',',
    encoding: 'utf-8',
    compression: false,
    chunkSize: 10000,
  }),
});

type FormData = z.infer<typeof formSchema>;

const DataExportDialog: React.FC<DataExportDialogProps> = ({
  open,
  onClose,
  connections,
  currentConnection,
  currentDatabase,
  query,
  onSuccess}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      connectionId: '',
      database: '',
      query: '',
      format: 'csv',
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
  const [exportResult, setExportResult] = useState<DataExportResult | null>(null);
  const [estimateInfo, setEstimateInfo] = useState<any>(null);

  // 格式图标映射
  const formatIcons: Record<string, React.ReactNode> = {
    csv: <FileText className="w-4 h-4"  />,
    excel: <FileSpreadsheet />,
    json: <Code className="w-4 h-4"  />,
    sql: <Table className="w-4 h-4"  />};

  // 初始化表单
  useEffect(() => {
    if (open) {
      form.reset({
        connectionId: currentConnection || '',
        database: currentDatabase || '',
        query: query || '',
        format: 'csv',
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
      loadExportFormats();
    }
  }, [open, currentConnection, currentDatabase, query, form]);

  // 加载导出格式
  const loadExportFormats = async () => {
    try {
      const formats = await safeTauriInvoke('get_export_formats') as any[];
      setExportFormats(formats);
    } catch (error) {
      console.error('加载导出格式失败:', error);
    }
  };

  // 预估导出大小
  const estimateExportSize = async () => {
    try {
      const isValid = await form.trigger(['connectionId', 'database', 'query', 'format']);
      if (!isValid) {
        toast({ title: "错误", description: "请填写必要字段", variant: "destructive" });
        return;
      }

      const values = form.getValues();
      setEstimating(true);

      const estimate = await safeTauriInvoke('estimate_export_size', {
        connectionId: values.connectionId,
        database: values.database,
        query: values.query,
        format: values.format});

      setEstimateInfo(estimate);
      toast({ title: "成功", description: "预估完成" });
    } catch (error) {
      console.error('预估失败:', error);
      toast({ title: "错误", description: "预估失败", variant: "destructive" });
    } finally {
      setEstimating(false);
    }
  };

  // 选择保存路径
  const selectSavePath = async () => {
    try {
      const format = form.watch('format');
      const formatInfo = exportFormats.find(f => f.id === format);
      const extension = formatInfo?.extension || '.txt';

      // TODO: Update to Tauri v2 API for file dialog
      const filePath = `export_${Date.now()}${extension}`; // Temporary placeholder

      if (filePath) {
        form.setValue('filePath', filePath);
      }
    } catch (error) {
      console.error('选择文件路径失败:', error);
      toast({ title: "错误", description: "选择文件路径失败", variant: "destructive" });
    }
  };

  // 执行导出
  const executeExport = async () => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({ title: "错误", description: "请检查表单输入", variant: "destructive" });
        return;
      }

      const values = form.getValues();

      if (!values.filePath) {
        toast({ title: "警告", description: "请选择保存路径" });
        return;
      }

      setLoading(true);
      setExportResult(null);

      const exportConfig: DataExportConfig = {
        connectionId: values.connectionId,
        database: values.database,
        query: values.query,
        format: values.format,
        options: values.options};

      const result = await safeTauriInvoke('export_query_data', {
        request: {
          ...exportConfig,
          file_path: values.filePath}}) as DataExportResult;

      setExportResult(result);

      if (result.success) {
        toast({ title: "成功", description: "数据导出成功" });
        onSuccess?.(result);
      } else {
        toast({ title: "错误", description: "数据导出失败", variant: "destructive" });
      }
    } catch (error) {
      console.error('导出失败:', error);
      toast({ title: "错误", description: `导出失败: ${error}`, variant: "destructive" });
      setExportResult({
        success: false,
        message: `导出失败: ${error}`,
        rowCount: 0,
        fileSize: 0,
        duration: 0,
        errors: [String(error)]});
    } finally {
      setLoading(false);
    }
  };

  const canExport = () => {
    const values = form.getValues();
    return values.connectionId &&
           values.database &&
           values.query?.trim() &&
           values.filePath &&
           !loading;
  };

  return (
    <Dialog
      title="数据导出"
      open={open}
      onOpenChange={(open) => !open && (onClose)()}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="estimate"
          icon={<Info className="w-4 h-4"  />}
          disabled={estimating}
          onClick={estimateExportSize}>
          预估大小
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<Download className="w-4 h-4"  />}
          disabled={loading || !canExport()}
          onClick={executeExport}>
          开始导出
        </Button>,
      ]}>
    </Dialog>
  );
};

export default DataExportDialog;
