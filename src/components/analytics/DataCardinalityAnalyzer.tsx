import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Progress,
  Tag,
  Space,
  Button,
  Row,
  Col,
  Typography,
  Tabs,
  Statistic,
  List,
  Badge,
  Select,
  Input,
  Spin,
  Empty,
  Switch,
} from '@/components/ui';
import {
  BarChartOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  EyeOutlined,
  BugOutlined,
  ClearOutlined,
  CopyOutlined,
  FileTextOutlined,
  KeyOutlined,
} from '@/components/ui';
import { useConnectionStore } from '@/store/connection';
import { DataCardinalityService, type DataCardinalityStats, type DataAnomaly } from '@/services/analyticsService';
import { showMessage } from '@/utils/message';

const { Text } = Typography;

interface DataCardinalityAnalyzerProps {
  database: string;
  table?: string;
  onStatsChange?: (stats: DataCardinalityStats[]) => void;
  className?: string;
}

export const DataCardinalityAnalyzer: React.FC<DataCardinalityAnalyzerProps> = ({
  database,
  table,
  onStatsChange,
  className,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [cardinalityStats, setCardinalityStats] = useState<DataCardinalityStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStats, setSelectedStats] = useState<DataCardinalityStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTable, setSelectedTable] = useState(table || '');
  const [availableTables] = useState<string[]>([]);
  const [filteredStats, setFilteredStats] = useState<DataCardinalityStats[]>([]);
  const [searchText, setSearchText] = useState('');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [cardinalityFilter, setCardinalityFilter] = useState<'all' | 'unique' | 'high' | 'medium' | 'low'>('all');
  const [dataQualityReport, setDataQualityReport] = useState<any>(null);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [selectedColumns] = useState<string[]>([]);

  // 获取数据基数统计
  const getCardinalityStats = useCallback(async () => {
    if (!activeConnectionId || !database || !selectedTable) return;

    setLoading(true);
    try {
      const stats = await DataCardinalityService.calculateTableCardinalityStats(
        activeConnectionId,
        database,
        selectedTable,
        selectedColumns.length > 0 ? selectedColumns : undefined
      );
      setCardinalityStats(stats);
      setFilteredStats(stats);
      onStatsChange?.(stats);

      // 获取数据质量报告
      const qualityReport = await DataCardinalityService.getDataQualityReport(
        activeConnectionId,
        database,
        selectedTable
      );
      setDataQualityReport(qualityReport);
    } catch (error) {
      console.error('获取数据基数统计失败:', error);
      showMessage.error('获取数据基数统计失败');
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, database, selectedTable, selectedColumns, onStatsChange]);

  // 过滤统计数据
  useEffect(() => {
    let filtered = cardinalityStats;

    // 按搜索文本过滤
    if (searchText) {
      filtered = filtered.filter(stat =>
        stat.column.toLowerCase().includes(searchText.toLowerCase()) ||
        stat.dataType.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // 按质量分数过滤
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(stat => {
        if (qualityFilter === 'high') return stat.qualityScore >= 0.8;
        if (qualityFilter === 'medium') return stat.qualityScore >= 0.6 && stat.qualityScore < 0.8;
        if (qualityFilter === 'low') return stat.qualityScore < 0.6;
        return true;
      });
    }

    // 按基数过滤
    if (cardinalityFilter !== 'all') {
      filtered = filtered.filter(stat => {
        if (cardinalityFilter === 'unique') return stat.cardinality === stat.totalRows;
        if (cardinalityFilter === 'high') return stat.cardinalityRatio >= 0.8;
        if (cardinalityFilter === 'medium') return stat.cardinalityRatio >= 0.4 && stat.cardinalityRatio < 0.8;
        if (cardinalityFilter === 'low') return stat.cardinalityRatio < 0.4;
        return true;
      });
    }

    setFilteredStats(filtered);
  }, [cardinalityStats, searchText, qualityFilter, cardinalityFilter]);

  useEffect(() => {
    if (selectedTable) {
      getCardinalityStats();
    }
  }, [getCardinalityStats, selectedTable]);

  // 获取质量分数颜色
  const getQualityScoreColor = (score: number): string => {
    if (score >= 0.8) return '#52c41a';
    if (score >= 0.6) return '#faad14';
    return '#ff4d4f';
  };

  // 获取基数类型标签
  const getCardinalityLabel = (stat: DataCardinalityStats): { text: string; color: string } => {
    if (stat.cardinality === stat.totalRows) return { text: '唯一', color: 'success' };
    if (stat.cardinalityRatio >= 0.8) return { text: '高基数', color: 'processing' };
    if (stat.cardinalityRatio >= 0.4) return { text: '中基数', color: 'warning' };
    return { text: '低基数', color: 'error' };
  };

  // 获取异常严重程度颜色
  const getAnomalySeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
    };
    return colorMap[severity] || 'default';
  };

  // 获取异常类型图标
  const getAnomalyIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'outlier': <ExclamationCircleOutlined />,
      'duplicate': <CopyOutlined />,
      'missing': <ExclamationCircleOutlined />,
      'inconsistent': <WarningOutlined />,
      'format': <FileTextOutlined />,
      'range': <LineChartOutlined />,
    };
    return iconMap[type] || <InfoCircleOutlined />;
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // 格式化百分比
  const formatPercentage = (ratio: number): string => {
    return `${(ratio * 100).toFixed(1)}%`;
  };

  // 表格列定义
  const columns = [
    {
      title: '列名',
      dataIndex: 'column',
      key: 'column',
      width: 120,
      fixed: 'left' as const,
      render: (text: string, record: DataCardinalityStats) => (
        <Space>
          <Text strong>{text}</Text>
          <Tag color="processing">{record.dataType}</Tag>
        </Space>
      ),
    },
    {
      title: '总行数',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 100,
      render: (value: number) => formatNumber(value),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.totalRows - b.totalRows,
    },
    {
      title: '不重复值',
      dataIndex: 'distinctValues',
      key: 'distinctValues',
      width: 100,
      render: (value: number) => formatNumber(value),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.distinctValues - b.distinctValues,
    },
    {
      title: '基数',
      dataIndex: 'cardinality',
      key: 'cardinality',
      width: 80,
      render: (value: number) => formatNumber(value),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.cardinality - b.cardinality,
    },
    {
      title: '基数比例',
      dataIndex: 'cardinalityRatio',
      key: 'cardinalityRatio',
      width: 120,
      render: (value: number, record: DataCardinalityStats) => {
        const label = getCardinalityLabel(record);
        return (
          <Space>
            <Progress
              percent={value * 100}
              size="small"
              strokeColor={label.color}
              style={{ width: '60px' }}
            />
            <Tag color={label.color}>{label.text}</Tag>
          </Space>
        );
      },
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.cardinalityRatio - b.cardinalityRatio,
    },
    {
      title: '空值数',
      dataIndex: 'nullCount',
      key: 'nullCount',
      width: 80,
      render: (value: number, record: DataCardinalityStats) => (
        <Space>
          <Text>{formatNumber(value)}</Text>
          <Text type="secondary">({formatPercentage(value / record.totalRows)})</Text>
        </Space>
      ),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.nullCount - b.nullCount,
    },
    {
      title: '质量分数',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 120,
      render: (value: number) => (
        <Progress
          percent={value * 100}
          size="small"
          strokeColor={getQualityScoreColor(value)}
          format={(percent) => `${(percent! / 100).toFixed(2)}`}
        />
      ),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.qualityScore - b.qualityScore,
    },
    {
      title: '异常数',
      dataIndex: 'anomalies',
      key: 'anomalies',
      width: 80,
      render: (anomalies: DataAnomaly[]) => (
        <Badge
          count={anomalies.length}
          overflowCount={99}
          style={{ backgroundColor: anomalies.length > 0 ? '#ff4d4f' : '#52c41a' }}
        />
      ),
      sorter: (a: DataCardinalityStats, b: DataCardinalityStats) => a.anomalies.length - b.anomalies.length,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_text: string, record: DataCardinalityStats) => (
        <Space>
          <Button
            size="sm"
            icon={<EyeOutlined />}
            onClick={() => setSelectedStats(record)}
          >
            详情
          </Button>
          <Button
            size="sm"
            icon={<BarChartOutlined />}
            onClick={() => {
              setSelectedStats(record);
              setActiveTab('distribution');
            }}
          >
            分布
          </Button>
        </Space>
      ),
    },
  ];

  // 渲染统计概览
  const renderOverview = () => {
    if (!cardinalityStats.length) {
      return <Empty description="没有数据基数统计" />;
    }

    const avgQuality = cardinalityStats.reduce((sum, stat) => sum + stat.qualityScore, 0) / cardinalityStats.length;
    const highQualityCount = cardinalityStats.filter(stat => stat.qualityScore >= 0.8).length;
    const uniqueColumns = cardinalityStats.filter(stat => stat.cardinality === stat.totalRows).length;
    const totalAnomalies = cardinalityStats.reduce((sum, stat) => sum + stat.anomalies.length, 0);

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="平均质量分数"
                value={avgQuality}
                precision={2}
                suffix="/ 1.0"
                valueStyle={{ color: getQualityScoreColor(avgQuality) }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="高质量列数"
                value={highQualityCount}
                suffix={`/ ${cardinalityStats.length}`}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="唯一列数"
                value={uniqueColumns}
                suffix={`/ ${cardinalityStats.length}`}
                valueStyle={{ color: '#1890ff' }}
                prefix={<KeyOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="异常总数"
                value={totalAnomalies}
                valueStyle={{ color: totalAnomalies > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 过滤器 */}
        <Card style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={8}>
              <Input
                placeholder="搜索列名或数据类型"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col span={4}>
              <Select
                value={qualityFilter}
                onChange={(value) => setQualityFilter(value as typeof qualityFilter)}
                placeholder="质量筛选"
                options={[
                  { value: 'all', label: '所有质量' },
                  { value: 'high', label: '高质量 (≥0.8)' },
                  { value: 'medium', label: '中质量 (0.6-0.8)' },
                  { value: 'low', label: '低质量 (<0.6)' },
                ]}
              />
            </Col>
            <Col span={4}>
              <Select
                value={cardinalityFilter}
                onChange={(value) => setCardinalityFilter(value as typeof cardinalityFilter)}
                placeholder="基数筛选"
                options={[
                  { value: 'all', label: '所有基数' },
                  { value: 'unique', label: '唯一值' },
                  { value: 'high', label: '高基数 (≥0.8)' },
                  { value: 'medium', label: '中基数 (0.4-0.8)' },
                  { value: 'low', label: '低基数 (<0.4)' },
                ]}
              />
            </Col>
            <Col span={4}>
              <Space>
                <Switch
                  checked={showAnomalies}
                  onChange={setShowAnomalies}
                  size="small"
                />
                <Text type="secondary">显示异常</Text>
              </Space>
            </Col>
            <Col span={4}>
              <Button
                icon={<ClearOutlined />}
                onClick={() => {
                  setSearchText('');
                  setQualityFilter('all');
                  setCardinalityFilter('all');
                  setShowAnomalies(false);
                }}
              >
                清空筛选
              </Button>
            </Col>
          </Row>
        </Card>

        {/* 统计表格 */}
        <Table
          columns={columns}
          dataSource={filteredStats}
          rowKey={(record) => `${record.table}-${record.column}`}
          pagination={{
            total: filteredStats.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          scroll={{ x: 1200 }}
          rowClassName={(record) => record.anomalies.length > 0 ? 'anomaly-row' : ''}
        />

        {/* 异常列表 */}
        {showAnomalies && (
          <Card title="数据异常" style={{ marginTop: '16px' }}>
            <List
              dataSource={filteredStats.filter(stat => stat.anomalies.length > 0)}
              renderItem={(stat) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${stat.table}.${stat.column}`}
                    description={
                      <Space wrap>
                        {stat.anomalies.map((anomaly, index) => (
                          <Tag
                            key={index}
                            color={getAnomalySeverityColor(anomaly.severity)}
                            icon={getAnomalyIcon(anomaly.type)}
                          >
                            {anomaly.description}
                          </Tag>
                        ))}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  // 渲染数据分布
  const renderDistribution = () => {
    if (!selectedStats) {
      return <Empty description="请选择一个列查看数据分布" />;
    }

    const { mostFrequentValues, distributionHistogram } = selectedStats;

    return (
      <div>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="最频繁值" size="small">
              <Table
                columns={[
                  {
                    title: '值',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: any) => (
                      <Text code>{value !== null ? String(value) : 'NULL'}</Text>
                    ),
                  },
                  {
                    title: '数量',
                    dataIndex: 'count',
                    key: 'count',
                    render: (count: number) => formatNumber(count),
                  },
                  {
                    title: '占比',
                    dataIndex: 'percentage',
                    key: 'percentage',
                    render: (percentage: number) => (
                      <Progress
                        percent={percentage}
                        size="small"
                        format={(percent) => `${percent}%`}
                      />
                    ),
                  },
                ]}
                dataSource={mostFrequentValues}
                pagination={false}
                size="small"
                rowKey={(record, index) => `${record.value}-${index}`}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="数据分布直方图" size="small">
              <Table
                columns={[
                  {
                    title: '区间',
                    dataIndex: 'bucket',
                    key: 'bucket',
                    render: (bucket: string) => <Text code>{bucket}</Text>,
                  },
                  {
                    title: '数量',
                    dataIndex: 'count',
                    key: 'count',
                    render: (count: number) => formatNumber(count),
                  },
                  {
                    title: '占比',
                    dataIndex: 'percentage',
                    key: 'percentage',
                    render: (percentage: number) => (
                      <Progress
                        percent={percentage}
                        size="small"
                        format={(percent) => `${percent}%`}
                      />
                    ),
                  },
                ]}
                dataSource={distributionHistogram}
                pagination={false}
                size="small"
                rowKey={(record, index) => `${record.bucket}-${index}`}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // 渲染数据质量报告
  const renderQualityReport = () => {
    if (!dataQualityReport) {
      return <Empty description="没有数据质量报告" />;
    }

    const { overallScore, tableScores, columnScores, anomalies, recommendations } = dataQualityReport;

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="整体质量分数"
                value={overallScore}
                precision={2}
                suffix="/ 1.0"
                valueStyle={{ color: getQualityScoreColor(overallScore) }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="表质量分数"
                value={tableScores.length > 0 ? tableScores[0].score : 0}
                precision={2}
                suffix="/ 1.0"
                valueStyle={{ color: getQualityScoreColor(tableScores.length > 0 ? tableScores[0].score : 0) }}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="异常总数"
                value={anomalies.length}
                valueStyle={{ color: anomalies.length > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="列质量分数" size="small">
              <Table
                columns={[
                  {
                    title: '列名',
                    dataIndex: 'column',
                    key: 'column',
                  },
                  {
                    title: '质量分数',
                    dataIndex: 'score',
                    key: 'score',
                    render: (score: number) => (
                      <Progress
                        percent={score * 100}
                        size="small"
                        strokeColor={getQualityScoreColor(score)}
                        format={(percent) => `${(percent! / 100).toFixed(2)}`}
                      />
                    ),
                  },
                  {
                    title: '问题数',
                    dataIndex: 'issues',
                    key: 'issues',
                    render: (issues: number) => (
                      <Badge
                        count={issues}
                        overflowCount={99}
                        style={{ backgroundColor: issues > 0 ? '#ff4d4f' : '#52c41a' }}
                      />
                    ),
                  },
                ]}
                dataSource={columnScores}
                pagination={false}
                size="small"
                rowKey={(record) => record.column}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="改进建议" size="small">
              <List
                dataSource={recommendations}
                renderItem={(recommendation) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      description={recommendation}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className={className}>
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>数据基数统计分析</span>
          </Space>
        }
        extra={
          <Space>
            <Select
              value={selectedTable}
              onChange={(value) => setSelectedTable(value as string)}
              style={{ width: 200 }}
              placeholder="选择表"
              options={availableTables.map(table => ({
                value: table,
                label: table
              }))}
            />
            <Button
              size="sm"
              icon={<ReloadOutlined />}
              onClick={getCardinalityStats}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              size="sm"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (cardinalityStats.length > 0) {
                  const blob = new Blob([JSON.stringify(cardinalityStats, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `cardinality-stats-${selectedTable}-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              disabled={!cardinalityStats.length}
            >
              导出
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="统计概览" key="overview">
              {renderOverview()}
            </Tabs.TabPane>
            <Tabs.TabPane tab="数据分布" key="distribution">
              {renderDistribution()}
            </Tabs.TabPane>
            <Tabs.TabPane tab="质量报告" key="quality">
              {renderQualityReport()}
            </Tabs.TabPane>
          </Tabs>
        </Spin>
      </Card>
    </div>
  );
};

export default DataCardinalityAnalyzer;