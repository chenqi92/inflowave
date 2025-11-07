/**
 * 数据库查询引擎基类
 * 
 * 定义了所有数据库查询引擎的通用接口和基础实现
 */

import type { 
import logger from '@/utils/logger';
  DatabaseQueryEngine,
  QueryOperation,
  QueryParams,
  FieldInfo,
  QueryCapabilities,
  QueryLanguage,
  DatabaseType
} from '@/types/database/features';

export abstract class QueryEngineBase implements DatabaseQueryEngine {
  protected dbType: DatabaseType;
  protected version: string;
  protected capabilities: QueryCapabilities;

  constructor(dbType: DatabaseType, version: string, capabilities: QueryCapabilities) {
    this.dbType = dbType;
    this.version = version;
    this.capabilities = capabilities;
  }

  // 抽象方法 - 子类必须实现
  abstract getDatabases(connectionId: string): Promise<string[]>;
  abstract getTables(connectionId: string, database: string): Promise<string[]>;
  abstract getFields(connectionId: string, database: string, table: string): Promise<FieldInfo[]>;
  abstract buildQuery(operation: QueryOperation, params: QueryParams): string;
  abstract executeQuery(connectionId: string, query: string, params?: QueryParams): Promise<any>;

  // 版本适配方法 - 子类可以重写
  adaptQuery(query: string, targetVersion: string): string {
    // 默认实现：不做任何转换
    logger.info(`🔄 [${this.dbType}] 版本适配: ${this.version} -> ${targetVersion}`);
    return query;
  }

  adaptResponse(response: any, sourceVersion: string): any {
    // 默认实现：不做任何转换
    logger.info(`🔄 [${this.dbType}] 响应适配: ${sourceVersion} -> ${this.version}`);
    return response;
  }

  // 能力检查方法
  supportsOperation(operation: QueryOperation): boolean {
    return this.capabilities.supportedOperations.includes(operation);
  }

  supportsLanguage(language: QueryLanguage): boolean {
    return this.capabilities.languages.includes(language);
  }

  // 获取能力和版本信息
  getCapabilities(): QueryCapabilities {
    return { ...this.capabilities };
  }

  getVersion(): string {
    return this.version;
  }

  getDbType(): DatabaseType {
    return this.dbType;
  }

  // 通用工具方法
  protected validateParams(params: QueryParams): void {
    if (!params.connectionId) {
      throw new Error('连接ID不能为空');
    }
  }

  protected formatError(error: any, context: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    return new Error(`${context}: ${message}`);
  }

  protected logQuery(query: string, params?: QueryParams): void {
    logger.debug(`🔍 [${this.dbType}] 执行查询:`, query);
    if (params) {
      logger.debug(`📋 [${this.dbType}] 查询参数:`, params);
    }
  }

  protected logResult(result: any, executionTime?: number): void {
    logger.debug(`✅ [${this.dbType}] 查询完成`, executionTime ? `(${executionTime}ms)` : '');
    logger.debug(`📊 [${this.dbType}] 结果:`, result);
  }

  // 查询构建辅助方法
  protected buildSelectQuery(params: QueryParams): string {
    throw new Error(`${this.dbType} 查询引擎未实现 buildSelectQuery 方法`);
  }

  protected buildShowQuery(params: QueryParams): string {
    throw new Error(`${this.dbType} 查询引擎未实现 buildShowQuery 方法`);
  }

  protected buildDescribeQuery(params: QueryParams): string {
    throw new Error(`${this.dbType} 查询引擎未实现 buildDescribeQuery 方法`);
  }

  // 响应处理辅助方法
  protected normalizeResponse(response: any): any {
    // 默认实现：返回原始响应
    return response;
  }

  protected extractDatabases(response: any): string[] {
    throw new Error(`${this.dbType} 查询引擎未实现 extractDatabases 方法`);
  }

  protected extractTables(response: any): string[] {
    throw new Error(`${this.dbType} 查询引擎未实现 extractTables 方法`);
  }

