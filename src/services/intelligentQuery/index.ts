import { QueryOptimizer } from './optimizer/QueryOptimizer';
import { QueryAnalyzer } from './analyzer/QueryAnalyzer';
import { IntelligentCache } from './cache/IntelligentCache';
import QueryRouter from './router/QueryRouter';
import PerformancePredictor from './predictor/PerformancePredictor';
import MLOptimizer from './ml/MLOptimizer';
import OptimizationHistory from './history/OptimizationHistory';
import { safeTauriInvoke } from '@/utils/tauri';

export interface QueryOptimizationRequest {
  query: string;
  connectionId: string;
  database: string;
  userId?: string;
  context?: QueryContext;
}

export interface QueryContext {
  historicalQueries: string[];
  userPreferences: UserPreferences;
  systemLoad: SystemLoad;
  dataSize: DataSize;
  indexInfo: IndexInfo[];
}

export interface UserPreferences {
  preferredPerformance: 'speed' | 'accuracy' | 'balanced';
  maxQueryTime: number;
  cachePreference: 'aggressive' | 'conservative' | 'disabled';
}

export interface SystemLoad {
  cpuUsage: number;
  memoryUsage: number;
  diskIo: number;
  networkLatency: number;
}

export interface DataSize {
  totalRows: number;
  totalSize: number;
  averageRowSize: number;
  compressionRatio: number;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  size: number;
  usage: number;
  lastUsed: Date;
}

export interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  optimizationTechniques: OptimizationTechnique[];
  estimatedPerformanceGain: number;
  cacheKey?: string;
  routingStrategy: RoutingStrategy;
  executionPlan: ExecutionPlan;
  warnings: string[];
  recommendations: Recommendation[];
}

export interface OptimizationTechnique {
  name: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  appliedTo: string[];
  estimatedGain: number;
}

export interface RoutingStrategy {
  targetConnection: string;
  loadBalancing: 'round_robin' | 'least_connections' | 'weighted' | 'hash' | 'adaptive';
  priority: number;
  reason: string;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  parallelization: ParallelizationInfo;
  resourceRequirements: ResourceRequirements;
  estimatedDuration: number;
}

export interface ExecutionStep {
  id: string;
  operation: string;
  description: string;
  estimatedCost: number;
  dependencies: string[];
  canParallelize: boolean;
}

export interface ParallelizationInfo {
  maxDegreeOfParallelism: number;
  parallelSteps: string[][];
  bottlenecks: string[];
}

export interface ResourceRequirements {
  minMemory: number;
  maxMemory: number;
  cpuIntensive: boolean;
  ioIntensive: boolean;
  networkIntensive: boolean;
}

export interface Recommendation {
  type: 'index' | 'query_rewrite' | 'caching' | 'partitioning' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  estimatedBenefit: number;
}

/**
 * 智能查询优化引擎
 * 
 * 核心功能：
 * 1. 查询性能分析和优化
 * 2. 智能缓存管理
 * 3. 查询路由和负载均衡
 * 4. 性能预测和建议
 */
export class IntelligentQueryEngine {
  private optimizer: QueryOptimizer;
  private analyzer: QueryAnalyzer;
  private cache: IntelligentCache;
  private router: QueryRouter;
  private predictor: PerformancePredictor;
  private history: OptimizationHistory;

  constructor() {
    this.optimizer = new QueryOptimizer();
    this.analyzer = new QueryAnalyzer();
    this.cache = new IntelligentCache();
    this.router = new QueryRouter();
    this.predictor = new PerformancePredictor();
    this.history = new OptimizationHistory();
  }

  /**
   * 优化查询
   */
  async optimizeQuery(request: QueryOptimizationRequest): Promise<QueryOptimizationResult> {
    const { query, connectionId, database, context } = request;

    // 1. 分析查询特征
    const analysis = await this.analyzer.analyzeQuery(query, context);
    
    // 2. 检查缓存
    const cacheKey = this.cache.generateCacheKey(query, connectionId, database);
    const cachedResult = await this.cache.get(cacheKey);
    
    if (cachedResult && this.cache.isValid(cachedResult)) {
      return {
        ...cachedResult,
        optimizationTechniques: [...cachedResult.optimizationTechniques, {
          name: 'Cache Hit',
          description: 'Result retrieved from intelligent cache',
          impact: 'high' as const,
          appliedTo: ['query_result'],
          estimatedGain: 95,
        }],
      };
    }

    // 3. 优化查询
    const optimizedQuery = await this.optimizer.optimize(query, analysis, context);
    
    // 4. 预测性能
    const performanceMetrics = await this.predictor.predict(optimizedQuery, context);
    
    // 5. 确定路由策略
    const routingStrategy = await this.router.determineRouting(
      optimizedQuery,
      connectionId,
      context
    );

    // 6. 生成执行计划
    const executionPlan = await this.generateExecutionPlan(
      optimizedQuery,
      analysis,
      context
    );

    // 7. 生成建议
    const recommendations = await this.generateRecommendations(
      query,
      analysis,
      context
    );

    const result: QueryOptimizationResult = {
      originalQuery: query,
      optimizedQuery: optimizedQuery.query,
      optimizationTechniques: optimizedQuery.techniques,
      estimatedPerformanceGain: performanceMetrics.estimatedGain,
      cacheKey,
      routingStrategy,
      executionPlan,
      warnings: analysis.warnings,
      recommendations,
    };

    // 8. 缓存结果
    await this.cache.set(cacheKey, result, {
      ttl: this.cache.calculateTTL(analysis),
      tags: analysis.tags,
    });

    // 9. 记录优化历史
    await this.history.recordOptimization(
      connectionId,
      database,
      query,
      result,
      context
    );

    return result;
  }

