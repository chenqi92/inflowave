import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Space,
  Typography,
  Table,
  message,
  Tabs,
  Upload,
  Alert,
  Row,
  Col,
  Tag,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SaveOutlined,
  ClearOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '@/store/connection';
import type { DataPoint, BatchWriteRequest, WriteResult } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DataPointForm extends Omit<DataPoint, 'timestamp'> {
  timestamp?: dayjs.Dayjs;
}

const DataWrite: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [dataPoints, setDataPoints] = useState<DataPointForm[]>([]);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    try {
      const dbList = await invoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList);
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      message.error(`加载数据库列表失败: ${error}`);
    }
  };

  // 添加数据点
  const addDataPoint = () => {
    const values = form.getFieldsValue();
    if (!values.measurement) {
      message.warning('请输入测量名称');
      return;
    }

    const newDataPoint: DataPointForm = {
      measurement: values.measurement,
      tags: values.tags || {},
      fields: values.fields || {},
      timestamp: values.timestamp || dayjs(),
    };

    setDataPoints(prev => [...prev, newDataPoint]);
    form.resetFields(['measurement', 'tags', 'fields', 'timestamp']);
    message.success('数据点已添加到批次');
  };

  // 删除数据点
  const removeDataPoint = (index: number) => {
    setDataPoints(prev => prev.filter((_, i) => i !== index));
    message.success('数据点已删除');
  };

  // 清空所有数据点
  const clearDataPoints = () => {
    setDataPoints([]);
    message.success('已清空所有数据点');
  };

  // 写入单个数据点
  const writeSinglePoint = async (values: any) => {
    if (!activeConnectionId || !selectedDatabase) {
      message.warning('请先选择连接和数据库');
      return;
    }

    setLoading(true);
    try {
      const dataPoint: DataPoint = {
        measurement: values.measurement,
        tags: values.tags || {},
        fields: values.fields || {},
        timestamp: values.timestamp ? values.timestamp.toDate() : new Date(),
      };

      const request: BatchWriteRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        points: [dataPoint],
        precision: values.precision || 'ms',
      };

      const result = await invoke<WriteResult>('write_data_points', { request });

      if (result.success) {
        message.success(`数据写入成功，写入 ${result.pointsWritten} 个数据点`);
        form.resetFields();
      } else {
        message.error(`数据写入失败: ${result.errors[0]?.error || '未知错误'}`);
      }
    } catch (error) {
      message.error(`数据写入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 批量写入数据点
  const writeBatchPoints = async () => {
    if (!activeConnectionId || !selectedDatabase) {
      message.warning('请先选择连接和数据库');
      return;
    }

    if (dataPoints.length === 0) {
      message.warning('请先添加数据点');
      return;
    }

    setLoading(true);
    try {
      const points: DataPoint[] = dataPoints.map(point => ({
        measurement: point.measurement,
        tags: point.tags,
        fields: point.fields,
        timestamp: point.timestamp ? point.timestamp.toDate() : new Date(),
      }));

      const request: BatchWriteRequest = {
        connectionId: activeConnectionId,
        database: selectedDatabase,
        points,
        precision: 'ms',
      };

      const result = await invoke<WriteResult>('write_data_points', { request });

      if (result.success) {
        message.success(`批量写入成功，写入 ${result.pointsWritten} 个数据点`);
        setDataPoints([]);
      } else {
        message.error(`批量写入失败: ${result.errors.length} 个错误`);
        console.error('写入错误:', result.errors);
      }
    } catch (error) {
      message.error(`批量写入失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 解析 Line Protocol 格式
  const parseLineProtocol = (lineProtocol: string) => {
    const lines = lineProtocol.trim().split('\n');
    const points: DataPointForm[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        // 简单的 Line Protocol 解析
        // 格式: measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
        const parts = line.trim().split(' ');
        if (parts.length < 2) continue;

        const measurementAndTags = parts[0];
        const fieldsStr = parts[1];
        const timestamp = parts[2] ? parseInt(parts[2]) : Date.now();

        const [measurement, ...tagParts] = measurementAndTags.split(',');
        const tags: Record<string, string> = {};

        for (const tagPart of tagParts) {
          const [key, value] = tagPart.split('=');
          if (key && value) {
            tags[key] = value;
          }
        }

        const fields: Record<string, any> = {};
        const fieldPairs = fieldsStr.split(',');
        for (const fieldPair of fieldPairs) {
          const [key, value] = fieldPair.split('=');
          if (key && value) {
            // 尝试解析数值
            if (!isNaN(Number(value))) {
              fields[key] = Number(value);
            } else if (value === 'true' || value === 'false') {
              fields[key] = value === 'true';
            } else {
              // 移除引号
              fields[key] = value.replace(/^"(.*)"$/, '$1');
            }
          }
        }

        points.push({
          measurement,
          tags,
          fields,
          timestamp: dayjs(timestamp),
        });
      } catch (error) {
        console.error('解析行失败:', line, error);
      }
    }

    return points;
  };

  // 处理 Line Protocol 输入
  const handleLineProtocolSubmit = (values: any) => {
    try {
      const points = parseLineProtocol(values.lineProtocol);
      if (points.length > 0) {
        setDataPoints(prev => [...prev, ...points]);
        message.success(`解析成功，添加了 ${points.length} 个数据点`);
        batchForm.resetFields();
      } else {
        message.warning('未能解析出有效的数据点');
      }
    } catch (error) {
      message.error(`解析失败: ${error}`);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  if (!activeConnectionId) {
    return (
      <div className="p-6">
        <Alert
          message="请先连接到 InfluxDB"
          description="在连接管理页面选择一个连接并激活后，才能写入数据。"
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          action={
            <Button size="small" type="primary">
              去连接
            </Button>
          }
        />
      </div>
    );
  }

  // 数据点表格列定义
  const columns = [
    {
      title: '测量',
      dataIndex: 'measurement',
      key: 'measurement',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: Record<string, string>) => (
        <Space wrap>
          {Object.entries(tags).map(([key, value]) => (
            <Tag key={key} color="blue">
              {key}={value}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '字段',
      dataIndex: 'fields',
      key: 'fields',
      render: (fields: Record<string, any>) => (
        <Space wrap>
          {Object.entries(fields).map(([key, value]) => (
            <Tag key={key} color="green">
              {key}={String(value)}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: dayjs.Dayjs) => timestamp.format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: any, __: any, index: number) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeDataPoint(index)}
        />
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* 页面标题和数据库选择 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={2}>数据写入</Title>
          <Text type="secondary">
            向 InfluxDB 写入时序数据
          </Text>
        </div>
        <Select
          style={{ width: 200 }}
          placeholder="选择数据库"
          value={selectedDatabase}
          onChange={setSelectedDatabase}
        >
          {databases.map(db => (
            <Option key={db} value={db}>
              {db}
            </Option>
          ))}
        </Select>
      </div>

      <Tabs
        items={[
          {
            key: 'single',
            label: '单点写入',
            children: (
              <Card title="单个数据点写入">
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={writeSinglePoint}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        label="测量名称"
                        name="measurement"
                        rules={[{ required: true, message: '请输入测量名称' }]}
                      >
                        <Input placeholder="例如: temperature" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        label="时间戳"
                        name="timestamp"
                        tooltip="留空则使用当前时间"
                      >
                        <DatePicker
                          showTime
                          style={{ width: '100%' }}
                          placeholder="选择时间戳"
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="标签 (Tags)">
                    <Form.List name="tagList">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'key']}
                                rules={[{ required: true, message: '请输入标签键' }]}
                              >
                                <Input placeholder="标签键" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'value']}
                                rules={[{ required: true, message: '请输入标签值' }]}
                              >
                                <Input placeholder="标签值" />
                              </Form.Item>
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Space>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            icon={<PlusOutlined />}
                          >
                            添加标签
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>

                  <Form.Item label="字段 (Fields)">
                    <Form.List name="fieldList">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                              <Form.Item
                                {...restField}
                                name={[name, 'key']}
                                rules={[{ required: true, message: '请输入字段键' }]}
                              >
                                <Input placeholder="字段键" />
                              </Form.Item>
                              <Form.Item
                                {...restField}
                                name={[name, 'value']}
                                rules={[{ required: true, message: '请输入字段值' }]}
                              >
                                <InputNumber
                                  placeholder="字段值"
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                              <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Space>
                          ))}
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            icon={<PlusOutlined />}
                          >
                            添加字段
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Form.Item>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        icon={<SaveOutlined />}
                      >
                        立即写入
                      </Button>
                      <Button onClick={addDataPoint} icon={<PlusOutlined />}>
                        添加到批次
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'batch',
            label: '批量写入',
            children: (
              <div className="space-y-6">
                <Card title="Line Protocol 格式">
                  <Alert
                    message="Line Protocol 格式说明"
                    description={
                      <div>
                        <Paragraph>
                          格式: <code>measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp</code>
                        </Paragraph>
                        <Paragraph>
                          示例: <code>temperature,host=server01,region=us-west value=23.5,status="ok" 1609459200000</code>
                        </Paragraph>
                      </div>
                    }
                    type="info"
                    showIcon
                    icon={<InfoCircleOutlined />}
                  />

                  <Divider />

                  <Form
                    form={batchForm}
                    layout="vertical"
                    onFinish={handleLineProtocolSubmit}
                  >
                    <Form.Item
                      label="Line Protocol 数据"
                      name="lineProtocol"
                      rules={[{ required: true, message: '请输入 Line Protocol 数据' }]}
                    >
                      <TextArea
                        rows={8}
                        placeholder={`temperature,host=server01,region=us-west value=23.5,status="ok"
cpu_usage,host=server01,cpu=cpu0 usage_percent=85.2
memory,host=server01 used_bytes=8589934592,available_bytes=4294967296`}
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        解析并添加到批次
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>

                <Card
                  title={`批次数据点 (${dataPoints.length})`}
                  extra={
                    <Space>
                      <Button
                        icon={<ClearOutlined />}
                        onClick={clearDataPoints}
                        disabled={dataPoints.length === 0}
                      >
                        清空
                      </Button>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={writeBatchPoints}
                        loading={loading}
                        disabled={dataPoints.length === 0}
                      >
                        批量写入
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    columns={columns}
                    dataSource={dataPoints}
                    rowKey={(_, index) => index!}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 个数据点`,
                    }}
                    locale={{
                      emptyText: '暂无数据点，请添加数据点到批次',
                    }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'import',
            label: '文件导入',
            children: (
              <Card title="文件导入">
                <Alert
                  message="文件导入功能"
                  description="支持导入 CSV 和 JSON 格式的数据文件，功能正在开发中..."
                  type="info"
                  showIcon
                />

                <div className="mt-6">
                  <Upload.Dragger
                    name="file"
                    multiple={false}
                    accept=".csv,.json"
                    beforeUpload={() => {
                      message.info('文件导入功能正在开发中...');
                      return false;
                    }}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">
                      支持 CSV 和 JSON 格式文件
                    </p>
                  </Upload.Dragger>
                </div>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default DataWrite;