  protected extractFields(response: any): FieldInfo[] {
    throw new Error(`${this.dbType} 查询引擎未实现 extractFields 方法`);
  }

  // 缓存相关方法
  protected getCacheKey(method: string, params: any): string {
    return `${this.dbType}:${this.version}:${method}:${JSON.stringify(params)}`;
  }

  protected shouldUseCache(operation: QueryOperation): boolean {
    // 默认对读操作使用缓存
    return ['select', 'show', 'describe'].includes(operation);
  }

  // 错误处理
  protected handleQueryError(error: any, query: string, params?: QueryParams): never {
    logger.error(`❌ [${this.dbType}] 查询失败:`, error);
    logger.error(`🔍 [${this.dbType}] 失败查询:`, query);
    if (params) {
      logger.error(`📋 [${this.dbType}] 查询参数:`, params);
    }
    
    throw this.formatError(error, `${this.dbType} 查询失败`);
  }

  // 连接测试
  async testConnection(connectionId: string): Promise<boolean> {
    try {
      // 默认实现：尝试获取数据库列表
      await this.getDatabases(connectionId);
      return true;
    } catch (error) {
      logger.error(`❌ [${this.dbType}] 连接测试失败:`, error);
      return false;
    }
  }

  // 查询优化
  protected optimizeQuery(query: string, params?: QueryParams): string {
    // 默认实现：不做优化
    return query;
  }

  // 结果验证
  protected validateResult(result: any, expectedType: 'array' | 'object' | 'string'): boolean {
    switch (expectedType) {
      case 'array':
        return Array.isArray(result);
      case 'object':
        return typeof result === 'object' && result !== null && !Array.isArray(result);
      case 'string':
        return typeof result === 'string';
      default:
        return true;
    }
  }

  // 性能监控
  protected async measureExecutionTime<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const executionTime = Date.now() - startTime;
      
      logger.debug(`⏱️ [${this.dbType}] ${operationName} 执行时间: ${executionTime}ms`);
      
      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`⏱️ [${this.dbType}] ${operationName} 失败，执行时间: ${executionTime}ms`);
      throw error;
    }
  }

  // 批量操作支持
  async executeBatch(queries: string[], connectionId: string): Promise<any[]> {
    if (!this.capabilities.supportsBatch) {
      throw new Error(`${this.dbType} 不支持批量查询`);
    }

    const results: any[] = [];
    for (const query of queries) {
      try {
        const result = await this.executeQuery(connectionId, query);
        results.push(result);
      } catch (error) {
        results.push({ error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return results;
  }

  // 异步查询支持
  async executeAsyncQuery(
    connectionId: string, 
    query: string, 
    params?: QueryParams
  ): Promise<string> {
    if (!this.capabilities.supportsAsync) {
      throw new Error(`${this.dbType} 不支持异步查询`);
    }

    // 默认实现：生成查询ID并立即执行
    const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // 在实际实现中，这里应该启动异步查询并返回查询ID
    setTimeout(async () => {
      try {
        await this.executeQuery(connectionId, query, params);
        logger.debug(`✅ [${this.dbType}] 异步查询 ${queryId} 完成`);
      } catch (error) {
        logger.error(`❌ [${this.dbType}] 异步查询 ${queryId} 失败:`, error);
      }
    }, 0);
    
    return queryId;
  }

  // 查询状态检查
  async getQueryStatus(queryId: string): Promise<'pending' | 'completed' | 'failed' | 'unknown'> {
    if (!this.capabilities.supportsAsync) {
      throw new Error(`${this.dbType} 不支持异步查询状态检查`);
    }

    // 默认实现：返回未知状态
    return 'unknown';
  }

  // 资源清理
  async cleanup(): Promise<void> {
    // 默认实现：无需清理
    logger.info(`🧹 [${this.dbType}] 查询引擎清理完成`);
  }
}

export default QueryEngineBase;