  /**
   * 批量优化查询
   */
  async optimizeQueries(requests: QueryOptimizationRequest[]): Promise<QueryOptimizationResult[]> {
    const results: QueryOptimizationResult[] = [];
    
    // 分析查询间的依赖关系
    const dependencies = this.analyzer.analyzeDependencies(requests.map(r => r.query));
    
    // 并行优化独立查询
    const independentQueries = requests.filter((_, index) => 
      !dependencies.some(dep => dep.dependentIndex === index)
    );
    
    const independentResults = await Promise.all(
      independentQueries.map(request => this.optimizeQuery(request))
    );
    
    // 按依赖顺序优化相关查询
    const dependentQueries = requests.filter((_, index) => 
      dependencies.some(dep => dep.dependentIndex === index)
    );
    
    for (const request of dependentQueries) {
      const result = await this.optimizeQuery(request);
      results.push(result);
    }
    
    return [...independentResults, ...results];
  }

  /**
   * 学习查询模式
   */
  async learnFromQuery(
    query: string,
    executionResult: QueryExecutionResult,
    context: QueryContext
  ): Promise<void> {
    // 记录查询性能
    await this.analyzer.recordPerformance(query, executionResult);
    
    // 更新预测模型
    await this.predictor.updateModel(query, executionResult, context);
    
    // 优化缓存策略
    await this.cache.updateStrategy(query, executionResult);
    
    // 更新路由权重
    await this.router.updateWeights(query, executionResult);
  }

  /**
   * 获取查询统计信息
   */
  async getQueryStats(connectionId: string, timeRange?: TimeRange): Promise<QueryStatistics> {
    return this.analyzer.getStatistics(connectionId, timeRange);
  }

  /**
   * 清理缓存
   */
  async clearCache(pattern?: string): Promise<void> {
    await this.cache.clear(pattern);
  }

  /**
   * 获取优化建议
   */
  async getOptimizationRecommendations(
    connectionId: string,
    limit: number = 10
  ): Promise<Recommendation[]> {
    const stats = await this.getQueryStats(connectionId);
    const slowQueries = stats.slowQueries.slice(0, limit);
    
    const recommendations: Recommendation[] = [];
    
    for (const slowQuery of slowQueries) {
      const analysis = await this.analyzer.analyzeQuery(slowQuery.query);
      const queryRecommendations = await this.generateRecommendations(
        slowQuery.query,
        analysis
      );
      recommendations.push(...queryRecommendations);
    }
    
    return recommendations
      .sort((a, b) => b.estimatedBenefit - a.estimatedBenefit)
      .slice(0, limit);
  }

  /**
   * 训练机器学习模型
   */
  async trainMLModels(): Promise<void> {
    await this.optimizer.trainMLModels();
  }

  /**
   * 添加ML训练数据
   */
  addMLTrainingData(data: any): void {
    this.optimizer.addMLTrainingData(data);
  }

  /**
   * 获取ML模型信息
   */
  getMLModelInfo(): any[] {
    return this.optimizer.getMLModelInfo();
  }

  /**
   * 获取ML模型指标
   */
  async getMLModelMetrics(modelId: string): Promise<any> {
    return this.optimizer.getMLModelMetrics(modelId);
  }

  /**
   * 获取优化历史
   */
  getOptimizationHistory(filter?: any, limit?: number, offset?: number): any[] {
    return this.history.queryHistory(filter, limit, offset);
  }

  /**
   * 获取历史记录详情
   */
  getHistoryEntry(entryId: string): any {
    return this.history.getHistoryEntry(entryId);
  }

  /**
   * 更新执行性能
   */
  async updateExecutionPerformance(entryId: string, performance: any): Promise<boolean> {
    return this.history.updatePerformance(entryId, performance);
  }

  /**
   * 添加用户反馈
   */
  async addUserFeedback(entryId: string, feedback: any): Promise<boolean> {
    return this.history.addUserFeedback(entryId, feedback);
  }

  /**
   * 获取历史统计
   */
  getHistoryStatistics(filter?: any): any {
    return this.history.generateStatistics(filter);
  }

  /**
   * 查找相似查询
   */
  findSimilarQueries(query: string, limit?: number, threshold?: number): any[] {
    return this.history.findSimilarQueries(query, limit, threshold);
  }

