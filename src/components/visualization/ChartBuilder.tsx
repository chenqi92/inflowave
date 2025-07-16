import { useForm } from 'react-hook-form';
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Switch,
  Slider,
  Input,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import type { ChartConfig as ShadcnChartConfig } from '@/components/ui';
import {
  BarChart,
  TrendingUp,
  PieChart,
  AreaChart,
  Settings,
  Save,
  Eye,
  Copy,
  ScatterChart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useVisualizationStore } from '@/store/visualization';
import type { QueryResult, FieldInfo } from '@/types';

// ChartBuilder 专用的配置接口
interface ChartBuilderConfig {
  id?: string;
  title: string;
  type: 'line' | 'bar' | 'scatter' | 'area' | 'pie';
  xField: string;
  yField: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'max' | 'min' | 'count';
  showLegend?: boolean;
  showGrid?: boolean;
  smooth?: boolean;
  stacked?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  settings?: {
    showGrid?: boolean;
    showLegend?: boolean;
    showTooltip?: boolean;
    animation?: boolean;
    smooth?: boolean;
    stack?: boolean;
    showDataLabels?: boolean;
    theme?: string;
    colors?: string[];
    opacity?: number;
  };
  xAxis?: {
    field: string;
    type: 'time' | 'category' | 'value';
  };
  yAxis?: {
    field: string;
    type: 'value' | 'category';
  };
}

