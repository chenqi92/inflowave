import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tabs,
  Button,
  Input,
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Alert,
  Progress,
  Tag,
  Descriptions,
  List,
  Statistic,
  Switch,
  Select,
  Tooltip,
  Modal,
  Drawer,
  Timeline,
  Badge,
  Collapse,
  Table,
  message,
} from '@/components/ui';
import {
  ThunderboltOutlined,
  RocketOutlined,
  BarChartOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  BulbOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  TrophyOutlined,
  FireOutlined,
  MemoryOutlined,
  CpuOutlined,
  HddOutlined,
  NetworkOutlined,
  HistoryOutlined,
  ShareAltOutlined,
  ApiOutlined,
  ExperimentOutlined,
  StarOutlined,
  SafetyCertificateOutlined,
} from '@/components/ui';
import { useConnectionStore } from '@/store/connection';
import { intelligentQueryEngine, type QueryOptimizationResult, type QueryContext } from '@/services/intelligentQuery';
import { showMessage } from '@/utils/message';
import CodeEditor from '@/components/common/CodeEditor';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface IntelligentQueryEngineProps {
  className?: string;
}

export const IntelligentQueryEngine: React.FC<IntelligentQueryEngineProps> = ({
  className,
}) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const [query, setQuery] = useState('');
  const [database, setDatabase] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<QueryOptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState('optimizer');
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [optimizationHistory, setOptimizationHistory] = useState<QueryOptimizationResult[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [queryStats, setQueryStats] = useState<any>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [optimizationConfig, setOptimizationConfig] = useState({
    enableCaching: true,
    enableRouting: true,
    enablePrediction: true,
    optimizationLevel: 'balanced' as 'conservative' | 'balanced' | 'aggressive',
    maxOptimizationTime: 5000,
  });

  // 获取查询统计
  const getQueryStats = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      const stats = await intelligentQueryEngine.getQueryStats(activeConnectionId);
      setQueryStats(stats);
    } catch (error) {
      console.error('获取查询统计失败:', error);
    }
  }, [activeConnectionId]);

  // 优化查询
  const optimizeQuery = useCallback(async () => {
    if (!activeConnectionId || !query.trim()) {
      showMessage.warning('请选择连接并输入查询语句');
      return;
    }

    setLoading(true);
    try {
      const request = {
        query: query.trim(),
        connectionId: activeConnectionId,
        database: database || 'default',
        context: {
          historicalQueries: optimizationHistory.map(h => h.originalQuery),
          userPreferences: {
            preferredPerformance: optimizationConfig.optimizationLevel,
            maxQueryTime: optimizationConfig.maxOptimizationTime,
            cachePreference: optimizationConfig.enableCaching ? 'aggressive' : 'disabled',
          },
          systemLoad: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskIo: 30,
            networkLatency: 20,
          },
          dataSize: {
            totalRows: 1000000,
            totalSize: 1024 * 1024 * 1024,
            averageRowSize: 1024,
            compressionRatio: 0.3,
          },
          indexInfo: [],
        } as QueryContext,
      };

      const result = await intelligentQueryEngine.optimizeQuery(request);
      setOptimizationResult(result);
      
      // 添加到历史记录
      setOptimizationHistory(prev => [result, ...prev.slice(0, 9)]);
      
      showMessage.success('查询优化完成');
    } catch (error) {
      console.error('查询优化失败:', error);
      showMessage.error('查询优化失败');
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, query, database, optimizationConfig, optimizationHistory]);

  // 获取优化建议
  const getOptimizationRecommendations = useCallback(async () => {
    if (!activeConnectionId) return;

    try {
      const recommendations = await intelligentQueryEngine.getOptimizationRecommendations(activeConnectionId);
      return recommendations;
    } catch (error) {
      console.error('获取优化建议失败:', error);
      return [];
    }
  }, [activeConnectionId]);

  // 清空缓存
  const clearCache = useCallback(async () => {
    try {
      await intelligentQueryEngine.clearCache();
      showMessage.success('缓存已清空');
    } catch (error) {
      console.error('清空缓存失败:', error);
      showMessage.error('清空缓存失败');
    }
  }, []);

  useEffect(() => {
    getQueryStats();
  }, [getQueryStats]);

  // 自动优化
  useEffect(() => {
    if (autoOptimize && query.trim()) {
      const timer = setTimeout(() => {
        optimizeQuery();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [query, autoOptimize, optimizeQuery]);

  // 渲染优化器界面
  const renderOptimizer = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4}>
                  <ThunderboltOutlined /> 智能查询优化器
                </Title>
                <Space>
                  <Switch
                    checked={autoOptimize}
                    onChange={setAutoOptimize}
                    checkedChildren="自动优化"
                    unCheckedChildren="手动优化"
                  />
                  <Button
                    icon={<SettingOutlined />}
                    onClick={() => setSettingsVisible(true)}
                  >
                    设置
                  </Button>
                </Space>
              </div>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Select
                    value={database}
                    onChange={setDatabase}
                    placeholder="选择数据库"
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="default">默认数据库</Select.Option>
                    <Select.Option value="analytics">分析数据库</Select.Option>
                    <Select.Option value="cache">缓存数据库</Select.Option>
                  </Select>
                </Col>
                <Col span={16}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<RocketOutlined />}
                      onClick={optimizeQuery}
                      loading={loading}
                    >
                      优化查询
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={clearCache}
                    >
                      清空缓存
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        if (optimizationResult) {
                          const blob = new Blob([JSON.stringify(optimizationResult, null, 2)], {
                            type: 'application/json',
                          });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `optimization-result-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                      disabled={!optimizationResult}
                    >
                      导出结果
                    </Button>
                  </Space>
                </Col>
              </Row>
              
              <div>
                <Text strong>原始查询</Text>
                <CodeEditor
                  value={query}
                  onChange={setQuery}
                  language="sql"
                  height="200px"
                  placeholder="输入您的SQL查询语句..."
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {optimizationResult && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card title="优化结果">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Card size="small" title="优化后查询">
                    <pre style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {optimizationResult.optimizedQuery}
                    </pre>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" title="性能指标">
                    <Row gutter={[8, 8]}>
                      <Col span={12}>
                        <Statistic
                          title="预期性能提升"
                          value={optimizationResult.estimatedPerformanceGain}
                          suffix="%"
                          valueStyle={{ color: '#3f8600' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="优化技术数"
                          value={optimizationResult.optimizationTechniques.length}
                          suffix="项"
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
              
              <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={8}>
                  <Card size="small" title="优化技术">
                    <List
                      size="small"
                      dataSource={optimizationResult.optimizationTechniques}
                      renderItem={(technique) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Badge
                                count={technique.estimatedGain + '%'}
                                style={{ backgroundColor: 
                                  technique.impact === 'high' ? '#52c41a' :
                                  technique.impact === 'medium' ? '#faad14' : '#d9d9d9'
                                }}
                              />
                            }
                            title={technique.name}
                            description={technique.description}
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="路由策略">
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
                      <Descriptions.Item label="原因">
                        {optimizationResult.routingStrategy.reason}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" title="执行计划">
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      <Timeline size="small">
                        {optimizationResult.executionPlan.steps.map((step, index) => (
                          <Timeline.Item
                            key={step.id}
                            dot={step.canParallelize ? <ApiOutlined /> : <ClockCircleOutlined />}
                            color={step.canParallelize ? 'green' : 'blue'}
                          >
                            <div>
                              <Text strong>{step.operation}</Text>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {step.description}
                              </div>
                              <div style={{ fontSize: '11px', color: '#999' }}>
                                成本: {step.estimatedCost}
                              </div>
                            </div>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    </div>
                  </Card>
                </Col>
              </Row>
              
              {optimizationResult.warnings.length > 0 && (
                <Alert
                  message="优化警告"
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      {optimizationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  }
                  type="warning"
                  showIcon
                  style={{ marginTop: '16px' }}
                />
              )}
              
              {optimizationResult.recommendations.length > 0 && (
                <Card size="small" title="优化建议" style={{ marginTop: '16px' }}>
                  <List
                    size="small"
                    dataSource={optimizationResult.recommendations}
                    renderItem={(recommendation) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Tag color={
                              recommendation.priority === 'high' ? 'red' :
                              recommendation.priority === 'medium' ? 'orange' : 'blue'
                            }>
                              {recommendation.priority.toUpperCase()}
                            </Tag>
                          }
                          title={recommendation.title}
                          description={
                            <div>
                              <Paragraph style={{ marginBottom: '8px' }}>
                                {recommendation.description}
                              </Paragraph>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                预期收益: {recommendation.estimatedBenefit}%
                              </Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );

  // 渲染性能监控界面
  const renderPerformanceMonitor = () => (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总查询数"
              value={queryStats?.totalQueries || 0}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均执行时间"
              value={queryStats?.avgExecutionTime || 0}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="缓存命中率"
              value={queryStats?.cacheHitRate || 0}
              suffix="%"
              prefix={<MemoryOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="优化成功率"
              value={queryStats?.optimizationSuccessRate || 0}
              suffix="%"
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={12}>
          <Card title="慢查询统计">
            <Table
              size="small"
              dataSource={queryStats?.slowQueries || []}
              columns={[
                {
                  title: '查询',
                  dataIndex: 'query',
                  key: 'query',
                  ellipsis: true,
                  width: 200,
                },
                {
                  title: '执行时间',
                  dataIndex: 'executionTime',
                  key: 'executionTime',
                  render: (time: number) => `${time}ms`,
                  sorter: (a: any, b: any) => a.executionTime - b.executionTime,
                },
                {
                  title: '频次',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  sorter: (a: any, b: any) => a.frequency - b.frequency,
                },
              ]}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="热门查询">
            <Table
              size="small"
              dataSource={queryStats?.frequentQueries || []}
              columns={[
                {
                  title: '查询',
                  dataIndex: 'query',
                  key: 'query',
                  ellipsis: true,
                  width: 200,
                },
                {
                  title: '平均时间',
                  dataIndex: 'avgExecutionTime',
                  key: 'avgExecutionTime',
                  render: (time: number) => `${time}ms`,
                  sorter: (a: any, b: any) => a.avgExecutionTime - b.avgExecutionTime,
                },
                {
                  title: '频次',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  sorter: (a: any, b: any) => a.frequency - b.frequency,
                },
              ]}
              pagination={{ pageSize: 5 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <Card title="资源使用情况">
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <CpuOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text>CPU使用率</Text>
                    <Progress
                      percent={queryStats?.resourceUtilization?.avgCpuUsage || 0}
                      size="small"
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <MemoryOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text>内存使用率</Text>
                    <Progress
                      percent={queryStats?.resourceUtilization?.avgMemoryUsage || 0}
                      size="small"
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <HddOutlined style={{ fontSize: '24px', color: '#faad14' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text>I/O使用率</Text>
                    <Progress
                      percent={queryStats?.resourceUtilization?.avgIoUsage || 0}
                      size="small"
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div style={{ textAlign: 'center' }}>
                  <NetworkOutlined style={{ fontSize: '24px', color: '#722ed1' }} />
                  <div style={{ marginTop: '8px' }}>
                    <Text>网络使用率</Text>
                    <Progress
                      percent={queryStats?.resourceUtilization?.avgNetworkUsage || 0}
                      size="small"
                      style={{ marginTop: '4px' }}
                    />
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );

  // 渲染优化历史界面
  const renderOptimizationHistory = () => (
    <div>
      <List
        dataSource={optimizationHistory}
        renderItem={(item, index) => (
          <List.Item
            actions={[
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setOptimizationResult(item)}
              >
                查看
              </Button>,
              <Button
                size="small"
                icon={<ShareAltOutlined />}
                onClick={() => setQuery(item.optimizedQuery)}
              >
                使用
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={
                <Badge
                  count={item.estimatedPerformanceGain + '%'}
                  style={{ backgroundColor: '#52c41a' }}
                />
              }
              title={
                <div>
                  <Text strong>优化 #{index + 1}</Text>
                  <Tag color="blue" style={{ marginLeft: '8px' }}>
                    {item.optimizationTechniques.length} 项技术
                  </Tag>
                </div>
              }
              description={
                <div>
                  <Text ellipsis style={{ width: '400px' }}>
                    {item.originalQuery}
                  </Text>
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      目标: {item.routingStrategy.targetConnection}
                    </Text>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <div className={className}>
      <Card
        title={
          <Space>
            <ExperimentOutlined />
            <span>智能查询优化引擎</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={getQueryStats}
              size="small"
            >
              刷新
            </Button>
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => {
                Modal.info({
                  title: '智能查询优化引擎',
                  content: (
                    <div>
                      <p>智能查询优化引擎提供以下功能：</p>
                      <ul>
                        <li>🚀 智能查询优化</li>
                        <li>📊 性能预测分析</li>
                        <li>🔄 智能路由分配</li>
                        <li>💾 自适应缓存</li>
                        <li>📈 实时性能监控</li>
                        <li>🎯 个性化建议</li>
                      </ul>
                    </div>
                  ),
                  width: 600,
                });
              }}
              size="small"
            >
              帮助
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane 
            tab={
              <span>
                <RocketOutlined />
                查询优化器
              </span>
            } 
            key="optimizer"
          >
            {renderOptimizer()}
          </Tabs.TabPane>
          
          <Tabs.TabPane 
            tab={
              <span>
                <LineChartOutlined />
                性能监控
              </span>
            } 
            key="performance"
          >
            {renderPerformanceMonitor()}
          </Tabs.TabPane>
          
          <Tabs.TabPane 
            tab={
              <span>
                <HistoryOutlined />
                优化历史
              </span>
            } 
            key="history"
          >
            {renderOptimizationHistory()}
          </Tabs.TabPane>
        </Tabs>
      </Card>

      {/* 设置抽屉 */}
      <Drawer
        title="优化引擎设置"
        placement="right"
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>缓存设置</Text>
            <div style={{ marginTop: '8px' }}>
              <Switch
                checked={optimizationConfig.enableCaching}
                onChange={(checked) => setOptimizationConfig(prev => ({
                  ...prev,
                  enableCaching: checked
                }))}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
              <Text style={{ marginLeft: '8px' }}>启用智能缓存</Text>
            </div>
          </div>
          
          <div>
            <Text strong>路由设置</Text>
            <div style={{ marginTop: '8px' }}>
              <Switch
                checked={optimizationConfig.enableRouting}
                onChange={(checked) => setOptimizationConfig(prev => ({
                  ...prev,
                  enableRouting: checked
                }))}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
              <Text style={{ marginLeft: '8px' }}>启用智能路由</Text>
            </div>
          </div>
          
          <div>
            <Text strong>性能预测</Text>
            <div style={{ marginTop: '8px' }}>
              <Switch
                checked={optimizationConfig.enablePrediction}
                onChange={(checked) => setOptimizationConfig(prev => ({
                  ...prev,
                  enablePrediction: checked
                }))}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
              <Text style={{ marginLeft: '8px' }}>启用性能预测</Text>
            </div>
          </div>
          
          <div>
            <Text strong>优化级别</Text>
            <div style={{ marginTop: '8px' }}>
              <Select
                value={optimizationConfig.optimizationLevel}
                onChange={(value) => setOptimizationConfig(prev => ({
                  ...prev,
                  optimizationLevel: value
                }))}
                style={{ width: '100%' }}
              >
                <Select.Option value="conservative">保守</Select.Option>
                <Select.Option value="balanced">平衡</Select.Option>
                <Select.Option value="aggressive">激进</Select.Option>
              </Select>
            </div>
          </div>
          
          <div>
            <Text strong>最大优化时间</Text>
            <div style={{ marginTop: '8px' }}>
              <Select
                value={optimizationConfig.maxOptimizationTime}
                onChange={(value) => setOptimizationConfig(prev => ({
                  ...prev,
                  maxOptimizationTime: value
                }))}
                style={{ width: '100%' }}
              >
                <Select.Option value={1000}>1秒</Select.Option>
                <Select.Option value={3000}>3秒</Select.Option>
                <Select.Option value={5000}>5秒</Select.Option>
                <Select.Option value={10000}>10秒</Select.Option>
              </Select>
            </div>
          </div>
        </Space>
      </Drawer>
    </div>
  );
};

export default IntelligentQueryEngine;