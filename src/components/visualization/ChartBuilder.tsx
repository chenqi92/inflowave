import React, { useState, useEffect, useMemo } from 'react';
import { Button, Select, Form, Tooltip, Switch, Slider, Input, Sheet } from '@/components/ui';
import { Card, Space, ColorPicker } from '@/components/ui';

import { ScatterChartOutlined } from '@/components/ui';
import { BarChart, TrendingUp, PieChart, AreaChart, Settings, Save, Eye, Copy, PlayCircle } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { useVisualizationStore } from '@/store/visualization';
import { FormatUtils } from '@/utils/format';
import type { ChartConfig, QueryResult, FieldInfo } from '@/types';

interface ChartBuilderProps {
  queryResult?: QueryResult;
  fields?: FieldInfo[];
  onChartCreate?: (chart: ChartConfig) => void;
  onChartUpdate?: (chart: ChartConfig) => void;
  initialChart?: ChartConfig;
  className?: string;
}

export const ChartBuilder: React.FC<ChartBuilderProps> = ({
  queryResult,
  fields = [],
  onChartCreate,
  onChartUpdate,
  initialChart,
  className}) => {
  const [form] = Form.useForm();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [chartConfig, setChartConfig] = useState<Partial<ChartConfig>>(
    initialChart || {
      type: 'line',
      title: '未命名图表',
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
        colors: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1']}}
  );

  const { createChart, updateChart } = useVisualizationStore();

  // 可用字段选项
  const fieldOptions = useMemo(() => {
    return fields.map(field => ({
      label: `${field.name} (${field.type})`,
      value: field.name,
      type: field.type}));
  }, [fields]);

  // 数值字段选项（用于Y轴）
  const numericFieldOptions = useMemo(() => {
    return fields
      .filter(field => ['integer', 'float', 'number'].includes(field.type))
      .map(field => ({
        label: `${field.name} (${field.type})`,
        value: field.name,
        type: field.type}));
  }, [fields]);

  // 时间字段选项（用于X轴）
  const timeFieldOptions = useMemo(() => {
    return fields
      .filter(field => field.type === 'time' || field.name === 'time')
      .map(field => ({
        label: `${field.name} (${field.type})`,
        value: field.name,
        type: field.type}));
  }, [fields]);

  // 图表类型选项
  const chartTypes = [
    { label: '折线图', value: 'line', icon: <TrendingUp className="w-4 h-4"  /> },
    { label: '柱状图', value: 'bar', icon: <BarChart className="w-4 h-4"  /> },
    { label: '面积图', value: 'area', icon: <AreaChart className="w-4 h-4"  /> },
    { label: '散点图', value: 'scatter', icon: <ScatterChartOutlined /> },
    { label: '饼图', value: 'pie', icon: <PieChart className="w-4 h-4"  /> },
  ];

  useEffect(() => {
    if (initialChart) {
      setChartConfig(initialChart);
      form.setFieldsValue(initialChart);
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
        [setting]: value}};
    setChartConfig(newConfig);
  };

  const handleSaveChart = async () => {
    try {
      const values = await form.validateFields();
      const finalConfig: ChartConfig = {
        ...chartConfig,
        ...values,
        id: chartConfig.id || `chart_${Date.now()}`,
        createdAt: chartConfig.createdAt || new Date(),
        updatedAt: new Date()} as ChartConfig;

      if (chartConfig.id) {
        await updateChart(finalConfig);
        onChartUpdate?.(finalConfig);
      } else {
        await createChart(finalConfig);
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
    <div className="grid grid-cols-5 gap-2 mb-4">
      {chartTypes.map(type => (
        <Button
          key={type.value}
          type={chartConfig.type === type.value ? 'primary' : 'default'}
          icon={type.icon}
          onClick={() => handleFieldChange('type', type.value)}
          className="h-16 flex flex-col items-center justify-center"
        >
          <div className="text-xs mt-1">{type.label}</div>
        </Button>
      ))}
    </div>
  );

  const renderBasicSettings = () => (
    <div className="space-y-4">
      <Form.Item
        name="title"
        label="图表标题"
        rules={[{ required: true, message: '请输入图表标题' }]}
      >
        <Input
          placeholder="输入图表标题"
          value={chartConfig.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
        />
      </Form.Item>

      <div className="grid grid-cols-2 gap-4">
        <Form.Item
          name={['xAxis', 'field']}
          label="X轴字段"
          rules={[{ required: true, message: '请选择X轴字段' }]}
        >
          <Select
            placeholder="选择X轴字段"
            options={chartConfig.type === 'pie' ? fieldOptions : timeFieldOptions}
            value={chartConfig.xAxis?.field}
            onChange={(value) => handleFieldChange('xAxis', { ...chartConfig.xAxis, field: value })}
          />
        </Form.Item>

        <Form.Item
          name={['yAxis', 'field']}
          label="Y轴字段"
          rules={[{ required: true, message: '请选择Y轴字段' }]}
        >
          <Select
            placeholder="选择Y轴字段"
            options={numericFieldOptions}
            value={chartConfig.yAxis?.field}
            onChange={(value) => handleFieldChange('yAxis', { ...chartConfig.yAxis, field: value })}
          />
        </Form.Item>
      </div>

      {chartConfig.type !== 'pie' && (
        <Form.Item name="groupBy" label="分组字段（可选）">
          <Select
            placeholder="选择分组字段"
            options={fieldOptions}
            allowClear
            value={chartConfig.groupBy}
            onChange={(value) => handleFieldChange('groupBy', value)}
          />
        </Form.Item>
      )}
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">显示网格</label>
          <Switch
            checked={chartConfig.settings?.showGrid}
            onChange={(checked) => handleSettingsChange('showGrid', checked)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">显示图例</label>
          <Switch
            checked={chartConfig.settings?.showLegend}
            onChange={(checked) => handleSettingsChange('showLegend', checked)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">显示提示框</label>
          <Switch
            checked={chartConfig.settings?.showTooltip}
            onChange={(checked) => handleSettingsChange('showTooltip', checked)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">启用动画</label>
          <Switch
            checked={chartConfig.settings?.animation}
            onChange={(checked) => handleSettingsChange('animation', checked)}
          />
        </div>
      </div>

      {['line', 'area'].includes(chartConfig.type!) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">平滑曲线</label>
            <Switch
              checked={chartConfig.settings?.smooth}
              onChange={(checked) => handleSettingsChange('smooth', checked)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">堆叠显示</label>
            <Switch
              checked={chartConfig.settings?.stack}
              onChange={(checked) => handleSettingsChange('stack', checked)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">显示数据标签</label>
        <Switch
          checked={chartConfig.settings?.showDataLabels}
          onChange={(checked) => handleSettingsChange('showDataLabels', checked)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">透明度</label>
        <Slider
          min={0}
          max={1}
          step={0.1}
          value={chartConfig.settings?.opacity || 1}
          onChange={(value) => handleSettingsChange('opacity', value)}
          marks={{ 0: '0%', 0.5: '50%', 1: '100%' }}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">主题</label>
        <Select
          value={chartConfig.settings?.theme || 'default'}
          onChange={(value) => handleSettingsChange('theme', value)}
          options={[
            { label: '默认', value: 'default' },
            { label: '深色', value: 'dark' },
            { label: '简约', value: 'minimal' },
            { label: '商务', value: 'business' },
          ]}
        />
      </div>
    </div>
  );

  return (
    <div className={`h-full ${className}`}>
      <Card
        title={
          <div className="flex gap-2">
            <BarChart className="w-4 h-4"  />
            <span>图表构建器</span>
            {queryResult && (
              <span className="text-sm text-gray-500">
                数据源: {queryResult.rowCount} 行
              </span>
            )}
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Tooltip title="预览图表">
              <Button
                icon={<Eye className="w-4 h-4"  />}
                onClick={handlePreview}
                type={previewMode ? 'primary' : 'default'}
              />
            </Tooltip>
            
            <Tooltip title="高级设置">
              <Button
                icon={<Settings className="w-4 h-4"  />}
                onClick={() => setSettingsVisible(true)}
              />
            </Tooltip>

            <Tooltip title="复制配置">
              <Button
                icon={<Copy className="w-4 h-4"  />}
                onClick={handleCopyConfig}
              />
            </Tooltip>

            <Button
              type="primary"
              icon={<Save className="w-4 h-4"  />}
              onClick={handleSaveChart}
              disabled={!chartConfig.title || !chartConfig.xAxis?.field || !chartConfig.yAxis?.field}
            >
              保存图表
            </Button>
          </div>
        }
        className="h-full"
      >
        <div className="h-full flex flex-col">
          <Form
            form={form}
            layout="vertical"
            className="flex-shrink-0"
            initialValues={chartConfig}
          >
            {/* 图表类型选择 */}
            {renderChartTypeSelector()}

            {/* 基础设置 */}
            {renderBasicSettings()}
          </Form>

          {/* 预览区域 */}
          {previewMode && queryResult && (
            <div className="flex-1 mt-4 border rounded p-4 bg-gray-50">
              <div className="text-center text-gray-500">
                <BarChart className="w-4 h-4 text-4xl mb-2"   />
                <div>图表预览区域</div>
                <div className="text-sm">
                  类型: {chartTypes.find(t => t.value === chartConfig.type)?.label}
                </div>
                <div className="text-sm">
                  X轴: {chartConfig.xAxis?.field} | Y轴: {chartConfig.yAxis?.field}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 高级设置抽屉 */}
      <Sheet
        title="高级设置"
        open={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        width={400}
        placement="right"
      >
        {renderAdvancedSettings()}
      </Sheet>
    </div>
  );
};