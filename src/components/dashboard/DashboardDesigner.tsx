import { useForm } from 'react-hook-form';
import React, { useState, useEffect } from 'react';
import { Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography } from '@/components/ui';
import { Card, toast, Dialog, DialogContent, DialogHeader, DialogTitle, Textarea } from '@/components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { Plus, Edit, Trash2, Settings, MoreVertical, Save, Eye } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import SimpleChart from '../common/SimpleChart';
import type { Dashboard, DashboardWidget } from '@/types';

const ResponsiveGridLayout = WidthProvider(Responsive);

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
  const form = useForm({
    defaultValues: {
      title: '',
      type: '',
      query: '',
      database: '',
      connectionId: '',
      refreshInterval: 30
    }
  });
  const dashboardForm = useForm({
    defaultValues: {
      name: '',
      description: ''
    }
  });

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
    form.reset();
    setShowWidgetModal(true);
  };

  // 编辑小部件
  const handleEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget);
    form.setValue('title', widget.title);
    form.setValue('type', widget.type);
    form.setValue('query', widget.config.query);
    form.setValue('database', widget.config.database);
    form.setValue('connectionId', widget.config.connectionId);
    form.setValue('refreshInterval', widget.config.refreshInterval);
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
      form.reset();
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
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="text-lg mb-2">📊</div>
          <div className="text-sm">暂无数据</div>
        </div>
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
  const renderWidgetMenu = (widget: DashboardWidget) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEditWidget(widget)}>
          <Edit className="mr-2 h-4 w-4" />
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          toast({ title: "信息", description: "刷新功能开发中..." });
        }}>
          <Settings className="mr-2 h-4 w-4" />
          刷新
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDeleteWidget(widget.id)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  useEffect(() => {
    if (dashboardId) {
      loadDashboard(dashboardId);
    }
  }, [dashboardId]);

  return (
    <div style={{ height: '100%', padding: '16px' }}>
      {/* 工具栏 */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h4 className="text-xl font-semibold">
              {dashboard?.name || '新建仪表板'}
            </h4>
            {dashboard?.description && (
              <Typography.Text className="text-sm text-muted-foreground">{dashboard.description}</Typography.Text>
            )}
          </div>
          <div>
            <div className="flex gap-2">
              {!readOnly && (
                <>
                  <Button
                    className="flex items-center gap-2"
                    onClick={handleAddWidget}>
                    <Plus className="w-4 h-4" />
                    添加小部件
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      dashboardForm.setValue('name', dashboard?.name || '');
                      dashboardForm.setValue('description', dashboard?.description || '');
                      setShowDashboardModal(true);
                    }}>
                    <Settings className="w-4 h-4" />
                    设置
                  </Button>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (dashboard) {
                        handleSaveDashboard({
                          name: dashboard.name,
                          description: dashboard.description});
                      } else {
                        setShowDashboardModal(true);
                      }
                    }}>
                    <Save className="w-4 h-4" />
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
          </div>
        </div>
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
                <Card className="h-full">
                  <div className="flex justify-between items-center p-4 border-b">
                    <Typography variant="h3" className="font-medium">{widget.title}</Typography>
                    {!readOnly && renderWidgetMenu(widget)}
                  </div>
                  <div className="p-2 h-[calc(100%-60px)]">
                    {renderWidgetContent(widget)}
                  </div>
                </Card>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">📊</div>
            <div className="text-lg mb-2">暂无小部件</div>
            {!readOnly && (
              <Button className="flex items-center gap-2" onClick={handleAddWidget}>
                <Plus className="w-4 h-4" />
                添加第一个小部件
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 小部件编辑模态框 */}
      <Dialog open={showWidgetModal} onOpenChange={setShowWidgetModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingWidget ? '编辑小部件' : '添加小部件'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveWidget)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: '请输入小部件标题' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="输入小部件标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                rules={{ required: '请选择小部件类型' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>类型</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择小部件类型" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="chart">图表</SelectItem>
                        <SelectItem value="table">表格</SelectItem>
                        <SelectItem value="metric">指标</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="connectionId"
                  rules={{ required: '请选择连接' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>连接</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择连接" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {connections.map(conn => (
                            <SelectItem key={conn.id} value={conn.id}>
                              {conn.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="database"
                  rules={{ required: '请输入数据库名称' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据库</FormLabel>
                      <FormControl>
                        <Input placeholder="输入数据库名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="query"
                rules={{ required: '请输入查询语句' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>查询语句</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="输入 InfluxQL 查询语句"
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="refreshInterval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔（秒）</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择刷新间隔" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="10">10秒</SelectItem>
                        <SelectItem value="30">30秒</SelectItem>
                        <SelectItem value="60">1分钟</SelectItem>
                        <SelectItem value="300">5分钟</SelectItem>
                        <SelectItem value="600">10分钟</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowWidgetModal(false)}>
                  取消
                </Button>
                <Button type="submit">
                  {editingWidget ? '更新' : '添加'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 仪表板设置模态框 */}
      <Dialog open={showDashboardModal} onOpenChange={setShowDashboardModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>仪表板设置</DialogTitle>
          </DialogHeader>
          <Form {...dashboardForm}>
            <form onSubmit={dashboardForm.handleSubmit(handleSaveDashboard)} className="space-y-4">
              <FormField
                control={dashboardForm.control}
                name="name"
                rules={{ required: '请输入仪表板名称' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名称</FormLabel>
                    <FormControl>
                      <Input placeholder="输入仪表板名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={dashboardForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="输入仪表板描述（可选）"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowDashboardModal(false)}>
                  取消
                </Button>
                <Button type="submit">
                  保存
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardDesigner;
