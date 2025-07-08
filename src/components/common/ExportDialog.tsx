import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Typography,
  Divider,
  Space,
  Alert,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  DownloadOutlined,
  FileTextOutlined,
  TableOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { QueryResult } from '@/types';
import {
  exportQueryResult,
  validateExportOptions,
  previewExportContent,
  estimateFileSize,
  generateResultStats,
  type ExportOptions,
} from '@/utils/export';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  const [preview, setPreview] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [stats, setStats] = useState<any>(null);

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

      // 生成统计信息
      const resultStats = generateResultStats(queryResult);
      setStats(resultStats);

      // 更新预览和文件大小
      updatePreview();
    }
  }, [visible, queryResult, defaultFilename, form]);

  // 更新预览内容
  const updatePreview = () => {
    if (!queryResult) return;

    const values = form.getFieldsValue();
    const options: ExportOptions = {
      format: values.format || 'csv',
      includeHeaders: values.includeHeaders !== false,
      delimiter: values.delimiter || ',',
      filename: values.filename,
    };

    try {
      const previewContent = previewExportContent(queryResult, options, 10);
      setPreview(previewContent);

      const size = estimateFileSize(queryResult, options);
      setFileSize(size);
    } catch (error) {
      setPreview(`Error generating preview: ${error}`);
      setFileSize('Unknown');
    }
  };

  // 表单值变化时更新预览
  const handleFormChange = () => {
    setTimeout(updatePreview, 100);
  };

  // 执行导出
  const handleExport = async () => {
    if (!queryResult) return;

    try {
      const values = await form.validateFields();
      const options: ExportOptions = {
        format: values.format,
        includeHeaders: values.includeHeaders,
        delimiter: values.delimiter,
        filename: values.filename,
      };

      // 验证选项
      const errors = validateExportOptions(options);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      setLoading(true);

      // 执行导出
      exportQueryResult(queryResult, options);

      // 关闭对话框
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取格式图标
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
        return <TableOutlined />;
      case 'json':
        return <FileTextOutlined />;
      case 'excel':
        return <FileExcelOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  return (
    <Modal
      title="导出查询结果"
      open={visible}
      onCancel={onClose}
      width={800}
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
        <div className="space-y-6">
          {/* 数据统计 */}
          {stats && (
            <Card size="small" title="数据统计">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="数据系列"
                    value={stats.totalSeries}
                    suffix="个"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="总行数"
                    value={stats.totalRows}
                    suffix="行"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="执行时间"
                    value={stats.executionTime}
                    suffix="ms"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="预估大小"
                    value={fileSize}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* 导出选项 */}
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleFormChange}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="导出格式"
                  name="format"
                  rules={[{ required: true, message: '请选择导出格式' }]}
                >
                  <Select>
                    <Option value="csv">
                      <Space>
                        <TableOutlined />
                        CSV 格式
                      </Space>
                    </Option>
                    <Option value="json">
                      <Space>
                        <FileTextOutlined />
                        JSON 格式
                      </Space>
                    </Option>
                    <Option value="excel">
                      <Space>
                        <FileExcelOutlined />
                        Excel CSV 格式
                      </Space>
                    </Option>
                    <Option value="xlsx">
                      <Space>
                        <FileExcelOutlined />
                        Excel XLSX 格式
                      </Space>
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="文件名"
                  name="filename"
                  rules={[
                    { required: true, message: '请输入文件名' },
                    { pattern: /^[a-zA-Z0-9_\-\s]+$/, message: '文件名包含无效字符' },
                  ]}
                >
                  <Input placeholder="请输入文件名（不含扩展名）" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="包含表头"
                  name="includeHeaders"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="分隔符"
                  name="delimiter"
                  tooltip="仅适用于 CSV 格式"
                >
                  <Select>
                    <Option value=",">逗号 (,)</Option>
                    <Option value=";">分号 (;)</Option>
                    <Option value="\t">制表符 (\t)</Option>
                    <Option value="|">竖线 (|)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Divider />

          {/* 预览 */}
          <div>
            <Title level={5}>预览 (前10行)</Title>
            <TextArea
              value={preview}
              rows={8}
              readOnly
              style={{
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '12px',
              }}
            />
          </div>

          {/* 格式说明 */}
          <Alert
            message="格式说明"
            description={
              <div>
                <Paragraph>
                  <strong>CSV:</strong> 逗号分隔值格式，适用于 Excel 和其他表格软件
                </Paragraph>
                <Paragraph>
                  <strong>JSON:</strong> 结构化数据格式，包含完整的元数据信息
                </Paragraph>
                <Paragraph>
                  <strong>Excel CSV:</strong> 带 UTF-8 BOM 的 CSV 格式，确保 Excel 正确显示中文
                </Paragraph>
                <Paragraph>
                  <strong>Excel XLSX:</strong> 原生 Excel 格式，支持多工作表和丰富的格式设置
                </Paragraph>
              </div>
            }
            type="info"
            showIcon
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
