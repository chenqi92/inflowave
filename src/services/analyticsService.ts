import { safeTauriInvoke } from '@/utils/tauri';
import type { QueryResult } from '@/types';

export interface QueryExecutionPlan {
  id: string;
  query: string;
  connectionId: string;
  database: string;
  planTree: PlanNode[];
  estimatedCost: number;
  actualCost?: number;
  executionTime?: number;
  statistics: ExecutionStatistics;
  recommendations: QueryRecommendation[];
  createdAt: Date;
}

export interface PlanNode {
  id: string;
  nodeType: string;
  operation: string;
  table?: string;
  index?: string;
  estimatedRows: number;
  actualRows?: number;
  estimatedCost: number;
  actualCost?: number;
  executionTime?: number;
  children: PlanNode[];
  conditions?: string[];
  output?: string[];
  statistics: NodeStatistics;
  warnings: string[];
}

export interface NodeStatistics {
  bufferHits: number;
  bufferReads: number;
  bufferWrites: number;
  diskReads: number;
  diskWrites: number;
  networkPackets: number;
  memoryUsage: number;
  cpuTime: number;
  waitTime: number;
}

export interface ExecutionStatistics {
  totalExecutionTime: number;
  planningTime: number;
  executionTime: number;
  totalRows: number;
  peakMemoryUsage: number;
  bufferHits: number;
  bufferMisses: number;
  diskReads: number;
  diskWrites: number;
  networkTraffic: number;
  parallelWorkers: number;
  tempFilesUsed: number;
  tempFileSize: number;
}

export interface QueryRecommendation {
  id: string;
  type:
    | 'index'
    | 'rewrite'
    | 'configuration'
    | 'statistics'
    | 'partitioning'
    | 'caching';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  impact: string;
  estimatedImprovement: number; // percentage
  implementationComplexity: 'easy' | 'medium' | 'hard';
  sqlExample?: string;
  relatedTables: string[];
  relatedColumns: string[];
}

export interface DataCardinalityStats {
  id: string;
  connectionId: string;
  database: string;
  table: string;
  column: string;
  dataType: string;
  totalRows: number;
  distinctValues: number;
  nullCount: number;
  minValue?: any;
  maxValue?: any;
  avgValue?: any;
  medianValue?: any;
  mostFrequentValues: { value: any; count: number; percentage: number }[];
  distributionHistogram: {
    bucket: string;
    count: number;
    percentage: number;
  }[];
  cardinality: number;
  cardinalityRatio: number;
  entropy: number;
  uniquenessScore: number;
  qualityScore: number;
  anomalies: DataAnomaly[];
  updatedAt: Date;
}

export interface DataAnomaly {
  type:
    | 'outlier'
    | 'duplicate'
    | 'missing'
    | 'inconsistent'
    | 'format'
    | 'range';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedRows: number;
  examples: any[];
  suggestion: string;
}

export interface PerformanceBottleneck {
  id: string;
  type: 'query' | 'connection' | 'memory' | 'disk' | 'network' | 'cpu' | 'lock';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  duration: number;
  frequency: number;
  affectedQueries: string[];
  affectedTables: string[];
  metrics: BottleneckMetrics;
  recommendations: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'ignored';
}

export interface BottleneckMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIo: number;
  networkIo: number;
  lockWaitTime: number;
  queryExecutionTime: number;
  connectionCount: number;
  queueLength: number;
  errorRate: number;
  throughput: number;
}

/**
 * 查询执行计划分析服务
 */
export class QueryAnalyticsService {
  /**
   * 获取查询执行计划
   */
  static async getQueryExecutionPlan(
    connectionId: string,
    database: string,
    query: string
  ): Promise<QueryExecutionPlan> {
    return safeTauriInvoke<QueryExecutionPlan>('get_query_execution_plan', {
      connectionId,
      database,
      query,
    });
  }

  /**
   * 分析查询性能
   */
  static async analyzeQueryPerformance(
    connectionId: string,
    database: string,
    query: string,
    executionResult?: QueryResult
  ): Promise<QueryExecutionPlan> {
    return safeTauriInvoke<QueryExecutionPlan>('analyze_query_performance', {
      connectionId,
      database,
      query,
      executionResult,
    });
  }

  /**
   * 获取查询优化建议
   */
  static async getQueryOptimizationSuggestions(
    connectionId: string,
    database: string,
    query: string
  ): Promise<QueryRecommendation[]> {
    return safeTauriInvoke<QueryRecommendation[]>(
      'get_query_optimization_suggestions',
      {
        connectionId,
        database,
        query,
      }
    );
  }

