import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Select,
  Form,
  Input,
  Typography,
  Space,
  Modal,
  message,
  Alert,
  Spin,
} from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { safeTauriInvoke } from '@/utils/tauri';
import { useConnectionStore } from '@/store/connection';
import type { QueryResult, QueryRequest } from '@/types';
import DesktopPageWrapper from '@/components/layout/DesktopPageWrapper';


const { Option } = Select;

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
  const [form] = Form.useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) return;

    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(dbList);
    } catch (error) {
      message.error(`加载数据库列表失败: ${error}`);
    }
  };

  // 执行查询并生成图表数据
  const executeQueryForChart = async (chartConfig: ChartConfig) => {
    if (!activeConnectionId) return null;

    try {
      const request: QueryRequest = {
        connectionId: activeConnectionId,
        database: chartConfig.database,
        query: chartConfig.query,
      };

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
            left: 'center',
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'cross',
            },
          },
          legend: {
            data: valueColumns,
            bottom: 0,
          },
          xAxis: {
            type: 'category',
            data: series.values.map(row => {
              const timeValue = timeIndex >= 0 ? row[timeIndex] : row[0];
              return new Date(timeValue).toLocaleTimeString();
            }),
          },
          yAxis: {
            type: 'value',
          },
          series: valueColumns.map((col) => ({
            name: col,
            type: chartConfig.type,
            data: series.values.map(row => {
              const valueIndex = series.columns.indexOf(col);
              return row[valueIndex];
            }),
            areaStyle: chartConfig.type === 'area' ? {} : undefined,
          })),
          grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true,
          },
        };

      case 'bar':
        return {
          title: {
            text: chartConfig.title,
            left: 'center',
          },
          tooltip: {
            trigger: 'axis',
          },
          legend: {
            data: valueColumns,
            bottom: 0,
          },
          xAxis: {
            type: 'category',
            data: series.values.map(row => {
              const timeValue = timeIndex >= 0 ? row[timeIndex] : row[0];
              return new Date(timeValue).toLocaleTimeString();
            }),
          },
          yAxis: {
            type: 'value',
          },
          series: valueColumns.map(col => ({
            name: col,
            type: 'bar',
            data: series.values.map(row => {
              const valueIndex = series.columns.indexOf(col);
              return row[valueIndex];
            }),
          })),
          grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true,
          },
        };

      case 'pie':
        const firstValueColumn = valueColumns[0];
        if (!firstValueColumn) return null;

        const valueIndex = series.columns.indexOf(firstValueColumn);
        const labelIndex = timeIndex >= 0 ? timeIndex : 0;

        return {
          title: {
            text: chartConfig.title,
            left: 'center',
          },
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)',
          },
          legend: {
            orient: 'vertical',
            left: 'left',
          },
          series: [
            {
              name: chartConfig.title,
              type: 'pie',
              radius: '50%',
              data: series.values.map(row => ({
                value: row[valueIndex],
                name: row[labelIndex],
              })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
              },
            },
          ],
        };

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
      refreshInterval: values.refreshInterval,
    };

    // 测试查询
    setLoading(true);
    const result = await executeQueryForChart(chartConfig);
    setLoading(false);

    if (!result) {
      message.error('查询执行失败，请检查查询语句');
      return;
    }

    const option = convertToEChartsOption(result, chartConfig);
    if (!option) {
      message.error('无法生成图表，请检查数据格式');
      return;
    }

    chartConfig.options = option;
    setCharts(prev => [...prev, chartConfig]);
    setCreateModalVisible(false);
    form.resetFields();
    message.success('图表创建成功');
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
        message.success('图表数据已刷新');
      }
    }
  };

  // 删除图表
  const deleteChart = (chartId: string) => {
    setCharts(prev => prev.filter(chart => chart.id !== chartId));
    message.success('图表已删除');
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 工具栏
  const toolbar = (
    <Space>
      <Button
        icon={<ReloadOutlined />}
        onClick={() => loadDatabases()}
        loading={loading}
      >
        刷新
      </Button>
      <Button
        icon={<SettingOutlined />}
      >
        设置
      </Button>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setCreateModalVisible(true)}
        disabled={!activeConnectionId}
      >
        创建图表
      </Button>
    </Space>
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
          icon={<ExclamationCircleOutlined />}
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
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<PlayCircleOutlined />}
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
                      </Space>
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
              <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
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
      <Modal
        title="创建图表"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        width={600}
        confirmLoading={loading}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createChart}
        >
          <Form.Item
            label="图表标题"
            name="title"
            rules={[{ required: true, message: '请输入图表标题' }]}
          >
            <Input placeholder="请输入图表标题" />
          </Form.Item>

          <Form.Item
            label="图表类型"
            name="type"
            rules={[{ required: true, message: '请选择图表类型' }]}
          >
            <Select placeholder="选择图表类型">
              <Option value="line">
                <Space>
                  <LineChartOutlined />
                  折线图
                </Space>
              </Option>
              <Option value="area">
                <Space>
                  <AreaChartOutlined />
                  面积图
                </Space>
              </Option>
              <Option value="bar">
                <Space>
                  <BarChartOutlined />
                  柱状图
                </Space>
              </Option>
              <Option value="pie">
                <Space>
                  <PieChartOutlined />
                  饼图
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="数据库"
            name="database"
            rules={[{ required: true, message: '请选择数据库' }]}
          >
            <Select placeholder="选择数据库">
              {databases.map(db => (
                <Option key={db} value={db}>
                  {db}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="查询语句"
            name="query"
            rules={[{ required: true, message: '请输入查询语句' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="例如: SELECT mean(value) FROM temperature WHERE time >= now() - 1h GROUP BY time(5m)"
            />
          </Form.Item>

          <Form.Item
            label="刷新间隔 (秒)"
            name="refreshInterval"
            tooltip="设置图表自动刷新间隔，0 表示不自动刷新"
          >
            <Select placeholder="选择刷新间隔">
              <Option value={0}>不自动刷新</Option>
              <Option value={5}>5 秒</Option>
              <Option value={10}>10 秒</Option>
              <Option value={30}>30 秒</Option>
              <Option value={60}>1 分钟</Option>
              <Option value={300}>5 分钟</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </DesktopPageWrapper>
  );
};

export default Visualization;
