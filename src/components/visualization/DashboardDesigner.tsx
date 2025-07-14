import { useForm } from 'react-hook-form';
import React, { useState, useCallback, useRef } from 'react';
import { Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Alert } from '@/components/ui';
import { toast, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui';
import { Plus, Edit, Trash2, Settings, Save, Eye, Maximize, GripVertical } from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import AdvancedChartLibrary, { ChartType, AdvancedChartConfig } from './AdvancedChartLibrary';
import { safeTauriInvoke } from '@/utils/tauri';

// Removed Typography and Input destructuring - using direct components

// 响应式网格布局
const ResponsiveGridLayout = WidthProvider(Responsive);

// 仪表盘项目接口
interface DashboardItem {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'text' | 'table';
  chartConfig?: AdvancedChartConfig;
  query?: string;
  refreshInterval?: number;
  lastUpdated?: Date;
  data?: any[];
  loading?: boolean;
  error?: string;
}

// 仪表盘配置接口
interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  layout: Layout[];
  items: DashboardItem[];
  theme: 'light' | 'dark';
  autoRefresh: boolean;
  refreshInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardDesignerProps {
  dashboardId?: string;
  connectionId: string;
  database: string;
  onSave?: (dashboard: DashboardConfig) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

const DashboardDesigner: React.FC<DashboardDesignerProps> = ({
  dashboardId,
  connectionId,
  database,
  onSave,
  onCancel,
  readOnly = false}) => {
  const [dashboard, setDashboard] = useState<DashboardConfig>({
    id: dashboardId || `dashboard_${Date.now()}`,
    name: '新仪表盘',
    description: '',
    layout: [],
    items: [],
    theme: 'light',
    autoRefresh: false,
    refreshInterval: 30000,
    createdAt: new Date(),
    updatedAt: new Date()});

  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const form = useForm();
  const settingsForm = useForm();
  const layoutRef = useRef<any>(null);

  // 网格布局断点
  const breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
  const cols = { lg: 24, md: 20, sm: 16, xs: 12, xxs: 8 };

  // 图表类型选项
  const chartTypeOptions = [
    { value: 'line', label: '折线图' },
    { value: 'bar', label: '柱状图' },
    { value: 'pie', label: '饼图' },
    { value: 'scatter', label: '散点图' },
    { value: 'heatmap', label: '热力图' },
    { value: 'gauge', label: '仪表盘' },
    { value: 'radar', label: '雷达图' },
    { value: 'treemap', label: '树图' },
    { value: 'sankey', label: '桑基图' },
    { value: 'funnel', label: '漏斗图' },
  ];

  // 添加仪表盘项目
  const addDashboardItem = useCallback(() => {
    const newItem: DashboardItem = {
      id: `item_${Date.now()}`,
      title: '新图表',
      type: 'chart',
      chartConfig: {
        type: 'line',
        title: '新图表',
        data: [],
        theme: dashboard.theme},
      query: '',
      refreshInterval: 30000,
      data: [],
      loading: false};

    setEditingItem(newItem);
    setShowItemModal(true);
    form.setFieldsValue({
      title: newItem.title,
      type: newItem.type,
      chartType: newItem.chartConfig?.type,
      query: newItem.query,
      refreshInterval: newItem.refreshInterval});
  }, [dashboard.theme, form]);

  // 编辑仪表盘项目
  const editDashboardItem = useCallback((item: DashboardItem) => {
    setEditingItem(item);
    setShowItemModal(true);
    form.setFieldsValue({
      title: item.title,
      type: item.type,
      chartType: item.chartConfig?.type,
      query: item.query,
      refreshInterval: item.refreshInterval});
  }, [form]);

  // 删除仪表盘项目
  const deleteDashboardItem = useCallback((itemId: string) => {
    setDashboard(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
      layout: prev.layout.filter(layout => layout.i !== itemId)}));
  }, []);

  // 保存仪表盘项目
  const saveDashboardItem = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (!editingItem) return;

      const updatedItem: DashboardItem = {
        ...editingItem,
        title: values.title,
        type: values.type,
        query: values.query,
        refreshInterval: values.refreshInterval,
        chartConfig: {
          ...editingItem.chartConfig,
          type: values.chartType,
          title: values.title}};

      // 如果是新项目，添加到仪表盘
      if (!dashboard.items.find(item => item.id === editingItem.id)) {
        const newLayout = {
          i: editingItem.id,
          x: 0,
          y: 0,
          w: 12,
          h: 8,
          minW: 4,
          minH: 4};

        setDashboard(prev => ({
          ...prev,
          items: [...prev.items, updatedItem],
          layout: [...prev.layout, newLayout]}));
      } else {
        // 更新现有项目
        setDashboard(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === editingItem.id ? updatedItem : item
          )}));
      }

      // 如果有查询，执行查询获取数据
      if (values.query) {
        await executeQuery(updatedItem.id, values.query);
      }

      setShowItemModal(false);
      setEditingItem(null);
      form.resetFields();
      
      toast({ title: "成功", description: "项目保存成功" });
    } catch (error) {
      toast({ title: "错误", description: "保存失败", variant: "destructive" });
    }
  }, [editingItem, dashboard.items, form]);

  // 执行查询
  const executeQuery = useCallback(async (itemId: string, query: string) => {
    setDashboard(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, loading: true, error: undefined } : item
      )}));

    try {
      const result = await safeTauriInvoke('execute_query', {
        connectionId,
        database,
        query});

      const data = result.data || [];

      setDashboard(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? {
                ...item,
                data,
                loading: false,
                lastUpdated: new Date(),
                chartConfig: {
                  ...item.chartConfig,
                  data}}
            : item
        )}));
    } catch (error) {
      setDashboard(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, loading: false, error: String(error) }
            : item
        )}));
    }
  }, [connectionId, database]);

  // 刷新所有项目
  const refreshAllItems = useCallback(async () => {
    const promises = dashboard.items
      .filter(item => item.query)
      .map(item => executeQuery(item.id, item.query!));

    await Promise.all(promises);
  }, [dashboard.items, executeQuery]);

  // 布局变化处理
  const handleLayoutChange = useCallback((layout: Layout[]) => {
    setDashboard(prev => ({
      ...prev,
      layout}));
  }, []);

  // 保存仪表盘
  const saveDashboard = useCallback(async () => {
    try {
      const updatedDashboard = {
        ...dashboard,
        updatedAt: new Date()};

      await safeTauriInvoke('save_dashboard', {
        dashboard: updatedDashboard});

      setDashboard(updatedDashboard);
      
      if (onSave) {
        onSave(updatedDashboard);
      }

      toast({ title: "成功", description: "仪表盘保存成功" });
    } catch (error) {
      toast({ title: "错误", description: "保存失败", variant: "destructive" });
    }
  }, [dashboard, onSave]);

  // 仪表盘设置
  const openDashboardSettings = useCallback(() => {
    setShowSettingsModal(true);
    settingsForm.reset({
      name: dashboard.name,
      description: dashboard.description,
      theme: dashboard.theme,
      autoRefresh: dashboard.autoRefresh,
      refreshInterval: dashboard.refreshInterval});
  }, [dashboard, settingsForm]);

  // 保存仪表盘设置
  const saveDashboardSettings = useCallback(async () => {
    try {
      const values = await settingsForm.validateFields();
      
      setDashboard(prev => ({
        ...prev,
        name: values.name,
        description: values.description,
        theme: values.theme,
        autoRefresh: values.autoRefresh,
        refreshInterval: values.refreshInterval}));

      setShowSettingsModal(false);
      toast({ title: "成功", description: "设置保存成功" });
    } catch (error) {
      toast({ title: "错误", description: "设置保存失败", variant: "destructive" });
    }
  }, [settingsForm]);

  // 渲染仪表盘项目
  const renderDashboardItem = useCallback((item: DashboardItem) => {
    if (item.type === 'chart') {
      return (
        <div className="h-full">
          <div className="flex justify-between items-center mb-2">
            <Text strong>{item.title}</Text>
            {!readOnly && !previewMode && (
              <div className="flex gap-2">
                <Tooltip title="编辑">
                  <Button
                    type="text"
                    size="small"
                    icon={<Edit className="w-4 h-4"  />}
                    onClick={() => editDashboardItem(item)}
                  />
                </Tooltip>
                <Popconfirm
                  title="确定删除这个项目吗？"
                  onConfirm={() => deleteDashboardItem(item.id)}>
                  <Tooltip title="删除">
                    <Button
                      type="text"
                      size="small"
                      icon={<Trash2 className="w-4 h-4"  />}
                      danger
                    />
                  </Tooltip>
                </Popconfirm>
              </div>
            )}
          </div>
          
          {item.error ? (
            <Alert
              message="查询错误"
              description={item.error}
              type="error"
              showIcon
            />
          ) : (
            <AdvancedChartLibrary
              config={item.chartConfig!}
              height={200}
              disabled={item.loading}
              showControls={false}
            />
          )}
        </div>
      );
    }

    return (
      <div className="h-full">
        <Text>其他类型项目</Text>
      </div>
    );
  }, [readOnly, previewMode, editDashboardItem, deleteDashboardItem]);

  // 渲染工具栏
  const renderToolbar = () => (
    <div className="flex justify-between items-center mb-4">
      <div>
        <Title level={4}>{dashboard.name}</Title>
        <Text type="secondary">{dashboard.description}</Text>
      </div>
      <div className="flex gap-2">
        {!readOnly && (
          <>
            <Button
              icon={<Plus className="w-4 h-4"  />}
              onClick={addDashboardItem}>
              添加项目
            </Button>
            <Button
              icon={<Settings className="w-4 h-4"  />}
              onClick={openDashboardSettings}>
              设置
            </Button>
          </>
        )}
        <Button
          icon={<Eye className="w-4 h-4"  />}
          onClick={() => setPreviewMode(!previewMode)}>
          {previewMode ? '编辑模式' : '预览模式'}
        </Button>
        <Button
          icon={<RefreshCw className="w-4 h-4"  />}
          onClick={refreshAllItems}
          disabled={dashboard.items.some(item => item.loading)}>
          刷新
        </Button>
        <Button
          icon={<Save className="w-4 h-4"  />}
          type="primary"
          onClick={saveDashboard}>
          保存
        </Button>
        <Button
          icon={<Maximize className="w-4 h-4"  />}
          onClick={() => setFullscreen(!fullscreen)}>
          全屏
        </Button>
      </div>
    </div>
  );

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}>
      {renderToolbar()}
      
      <div className="dashboard-grid">
        <ResponsiveGridLayout
          ref={layoutRef}
          className="layout"
          layouts={{ lg: dashboard.layout }}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={30}
          onLayoutChange={handleLayoutChange}
          isDraggable={!readOnly && !previewMode}
          isResizable={!readOnly && !previewMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}>
          {dashboard.items.map((item) => (
            <div key={item.id} className="dashboard-item">
              <div className="h-full" bodyStyle={{ padding: 12 }}>
                {renderDashboardItem(item)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* 添加/编辑项目弹窗 */}
      <Modal
        title={editingItem && dashboard.items.find(i => i.id === editingItem.id) ? '编辑项目' : '添加项目'}
        open={showItemModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowItemModal(false);
            setEditingItem(null);
            form.resetFields();
          }
        }}
        width={800}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <FormItem
                label="项目标题"
                name="title"
                rules={[{ required: true, message: '请输入项目标题' }]}>
                <Input placeholder="输入项目标题" />
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem
                label="项目类型"
                name="type"
                rules={[{ required: true, message: '请选择项目类型' }]}>
                <Select placeholder="选择项目类型">
                  <Option value="chart">图表</Option>
                  <Option value="metric">指标</Option>
                  <Option value="text">文本</Option>
                  <Option value="table">表格</Option>
                </Select>
              </FormItem>
            </Col>
          </Row>

          <FormItem
            label="图表类型"
            name="chartType"
            rules={[{ required: true, message: '请选择图表类型' }]}>
            <Select placeholder="选择图表类型">
              {chartTypeOptions.map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </FormItem>

          <FormItem
            label="查询语句"
            name="query"
            rules={[{ required: true, message: '请输入查询语句' }]}>
            <Textarea
              rows={4}
              placeholder="输入 InfluxQL 查询语句"
            />
          </FormItem>

          <FormItem
            label="刷新间隔 (毫秒)"
            name="refreshInterval"
            rules={[{ required: true, message: '请输入刷新间隔' }]}>
            <Input type="number" placeholder="30000" />
          </FormItem>
        </Form>
      </Modal>

      {/* 仪表盘设置弹窗 */}
      <Modal
        title="仪表盘设置"
        open={showSettingsModal}
        onOpenChange={(open) => !open && (() => setShowSettingsModal(false))()}
        width={600}>
        <Form form={settingsForm} layout="vertical">
          <FormItem
            label="仪表盘名称"
            name="name"
            rules={[{ required: true, message: '请输入仪表盘名称' }]}>
            <Input placeholder="输入仪表盘名称" />
          </FormItem>

          <FormItem
            label="描述"
            name="description">
            <Textarea rows={3} placeholder="输入仪表盘描述" />
          </FormItem>

          <Row gutter={16}>
            <Col span={12}>
              <FormItem
                label="主题"
                name="theme">
                <Select>
                  <Option value="light">浅色</Option>
                  <Option value="dark">深色</Option>
                </Select>
              </FormItem>
            </Col>
            <Col span={12}>
              <FormItem
                label="自动刷新"
                name="autoRefresh"
                valuePropName="checked">
                <Switch />
              </FormItem>
            </Col>
          </Row>

          <FormItem
            label="刷新间隔 (毫秒)"
            name="refreshInterval">
            <Input type="number" placeholder="30000" />
          </FormItem>
        </Form>
      </Modal>

      <style jsx>{`
        .dashboard-grid {
          min-height: 400px;
        }
        .dashboard-item {
          border: 1px dashed #d9d9d9;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .dashboard-item:hover {
          border-color: #40a9ff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .react-grid-item.react-grid-placeholder {
          background: #f0f0f0;
          opacity: 0.2;
          border-radius: 4px;
        }
        .react-grid-item.react-draggable-dragging {
          opacity: 0.8;
          z-index: 1000;
        }
        .react-grid-item.react-resizable-resizing {
          opacity: 0.8;
          z-index: 1000;
        }
      `}</style>
    </div>
  );
};

export default DashboardDesigner;