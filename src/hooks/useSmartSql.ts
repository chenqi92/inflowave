import { useState, useCallback } from 'react';
import { smartSqlService, type SqlGenerationRequest, type SqlGenerationResult } from '@/services/smartSqlService';
import { useConnectionStore } from '@/store/connection';
import { toast } from 'sonner';
import { writeToClipboard } from '@/utils/clipboard';

export interface UseSmartSqlOptions {
  database?: string;
  measurement?: string;
  onSqlGenerated?: (result: SqlGenerationResult) => void;
  onError?: (error: string) => void;
}

export function useSmartSql(options: UseSmartSqlOptions = {}) {
  const { database, measurement, onSqlGenerated, onError } = options;
  const { activeConnectionId } = useConnectionStore();
  
  const [loading, setLoading] = useState(false);
  const [lastGeneratedSql, setLastGeneratedSql] = useState<SqlGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 生成智能 SQL
   */
  const generateSql = useCallback(async (request: SqlGenerationRequest): Promise<SqlGenerationResult> => {
    setLoading(true);
    setError(null);

    try {
      // 验证参数
      const validationError = smartSqlService.validateQueryParams(request);
      if (validationError) {
        throw new Error(validationError);
      }

      // 生成 SQL
      const result = await smartSqlService.generateSmartSql(request);
      
      // 格式化 SQL
      result.sql = smartSqlService.formatSql(result.sql);
      
      setLastGeneratedSql(result);
      onSqlGenerated?.(result);
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SQL 生成失败';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [onSqlGenerated, onError]);

  /**
   * 生成 SELECT 查询
   */
  const generateSelectQuery = useCallback(async (
    db?: string,
    table?: string,
    fields?: string[],
    limit?: number
  ): Promise<SqlGenerationResult> => {
    const request: SqlGenerationRequest = {
      sql_type: fields && fields.length > 0 ? 'select_fields' : 'select_all',
      database: db || database,
      measurement: table || measurement,
      fields,
      limit: limit || 100,
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 生成 COUNT 查询
   */
  const generateCountQuery = useCallback(async (
    db?: string,
    table?: string
  ): Promise<SqlGenerationResult> => {
    const request: SqlGenerationRequest = {
      sql_type: 'count_records',
      database: db || database,
      measurement: table || measurement,
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 生成时间序列查询
   */
  const generateTimeSeriesQuery = useCallback(async (
    db?: string,
    table?: string,
    timeRange?: { start: string; end: string },
    limit?: number
  ): Promise<SqlGenerationResult> => {
    const request: SqlGenerationRequest = {
      sql_type: 'time_series',
      database: db || database,
      measurement: table || measurement,
      time_range: timeRange || { start: 'now() - 1h', end: 'now()' },
      limit: limit || 100,
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 生成聚合查询
   */
  const generateAggregationQuery = useCallback(async (
    db: string,
    table: string,
    fields: string[],
    groupBy?: string[]
  ): Promise<SqlGenerationResult> => {
    const request: SqlGenerationRequest = {
      sql_type: 'aggregation',
      database: db || database,
      measurement: table || measurement,
      fields,
      group_by: groupBy,
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 生成字段统计查询
   */
  const generateFieldStatsQuery = useCallback(async (
    field: string,
    statType: 'sum' | 'mean' | 'max' | 'min' | 'count',
    db?: string,
    table?: string
  ): Promise<SqlGenerationResult> => {
    const functionName = statType.toUpperCase();
    const request: SqlGenerationRequest = {
      sql_type: 'aggregation',
      database: db || database,
      measurement: table || measurement,
      fields: [`${functionName}("${field}")`],
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 生成 SHOW 查询
   */
  const generateShowQuery = useCallback(async (
    showType: 'measurements' | 'tag_keys' | 'field_keys' | 'tag_values',
    db?: string,
    table?: string,
    tagKey?: string
  ): Promise<SqlGenerationResult> => {
    const request: SqlGenerationRequest = {
      sql_type: `show_${showType}`,
      database: db || database,
      measurement: table || measurement,
      tags: tagKey ? [tagKey] : undefined,
    };

    return generateSql(request);
  }, [database, measurement, generateSql]);

  /**
   * 快速生成常用查询
   */
  const generateQuickQuery = useCallback(async (
    type: 'select_all' | 'select_recent' | 'count' | 'show_measurements' | 'show_fields' | 'show_tags',
    db?: string,
    table?: string
  ): Promise<SqlGenerationResult> => {
    const currentDb = db || database;
    const currentTable = table || measurement;

    switch (type) {
      case 'select_all':
        return generateSelectQuery(currentDb, currentTable);
      
      case 'select_recent':
        return generateTimeSeriesQuery(currentDb, currentTable, { start: 'now() - 1h', end: 'now()' }, 100);
      
      case 'count':
        return generateCountQuery(currentDb, currentTable);
      
      case 'show_measurements':
        return generateShowQuery('measurements', currentDb);
      
      case 'show_fields':
        return generateShowQuery('field_keys', currentDb, currentTable);
      
      case 'show_tags':
        return generateShowQuery('tag_keys', currentDb, currentTable);
      
      default:
        throw new Error(`不支持的查询类型: ${type}`);
    }
  }, [database, measurement, generateSelectQuery, generateTimeSeriesQuery, generateCountQuery, generateShowQuery]);

  /**
   * 执行生成的 SQL（集成到查询编辑器）
   */
  const executeGeneratedSql = useCallback(async (
    sql: string,
    description?: string
  ): Promise<void> => {
    try {
      if (!activeConnectionId) {
        throw new Error('请先选择一个连接');
      }

      // 这里可以集成到查询编辑器或直接执行
      // 暂时显示成功消息
      toast.dismiss(); // 清除所有现有消息，避免位置叠加
      toast.success(`SQL 已生成: ${description || '查询语句'}`);

      // 可以通过事件或回调将 SQL 传递给查询编辑器
      window.dispatchEvent(new CustomEvent('sql-generated', {
        detail: { sql, description }
      }));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行失败';
      toast.dismiss(); // 清除所有现有消息，避免位置叠加
      toast.error(errorMessage);
      throw err;
    }
  }, [activeConnectionId]);

  /**
   * 复制 SQL 到剪贴板
   */
  const copySqlToClipboard = useCallback(async (sql: string): Promise<void> => {
    const success = await writeToClipboard(sql, {
      successMessage: 'SQL 已复制到剪贴板',
      errorMessage: '复制失败'
    });
  }, []);

  /**
   * 获取时间范围选项
   */
  const getTimeRangeOptions = useCallback(() => {
    return smartSqlService.getTimeRangeOptions();
  }, []);

  /**
   * 获取字段建议
   */
  const getFieldSuggestions = useCallback((fieldType: string) => {
    return smartSqlService.getFieldSuggestions(fieldType);
  }, []);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 清除生成的 SQL
   */
  const clearGeneratedSql = useCallback(() => {
    setLastGeneratedSql(null);
  }, []);

  return {
    // 状态
    loading,
    error,
    lastGeneratedSql,
    
    // 基础方法
    generateSql,
    generateSelectQuery,
    generateCountQuery,
    generateTimeSeriesQuery,
    generateAggregationQuery,
    generateFieldStatsQuery,
    generateShowQuery,
    generateQuickQuery,
    
    // 工具方法
    executeGeneratedSql,
    copySqlToClipboard,
    getTimeRangeOptions,
    getFieldSuggestions,
    clearError,
    clearGeneratedSql,
    
    // 服务实例（用于高级操作）
    smartSqlService,
  };
}