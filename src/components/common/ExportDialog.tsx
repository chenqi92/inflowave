import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Alert, Switch } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Download, Table, FileText, FileSpreadsheet } from 'lucide-react';
import type { QueryResult } from '@/types';

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeHeaders: boolean;
  delimiter?: string;
  filename?: string;
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  queryResult: QueryResult | null;
  defaultFilename?: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  queryResult,
  defaultFilename}) => {
  const form = useForm();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  useEffect(() => {
    if (open && queryResult) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      form.reset({
        format: 'csv',
        includeHeaders: true,
        delimiter: ',',
        filename: defaultFilename || `influxdb-query-${timestamp}`});
    }
  }, [open, queryResult, defaultFilename, form]);

  // 执行导出
  const handleExport = async () => {
    if (!queryResult) {
      toast({ title: "错误", description: "没有可导出的查询结果", variant: "destructive" });
      return;
    }

    try {
      const values = form.getValues();
      setLoading(true);

      const options: ExportOptions = {
        format: values.format,
        includeHeaders: values.includeHeaders,
        delimiter: values.delimiter,
        filename: values.filename};

      // 简化的导出逻辑 - 实际应用中这里会调用真正的导出功能
      console.log('Export options:', options);
      console.log('Query result:', queryResult);

      // 模拟导出过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({ title: "成功", description: "导出功能开发中，请查看控制台输出" });
      onClose();
    } catch (error) {
      toast({ title: "错误", description: `导出失败: ${error}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出查询结果</DialogTitle>
        </DialogHeader>
      {queryResult ? (
        <div>
          <Alert
            message="导出功能"
            description="选择导出格式和文件名，然后点击导出按钮。"
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form form={form} layout="vertical">
            <FormItem
              label="导出格式"
              name="format"
              rules={[{ required: true, message: '请选择导出格式' }]}
            >
              <Select>
                <Select.Option value="csv">
                  <div className="flex gap-2">
                    <Table className="w-4 h-4"  />
                    CSV 格式
                  </div>
                </Select.Option>
                <Select.Option value="json">
                  <div className="flex gap-2">
                    <FileText className="w-4 h-4"  />
                    JSON 格式
                  </div>
                </Select.Option>
                <Select.Option value="excel">
                  <div className="flex gap-2">
                    <FileSpreadsheet />
                    Excel 格式
                  </div>
                </Select.Option>
              </Select>
            </FormItem>

            <FormItem
              label="文件名"
              name="filename"
              rules={[{ required: true, message: '请输入文件名' }]}
            >
              <Input placeholder="请输入文件名（不含扩展名）" />
            </FormItem>

            <FormItem
              label="包含表头"
              name="includeHeaders"
              valuePropName="checked"
            >
              <Switch />
            </FormItem>

            <FormItem
              label="分隔符"
              name="delimiter"
            >
              <Select>
                <Select.Option value=",">逗号 (,)</Select.Option>
                <Select.Option value=";">分号 (;)</Select.Option>
                <Select.Option value="\t">制表符 (\t)</Select.Option>
              </Select>
            </FormItem>
          </Form>

          <Alert
            message="导出说明"
            description="CSV格式适用于Excel等表格软件，JSON格式保留完整的数据结构。"
            type="info"
            style={{ marginTop: 16 }}
          />
        </div>
      ) : (
        <Alert
          message="无可导出数据"
          description="请先执行查询获取数据后再进行导出。"
          type="warning"
          showIcon
        />
      )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
