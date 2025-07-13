import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Row, Col, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Form, Input, Typography, Alert, Spin } from '@/components/ui';
import { Card, Space, toast } from '@/components/ui';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { TrendingUp, BarChart, PieChart, Plus, RefreshCw, Settings, PlayCircle, AlertCircle } from 'lucide-react';
import { AreaChart } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult, QueryRequest } from '@/types';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';

// Remove Option destructuring as we'll use SelectItem instead

interface ChartConfig {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  query: string;
  database: string;
  refreshInterval?: number;
  options?: any;
}

const Visualization: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const form = useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId});
      setDatabases(dbList);
    } catch (error) {
      toast({ title: "错误", description: `加载数据库列表失败: ${error}`, variant: "destructive" });
    }
  };

  // 执行查询并生成图表数据
  const executeQueryForChart = async (chartConfig: ChartConfig) => {
    if (!activeConnectionId) return null;

    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: chartConfig.database,
        query: chartConfig.query};

      const result = await safeTauriInvoke<QueryResult>('execute_query', { request });
      return result;
    } catch (error) {
      console.error('查询执行失败:', error);
      return null;
    }
  };

  // 将查询结果转换为 ECharts 配置
  const convertToEChartsOption = (result: QueryResult, chartConfig: ChartConfig) => {
    if (!result.series || result.series.length === 0) {
      return null;
    }

    const series = result.series[0];
    const timeIndex = series.columns.findIndex(col => col.toLowerCase().includes('time'));
    const valueColumns = series.columns.filter((_, index) => index !== timeIndex);

    switch (chartConfig.type) {
      case 'line':
      case 'area':
        return {
          title: {
            text: chartConfig.title,
            left: 'center'},
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross'}},
          legend: {
            data: valueColumns,
            bottom: 0},
          xAxis: {
            type: 'category',
            data: series.values.map(row => {
              const timeValue = timeIndex >= 0 ? row[timeIndex] : row[0];
              return new Date(timeValue).toLocaleTimeString();
            })},
          yAxis: {
            type: 'value'},
          series: valueColumns.map((col) => ({
            name: col,
            type: chartConfig.type,
            data: series.values.map(row => {
              const valueIndex = series.columns.indexOf(col);
              return row[valueIndex];
            }),
            areaStyle: chartConfig.type === 'area' ? {} : undefined})),
          grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true}};

      case 'bar':
        return {
          title: {
            text: chartConfig.title,
            left: 'center'},
          tooltip: {
            trigger: 'axis'},
          legend: {
            data: valueColumns,
            bottom: 0},
          xAxis: {
            type: 'category',
            data: series.values.map(row => {
              const timeValue = timeIndex >= 0 ? row[timeIndex] : row[0];
              return new Date(timeValue).toLocaleTimeString();
            })},
          yAxis: {
            type: 'value'},
          series: valueColumns.map(col => ({
            name: col,
            type: 'bar',
            data: series.values.map(row => {
              const valueIndex = series.columns.indexOf(col);
              return row[valueIndex];
            })})),
          grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true}};

      case 'pie':
        const firstValueColumn = valueColumns[0];
        if (!firstValueColumn) return null;

        const valueIndex = series.columns.indexOf(firstValueColumn);
        const labelIndex = timeIndex >= 0 ? timeIndex : 0;

        return {
          title: {
            text: chartConfig.title,
            left: 'center'},
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'},
          legend: {
            orient: 'vertical',
            left: 'left'},
          series: [
            {
              name: chartConfig.title,
              type: 'pie',
              radius: '50%',
              data: series.values.map(row => ({
                value: row[valueIndex],
                name: row[labelIndex]})),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'}}},
          ]};

      default:
        return null;
    }
  };

  // 创建新图表
  const createChart = async (values: any) => {
    const chartConfig: ChartConfig = {
      id: `chart_${Date.now()}`,
      title: values.title,
      type: values.type,
      query: values.query,
      database: values.database,
      refreshInterval: values.refreshInterval};

    // 测试查询
    setLoading(true);
    const result = await executeQueryForChart(chartConfig);
    setLoading(false);

    if (!result) {
      toast({ title: "错误", description: "查询执行失败，请检查查询语句", variant: "destructive" });
      return;
    }

    const option = convertToEChartsOption(result, chartConfig);
    if (!option) {
      toast({ title: "错误", description: "无法生成图表，请检查数据格式", variant: "destructive" });
      return;
    }

    chartConfig.options = option;
    setCharts(prev => [...prev, chartConfig]);
    setCreateModalVisible(false);
    form.reset();
    toast({ title: "成功", description: "图表创建成功" });
  };

  // 刷新图表数据
  const refreshChart = async (chartConfig: ChartConfig) => {
    const result = await executeQueryForChart(chartConfig);
    if (result) {
      const option = convertToEChartsOption(result, chartConfig);
      if (option) {
        const updatedCharts = charts.map(chart =>
          chart.id === chartConfig.id
            ? { ...chart, options: option }
            : chart
        );
        setCharts(updatedCharts);
        toast({ title: "成功", description: "图表数据已刷新" });
      }
    }
  };

  // 删除图表
  const deleteChart = (chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
    toast({ title: "成功", description: "图表已删除" });
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 工具栏
  const toolbar = (
    <div className="flex gap-2">
      <Button
        icon={<RefreshCw className="w-4 h-4"  />}
        onClick={() => loadDatabases()}
        disabled={loading}
      >
        刷新
      </Button>
      <Button
        icon={<Settings className="w-4 h-4"  />}
      >
        设置
      </Button>
      <Button
        type="primary"
        icon={<Plus className="w-4 h-4"  />}
        onClick={() => setCreateModalVisible(true)}
        disabled={!activeConnectionId}
      >
        创建图表
      </Button>
    </div>
  );

  if (!activeConnectionId) {
    return (
      <DesktopPageWrapper
        title="数据可视化"
        description="创建图表和仪表板来可视化您的时序数据"
        toolbar={toolbar}
      >
        <Alert
          message="请先连接到 InfluxDB"
          description="在连接管理页面选择一个连接并激活后，才能创建数据可视化。"
          type="warning"
          showIcon
          icon={<AlertCircle />}
          action={
            <Button size="small" type="primary">
              去连接
            </Button>
          }
        />
      </DesktopPageWrapper>
    );
  }

  return (
    <DesktopPageWrapper
      title="数据可视化"
      description="创建图表和仪表板来可视化您的时序数据"
      toolbar={toolbar}
    >

      {/* 图表网格 */}
      <div className="desktop-panel">
        <div className="desktop-panel-header">
          图表列表 ({charts.length})
        </div>
        <div className="desktop-panel-content">
          {charts.length > 0 ? (
            <Row gutter={[16, 16]}>
              {charts.map(chart => (
                <Col xs={24} lg={12} xl={8} key={chart.id}>
                  <Card
                    size="small"
                    title={chart.title}
                    extra={
                      <div className="flex gap-2">
                        <Button
                          type="text"
                          size="small"
                          icon={<PlayCircle />}
                          onClick={() => refreshChart(chart)}
                          title="刷新数据"
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          onClick={() => deleteChart(chart.id)}
                          title="删除图表"
                        >
                          删除
                        </Button>
                      </div>
                    }
                  >
                    {chart.options ? (
                      <ReactECharts
                        option={chart.options}
                        style={{ height: '280px' }}
                        opts={{ renderer: 'canvas' }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-64">
                        <Spin tip="加载图表数据..." />
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center py-12">
              <BarChart className="w-4 h-4" style={{ fontSize: 48, color: '#d9d9d9' }}  />
              <div className="mt-4 text-gray-500">
                暂无图表
              </div>
              <div className="text-sm text-gray-400 mt-2">
                点击"创建图表"开始可视化您的数据
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 创建图表模态框 */}
      <Dialog open={createModalVisible} onOpenChange={setCreateModalVisible}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>创建图表</DialogTitle>
          </DialogHeader>
        <Form
          form={form}
          layout="vertical"
          onFinish={createChart}
        >
          <FormItem
            label="图表标题"
            name="title"
            rules={[{ required: true, message: '请输入图表标题' }]}
          >
            <Input placeholder="请输入图表标题" />
          </FormItem>

          <FormItem
            label="图表类型"
            name="type"
            rules={[{ required: true, message: '请选择图表类型' }]}
          >
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择图表类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex gap-2">
                    <TrendingUp className="w-4 h-4"  />
                    折线图
                  </div>
                </SelectItem>
                <SelectItem value="area">
                  <div className="flex gap-2">
                    <AreaChart className="w-4 h-4"  />
                    面积图
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex gap-2">
                    <BarChart className="w-4 h-4"  />
                    柱状图
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex gap-2">
                    <PieChart className="w-4 h-4"  />
                    饼图
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem
            label="数据库"
            name="database"
            rules={[{ required: true, message: '请选择数据库' }]}
          >
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择数据库" />
              </SelectTrigger>
              <SelectContent>
                {databases.map(db => (
                  <SelectItem key={db} value={db}>
                    {db}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem
            label="查询语句"
            name="query"
            rules={[{ required: true, message: '请输入查询语句' }]}
          >
            <Textarea
              rows={4}
              placeholder="例如: SELECT mean(value) FROM temperature WHERE time >= now() - 1h GROUP BY time(5m)"
            />
          </FormItem>

          <FormItem
            label="刷新间隔 (秒)"
            name="refreshInterval"
            tooltip="设置图表自动刷新间隔，0 表示不自动刷新"
          >
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="选择刷新间隔" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">不自动刷新</SelectItem>
                <SelectItem value="5">5 秒</SelectItem>
                <SelectItem value="10">10 秒</SelectItem>
                <SelectItem value="30">30 秒</SelectItem>
                <SelectItem value="60">1 分钟</SelectItem>
                <SelectItem value="300">5 分钟</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalVisible(false);
                form.reset();
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => form.handleSubmit(createChart)()}
              disabled={loading}
            >
              {loading ? '创建中...' : '创建'}
            </Button>
          </div>
        </Form>
        </DialogContent>
      </Dialog>
    </DesktopPageWrapper>
  );
};

export default Visualization;
