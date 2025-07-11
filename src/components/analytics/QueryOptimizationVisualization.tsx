import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tabs,
  Progress,
  Timeline,
  Tag,
  Badge,
  Space,
  Button,
  Tooltip,
  Divider,
  Statistic,
  Alert,
  List,
  Descriptions,
  Tree,
  Select,
  Switch,
  Spin,
} from '@/components/ui';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  BranchesOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined,
  FireOutlined,
  RocketOutlined,
  TargetOutlined,
  TrophyOutlined,
  EyeOutlined,
  SettingOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@/components/ui';
import { QueryOptimizationResult, ExecutionPlan, OptimizationTechnique } from '@/services/intelligentQuery';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface QueryOptimizationVisualizationProps {
  optimizationResult: QueryOptimizationResult;
  onRefresh?: () => void;
  onExport?: () => void;
  className?: string;
}

interface ExecutionStepNode {
  key: string;
  title: string;
  children?: ExecutionStepNode[];
  isLeaf?: boolean;
  icon?: React.ReactNode;
  cost?: number;
  duration?: number;
  rows?: number;
  type?: string;
}

export const QueryOptimizationVisualization: React.FC<QueryOptimizationVisualizationProps> = ({
  optimizationResult,
  onRefresh,
  onExport,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'tree' | 'timeline' | 'flow'>('tree');
  const [highlightOptimizations, setHighlightOptimizations] = useState(true);

  // 构建执行计划树结构
  const buildExecutionTree = useCallback((plan: ExecutionPlan): ExecutionStepNode[] => {
    const nodes: ExecutionStepNode[] = [];
    
    plan.steps.forEach((step, index) => {
      const node: ExecutionStepNode = {
        key: `step-${index}`,
        title: step.operation,
        icon: getStepIcon(step.operation),
        cost: step.estimatedCost,
        duration: step.estimatedDuration,
        rows: step.estimatedRows,
        type: step.operation,
        isLeaf: true,
      };
      
      // 如果有子步骤，递归构建
      if (step.subSteps && step.subSteps.length > 0) {
        node.children = step.subSteps.map((subStep, subIndex) => ({
          key: `step-${index}-${subIndex}`,
          title: subStep.operation,
          icon: getStepIcon(subStep.operation),
          cost: subStep.estimatedCost,
          duration: subStep.estimatedDuration,
          rows: subStep.estimatedRows,
          type: subStep.operation,
          isLeaf: true,
        }));
        node.isLeaf = false;
      }
      
      nodes.push(node);
    });
    
    return nodes;
  }, []);

  // 获取步骤图标
  const getStepIcon = (operation: string): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'SELECT': <DatabaseOutlined style={{ color: '#1890ff' }} />,
      'JOIN': <BranchesOutlined style={{ color: '#52c41a' }} />,
      'FILTER': <TargetOutlined style={{ color: '#faad14' }} />,
      'SORT': <BarChartOutlined style={{ color: '#722ed1' }} />,
      'GROUP': <PieChartOutlined style={{ color: '#eb2f96' }} />,
      'AGGREGATE': <LineChartOutlined style={{ color: '#13c2c2' }} />,
      'INDEX_SCAN': <RocketOutlined style={{ color: '#52c41a' }} />,
      'TABLE_SCAN': <DatabaseOutlined style={{ color: '#faad14' }} />,
      'HASH_JOIN': <BranchesOutlined style={{ color: '#1890ff' }} />,
      'NESTED_LOOP': <BranchesOutlined style={{ color: '#fa8c16' }} />,
    };
    
    return iconMap[operation.toUpperCase()] || <InfoCircleOutlined />;
  };

  // 获取优化技术颜色
  const getTechniqueColor = (technique: OptimizationTechnique): string => {
    switch (technique.impact) {
      case 'high': return '#52c41a';
      case 'medium': return '#faad14';
      case 'low': return '#d9d9d9';
      default: return '#1890ff';
    }
  };

  // 获取优化技术图标
  const getTechniqueIcon = (technique: OptimizationTechnique): React.ReactNode => {
    const iconMap: Record<string, React.ReactNode> = {
      'index_optimization': <RocketOutlined />,
      'query_rewriting': <BulbOutlined />,
      'join_optimization': <BranchesOutlined />,
      'predicate_pushdown': <TargetOutlined />,
      'column_pruning': <DatabaseOutlined />,
      'partition_pruning': <DatabaseOutlined />,
      'caching': <ThunderboltOutlined />,
      'parallel_execution': <FireOutlined />,
    };
    
    return iconMap[technique.name] || <InfoCircleOutlined />;
  };

  // 格式化持续时间
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // 格式化行数
  const formatRows = (rows: number): string => {
    if (rows < 1000) return rows.toString();
    if (rows < 1000000) return `${(rows / 1000).toFixed(1)}K`;
    return `${(rows / 1000000).toFixed(1)}M`;
  };

  // 渲染执行计划树
  const renderExecutionTree = () => {
    const treeData = buildExecutionTree(optimizationResult.executionPlan);
    
    return (
      <Tree
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={setExpandedKeys}
        onSelect={(selectedKeys) => setSelectedStep(selectedKeys[0] as string)}
        titleRender={(node: ExecutionStepNode) => (
          <div className="flex items-center justify-between w-full">
            <Space>
              {node.icon}
              <span className="font-medium">{node.title}</span>
              {node.cost && (
                <Tag color="blue" size="small">
                  Cost: {node.cost.toFixed(2)}
                </Tag>
              )}
            </Space>
            <Space>
              {node.duration && (
                <Text type="secondary" className="text-xs">
                  {formatDuration(node.duration)}
                </Text>
              )}
              {node.rows && (
                <Text type="secondary" className="text-xs">
                  {formatRows(node.rows)} rows
                </Text>
              )}
            </Space>
          </div>
        )}
      />
    );
  };

  // 渲染时间线视图
  const renderTimelineView = () => {
    const timelineItems = optimizationResult.executionPlan.steps.map((step, index) => ({
      key: index,
      dot: getStepIcon(step.operation),
      children: (
        <div className="pb-4">
          <div className="flex items-center justify-between">
            <Text strong>{step.operation}</Text>
            <Space>
              <Tag color="blue">Cost: {step.estimatedCost.toFixed(2)}</Tag>
              <Tag color="green">{formatDuration(step.estimatedDuration)}</Tag>
            </Space>
          </div>
          <Text type="secondary" className="text-sm">
            {step.description}
          </Text>
          <div className="mt-2">
            <Progress
              percent={Math.min((step.estimatedCost / optimizationResult.executionPlan.totalCost) * 100, 100)}
              size="small"
              strokeColor="#1890ff"
            />
          </div>
        </div>
      ),
    }));

    return <Timeline items={timelineItems} />;
  };

  // 渲染优化技术列表
  const renderOptimizationTechniques = () => {
    return (
      <List
        dataSource={optimizationResult.optimizationTechniques}
        renderItem={(technique) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                <Badge
                  color={getTechniqueColor(technique)}
                  count={getTechniqueIcon(technique)}
                />
              }
              title={
                <div className="flex items-center justify-between">
                  <Text strong>{technique.name}</Text>
                  <Space>
                    <Tag color={getTechniqueColor(technique)}>
                      {technique.impact}
                    </Tag>
                    <Text type="secondary">
                      +{technique.estimatedGain}%
                    </Text>
                  </Space>
                </div>
              }
              description={
                <div>
                  <Paragraph className="text-sm text-gray-600 mb-2">
                    {technique.description}
                  </Paragraph>
                  <div className="flex items-center justify-between">
                    <Progress
                      percent={technique.confidence * 100}
                      size="small"
                      strokeColor={getTechniqueColor(technique)}
                      format={(percent) => `${percent}% confidence`}
                    />
                    <Text type="secondary" className="text-xs">
                      Applied: {technique.applied ? 'Yes' : 'No'}
                    </Text>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  // 渲染性能指标
  const renderPerformanceMetrics = () => {
    const metrics = [
      {
        title: 'Estimated Performance Gain',
        value: optimizationResult.estimatedPerformanceGain,
        suffix: '%',
        valueStyle: { color: '#52c41a' },
        prefix: <TrophyOutlined />,
      },
      {
        title: 'Original Duration',
        value: optimizationResult.executionPlan.originalDuration,
        formatter: formatDuration,
        valueStyle: { color: '#faad14' },
        prefix: <ClockCircleOutlined />,
      },
      {
        title: 'Optimized Duration',
        value: optimizationResult.executionPlan.estimatedDuration,
        formatter: formatDuration,
        valueStyle: { color: '#52c41a' },
        prefix: <RocketOutlined />,
      },
      {
        title: 'Resource Savings',
        value: optimizationResult.executionPlan.resourceRequirements.memoryReduction || 0,
        suffix: '%',
        valueStyle: { color: '#1890ff' },
        prefix: <DatabaseOutlined />,
      },
    ];

    return (
      <Row gutter={[16, 16]}>
        {metrics.map((metric, index) => (
          <Col span={6} key={index}>
            <Card size="small">
              <Statistic {...metric} />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // 渲染警告和建议
  const renderWarningsAndRecommendations = () => {
    return (
      <div className="space-y-4">
        {optimizationResult.warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            message="优化警告"
            description={
              <ul className="mt-2 space-y-1">
                {optimizationResult.warnings.map((warning, index) => (
                  <li key={index} className="text-sm">
                    • {warning}
                  </li>
                ))}
              </ul>
            }
          />
        )}
        
        {optimizationResult.recommendations.length > 0 && (
          <Card title="优化建议" size="small">
            <List
              size="small"
              dataSource={optimizationResult.recommendations}
              renderItem={(recommendation) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge
                        color={
                          recommendation.priority === 'high' ? '#52c41a' :
                          recommendation.priority === 'medium' ? '#faad14' : '#d9d9d9'
                        }
                        count={<BulbOutlined />}
                      />
                    }
                    title={
                      <div className="flex items-center justify-between">
                        <Text strong>{recommendation.title}</Text>
                        <Tag color={
                          recommendation.priority === 'high' ? 'red' :
                          recommendation.priority === 'medium' ? 'orange' : 'blue'
                        }>
                          {recommendation.priority}
                        </Tag>
                      </div>
                    }
                    description={
                      <div>
                        <Paragraph className="text-sm text-gray-600 mb-2">
                          {recommendation.description}
                        </Paragraph>
                        <div className="flex items-center justify-between">
                          <Text type="secondary" className="text-xs">
                            预期收益: {recommendation.estimatedBenefit}%
                          </Text>
                          <Text type="secondary" className="text-xs">
                            实施成本: {recommendation.implementationCost}
                          </Text>
                        </div>
                      </div>
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

  return (
    <div className={className}>
      <Card
        title={
          <div className="flex items-center justify-between">
            <Space>
              <BarChartOutlined />
              <Title level={4} style={{ margin: 0 }}>
                查询优化分析
              </Title>
            </Space>
            <Space>
              <Select
                value={viewMode}
                onChange={setViewMode}
                size="small"
                style={{ width: 120 }}
              >
                <Option value="tree">树形视图</Option>
                <Option value="timeline">时间线</Option>
                <Option value="flow">流程图</Option>
              </Select>
              <Switch
                checked={highlightOptimizations}
                onChange={setHighlightOptimizations}
                size="small"
                checkedChildren="突出优化"
                unCheckedChildren="常规视图"
              />
              <Tooltip title="刷新分析">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onRefresh}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="导出报告">
                <Button
                  icon={<DownloadOutlined />}
                  onClick={onExport}
                  size="small"
                />
              </Tooltip>
            </Space>
          </div>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="概览" key="overview">
            <div className="space-y-6">
              {renderPerformanceMetrics()}
              <Divider />
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card title="查询对比" size="small">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="原始查询">
                        <Text code className="text-xs">
                          {optimizationResult.originalQuery.substring(0, 100)}...
                        </Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="优化查询">
                        <Text code className="text-xs">
                          {optimizationResult.optimizedQuery.substring(0, 100)}...
                        </Text>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="路由策略" size="small">
                    <Descriptions column={1} size="small">
                      <Descriptions.Item label="目标连接">
                        {optimizationResult.routingStrategy.targetConnection}
                      </Descriptions.Item>
                      <Descriptions.Item label="负载均衡">
                        {optimizationResult.routingStrategy.loadBalancing}
                      </Descriptions.Item>
                      <Descriptions.Item label="优先级">
                        {optimizationResult.routingStrategy.priority}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
              </Row>
            </div>
          </TabPane>
          
          <TabPane tab="执行计划" key="execution-plan">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text strong>执行步骤详情</Text>
                <Switch
                  checked={showDetails}
                  onChange={setShowDetails}
                  size="small"
                  checkedChildren="详细"
                  unCheckedChildren="简洁"
                />
              </div>
              
              {viewMode === 'tree' && renderExecutionTree()}
              {viewMode === 'timeline' && renderTimelineView()}
              {viewMode === 'flow' && (
                <div className="text-center p-8 text-gray-500">
                  <EyeOutlined className="text-4xl mb-4" />
                  <div>流程图视图开发中...</div>
                </div>
              )}
            </div>
          </TabPane>
          
          <TabPane tab="优化技术" key="optimization-techniques">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Text strong>应用的优化技术</Text>
                <Badge
                  count={optimizationResult.optimizationTechniques.length}
                  style={{ backgroundColor: '#52c41a' }}
                />
              </div>
              {renderOptimizationTechniques()}
            </div>
          </TabPane>
          
          <TabPane tab="警告与建议" key="warnings-recommendations">
            {renderWarningsAndRecommendations()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default QueryOptimizationVisualization;