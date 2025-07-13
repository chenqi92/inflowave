import { safeTauriInvoke } from '@/utils/tauri';
import { QueryContext, QueryExecutionResult, RoutingStrategy } from '../index';

export interface RouteCandidate {
  connectionId: string;
  score: number;
  latency: number;
  load: number;
  capacity: number;
  health: number;
  priority: number;
  tags: string[];
  metadata: RouteMetadata;
}

export interface RouteMetadata {
  nodeType: 'primary' | 'secondary' | 'cache' | 'analytics';
  region: string;
  version: string;
  capabilities: string[];
  lastHealthCheck: Date;
  avgResponseTime: number;
  errorRate: number;
  connectionCount: number;
  maxConnections: number;
}

export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'hash' | 'adaptive';
  healthCheckInterval: number;
  failoverTimeout: number;
  maxRetries: number;
  retryInterval: number;
  stickySession: boolean;
  weights: Record<string, number>;
}

export interface RoutingRule {
  name: string;
  priority: number;
  condition: (query: string, context?: QueryContext) => boolean;
  route: (candidates: RouteCandidate[]) => RouteCandidate | null;
  description: string;
}

export interface ConnectionHealth {
  connectionId: string;
  healthy: boolean;
  latency: number;
  load: number;
  errorRate: number;
  lastCheck: Date;
  consecutiveFailures: number;
  details: HealthDetails;
}

export interface HealthDetails {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  activeConnections: number;
  queueLength: number;
  lastError?: string;
}

export interface RoutingStatistics {
  totalRequests: number;
  successfulRoutes: number;
  failedRoutes: number;
  avgRoutingTime: number;
  routeDistribution: Record<string, number>;
  healthyNodes: number;
  unhealthyNodes: number;
  failoverCount: number;
  routingRules: RoutingRuleStats[];
}

export interface RoutingRuleStats {
  name: string;
  hitCount: number;
  successRate: number;
  avgExecutionTime: number;
  lastUsed: Date;
}

/**
 * 智能查询路由器
 * 
 * 核心功能：
 * 1. 智能负载均衡
 * 2. 健康检查与故障转移
 * 3. 查询路由策略
 * 4. 连接池管理
 */
export class QueryRouter {
  private candidates: Map<string, RouteCandidate> = new Map();
  private healthStatus: Map<string, ConnectionHealth> = new Map();
  private routingRules: RoutingRule[] = [];
  private loadBalancingConfig: LoadBalancingConfig;
  private routingStatistics: RoutingStatistics;
  private healthCheckTimer?: NodeJS.Timeout;
  private routingHistory: RoutingHistoryEntry[] = [];

  constructor(config?: Partial<LoadBalancingConfig>) {
    this.loadBalancingConfig = {
      strategy: 'adaptive',
      healthCheckInterval: 30000, // 30秒
      failoverTimeout: 5000, // 5秒
      maxRetries: 3,
      retryInterval: 1000, // 1秒
      stickySession: false,
      weights: {},
      ...config};

    this.routingStatistics = {
      totalRequests: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      avgRoutingTime: 0,
      routeDistribution: {},
      healthyNodes: 0,
      unhealthyNodes: 0,
      failoverCount: 0,
      routingRules: []};

    this.initializeRoutingRules();
    this.startHealthChecks();
  }