  /**
   * 比较查询执行计划
   */
  static async compareQueryPlans(
    plan1: QueryExecutionPlan,
    plan2: QueryExecutionPlan
  ): Promise<{
    differences: any[];
    performanceComparison: any;
    recommendations: string[];
  }> {
    return safeTauriInvoke<{
      differences: any[];
      performanceComparison: any;
      recommendations: string[];
    }>('compare_query_plans', {
      plan1,
      plan2,
    });
  }

  /**
   * 获取历史执行计划
   */
  static async getHistoricalExecutionPlans(
    connectionId: string,
    database: string,
    query?: string,
    limit?: number
  ): Promise<QueryExecutionPlan[]> {
    return safeTauriInvoke<QueryExecutionPlan[]>(
      'get_historical_execution_plans',
      {
        connectionId,
        database,
        query,
        limit,
      }
    );
  }

  /**
   * 保存执行计划
   */
  static async saveExecutionPlan(plan: QueryExecutionPlan): Promise<void> {
    return safeTauriInvoke<void>('save_execution_plan', { plan });
  }

  /**
   * 删除执行计划
   */
  static async deleteExecutionPlan(planId: string): Promise<void> {
    return safeTauriInvoke<void>('delete_execution_plan', { planId });
  }
}

/**
 * 数据基数统计服务
 */
export class DataCardinalityService {
  /**
   * 计算表的数据基数统计
   */
  static async calculateTableCardinalityStats(
    connectionId: string,
    database: string,
    table: string,
    columns?: string[]
  ): Promise<DataCardinalityStats[]> {
    return safeTauriInvoke<DataCardinalityStats[]>(
      'calculate_table_cardinality_stats',
      {
        connectionId,
        database,
        table,
        columns,
      }
    );
  }

  /**
   * 计算列的数据基数统计
   */
  static async calculateColumnCardinalityStats(
    connectionId: string,
    database: string,
    table: string,
    column: string
  ): Promise<DataCardinalityStats> {
    return safeTauriInvoke<DataCardinalityStats>(
      'calculate_column_cardinality_stats',
      {
        connectionId,
        database,
        table,
        column,
      }
    );
  }

  /**
   * 获取数据质量报告
   */
  static async getDataQualityReport(
    connectionId: string,
    database: string,
    table?: string
  ): Promise<{
    overallScore: number;
    tableScores: { table: string; score: number; issues: number }[];
    columnScores: {
      table: string;
      column: string;
      score: number;
      issues: number;
    }[];
    anomalies: DataAnomaly[];
    recommendations: string[];
  }> {
    return safeTauriInvoke<{
      overallScore: number;
      tableScores: { table: string; score: number; issues: number }[];
      columnScores: {
        table: string;
        column: string;
        score: number;
        issues: number;
      }[];
      anomalies: DataAnomaly[];
      recommendations: string[];
    }>('get_data_quality_report', {
      connectionId,
      database,
      table,
    });
  }

  /**
   * 检测数据异常
   */
  static async detectDataAnomalies(
    connectionId: string,
    database: string,
    table: string,
    columns?: string[]
  ): Promise<DataAnomaly[]> {
    return safeTauriInvoke<DataAnomaly[]>('detect_data_anomalies', {
      connectionId,
      database,
      table,
      columns,
    });
  }

  /**
   * 生成数据概览报告
   */
  static async generateDataProfileReport(
    connectionId: string,
    database: string,
    table: string
  ): Promise<{
    summary: {
      totalRows: number;
      totalColumns: number;
      memoryUsage: number;
      lastUpdated: Date;
    };
    columns: DataCardinalityStats[];
    relationships: {
      primaryKeys: string[];
      foreignKeys: {
        column: string;
        referencedTable: string;
        referencedColumn: string;
      }[];
      indexes: { name: string; columns: string[]; type: string }[];
    };
    recommendations: string[];
  }> {
    return safeTauriInvoke<{
      summary: {
        totalRows: number;
        totalColumns: number;
        memoryUsage: number;
        lastUpdated: Date;
      };
      columns: DataCardinalityStats[];
      relationships: {
        primaryKeys: string[];
        foreignKeys: {
          column: string;
          referencedTable: string;
          referencedColumn: string;
        }[];
        indexes: { name: string; columns: string[]; type: string }[];
      };
      recommendations: string[];
    }>('generate_data_profile_report', {
      connectionId,
      database,
      table,
    });
  }
}

