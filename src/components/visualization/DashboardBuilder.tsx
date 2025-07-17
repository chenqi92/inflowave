import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
} from '@/components/ui';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  Eye,
  Settings,
  GripVertical,
  LayoutGrid,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useVisualizationStore } from '@/store/visualization';
import { InteractiveChart } from './InteractiveChart';
import type { Dashboard, ChartConfig, QueryResult, GridItem } from '@/types';

interface DashboardBuilderProps {
  dashboard?: Dashboard;
  onSave?: (dashboard: Dashboard) => void;
  onPreview?: (dashboard: Dashboard) => void;
  charts?: ChartConfig[];
  chartData?: Record<string, QueryResult>;
  className?: string;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  onSave,
  onPreview,
  charts = [],
  chartData = {},
  className,
}) => {
  const [currentDashboard, setCurrentDashboard] = useState<Dashboard>(() => {
    if (dashboard) {
      return dashboard;
    }
    return {
      id: '',
      name: '新仪表板',
      description: '',
      layout: [],
      settings: {
        theme: 'default',
        refreshInterval: 30,
        autoRefresh: false,
        showHeader: true,
        showGrid: true,
        gridSize: 12,
      },
    };
  });

  const [gridItems, setGridItems] = useState<GridItem[]>(() => {
    return dashboard?.layout || [];
  });
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<GridItem | null>(null);

  const { createDashboard, updateDashboard } = useVisualizationStore();

  // 清理selectedChart状态
  React.useEffect(() => {
    if (selectedChart) {
      // TODO: 实现图表编辑逻辑
      // console.log('当前选中的图表:', selectedChart);
    }
  }, [selectedChart]);

  const form = useForm({
    defaultValues: {
      name: currentDashboard.name,
      description: currentDashboard.description || '',
      settings: {
        theme: currentDashboard.settings?.theme || 'default',
        gridSize: currentDashboard.settings?.gridSize || 12,
        refreshInterval: currentDashboard.settings?.refreshInterval || 30,
        autoRefresh: currentDashboard.settings?.autoRefresh || false,
        showHeader: currentDashboard.settings?.showHeader !== false,
        showGrid: currentDashboard.settings?.showGrid !== false,
      },
    },
  });

  // 网格布局配置
  const gridConfig = {
    cols: currentDashboard.settings?.gridSize || 12,
    rowHeight: 100,
    margin: [16, 16],
  };

  const handleAddChart = (chartId: string) => {
    const newItem: GridItem = {
      chartId,
      x: 0,
      y: getNextAvailablePosition().y,
      w: 6,
      h: 3,
    };

    setGridItems([...gridItems, newItem]);
    setShowChartModal(false);
  };

  const handleRemoveChart = (chartId: string) => {
    setGridItems(gridItems.filter(item => item.chartId !== chartId));
  };

  // 这些函数暂时保留，可能在未来的拖拽调整功能中使用
  // const handleResizeChart = (chartId: string, w: number, h: number) => {
  //   setGridItems(
  //     gridItems.map(item => (item.chartId === chartId ? { ...item, w, h } : item))
  //   );
  // };

  // const handleMoveChart = (chartId: string, x: number, y: number) => {
  //   setGridItems(
  //     gridItems.map(item => (item.chartId === chartId ? { ...item, x, y } : item))
  //   );
  // };

  const getNextAvailablePosition = () => {
    if (gridItems.length === 0) return { x: 0, y: 0 };

    const maxY = Math.max(...gridItems.map(item => item.y + item.h));
    return { x: 0, y: maxY };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = gridItems.findIndex(item => item.chartId === active.id);
      const newIndex = gridItems.findIndex(item => item.chartId === over.id);

      setGridItems(arrayMove(gridItems, oldIndex, newIndex));
    }

    setDraggedItem(null);
  };

  const handleSaveDashboard = form.handleSubmit(async (values) => {
    try {
      const dashboardData: Dashboard = {
        ...currentDashboard,
        name: values.name,
        description: values.description,
        layout: gridItems,
        settings: {
          ...currentDashboard.settings,
          ...values.settings,
        },
        updatedAt: new Date(),
      };

      // 确保有ID
      if (!dashboardData.id) {
        dashboardData.id = `dashboard_${Date.now()}`;
        dashboardData.createdAt = new Date();
      }

      if (currentDashboard.id) {
        updateDashboard(currentDashboard.id, {
          name: dashboardData.name,
          description: dashboardData.description,
          layout: dashboardData.layout,
          settings: dashboardData.settings,
        });
      } else {
        createDashboard({
          name: dashboardData.name,
          description: dashboardData.description || '',
          layout: dashboardData.layout || [],
          settings: dashboardData.settings,
          widgets: dashboardData.widgets || [],
        });
      }

      setCurrentDashboard(dashboardData);
      onSave?.(dashboardData);
    } catch (error) {
      console.error('保存仪表板失败:', error);
    }
  });

  const handlePreviewDashboard = () => {
    const previewData: Dashboard = {
      ...currentDashboard,
      layout: gridItems,
    };

    onPreview?.(previewData);
    setIsEditMode(false);
  };

  const renderGridItem = (item: GridItem) => {
    const chart = charts.find(c => c.id === item.chartId);
    const data = chartData[item.chartId];

    if (!chart) {
      return (
        <div className='w-full h-full flex items-center justify-center bg-muted border-2 border-dashed border-gray-300 rounded'>
          <div className='text-center text-muted-foreground'>
            <div>图表不存在</div>
            <div className='text-sm'>Chart ID: {item.chartId}</div>
          </div>
        </div>
      );
    }

    return (
      <div className='relative w-full h-full group'>
        {isEditMode && (
          <div className='absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity'>
            <div className='flex gap-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => {
                        setSelectedChart(chart.id);
                        // TODO: 实现图表编辑功能
                        // console.log('编辑图表:', chart.id);
                      }}
                    >
                      <Edit className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>编辑图表</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => handleRemoveChart(item.chartId)}
                    >
                      <Trash2 className='w-4 h-4 text-destructive' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>删除图表</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {data ? (
          <InteractiveChart
            config={chart}
            data={data}
            height='100%'
            allowEdit={isEditMode}
            autoRefresh={currentDashboard.settings?.autoRefresh}
            refreshInterval={
              (currentDashboard.settings?.refreshInterval || 30) * 1000
            }
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <div className='flex flex-col items-center justify-center text-muted-foreground'>
              <div className='text-2xl mb-2'>📊</div>
              <Text className='text-sm'>暂无数据</Text>
            </div>
          </div>
        )}
      </div>
    );
  };

  const DraggableGridItem: React.FC<{ item: GridItem }> = ({ item }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
      useDraggable({
        id: item.chartId,
        data: item,
      });

    // 当开始拖拽时设置draggedItem
    React.useEffect(() => {
      if (isDragging) {
        setDraggedItem(item);
      }
    }, [isDragging, item]);

    const style = {
      transform: transform
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`grid-item ${isDragging ? 'dragging' : ''}`}
        {...attributes}
        {...listeners}
      >
        {isEditMode && (
          <div className='absolute top-0 left-0 z-10 cursor-move'>
            <GripVertical className='text-gray-400 hover:text-muted-foreground' />
          </div>
        )}
        {renderGridItem(item)}
      </div>
    );
  };

  const DroppableGrid: React.FC = () => {
    const { setNodeRef } = useDroppable({
      id: 'dashboard-grid',
    });

    return (
      <div
        ref={setNodeRef}
        className='dashboard-grid min-h-96 p-4 border-2 border-dashed border rounded-lg'
      >
        {gridItems.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-64 text-muted-foreground'>
            <div className='text-4xl mb-4'>📊</div>
            <Text className='text-center'>
              暂无图表，点击添加图表开始构建仪表板
            </Text>
          </div>
        ) : (
          <div
            className='grid gap-4'
            style={{ gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)` }}
          >
            {gridItems.map(item => (
              <div
                key={item.chartId}
                className='grid-item'
                style={{
                  gridColumn: `span ${item.w}`,
                  gridRow: `span ${item.h}`,
                  minHeight: item.h * gridConfig.rowHeight,
                }}
              >
                <DraggableGridItem item={item} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col ${className}`}>
      <Card className='flex-shrink-0'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <CardTitle className='flex items-center gap-2'>
            <LayoutGrid className='w-5 h-5' />
            <span>{isEditMode ? '编辑仪表板' : '预览仪表板'}</span>
            <span className='text-sm text-muted-foreground font-normal'>
              ({gridItems.length} 个图表)
            </span>
          </CardTitle>

          <div className='flex gap-2'>
            {isEditMode ? (
              <>
                <Button
                  variant='outline'
                  onClick={() => setShowChartModal(true)}
                  disabled={charts.length === 0}
                  className='gap-2'
                >
                  <Plus className='w-4 h-4' />
                  添加图表
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='outline'
                        size='icon'
                        onClick={() => setShowSettingsModal(true)}
                      >
                        <Settings className='w-4 h-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>仪表板设置</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Button
                  variant='outline'
                  onClick={handlePreviewDashboard}
                  className='gap-2'
                >
                  <Eye className='w-4 h-4' />
                  预览
                </Button>

                <Button
                  onClick={handleSaveDashboard}
                  className='gap-2'
                >
                  <Save className='w-4 h-4' />
                  保存仪表板
                </Button>
              </>
            ) : (
              <Button
                variant='outline'
                onClick={() => setIsEditMode(true)}
                className='gap-2'
              >
                <Edit className='w-4 h-4' />
                编辑模式
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <div className='flex-1 p-4'>
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext
            items={gridItems.map(item => item.chartId)}
            strategy={verticalListSortingStrategy}
          >
            <DroppableGrid />
          </SortableContext>

          <DragOverlay>
            {draggedItem ? renderGridItem(draggedItem) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* 添加图表模态框 */}
      <Dialog open={showChartModal} onOpenChange={setShowChartModal}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>添加图表</DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <Text className='text-sm text-muted-foreground'>
              选择一个已创建的图表添加到仪表板
            </Text>

            {charts.length === 0 ? (
              <div className='flex flex-col items-center justify-center py-8 text-muted-foreground'>
                <div className='text-2xl mb-2'>📈</div>
                <Text className='text-sm'>
                  暂无可用图表，请先创建图表
                </Text>
              </div>
            ) : (
              <div className='grid grid-cols-2 gap-4'>
                {charts.map(chart => (
                  <Card
                    key={chart.id}
                    onClick={() => handleAddChart(chart.id)}
                    className='cursor-pointer hover:border-primary hover:shadow-md transition-all'
                  >
                    <CardContent className='p-4 text-center'>
                      <div className='font-medium'>{chart.title}</div>
                      <Text className='text-xs text-muted-foreground mt-1'>
                        {chart.type} · {chart.xAxis?.field} / {chart.yAxis?.field}
                      </Text>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 仪表板设置模态框 */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>仪表板设置</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSaveDashboard} className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                rules={{ required: '请输入仪表板名称' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>仪表板名称</FormLabel>
                    <FormControl>
                      <Input placeholder='输入仪表板名称' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder='输入仪表板描述' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='settings.theme'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主题</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择主题' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='default'>默认</SelectItem>
                        <SelectItem value='dark'>深色</SelectItem>
                        <SelectItem value='light'>浅色</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='settings.gridSize'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>网格列数</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择网格列数' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='8'>8 列</SelectItem>
                        <SelectItem value='12'>12 列</SelectItem>
                        <SelectItem value='16'>16 列</SelectItem>
                        <SelectItem value='24'>24 列</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='settings.refreshInterval'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>刷新间隔（秒）</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='选择刷新间隔' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='10'>10 秒</SelectItem>
                        <SelectItem value='30'>30 秒</SelectItem>
                        <SelectItem value='60'>1 分钟</SelectItem>
                        <SelectItem value='300'>5 分钟</SelectItem>
                        <SelectItem value='600'>10 分钟</SelectItem>
                      </SelectContent>
                    </Select>
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
    </div>
  );
};
