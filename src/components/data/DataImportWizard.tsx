import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Button, Select, Table, Form, Input, Typography, Row, Col, Alert, Steps, Upload, Progress, Checkbox, InputNumber, Modal } from '@/components/ui';

const { Step } = Steps;
import { Space, Card, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Upload as UploadIcon, Database, Settings, FileText, FileUp, CheckCircle } from 'lucide-react';
import type { UploadFile, UploadProps } from '@/components/ui';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DataImportWizardProps {
  visible: boolean;
  onClose: () => void;
  connectionId?: string;
  database?: string;
}

interface ImportConfig {
  format: 'csv' | 'json' | 'line_protocol';
  delimiter?: string;
  hasHeader?: boolean;
  measurement: string;
  timeColumn?: string;
  timeFormat?: string;
  tagColumns: string[];
  fieldColumns: string[];
  skipRows?: number;
  batchSize?: number;
}

interface PreviewData {
  columns: string[];
  rows: any[][];
  totalRows: number;
}

const DataImportWizard: React.FC<DataImportWizardProps> = ({
  visible,
  onClose,
  connectionId,
  database}) => {
  const { connections } = useConnectionStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [importConfig, setImportConfig] = useState<ImportConfig>({
    format: 'csv',
    delimiter: ',',
    hasHeader: true,
    measurement: '',
    tagColumns: [],
    fieldColumns: [],
    skipRows: 0,
    batchSize: 1000});
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<any>(null);
  const form = useForm();

  // 文件上传配置
  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isValidType = file.type === 'text/csv' || 
                         file.type === 'application/json' || 
                         file.name.endsWith('.csv') || 
                         file.name.endsWith('.json') ||
                         file.name.endsWith('.txt');
      
      if (!isValidType) {
        toast({ title: "错误", description: "只支持 CSV、JSON 和文本文件", variant: "destructive" });
        return false;
      }

      const isLt100M = file.size! / 1024 / 1024 < 100;
      if (!isLt100M) {
        toast({ title: "错误", description: "文件大小不能超过 100MB", variant: "destructive" });
        return false;
      }

      return false; // 阻止自动上传
    },
    onChange: (info) => {
      setFileList(info.fileList.slice(-1)); // 只保留最新的文件
    },
    fileList};

  // 预览文件数据
  const previewFile = async () => {
    if (fileList.length === 0) {
      toast({ title: "错误", description: "请先选择文件", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const file = fileList[0];
      const formData = new FormData();
      formData.append('file', file.originFileObj as File);
      formData.append('format', importConfig.format);
      formData.append('delimiter', importConfig.delimiter || ',');
      formData.append('hasHeader', String(importConfig.hasHeader));
      formData.append('skipRows', String(importConfig.skipRows || 0));

      // 这里应该调用后端API预览数据
      const preview = await safeTauriInvoke<PreviewData>('preview_data_conversion', {
        filePath: file.name, // 实际应该是文件路径
        config: importConfig});

      setPreviewData(preview);
      setCurrentStep(1);
    } catch (error) {
      toast({ title: "错误", description: "预览文件失败: ${error}", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 配置字段映射
  const configureMapping = () => {
    if (!previewData) return;

    // 自动推断字段类型
    const timeColumns = previewData.columns.filter(col => 
      col.toLowerCase().includes('time') || 
      col.toLowerCase().includes('timestamp') ||
      col.toLowerCase().includes('date')
    );

    const numericColumns = previewData.columns.filter((col, index) => {
      const sampleValue = previewData.rows[0]?.[index];
      return !isNaN(Number(sampleValue)) && sampleValue !== '';
    });

    setImportConfig(prev => ({
      ...prev,
      timeColumn: timeColumns[0] || '',
      fieldColumns: numericColumns,
      tagColumns: previewData.columns.filter(col => 
        !timeColumns.includes(col) && !numericColumns.includes(col)
      )}));

    setCurrentStep(2);
  };

  // 执行导入
  const executeImport = async () => {
    if (!connectionId || !database || !importConfig.measurement) {
      toast({ title: "错误", description: "请完善导入配置", variant: "destructive" });
      return;
    }

    setLoading(true);
    setImportProgress(0);

    try {
      const importData = {
        connectionId,
        database,
        filePath: fileList[0].name, // 实际应该是文件路径
        config: importConfig};

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const result = await safeTauriInvoke('import_data', importData);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      setImportResult(result);
      setCurrentStep(3);
      
      toast({ title: "成功", description: "数据导入完成" });
    } catch (error) {
      toast({ title: "错误", description: "导入失败: ${error}", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 重置向导
  const resetWizard = () => {
    setCurrentStep(0);
    setFileList([]);
    setPreviewData(null);
    setImportConfig({
      format: 'csv',
      delimiter: ',',
      hasHeader: true,
      measurement: '',
      tagColumns: [],
      fieldColumns: [],
      skipRows: 0,
      batchSize: 1000});
    setImportProgress(0);
    setImportResult(null);
    form.resetFields();
  };

  // 步骤内容
  const stepContents = [
    // 步骤1: 文件选择
    <div key="file-selection">
      <Card title="选择数据文件" style={{ marginBottom: 16 }}>
        <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadIcon className="w-4 h-4"  />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 CSV、JSON 和 Line Protocol 格式，文件大小不超过 100MB
            </p>
          </Upload.Dragger>

          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="文件格式">
                  <Select
                    value={importConfig.format}
                    onChange={(value) => setImportConfig(prev => ({ ...prev, format: value }))}
                  >
                    <Option value="csv">CSV</Option>
                    <Option value="json">JSON</Option>
                    <Option value="line_protocol">Line Protocol</Option>
                  </Select>
                </Form.Item>
              </Col>
              {importConfig.format === 'csv' && (
                <>
                  <Col span={8}>
                    <Form.Item label="分隔符">
                      <Select
                        value={importConfig.delimiter}
                        onChange={(value) => setImportConfig(prev => ({ ...prev, delimiter: value }))}
                      >
                        <Option value=",">逗号 (,)</Option>
                        <Option value=";">分号 (;)</Option>
                        <Option value="\t">制表符</Option>
                        <Option value="|">竖线 (|)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="其他选项">
                      <div className="flex gap-2" direction="vertical">
                        <Checkbox
                          checked={importConfig.hasHeader}
                          onChange={(e) => setImportConfig(prev => ({ ...prev, hasHeader: e.target.checked }))}
                        >
                          包含标题行
                        </Checkbox>
                        <div>
                          <Text>跳过行数: </Text>
                          <InputNumber
                            min={0}
                            max={100}
                            value={importConfig.skipRows}
                            onChange={(value) => setImportConfig(prev => ({ ...prev, skipRows: value || 0 }))}
                            style={{ width: 80 }}
                          />
                        </div>
                      </div>
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </Form>
        </div>
      </Card>
    </div>,

    // 步骤2: 数据预览
    <div key="data-preview">
      <Card title="数据预览" style={{ marginBottom: 16 }}>
        {previewData && (
          <div>
            <Alert
              message={`共 ${previewData.totalRows} 行数据，显示前 10 行`}
              type="info"
              style={{ marginBottom: 16 }}
            />
            <Table
              columns={previewData.columns.map(col => ({
                title: col,
                dataIndex: col,
                key: col,
                width: 120,
                ellipsis: true}))}
              dataSource={previewData.rows.slice(0, 10).map((row, index) => {
                const record: any = { key: index };
                previewData.columns.forEach((col, colIndex) => {
                  record[col] = row[colIndex];
                });
                return record;
              })}
              pagination={false}
              scroll={{ x: 'max-content' }}
              size="small"
            />
          </div>
        )}
      </Card>
    </div>,

    // 步骤3: 字段映射
    <div key="field-mapping">
      <Card title="字段映射配置" style={{ marginBottom: 16 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="目标测量名称" required>
                <Input
                  value={importConfig.measurement}
                  onChange={(e) => setImportConfig(prev => ({ ...prev, measurement: e.target.value }))}
                  placeholder="输入测量名称"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="时间字段">
                <Select
                  value={importConfig.timeColumn}
                  onChange={(value) => setImportConfig(prev => ({ ...prev, timeColumn: value }))}
                  placeholder="选择时间字段"
                  allowClear
                >
                  {previewData?.columns.map(col => (
                    <Option key={col} value={col}>{col}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="标签字段">
                <Select
                  mode="multiple"
                  value={importConfig.tagColumns}
                  onChange={(value) => setImportConfig(prev => ({ ...prev, tagColumns: value }))}
                  placeholder="选择标签字段"
                >
                  {previewData?.columns.map(col => (
                    <Option key={col} value={col}>{col}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="数值字段">
                <Select
                  mode="multiple"
                  value={importConfig.fieldColumns}
                  onChange={(value) => setImportConfig(prev => ({ ...prev, fieldColumns: value }))}
                  placeholder="选择数值字段"
                >
                  {previewData?.columns.map(col => (
                    <Option key={col} value={col}>{col}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="批处理大小">
            <InputNumber
              min={100}
              max={10000}
              value={importConfig.batchSize}
              onChange={(value) => setImportConfig(prev => ({ ...prev, batchSize: value || 1000 }))}
              addonAfter="条/批"
            />
          </Form.Item>
        </Form>
      </Card>
    </div>,

    // 步骤4: 导入结果
    <div key="import-result">
      <Card title="导入结果" style={{ marginBottom: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Progress
              type="circle"
              percent={importProgress}
              status={importProgress === 100 ? 'success' : 'active'}
            />
            <div style={{ marginTop: 16 }}>
              <Text>正在导入数据...</Text>
            </div>
          </div>
        ) : importResult ? (
          <div>
            <Alert
              message="导入完成"
              description={`成功导入 ${importResult.successCount} 条记录，失败 ${importResult.errorCount} 条`}
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
            />
            {importResult.errors && importResult.errors.length > 0 && (
              <div>
                <Title level={5}>错误详情:</Title>
                <TextArea
                  value={importResult.errors.join('\n')}
                  rows={6}
                  readOnly
                />
              </div>
            )}
          </div>
        ) : null}
      </Card>
    </div>,
  ];

  return (
    <Modal
      title="数据导入向导"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={
        <div className="flex gap-2">
          <Button onClick={onClose}>取消</Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(prev => prev - 1)}>
              上一步
            </Button>
          )}
          {currentStep === 0 && (
            <Button
              type="primary"
              onClick={previewFile}
              loading={loading}
              disabled={fileList.length === 0}
            >
              预览数据
            </Button>
          )}
          {currentStep === 1 && (
            <Button type="primary" onClick={configureMapping}>
              配置映射
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              onClick={executeImport}
              loading={loading}
              disabled={!importConfig.measurement}
            >
              开始导入
            </Button>
          )}
          {currentStep === 3 && (
            <Button type="primary" onClick={resetWizard}>
              重新导入
            </Button>
          )}
        </div>
      }
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Step title="选择文件" icon={<UploadIcon className="w-4 h-4"  />} />
        <Step title="预览数据" icon={<FileText className="w-4 h-4"  />} />
        <Step title="配置映射" icon={<Settings className="w-4 h-4"  />} />
        <Step title="导入完成" icon={<CheckCircle />} />
      </Steps>

      {stepContents[currentStep]}
    </Modal>
  );
};

export default DataImportWizard;
