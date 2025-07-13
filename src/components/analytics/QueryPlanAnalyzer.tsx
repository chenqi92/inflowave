import React, { useState, useEffect, useCallback } from 'react';
import { Card, Space, Popover, toast, Dialog, DialogContent, DialogHeader, DialogTitle, Button, Alert, Tooltip, Divider, Badge, Switch, Select, Input, Tabs, TabsContent, TabsList, TabsTrigger, Tag, Spin } from '@/components/ui';


import { CompareOutlined, ExpandAltOutlined, FundOutlined, HourglassOutlined, MemoryOutlined, NetworkOutlined, HddOutlined, CpuOutlined, ShareAltOutlined } from '@/components/ui';
import { BarChart, Clock, Database, FileText, Info, Zap, Eye, Download, Lightbulb, RefreshCw, Code, Table, TrendingUp, PieChart, Book, Rocket, Settings, Trophy, PlayCircle, AlertTriangle, AlertCircle, CheckCircle, MinusCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { QueryAnalyticsService, type QueryExecutionPlan, type PlanNode, type QueryRecommendation } from '@/services/analyticsService';
import { showMessage } from '@/utils/message';

import { Text } from '@/components/ui';

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
  className}) => {
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
            position: 'relative'}}
          onClick={() => setSelectedNode(node)}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <div className="flex gap-2">
                <Tag variant="secondary">
                  {node.nodeType}
                </Tag>
                <Text strong>{node.operation}</Text>
                {node.table && (
                  <Text type="secondary">
                    <Database className="w-4 h-4"  /> {node.table}
                  </Text>
                )}
                {node.index && (
                  <Text type="secondary">
                    <Table className="w-4 h-4"  /> {node.index}
                  </Text>
                )}
              </div>
            </div>
            <div>
              <div className="flex gap-2">
                {hasWarnings && (
                  <Tooltip title={node.warnings.join(', ')}>
                    <AlertTriangle style={{ color: '#faad14' }} />
                  </Tooltip>
                )}
                {isInaccurate && (
                  <Tooltip title="行数估计不准确">
                    <AlertCircle style={{ color: '#ff4d4f' }} />
                  </Tooltip>
                )}
                <Text className="text-muted-foreground text-xs">
                  {formatNumber(node.estimatedRows)} rows
                </Text>
                {showActualStats && node.actualRows !== undefined && (
                  <Text className="text-muted-foreground text-xs">
                    (实际: {formatNumber(node.actualRows)})
                  </Text>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '4px' }}>
            <div className="flex gap-2">
              <Text type="secondary" style={{ fontSize: '11px' }}>
                <Clock className="w-4 h-4"  /> 成本: {formatNumber(node.estimatedCost)}
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
            </div>
          </div>
        </div>
      ),
      children: node.children.map(renderPlanTreeNode)};
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
      'Hash': 'volcano'};
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
      'critical': 'red'};
    return colorMap[severity] || 'default';
  };

  // 获取推荐类型图标
  const getRecommendationIcon = (type: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'index': <Table className="w-4 h-4"  />,
      'rewrite': <Code className="w-4 h-4"  />,
      'configuration': <Settings className="w-4 h-4"  />,
      'statistics': <BarChart className="w-4 h-4"  />,
      'partitioning': <ShareAltOutlined />,
      'caching': <MemoryOutlined />};
    return iconMap[type] || <Info className="w-4 h-4"  />;
  };

  // 渲染执行计划树
  const renderExecutionPlanTree = () => {
    if (!executionPlan || !executionPlan.planTree.length) {
      return <div className="text-center py-8 text-muted-foreground">没有执行计划数据</div>;
    }

    const treeData = executionPlan.planTree.map(renderPlanTreeNode);

    return (
      <div>
        <div style={{ marginBottom: '16px' }}>
          <div className="flex gap-2">
            <Switch
              checked={showActualStats}
              onChange={setShowActualStats}
              size="small"
            />
            <Text className="text-muted-foreground">显示实际统计</Text>
            <Button
              size="small"
              icon={<ExpandAltOutlined />}
              onClick={() => setExpandedNodes(getAllNodeIds(executionPlan.planTree))}
            >
              全部展开
            </Button>
            <Button
              size="small"
              icon={<MinusCircle />}
              onClick={() => setExpandedNodes([])}
            >
              全部收起
            </Button>
          </div>
        </div>
        
        <div className="bg-muted p-3 rounded-md">
          {/* Tree component would need to be implemented with Shadcn/ui or custom component */}
          <div className="text-sm text-muted-foreground">执行计划树视图 (需要自定义实现)</div>
        </div>
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
      return <div className="text-center py-8 text-muted-foreground">请选择一个节点查看详情</div>;
    }

    const statistics = selectedNode.statistics;
    const hasActualStats = selectedNode.actualRows !== undefined;

    return (
      <div>
        <Card
          title={
            <div className="flex gap-2">
              <Tag variant="secondary">
                {selectedNode.nodeType}
              </Tag>
              <span>{selectedNode.operation}</span>
            </div>
          }
          size="small"
          style={{ marginBottom: '16px' }}
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div><span className="font-medium">表名:</span> {selectedNode.table || '-'}</div>
              <div><span className="font-medium">索引:</span> {selectedNode.index || '-'}</div>
              <div><span className="font-medium">预估行数:</span> {formatNumber(selectedNode.estimatedRows)}</div>
              <div><span className="font-medium">实际行数:</span> {hasActualStats ? formatNumber(selectedNode.actualRows!) : '-'}</div>
            </div>
            <div className="space-y-2">
              <div><span className="font-medium">预估成本:</span> {formatNumber(selectedNode.estimatedCost)}</div>
              <div><span className="font-medium">实际成本:</span> {hasActualStats && selectedNode.actualCost !== undefined ? formatNumber(selectedNode.actualCost) : '-'}</div>
              <div><span className="font-medium">执行时间:</span> {hasActualStats && selectedNode.executionTime !== undefined ? formatTime(selectedNode.executionTime) : '-'}</div>
            </div>
          </div>
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
                  <div className="flex gap-2">
                    <AlertTriangle style={{ color: '#faad14' }} />
                    <Text>{warning}</Text>
                  </div>
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
      return <div className="text-center py-8 text-muted-foreground">没有优化建议</div>;
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
                <div className="flex gap-2">
                  {getRecommendationIcon(recommendation.type)}
                  <span>{recommendation.title}</span>
                  <Tag color={getRecommendationSeverityColor(recommendation.severity)}>
                    {recommendation.severity.toUpperCase()}
                  </Tag>
                </div>
              }
              extra={
                <div className="flex gap-2">
                  <Text type="secondary">
                    预期提升: {recommendation.estimatedImprovement}%
                  </Text>
                  <Tag color="processing">
                    {recommendation.implementationComplexity}
                  </Tag>
                </div>
              }
            >
              <Text className="block mb-2">{recommendation.description}</Text>
              <div style={{ marginBottom: '8px' }}>
                <Text strong>建议方案:</Text>
                <Text className="block mt-1">
                  {recommendation.suggestion}
                </Text>
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
                      fontSize: '12px'}}
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
                prefix={<Clock className="w-4 h-4"  />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="规划时间"
                value={formatTime(stats.planningTime)}
                prefix={<Zap className="w-4 h-4"  />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="处理行数"
                value={formatNumber(stats.totalRows)}
                prefix={<Table className="w-4 h-4"  />}
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
          <div className="flex gap-2">
            <BarChart className="w-4 h-4"  />
            <span>查询执行计划分析</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Button
              size="small"
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={getExecutionPlan}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              size="small"
              icon={<Download className="w-4 h-4"  />}
              onClick={() => {
                if (executionPlan) {
                  const blob = new Blob([JSON.stringify(executionPlan, null, 2)], {
                    type: 'application/json'});
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
          </div>
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
                        icon={<Eye className="w-4 h-4"  />}
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
                        <div className="flex gap-2">
                          <span>执行计划</span>
                          <Tag color="blue">
                            {formatTime(plan.statistics.totalExecutionTime)}
                          </Tag>
                        </div>
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