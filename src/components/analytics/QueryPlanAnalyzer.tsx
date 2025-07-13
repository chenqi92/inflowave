import React, { useState, useEffect, useCallback } from 'react';
import { Tree, Table, Descriptions, Progress, Tag, Button, Alert, Tooltip, Row, Col, Typography, Divider, Tabs, Statistic, List, Timeline, Badge, Switch, Select, Input, Spin, Empty } from 'antd';
import { Card, Space, Modal, Popover, message,  } from '@/components/ui';
import {
  PlayCircleOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DownloadOutlined,
  CompareOutlined,
  BulbOutlined,
  ReloadOutlined,
  ExpandAltOutlined,
  CodeOutlined,
  TableOutlined,
  LineChartOutlined,
  PieChartOutlined,
  FundOutlined,
  HourglassOutlined,
  MemoryOutlined,
  NetworkOutlined,
  HddOutlined,
  CpuOutlined,
  ShareAltOutlined,
  BookOutlined,
  RocketOutlined,
  SettingOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  MinusCircleOutlined,
} from '@/components/ui';
import { useConnectionStore } from '@/store/connection';
import { QueryAnalyticsService, type QueryExecutionPlan, type PlanNode, type QueryRecommendation } from '@/services/analyticsService';
import { showMessage } from '@/utils/message';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface QueryPlanAnalyzerProps {
  query: string;
  database: string;
  onExecutionPlanChange?: (plan: QueryExecutionPlan | null) => void;
  className?: string;
}

