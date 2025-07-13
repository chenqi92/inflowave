import React, { useState } from 'react';
import { Table, Tabs, Button, Typography, Empty, Spin, Tag, Select, Card, Modal } from '@/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';
import { Table as TableIcon, Download, BarChart, Info, TrendingUp, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// 本地类型定义替代 antd 类型
interface ColumnType<T = any> {
  title?: React.ReactNode;
  dataIndex?: string;
  key?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filters?: Array<{ text: string; value: any }>;
  onFilter?: (value: any, record: T) => boolean;
}
import type { QueryResult } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import SimpleChart from '../common/SimpleChart';

const { Text } = Typography;

interface QueryResultsProps {
  result?: QueryResult | null;
  loading?: boolean;
}

const QueryResults: React.FC<QueryResultsProps> = ({ result, loading = false }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('table');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area' | 'pie'>('line');

  // 格式化查询结果为表格数据
  const formatResultForTable = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.series || queryResult.series.length === 0) {
      return { columns: [], dataSource: [] };
    }

    const series = queryResult.series[0];
    const columns: ColumnType<any>[] = series.columns.map((col: string, index: number) => ({
      title: col,
      dataIndex: col,
      key: col,
      width: index === 0 ? 200 : 120, // 时间列宽一些
      ellipsis: true,
      render: (value: any) => {
        if (value === null || value === undefined) {
          return <Text type="secondary">NULL</Text>;
        }
        if (typeof value === 'number') {
          return <Text code>{value.toLocaleString()}</Text>;
        }
        if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
          // 可能是时间戳
          try {
            const date = new Date(value);
            return <Text code>{date.toLocaleString()}</Text>;
          } catch {
            return <Text>{value}</Text>;
          }
        }
        return <Text>{String(value)}</Text>;
      }}));

    const dataSource = series.values.map((row: any[], index: number) => {
      const record: any = { key: index };
      series.columns.forEach((col: string, colIndex: number) => {
        record[col] = row[colIndex];
      });
      return record;
    });

    return { columns, dataSource };
  };

  // 获取结果统计信息
  const getResultStats = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.series) {
      return null;
    }

    const totalRows = queryResult.rowCount || 0;
    const seriesCount = queryResult.series.length;
    const executionTime = queryResult.executionTime || 0;

    return {
      totalRows,
      seriesCount,
      executionTime,
      columns: queryResult.series[0]?.columns?.length || 0};
  };

  // 导出数据
  const handleExport = async () => {
    if (!result) return;

    try {
      const exportData = {
        format: exportFormat,
        data: result,
        filename: `query_result_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`};

      await safeTauriInvoke('export_query_data', exportData);
      toast({ title: "成功", description: "数据已导出为 ${exportFormat.toUpperCase()} 格式" });
      setExportModalVisible(false);
    } catch (error) {
      toast({ title: "错误", description: "导出失败: ${error}", variant: "destructive" });
    }
  };

  // 检查数据是否适合图表显示
  const isChartable = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.series || queryResult.series.length === 0) {
      return false;
    }

    const series = queryResult.series[0];
    return series.columns.length >= 2 && series.values.length > 0;
  };

  // 准备图表数据
  const prepareChartData = (queryResult: QueryResult) => {
    if (!isChartable(queryResult)) return null;

    const series = queryResult.series[0];
    const timeColumn = series.columns.find(col =>
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('timestamp')
    );

    const valueColumns = series.columns.filter(col =>
      col !== timeColumn &&
      typeof series.values[0]?.[series.columns.indexOf(col)] === 'number'
    );

    if (valueColumns.length === 0) return null;

    return {
      timeColumn,
      valueColumns,
      data: series.values.map(row => {
        const record: any = {};
        series.columns.forEach((col, index) => {
          record[col] = row[index];
        });
        return record;
      })};
  };

  const { columns, dataSource } = result ? formatResultForTable(result) : { columns: [], dataSource: [] };
  const stats = result ? getResultStats(result) : null;

  const tabItems = [
    {
      key: 'table',
      label: (
        <div className="flex gap-2">
          <Table className="w-4 h-4"  />
          表格视图
          {stats && <Tag color="blue">{stats.totalRows} 行</Tag>}
        </div>
      ),
      children: (
        <div style={{ height: '100%', overflow: 'auto' }}>
          {result ? (
            <Table
              columns={columns}
              dataSource={dataSource}
              scroll={{ x: 'max-content', y: 'calc(100vh - 300px)' }}
              size="small"
              pagination={{
                pageSize: 100,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                pageSizeOptions: ['50', '100', '200', '500']}}
              bordered
              style={{ backgroundColor: '#fff' }}
            />
          ) : (
            <Empty
              description="暂无查询结果"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      )},
    {
      key: 'json',
      label: (
        <div className="flex gap-2">
          <FileText className="w-4 h-4"  />
          JSON 视图
        </div>
      ),
      children: (
        <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
          {result ? (
            <pre
              style={{
                backgroundColor: '#f6f8fa',
                padding: '16px',
                borderRadius: '6px',
                fontSize: '12px',
                lineHeight: '1.5',
                overflow: 'auto',
                margin: 0}}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <Empty
              description="暂无查询结果"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      )},
    {
      key: 'chart',
      label: (
        <div className="flex gap-2">
          <BarChart className="w-4 h-4"  />
          图表视图
        </div>
      ),
      children: (
        <div style={{ height: '100%', padding: '16px' }}>
          {result && isChartable(result) ? (
            <div style={{ height: '100%' }}>
              <div style={{ marginBottom: 16 }}>
                <div className="flex gap-2">
                  <span>图表类型:</span>
                  <Select
                    value={chartType}
                    onValueChange={setChartType}
                    style={{ width: 120 }}
                  >
                    <Select.Option value="line">
                      <div className="flex gap-2"><TrendingUp className="w-4 h-4"  />折线图</div>
                    </Select.Option>
                    <Select.Option value="bar">
                      <div className="flex gap-2"><BarChart className="w-4 h-4"  />柱状图</div>
                    </Select.Option>
                    <Select.Option value="area">
                      <div className="flex gap-2"><AreaChart className="w-4 h-4"  />面积图</div>
                    </Select.Option>
                    <Select.Option value="pie">
                      <div className="flex gap-2"><PieChart className="w-4 h-4"  />饼图</div>
                    </Select.Option>
                  </Select>
                </div>
              </div>
              <div style={{ height: 'calc(100% - 50px)' }}>
                <SimpleChart
                  data={prepareChartData(result)}
                  type={chartType}
                />
              </div>
            </div>
          ) : (
            <Empty
              description={result ? "当前数据不适合图表显示" : "暂无查询结果"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      )},
  ];

  return (
    <Card
      title={
        <div className="flex gap-2">
          <Table className="w-4 h-4"  />
          <span>查询结果</span>
          {stats && (
            <div className="flex gap-2">
              <Tag color="green">{stats.totalRows} 行</Tag>
              <Tag color="blue">{stats.columns} 列</Tag>
              <Tag color="orange">{stats.executionTime}ms</Tag>
            </div>
          )}
        </div>
      }
      extra={
        result && (
          <div className="flex gap-2">
            <Dropdown
              overlay={
                <Menu
                  onClick={({ key }) => {
                    setExportFormat(key as any);
                    setExportModalVisible(true);
                  }}
                  items={[
                    { key: 'csv', label: 'CSV 格式', icon: <FileText className="w-4 h-4"  /> },
                    { key: 'json', label: 'JSON 格式', icon: <FileText className="w-4 h-4"  /> },
                    { key: 'excel', label: 'Excel 格式', icon: <FileText className="w-4 h-4"  /> },
                  ]}
                />
              }
              trigger={['click']}
            >
              <Button icon={<Download className="w-4 h-4"  />} size="small">
                导出
              </Button>
            </Dropdown>
            <Button
              icon={<Info className="w-4 h-4"  />}
              size="small"
              onClick={() => {
                Modal.info({
                  title: '查询结果详情',
                  content: (
                    <div>
                      <p><strong>总行数:</strong> {stats?.totalRows}</p>
                      <p><strong>列数:</strong> {stats?.columns}</p>
                      <p><strong>序列数:</strong> {stats?.seriesCount}</p>
                      <p><strong>执行时间:</strong> {stats?.executionTime}ms</p>
                    </div>
                  )});
              }}
            >
              详情
            </Button>
          </div>
        )
      }
      styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
      style={{ height: '100%', border: 'none' }}
    >
      {loading ? (
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <Spin size="large" tip="执行查询中..." />
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
          tabBarStyle={{ margin: 0, paddingLeft: 16, paddingRight: 16 }}
        />
      )}

      {/* 导出模态框 */}
      <Modal
        title="导出查询结果"
        open={exportModalVisible}
        onOk={handleExport}
        onOpenChange={(open) => !open && (() => setExportModalVisible(false))()}
        okText="导出"
        cancelText="取消"
      >
        <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>导出格式:</Typography.Text>
            <Select
              value={exportFormat}
              onValueChange={setExportFormat}
              style={{ width: '100%', marginTop: 8 }}
            >
              <Select.Option value="csv">CSV - 逗号分隔值</Select.Option>
              <Select.Option value="json">JSON - JavaScript 对象表示法</Select.Option>
              <Select.Option value="excel">Excel - Microsoft Excel 格式</Select.Option>
            </Select>
          </div>
          {stats && (
            <div>
              <Typography.Text type="secondary">
                将导出 {stats.totalRows} 行 × {stats.columns} 列数据
              </Typography.Text>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default QueryResults;
