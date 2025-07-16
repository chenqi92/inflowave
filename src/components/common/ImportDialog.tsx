﻿import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Button, Alert, Switch, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Typography } from '@/components/ui';
import { showMessage, showNotification } from '@/utils/message';
import { Upload as UploadIcon, Database, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui';

import type { UploadFile, UploadProps } from '@/components/ui';
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
  preview: (string | number)[];
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
  onSuccess}) => {
  const form = useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);

  // 重置状态
  const resetState = useCallback(() => {
    setCurrentStep(0);
    setFileList([]);
    setImportData(null);
    setFieldMappings([]);
    form.reset();
  }, [form]);

  // 加载测量列表
  const loadMeasurements = useCallback(async () => {
    if (!connectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId,
        database});
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

  // 文件上传配置
  const uploadProps: UploadProps = {
    accept: '.csv,.json,.txt',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      setFileList([file]);
      parseFile(file);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setFileList([]);
      setImportData(null);
      setCurrentStep(0);
    }};

  // 解析文件
  const parseFile = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const fileType = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
      
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
        dataType: inferDataType(data.rows, index)}));
      
      setFieldMappings(mappings);
      setCurrentStep(1);
    } catch (error) {
      showNotification.error({
        message: "文件解析失败",
        description: String(error)
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

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
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
  const inferDataType = (rows: (string | number)[][], columnIndex: number): 'string' | 'number' | 'boolean' | 'timestamp' => {
    const samples = rows.slice(0, 10).map(row => row[columnIndex]);
    
    // 检查是否为时间戳
    if (samples.some(sample => /^\d{4}-\d{2}-\d{2}/.test(sample) || /^\d{10,13}$/.test(sample))) {
      return 'timestamp';
    }
    
    // 检查是否为数字
    if (samples.every(sample => !isNaN(Number(sample)))) {
      return 'number';
    }
    
    // 检查是否为布尔值
    if (samples.every(sample => ['true', 'false', '1', '0'].includes(String(sample).toLowerCase()))) {
      return 'boolean';
    }
    
    return 'string';
  };

  // 更新字段映射
  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: string) => {
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
          skipErrors: values.skipErrors || false}};

      // 调用后端导入接口
      await safeTauriInvoke('import_data', importRequest);

      showMessage.success("数据导入成功" );
      setCurrentStep(2);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showNotification.error({
        message: "数据导入失败",
        description: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  // 字段映射表格列
  const mappingColumns = [
    {
      title: '源字段',
      dataIndex: 'sourceField',
      key: 'sourceField'},
    {
      title: '目标字段',
      dataIndex: 'targetField',
      key: 'targetField',
      render: (value: string, _: FieldMapping, index: number) => (
        <Input
          value={value}
          onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
          placeholder="输入目标字段名"
        />
      )},
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      render: (value: string, _: FieldMapping, index: number) => (
        <Select
          value={value}
          onValueChange={(val) => updateFieldMapping(index, 'fieldType', val)}
          style={{ width: 100 }}
        >
          <Option value="time">时间</Option>
          <Option value="tag">标签</Option>
          <Option value="field">字段</Option>
        </Select>
      )},
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (value: string, record: FieldMapping, index: number) => (
        <Select
          value={value}
          onValueChange={(val) => updateFieldMapping(index, 'dataType', val)}
          style={{ width: 120 }}
          disabled={record.fieldType === 'time'}
        >
          <Option value="string">字符串</Option>
          <Option value="number">数字</Option>
          <Option value="boolean">布尔值</Option>
          <Option value="timestamp">时间戳</Option>
        </Select>
      )},
  ];

  // 数据预览表格列
  const previewColumns = importData?.headers.map((header, index) => ({
    title: header,
    dataIndex: index,
    key: index,
    width: 150,
    ellipsis: true})) || [];

  const previewDataSource = importData?.preview.map((row, index) => ({
    key: index,
    ...row.reduce((acc: Record<string, string | number>, cell: string | number, cellIndex: number) => {
      acc[cellIndex] = cell;
      return acc;
    }, {} as Record<string, string | number>)})) || [];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>数据导入</DialogTitle>
        </DialogHeader>
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <div className="flex items-center justify-between mb-6">
          {[
            { title: "上传文件", icon: <UploadIcon className="w-4 h-4" /> },
            { title: "配置映射", icon: <Database className="w-4 h-4" /> },
            { title: "导入完成", icon: <CheckCircle className="w-4 h-4" /> }
          ].map((step, index) => (
            <div key={index} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStep ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-muted'
              }`}>
                {step.icon}
              </div>
              <div className="ml-2 text-sm font-medium">{step.title}</div>
              {index < 2 && <div className="flex-1 h-px bg-border mx-4" />}
            </div>
          ))}
        </div>

        {/* 步骤 1: 文件上传 */}
        {currentStep === 0 && (
          <div title="选择要导入的文件">
            <div className="space-y-4">
              <Upload.Dragger {...uploadProps}>
                <div className="flex flex-col items-center space-y-2">
                  <UploadIcon className="w-8 h-8 text-muted-foreground" />
                  <Typography.Text className="text-muted-foreground">点击或拖拽文件到此区域上传</Typography.Text>
                  <p className="text-sm text-muted-foreground">
                    支持 CSV、JSON 格式文件。文件大小不超过 10MB。
                  </p>
                </div>
              </Upload.Dragger>

              <Alert
                message="文件格式要求"
                description={
                  <div>
                    <Paragraph>
                      <strong>CSV 格式:</strong> 第一行为表头，数据用逗号分隔
                    </Paragraph>
                    <Paragraph>
                      <strong>JSON 格式:</strong> 对象数组，每个对象代表一行数据
                    </Paragraph>
                  </div>
                }
                type="info"
                showIcon
              />
            </div>
          </div>
        )}

        {/* 步骤 2: 配置映射 */}
        {currentStep === 1 && importData && (
          <div className="space-y-6">
            {/* 基本配置 */}
            <div title="导入配置">
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <FormItem
                      label="目标测量"
                      name="measurement"
                      rules={[{ required: true, message: '请输入测量名称' }]}
                    >
                      <Select
                        placeholder="选择或输入测量名称"
                        showSearch
                        allowClear
                        mode="combobox"
                      >
                        {measurements.map(measurement => (
                          <Option key={measurement} value={measurement}>
                            {measurement}
                          </Option>
                        ))}
                      </Select>
                    </FormItem>
                  </Col>
                  <Col span={6}>
                    <FormItem
                      label="批次大小"
                      name="batchSize"
                      initialValue={1000}
                    >
                      <Input type="number" min={1} max={10000} />
                    </FormItem>
                  </Col>
                  <Col span={6}>
                    <FormItem
                      label="跳过错误"
                      name="skipErrors"
                      valuePropName="checked"
                      initialValue={false}
                    >
                      <Switch />
                    </FormItem>
                  </Col>
                </Row>
              </Form>
            </div>

            {/* 字段映射 */}
            <div title="字段映射配置">
              <div className="space-y-4">
                <Alert
                  message="字段映射说明"
                  description="请为每个源字段配置对应的目标字段名称和类型。至少需要一个时间字段。"
                  type="info"
                  showIcon
                />

                <Table
                  columns={mappingColumns}
                  dataSource={fieldMappings.map((mapping, index) => ({
                    ...mapping,
                    key: index}))}
                  pagination={false}
                  size="small"
                />
              </div>
            </div>

            {/* 数据预览 */}
            <div title="数据预览 (前10行)">
              <Table
                columns={previewColumns}
                dataSource={previewDataSource}
                pagination={false}
                scroll={{ x: 'max-content' }}
                size="small"
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <div className="flex gap-2">
                <Button onClick={onClose}>
                  取消
                </Button>
                <Button
                  type="primary"
                  disabled={loading}
                  onClick={handleImport}
                  disabled={!fieldMappings.some(m => m.fieldType === 'time')}
                >
                  开始导入
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 步骤 3: 导入完成 */}
        {currentStep === 2 && (
          <div>
            <div className="text-center space-y-4">
              <CheckCircle className="text-6xl text-success" />
              <Title level={3}>导入完成</Title>
              <Paragraph>
                数据已成功导入到数据库 <strong>{database}</strong> 中。
              </Paragraph>
              <div className="flex gap-2">
                <Button onClick={onClose}>
                  关闭
                </Button>
                <Button type="primary" onClick={() => {
                  resetState();
                  if (onSuccess) {
                    onSuccess();
                  }
                }}>
                  继续导入
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDialog;