  /**
   * 获取最佳优化案例
   */
  getBestOptimizations(limit?: number): any[] {
    return this.history.getBestOptimizations(limit);
  }

  /**
   * 获取最差优化案例
   */
  getWorstOptimizations(limit?: number): any[] {
    return this.history.getWorstOptimizations(limit);
  }

  /**
   * 导出历史数据
   */
  async exportOptimizationHistory(options: any): Promise<string> {
    return this.history.exportHistory(options);
  }

  /**
   * 导入历史数据
   */
  async importOptimizationHistory(data: string, format: 'json' | 'csv'): Promise<number> {
    return this.history.importHistory(data, format);
  }

  /**
   * 清空历史记录
   */
  async clearOptimizationHistory(): Promise<void> {
    return this.history.clearHistory();
  }

  /**
   * 生成执行计划
   */
  private async generateExecutionPlan(
    query: string,
    analysis: QueryAnalysis,
    context?: QueryContext
  ): Promise<ExecutionPlan> {
    const steps = await this.optimizer.generateSteps(query, analysis);
    const parallelization = this.optimizer.analyzeParallelization(steps);
    const resourceRequirements = this.optimizer.calculateResourceRequirements(
      steps,
      context
    );
    const estimatedDuration = this.predictor.estimateDuration(
      steps,
      resourceRequirements,
      context
    );

    return {
      steps,
      parallelization,
      resourceRequirements,
      estimatedDuration,
    };
  }

  /**
   * 生成优化建议
   */
  private async generateRecommendations(
    query: string,
    analysis: QueryAnalysis,
    context?: QueryContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // 索引建议
    const indexRecommendations = await this.optimizer.recommendIndexes(query, analysis);
    recommendations.push(...indexRecommendations);

    // 查询重写建议
    const rewriteRecommendations = await this.optimizer.recommendRewrites(query, analysis);
    recommendations.push(...rewriteRecommendations);

    // 缓存建议
    const cacheRecommendations = await this.cache.recommendCaching(query, analysis);
    recommendations.push(...cacheRecommendations);

    // 配置建议
    const configRecommendations = await this.optimizer.recommendConfiguration(
      query,
      analysis,
      context
    );
    recommendations.push(...configRecommendations);

    return recommendations
      .sort((a, b) => b.estimatedBenefit - a.estimatedBenefit)
      .slice(0, 10);
  }
}

export interface QueryExecutionResult {
  executionTime: number;
  rowsAffected: number;
  memoryUsed: number;
  diskReads: number;
  diskWrites: number;
  networkBytes: number;
  success: boolean;
  error?: string;
}

export interface QueryAnalysis {
  patterns: QueryPattern[];
  complexity: QueryComplexity;
  resourceUsage: ResourceUsage;
  warnings: string[];
  tags: string[];
}

export interface QueryPattern {
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'DROP';
  tables: string[];
  columns: string[];
  conditions: Condition[];
  joins: Join[];
  aggregations: Aggregation[];
  orderBy: OrderBy[];
  groupBy: string[];
  limit?: number;
  offset?: number;
}

export interface QueryComplexity {
  score: number;
  level: 'simple' | 'medium' | 'complex' | 'very_complex';
  factors: ComplexityFactor[];
}

export interface ComplexityFactor {
  name: string;
  weight: number;
  description: string;
}

export interface ResourceUsage {
  estimatedMemory: number;
  estimatedCpu: number;
  estimatedIo: number;
  estimatedNetwork: number;
}

export interface Condition {
  column: string;
  operator: string;
  value: any;
  type: 'WHERE' | 'HAVING';
}

export interface Join {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  leftTable: string;
  rightTable: string;
  condition: string;
}

export interface Aggregation {
  function: string;
  column: string;
  alias?: string;
}

export interface OrderBy {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryStatistics {
  totalQueries: number;
  avgExecutionTime: number;
  slowQueries: SlowQuery[];
  frequentQueries: FrequentQuery[];
  errorRate: number;
  cacheHitRate: number;
  optimizationSuccessRate: number;
  resourceUtilization: ResourceUtilization;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  frequency: number;
  lastExecuted: Date;
}

export interface FrequentQuery {
  query: string;
  frequency: number;
  avgExecutionTime: number;
  lastExecuted: Date;
}

export interface ResourceUtilization {
  avgMemoryUsage: number;
  avgCpuUsage: number;
  avgIoUsage: number;
  avgNetworkUsage: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// Export ML-related interfaces
export type { MLModel, MLPrediction, MLTrainingData, PerformanceMetrics, UserFeedback } from './ml/MLOptimizer';

// Export History-related interfaces
export type { 
  OptimizationHistoryEntry, 
  ExecutionPerformance, 
  HistoryFilter, 
  HistoryStatistics, 
  ExportOptions 
} from './history/OptimizationHistory';

// 创建单例实例
export const intelligentQueryEngine = new IntelligentQueryEngine();

export default intelligentQueryEngine;