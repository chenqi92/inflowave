import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Space, Alert, Row, Col, message, Typography, Switch, Upload, Steps, Progress, Tabs, Divider, Tooltip, Input, Select, Table } from 'antd';
import { UploadOutlined, DatabaseOutlined, CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Modal, Card } from '@/components/ui';
import type { UploadFile, UploadProps } from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';

const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

interface AdvancedImportDialogProps {
  visible: boolean;
  onClose: () => void;
  connectionId: string | null;
  database: string;
  onSuccess?: () => void;
}

interface ImportData {
  headers: string[];
  rows: (string | number)[][];
  preview: (string | number)[][];
  totalRows: number;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'json' | 'excel';
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
  fieldType: 'tag' | 'field' | 'time' | 'ignore';
  dataType: 'string' | 'number' | 'boolean' | 'timestamp';
  required: boolean;
  defaultValue?: string;
  validation?: string;
}

interface DataValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    nullValues: number;
    duplicates: number;
  };
}

interface ImportProgress {
  stage: 'parsing' | 'validating' | 'processing' | 'writing' | 'completed' | 'error';
  progress: number;
  message: string;
  processedRows: number;
  totalRows: number;
}

const AdvancedImportDialog: React.FC<AdvancedImportDialogProps> = ({
  visible,
  onClose,
  connectionId,
  database,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importData, setImportData] = useState<ImportData | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<DataValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [csvDelimiter, setCsvDelimiter] = useState(',');
  const [csvEncoding, setCsvEncoding] = useState('utf-8');
  const [csvHasHeader, setCsvHasHeader] = useState(true);
  const [activeTab, setActiveTab] = useState('mapping');

  // CSV 解析选项
  const csvOptions = {
    delimiter: csvDelimiter,
    encoding: csvEncoding,
    hasHeader: csvHasHeader,
    skipEmptyLines: true,
    trimWhitespace: true,
  };

  // 重置状态
  const resetState = useCallback(() => {
    setCurrentStep(0);
    setFileList([]);
    setImportData(null);
    setFieldMappings([]);
    setValidationResult(null);
    setImportProgress(null);
    setActiveTab('mapping');
    form.resetFields();
  }, [form]);

  // 加载测量列表
  const loadMeasurements = useCallback(async () => {
    if (!connectionId || !database) return;

    try {
      const measurementList = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId,
        database,
      });
      setMeasurements(measurementList);
    } catch (error) {
      console.error('加载测量列表失败:', error);
    }
  }, [connectionId, database]);

  useEffect(() => {
    if (visible) {
      loadMeasurements();
    } else {
      resetState();
    }
  }, [visible, connectionId, database, loadMeasurements, resetState]);

  // 文件上传配置
  const uploadProps: UploadProps = {
    accept: '.csv,.json,.txt,.xlsx,.xls',
    maxCount: 1,
    fileList,
    beforeUpload: (file) => {
      // 文件大小限制 (50MB)
      const isLt50M = file.size / 1024 / 1024 < 50;
      if (!isLt50M) {
        message.error('文件大小不能超过 50MB');
        return false;
      }

      setFileList([file]);
      parseFile(file);
      return false;
    },
    onRemove: () => {
      setFileList([]);
      setImportData(null);
      setValidationResult(null);
      setCurrentStep(0);
    },
  };

  // 解析文件
  const parseFile = async (file: File) => {
    setLoading(true);
    setImportProgress({
      stage: 'parsing',
      progress: 0,
      message: '正在解析文件...',
      processedRows: 0,
      totalRows: 0,
    });

    try {
      const fileName = file.name;
      const fileSize = file.size;
      const fileType = getFileType(fileName);
      
      let data: ImportData;
      
      if (fileType === 'excel') {
        data = await parseExcelFile(file);
      } else if (fileType === 'json') {
        data = await parseJSONFile(file);
      } else {
        data = await parseCSVFile(file);
      }
      
      data.fileName = fileName;
      data.fileSize = fileSize;
      data.fileType = fileType;
      
      setImportData(data);
      
      // 自动生成字段映射
      const mappings = generateFieldMappings(data);
      setFieldMappings(mappings);
      
      setImportProgress({
        stage: 'completed',
        progress: 100,
        message: '文件解析完成',
        processedRows: data.totalRows,
        totalRows: data.totalRows,
      });
      
      setCurrentStep(1);
    } catch (error) {
      setImportProgress({
        stage: 'error',
        progress: 0,
        message: `文件解析失败: ${error}`,
        processedRows: 0,
        totalRows: 0,
      });
      message.error(`文件解析失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取文件类型
  const getFileType = (fileName: string): 'csv' | 'json' | 'excel' => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'json') return 'json';
    if (ext === 'xlsx' || ext === 'xls') return 'excel';
    return 'csv';
  };

  // 解析 CSV 文件 (增强版)
  const parseCSVFile = async (file: File): Promise<ImportData> => {
    const text = await file.text();
    const lines = text.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('文件为空');
    }

    // 智能检测分隔符
    const delimiter = detectCSVDelimiter(lines[0]);
    setCsvDelimiter(delimiter);

    // 解析数据
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      result.push(current.trim());
      return result;
    };

    let headers: string[];
    let dataLines: string[];
    
    if (csvHasHeader) {
      headers = parseCSVLine(lines[0]);
      dataLines = lines.slice(1);
    } else {
      const firstRowData = parseCSVLine(lines[0]);
      headers = firstRowData.map((_, index) => `column_${index + 1}`);
      dataLines = lines;
    }

    const rows = dataLines
      .filter(line => line.trim())
      .map(line => parseCSVLine(line));

    const preview = rows.slice(0, 20);
    const totalRows = rows.length;

    return { headers, rows, preview, totalRows, fileName: '', fileSize: 0, fileType: 'csv' };
  };

  // 智能检测 CSV 分隔符
  const detectCSVDelimiter = (firstLine: string): string => {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let bestDelimiter = ',';
    
    for (const delimiter of delimiters) {
      const count = firstLine.split(delimiter).length - 1;
      if (count > maxCount) {
        maxCount = count;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  // 解析 JSON 文件 (增强版)
  const parseJSONFile = async (file: File): Promise<ImportData> => {
    const text = await file.text();
    let jsonData: any;
    
    try {
      jsonData = JSON.parse(text);
    } catch (error) {
      throw new Error('JSON 格式错误');
    }
    
    if (!Array.isArray(jsonData)) {
      // 如果不是数组，尝试转换
      if (typeof jsonData === 'object' && jsonData !== null) {
        if (jsonData.data && Array.isArray(jsonData.data)) {
          jsonData = jsonData.data;
        } else {
          jsonData = [jsonData];
        }
      } else {
        throw new Error('JSON 文件必须是数组或包含数组的对象');
      }
    }

    if (jsonData.length === 0) {
      throw new Error('JSON 数据为空');
    }

    // 扁平化嵌套对象
    const flattenObject = (obj: any, prefix = ''): any => {
      const flattened: any = {};
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          const newKey = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            Object.assign(flattened, flattenObject(value, newKey));
          } else {
            flattened[newKey] = value;
          }
        }
      }
      
      return flattened;
    };

    const flattenedData = jsonData.map(item => flattenObject(item));
    const headers = [...new Set(flattenedData.flatMap(item => Object.keys(item)))];
    const rows = flattenedData.map(item => headers.map(header => item[header] || ''));
    const preview = rows.slice(0, 20);
    const totalRows = rows.length;

    return { headers, rows, preview, totalRows, fileName: '', fileSize: 0, fileType: 'json' };
  };

  // 解析 Excel 文件
  const parseExcelFile = async (file: File): Promise<ImportData> => {
    // 这里需要添加 Excel 解析库，比如 xlsx
    // 目前先抛出错误提示需要实现
    throw new Error('Excel 文件解析功能正在开发中');
  };

  // 生成字段映射
  const generateFieldMappings = (data: ImportData): FieldMapping[] => {
    return data.headers.map((header, index) => {
      const sampleValues = data.preview.map(row => row[index]).filter(v => v !== null && v !== '');
      const dataType = inferDataType(sampleValues);
      
      // 智能推断字段类型
      let fieldType: 'tag' | 'field' | 'time' | 'ignore' = 'field';
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('time') || lowerHeader.includes('timestamp') || lowerHeader.includes('date')) {
        fieldType = 'time';
      } else if (lowerHeader.includes('tag') || lowerHeader.includes('label') || lowerHeader.includes('category')) {
        fieldType = 'tag';
      } else if (dataType === 'string' && sampleValues.length > 0) {
        // 如果字符串值重复度高，可能是标签
        const uniqueValues = new Set(sampleValues);
        if (uniqueValues.size <= sampleValues.length * 0.1) {
          fieldType = 'tag';
        }
      }

      return {
        sourceField: header,
        targetField: sanitizeFieldName(header),
        fieldType,
        dataType,
        required: fieldType === 'time',
        defaultValue: '',
        validation: '',
      };
    });
  };

  // 推断数据类型 (增强版)
  const inferDataType = (values: any[]): 'string' | 'number' | 'boolean' | 'timestamp' => {
    if (values.length === 0) return 'string';
    
    const samples = values.slice(0, 100);
    
    // 检查时间戳
    const timePatterns = [
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{3})?$/,
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{10,13}$/,
    ];
    
    const isTimestamp = samples.some(sample => 
      timePatterns.some(pattern => pattern.test(String(sample)))
    );
    
    if (isTimestamp) return 'timestamp';
    
    // 检查布尔值
    const booleanValues = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
    const isBoolean = samples.every(sample => 
      booleanValues.includes(String(sample).toLowerCase())
    );
    
    if (isBoolean) return 'boolean';
    
    // 检查数字
    const isNumber = samples.every(sample => {
      const num = Number(sample);
      return !isNaN(num) && isFinite(num);
    });
    
    if (isNumber) return 'number';
    
    return 'string';
  };

  // 清理字段名称
  const sanitizeFieldName = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  };

  // 数据验证
  const validateData = useCallback(async () => {
    if (!importData || !fieldMappings) return;

    setLoading(true);
    setActiveTab('validation');
    
    try {
      const result = await performDataValidation(importData, fieldMappings);
      setValidationResult(result);
    } catch (error) {
      message.error(`数据验证失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [importData, fieldMappings]);

  // 执行数据验证
  const performDataValidation = async (data: ImportData, mappings: FieldMapping[]): Promise<DataValidationResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validRows = 0;
    let nullValues = 0;
    let duplicates = 0;

    // 检查是否有时间字段
    const hasTimeField = mappings.some(m => m.fieldType === 'time');
    if (!hasTimeField) {
      errors.push('至少需要一个时间字段');
    }

    // 检查字段映射
    const targetFields = mappings.filter(m => m.fieldType !== 'ignore').map(m => m.targetField);
    const duplicateFields = targetFields.filter((field, index) => targetFields.indexOf(field) !== index);
    if (duplicateFields.length > 0) {
      errors.push(`目标字段名称重复: ${duplicateFields.join(', ')}`);
    }

    // 验证数据行
    const seen = new Set();
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      let rowValid = true;
      
      // 检查必填字段
      for (let j = 0; j < mappings.length; j++) {
        const mapping = mappings[j];
        const value = row[j];
        
        if (mapping.required && (value === null || value === '' || value === undefined)) {
          rowValid = false;
          nullValues++;
        }
        
        // 数据类型验证
        if (value && mapping.dataType === 'number' && isNaN(Number(value))) {
          rowValid = false;
        }
      }
      
      if (rowValid) {
        validRows++;
      }
      
      // 检查重复行
      const rowStr = row.join('|');
      if (seen.has(rowStr)) {
        duplicates++;
      } else {
        seen.add(rowStr);
      }
    }

    // 生成警告
    if (nullValues > 0) {
      warnings.push(`发现 ${nullValues} 个空值`);
    }
    
    if (duplicates > 0) {
      warnings.push(`发现 ${duplicates} 个重复行`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalRows: data.totalRows,
        validRows,
        invalidRows: data.totalRows - validRows,
        nullValues,
        duplicates,
      },
    };
  };

  // 更新字段映射
  const updateFieldMapping = (index: number, field: keyof FieldMapping, value: any) => {
    const newMappings = [...fieldMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFieldMappings(newMappings);
  };

  // 执行导入
  const handleImport = async () => {
    if (!connectionId || !importData || !validationResult?.valid) return;

    try {
      const values = await form.validateFields();
      setLoading(true);
      setCurrentStep(2);

      const importRequest = {
        connectionId,
        database,
        measurement: values.measurement,
        fieldMappings: fieldMappings.filter(m => m.fieldType !== 'ignore'),
        data: importData.rows,
        options: {
          batchSize: values.batchSize || 1000,
          skipErrors: values.skipErrors || false,
          precision: values.precision || 'ns',
          retentionPolicy: values.retentionPolicy || '',
        },
      };

      // 模拟进度更新
      const updateProgress = (stage: ImportProgress['stage'], progress: number, message: string) => {
        setImportProgress({
          stage,
          progress,
          message,
          processedRows: Math.floor((progress / 100) * importData.totalRows),
          totalRows: importData.totalRows,
        });
      };

      updateProgress('processing', 0, '准备导入数据...');
      
      // 调用后端导入接口
      await safeTauriInvoke('advanced_import_data', importRequest);
      
      updateProgress('completed', 100, '数据导入完成');
      message.success('数据导入成功');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setImportProgress({
        stage: 'error',
        progress: 0,
        message: `导入失败: ${error}`,
        processedRows: 0,
        totalRows: importData?.totalRows || 0,
      });
      message.error(`数据导入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 字段映射表格列
  const mappingColumns = [
    {
      title: '源字段',
      dataIndex: 'sourceField',
      key: 'sourceField',
      width: 150,
      render: (text: string, record: FieldMapping) => (
        <Space>
          <Text>{text}</Text>
          <Tooltip title={`数据类型: ${record.dataType}`}>
            <InfoCircleOutlined />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: '目标字段',
      dataIndex: 'targetField',
      key: 'targetField',
      width: 150,
      render: (value: string, _: FieldMapping, index: number) => (
        <Input
          value={value}
          onChange={(e) => updateFieldMapping(index, 'targetField', e.target.value)}
          placeholder="输入目标字段名"
          size="small"
        />
      ),
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      key: 'fieldType',
      width: 120,
      render: (value: string, _: FieldMapping, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateFieldMapping(index, 'fieldType', val)}
          style={{ width: '100%' }}
          size="small"
        >
          <Option value="time">时间</Option>
          <Option value="tag">标签</Option>
          <Option value="field">字段</Option>
          <Option value="ignore">忽略</Option>
        </Select>
      ),
    },
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (value: string, record: FieldMapping, index: number) => (
        <Select
          value={value}
          onChange={(val) => updateFieldMapping(index, 'dataType', val)}
          style={{ width: '100%' }}
          size="small"
          disabled={record.fieldType === 'time' || record.fieldType === 'ignore'}
        >
          <Option value="string">字符串</Option>
          <Option value="number">数字</Option>
          <Option value="boolean">布尔值</Option>
          <Option value="timestamp">时间戳</Option>
        </Select>
      ),
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 80,
      render: (value: boolean, _: FieldMapping, index: number) => (
        <Switch
          checked={value}
          onChange={(checked) => updateFieldMapping(index, 'required', checked)}
          size="small"
        />
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (value: string, record: FieldMapping, index: number) => (
        <Input
          value={value}
          onChange={(e) => updateFieldMapping(index, 'defaultValue', e.target.value)}
          placeholder="默认值"
          size="small"
          disabled={record.fieldType === 'ignore'}
        />
      ),
    },
  ];

  return (
    <Modal
      title="高级数据导入"
      open={visible}
      onCancel={onClose}
      width={1400}
      style={{ top: 20 }}
      footer={null}
    >
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <Steps current={currentStep} size="small">
          <Steps.Step title="选择文件" icon={<UploadOutlined />} />
          <Steps.Step title="配置导入" icon={<DatabaseOutlined />} />
          <Steps.Step title="执行导入" icon={<CheckCircleOutlined />} />
        </Steps>

        {/* 步骤 1: 文件上传 */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <Card title="选择要导入的文件">
              <div className="space-y-4">
                <Upload.Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 CSV、JSON、Excel 格式文件。文件大小不超过 50MB。
                  </p>
                </Upload.Dragger>

                {/* CSV 解析选项 */}
                <Card title="CSV 解析选项" size="small">
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item label="分隔符">
                        <Select
                          value={csvDelimiter}
                          onChange={setCsvDelimiter}
                          style={{ width: '100%' }}
                        >
                          <Option value=",">逗号 (,)</Option>
                          <Option value=";">分号 (;)</Option>
                          <Option value="	">制表符 (Tab)</Option>
                          <Option value="|">竖线 (|)</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="编码">
                        <Select
                          value={csvEncoding}
                          onChange={setCsvEncoding}
                          style={{ width: '100%' }}
                        >
                          <Option value="utf-8">UTF-8</Option>
                          <Option value="gbk">GBK</Option>
                          <Option value="gb2312">GB2312</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item label="包含表头">
                        <Switch
                          checked={csvHasHeader}
                          onChange={setCsvHasHeader}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Card>

                {/* 解析进度 */}
                {importProgress && (
                  <Card size="small">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Text>{importProgress.message}</Text>
                        <Text>{importProgress.processedRows} / {importProgress.totalRows}</Text>
                      </div>
                      <Progress 
                        percent={importProgress.progress} 
                        status={importProgress.stage === 'error' ? 'exception' : 'normal'}
                      />
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* 步骤 2: 配置导入 */}
        {currentStep === 1 && importData && (
          <div className="space-y-4">
            {/* 文件信息 */}
            <Card title="文件信息" size="small">
              <Row gutter={16}>
                <Col span={6}>
                  <Text strong>文件名: </Text>
                  <Text>{importData.fileName}</Text>
                </Col>
                <Col span={6}>
                  <Text strong>文件大小: </Text>
                  <Text>{(importData.fileSize / 1024 / 1024).toFixed(2)} MB</Text>
                </Col>
                <Col span={6}>
                  <Text strong>总行数: </Text>
                  <Text>{importData.totalRows}</Text>
                </Col>
                <Col span={6}>
                  <Text strong>字段数: </Text>
                  <Text>{importData.headers.length}</Text>
                </Col>
              </Row>
            </Card>

            {/* 基本配置 */}
            <Card title="导入配置">
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
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
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      label="批次大小"
                      name="batchSize"
                      initialValue={1000}
                    >
                      <Input type="number" min={1} max={10000} />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      label="时间精度"
                      name="precision"
                      initialValue="ns"
                    >
                      <Select>
                        <Option value="ns">纳秒</Option>
                        <Option value="us">微秒</Option>
                        <Option value="ms">毫秒</Option>
                        <Option value="s">秒</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      label="跳过错误"
                      name="skipErrors"
                      valuePropName="checked"
                      initialValue={false}
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item label="操作">
                      <Button type="primary" onClick={validateData} loading={loading}>
                        验证数据
                      </Button>
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            {/* 配置选项卡 */}
            <Card>
              <Tabs activeKey={activeTab} onChange={setActiveTab}>
                <TabPane tab="字段映射" key="mapping">
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
                        key: index,
                      }))}
                      pagination={false}
                      size="small"
                      scroll={{ x: 'max-content' }}
                    />
                  </div>
                </TabPane>

                <TabPane tab="数据预览" key="preview">
                  <div className="space-y-4">
                    <Text>数据预览 (前 20 行)</Text>
                    <Table
                      columns={importData.headers.map((header, index) => ({
                        title: header,
                        dataIndex: index,
                        key: index,
                        width: 150,
                        ellipsis: true,
                      }))}
                      dataSource={importData.preview.map((row, index) => ({
                        key: index,
                        ...row.reduce((acc, cell, cellIndex) => {
                          acc[cellIndex] = cell;
                          return acc;
                        }, {} as Record<number, any>),
                      }))}
                      pagination={false}
                      scroll={{ x: 'max-content' }}
                      size="small"
                    />
                  </div>
                </TabPane>

                <TabPane tab="数据验证" key="validation">
                  {validationResult ? (
                    <div className="space-y-4">
                      {/* 验证结果 */}
                      <Alert
                        message={validationResult.valid ? '数据验证通过' : '数据验证失败'}
                        type={validationResult.valid ? 'success' : 'error'}
                        showIcon
                      />

                      {/* 统计信息 */}
                      <Card title="数据统计" size="small">
                        <Row gutter={16}>
                          <Col span={6}>
                            <Text strong>总行数: </Text>
                            <Text>{validationResult.stats.totalRows}</Text>
                          </Col>
                          <Col span={6}>
                            <Text strong>有效行数: </Text>
                            <Text type="success">{validationResult.stats.validRows}</Text>
                          </Col>
                          <Col span={6}>
                            <Text strong>无效行数: </Text>
                            <Text type="danger">{validationResult.stats.invalidRows}</Text>
                          </Col>
                          <Col span={6}>
                            <Text strong>空值数: </Text>
                            <Text type="warning">{validationResult.stats.nullValues}</Text>
                          </Col>
                        </Row>
                      </Card>

                      {/* 错误信息 */}
                      {validationResult.errors.length > 0 && (
                        <Card title="错误信息" size="small">
                          {validationResult.errors.map((error, index) => (
                            <Alert
                              key={index}
                              message={error}
                              type="error"
                              showIcon
                              style={{ marginBottom: 8 }}
                            />
                          ))}
                        </Card>
                      )}

                      {/* 警告信息 */}
                      {validationResult.warnings.length > 0 && (
                        <Card title="警告信息" size="small">
                          {validationResult.warnings.map((warning, index) => (
                            <Alert
                              key={index}
                              message={warning}
                              type="warning"
                              showIcon
                              style={{ marginBottom: 8 }}
                            />
                          ))}
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Text type="secondary">请点击"验证数据"按钮进行数据验证</Text>
                    </div>
                  )}
                </TabPane>
              </Tabs>
            </Card>

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <Button onClick={() => setCurrentStep(0)}>
                上一步
              </Button>
              <Space>
                <Button onClick={onClose}>
                  取消
                </Button>
                <Button
                  type="primary"
                  onClick={handleImport}
                  disabled={!validationResult?.valid || !fieldMappings.some(m => m.fieldType === 'time')}
                >
                  开始导入
                </Button>
              </Space>
            </div>
          </div>
        )}

        {/* 步骤 3: 执行导入 */}
        {currentStep === 2 && (
          <Card>
            <div className="text-center space-y-4">
              {importProgress?.stage === 'completed' ? (
                <>
                  <CheckCircleOutlined className="text-6xl text-green-500" />
                  <Title level={3}>导入完成</Title>
                  <Paragraph>
                    成功导入 <strong>{importProgress.processedRows}</strong> 行数据到数据库 <strong>{database}</strong> 中。
                  </Paragraph>
                </>
              ) : importProgress?.stage === 'error' ? (
                <>
                  <ExclamationCircleOutlined className="text-6xl text-red-500" />
                  <Title level={3}>导入失败</Title>
                  <Paragraph>
                    {importProgress.message}
                  </Paragraph>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <Title level={4}>正在导入数据...</Title>
                    {importProgress && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Text>{importProgress.message}</Text>
                          <Text>{importProgress.processedRows} / {importProgress.totalRows}</Text>
                        </div>
                        <Progress percent={importProgress.progress} />
                      </div>
                    )}
                  </div>
                </>
              )}

              <Space>
                <Button onClick={onClose}>
                  关闭
                </Button>
                {importProgress?.stage === 'completed' && (
                  <Button type="primary" onClick={() => {
                    resetState();
                    if (onSuccess) {
                      onSuccess();
                    }
                  }}>
                    继续导入
                  </Button>
                )}
                {importProgress?.stage === 'error' && (
                  <Button onClick={() => setCurrentStep(1)}>
                    重新配置
                  </Button>
                )}
              </Space>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};

export default AdvancedImportDialog;