/**
 * 性能瓶颈诊断服务
 */
export class PerformanceBottleneckService {
  /**
   * 检测性能瓶颈
   */
  static async detectPerformanceBottlenecks(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<PerformanceBottleneck[]> {
    return safeTauriInvoke<PerformanceBottleneck[]>(
      'detect_performance_bottlenecks',
      {
        connectionId,
        timeRange,
      }
    );
  }

  /**
   * 获取系统性能指标
   */
  static async getSystemPerformanceMetrics(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    cpu: { timestamp: Date; usage: number }[];
    memory: { timestamp: Date; usage: number; available: number }[];
    disk: {
      timestamp: Date;
      readIops: number;
      writeIops: number;
      readThroughput: number;
      writeThroughput: number;
    }[];
    network: {
      timestamp: Date;
      bytesIn: number;
      bytesOut: number;
      packetsIn: number;
      packetsOut: number;
    }[];
    connections: {
      timestamp: Date;
      active: number;
      idle: number;
      total: number;
    }[];
    queries: {
      timestamp: Date;
      executing: number;
      queued: number;
      completed: number;
      failed: number;
    }[];
  }> {
    return safeTauriInvoke<{
      cpu: { timestamp: Date; usage: number }[];
      memory: { timestamp: Date; usage: number; available: number }[];
      disk: {
        timestamp: Date;
        readIops: number;
        writeIops: number;
        readThroughput: number;
        writeThroughput: number;
      }[];
      network: {
        timestamp: Date;
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
      }[];
      connections: {
        timestamp: Date;
        active: number;
        idle: number;
        total: number;
      }[];
      queries: {
        timestamp: Date;
        executing: number;
        queued: number;
        completed: number;
        failed: number;
      }[];
    }>('get_system_performance_metrics', {
      connectionId,
      timeRange,
    });
  }

  /**
   * 获取慢查询日志
   */
  static async getSlowQueryLog(
    connectionId: string,
    options?: {
      minDuration?: number;
      limit?: number;
      offset?: number;
      orderBy?: 'duration' | 'timestamp' | 'frequency';
    }
  ): Promise<{
    queries: {
      query: string;
      duration: number;
      frequency: number;
      lastExecuted: Date;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      database: string;
      user: string;
    }[];
    total: number;
  }> {
    return safeTauriInvoke<{
      queries: {
        query: string;
        duration: number;
        frequency: number;
        lastExecuted: Date;
        avgDuration: number;
        minDuration: number;
        maxDuration: number;
        database: string;
        user: string;
      }[];
      total: number;
    }>('get_slow_query_log', {
      connectionId,
      options,
    });
  }

  /**
   * 分析锁等待
   */
  static async analyzeLockWaits(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    locks: {
      type: string;
      table: string;
      duration: number;
      waitingQueries: string[];
      blockingQuery: string;
      timestamp: Date;
    }[];
    summary: {
      totalLocks: number;
      avgWaitTime: number;
      maxWaitTime: number;
      mostBlockedTable: string;
      recommendations: string[];
    };
  }> {
    return safeTauriInvoke<{
      locks: {
        type: string;
        table: string;
        duration: number;
        waitingQueries: string[];
        blockingQuery: string;
        timestamp: Date;
      }[];
      summary: {
        totalLocks: number;
        avgWaitTime: number;
        maxWaitTime: number;
        mostBlockedTable: string;
        recommendations: string[];
      };
    }>('analyze_lock_waits', {
      connectionId,
      timeRange,
    });
  }

  /**
   * 获取连接池统计
   */
  static async getConnectionPoolStats(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    stats: {
      timestamp: Date;
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      waitingRequests: number;
      connectionErrors: number;
      avgConnectionTime: number;
      maxConnectionTime: number;
    }[];
    summary: {
      avgUtilization: number;
      maxUtilization: number;
      avgWaitTime: number;
      maxWaitTime: number;
      errorRate: number;
      recommendations: string[];
    };
  }> {
    return safeTauriInvoke<{
      stats: {
        timestamp: Date;
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
        waitingRequests: number;
        connectionErrors: number;
        avgConnectionTime: number;
        maxConnectionTime: number;
      }[];
      summary: {
        avgUtilization: number;
        maxUtilization: number;
        avgWaitTime: number;
        maxWaitTime: number;
        errorRate: number;
        recommendations: string[];
      };
    }>('get_connection_pool_stats', {
      connectionId,
      timeRange,
    });
  }

  /**
   * 生成性能报告
   */
  static async generatePerformanceReport(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    summary: {
      overallScore: number;
      period: { start: Date; end: Date };
      totalQueries: number;
      avgQueryTime: number;
      errorRate: number;
      throughput: number;
    };
    bottlenecks: PerformanceBottleneck[];
    recommendations: {
      category: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      impact: string;
      implementation: string;
    }[];
    metrics: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
      database: number;
    };
    trends: {
      queryPerformance: { timestamp: Date; value: number }[];
      systemLoad: { timestamp: Date; value: number }[];
      errorRate: { timestamp: Date; value: number }[];
    };
  }> {
    return safeTauriInvoke<{
      summary: {
        overallScore: number;
        period: { start: Date; end: Date };
        totalQueries: number;
        avgQueryTime: number;
        errorRate: number;
        throughput: number;
      };
      bottlenecks: PerformanceBottleneck[];
      recommendations: {
        category: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        title: string;
        description: string;
        impact: string;
        implementation: string;
      }[];
      metrics: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
        database: number;
      };
      trends: {
        queryPerformance: { timestamp: Date; value: number }[];
        systemLoad: { timestamp: Date; value: number }[];
        errorRate: { timestamp: Date; value: number }[];
      };
    }>('generate_performance_report', {
      connectionId,
      timeRange,
    });
  }

  /**
   * 标记瓶颈已解决
   */
  static async markBottleneckResolved(
    bottleneckId: string,
    resolution?: string
  ): Promise<void> {
    return safeTauriInvoke<void>('mark_bottleneck_resolved', {
      bottleneckId,
      resolution,
    });
  }

  /**
   * 忽略瓶颈
   */
  static async ignoreBottleneck(
    bottleneckId: string,
    reason?: string
  ): Promise<void> {
    return safeTauriInvoke<void>('ignore_bottleneck', {
      bottleneckId,
      reason,
    });
  }
}