export const QueryPlanAnalyzer: React.FC<QueryPlanAnalyzerProps> = ({
  query,
  database,
  onExecutionPlanChange,
  className,
}) => {
  const { activeConnectionId } = useConnectionStore();
  const [executionPlan, setExecutionPlan] = useState<QueryExecutionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [showActualStats, setShowActualStats] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonPlan, setComparisonPlan] = useState<QueryExecutionPlan | null>(null);
  const [historicalPlans, setHistoricalPlans] = useState<QueryExecutionPlan[]>([]);
  const [recommendations, setRecommendations] = useState<QueryRecommendation[]>([]);
  const [activeTab, setActiveTab] = useState('plan');

  // 获取执行计划
  const getExecutionPlan = useCallback(async () => {
    if (!activeConnectionId || !database || !query.trim()) return;

    setLoading(true);
    try {
      const plan = await QueryAnalyticsService.getQueryExecutionPlan(
        activeConnectionId,
        database,
        query
      );
      setExecutionPlan(plan);
      setExpandedNodes([plan.planTree[0]?.id || '']);
      onExecutionPlanChange?.(plan);

      // 获取优化建议
      const suggestions = await QueryAnalyticsService.getQueryOptimizationSuggestions(
        activeConnectionId,
        database,
        query
      );
      setRecommendations(suggestions);
    } catch (error) {
      console.error('获取执行计划失败:', error);
      showMessage.error('获取执行计划失败');
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, database, query, onExecutionPlanChange]);

  // 获取历史执行计划
  const getHistoricalPlans = useCallback(async () => {
    if (!activeConnectionId || !database) return;

    try {
      const plans = await QueryAnalyticsService.getHistoricalExecutionPlans(
        activeConnectionId,
        database,
        query,
        10
      );
      setHistoricalPlans(plans);
    } catch (error) {
      console.error('获取历史执行计划失败:', error);
    }
  }, [activeConnectionId, database, query]);

  useEffect(() => {
    getExecutionPlan();
    getHistoricalPlans();
  }, [getExecutionPlan, getHistoricalPlans]);

  // 渲染计划树节点
  const renderPlanTreeNode = (node: PlanNode): any => {
    const isSelected = selectedNode?.id === node.id;
    const hasWarnings = node.warnings.length > 0;
    const actualRows = node.actualRows || 0;
    const estimatedRows = node.estimatedRows || 0;
    const rowsAccuracy = estimatedRows > 0 ? (actualRows / estimatedRows) : 1;
    const isInaccurate = rowsAccuracy < 0.5 || rowsAccuracy > 2;

    return {
      key: node.id,
      title: (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
            backgroundColor: isSelected ? '#f0f9ff' : '#fff',
            cursor: 'pointer',
            position: 'relative',
          }}
          onClick={() => setSelectedNode(node)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <Space>
                <Tag color={getNodeTypeColor(node.nodeType)}>
                  {node.nodeType}
                </Tag>
                <Text strong>{node.operation}</Text>
                {node.table && (
                  <Text type="secondary">
                    <DatabaseOutlined /> {node.table}
                  </Text>
                )}
                {node.index && (
                  <Text type="secondary">
                    <TableOutlined /> {node.index}
                  </Text>
                )}
              </Space>
            </div>
            <div>
              <Space>
                {hasWarnings && (
                  <Tooltip title={node.warnings.join(', ')}>
                    <WarningOutlined style={{ color: '#faad14' }} />
                  </Tooltip>
                )}
                {isInaccurate && (
                  <Tooltip title="行数估计不准确">
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  </Tooltip>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatNumber(node.estimatedRows)} rows
                </Text>
                {showActualStats && node.actualRows !== undefined && (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    (实际: {formatNumber(node.actualRows)})
                  </Text>
                )}
              </Space>
            </div>
          </div>
          
          <div style={{ marginTop: '4px' }}>
            <Space>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <ClockCircleOutlined /> 成本: {formatNumber(node.estimatedCost)}
              </Text>
              {showActualStats && node.actualCost !== undefined && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  (实际: {formatNumber(node.actualCost)})
                </Text>
              )}
              {showActualStats && node.executionTime !== undefined && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  <HourglassOutlined /> {node.executionTime}ms
                </Text>
              )}
            </Space>
          </div>
        </div>
      ),
      children: node.children.map(renderPlanTreeNode),
    };
  };

  // 获取节点类型颜色
  const getNodeTypeColor = (nodeType: string): string => {
    const colorMap: Record<string, string> = {
      'Seq Scan': 'red',
      'Index Scan': 'green',
      'Bitmap Index Scan': 'blue',
      'Bitmap Heap Scan': 'blue',
      'Nested Loop': 'orange',
      'Hash Join': 'purple',
      'Merge Join': 'cyan',
      'Sort': 'geekblue',
      'Aggregate': 'lime',
      'Group': 'gold',
      'Limit': 'magenta',
      'Hash': 'volcano',
    };
    return colorMap[nodeType] || 'default';
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)  }M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)  }K`;
    }
    return num.toString();
  };

  // 格式化时间
  const formatTime = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)  }s`;
    }
    return `${ms.toFixed(2)  }ms`;
  };

  // 获取推荐严重程度颜色
  const getRecommendationSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      'low': 'green',
      'medium': 'orange',
      'high': 'red',
      'critical': 'red',
    };
    return colorMap[severity] || 'default';
  };

  // 获取推荐类型图标
  const getRecommendationIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'index': <TableOutlined />,
      'rewrite': <CodeOutlined />,
      'configuration': <SettingOutlined />,
      'statistics': <BarChartOutlined />,
      'partitioning': <ShareAltOutlined />,
      'caching': <MemoryOutlined />,
    };
    return iconMap[type] || <InfoCircleOutlined />;
  };

  // 渲染执行计划树
  const renderExecutionPlanTree = () => {
    if (!executionPlan || !executionPlan.planTree.length) {
      return <Empty description="没有执行计划数据" />;
    }

    const treeData = executionPlan.planTree.map(renderPlanTreeNode);

    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Switch
              checked={showActualStats}
              onChange={setShowActualStats}
              size="small"
            />
            <Text type="secondary">显示实际统计</Text>
            <Button
              size="small"
              icon={<ExpandAltOutlined />}
              onClick={() => setExpandedNodes(getAllNodeIds(executionPlan.planTree))}
            >
              全部展开
            </Button>
            <Button
              size="small"
              icon={<MinusCircleOutlined />}
              onClick={() => setExpandedNodes([])}
            >
              全部收起
            </Button>
          </Space>
        </div>
        
        <Tree
          treeData={treeData}
          expandedKeys={expandedNodes}
          onExpand={setExpandedNodes}
          showLine
          showIcon={false}
          style={{ background: '#fafafa', padding: '12px', borderRadius: '6px' }}
        />
      </div>
    );
  };

  // 获取所有节点ID
  const getAllNodeIds = (nodes: PlanNode[]): string[] => {
    const ids: string[] = [];
    const traverse = (nodeList: PlanNode[]) => {
      nodeList.forEach(node => {
        ids.push(node.id);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return ids;
  };

  // 渲染节点详情
  const renderNodeDetails = () => {
    if (!selectedNode) {
      return <Empty description="请选择一个节点查看详情" />;
    }

    const statistics = selectedNode.statistics;
    const hasActualStats = selectedNode.actualRows !== undefined;

    return (
      <div>
        <Card
          title={
            <Space>
              <Tag color={getNodeTypeColor(selectedNode.nodeType)}>
                {selectedNode.nodeType}
              </Tag>
              <span>{selectedNode.operation}</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: '16px' }}
        >
          <Descriptions column={2} size="small">
            <Descriptions.Item label="表名">
              {selectedNode.table || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="索引">
              {selectedNode.index || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预估行数">
              {formatNumber(selectedNode.estimatedRows)}
            </Descriptions.Item>
            <Descriptions.Item label="实际行数">
              {hasActualStats ? formatNumber(selectedNode.actualRows!) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="预估成本">
              {formatNumber(selectedNode.estimatedCost)}
            </Descriptions.Item>
            <Descriptions.Item label="实际成本">
              {hasActualStats && selectedNode.actualCost !== undefined 
                ? formatNumber(selectedNode.actualCost)
                : '-'
              }
            </Descriptions.Item>
            <Descriptions.Item label="执行时间">
              {hasActualStats && selectedNode.executionTime !== undefined
                ? formatTime(selectedNode.executionTime)
                : '-'
              }
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 性能统计 */}
        {hasActualStats && (
          <Card title="性能统计" size="small" style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Statistic
                  title="缓存命中"
                  value={statistics.bufferHits}
                  suffix="次"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="磁盘读取"
                  value={statistics.diskReads}
                  suffix="次"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="内存使用"
                  value={statistics.memoryUsage}
                  suffix="MB"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="CPU时间"
                  value={statistics.cpuTime}
                  suffix="ms"
                  valueStyle={{ fontSize: '16px' }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 条件和输出 */}
        {(selectedNode.conditions?.length || selectedNode.output?.length) && (
          <Card title="条件和输出" size="small" style={{ marginBottom: '16px' }}>
            {selectedNode.conditions && selectedNode.conditions.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <Text strong>筛选条件:</Text>
                <div style={{ marginTop: '4px' }}>
                  {selectedNode.conditions.map((condition, index) => (
                    <Tag key={index} style={{ marginBottom: '4px' }}>
                      {condition}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
            
            {selectedNode.output && selectedNode.output.length > 0 && (
              <div>
                <Text strong>输出列:</Text>
                <div style={{ marginTop: '4px' }}>
                  {selectedNode.output.map((output, index) => (
                    <Tag key={index} color="blue" style={{ marginBottom: '4px' }}>
                      {output}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 警告信息 */}
        {selectedNode.warnings.length > 0 && (
          <Card title="警告信息" size="small">
            <List
              size="small"
              dataSource={selectedNode.warnings}
              renderItem={(warning) => (
                <List.Item>
                  <Space>
                    <WarningOutlined style={{ color: '#faad14' }} />
                    <Text>{warning}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}
      </div>
    );
  };

  // 渲染推荐建议
  const renderRecommendations = () => {
    if (!recommendations.length) {
      return <Empty description="没有优化建议" />;
    }

    return (
      <List
        dataSource={recommendations}
        renderItem={(recommendation) => (
          <List.Item>
            <Card
              size="small"
              style={{ width: '100%' }}
              title={
                <Space>
                  {getRecommendationIcon(recommendation.type)}
                  <span>{recommendation.title}</span>
                  <Tag color={getRecommendationSeverityColor(recommendation.severity)}>
                    {recommendation.severity.toUpperCase()}
                  </Tag>
                </Space>
              }
              extra={
                <Space>
                  <Text type="secondary">
                    预期提升: {recommendation.estimatedImprovement}%
                  </Text>
                  <Tag color="processing">
                    {recommendation.implementationComplexity}
                  </Tag>
                </Space>
              }
            >
              <Paragraph>{recommendation.description}</Paragraph>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>建议方案:</Text>
                <Paragraph style={{ marginTop: '4px' }}>
                  {recommendation.suggestion}
                </Paragraph>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>预期影响:</Text>
                <Text style={{ marginLeft: '8px' }}>{recommendation.impact}</Text>
              </div>
              {recommendation.sqlExample && (
                <div>
                  <Text strong>SQL示例:</Text>
                  <pre
                    style={{
                      backgroundColor: '#f5f5f5',
                      padding: '8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {recommendation.sqlExample}
                  </pre>
                </div>
              )}
            </Card>
          </List.Item>
        )}
      />
    );
  };

  // 渲染执行统计
  const renderExecutionStats = () => {
    if (!executionPlan) return null;

    const stats = executionPlan.statistics;

    return (
      <div>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总执行时间"
                value={formatTime(stats.totalExecutionTime)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="规划时间"
                value={formatTime(stats.planningTime)}
                prefix={<ThunderboltOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理行数"
                value={formatNumber(stats.totalRows)}
                prefix={<TableOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="峰值内存"
                value={formatNumber(stats.peakMemoryUsage)}
                suffix="MB"
                prefix={<MemoryOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="I/O统计" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="缓存命中">
                  {formatNumber(stats.bufferHits)}
                </Descriptions.Item>
                <Descriptions.Item label="缓存未命中">
                  {formatNumber(stats.bufferMisses)}
                </Descriptions.Item>
                <Descriptions.Item label="磁盘读取">
                  {formatNumber(stats.diskReads)}
                </Descriptions.Item>
                <Descriptions.Item label="磁盘写入">
                  {formatNumber(stats.diskWrites)}
                </Descriptions.Item>
                <Descriptions.Item label="网络流量">
                  {formatNumber(stats.networkTraffic)} MB
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="资源使用" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="并行工作进程">
                  {stats.parallelWorkers}
                </Descriptions.Item>
                <Descriptions.Item label="临时文件数">
                  {stats.tempFilesUsed}
                </Descriptions.Item>
                <Descriptions.Item label="临时文件大小">
                  {formatNumber(stats.tempFileSize)} MB
                </Descriptions.Item>
                <Descriptions.Item label="缓存命中率">
                  {stats.bufferHits > 0 
                    ? `${((stats.bufferHits / (stats.bufferHits + stats.bufferMisses)) * 100).toFixed(1)  }%`
                    : '0%'
                  }
                </Descriptions.Item>
              </Descriptions>
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
            <span>查询执行计划分析</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={getExecutionPlan}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => {
                if (executionPlan) {
                  const blob = new Blob([JSON.stringify(executionPlan, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `execution-plan-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              disabled={!executionPlan}
            >
              导出
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="执行计划" key="plan">
              <Row gutter={[16, 16]}>
                <Col span={14}>
                  {renderExecutionPlanTree()}
                </Col>
                <Col span={10}>
                  {renderNodeDetails()}
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="执行统计" key="stats">
              {renderExecutionStats()}
            </TabPane>
            
            <TabPane tab="优化建议" key="recommendations">
              {renderRecommendations()}
            </TabPane>
            
            <TabPane tab="历史对比" key="history">
              <List
                dataSource={historicalPlans}
                renderItem={(plan) => (
                  <List.Item
                    actions={[
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => setComparisonPlan(plan)}
                      >
                        查看
                      </Button>,
                      <Button
                        size="small"
                        icon={<CompareOutlined />}
                        onClick={() => {
                          setComparisonPlan(plan);
                          setCompareMode(true);
                        }}
                      >
                        对比
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <span>执行计划</span>
                          <Tag color="blue">
                            {formatTime(plan.statistics.totalExecutionTime)}
                          </Tag>
                        </Space>
                      }
                      description={`执行时间: ${plan.createdAt.toLocaleString()}`}
                    />
                    <div>
                      <Text type="secondary">
                        成本: {formatNumber(plan.estimatedCost)}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            </TabPane>
          </Tabs>
        </Spin>
      </Card>
    </div>
  );
};

export default QueryPlanAnalyzer;