  /**
   * 确定查询路由策略
   */
  async determineRouting(
    query: string,
    defaultConnectionId: string,
    context?: QueryContext
  ): Promise<RoutingStrategy> {
    const startTime = Date.now();
    this.routingStatistics.totalRequests++;

    try {
      // 1. 获取可用候选节点
      const candidates = await this.getAvailableCandidates(query, context);
      
      // 2. 应用路由规则
      const selectedRoute = this.applyRoutingRules(query, candidates, context);
      
      // 3. 如果没有规则匹配，使用负载均衡策略
      const finalRoute = selectedRoute || this.selectByLoadBalancing(candidates);
      
      // 4. 构建路由策略
      const strategy: RoutingStrategy = {
        targetConnection: finalRoute?.connectionId || defaultConnectionId,
        loadBalancing: this.loadBalancingConfig.strategy,
        priority: finalRoute?.priority || 0,
        reason: this.getRoutingReason(finalRoute, selectedRoute !== null)};

      // 5. 记录路由历史
      this.recordRouting(query, strategy, finalRoute, Date.now() - startTime);
      
      this.routingStatistics.successfulRoutes++;
      return strategy;
    } catch (error) {
      this.routingStatistics.failedRoutes++;
      console.error('Failed to determine routing:', error);
      
      // 返回默认路由
      return {
        targetConnection: defaultConnectionId,
        loadBalancing: 'round_robin' as const,
        priority: 0,
        reason: 'Fallback to default connection due to routing error'};
    } finally {
      this.routingStatistics.avgRoutingTime = 
        (this.routingStatistics.avgRoutingTime * (this.routingStatistics.totalRequests - 1) + 
         (Date.now() - startTime)) / this.routingStatistics.totalRequests;
    }
  }

  /**
   * 注册连接节点
   */
  async registerConnection(connectionId: string, metadata: RouteMetadata): Promise<void> {
    const candidate: RouteCandidate = {
      connectionId,
      score: 0,
      latency: 0,
      load: 0,
      capacity: metadata.maxConnections,
      health: 1.0,
      priority: 1,
      tags: [],
      metadata};

    this.candidates.set(connectionId, candidate);
    
    // 初始化健康状态
    await this.updateHealthStatus(connectionId);
  }

  /**
   * 注销连接节点
   */
  async unregisterConnection(connectionId: string): Promise<void> {
    this.candidates.delete(connectionId);
    this.healthStatus.delete(connectionId);
  }

  /**
   * 更新权重
   */
  async updateWeights(query: string, executionResult: QueryExecutionResult): Promise<void> {
    const routingEntry = this.routingHistory.find(entry => 
      entry.query === query && Date.now() - entry.timestamp < 300000 // 5分钟内
    );

    if (routingEntry) {
      const candidate = this.candidates.get(routingEntry.strategy.targetConnection);
      if (candidate) {
        // 根据执行结果调整权重
        const performanceScore = this.calculatePerformanceScore(executionResult);
        candidate.score = (candidate.score * 0.8) + (performanceScore * 0.2);
        
        // 更新权重配置
        this.loadBalancingConfig.weights[candidate.connectionId] = candidate.score;
      }
    }
  }

