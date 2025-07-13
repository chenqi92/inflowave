import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Form, Input, Select, Button, Alert, Row, Col, Switch, InputNumber, Divider } from '@/components/ui';
import { Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Download, Table, Info, FileText, Code, FileSpreadsheet } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
// import { save } from '@tauri-apps/api/dialog'; // TODO: Update to Tauri v2 API
import type { DataExportConfig, DataExportResult, Connection } from '@/types';

const { TextArea } = Input;
const { Option } = Select;

interface DataExportDialogProps {
  visible: boolean;
  onClose: () => void;
  connections: Connection[];
  currentConnection?: string;
  currentDatabase?: string;
  query?: string;
  onSuccess?: (result: DataExportResult) => void;
}

const DataExportDialog: React.FC<DataExportDialogProps> = ({
  visible,
  onClose,
  connections,
  currentConnection,
  currentDatabase,
  query,
  onSuccess}) => {
  const form = useForm();
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
    if (visible) {
      form.setFieldsValue({
        connectionId: currentConnection || '',
        database: currentDatabase || '',
        query: query || '',
        format: 'csv',
        options: {
          includeHeaders: true,
          delimiter: ',',
          encoding: 'utf-8',
          compression: false,
          chunkSize: 10000}});
      setExportResult(null);
      setEstimateInfo(null);
      loadExportFormats();
    }
  }, [visible, currentConnection, currentDatabase, query, form]);

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
      const values = await form.validateFields(['connectionId', 'database', 'query', 'format']);
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
      const format = form.getFieldValue('format');
      const formatInfo = exportFormats.find(f => f.id === format);
      const extension = formatInfo?.extension || '.txt';

      // TODO: Update to Tauri v2 API for file dialog
      const filePath = `export_${Date.now()}${extension}`; // Temporary placeholder

      if (filePath) {
        form.setFieldValue('filePath', filePath);
      }
    } catch (error) {
      console.error('选择文件路径失败:', error);
      toast({ title: "错误", description: "选择文件路径失败", variant: "destructive" });
    }
  };

  // 执行导出
  const executeExport = async () => {
    try {
      const values = await form.validateFields();
      
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
      toast({ title: "错误", description: "导出失败: ${error}", variant: "destructive" });
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
    const values = form.getFieldsValue();
    return values.connectionId &&
           values.database &&
           values.query?.trim() &&
           values.filePath &&
           !loading;
  };

  return (
    <Dialog
      title="数据导出"
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="estimate"
          icon={<Info className="w-4 h-4"  />}
          loading={estimating}
          onClick={estimateExportSize}
        >
          预估大小
        </Button>,
        <Button
          key="export"
          type="primary"
          icon={<Download className="w-4 h-4"  />}
          loading={loading}
          disabled={!canExport()}
          onClick={executeExport}
        >
          开始导出
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        {/* 基本配置 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="connectionId"
              label="连接"
              rules={[{ required: true, message: '请选择连接' }]}
            >
              <Select placeholder="选择连接">
                {connections.map(conn => (
                  <Option key={conn.id} value={conn.id}>{conn.name}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="database"
              label="数据库"
              rules={[{ required: true, message: '请输入数据库名' }]}
            >
              <Input placeholder="数据库名" />
            </Form.Item>
          </Col>
        </Row>

        {/* 查询语句 */}
        <Form.Item
          name="query"
          label="查询语句"
          rules={[{ required: true, message: '请输入查询语句' }]}
        >
          <TextArea
            rows={4}
            placeholder="输入 SQL 查询语句"
            style={{ fontFamily: 'monospace', fontSize: 13 }}
          />
        </Form.Item>

        {/* 导出格式和文件路径 */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="format"
              label="导出格式"
              rules={[{ required: true, message: '请选择导出格式' }]}
            >
              <Select>
                {exportFormats.map(format => (
                  <Option key={format.id} value={format.id}>
                    <div className="flex gap-2">
                      {formatIcons[format.id]}
                      {format.name}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="filePath"
              label="保存路径"
              rules={[{ required: true, message: '请选择保存路径' }]}
            >
              <Input
                placeholder="选择保存路径"
                readOnly
                addonAfter={
                  <Button size="small" onClick={selectSavePath}>
                    浏览
                  </Button>
                }
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 高级选项 */}
        <Divider>高级选项</Divider>
        
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name={['options', 'includeHeaders']} label="包含表头" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['options', 'compression']} label="压缩文件" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['options', 'chunkSize']} label="批次大小">
              <InputNumber min={1000} max={100000} step={1000} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.format !== currentValues.format
          }
        >
          {({ getFieldValue }) => {
            const format = getFieldValue('format');
            if (format === 'csv') {
              return (
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name={['options', 'delimiter']} label="分隔符">
                      <Select>
                        <Option value=",">逗号 (,)</Option>
                        <Option value=";">分号 (;)</Option>
                        <Option value="\t">制表符 (\t)</Option>
                        <Option value="|">竖线 (|)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['options', 'encoding']} label="编码">
                      <Select>
                        <Option value="utf-8">UTF-8</Option>
                        <Option value="gbk">GBK</Option>
                        <Option value="gb2312">GB2312</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              );
            }
            return null;
          }}
        </Form.Item>

        {/* 预估信息 */}
        {estimateInfo && (
          <Alert
            type="info"
            message="导出预估"
            description={
              <div>
                <p>预计行数: {estimateInfo.rowCount?.toLocaleString()}</p>
                <p>预计文件大小: {estimateInfo.estimatedSizeFormatted}</p>
                <p>预计耗时: {estimateInfo.estimatedDuration} 秒</p>
              </div>
            }
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 导出结果 */}
        {exportResult && (
          <Alert
            type={exportResult.success ? 'success' : 'error'}
            message={exportResult.message}
            description={
              <div>
                <p>导出行数: {exportResult.rowCount.toLocaleString()}</p>
                <p>文件大小: {(exportResult.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                <p>耗时: {exportResult.duration}ms</p>
                {exportResult.filePath && (
                  <p>文件路径: {exportResult.filePath}</p>
                )}
                {exportResult.errors && exportResult.errors.length > 0 && (
                  <div>
                    <p>错误信息:</p>
                    <ul>
                      {exportResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            }
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Dialog>
  );
};

export default DataExportDialog;
