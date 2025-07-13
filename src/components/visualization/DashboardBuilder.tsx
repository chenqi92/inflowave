import { useForm } from 'react-hook-form';
import React, { useState, useCallback, useRef } from 'react';
import { Button, Form, FormField, FormItem, FormLabel, FormControl, FormMessage, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Typography } from '@/components/ui';
import { Card, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { Plus, Trash2, Edit, Save, Eye, Copy, Settings, GripVertical } from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useVisualizationStore } from '@/store/visualization';
import { InteractiveChart } from './InteractiveChart';
import { ChartBuilder } from './ChartBuilder';
import type { Dashboard, ChartConfig, QueryResult } from '@/types';

interface DashboardBuilderProps {
  dashboard?: Dashboard;
  onSave?: (dashboard: Dashboard) => void;
  onPreview?: (dashboard: Dashboard) => void;
  charts?: ChartConfig[];
  chartData?: Record<string, QueryResult>;
  className?: string;
}

interface GridItem {
  id: string;
  chartId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboard,
  onSave,
  onPreview,
  charts = [],
  chartData = {},
  className}) => {
  const [currentDashboard, setCurrentDashboard] = useState<Partial<Dashboard>>(
    dashboard || {
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
        gridSize: 12}}
  );

  const [gridItems, setGridItems] = useState<GridItem[]>(
    dashboard?.layout || []
  );
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<GridItem | null>(null);

  const { createDashboard, updateDashboard, getCharts } = useVisualizationStore();
  const form = useForm();

  // 网格布局配置
  const gridConfig = {
    cols: currentDashboard.settings?.gridSize || 12,
    rowHeight: 100,
    margin: [16, 16]};

  const handleAddChart = (chartId: string) => {
    const newItem: GridItem = {
      id: `item_${Date.now()}`,
      chartId,
      x: 0,
      y: getNextAvailablePosition().y,
      w: 6,
      h: 3};

    setGridItems([...gridItems, newItem]);
    setShowChartModal(false);
  };

  const handleRemoveChart = (itemId: string) => {
    setGridItems(gridItems.filter(item => item.id !== itemId));
  };

  const handleResizeChart = (itemId: string, w: number, h: number) => {
    setGridItems(gridItems.map(item => 
      item.id === itemId ? { ...item, w, h } : item
    ));
  };

  const handleMoveChart = (itemId: string, x: number, y: number) => {
    setGridItems(gridItems.map(item => 
      item.id === itemId ? { ...item, x, y } : item
    ));
  };

  const getNextAvailablePosition = () => {
    if (gridItems.length === 0) return { x: 0, y: 0 };

    const maxY = Math.max(...gridItems.map(item => item.y + item.h));
    return { x: 0, y: maxY };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = gridItems.findIndex(item => item.id === active.id);
      const newIndex = gridItems.findIndex(item => item.id === over.id);
      
      setGridItems(arrayMove(gridItems, oldIndex, newIndex));
    }
    
    setDraggedItem(null);
  };

  const handleSaveDashboard = async () => {
    try {
      const values = await form.validateFields();
      const dashboardData: Dashboard = {
        ...currentDashboard,
        ...values,
        id: currentDashboard.id || `dashboard_${Date.now()}`,
        layout: gridItems,
        updatedAt: new Date()} as Dashboard;

      if (currentDashboard.id) {
        await updateDashboard(dashboardData);
      } else {
        await createDashboard(dashboardData);
      }

      setCurrentDashboard(dashboardData);
      onSave?.(dashboardData);
    } catch (error) {
      console.error('保存仪表板失败:', error);
    }
  };

  const handlePreviewDashboard = () => {
    const previewData: Dashboard = {
      ...currentDashboard,
      layout: gridItems} as Dashboard;
    
    onPreview?.(previewData);
    setIsEditMode(false);
  };

  const renderGridItem = (item: GridItem) => {
    const chart = charts.find(c => c.id === item.chartId);
    const data = chartData[item.chartId];

    if (!chart) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted border-2 border-dashed border-gray-300 rounded">
          <div className="text-center text-muted-foreground">
            <div>图表不存在</div>
            <div className="text-sm">Chart ID: {item.chartId}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full group">
        {isEditMode && (
          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedChart(chart.id)}
                    >
                      <Edit className="w-4 h-4" />
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
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveChart(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
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
            height="100%"
            allowEdit={isEditMode}
            autoRefresh={currentDashboard.settings?.autoRefresh}
            refreshInterval={(currentDashboard.settings?.refreshInterval || 30) * 1000}
          />
        ) : (
          <Card className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <div className="text-2xl mb-2">📊</div>
              <Typography.Text className="text-sm">暂无数据</Typography.Text>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const DraggableGridItem: React.FC<{ item: GridItem }> = ({ item }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging} = useDraggable({
      id: item.id,
      data: item});

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.5 : 1};

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`grid-item ${isDragging ? 'dragging' : ''}`}
        {...attributes}
        {...listeners}>
        {isEditMode && (
          <div className="absolute top-0 left-0 z-10 cursor-move">
            <GripVertical className="text-gray-400 hover:text-muted-foreground" />
          </div>
        )}
        {renderGridItem(item)}
      </div>
    );
  };

  const DroppableGrid: React.FC = () => {
    const { setNodeRef } = useDroppable({
      id: 'dashboard-grid'});

    return (
      <div ref={setNodeRef} className="dashboard-grid min-h-96 p-4 border-2 border-dashed border rounded-lg">
        {gridItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <div className="text-4xl mb-4">📊</div>
            <Typography.Text className="text-center">暂无图表，点击添加图表开始构建仪表板</Typography.Text>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)` }}>
            {gridItems.map(item => (
              <div
                key={item.id}
                className="grid-item"
                style={{
                  gridColumn: `span ${item.w}`,
                  gridRow: `span ${item.h}`,
                  minHeight: item.h * gridConfig.rowHeight}}>
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
      <Card
        title={
          <div className="flex gap-2">
            <LayoutOutlined />
            <span>{isEditMode ? '编辑仪表板' : '预览仪表板'}</span>
            <span className="text-sm text-muted-foreground">
              ({gridItems.length} 个图表)
            </span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            {isEditMode ? (
              <>
                <Button
                  icon={<Plus className="w-4 h-4"  />}
                  onClick={() => setShowChartModal(true)}
                  disabled={charts.length === 0}>
                  添加图表
                </Button>

                <Tooltip title="仪表板设置">
                  <Button
                    icon={<Settings className="w-4 h-4"  />}
                    onClick={() => setShowSettingsModal(true)}
                  />
                </Tooltip>

                <Button
                  icon={<Eye className="w-4 h-4"  />}
                  onClick={handlePreviewDashboard}>
                  预览
                </Button>

                <Button
                  type="primary"
                  icon={<Save className="w-4 h-4"  />}
                  onClick={handleSaveDashboard}>
                  保存仪表板
                </Button>
              </>
            ) : (
              <Button
                icon={<Edit className="w-4 h-4"  />}
                onClick={() => setIsEditMode(true)}>
                编辑模式
              </Button>
            )}
          </div>
        }
        className="flex-shrink-0">
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={gridItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <DroppableGrid />
          </SortableContext>
          
          <DragOverlay>
            {draggedItem ? renderGridItem(draggedItem) : null}
          </DragOverlay>
        </DndContext>
      </Card>

      {/* 添加图表模态框 */}
      <Dialog
        title="添加图表"
        open={showChartModal}
        onOpenChange={(open) => !open && (() => setShowChartModal(false))()}
        footer={null}
        width={800}>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">选择一个已创建的图表添加到仪表板</div>
          
          {charts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <div className="text-2xl mb-2">📈</div>
              <Typography.Text className="text-sm">暂无可用图表，请先创建图表</Typography.Text>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {charts.map(chart => (
                <Card
                  key={chart.id}
                  size="small"
                  hoverable
                  onClick={() => handleAddChart(chart.id)}
                  className="cursor-pointer hover:border-blue-500">
                  <div className="text-center">
                    <div className="font-medium">{chart.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {chart.type} · {chart.xAxis?.field} / {chart.yAxis?.field}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* 仪表板设置模态框 */}
      <Dialog
        title="仪表板设置"
        open={showSettingsModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowSettingsModal(false);
          }
        }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={currentDashboard}>
          <FormItem name="name"
            label="仪表板名称"
            rules={[{ required: true, message: '请输入仪表板名称' }]}>
            <Input placeholder="输入仪表板名称" />
          </FormItem>

          <FormItem name="description" label="描述">
            <Textarea rows={3} placeholder="输入仪表板描述" />
          </FormItem>

          <FormItem name={['settings', 'theme']} label="主题">
            <Select>
              <Select.Option value="default">默认</Select.Option>
              <Select.Option value="dark">深色</Select.Option>
              <Select.Option value="light">浅色</Select.Option>
            </Select>
          </FormItem>

          <FormItem name={['settings', 'gridSize']} label="网格列数">
            <Select>
              <Select.Option value={8}>8 列</Select.Option>
              <Select.Option value={12}>12 列</Select.Option>
              <Select.Option value={16}>16 列</Select.Option>
              <Select.Option value={24}>24 列</Select.Option>
            </Select>
          </FormItem>

          <FormItem name={['settings', 'refreshInterval']} label="刷新间隔（秒）">
            <Select>
              <Select.Option value={10}>10 秒</Select.Option>
              <Select.Option value={30}>30 秒</Select.Option>
              <Select.Option value={60}>1 分钟</Select.Option>
              <Select.Option value={300}>5 分钟</Select.Option>
              <Select.Option value={600}>10 分钟</Select.Option>
            </Select>
          </FormItem>
        </Form>
      </Dialog>
    </div>
  );
};