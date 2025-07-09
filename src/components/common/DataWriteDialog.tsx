import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Alert,
  Space,
  Typography,
  Tabs,
  message,
  Row,
  Col,
} from 'antd';
import {
  CheckOutlined,
  EyeOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DataWriteConfig, DataWriteResult, Connection } from '@/types';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;
const { Dragger } = Upload;

interface DataWriteDialogProps {
  visible: boolean;
  onClose: () => void;
  connections: Connection[];
  currentConnection?: string;
  currentDatabase?: string;
  onSuccess?: (result: DataWriteResult) => void;
}

const DataWriteDialog: React.FC<DataWriteDialogProps> = ({
  visible,
  onClose,
  connections,
  currentConnection,
  currentDatabase,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [writeResult, setWriteResult] = useState<DataWriteResult | null>(null);
  const [previewData, setPreviewData] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  // 初始化表单
  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        connectionId: currentConnection || '',
        database: currentDatabase || '',
        measurement: '',
        format: 'line-protocol',
        data: '',
        options: {
          precision: 'ms',
          batchSize: 1000,
          retentionPolicy: '',
          consistency: 'one',
        },
      });
      setWriteResult(null);
      setPreviewData('');
      setShowPreview(false);
    }
  }, [visible, currentConnection, currentDatabase, form]);

  // 加载数据库列表
  const loadDatabases = async (connectionId: string) => {
    if (!connectionId) return;
    
    try {
      const dbList = await safeTauriInvoke('get_databases', { connectionId }) as string[];
      setDatabases(dbList);
    } catch (error) {
      console.error('获取数据库列表失败:', error);
      message.error('获取数据库列表失败');
    }
  };

  // 监听连接变化
  const handleConnectionChange = (connectionId: string) => {
    form.setFieldValue('connectionId', connectionId);
    loadDatabases(connectionId);
  };

  // 验证数据格式
  const validateData = async () => {
    try {
      const values = await form.validateFields(['data', 'format', 'measurement']);
      if (!values.data?.trim()) {
        message.warning('请输入数据内容');
        return;
      }

      setValidating(true);
      const isValid = await safeTauriInvoke('validate_data_format', {
        data: values.data,
        format: values.format,
        measurement: values.measurement,
      });

      if (isValid) {
        message.success('数据格式验证通过');
      }
    } catch (error) {
      message.error(`数据格式验证失败: ${error}`);
    } finally {
      setValidating(false);
    }
  };

  // 预览转换结果
  const previewConversion = async () => {
    try {
      const values = await form.validateFields(['data', 'format', 'measurement']);
      if (!values.data?.trim()) {
        message.warning('请输入数据内容');
        return;
      }

      setPreviewing(true);
      const preview = await safeTauriInvoke('preview_data_conversion', {
        data: values.data,
        format: values.format,
        measurement: values.measurement,
        limit: 10,
      }) as string;

      setPreviewData(preview);
      setShowPreview(true);
    } catch (error) {
      message.error(`预览转换失败: ${error}`);
    } finally {
      setPreviewing(false);
    }
  };

  // 写入数据
  const writeData = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setWriteResult(null);

      const writeConfig: DataWriteConfig = {
        connectionId: values.connectionId,
        database: values.database,
        measurement: values.measurement,
        format: values.format,
        data: values.data,
        options: values.options,
      };

      const result = await safeTauriInvoke('write_data', { request: writeConfig }) as DataWriteResult;
      setWriteResult(result);

      if (result.success) {
        message.success('数据写入成功');
        onSuccess?.(result);
      } else {
        message.error('数据写入失败');
      }
    } catch (error) {
      message.error(`数据写入失败: ${error}`);
      setWriteResult({
        success: false,
        message: `写入失败: ${error}`,
        pointsWritten: 0,
        errors: [String(error)],
        duration: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      form.setFieldValue('data', content);

      // 根据文件扩展名自动设置格式
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        form.setFieldValue('format', 'csv');
      } else if (fileName.endsWith('.json')) {
        form.setFieldValue('format', 'json');
      } else {
        form.setFieldValue('format', 'line-protocol');
      }

      message.success('文件内容已加载');
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  // 获取数据格式示例
  const getDataPlaceholder = (format: string) => {
    switch (format) {
      case 'line-protocol':
        return 'measurement,tag1=value1,tag2=value2 field1=1.0,field2=2.0 1609459200000000000';
      case 'csv':
        return 'time,tag1,tag2,field1,field2\n2021-01-01T00:00:00Z,value1,value2,1.0,2.0';
      case 'json':
        return '{"time": "2021-01-01T00:00:00Z", "tag1": "value1", "field1": 1.0}';
      default:
        return '';
    }
  };

  const canWrite = () => {
    const values = form.getFieldsValue();
    return values.connectionId &&
           values.database &&
           values.measurement &&
           values.data?.trim() &&
           !loading;
  };

  return (
    <>
      <Modal
        title="数据写入"
        open={visible}
        onCancel={onClose}
        width={800}
        footer={[
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button
            key="write"
            type="primary"
            loading={loading}
            disabled={!canWrite()}
            onClick={writeData}
          >
            写入数据
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
                <Select placeholder="选择连接" onChange={handleConnectionChange}>
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
                rules={[{ required: true, message: '请选择数据库' }]}
              >
                <Select placeholder="选择数据库">
                  {databases.map(db => (
                    <Option key={db} value={db}>{db}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="measurement"
                label="测量名"
                rules={[{ required: true, message: '请输入测量名' }]}
              >
                <Input placeholder="输入测量名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="format"
                label="数据格式"
                rules={[{ required: true, message: '请选择数据格式' }]}
              >
                <Select>
                  <Option value="line-protocol">Line Protocol</Option>
                  <Option value="csv">CSV</Option>
                  <Option value="json">JSON</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 数据输入 */}
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="手动输入" key="manual">
              <Form.Item
                name="data"
                label={
                  <Space>
                    <span>数据内容</span>
                    <Button size="small" loading={validating} onClick={validateData}>
                      <CheckOutlined /> 验证格式
                    </Button>
                    <Button size="small" loading={previewing} onClick={previewConversion}>
                      <EyeOutlined /> 预览转换
                    </Button>
                  </Space>
                }
                rules={[{ required: true, message: '请输入数据内容' }]}
              >
                <Form.Item noStyle shouldUpdate={(prev, curr) => prev.format !== curr.format}>
                  {({ getFieldValue }) => (
                    <TextArea
                      rows={12}
                      placeholder={getDataPlaceholder(getFieldValue('format'))}
                      style={{ fontFamily: 'monospace', fontSize: 13 }}
                    />
                  )}
                </Form.Item>
              </Form.Item>
            </Tabs.TabPane>

            <Tabs.TabPane tab="文件上传" key="upload">
              <Dragger
                beforeUpload={handleFileUpload}
                accept=".csv,.json,.txt"
                showUploadList={false}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 CSV、JSON、TXT 格式文件，文件大小不超过 10MB
                </p>
              </Dragger>
            </Tabs.TabPane>
          </Tabs>

          {/* 高级选项 */}
          <Form.Item label="高级选项">
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item name={['options', 'precision']} label="时间精度">
                  <Select>
                    <Option value="ns">纳秒 (ns)</Option>
                    <Option value="u">微秒 (u)</Option>
                    <Option value="ms">毫秒 (ms)</Option>
                    <Option value="s">秒 (s)</Option>
                    <Option value="m">分钟 (m)</Option>
                    <Option value="h">小时 (h)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={['options', 'batchSize']} label="批次大小">
                  <Input type="number" min={100} max={10000} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={['options', 'retentionPolicy']} label="保留策略">
                  <Input placeholder="默认" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name={['options', 'consistency']} label="一致性级别">
                  <Select>
                    <Option value="one">One</Option>
                    <Option value="quorum">Quorum</Option>
                    <Option value="all">All</Option>
                    <Option value="any">Any</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          {/* 写入结果 */}
          {writeResult && (
            <Alert
              type={writeResult.success ? 'success' : 'error'}
              message={writeResult.message}
              description={
                <div>
                  <p>写入数据点: {writeResult.pointsWritten}</p>
                  <p>耗时: {writeResult.duration}ms</p>
                  {writeResult.errors && writeResult.errors.length > 0 && (
                    <div>
                      <p>错误信息:</p>
                      <ul>
                        {writeResult.errors.map((error, index) => (
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
      </Modal>

      {/* 预览对话框 */}
      <Modal
        title="转换预览"
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={[
          <Button key="close" onClick={() => setShowPreview(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        <div>
          <Text strong>Line Protocol 格式预览 (前10行):</Text>
          <TextArea
            value={previewData}
            rows={15}
            readOnly
            style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 13 }}
          />
        </div>
      </Modal>
    </>
  );
};

export default DataWriteDialog;
