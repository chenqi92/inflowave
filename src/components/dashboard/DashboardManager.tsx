import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Form, Input, Select, Typography, Tag, Row, Col, InputNumber, Modal, List } from '@/components/ui';
// TODO: Replace these Ant Design components: Popconfirm, Divider
import { Card, Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Plus, Edit, Trash2, Copy, BarChart, Eye } from 'lucide-react';
import { safeTauriInvoke } from '@/utils/tauri';
import type { DashboardConfig } from '@/types';

const { Textarea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface DashboardManagerProps {
  onOpenDashboard: (dashboardId: string) => void;
}

const DashboardManager: React.FC<DashboardManagerProps> = ({
  onOpenDashboard}) => {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardConfig | null>(null);
  const form = useForm();

  // 加载仪表板列表
  const loadDashboards = async () => {
    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_dashboards') as DashboardConfig[];
      setDashboards(result);
    } catch (error) {
      console.error('加载仪表板失败:', error);
      toast({ title: "错误", description: "加载仪表板失败", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 创建仪表板
  const createDashboard = async (values: any) => {
    try {
      const dashboardId = await safeTauriInvoke('create_dashboard', {
        request: {
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns || 12,
            rows: values.rows || 8,
            gap: values.gap || 16},
          refresh_interval: values.refreshInterval || 30000,
          time_range: {
            start: values.timeStart || 'now() - 1h',
            end: values.timeEnd || 'now()'}}}) as string;

      toast({ title: "成功", description: "仪表板创建成功" });
      setCreateModalVisible(false);
      form.resetFields();
      loadDashboards();
      
      // 自动打开新创建的仪表板
      onOpenDashboard(dashboardId);
    } catch (error) {
      console.error('创建仪表板失败:', error);
      toast({ title: "错误", description: "创建仪表板失败", variant: "destructive" });
    }
  };

  // 更新仪表板
  const updateDashboard = async (values: any) => {
    if (!selectedDashboard) return;

    try {
      await safeTauriInvoke('update_dashboard', {
        request: {
          id: selectedDashboard.id,
          name: values.name,
          description: values.description,
          layout: {
            columns: values.columns,
            rows: values.rows,
            gap: values.gap},
          refresh_interval: values.refreshInterval,
          time_range: {
            start: values.timeStart,
            end: values.timeEnd}}});

      toast({ title: "成功", description: "仪表板更新成功" });
      setEditModalVisible(false);
      setSelectedDashboard(null);
      form.resetFields();
      loadDashboards();
    } catch (error) {
      console.error('更新仪表板失败:', error);
      toast({ title: "错误", description: "更新仪表板失败", variant: "destructive" });
    }
  };

  // 删除仪表板
  const deleteDashboard = async (dashboardId: string) => {
    try {
      await safeTauriInvoke('delete_dashboard', { dashboardId });
      toast({ title: "成功", description: "仪表板删除成功" });
      loadDashboards();
    } catch (error) {
      console.error('删除仪表板失败:', error);
      toast({ title: "错误", description: "删除仪表板失败", variant: "destructive" });
    }
  };

  // 复制仪表板
  const duplicateDashboard = async (dashboard: DashboardConfig) => {
    try {
      const newName = `${dashboard.name} - 副本`;
      const newDashboardId = await safeTauriInvoke('duplicate_dashboard', {
        dashboardId: dashboard.id,
        newName}) as string;

      toast({ title: "成功", description: "仪表板复制成功" });
      loadDashboards();
      onOpenDashboard(newDashboardId);
    } catch (error) {
      console.error('复制仪表板失败:', error);
      toast({ title: "错误", description: "复制仪表板失败", variant: "destructive" });
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
      timeEnd: dashboard.timeRange.end});
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
            icon={<Plus className="w-4 h-4"  />}
            onClick={() => setCreateModalVisible(true)}>
            创建仪表板
          </Button>
        }>
        <List
          disabled={loading}
          dataSource={dashboards}
          locale={{ emptyText: '暂无仪表板' }}
          renderItem={(dashboard) => (
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<Eye className="w-4 h-4"  />}
                  onClick={() => onOpenDashboard(dashboard.id)}>
                  查看
                </Button>,
                <Button
                  type="text"
                  icon={<Edit className="w-4 h-4"  />}
                  onClick={() => openEditModal(dashboard)}>
                  编辑
                </Button>,
                <Button
                  type="text"
                  icon={<Copy className="w-4 h-4"  />}
                  onClick={() => duplicateDashboard(dashboard)}>
                  复制
                </Button>,
                <Popconfirm
                  title="确定要删除这个仪表板吗？"
                  onConfirm={() => deleteDashboard(dashboard.id)}>
                  <Button type="text" danger icon={<Trash2 className="w-4 h-4"  />}>
                    删除
                  </Button>
                </Popconfirm>,
              ]}>
              <List.Item.Meta
                avatar={<BarChart className="w-4 h-4" style={{ fontSize: 24, color: '#1890ff' }}  />}
                title={
                  <div className="flex gap-2">
                    <Text strong>{dashboard.name}</Text>
                    <Tag color="blue">{dashboard.widgets.length} 个组件</Tag>
                    <Tag color="green">{getRefreshIntervalLabel(dashboard.refreshInterval)}</Tag>
                  </div>
                }
                description={
                  <div>
                    {dashboard.description && (
                      <Text type="secondary">{dashboard.description}</Text>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <div className="flex gap-2" size="small">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          布局: {dashboard.layout.columns}x{dashboard.layout.rows}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          创建时间: {formatTime(dashboard.createdAt)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          更新时间: {formatTime(dashboard.updatedAt)}
                        </Text>
                      </div>
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
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalVisible(false);
            form.resetFields();
          }
        }}>
        <Form form={form} layout="vertical" onFinish={createDashboard}>
          <FormItem name="name"
            label="仪表板名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}>
            <Input placeholder="输入仪表板名称" />
          </FormItem>

          <FormItem name="description" label="描述">
            <Textarea rows={3} placeholder="输入仪表板描述（可选）" />
          </FormItem>

          <div className="border-t border my-4">布局设置</div>

          <Row gutter={16}>
            <Col span={8}>
              <FormItem name="columns" label="列数" initialValue={12}>
                <InputNumber min={1} max={24} style={{ width: '100%' }} />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="rows" label="行数" initialValue={8}>
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="gap" label="间距" initialValue={16}>
                <InputNumber min={0} max={50} style={{ width: '100%' }} />
              </FormItem>
            </Col>
          </Row>

          <div className="border-t border my-4">时间和刷新设置</div>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem name="timeStart" label="开始时间" initialValue="now() - 1h">
                <Input placeholder="now() - 1h" />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem name="timeEnd" label="结束时间" initialValue="now()">
                <Input placeholder="now()" />
              </FormItem>
            </Col>
          </Row>

          <FormItem name="refreshInterval" label="刷新间隔 (毫秒)" initialValue={30000}>
            <Select>
              <Option value={5000}>5 秒</Option>
              <Option value={10000}>10 秒</Option>
              <Option value={30000}>30 秒</Option>
              <Option value={60000}>1 分钟</Option>
              <Option value={300000}>5 分钟</Option>
              <Option value={600000}>10 分钟</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 编辑仪表板对话框 */}
      <Modal
        title="编辑仪表板"
        open={editModalVisible}
        onOpenChange={(open) => {
          if (!open) {
            setEditModalVisible(false);
            setSelectedDashboard(null);
            form.resetFields();
          }
        }}>
        <Form form={form} layout="vertical" onFinish={updateDashboard}>
          <FormItem name="name"
            label="仪表板名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}>
            <Input placeholder="输入仪表板名称" />
          </FormItem>

          <FormItem name="description" label="描述">
            <Textarea rows={3} placeholder="输入仪表板描述（可选）" />
          </FormItem>

          <div className="border-t border my-4">布局设置</div>

          <Row gutter={16}>
            <Col span={8}>
              <FormItem name="columns" label="列数">
                <InputNumber min={1} max={24} style={{ width: '100%' }} />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="rows" label="行数">
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </FormItem>
            </Col>
            <Col span={8}>
              <FormItem name="gap" label="间距">
                <InputNumber min={0} max={50} style={{ width: '100%' }} />
              </FormItem>
            </Col>
          </Row>

          <div className="border-t border my-4">时间和刷新设置</div>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem name="timeStart" label="开始时间">
                <Input placeholder="now() - 1h" />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem name="timeEnd" label="结束时间">
                <Input placeholder="now()" />
              </FormItem>
            </Col>
          </Row>

          <FormItem name="refreshInterval" label="刷新间隔 (毫秒)">
            <Select>
              <Option value={5000}>5 秒</Option>
              <Option value={10000}>10 秒</Option>
              <Option value={30000}>30 秒</Option>
              <Option value={60000}>1 分钟</Option>
              <Option value={300000}>5 分钟</Option>
              <Option value={600000}>10 分钟</Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardManager;
