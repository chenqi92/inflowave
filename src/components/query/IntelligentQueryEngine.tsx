import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Button, Input, Typography, Row, Col, Spin, Alert, Progress, Tag, Statistic, Switch, Select, Table, Collapse, Panel, List, Tooltip, Badge } from '@/components/ui';
// TODO: Replace these Ant Design components: Descriptions, Drawer, Timeline
import { Space, toast, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';

import { MemoryOutlined, CpuOutlined, HddOutlined, NetworkOutlined, ShareAltOutlined, ExperimentOutlined, SafetyCertificateOutlined } from '@/components/ui';
import { Zap, Rocket, BarChart, Settings, Info, Eye, Download, RefreshCw, Lightbulb, Clock, Database, TrendingUp, Trophy, Flame, History, Webhook, Star, PlayCircle, PauseCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { intelligentQueryEngine, type QueryOptimizationResult, type QueryContext } from '@/services/intelligentQuery';
import { showMessage } from '@/utils/message';
import CodeEditor from '@/components/common/CodeEditor';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface IntelligentQueryEngineProps {
  className?: string;
}

export const IntelligentQueryEngine: React.FC<IntelligentQueryEngineProps> = ({
  className}) => {
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
    maxOptimizationTime: 5000});

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
            cachePreference: optimizationConfig.enableCaching ? 'aggressive' : 'disabled'},
          systemLoad: {
            cpuUsage: 50,
            memoryUsage: 60,
            diskIo: 30,
            networkLatency: 20},
          dataSize: {
            totalRows: 1000000,
            totalSize: 1024 * 1024 * 1024,
            averageRowSize: 1024,
            compressionRatio: 0.3},
          indexInfo: []} as QueryContext};

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
          <div>
            <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4}>
                  <Zap className="w-4 h-4"  /> 智能查询优化器
                </Title>
                <div className="flex gap-2">
                  <Switch
                    checked={autoOptimize}
                    onValueChange={setAutoOptimize}
                    checkedChildren="自动优化"
                    unCheckedChildren="手动优化"
                  />
                  <Button
                    icon={<Settings className="w-4 h-4"  />}
                    onClick={() => setSettingsVisible(true)}
                  >
                    设置
                  </Button>
                </div>
              </div>
              
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Select
                    value={database}
                    onValueChange={setDatabase}
                    placeholder="选择数据库"
                    style={{ width: '100%' }}
                  >
                    <Select.Option value="default">默认数据库</Select.Option>
                    <Select.Option value="analytics">分析数据库</Select.Option>
                    <Select.Option value="cache">缓存数据库</Select.Option>
                  </Select>
                </Col>
                <Col span={16}>
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      icon={<Rocket className="w-4 h-4"  />}
                      onClick={optimizeQuery}
                      disabled={loading}
                    >
                      优化查询
                    </Button>
                    <Button
                      icon={<RefreshCw className="w-4 h-4"  />}
                      onClick={clearCache}
                    >
                      清空缓存
                    </Button>
                    <Button
                      icon={<Download className="w-4 h-4"  />}
                      onClick={() => {
                        if (optimizationResult) {
                          const blob = new Blob([JSON.stringify(optimizationResult, null, 2)], {
                            type: 'application/json'});
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
                  </div>
                </Col>
              </Row>
              
              <div>
                <Text strong>原始查询</Text>
                <CodeEditor
                  value={query}
                  onValueChange={setQuery}
                  language="sql"
                  height="200px"
                  placeholder="输入您的SQL查询语句..."
                />
              </div>
            </div>
          </div>
        </Col>
      </Row>

      {optimizationResult && (
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <div title="优化结果">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div size="small" title="优化后查询">
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
                  </div>
                </Col>
                <Col span={12}>
                  <div size="small" title="性能指标">
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
                  </div>
                </Col>
              </Row>
              
              <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                <Col span={8}>
                  <div size="small" title="优化技术">
                    <List
                      size="small"
                      dataSource={optimizationResult.optimizationTechniques}
                      renderItem={(technique) => (
                        <List.Item>
                          <List.Item.Meta
                            avatar={
                              <Badge
                                count={`${technique.estimatedGain  }%`}
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
                  </div>
                </Col>
                <Col span={8}>
                  <div size="small" title="路由策略">
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
                  </div>
                </Col>
                <Col span={8}>
                  <div size="small" title="执行计划">
                    <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                      <Timeline size="small">
                        {optimizationResult.executionPlan.steps.map((step, index) => (
                          <Timeline.Item
                            key={step.id}
                            dot={step.canParallelize ? <Webhook className="w-4 h-4"  /> : <Clock className="w-4 h-4"  />}
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
                  </div>
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
                <div size="small" title="优化建议" style={{ marginTop: '16px' }}>
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
                </div>
              )}
            </div>
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
          <div>
            <Statistic
              title="总查询数"
              value={queryStats?.totalQueries || 0}
              prefix={<Database className="w-4 h-4"  />}
            />
          </div>
        </Col>
        <Col span={6}>
          <div>
            <Statistic
              title="平均执行时间"
              value={queryStats?.avgExecutionTime || 0}
              suffix="ms"
              prefix={<Clock className="w-4 h-4"  />}
            />
          </div>
        </Col>
        <Col span={6}>
          <div>
            <Statistic
              title="缓存命中率"
              value={queryStats?.cacheHitRate || 0}
              suffix="%"
              prefix={<MemoryOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </div>
        </Col>
        <Col span={6}>
          <div>
            <Statistic
              title="优化成功率"
              value={queryStats?.optimizationSuccessRate || 0}
              suffix="%"
              prefix={<Trophy className="w-4 h-4"  />}
              valueStyle={{ color: '#1890ff' }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={12}>
          <div title="慢查询统计">
            <Table
              size="small"
              dataSource={queryStats?.slowQueries || []}
              columns={[
                {
                  title: '查询',
                  dataIndex: 'query',
                  key: 'query',
                  ellipsis: true,
                  width: 200},
                {
                  title: '执行时间',
                  dataIndex: 'executionTime',
                  key: 'executionTime',
                  render: (time: number) => `${time}ms`,
                  sorter: (a: any, b: any) => a.executionTime - b.executionTime},
                {
                  title: '频次',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  sorter: (a: any, b: any) => a.frequency - b.frequency},
              ]}
              pagination={{ pageSize: 5 }}
            />
          </div>
        </Col>
        <Col span={12}>
          <div title="热门查询">
            <Table
              size="small"
              dataSource={queryStats?.frequentQueries || []}
              columns={[
                {
                  title: '查询',
                  dataIndex: 'query',
                  key: 'query',
                  ellipsis: true,
                  width: 200},
                {
                  title: '平均时间',
                  dataIndex: 'avgExecutionTime',
                  key: 'avgExecutionTime',
                  render: (time: number) => `${time}ms`,
                  sorter: (a: any, b: any) => a.avgExecutionTime - b.avgExecutionTime},
                {
                  title: '频次',
                  dataIndex: 'frequency',
                  key: 'frequency',
                  sorter: (a: any, b: any) => a.frequency - b.frequency},
              ]}
              pagination={{ pageSize: 5 }}
            />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
        <Col span={24}>
          <div title="资源使用情况">
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
          </div>
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
                icon={<Eye className="w-4 h-4"  />}
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
                  count={`${item.estimatedPerformanceGain  }%`}
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
      <div
        title={
          <div className="flex gap-2">
            <ExperimentOutlined />
            <span>智能查询优化引擎</span>
          </div>
        }
        extra={
          <div className="flex gap-2">
            <Button
              icon={<RefreshCw className="w-4 h-4"  />}
              onClick={getQueryStats}
              size="small"
            >
              刷新
            </Button>
            <Button
              icon={<Info className="w-4 h-4"  />}
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
                  width: 800});
              }}
              size="small"
            >
              帮助
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="optimizer">
              <span className="flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                查询优化器
              </span>
            </TabsTrigger>
            <TabsTrigger value="performance">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                性能监控
              </span>
            </TabsTrigger>
            <TabsTrigger value="history">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4" />
                优化历史
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optimizer">
            {renderOptimizer()}
          </TabsContent>

          <TabsContent value="performance">
            {renderPerformanceMonitor()}
          </TabsContent>

          <TabsContent value="history">
            {renderOptimizationHistory()}
          </TabsContent>
        </Tabs>
      </div>

      {/* 设置抽屉 */}
      <Drawer
        title="优化引擎设置"
        placement="right"
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
        width={400}
      >
        <div className="flex gap-2" direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>缓存设置</Text>
            <div style={{ marginTop: '8px' }}>
              <Switch
                checked={optimizationConfig.enableCaching}
                onValueChange={(checked) => setOptimizationConfig(prev => ({
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
                onValueChange={(checked) => setOptimizationConfig(prev => ({
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
                onValueChange={(checked) => setOptimizationConfig(prev => ({
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
                onValueChange={(value) => setOptimizationConfig(prev => ({
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
                onValueChange={(value) => setOptimizationConfig(prev => ({
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
        </div>
      </Drawer>
    </div>
  );
};

export default IntelligentQueryEngine;