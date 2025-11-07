import { QueryOptimizationResult, QueryContext } from '../index';
import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

export interface OptimizationHistoryEntry {
  id: string;
  timestamp: Date;
  connectionId: string;
  database: string;
  originalQuery: string;
  optimizedQuery: string;
  optimizationResult: QueryOptimizationResult;
  context: QueryContext;
  performance: ExecutionPerformance;
  userFeedback?: UserFeedback;
  tags: string[];
  metadata: HistoryMetadata;
}

export interface ExecutionPerformance {
  originalExecutionTime: number;
  optimizedExecutionTime: number;
  performanceGain: number;
  memoryUsage: number;
  cpuUsage: number;
  ioOperations: number;
  networkTraffic: number;
  rowsAffected: number;
  success: boolean;
  error?: string;
}

export interface UserFeedback {
  rating: number; // 1-5 scale
  helpful: boolean;
  comments?: string;
  reportedIssues?: string[];
  suggestedImprovements?: string[];
  timestamp: Date;
}

export interface HistoryMetadata {
  queryType: string;
  complexity: number;
  optimizationTechniques: string[];
  estimatedBenefit: number;
  actualBenefit: number;
  confidenceScore: number;
  engineVersion: string;
  modelVersion?: string;
  source?: string;
  importedAt?: string;
}

export interface HistoryFilter {
  connectionId?: string;
  database?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  queryType?: string;
  minPerformanceGain?: number;
  maxPerformanceGain?: number;
  successOnly?: boolean;
  withFeedback?: boolean;
  tags?: string[];
  search?: string;
}

export interface HistoryStatistics {
  totalOptimizations: number;
  successfulOptimizations: number;
  averagePerformanceGain: number;
  topOptimizationTechniques: TechniqueStats[];
  queryTypeDistribution: Record<string, number>;
  performanceDistribution: PerformanceDistribution;
  userSatisfaction: SatisfactionStats;
  trends: HistoryTrend[];
}

export interface TechniqueStats {
  technique: string;
  count: number;
  averageGain: number;
  successRate: number;
  userRating: number;
}

export interface PerformanceDistribution {
  excellent: number; // > 50% improvement
  good: number; // 20-50% improvement
  moderate: number; // 5-20% improvement
  minimal: number; // < 5% improvement
  negative: number; // performance degradation
}

export interface SatisfactionStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: Record<number, number>;
  helpfulPercentage: number;
  commonIssues: string[];
}

export interface HistoryTrend {
  date: Date;
  optimizationCount: number;
  averageGain: number;
  successRate: number;
  userSatisfaction: number;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeContext: boolean;
  includePerformance: boolean;
  includeFeedback: boolean;
  filter?: HistoryFilter;
}

/**
 * 查询优化历史记录管理器
 *
 * 核心功能：
 * 1. 记录查询优化历史
 * 2. 提供历史查询和分析
 * 3. 生成优化统计报告
 * 4. 支持数据导出和导入
 */
export class OptimizationHistory {
  private history: OptimizationHistoryEntry[] = [];
  private maxHistorySize: number = 10000;
  private persistenceEnabled: boolean = true;
  private compressionEnabled: boolean = true;

  constructor(options?: {
    maxHistorySize?: number;
    persistenceEnabled?: boolean;
    compressionEnabled?: boolean;
  }) {
    this.maxHistorySize = options?.maxHistorySize || 10000;
    this.persistenceEnabled = options?.persistenceEnabled ?? true;
    this.compressionEnabled = options?.compressionEnabled ?? true;

    this.loadHistory();
  }

  /**
   * 记录优化历史
   */
  async recordOptimization(
    connectionId: string,
    database: string,
    originalQuery: string,
    optimizationResult: QueryOptimizationResult,
    context: QueryContext,
    performance?: ExecutionPerformance
  ): Promise<string> {
    const entry: OptimizationHistoryEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      connectionId,
      database,
      originalQuery,
      optimizedQuery: optimizationResult.optimizedQuery,
      optimizationResult,
      context,
      performance: performance || this.createDefaultPerformance(),
      tags: this.generateTags(optimizationResult, context),
      metadata: this.createMetadata(optimizationResult),
    };