  /**
   * 获取路由统计信息
   */
  getStatistics(): RoutingStatistics {
    // 更新健康节点统计
    let healthyCount = 0;
    let unhealthyCount = 0;
    
    this.healthStatus.forEach(health => {
      if (health.healthy) {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    });

    this.routingStatistics.healthyNodes = healthyCount;
    this.routingStatistics.unhealthyNodes = unhealthyCount;

    return { ...this.routingStatistics };
  }

  /**
   * 添加路由规则
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.push(rule);
    this.routingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 移除路由规则
   */
  removeRoutingRule(ruleName: string): void {
    this.routingRules = this.routingRules.filter(rule => rule.name !== ruleName);
  }

  /**
   * 手动触发健康检查
   */
  async triggerHealthCheck(): Promise<void> {
    const promises = Array.from(this.candidates.keys()).map(connectionId => 
      this.updateHealthStatus(connectionId)
    );
    await Promise.all(promises);
  }

  /**
   * 获取可用候选节点
   */
  private async getAvailableCandidates(
    query: string,
    context?: QueryContext
  ): Promise<RouteCandidate[]> {
    const candidates: RouteCandidate[] = [];
    
    for (const [connectionId, candidate] of this.candidates.entries()) {
      const health = this.healthStatus.get(connectionId);
      
      // 只考虑健康的节点
      if (health?.healthy) {
        // 更新候选节点分数
        candidate.score = this.calculateCandidateScore(candidate, health, query, context);
        candidates.push(candidate);
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * 应用路由规则
   */
  private applyRoutingRules(
    query: string,
    candidates: RouteCandidate[],
    context?: QueryContext
  ): RouteCandidate | null {
    for (const rule of this.routingRules) {
      if (rule.condition(query, context)) {
        const selectedRoute = rule.route(candidates);
        if (selectedRoute) {
          // 记录规则使用统计
          this.updateRuleStats(rule.name);
          return selectedRoute;
        }
      }
    }
    return null;
  }

  /**
   * 使用负载均衡策略选择节点
   */
  private selectByLoadBalancing(candidates: RouteCandidate[]): RouteCandidate | null {
    if (candidates.length === 0) return null;

    switch (this.loadBalancingConfig.strategy) {
      case 'round_robin':
        return this.selectRoundRobin(candidates);
      case 'least_connections':
        return this.selectLeastConnections(candidates);
      case 'weighted':
        return this.selectWeighted(candidates);
      case 'hash':
        return this.selectHash(candidates);
      case 'adaptive':
        return this.selectAdaptive(candidates);
      default:
        return candidates[0];
    }
  }

  /**
   * 轮询选择
   */
  private selectRoundRobin(candidates: RouteCandidate[]): RouteCandidate {
    const index = this.routingStatistics.totalRequests % candidates.length;
    return candidates[index];
  }

  /**
   * 最少连接选择
   */
  private selectLeastConnections(candidates: RouteCandidate[]): RouteCandidate {
    return candidates.reduce((min, candidate) => 
      candidate.load < min.load ? candidate : min
    );
  }

  /**
   * 加权选择
   */
  private selectWeighted(candidates: RouteCandidate[]): RouteCandidate {
    const totalWeight = candidates.reduce((sum, candidate) => 
      sum + (this.loadBalancingConfig.weights[candidate.connectionId] || 1), 0
    );
    
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    
    for (const candidate of candidates) {
      currentWeight += this.loadBalancingConfig.weights[candidate.connectionId] || 1;
      if (random <= currentWeight) {
        return candidate;
      }
    }
    
    return candidates[0];
  }

  /**
   * 哈希选择
   */
  private selectHash(candidates: RouteCandidate[]): RouteCandidate {
    const hash = this.hashString(JSON.stringify(candidates.map(c => c.connectionId)));
    const index = Math.abs(hash) % candidates.length;
    return candidates[index];
  }

  /**
   * 自适应选择
   */
  private selectAdaptive(candidates: RouteCandidate[]): RouteCandidate {
    // 综合考虑负载、延迟、健康状态等因素
    return candidates.reduce((best, candidate) => {
      const bestScore = this.calculateAdaptiveScore(best);
      const candidateScore = this.calculateAdaptiveScore(candidate);
      return candidateScore > bestScore ? candidate : best;
    });
  }

  /**
   * 计算自适应分数
   */
  private calculateAdaptiveScore(candidate: RouteCandidate): number {
    const health = this.healthStatus.get(candidate.connectionId);
    if (!health || !health.healthy) return 0;

    // 权重：健康状态(40%) + 负载(30%) + 延迟(20%) + 容量(10%)
    const healthScore = candidate.health * 0.4;
    const loadScore = (1 - candidate.load) * 0.3;
    const latencyScore = (1 - Math.min(candidate.latency / 1000, 1)) * 0.2;
    const capacityScore = (candidate.capacity - health.details.activeConnections) / candidate.capacity * 0.1;

    return healthScore + loadScore + latencyScore + capacityScore;
  }

  /**
   * 计算候选节点分数
   */
  private calculateCandidateScore(
    candidate: RouteCandidate,
    health: ConnectionHealth,
    query: string,
    context?: QueryContext
  ): number {
    let score = 0;

    // 基础健康分数
    score += health.healthy ? 50 : 0;

    // 负载分数 (负载越低分数越高)
    score += (1 - candidate.load) * 20;

    // 延迟分数 (延迟越低分数越高)
    score += Math.max(0, 20 - candidate.latency / 10);

    // 容量分数
    const utilizationRate = health.details.activeConnections / candidate.capacity;
    score += (1 - utilizationRate) * 10;

    // 错误率惩罚
    score -= health.errorRate * 30;

    // 查询类型匹配
    if (context && this.matchesQueryType(candidate, query, context)) {
      score += 20;
    }

    return Math.max(0, score);
  }

  /**
   * 检查查询类型匹配
   */
  private matchesQueryType(
    candidate: RouteCandidate,
    query: string,
    context: QueryContext
  ): boolean {
    const queryType = query.trim().toLowerCase();
    
    // 分析查询路由到专用节点
    if (queryType.startsWith('select') && candidate.metadata.nodeType === 'analytics') {
      return true;
    }

    // 写操作路由到主节点
    if ((queryType.startsWith('insert') || queryType.startsWith('update') || 
         queryType.startsWith('delete')) && candidate.metadata.nodeType === 'primary') {
      return true;
    }

    // 缓存查询路由到缓存节点
    if (candidate.metadata.nodeType === 'cache' && context.userPreferences.cachePreference !== 'disabled') {
      return true;
    }

    return false;
  }

  /**
   * 更新健康状态
   */
  private async updateHealthStatus(connectionId: string): Promise<void> {
    try {
      const healthData = await safeTauriInvoke<HealthDetails>('check_connection_health', {
        connectionId});

      if (!healthData) {
        throw new Error('No health data received');
      }

      const health: ConnectionHealth = {
        connectionId,
        healthy: this.isHealthy(healthData),
        latency: healthData.networkLatency,
        load: healthData.cpuUsage / 100,
        errorRate: 0, // 需要从历史数据计算
        lastCheck: new Date(),
        consecutiveFailures: 0,
        details: healthData};

      this.healthStatus.set(connectionId, health);
      
      // 更新候选节点信息
      const candidate = this.candidates.get(connectionId);
      if (candidate) {
        candidate.health = health.healthy ? 1.0 : 0.0;
        candidate.latency = health.latency;
        candidate.load = health.load;
      }
    } catch (error) {
      console.error(`Health check failed for ${connectionId}:`, error);
      
      // 记录失败
      const existingHealth = this.healthStatus.get(connectionId);
      if (existingHealth) {
        existingHealth.healthy = false;
        existingHealth.consecutiveFailures++;
        existingHealth.lastCheck = new Date();
      }
    }
  }

  /**
   * 判断连接是否健康
   */
  private isHealthy(healthData: HealthDetails): boolean {
    return (
      healthData.cpuUsage < 90 &&
      healthData.memoryUsage < 90 &&
      healthData.diskUsage < 95 &&
      healthData.networkLatency < 1000 &&
      healthData.activeConnections < healthData.queueLength * 0.8
    );
  }

  /**
   * 初始化路由规则
   */
  private initializeRoutingRules(): void {
    // 读写分离规则
    this.addRoutingRule({
      name: 'read_write_separation',
      priority: 100,
      condition: (query) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        const lowerQuery = queryStr.toLowerCase().trim();
        return lowerQuery.startsWith('select') || lowerQuery.startsWith('show');
      },
      route: (candidates) => {
        const readReplicas = candidates.filter(c => 
          c.metadata.nodeType === 'secondary' || c.metadata.nodeType === 'analytics'
        );
        return readReplicas.length > 0 ? readReplicas[0] : candidates[0];
      },
      description: 'Route read queries to secondary or analytics nodes'});

    // 大查询路由规则
    this.addRoutingRule({
      name: 'large_query_routing',
      priority: 90,
      condition: (query, context) => {
        const queryStr = typeof query === 'string' ? query : String(query);
        return (context?.dataSize?.totalRows || 0) > 1000000 || 
               queryStr.toLowerCase().includes('group by') ||
               queryStr.toLowerCase().includes('order by');
      },
      route: (candidates) => {
        const analyticsNodes = candidates.filter(c => c.metadata.nodeType === 'analytics');
        return analyticsNodes.length > 0 ? analyticsNodes[0] : null;
      },
      description: 'Route large or complex queries to analytics nodes'});

    // 地理位置路由规则
    this.addRoutingRule({
      name: 'geographic_routing',
      priority: 80,
      condition: (query, context) => {
        return (context?.systemLoad?.networkLatency || 0) > 100;
      },
      route: (candidates) => {
        // 选择延迟最低的节点
        return candidates.reduce((best, candidate) => 
          candidate.latency < best.latency ? candidate : best
        );
      },
      description: 'Route queries to geographically closest nodes'});
  }

  /**
   * 启动健康检查
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.triggerHealthCheck();
    }, this.loadBalancingConfig.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  public stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * 记录路由历史
   */
  private recordRouting(
    query: string,
    strategy: RoutingStrategy,
    candidate: RouteCandidate | null,
    routingTime: number
  ): void {
    const entry: RoutingHistoryEntry = {
      query: query.substring(0, 200), // 限制查询长度
      strategy,
      candidate: candidate ? {
        connectionId: candidate.connectionId,
        score: candidate.score,
        latency: candidate.latency,
        load: candidate.load} : null,
      routingTime,
      timestamp: Date.now()};

    this.routingHistory.push(entry);
    
    // 保持最近1000条记录
    if (this.routingHistory.length > 1000) {
      this.routingHistory.shift();
    }

    // 更新路由分发统计
    this.routingStatistics.routeDistribution[strategy.targetConnection] = 
      (this.routingStatistics.routeDistribution[strategy.targetConnection] || 0) + 1;
  }

  /**
   * 获取路由原因
   */
  private getRoutingReason(candidate: RouteCandidate | null, ruleMatched: boolean): string {
    if (!candidate) {
      return 'No suitable candidate found, using default connection';
    }

    if (ruleMatched) {
      return 'Routed by matching routing rule';
    }

    return `Routed by ${this.loadBalancingConfig.strategy} load balancing (score: ${candidate.score.toFixed(2)})`;
  }

  /**
   * 更新规则统计
   */
  private updateRuleStats(ruleName: string): void {
    let ruleStats = this.routingStatistics.routingRules.find(r => r.name === ruleName);
    if (!ruleStats) {
      ruleStats = {
        name: ruleName,
        hitCount: 0,
        successRate: 1.0,
        avgExecutionTime: 0,
        lastUsed: new Date()};
      this.routingStatistics.routingRules.push(ruleStats);
    }

    ruleStats.hitCount++;
    ruleStats.lastUsed = new Date();
  }

  /**
   * 计算性能分数
   */
  private calculatePerformanceScore(result: QueryExecutionResult): number {
    let score = 1.0;

    // 执行时间惩罚
    if (result.executionTime > 10000) { // 10秒
      score *= 0.5;
    } else if (result.executionTime > 5000) { // 5秒
      score *= 0.7;
    } else if (result.executionTime > 1000) { // 1秒
      score *= 0.9;
    }

    // 成功率奖励
    if (result.success) {
      score *= 1.1;
    } else {
      score *= 0.3;
    }

    // 资源使用惩罚
    if (result.memoryUsed > 1024 * 1024 * 1024) { // 1GB
      score *= 0.8;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 哈希字符串
   */
  private hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return hash;
  }
}

interface RoutingHistoryEntry {
  query: string;
  strategy: RoutingStrategy;
  candidate: {
    connectionId: string;
    score: number;
    latency: number;
    load: number;
  } | null;
  routingTime: number;
  timestamp: number;
}

export default QueryRouter;