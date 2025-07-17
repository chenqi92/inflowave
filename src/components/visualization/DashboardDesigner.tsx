import { useForm } from 'react-hook-form';
import React, { useState, useCallback, useRef } from 'react';
import {
  Button,
  Input,
  Textarea,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Title,
  Text,
  Popconfirm,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
  Eye,
  Maximize,
  RefreshCw,
} from 'lucide-react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import AdvancedChartLibrary, {
  AdvancedChartConfig,
} from './AdvancedChartLibrary';
import { safeTauriInvoke } from '@/utils/tauri';

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
  readOnly = false,
}) => {
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
    updatedAt: new Date(),
  });

  const [editingItem, setEditingItem] = useState<DashboardItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: '',
      type: 'chart' as 'chart' | 'metric' | 'text' | 'table',
      chartType: 'line',
      query: '',
      refreshInterval: 30000,
    },
  });

  const settingsForm = useForm({
    defaultValues: {
      name: '',
      description: '',
      theme: 'light' as 'light' | 'dark',
      autoRefresh: false,
      refreshInterval: 30000,
    },
  });

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
        theme: dashboard.theme,
      },
      query: '',
      refreshInterval: 30000,
      data: [],
      loading: false,
    };

    setEditingItem(newItem);
    setShowItemModal(true);
    form.reset({
      title: newItem.title,
      type: newItem.type,
      chartType: newItem.chartConfig?.type,
      query: newItem.query,
      refreshInterval: newItem.refreshInterval,
    });
  }, [dashboard.theme, form]);

  // 编辑仪表盘项目
  const editDashboardItem = useCallback(
    (item: DashboardItem) => {
      setEditingItem(item);
      setShowItemModal(true);
      form.reset({
        title: item.title,
        type: item.type,
        chartType: item.chartConfig?.type,
        query: item.query,
        refreshInterval: item.refreshInterval,
      });
    },
    [form]
  );

  // 删除仪表盘项目
  const deleteDashboardItem = useCallback((itemId: string) => {
    setDashboard(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
      layout: prev.layout.filter(layout => layout.i !== itemId),
    }));
  }, []);

  // 执行查询
  const executeQuery = useCallback(
    async (itemId: string, query: string) => {
      setDashboard(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.id === itemId
            ? { ...item, loading: true, error: undefined }
            : item
        ),
      }));

      try {
        const result = await safeTauriInvoke<any>('execute_query', {
          connectionId,
          database,
          query,
        });

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
                    data,
                  },
                }
              : item
          ),
        }));
      } catch (error) {
        setDashboard(prev => ({
          ...prev,
          items: prev.items.map(item =>
            item.id === itemId
              ? { ...item, loading: false, error: String(error) }
              : item
          ),
        }));
      }
    },
    [connectionId, database]
  );

  // 保存仪表盘项目
  const saveDashboardItem = useCallback(
    async (values: any) => {
      try {
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
            title: values.title,
          },
        };

        // 如果是新项目，添加到仪表盘
        if (!dashboard.items.find(item => item.id === editingItem.id)) {
          const newLayout = {
            i: editingItem.id,
            x: 0,
            y: 0,
            w: 12,
            h: 8,
            minW: 4,
            minH: 4,
          };

          setDashboard(prev => ({
            ...prev,
            items: [...prev.items, updatedItem],
            layout: [...prev.layout, newLayout],
          }));
        } else {
          // 更新现有项目
          setDashboard(prev => ({
            ...prev,
            items: prev.items.map(item =>
              item.id === editingItem.id ? updatedItem : item
            ),
          }));
        }

        // 如果有查询，执行查询获取数据
        if (values.query) {
          await executeQuery(updatedItem.id, values.query);
        }

        setShowItemModal(false);
        setEditingItem(null);
        form.reset();

        showMessage.success('项目保存成功');
      } catch (error) {
        showMessage.error('保存失败');
      }
    },
    [editingItem, dashboard.items, form, executeQuery]
  );



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
      layout,
    }));
  }, []);

  // 保存仪表盘
  const saveDashboard = useCallback(async () => {
    try {
      const updatedDashboard = {
        ...dashboard,
        updatedAt: new Date(),
      };

      await safeTauriInvoke('save_dashboard', {
        dashboard: updatedDashboard,
      });

      setDashboard(updatedDashboard);

      if (onSave) {
        onSave(updatedDashboard);
      }

      showMessage.success('仪表盘保存成功');
    } catch (error) {
      showMessage.error('保存失败');
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
      refreshInterval: dashboard.refreshInterval,
    });
  }, [dashboard, settingsForm]);

  // 保存仪表盘设置
  const saveDashboardSettings = useCallback(
    async (values: any) => {
      try {
        setDashboard(prev => ({
          ...prev,
          name: values.name,
          description: values.description,
          theme: values.theme,
          autoRefresh: values.autoRefresh,
          refreshInterval: values.refreshInterval,
        }));

        setShowSettingsModal(false);
        showMessage.success('设置保存成功');
      } catch (error) {
        showMessage.error('设置保存失败');
      }
    },
    []
  );

  // 渲染仪表盘项目
  const renderDashboardItem = useCallback(
    (item: DashboardItem) => {
      if (item.type === 'chart') {
        return (
          <div className='h-full'>
            <div className='flex justify-between items-center mb-2'>
              <Text className='font-semibold'>{item.title}</Text>
              {!readOnly && !previewMode && (
                <div className='flex gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => editDashboardItem(item)}
                        >
                          <Edit className='w-4 h-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>编辑</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Popconfirm
                    title='确定删除这个项目吗？'
                    onConfirm={() => deleteDashboardItem(item.id)}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='sm'
                          >
                            <Trash2 className='w-4 h-4 text-destructive' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>删除</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Popconfirm>
                </div>
              )}
            </div>

            {item.error ? (
              <Alert className='border-destructive'>
                <AlertDescription className='text-destructive'>
                  查询错误: {item.error}
                </AlertDescription>
              </Alert>
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
        <div className='h-full'>
          <Text>其他类型项目</Text>
        </div>
      );
    },
    [readOnly, previewMode, editDashboardItem, deleteDashboardItem]
  );

  // 渲染工具栏
  const renderToolbar = () => (
    <div className='flex justify-between items-center mb-6 p-4 bg-background border-b'>
      <div className='space-y-1'>
        <Title className='text-2xl font-bold'>{dashboard.name}</Title>
        <Text className='text-muted-foreground'>{dashboard.description}</Text>
      </div>
      <div className='flex gap-2'>
        {!readOnly && (
          <>
            <Button
              variant='outline'
              onClick={addDashboardItem}
              className='gap-2'
            >
              <Plus className='w-4 h-4' />
              添加项目
            </Button>
            <Button
              variant='outline'
              onClick={openDashboardSettings}
              className='gap-2'
            >
              <Settings className='w-4 h-4' />
              设置
            </Button>
          </>
        )}
        <Button
          variant='outline'
          onClick={() => setPreviewMode(!previewMode)}
          className='gap-2'
        >
          <Eye className='w-4 h-4' />
          {previewMode ? '编辑模式' : '预览模式'}
        </Button>
        <Button
          variant='outline'
          onClick={refreshAllItems}
          disabled={dashboard.items.some(item => item.loading)}
          className='gap-2'
        >
          <RefreshCw className='w-4 h-4' />
          刷新
        </Button>
        <Button
          onClick={saveDashboard}
          className='gap-2'
        >
          <Save className='w-4 h-4' />
          保存
        </Button>
        <Button
          variant='outline'
          onClick={() => setFullscreen(!fullscreen)}
          className='gap-2'
        >
          <Maximize className='w-4 h-4' />
          全屏
        </Button>
      </div>
    </div>
  );

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'}>
      {renderToolbar()}

      <div className='min-h-[400px] p-4'>
        <ResponsiveGridLayout
          ref={layoutRef}
          className='layout'
          layouts={{ lg: dashboard.layout }}
          breakpoints={breakpoints}
          cols={cols}
          rowHeight={30}
          onLayoutChange={handleLayoutChange}
          isDraggable={!readOnly && !previewMode}
          isResizable={!readOnly && !previewMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {dashboard.items.map(item => (
            <div key={item.id}>
              <Card className='h-full border-dashed border-2 border-border hover:border-primary transition-colors duration-200 hover:shadow-md'>
                <CardContent className='p-3 h-full'>
                  {renderDashboardItem(item)}
                </CardContent>
              </Card>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>

      {/* 添加/编辑项目弹窗 */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingItem && dashboard.items.find(i => i.id === editingItem.id)
                ? '编辑项目'
                : '添加项目'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(saveDashboardItem)} className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='title'
                  rules={{ required: '请输入项目标题' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>项目标题</FormLabel>
                      <FormControl>
                        <Input placeholder='输入项目标题' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='type'
                  rules={{ required: '请选择项目类型' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>项目类型</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='选择项目类型' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='chart'>图表</SelectItem>
                          <SelectItem value='metric'>指标</SelectItem>
                          <SelectItem value='text'>文本</SelectItem>
                          <SelectItem value='table'>表格</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='chartType'
                rules={{ required: '请选择图表类型' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>图表类型</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择图表类型' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {chartTypeOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name='query'
                rules={{ required: '请输入查询语句' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>查询语句</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder='输入 InfluxQL 查询语句'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='refreshInterval'
                rules={{ required: '请输入刷新间隔' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔 (毫秒)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='30000'
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    setShowItemModal(false);
                    setEditingItem(null);
                    form.reset();
                  }}
                >
                  取消
                </Button>
                <Button type='submit'>
                  保存
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 仪表盘设置弹窗 */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>仪表盘设置</DialogTitle>
          </DialogHeader>

          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(saveDashboardSettings)} className='space-y-4'>
              <FormField
                control={settingsForm.control}
                name='name'
                rules={{ required: '请输入仪表盘名称' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仪表盘名称</FormLabel>
                    <FormControl>
                      <Input placeholder='输入仪表盘名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={settingsForm.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder='输入仪表盘描述' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={settingsForm.control}
                  name='theme'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>主题</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='light'>浅色</SelectItem>
                          <SelectItem value='dark'>深色</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={settingsForm.control}
                  name='autoRefresh'
                  render={({ field }) => (
                    <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                      <div className='space-y-0.5'>
                        <FormLabel>自动刷新</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={settingsForm.control}
                name='refreshInterval'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔 (毫秒)</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        placeholder='30000'
                        {...field}
                        onChange={e => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setShowSettingsModal(false)}
                >
                  取消
                </Button>
                <Button type='submit'>
                  保存设置
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: hsl(var(--muted));
          opacity: 0.2;
          border-radius: 6px;
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