    this.history.unshift(entry);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(0, this.maxHistorySize);
    }

    // 持久化保存
    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return entry.id;
  }

  /**
   * 更新执行性能数据
   */
  async updatePerformance(
    entryId: string,
    performance: ExecutionPerformance
  ): Promise<boolean> {
    const entry = this.history.find(e => e.id === entryId);
    if (!entry) return false;

    entry.performance = performance;
    entry.metadata.actualBenefit = performance.performanceGain;

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return true;
  }

  /**
   * 添加用户反馈
   */
  async addUserFeedback(
    entryId: string,
    feedback: UserFeedback
  ): Promise<boolean> {
    const entry = this.history.find(e => e.id === entryId);
    if (!entry) return false;

    entry.userFeedback = feedback;

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return true;
  }

  /**
   * 查询历史记录
   */
  queryHistory(
    filter?: HistoryFilter,
    limit: number = 50,
    offset: number = 0
  ): OptimizationHistoryEntry[] {
    let filtered = this.history;

    if (filter) {
      filtered = this.applyFilter(filtered, filter);
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * 获取历史记录详情
   */
  getHistoryEntry(entryId: string): OptimizationHistoryEntry | null {
    return this.history.find(e => e.id === entryId) || null;
  }

  /**
   * 删除历史记录
   */
  async deleteHistory(entryId: string): Promise<boolean> {
    const index = this.history.findIndex(e => e.id === entryId);
    if (index === -1) return false;

    this.history.splice(index, 1);

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return true;
  }

  /**
   * 批量删除历史记录
   */
  async deleteHistoryBatch(filter: HistoryFilter): Promise<number> {
    const filtered = this.applyFilter(this.history, filter);
    const idsToDelete = filtered.map(e => e.id);

    this.history = this.history.filter(e => !idsToDelete.includes(e.id));

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return idsToDelete.length;
  }

  /**
   * 清空历史记录
   */
  async clearHistory(): Promise<void> {
    this.history = [];

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }
  }

  /**
   * 生成历史统计
   */
  generateStatistics(filter?: HistoryFilter): HistoryStatistics {
    const filtered = filter
      ? this.applyFilter(this.history, filter)
      : this.history;

    const totalOptimizations = filtered.length;
    const successfulOptimizations = filtered.filter(
      e => e.performance.success
    ).length;
    const averagePerformanceGain = this.calculateAverageGain(filtered);

    const topOptimizationTechniques = this.calculateTechniqueStats(filtered);
    const queryTypeDistribution = this.calculateQueryTypeDistribution(filtered);
    const performanceDistribution =
      this.calculatePerformanceDistribution(filtered);
    const userSatisfaction = this.calculateUserSatisfaction(filtered);
    const trends = this.calculateTrends(filtered);

    return {
      totalOptimizations,
      successfulOptimizations,
      averagePerformanceGain,
      topOptimizationTechniques,
      queryTypeDistribution,
      performanceDistribution,
      userSatisfaction,
      trends,
    };
  }

  /**
   * 导出历史数据
   */
  async exportHistory(options: ExportOptions): Promise<string> {
    const filtered = options.filter
      ? this.applyFilter(this.history, options.filter)
      : this.history;

    const data = filtered.map(entry => this.serializeEntry(entry, options));

    switch (options.format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xlsx':
        return await this.convertToExcel(data);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * 导入历史数据
   */
  async importHistory(data: string, format: 'json' | 'csv'): Promise<number> {
    let entries: OptimizationHistoryEntry[] = [];

    switch (format) {
      case 'json':
        entries = JSON.parse(data);
        break;
      case 'csv':
        entries = this.parseCSV(data);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // 验证数据格式
    const validEntries = entries.filter(entry => this.validateEntry(entry));

    // 合并到现有历史记录
    this.history = [...validEntries, ...this.history].slice(
      0,
      this.maxHistorySize
    );

    if (this.persistenceEnabled) {
      await this.saveHistory();
    }

    return validEntries.length;
  }

  /**
   * 获取相似查询的历史记录
   */
  findSimilarQueries(
    query: string,
    limit: number = 10,
    threshold: number = 0.7
  ): OptimizationHistoryEntry[] {
    const similarities = this.history.map(entry => ({
      entry,
      similarity: this.calculateQuerySimilarity(query, entry.originalQuery),
    }));

    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.entry);
  }

  /**
   * 获取最佳优化案例
   */
  getBestOptimizations(limit: number = 10): OptimizationHistoryEntry[] {
    return this.history
      .filter(
        entry =>
          entry.performance.success && entry.performance.performanceGain > 0
      )
      .sort(
        (a, b) => b.performance.performanceGain - a.performance.performanceGain
      )
      .slice(0, limit);
  }

  /**
   * 获取最差优化案例
   */
  getWorstOptimizations(limit: number = 10): OptimizationHistoryEntry[] {
    return this.history
      .filter(
        entry =>
          !entry.performance.success || entry.performance.performanceGain < 0
      )
      .sort(
        (a, b) => a.performance.performanceGain - b.performance.performanceGain
      )
      .slice(0, limit);
  }

  /**
   * 私有方法 - 应用过滤器
   */
  private applyFilter(
    entries: OptimizationHistoryEntry[],
    filter: HistoryFilter
  ): OptimizationHistoryEntry[] {
    return entries.filter(entry => {
      if (filter.connectionId && entry.connectionId !== filter.connectionId)
        return false;
      if (filter.database && entry.database !== filter.database) return false;
      if (filter.dateRange) {
        const entryDate = entry.timestamp;
        if (
          entryDate < filter.dateRange.start ||
          entryDate > filter.dateRange.end
        )
          return false;
      }
      if (filter.queryType && entry.metadata.queryType !== filter.queryType)
        return false;
      if (
        filter.minPerformanceGain !== undefined &&
        entry.performance.performanceGain < filter.minPerformanceGain
      )
        return false;
      if (
        filter.maxPerformanceGain !== undefined &&
        entry.performance.performanceGain > filter.maxPerformanceGain
      )
        return false;
      if (filter.successOnly && !entry.performance.success) return false;
      if (filter.withFeedback && !entry.userFeedback) return false;
      if (filter.tags && !filter.tags.some(tag => entry.tags.includes(tag)))
        return false;
      if (filter.search && !this.matchesSearch(entry, filter.search))
        return false;

      return true;
    });
  }

  /**
   * 私有方法 - 生成唯一ID
   */
  private generateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 私有方法 - 创建默认性能数据
   */
  private createDefaultPerformance(): ExecutionPerformance {
    return {
      originalExecutionTime: 0,
      optimizedExecutionTime: 0,
      performanceGain: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      ioOperations: 0,
      networkTraffic: 0,
      rowsAffected: 0,
      success: false,
    };
  }

  /**
   * 私有方法 - 生成标签
   */
  private generateTags(
    result: QueryOptimizationResult,
    context: QueryContext
  ): string[] {
    const tags: string[] = [];

    // 基于优化技术的标签
    result.optimizationTechniques.forEach(tech => {
      tags.push(`technique:${tech.name}`);
      if (tech.impact === 'high') tags.push('high-impact');
    });

    // 基于性能提升的标签
    if (result.estimatedPerformanceGain > 50) tags.push('major-optimization');
    else if (result.estimatedPerformanceGain > 20)
      tags.push('moderate-optimization');
    else tags.push('minor-optimization');

    // 基于查询特征的标签
    if (context.dataSize && context.dataSize.totalRows > 1000000)
      tags.push('large-dataset');
    if (context.systemLoad && context.systemLoad.cpuUsage > 80)
      tags.push('high-system-load');

    return tags;
  }

  /**
   * 私有方法 - 创建元数据
   */
  private createMetadata(result: QueryOptimizationResult): HistoryMetadata {
    return {
      queryType: this.extractQueryType(result.originalQuery),
      complexity: this.calculateQueryComplexity(result.originalQuery),
      optimizationTechniques: result.optimizationTechniques.map(t => t.name),
      estimatedBenefit: result.estimatedPerformanceGain,
      actualBenefit: 0, // 将在性能数据更新时填充
      confidenceScore: this.calculateConfidenceScore(result),
      engineVersion: '1.0.0',
    };
  }

  /**
   * 私有方法 - 计算平均性能提升
   */
  private calculateAverageGain(entries: OptimizationHistoryEntry[]): number {
    if (entries.length === 0) return 0;

    const totalGain = entries.reduce(
      (sum, entry) => sum + entry.performance.performanceGain,
      0
    );
    return totalGain / entries.length;
  }

  /**
   * 私有方法 - 计算技术统计
   */
  private calculateTechniqueStats(
    entries: OptimizationHistoryEntry[]
  ): TechniqueStats[] {
    const techniqueMap = new Map<
      string,
      {
        count: number;
        totalGain: number;
        successCount: number;
        ratings: number[];
      }
    >();

    entries.forEach(entry => {
      entry.optimizationResult.optimizationTechniques.forEach(tech => {
        const existing = techniqueMap.get(tech.name) || {
          count: 0,
          totalGain: 0,
          successCount: 0,
          ratings: [],
        };

        existing.count++;
        existing.totalGain += entry.performance.performanceGain;
        if (entry.performance.success) existing.successCount++;
        if (entry.userFeedback)
          existing.ratings.push(entry.userFeedback.rating);

        techniqueMap.set(tech.name, existing);
      });
    });

    return Array.from(techniqueMap.entries())
      .map(([technique, stats]) => ({
        technique,
        count: stats.count,
        averageGain: stats.totalGain / stats.count,
        successRate: stats.successCount / stats.count,
        userRating:
          stats.ratings.length > 0
            ? stats.ratings.reduce((sum, rating) => sum + rating, 0) /
              stats.ratings.length
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 私有方法 - 计算查询类型分布
   */
  private calculateQueryTypeDistribution(
    entries: OptimizationHistoryEntry[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    entries.forEach(entry => {
      const queryType = entry.metadata.queryType;
      distribution[queryType] = (distribution[queryType] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 私有方法 - 计算性能分布
   */
  private calculatePerformanceDistribution(
    entries: OptimizationHistoryEntry[]
  ): PerformanceDistribution {
    const distribution: PerformanceDistribution = {
      excellent: 0,
      good: 0,
      moderate: 0,
      minimal: 0,
      negative: 0,
    };

    entries.forEach(entry => {
      const gain = entry.performance.performanceGain;
      if (gain > 50) distribution.excellent++;
      else if (gain > 20) distribution.good++;
      else if (gain > 5) distribution.moderate++;
      else if (gain > 0) distribution.minimal++;
      else distribution.negative++;
    });

    return distribution;
  }

  /**
   * 私有方法 - 计算用户满意度
   */
  private calculateUserSatisfaction(
    entries: OptimizationHistoryEntry[]
  ): SatisfactionStats {
    const entriesWithFeedback = entries.filter(e => e.userFeedback);

    if (entriesWithFeedback.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {},
        helpfulPercentage: 0,
        commonIssues: [],
      };
    }

    const totalRatings = entriesWithFeedback.length;
    const averageRating =
      entriesWithFeedback.reduce(
        (sum, entry) => sum + entry.userFeedback!.rating,
        0
      ) / totalRatings;

    const ratingDistribution: Record<number, number> = {};
    entriesWithFeedback.forEach(entry => {
      const rating = entry.userFeedback!.rating;
      ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
    });

    const helpfulCount = entriesWithFeedback.filter(
      e => e.userFeedback!.helpful
    ).length;
    const helpfulPercentage = helpfulCount / totalRatings;

    // 收集常见问题
    const commonIssues = this.extractCommonIssues(entriesWithFeedback);

    return {
      averageRating,
      totalRatings,
      ratingDistribution,
      helpfulPercentage,
      commonIssues,
    };
  }

  /**
   * 私有方法 - 计算趋势
   */
  private calculateTrends(entries: OptimizationHistoryEntry[]): HistoryTrend[] {
    const trends: HistoryTrend[] = [];
    const dailyData = new Map<
      string,
      {
        count: number;
        totalGain: number;
        successCount: number;
        ratings: number[];
      }
    >();

    entries.forEach(entry => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      const existing = dailyData.get(dateKey) || {
        count: 0,
        totalGain: 0,
        successCount: 0,
        ratings: [],
      };

      existing.count++;
      existing.totalGain += entry.performance.performanceGain;
      if (entry.performance.success) existing.successCount++;
      if (entry.userFeedback) existing.ratings.push(entry.userFeedback.rating);

      dailyData.set(dateKey, existing);
    });

    Array.from(dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([dateKey, data]) => {
        trends.push({
          date: new Date(dateKey),
          optimizationCount: data.count,
          averageGain: data.totalGain / data.count,
          successRate: data.successCount / data.count,
          userSatisfaction:
            data.ratings.length > 0
              ? data.ratings.reduce((sum, rating) => sum + rating, 0) /
                data.ratings.length
              : 0,
        });
      });

    return trends;
  }

  /**
   * 私有方法 - 加载历史记录
   */
  private async loadHistory(): Promise<void> {
    if (!this.persistenceEnabled) return;

    try {
      const data = await safeTauriInvoke<string>('load_optimization_history');
      if (data) {
        this.history = JSON.parse(data);
      }
    } catch (error) {
      logger.error('Failed to load optimization history:', error);
    }
  }

  /**
   * 私有方法 - 保存历史记录
   */
  private async saveHistory(): Promise<void> {
    if (!this.persistenceEnabled) return;

    try {
      const data = JSON.stringify(this.history);
      await safeTauriInvoke('save_optimization_history', { data });
    } catch (error) {
      logger.error('Failed to save optimization history:', error);
    }
  }

  /**
   * 私有方法 - 辅助方法实现
   */
  private extractQueryType(query: string): string {
    const lowerQuery = query.toLowerCase().trim();
    if (lowerQuery.startsWith('select')) return 'SELECT';
    if (lowerQuery.startsWith('insert')) return 'INSERT';
    if (lowerQuery.startsWith('update')) return 'UPDATE';
    if (lowerQuery.startsWith('delete')) return 'DELETE';
    if (lowerQuery.startsWith('create')) return 'CREATE';
    if (lowerQuery.startsWith('drop')) return 'DROP';
    return 'OTHER';
  }

  private calculateQueryComplexity(query: string): number {
    let complexity = 0;
    const lowerQuery = query.toLowerCase();

    // 基础复杂度
    complexity += query.length / 100;

    // 连接复杂度
    complexity += (lowerQuery.match(/join/g) || []).length * 10;

    // 子查询复杂度
    complexity += (lowerQuery.match(/\(\s*select/g) || []).length * 15;

    // 聚合函数复杂度
    complexity +=
      (lowerQuery.match(/\b(count|sum|avg|min|max|group_concat)\(/g) || [])
        .length * 5;

    return Math.min(complexity, 100);
  }

  private calculateConfidenceScore(result: QueryOptimizationResult): number {
    const highImpactTechniques = result.optimizationTechniques.filter(
      t => t.impact === 'high'
    ).length;
    const totalTechniques = result.optimizationTechniques.length;

    if (totalTechniques === 0) return 0;

    const technicianScore = (highImpactTechniques / totalTechniques) * 100;
    const estimatedBenefit = result.estimatedPerformanceGain;

    return Math.min((technicianScore + estimatedBenefit) / 2, 100);
  }

  private calculateQuerySimilarity(query1: string, query2: string): number {
    // 简化的相似度计算，实际应用中可以使用更复杂的算法
    const normalized1 = this.normalizeQuery(query1);
    const normalized2 = this.normalizeQuery(query2);

    if (normalized1 === normalized2) return 1.0;

    const words1 = normalized1.split(' ');
    const words2 = normalized2.split(' ');

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return intersection.length / union.length;
  }

  private normalizeQuery(query: string): string {
    return query.toLowerCase().replace(/\s+/g, ' ').replace(/['"]/g, '').trim();
  }

  private matchesSearch(
    entry: OptimizationHistoryEntry,
    search: string
  ): boolean {
    const searchLower = search.toLowerCase();

    return (
      entry.originalQuery.toLowerCase().includes(searchLower) ||
      entry.optimizedQuery.toLowerCase().includes(searchLower) ||
      entry.database.toLowerCase().includes(searchLower) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  private serializeEntry(
    entry: OptimizationHistoryEntry,
    options: ExportOptions
  ): any {
    const serialized: any = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      connectionId: entry.connectionId,
      database: entry.database,
      originalQuery: entry.originalQuery,
      optimizedQuery: entry.optimizedQuery,
      tags: entry.tags.join(';'),
      queryType: entry.metadata.queryType,
      complexity: entry.metadata.complexity,
      estimatedBenefit: entry.metadata.estimatedBenefit,
      actualBenefit: entry.metadata.actualBenefit,
    };

    if (options.includePerformance) {
      serialized.originalExecutionTime =
        entry.performance.originalExecutionTime;
      serialized.optimizedExecutionTime =
        entry.performance.optimizedExecutionTime;
      serialized.performanceGain = entry.performance.performanceGain;
      serialized.success = entry.performance.success;
    }

    if (options.includeFeedback && entry.userFeedback) {
      serialized.userRating = entry.userFeedback.rating;
      serialized.helpful = entry.userFeedback.helpful;
      serialized.comments = entry.userFeedback.comments || '';
    }

    return serialized;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string'
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private async convertToExcel(data: any[]): Promise<string> {
    try {
      logger.info('📊 开始转换为Excel格式');

      // 创建Excel工作簿数据结构
      const workbookData = {
        sheets: [{
          name: '优化历史',
          data: [
            // 表头
            ['查询ID', '原始查询', '优化查询', '执行时间(ms)', '优化时间', '性能提升', '优化类型'],
            // 数据行
            ...data.map(entry => [
              entry.queryId || '',
              entry.originalQuery || '',
              entry.optimizedQuery || '',
              entry.executionTime || 0,
              entry.optimizedAt ? new Date(entry.optimizedAt).toLocaleString() : '',
              entry.performanceImprovement ? `${(entry.performanceImprovement * 100).toFixed(2)}%` : '',
              entry.optimizationType || ''
            ])
          ]
        }]
      };

      // 返回JSON格式的Excel数据结构
      // 在实际应用中，这里可以调用后端API生成真正的Excel文件
      logger.debug('✅ Excel格式转换完成');
      return JSON.stringify(workbookData, null, 2);
    } catch (error) {
      logger.error('❌ Excel转换失败:', error);
      throw new Error(`Excel转换失败: ${error}`);
    }
  }

  private parseCSV(csvData: string): OptimizationHistoryEntry[] {
    try {
      logger.info('📄 开始解析CSV数据');

      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV数据格式无效：至少需要标题行和一行数据');
      }

      // 解析标题行
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      logger.info('📋 CSV标题行:', headers);

      const entries: OptimizationHistoryEntry[] = [];

      // 解析数据行
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

        if (values.length !== headers.length) {
          logger.warn(`⚠️ 第${i + 1}行数据列数不匹配，跳过`);
          continue;
        }

        // 创建优化历史条目
        const entry: OptimizationHistoryEntry = {
          id: values[0] || `imported-${Date.now()}-${i}`,
          timestamp: values[4] ? new Date(values[4]) : new Date(),
          connectionId: 'imported',
          database: 'imported',
          originalQuery: values[1] || '',
          optimizedQuery: values[2] || '',
          optimizationResult: {
            originalQuery: values[1] || '',
            optimizedQuery: values[2] || '',
            optimizationTechniques: [],
            estimatedPerformanceGain: values[5] ? parseFloat(values[5].replace('%', '')) / 100 : 0,
            routingStrategy: {
              targetConnection: 'imported',
              loadBalancing: 'round_robin' as const,
              priority: 1,
              reason: 'CSV import'
            },
            executionPlan: {
              steps: [],
              parallelization: {
                maxDegreeOfParallelism: 1,
                parallelSteps: [],
                bottlenecks: []
              },
              resourceRequirements: {
                minMemory: 0,
                maxMemory: 0,
                cpuIntensive: false,
                ioIntensive: false,
                networkIntensive: false
              },
              estimatedDuration: parseFloat(values[3]) || 0
            },
            warnings: [],
            recommendations: []
          },
          context: {
            historicalQueries: [],
            userPreferences: {
              preferredPerformance: 'balanced' as const,
              maxQueryTime: 30000,
              cachePreference: 'conservative' as const
            },
            systemLoad: {
              cpuUsage: 0,
              memoryUsage: 0,
              diskIo: 0,
              networkLatency: 0
            },
            dataSize: {
              totalRows: 0,
              totalSize: 0,
              averageRowSize: 0,
              compressionRatio: 1
            },
            indexInfo: []
          },
          performance: {
            originalExecutionTime: parseFloat(values[3]) || 0,
            optimizedExecutionTime: parseFloat(values[3]) || 0,
            performanceGain: values[5] ? parseFloat(values[5].replace('%', '')) / 100 : 0,
            memoryUsage: 0,
            cpuUsage: 0,
            ioOperations: 0,
            networkTraffic: 0,
            rowsAffected: 0,
            success: true
          },
          tags: ['imported', 'csv'],
          metadata: {
            queryType: 'imported',
            complexity: 1,
            optimizationTechniques: ['csv_import'],
            estimatedBenefit: 0,
            actualBenefit: values[5] ? parseFloat(values[5].replace('%', '')) / 100 : 0,
            confidenceScore: 0.5,
            engineVersion: '1.0.0',
            source: 'csv_import',
            importedAt: new Date().toISOString(),
          }
        };

        entries.push(entry);
      }

      logger.debug(`✅ CSV解析完成，共解析${entries.length}条记录`);
      return entries;
    } catch (error) {
      logger.error('❌ CSV解析失败:', error);
      throw new Error(`CSV解析失败: ${error}`);
    }
  }

  private validateEntry(entry: any): boolean {
    return (
      entry.id &&
      entry.timestamp &&
      entry.connectionId &&
      entry.originalQuery &&
      entry.optimizedQuery
    );
  }

  private extractCommonIssues(entries: OptimizationHistoryEntry[]): string[] {
    const issues: string[] = [];

    entries.forEach(entry => {
      if (entry.userFeedback?.reportedIssues) {
        issues.push(...entry.userFeedback.reportedIssues);
      }
    });

    // 统计频率并返回最常见的问题
    const issueCount = new Map<string, number>();
    issues.forEach(issue => {
      issueCount.set(issue, (issueCount.get(issue) || 0) + 1);
    });

    return Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue]) => issue);
  }
}

export default OptimizationHistory;