interface ChartBuilderProps {
  queryResult?: QueryResult;
  fields?: FieldInfo[];
  onChartCreate?: (chart: ChartBuilderConfig) => void;
  onChartUpdate?: (chart: ChartBuilderConfig) => void;
  initialChart?: ChartBuilderConfig;
  className?: string;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  queryResult,
  fields = [],
  onChartCreate,
  onChartUpdate,
  initialChart,
  className,
}) => {
  const form = useForm<ChartBuilderConfig>({
    defaultValues: {
      title: initialChart?.title || '',
      type: initialChart?.type || 'line',
      xField: initialChart?.xField || initialChart?.xAxis?.field || '',
      yField: initialChart?.yField || initialChart?.yAxis?.field || '',
      groupBy: initialChart?.groupBy || '',
      settings: initialChart?.settings || {},
    },
  });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [chartConfig, setChartConfig] = useState<Partial<ChartBuilderConfig>>(
    initialChart || {
      type: 'line',
      title: '未命名图表',
      xField: '',
      yField: '',
      xAxis: { field: '', type: 'time' },
      yAxis: { field: '', type: 'value' },
      settings: {
        showGrid: true,
        showLegend: true,
        showTooltip: true,
        animation: true,
        smooth: false,
        stack: false,
        showDataLabels: false,
        theme: 'default',
        colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'],
      },
    }
  );

  const { createChart, updateChart } = useVisualizationStore();

  // 可用字段选项
  const fieldOptions = useMemo(() => {
    return fields.map(field => ({
      label: `${field.name} (${field.type})`,
      value: field.name,
      type: field.type,
    }));
  }, [fields]);

  // 数值字段选项（用于Y轴）
  const numericFieldOptions = useMemo(() => {
    return fields
      .filter(field => ['integer', 'float', 'number'].includes(field.type))
      .map(field => ({
        label: `${field.name} (${field.type})`,
        value: field.name,
        type: field.type,
      }));
  }, [fields]);

  // 时间字段选项（用于X轴）
  const timeFieldOptions = useMemo(() => {
    return fields
      .filter(field => field.name.toLowerCase().includes('time') || field.name.toLowerCase().includes('date'))
      .map(field => ({
        label: `${field.name} (${field.type})`,
        value: field.name,
        type: field.type,
      }));
  }, [fields]);

  // 图表类型选项
  const chartTypes = [
    {
      label: '折线图',
      value: 'line',
      icon: <TrendingUp className='w-4 h-4' />,
    },
    { label: '柱状图', value: 'bar', icon: <BarChart className='w-4 h-4' /> },
    { label: '面积图', value: 'area', icon: <AreaChart className='w-4 h-4' /> },
    {
      label: '散点图',
      value: 'scatter',
      icon: <ScatterChart className='w-4 h-4' />,
    },
    { label: '饼图', value: 'pie', icon: <PieChart className='w-4 h-4' /> },
  ];

  useEffect(() => {
    if (initialChart) {
      setChartConfig(initialChart);
      // Set form values with shadcn form
      Object.keys(initialChart).forEach(key => {
        if (key in initialChart) {
          form.setValue(
            key as keyof ChartBuilderConfig,
            initialChart[key as keyof ChartBuilderConfig]
          );
        }
      });
    }
  }, [initialChart, form]);

  const handleFieldChange = (field: string, value: any) => {
    const newConfig = { ...chartConfig, [field]: value };
    setChartConfig(newConfig);
  };

  const handleSettingsChange = (setting: string, value: any) => {
    const newConfig = {
      ...chartConfig,
      settings: {
        ...chartConfig.settings,
        [setting]: value,
      },
    };
    setChartConfig(newConfig);
  };

  const handleSaveChart = async () => {
    try {
      const values = form.getValues();
      const finalConfig: ChartBuilderConfig = {
        ...chartConfig,
        ...values,
        id: chartConfig.id || `chart_${Date.now()}`,
        createdAt: chartConfig.createdAt || new Date(),
        updatedAt: new Date(),
      } as ChartBuilderConfig;

      if (chartConfig.id) {
        updateChart(chartConfig.id, finalConfig as any);
        onChartUpdate?.(finalConfig);
      } else {
        const chartId = createChart(finalConfig as any);
        finalConfig.id = chartId;
        onChartCreate?.(finalConfig);
      }

      setChartConfig(finalConfig);
    } catch (error) {
      console.error('保存图表失败:', error);
    }
  };

  const handlePreview = () => {
    setPreviewMode(!previewMode);
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(chartConfig, null, 2));
      // TODO: 显示成功提示
    } catch (error) {
      console.error('复制配置失败:', error);
    }
  };

  const renderChartTypeSelector = () => (
    <div className='grid grid-cols-5 gap-2 mb-4'>
      {chartTypes.map(type => (
        <Button
          key={type.value}
          variant={chartConfig.type === type.value ? 'default' : 'outline'}
          onClick={() => handleFieldChange('type', type.value)}
          className='h-16 flex flex-col items-center justify-center'
        >
          {type.icon}
          <div className='text-xs mt-1'>{type.label}</div>
        </Button>
      ))}
    </div>
  );

  const renderBasicSettings = () => (
    <div className='space-y-4'>
      <FormField
        control={form.control}
        name='title'
        render={({ field }) => (
          <FormItem>
            <FormLabel>图表标题</FormLabel>
            <FormControl>
              <Input
                placeholder='输入图表标题'
                {...field}
                onChange={e => {
                  field.onChange(e);
                  handleFieldChange('title', e.target.value);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className='grid grid-cols-2 gap-4'>
        <FormField
          control={form.control}
          name='xField'
          render={({ field }) => (
            <FormItem>
              <FormLabel>X轴字段</FormLabel>
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  handleFieldChange('xAxis', {
                    ...chartConfig.xAxis,
                    field: value,
                  });
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择X轴字段' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(chartConfig.type === 'pie'
                    ? fieldOptions
                    : timeFieldOptions
                  ).map(option => (
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
          name='yField'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Y轴字段</FormLabel>
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  handleFieldChange('yAxis', {
                    ...chartConfig.yAxis,
                    field: value,
                  });
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择Y轴字段' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {numericFieldOptions.map(option => (
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
      </div>

      {chartConfig.type !== 'pie' && (
        <FormField
          control={form.control}
          name='groupBy'
          render={({ field }) => (
            <FormItem>
              <FormLabel>分组字段（可选）</FormLabel>
              <Select
                value={field.value}
                onValueChange={value => {
                  field.onChange(value);
                  handleFieldChange('groupBy', value);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='选择分组字段' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fieldOptions.map(option => (
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
      )}
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label className='text-sm font-medium'>显示网格</Label>
          <Switch
            checked={chartConfig.settings?.showGrid}
            onCheckedChange={checked => handleSettingsChange('showGrid', checked)}
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-sm font-medium'>显示图例</Label>
          <Switch
            checked={chartConfig.settings?.showLegend}
            onCheckedChange={checked =>
              handleSettingsChange('showLegend', checked)
            }
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-sm font-medium'>显示提示框</Label>
          <Switch
            checked={chartConfig.settings?.showTooltip}
            onCheckedChange={checked =>
              handleSettingsChange('showTooltip', checked)
            }
          />
        </div>

        <div className='space-y-2'>
          <Label className='text-sm font-medium'>启用动画</Label>
          <Switch
            checked={chartConfig.settings?.animation}
            onCheckedChange={checked =>
              handleSettingsChange('animation', checked)
            }
          />
        </div>
      </div>

      {['line', 'area'].includes(chartConfig.type!) && (
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label className='text-sm font-medium'>平滑曲线</Label>
            <Switch
              checked={chartConfig.settings?.smooth}
              onCheckedChange={checked => handleSettingsChange('smooth', checked)}
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-sm font-medium'>堆叠显示</Label>
            <Switch
              checked={chartConfig.settings?.stack}
              onCheckedChange={checked => handleSettingsChange('stack', checked)}
            />
          </div>
        </div>
      )}

      <div className='space-y-2'>
        <Label className='text-sm font-medium'>显示数据标签</Label>
        <Switch
          checked={chartConfig.settings?.showDataLabels}
          onCheckedChange={checked =>
            handleSettingsChange('showDataLabels', checked)
          }
        />
      </div>

      <div className='space-y-2'>
        <Label className='text-sm font-medium'>透明度</Label>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={[chartConfig.settings?.opacity || 1]}
          onValueChange={value => handleSettingsChange('opacity', value[0])}
          className='w-full'
        />
        <div className='flex justify-between text-xs text-muted-foreground'>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div className='space-y-2'>
        <Label className='text-sm font-medium'>主题</Label>
        <Select
          value={chartConfig.settings?.theme || 'default'}
          onValueChange={value => handleSettingsChange('theme', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder='选择主题' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='default'>默认</SelectItem>
            <SelectItem value='dark'>深色</SelectItem>
            <SelectItem value='minimal'>简约</SelectItem>
            <SelectItem value='business'>商务</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // 生成预览图表数据
  const generatePreviewData = () => {
    if (
      !queryResult?.results?.[0]?.series?.[0]?.values ||
      !chartConfig.xField ||
      !chartConfig.yField
    ) {
      return [];
    }

    const series = queryResult.results[0].series![0];
    const xIndex = series.columns.indexOf(chartConfig.xField);
    const yIndex = series.columns.indexOf(chartConfig.yField);

    if (xIndex === -1 || yIndex === -1) {
      return [];
    }

    return series.values.slice(0, 10).map((row: any) => ({
      x: row[xIndex],
      y: row[yIndex],
      name: row[xIndex],
      value: row[yIndex],
    }));
  };

  // 渲染预览图表
  const renderPreviewChart = () => {
    const data = generatePreviewData();
    const chartConfigForShadcn: ShadcnChartConfig = {
      [chartConfig.yAxis?.field || 'value']: {
        label: chartConfig.yAxis?.field || 'Value',
        color: chartConfig.settings?.colors?.[0] || '#1890ff',
      },
    };

    if (!data.length) {
      return (
        <div className='flex items-center justify-center h-64 text-muted-foreground'>
          <div className='text-center'>
            <BarChart className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <div>暂无数据预览</div>
          </div>
        </div>
      );
    }

    // 根据图表类型渲染对应的图表组件
    const renderChart = () => {
      const commonProps = {
        data,
        children: [
          <CartesianGrid key="grid" strokeDasharray='3 3' />,
          <XAxis key="xaxis" dataKey='x' />,
          <YAxis key="yaxis" />,
          <ChartTooltip key="tooltip" content={<ChartTooltipContent />} />,
        ],
      };

      switch (chartConfig.type) {
        case 'line':
          return (
            <LineChart {...commonProps}>
              {commonProps.children}
              <Line
                type='monotone'
                dataKey='y'
                stroke={chartConfig.settings?.colors?.[0] || '#1890ff'}
                strokeWidth={2}
              />
            </LineChart>
          );
        case 'bar':
          return (
            <RechartsBarChart {...commonProps}>
              {commonProps.children}
              <Bar
                dataKey='y'
                fill={chartConfig.settings?.colors?.[0] || '#1890ff'}
              />
            </RechartsBarChart>
          );
        case 'area':
          return (
            <RechartsAreaChart {...commonProps}>
              {commonProps.children}
              <Area
                type='monotone'
                dataKey='y'
                stroke={chartConfig.settings?.colors?.[0] || '#1890ff'}
                fill={chartConfig.settings?.colors?.[0] || '#1890ff'}
                fillOpacity={0.6}
              />
            </RechartsAreaChart>
          );
        default:
          return (
            <LineChart {...commonProps}>
              {commonProps.children}
              <Line
                type='monotone'
                dataKey='y'
                stroke={chartConfig.settings?.colors?.[0] || '#1890ff'}
                strokeWidth={2}
              />
            </LineChart>
          );
      }
    };

    return (
      <ChartContainer config={chartConfigForShadcn} className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          {renderChart()}
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  return (
    <TooltipProvider>
      <div className={`h-full ${className}`}>
        <Card className='h-full'>
        <CardHeader className='pb-4'>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <BarChart className='w-5 h-5' />
              <span>图表构建器</span>
              {queryResult && (
                <span className='text-sm text-muted-foreground font-normal'>
                  数据源: {queryResult.rowCount} 行
                </span>
              )}
            </CardTitle>
            <div className='flex gap-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handlePreview}
                    variant={previewMode ? 'default' : 'outline'}
                    size='icon'
                  >
                    <Eye className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>预览图表</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setSettingsVisible(true)}
                    variant='outline'
                    size='icon'
                  >
                    <Settings className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>高级设置</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCopyConfig}
                    variant='outline'
                    size='icon'
                  >
                    <Copy className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>复制配置</TooltipContent>
              </Tooltip>

              <Button
                onClick={handleSaveChart}
                disabled={
                  !chartConfig.title ||
                  !chartConfig.xField ||
                  !chartConfig.yField
                }
              >
                <Save className='w-4 h-4 mr-2' />
                保存图表
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='h-full flex flex-col'>
          <Form {...form}>
            <form className='space-y-6 flex-shrink-0'>
              {/* 图表类型选择 */}
              {renderChartTypeSelector()}

              {/* 基础设置 */}
              {renderBasicSettings()}
            </form>
          </Form>

          {/* 预览区域 */}
          {previewMode && (
            <div className='flex-1 mt-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>图表预览</CardTitle>
                  <div className='text-sm text-muted-foreground'>
                    类型:{' '}
                    {chartTypes.find(t => t.value === chartConfig.type)?.label}{' '}
                    | X轴: {chartConfig.xAxis?.field} | Y轴:{' '}
                    {chartConfig.yAxis?.field}
                  </div>
                </CardHeader>
                <CardContent>{renderPreviewChart()}</CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 高级设置抽屉 */}
      <Sheet open={settingsVisible} onOpenChange={setSettingsVisible}>
        <SheetContent className='w-[400px] sm:w-[540px]'>
          <SheetHeader>
            <SheetTitle>高级设置</SheetTitle>
            <SheetDescription>
              配置图表的高级显示选项和样式设置
            </SheetDescription>
          </SheetHeader>
          <div className='mt-6'>{renderAdvancedSettings()}</div>
        </SheetContent>
      </Sheet>
      </div>
    </TooltipProvider>
  );
};