/**
 * 统一的分析服务
 */
export class AnalyticsService {
  static Query = QueryAnalyticsService;
  static Cardinality = DataCardinalityService;
  static Performance = PerformanceBottleneckService;

  /**
   * 获取分析仪表板数据
   */
  static async getAnalyticsDashboard(
    connectionId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    overview: {
      totalQueries: number;
      avgQueryTime: number;
      slowQueries: number;
      errorRate: number;
      dataQualityScore: number;
      performanceScore: number;
    };
    recentAnalyses: {
      queryPlans: QueryExecutionPlan[];
      cardinalityStats: DataCardinalityStats[];
      bottlenecks: PerformanceBottleneck[];
    };
    recommendations: {
      type: string;
      priority: string;
      title: string;
      description: string;
    }[];
    trends: {
      queryPerformance: { timestamp: Date; value: number }[];
      dataQuality: { timestamp: Date; value: number }[];
      systemLoad: { timestamp: Date; value: number }[];
    };
  }> {
    return safeTauriInvoke<{
      overview: {
        totalQueries: number;
        avgQueryTime: number;
        slowQueries: number;
        errorRate: number;
        dataQualityScore: number;
        performanceScore: number;
      };
      recentAnalyses: {
        queryPlans: QueryExecutionPlan[];
        cardinalityStats: DataCardinalityStats[];
        bottlenecks: PerformanceBottleneck[];
      };
      recommendations: {
        type: string;
        priority: string;
        title: string;
        description: string;
      }[];
      trends: {
        queryPerformance: { timestamp: Date; value: number }[];
        dataQuality: { timestamp: Date; value: number }[];
        systemLoad: { timestamp: Date; value: number }[];
      };
    }>('get_analytics_dashboard', {
      connectionId,
      timeRange,
    });
  }

  /**
   * 生成综合分析报告
   */
  static async generateComprehensiveReport(
    connectionId: string,
    database?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    summary: any;
    queryAnalysis: any;
    dataQuality: any;
    performance: any;
    recommendations: any[];
    exportUrl: string;
  }> {
    return safeTauriInvoke<{
      summary: any;
      queryAnalysis: any;
      dataQuality: any;
      performance: any;
      recommendations: any[];
      exportUrl: string;
    }>('generate_comprehensive_report', {
      connectionId,
      database,
      timeRange,
    });
  }

  /**
   * 导出分析报告
   */
  static async exportReport(
    reportData: any,
    format: 'pdf' | 'html' | 'excel' | 'json',
    filePath: string
  ): Promise<void> {
    return safeTauriInvoke<void>('export_analytics_report', {
      reportData,
      format,
      filePath,
    });
  }
}

export default AnalyticsService;
