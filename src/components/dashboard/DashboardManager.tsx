import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  List,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Row,
  Col,
  Divider,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  BarChartOutlined,
  SettingOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import type { DashboardConfig, DashboardLayout, TimeRange } from '@/types';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DashboardManagerProps {
  onOpenDashboard: (dashboardId: string) => void;
}

const DashboardManager: React.FC<DashboardManagerProps> = ({
  onOpenDashboard,
}) => {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardConfig | null>(null);
  const [form] = Form.useForm();

  // 加载仪表板列表
  const loadDashboards = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_dashboards') as DashboardConfig[];
      setDashboards(result);
    } catch (error) {
      console.error('加载仪表板失败:', error);
      message.error('加载仪表板失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建仪表板
  const createDashboard = async (values: any) => {
    try {
      const dashboardId = await invoke('create_dashboard', {
        request: {
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns || 12,
            rows: values.rows || 8,
            gap: values.gap || 16,
          },
          refresh_interval: values.refreshInterval || 30000,
          time_range: {
            start: values.timeStart || 'now() - 1h',
            end: values.timeEnd || 'now()',
          },
        },
      }) as string;

      message.success('仪表板创建成功');
      setCreateModalVisible(false);
      form.resetFields();
      loadDashboards();
      
      // 自动打开新创建的仪表板
      onOpenDashboard(dashboardId);
    } catch (error) {
      console.error('创建仪表板失败:', error);
      message.error('创建仪表板失败');
    }
  };

  // 更新仪表板
  const updateDashboard = async (values: any) => {
    if (!selectedDashboard) return;

    try {
      await invoke('update_dashboard', {
        request: {
          id: selectedDashboard.id,
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns,
            rows: values.rows,
            gap: values.gap,
          },
          refresh_interval: values.refreshInterval,
          time_range: {
            start: values.timeStart,
            end: values.timeEnd,
          },
        },
      });

      message.success('仪表板更新成功');
      setEditModalVisible(false);
      setSelectedDashboard(null);
      form.resetFields();
      loadDashboards();
    } catch (error) {
      console.error('更新仪表板失败:', error);
      message.error('更新仪表板失败');
    }
  };

  // 删除仪表板
  const deleteDashboard = async (dashboardId: string) => {
    try {
      await invoke('delete_dashboard', { dashboardId });
      message.success('仪表板删除成功');
      loadDashboards();
    } catch (error) {
      console.error('删除仪表板失败:', error);
      message.error('删除仪表板失败');
    }
  };

  // 复制仪表板
  const duplicateDashboard = async (dashboard: DashboardConfig) => {
    try {
      const newName = `${dashboard.name} - 副本`;
      const newDashboardId = await invoke('duplicate_dashboard', {
        dashboardId: dashboard.id,
        newName,
      }) as string;

      message.success('仪表板复制成功');
      loadDashboards();
      onOpenDashboard(newDashboardId);
    } catch (error) {
      console.error('复制仪表板失败:', error);
      message.error('复制仪表板失败');
    }
  };

  // 打开编辑对话框
  const openEditModal = (dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard);
    form.setFieldsValue({
      name: dashboard.name,
      description: dashboard.description,
      columns: dashboard.layout.columns,
      rows: dashboard.layout.rows,
      gap: dashboard.layout.gap,
      refreshInterval: dashboard.refreshInterval,
      timeStart: dashboard.timeRange.start,
      timeEnd: dashboard.timeRange.end,
    });
    setEditModalVisible(true);
  };

  // 格式化时间
  const formatTime = (dateTime: string | Date) => {
    return new Date(dateTime).toLocaleString();
  };

  // 获取刷新间隔标签
  const getRefreshIntervalLabel = (interval: number) => {
    if (interval < 1000) return `${interval}ms`;
    if (interval < 60000) return `${interval / 1000}s`;
    return `${interval / 60000}m`;
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  return (
    <div className="dashboard-manager">
      <Card
        title="仪表板管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            创建仪表板
          </Button>
        }
      >
        <List
          loading={loading}
          dataSource={dashboards}
          locale={{ emptyText: '暂无仪表板' }}
          renderItem={(dashboard) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => onOpenDashboard(dashboard.id)}
                >
                  查看
                </Button>,
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(dashboard)}
                >
                  编辑
                </Button>,
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => duplicateDashboard(dashboard)}
                >
                  复制
                </Button>,
                <Popconfirm
                  title="确定要删除这个仪表板吗？"
                  onConfirm={() => deleteDashboard(dashboard.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="text" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<BarChartOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                title={
                  <Space>
                    <Text strong>{dashboard.name}</Text>
                    <Tag color="blue">{dashboard.widgets.length} 个组件</Tag>
                    <Tag color="green">{getRefreshIntervalLabel(dashboard.refreshInterval)}</Tag>
                  </Space>
                }
                description={
                  <div>
                    {dashboard.description && (
                      <Text type="secondary">{dashboard.description}</Text>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <Space size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          布局: {dashboard.layout.columns}x{dashboard.layout.rows}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          创建时间: {formatTime(dashboard.createdAt)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新时间: {formatTime(dashboard.updatedAt)}
                        </Text>
                      </Space>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 创建仪表板对话框 */}
      <Modal
        title="创建仪表板"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={createDashboard}>
          <Form.Item
            name="name"
            label="仪表板名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}
          >
            <Input placeholder="输入仪表板名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入仪表板描述（可选）" />
          </Form.Item>

          <Divider>布局设置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="columns" label="列数" initialValue={12}>
                <InputNumber min={1} max={24} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="rows" label="行数" initialValue={8}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gap" label="间距" initialValue={16}>
                <InputNumber min={0} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>时间和刷新设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeStart" label="开始时间" initialValue="now() - 1h">
                <Input placeholder="now() - 1h" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeEnd" label="结束时间" initialValue="now()">
                <Input placeholder="now()" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="refreshInterval" label="刷新间隔 (毫秒)" initialValue={30000}>
            <Select>
              <Option value={5000}>5 秒</Option>
              <Option value={10000}>10 秒</Option>
              <Option value={30000}>30 秒</Option>
              <Option value={60000}>1 分钟</Option>
              <Option value={300000}>5 分钟</Option>
              <Option value={600000}>10 分钟</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑仪表板对话框 */}
      <Modal
        title="编辑仪表板"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedDashboard(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={updateDashboard}>
          <Form.Item
            name="name"
            label="仪表板名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}
          >
            <Input placeholder="输入仪表板名称" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea rows={3} placeholder="输入仪表板描述（可选）" />
          </Form.Item>

          <Divider>布局设置</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="columns" label="列数">
                <InputNumber min={1} max={24} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="rows" label="行数">
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gap" label="间距">
                <InputNumber min={0} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>时间和刷新设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeStart" label="开始时间">
                <Input placeholder="now() - 1h" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="timeEnd" label="结束时间">
                <Input placeholder="now()" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="refreshInterval" label="刷新间隔 (毫秒)">
            <Select>
              <Option value={5000}>5 秒</Option>
              <Option value={10000}>10 秒</Option>
              <Option value={30000}>30 秒</Option>
              <Option value={60000}>1 分钟</Option>
              <Option value={300000}>5 分钟</Option>
              <Option value={600000}>10 分钟</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardManager;
