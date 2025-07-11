import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space, Alert, message, Switch } from '@/components/ui';
import { DownloadOutlined, TableOutlined, FileTextOutlined, FileExcelOutlined } from '@/components/ui';
import type { QueryResult } from '@/types';

interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  includeHeaders: boolean;
  delimiter?: string;
  filename?: string;
}




interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
  queryResult: QueryResult | null;
  defaultFilename?: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  onClose,
  queryResult,
  defaultFilename,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  useEffect(() => {
    if (visible && queryResult) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      form.setFieldsValue({
        format: 'csv',
        includeHeaders: true,
        delimiter: ',',
        filename: defaultFilename || `influxdb-query-${timestamp}`,
      });
    }
  }, [visible, queryResult, defaultFilename, form]);

  // 执行导出
  const handleExport = async () => {
    if (!queryResult) {
      message.error('没有可导出的查询结果');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      const options: ExportOptions = {
        format: values.format,
        includeHeaders: values.includeHeaders,
        delimiter: values.delimiter,
        filename: values.filename,
      };

      // 简化的导出逻辑 - 实际应用中这里会调用真正的导出功能
      console.log('Export options:', options);
      console.log('Query result:', queryResult);

      // 模拟导出过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      message.success('导出功能开发中，请查看控制台输出');
      onClose();
    } catch (error) {
      message.error(`导出失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="导出查询结果"
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<DownloadOutlined />}
          loading={loading}
          onClick={handleExport}
          disabled={!queryResult}
        >
          导出
        </Button>,
      ]}
    >
      {queryResult ? (
        <div>
          <Alert
            message="导出功能"
            description="选择导出格式和文件名，然后点击导出按钮。"
            type="info"
            style={{ marginBottom: 16 }}
          />

          <Form form={form} layout="vertical">
            <Form.Item
              label="导出格式"
              name="format"
              rules={[{ required: true, message: '请选择导出格式' }]}
            >
              <Select>
                <Select.Option value="csv">
                  <Space>
                    <TableOutlined />
                    CSV 格式
                  </Space>
                </Select.Option>
                <Select.Option value="json">
                  <Space>
                    <FileTextOutlined />
                    JSON 格式
                  </Space>
                </Select.Option>
                <Select.Option value="excel">
                  <Space>
                    <FileExcelOutlined />
                    Excel 格式
                  </Space>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="文件名"
              name="filename"
              rules={[{ required: true, message: '请输入文件名' }]}
            >
              <Input placeholder="请输入文件名（不含扩展名）" />
            </Form.Item>

            <Form.Item
              label="包含表头"
              name="includeHeaders"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="分隔符"
              name="delimiter"
            >
              <Select>
                <Select.Option value=",">逗号 (,)</Select.Option>
                <Select.Option value=";">分号 (;)</Select.Option>
                <Select.Option value="\t">制表符 (\t)</Select.Option>
              </Select>
            </Form.Item>
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
    </Modal>
  );
};

export default ExportDialog;
