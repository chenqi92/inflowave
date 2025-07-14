import React, { useState, useEffect, useCallback } from 'react';
import { Progress, Badge, Button, Select, Input, Switch, Tabs, TabsContent, TabsList, TabsTrigger, Table, List, Tag, Typography, Empty, Statistic } from '@/components/ui';

import { BarChart, TrendingUp, Database, Info, RefreshCw, Download, Eye, Bug, Copy, FileText, Key, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { DataCardinalityService, type DataCardinalityStats, type DataAnomaly } from '@/services/analyticsService';
import { showMessage } from '@/utils/message';

// Removed Text destructuring - using direct elements

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
  className}) => {
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
  const getCardinalityLabel = (stat: DataCardinalityStats): { text: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing' } => {
    if (stat.cardinality === stat.totalRows) return { text: '唯一', color: 'success' };
    if (stat.cardinalityRatio >= 0.8) return { text: '高基数', color: 'processing' };
    if (stat.cardinalityRatio >= 0.4) return { text: '中基数', color: 'warning' };
    return { text: '低基数', color: 'error' };
  };

  // 获取异常严重程度颜色
  const getAnomalySeverityColor = (severity: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing' => {
    const colorMap: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing'> = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error'};
    return colorMap[severity] || 'default';
  };

  // 获取异常类型图标
  const getAnomalyIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'outlier': <AlertCircle />,
      'duplicate': <Copy className="w-4 h-4"  />,
      'missing': <AlertCircle />,
      'inconsistent': <AlertTriangle />,
      'format': <FileText className="w-4 h-4"  />,
      'range': <TrendingUp className="w-4 h-4"  />};
    return iconMap[type] || <Info className="w-4 h-4"  />;
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
        <div className="flex gap-2">
          <Text strong>{text}</Text>
          <Tag color="processing">{record.dataType}</Tag>
        </div>
      )},
    {
      title: '总行数',
      dataIndex: 'totalRows',
      key: 'totalRows',
      width: 100,
      render: (value: number) => formatNumber(value),
      sorter: true},
    {
      title: '不重复值',
      dataIndex: 'distinctValues',
      key: 'distinctValues',
      width: 100,
      render: (value: number) => formatNumber(value),
      sorter: true},
    {
      title: '基数',
      dataIndex: 'cardinality',
      key: 'cardinality',
      width: 80,
      render: (value: number) => formatNumber(value),
      sorter: true},
    {
      title: '基数比例',
      dataIndex: 'cardinalityRatio',
      key: 'cardinalityRatio',
      width: 120,
      render: (value: number, record: DataCardinalityStats) => {
        const label = getCardinalityLabel(record);
        return (
          <div className="flex gap-2">
            <Progress
              value={value * 100}
              className="w-[60px]"
            />
            <Tag color={label.color as 'default' | 'primary' | 'success' | 'warning' | 'error' | 'processing'}>{label.text}</Tag>
          </div>
        );
      },
      sorter: true},
    {
      title: '空值数',
      dataIndex: 'nullCount',
      key: 'nullCount',
      width: 80,
      render: (value: number, record: DataCardinalityStats) => (
        <div className="flex gap-2">
          <Text>{formatNumber(value)}</Text>
          <Typography.Text variant="muted">({formatPercentage(value / record.totalRows)})</Typography.Text>
        </div>
      ),
      sorter: true},
    {
      title: '质量分数',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 120,
      render: (value: number) => (
        <Progress
          value={value * 100}
          className="w-full"
        />
      ),
      sorter: true},
    {
      title: '异常数',
      dataIndex: 'anomalies',
      key: 'anomalies',
      width: 80,
      render: (anomalies: DataAnomaly[]) => (
        <Badge
          variant={anomalies.length > 0 ? 'destructive' : 'default'}
          className="text-xs"
        >
          {anomalies.length}
        </Badge>
      ),
      sorter: true},
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_text: string, record: DataCardinalityStats) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setSelectedStats(record)}
            className="flex items-center gap-1"
          >
            <Eye className="w-4 h-4" />
            详情
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setSelectedStats(record);
              setActiveTab('distribution');
            }}
            className="flex items-center gap-1"
          >
            <BarChart className="w-4 h-4" />
            分布
          </Button>
        </div>
      )},
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
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="p-4 border rounded-lg bg-card">
            <Statistic
              title="平均质量分数"
              value={avgQuality}
              precision={2}
              suffix="/ 1.0"
              valueStyle={{ color: getQualityScoreColor(avgQuality) }}
            />
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <Statistic
              title="高质量列数"
              value={highQualityCount}
              suffix={`/ ${cardinalityStats.length}`}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircle />}
            />
          </div>
          <div className="p-4 border rounded-lg bg-card">
            <Statistic
              title="唯一列数"
              value={uniqueColumns}
              suffix={`/ ${cardinalityStats.length}`}
              valueStyle={{ color: '#1890ff' }}
              prefix={<Key className="w-4 h-4"  />}
            />
          </div>
          <div className="p-4 border rounded-lg bg-card">
              <Statistic
                title="异常总数"
                value={totalAnomalies}
                valueStyle={{ color: totalAnomalies > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<Bug className="w-4 h-4"  />}
              />
            </div>
        </div>

        {/* 过滤器 */}
        <div className="mb-4 p-4 border rounded-lg bg-card">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-4">
              <Input
                placeholder="搜索列名或数据类型"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Select
                value={qualityFilter}
                onValueChange={(value) => setQualityFilter(value as typeof qualityFilter)}
              >
                <option value="all">所有质量</option>
                <option value="high">高质量 (≥0.8)</option>
                <option value="medium">中质量 (0.6-0.8)</option>
                <option value="low">低质量 (&lt;0.6)</option>
              </Select>
            </div>
            <div className="col-span-2">
              <Select
                value={cardinalityFilter}
                onValueChange={(value) => setCardinalityFilter(value as typeof cardinalityFilter)}
              >
                <option value="all">所有基数</option>
                <option value="unique">唯一值</option>
                <option value="high">高基数 (≥0.8)</option>
                <option value="medium">中基数 (0.4-0.8)</option>
                <option value="low">低基数 (&lt;0.4)</option>
              </Select>
            </div>
            <div className="col-span-4">
              <div className="flex gap-2">
                <Switch
                  checked={showAnomalies}
                  onCheckedChange={setShowAnomalies}
                />
                <Typography.Text variant="muted">显示异常</Typography.Text>
              </div>
            </div>
            <div className="col-span-2">
              <Button
                onClick={() => {
                  setSearchText('');
                  setQualityFilter('all');
                  setCardinalityFilter('all');
                  setShowAnomalies(false);
                }}
              >
                清空筛选
              </Button>
            </div>
          </div>
        </div>

        {/* 统计表格 */}
        <Table
          columns={columns}
          dataSource={filteredStats}
          rowKey={(record) => `${record.table}-${record.column}`}
          pagination={true}
          // scroll={{ x: 1200 }}
          // rowClassName={(record) => record.anomalies.length > 0 ? 'anomaly-row' : ''}
        />

        {/* 异常列表 */}
        {showAnomalies && (
          <div title="数据异常" style={{ marginTop: '16px' }}>
            <List
              dataSource={filteredStats.filter(stat => stat.anomalies.length > 0)}
              renderItem={(stat) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${stat.table}.${stat.column}`}
                    description={
                      <div className="flex gap-2" wrap>
                        {stat.anomalies.map((anomaly: any, index: number) => (
                          <Tag
                            key={index}
                            color={getAnomalySeverityColor(anomaly.severity)}
                          >
                            {anomaly.description}
                          </Tag>
                        ))}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
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
            <div title="最频繁值">
              <Table
                columns={[
                  {
                    title: '值',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value: any) => (
                      <Text code>{value !== null ? String(value) : 'NULL'}</Text>
                    )},
                  {
                    title: '数量',
                    dataIndex: 'count',
                    key: 'count',
                    render: (count: number) => formatNumber(count)},
                  {
                    title: '占比',
                    dataIndex: 'percentage',
                    key: 'percentage',
                    render: (percentage: number) => (
                      <Progress
                        percent={percentage}
                        size="sm"
                        format={(percent) => `${percent}%`}
                      />
                    )},
                ]}
                dataSource={mostFrequentValues}
                pagination={false}
                size="sm"
                rowKey={(record) => `${record.value}`}
              />
            </div>
          </Col>
          <Col span={12}>
            <div title="数据分布直方图">
              <Table
                columns={[
                  {
                    title: '区间',
                    dataIndex: 'bucket',
                    key: 'bucket',
                    render: (bucket: string) => <Text code>{bucket}</Text>},
                  {
                    title: '数量',
                    dataIndex: 'count',
                    key: 'count',
                    render: (count: number) => formatNumber(count)},
                  {
                    title: '占比',
                    dataIndex: 'percentage',
                    key: 'percentage',
                    render: (percentage: number) => (
                      <Progress
                        percent={percentage}
                        size="sm"
                        format={(percent) => `${percent}%`}
                      />
                    )},
                ]}
                dataSource={distributionHistogram}
                pagination={false}
                size="sm"
                rowKey={(record) => `${record.bucket}`}
              />
            </div>
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
            <div>
              <Statistic
                title="整体质量分数"
                value={overallScore}
                precision={2}
                suffix="/ 1.0"
                valueStyle={{ color: getQualityScoreColor(overallScore) }}
                prefix={<CheckCircle />}
              />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <Statistic
                title="表质量分数"
                value={tableScores.length > 0 ? tableScores[0].score : 0}
                precision={2}
                suffix="/ 1.0"
                valueStyle={{ color: getQualityScoreColor(tableScores.length > 0 ? tableScores[0].score : 0) }}
                prefix={<Database className="w-4 h-4"  />}
              />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <Statistic
                title="异常总数"
                value={anomalies.length}
                valueStyle={{ color: anomalies.length > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<Bug className="w-4 h-4"  />}
              />
            </div>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div title="列质量分数" size="small">
              <Table
                columns={[
                  {
                    title: '列名',
                    dataIndex: 'column',
                    key: 'column'},
                  {
                    title: '质量分数',
                    dataIndex: 'score',
                    key: 'score',
                    render: (score: number) => (
                      <Progress
                        percent={score * 100}
                        size="sm"
                        strokeColor={getQualityScoreColor(score)}
                        format={(percent) => `${(percent! / 100).toFixed(2)}`}
                      />
                    )},
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
                    )},
                ]}
                dataSource={columnScores}
                pagination={false}
                size="sm"
                rowKey={(record) => record.column}
              />
            </div>
          </Col>
          <Col span={12}>
            <div title="改进建议" size="small">
              <List
                dataSource={recommendations}
                renderItem={(recommendation) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckCircle style={{ color: '#52c41a' }} />}
                      description={recommendation}
                    />
                  </List.Item>
                )}
              />
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  return (
    <div className={className}>
      <div
        title={
          <div className="flex gap-2">
            <BarChart className="w-4 h-4"  />
            <span>数据基数统计分析</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Select
              value={selectedTable}
              onValueChange={(value) => setSelectedTable(value as string)}
              style={{ width: 200 }}
              placeholder="选择表"
              options={availableTables.map(table => ({
                value: table,
                label: table
              }))}
            />
            <Button
              size="small"
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={getCardinalityStats}
              disabled={loading}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<Download className="w-4 h-4"  />}
              onClick={() => {
                if (cardinalityStats.length > 0) {
                  const blob = new Blob([JSON.stringify(cardinalityStats, null, 2)], {
                    type: 'application/json'});
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
          </div>
        }
      >
        <Spin spinning={loading}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">统计概览</TabsTrigger>
              <TabsTrigger value="distribution">数据分布</TabsTrigger>
              <TabsTrigger value="quality">质量报告</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="distribution">
              {renderDistribution()}
            </TabsContent>

            <TabsContent value="quality">
              {renderQualityReport()}
            </TabsContent>
          </Tabs>
        </Spin>
      </div>
    </div>
  );
};

export default DataCardinalityAnalyzer;