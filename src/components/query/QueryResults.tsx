import React, { useState } from 'react';
import { Card, Table, Tabs, Button, Space, Typography, Empty, Spin, Tag } from 'antd';
import {
  TableOutlined,
  FileTextOutlined,
  DownloadOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { QueryResult } from '@/types';

const { Text } = Typography;

interface QueryResultsProps {
  result?: QueryResult | null;
  loading?: boolean;
}

const QueryResults: React.FC<QueryResultsProps> = ({ result, loading = false }) => {
  const [activeTab, setActiveTab] = useState('table');

  // 格式化查询结果为表格数据
  const formatResultForTable = (queryResult: QueryResult) => {
    if (!queryResult || !queryResult.series || queryResult.series.length === 0) {
      return { columns: [], dataSource: [] };
    }

    const series = queryResult.series[0];
    const columns: ColumnsType<any> = series.columns.map((col: string, index: number) => ({
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
      },
    }));

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
      columns: queryResult.series[0]?.columns?.length || 0,
    };
  };

  const { columns, dataSource } = result ? formatResultForTable(result) : { columns: [], dataSource: [] };
  const stats = result ? getResultStats(result) : null;

  const tabItems = [
    {
      key: 'table',
      label: (
        <Space>
          <TableOutlined />
          表格视图
          {stats && <Tag color="blue">{stats.totalRows} 行</Tag>}
        </Space>
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
                pageSizeOptions: ['50', '100', '200', '500'],
              }}
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
      ),
    },
    {
      key: 'json',
      label: (
        <Space>
          <FileTextOutlined />
          JSON 视图
        </Space>
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
                margin: 0,
              }}
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
      ),
    },
    {
      key: 'chart',
      label: (
        <Space>
          <BarChartOutlined />
          图表视图
        </Space>
      ),
      children: (
        <div style={{ height: '100%', padding: '16px' }}>
          <Empty
            description="图表功能开发中..."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <TableOutlined />
          <span>查询结果</span>
          {stats && (
            <Space>
              <Tag color="green">{stats.totalRows} 行</Tag>
              <Tag color="blue">{stats.columns} 列</Tag>
              <Tag color="orange">{stats.executionTime}ms</Tag>
            </Space>
          )}
        </Space>
      }
      extra={
        result && (
          <Space>
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => {
                // 导出功能
                console.log('Export result:', result);
              }}
            >
              导出
            </Button>
            <Button
              icon={<InfoCircleOutlined />}
              size="small"
              onClick={() => {
                // 显示详细信息
                console.log('Show details:', stats);
              }}
            >
              详情
            </Button>
          </Space>
        )
      }
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)' }}
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
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ height: '100%' }}
          tabBarStyle={{ margin: 0, paddingLeft: 16, paddingRight: 16 }}
        />
      )}
    </Card>
  );
};

export default QueryResults;
