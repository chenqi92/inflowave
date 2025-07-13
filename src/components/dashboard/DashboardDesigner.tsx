import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Button, Typography, Form, Input, Select, Row, Col, Empty, Modal } from '@/components/ui';
import { Card, Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';

// TODO: Replace these Ant Design components: Dropdown, Menu, Grid, 
import { Plus, Edit, Trash2, Settings, BarChart, TrendingUp, PieChart, Table, Save, Eye, LayoutDashboard } from 'lucide-react';
// TODO: Replace these icons: MoreOutlined
// You may need to find alternatives or create custom icons
import { Responsive, WidthProvider } from 'react-grid-layout';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import SimpleChart from '../common/SimpleChart';
import type { Dashboard, DashboardWidget } from '@/types';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;
const { Textarea } = Input;

interface DashboardDesignerProps {
  dashboardId?: string;
  onSave?: (dashboard: Dashboard) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const DashboardDesigner: React.FC<DashboardDesignerProps> = ({
  dashboardId,
  onSave,
  onCancel,
  readOnly = false}) => {
  const { connections, activeConnectionId } = useConnectionStore();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const form = useForm();
  const dashboardForm = useForm();

  // 加载仪表板
  const loadDashboard = async (id: string) => {
    setLoading(true);
    try {
      const dashboardData = await safeTauriInvoke<Dashboard>('get_dashboard', { id });
      setDashboard(dashboardData);
      setWidgets(dashboardData.widgets || []);
    } catch (error) {
      toast({ title: "错误", description: "加载仪表板失败: ${error}", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // 保存仪表板
  const handleSaveDashboard = async (values: any) => {
    try {
      const dashboardData: Dashboard = {
        id: dashboard?.id || `dashboard_${Date.now()}`,
        name: values.name,
        description: values.description,
        widgets,
        layout: widgets.map(w => w.layout),
        createdAt: dashboard?.createdAt || new Date(),
        updatedAt: new Date()};

      if (dashboard?.id) {
        await safeTauriInvoke('update_dashboard', { dashboard: dashboardData });
        toast({ title: "成功", description: "仪表板已更新" });
      } else {
        await safeTauriInvoke('create_dashboard', { dashboard: dashboardData });
        toast({ title: "成功", description: "仪表板已创建" });
      }

      setDashboard(dashboardData);
      setShowDashboardModal(false);
      onSave?.(dashboardData);
    } catch (error) {
      toast({ title: "错误", description: "保存仪表板失败: ${error}", variant: "destructive" });
    }
  };

  // 添加小部件
  const handleAddWidget = () => {
    setEditingWidget(null);
    form.resetFields();
    setShowWidgetModal(true);
  };

  // 编辑小部件
  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    form.setFieldsValue({
      title: widget.title,
      type: widget.type,
      query: widget.config.query,
      database: widget.config.database,
      connectionId: widget.config.connectionId,
      refreshInterval: widget.config.refreshInterval});
    setShowWidgetModal(true);
  };

  // 保存小部件
  const handleSaveWidget = async (values: any) => {
    try {
      const newWidget: DashboardWidget = {
        id: editingWidget?.id || `widget_${Date.now()}`,
        title: values.title,
        type: values.type,
        config: {
          query: values.query,
          database: values.database,
          connectionId: values.connectionId,
          refreshInterval: values.refreshInterval || 30},
        layout: editingWidget?.layout || {
          x: 0,
          y: 0,
          w: 6,
          h: 4,
          minW: 3,
          minH: 2},
        data: null,
        lastUpdated: new Date()};

      if (editingWidget) {
        setWidgets(prev => prev.map(w => w.id === editingWidget.id ? newWidget : w));
        toast({ title: "成功", description: "小部件已更新" });
      } else {
        setWidgets(prev => [...prev, newWidget]);
        toast({ title: "成功", description: "小部件已添加" });
      }

      setShowWidgetModal(false);
      form.resetFields();
    } catch (error) {
      toast({ title: "错误", description: "保存小部件失败: ${error}", variant: "destructive" });
    }
  };

  // 删除小部件
  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    toast({ title: "成功", description: "小部件已删除" });
  };

  // 布局变化处理
  const handleLayoutChange = (layout: any[]) => {
    setWidgets(prev => prev.map(widget => {
      const layoutItem = layout.find(l => l.i === widget.id);
      return layoutItem ? { ...widget, layout: layoutItem } : widget;
    }));
  };

  // 渲染小部件内容
  const renderWidgetContent = (widget: DashboardWidget) => {
    if (!widget.data) {
      return (
        <Empty
          description="暂无数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    switch (widget.type) {
      case 'chart':
        return (
          <SimpleChart
            data={widget.data}
            type="line"
            height={widget.layout.h * 60 - 100}
          />
        );
      case 'table':
        return (
          <div style={{ fontSize: '12px', overflow: 'auto' }}>
            {/* 简化的表格显示 */}
            <pre>{JSON.stringify(widget.data, null, 2)}</pre>
          </div>
        );
      default:
        return <div>未知小部件类型</div>;
    }
  };

  // 小部件菜单
  const getWidgetMenu = (widget: DashboardWidget) => (
    <Menu
      items={[
        {
          key: 'edit',
          label: '编辑',
          icon: <Edit className="w-4 h-4"  />,
          onClick: () => handleEditWidget(widget)},
        {
          key: 'refresh',
          label: '刷新',
          icon: <Settings className="w-4 h-4"  />,
          onClick: () => {
            // 刷新小部件数据
            toast({ title: "信息", description: "刷新功能开发中..." });
          }},
        {
          key: 'delete',
          label: '删除',
          icon: <Trash2 className="w-4 h-4"  />,
          danger: true,
          onClick: () => handleDeleteWidget(widget.id)},
      ]}
    />
  );

  useEffect(() => {
    if (dashboardId) {
      loadDashboard(dashboardId);
    }
  }, [dashboardId]);

  return (
    <div style={{ height: '100%', padding: '16px' }}>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <div className="flex gap-2">
              <Title level={4} style={{ margin: 0 }}>
                {dashboard?.name || '新建仪表板'}
              </Title>
              {dashboard?.description && (
                <Text type="secondary">{dashboard.description}</Text>
              )}
            </div>
          </Col>
          <Col>
            <div className="flex gap-2">
              {!readOnly && (
                <>
                  <Button
                    type="primary"
                    icon={<Plus className="w-4 h-4"  />}
                    onClick={handleAddWidget}>
                    添加小部件
                  </Button>
                  <Button
                    icon={<Settings className="w-4 h-4"  />}
                    onClick={() => {
                      dashboardForm.setFieldsValue({
                        name: dashboard?.name,
                        description: dashboard?.description});
                      setShowDashboardModal(true);
                    }}>
                    设置
                  </Button>
                  <Button
                    icon={<Save className="w-4 h-4"  />}
                    onClick={() => {
                      if (dashboard) {
                        handleSaveDashboard({
                          name: dashboard.name,
                          description: dashboard.description});
                      } else {
                        setShowDashboardModal(true);
                      }
                    }}>
                    保存
                  </Button>
                </>
              )}
              {onCancel && (
                <Button onClick={onCancel}>
                  {readOnly ? '关闭' : '取消'}
                </Button>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* 网格布局 */}
      <div style={{ height: 'calc(100% - 80px)' }}>
        {widgets.length> 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: widgets.map(w => ({ ...w.layout, i: w.id })) }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            onLayoutChange={handleLayoutChange}
            isDraggable={!readOnly}
            isResizable={!readOnly}>
            {widgets.map(widget => (
              <div key={widget.id}>
                <Card
                  title={widget.title}
                  size="small"
                  extra={
                    !readOnly && (
                      <Dropdown
                        overlay={getWidgetMenu(widget)}
                        trigger={['click']}>
                        <Button type="text" icon={<MoreOutlined />} size="small" />
                      </Dropdown>
                    )
                  }
                  style={{ height: '100%' }}
                  styles={{ body: { height: 'calc(100% - 40px)', padding: 8 } }}>
                  {renderWidgetContent(widget)}
                </Card>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <Empty
            description="暂无小部件"
            image={Empty.PRESENTED_IMAGE_SIMPLE}>
            {!readOnly && (
              <Button type="primary" icon={<Plus className="w-4 h-4"  />} onClick={handleAddWidget}>
                添加第一个小部件
              </Button>
            )}
          </Empty>
        )}
      </div>

      {/* 小部件编辑模态框 */}
      <Modal
        title={editingWidget ? '编辑小部件' : '添加小部件'}
        open={showWidgetModal}
        onOpenChange={(open) => !open && (() => setShowWidgetModal(false))()}
        width={600}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveWidget}>
          <FormItem name="title"
            label="标题"
            rules={[{ required: true, message: '请输入小部件标题' }]}>
            <Input placeholder="输入小部件标题" />
          </FormItem>

          <FormItem name="type"
            label="类型"
            rules={[{ required: true, message: '请选择小部件类型' }]}>
            <Select placeholder="选择小部件类型">
              <Select.Option value="chart">图表</Select.Option>
              <Select.Option value="table">表格</Select.Option>
              <Select.Option value="metric">指标</Select.Option>
            </Select>
          </FormItem>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem name="connectionId"
                label="连接"
                rules={[{ required: true, message: '请选择连接' }]}>
                <Select placeholder="选择连接">
                  {connections.map(conn => (
                    <Select.Option key={conn.id} value={conn.id}>
                      {conn.name}
                    </Select.Option>
                  ))}
                </Select>
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem name="database"
                label="数据库"
                rules={[{ required: true, message: '请输入数据库名称' }]}>
                <Input placeholder="输入数据库名称" />
              </FormItem>
            </Col>
          </Row>

          <FormItem name="query"
            label="查询语句"
            rules={[{ required: true, message: '请输入查询语句' }]}>
            <Textarea
              rows={4}
              placeholder="输入 InfluxQL 查询语句"
              style={{ fontFamily: 'monospace' }}
            />
          </FormItem>

          <FormItem name="refreshInterval"
            label="刷新间隔（秒）">
            <Select defaultValue={30}>
              <Select.Option value={10}>10秒</Select.Option>
              <Select.Option value={30}>30秒</Select.Option>
              <Select.Option value={60}>1分钟</Select.Option>
              <Select.Option value={300}>5分钟</Select.Option>
              <Select.Option value={600}>10分钟</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      {/* 仪表板设置模态框 */}
      <Modal
        title="仪表板设置"
        open={showDashboardModal}
        onOpenChange={(open) => !open && (() => setShowDashboardModal(false))()}>
        <Form
          form={dashboardForm}
          layout="vertical"
          onFinish={handleSaveDashboard}>
          <FormItem name="name"
            label="名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}>
            <Input placeholder="输入仪表板名称" />
          </FormItem>

          <FormItem name="description"
            label="描述">
            <Textarea
              rows={3}
              placeholder="输入仪表板描述（可选）"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  );
};

export default DashboardDesigner;
