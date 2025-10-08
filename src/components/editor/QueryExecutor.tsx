import { useCallback, useState } from 'react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { SQLParser } from '@/utils/sqlParser';
import { getInfluxDBQueryError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import type { QueryResult, QueryRequest } from '@/types';
import type { EditorTab } from './TabManager';
import type { TimeRange } from '@/components/common/TimeRangeSelector';

interface QueryExecutorProps {
  currentTab: EditorTab | null;
  selectedDatabase: string;
  selectedTimeRange?: TimeRange;
  onQueryResult?: (result: QueryResult | null) => void;
  onBatchQueryResults?: (
    results: QueryResult[],
    queries: string[],
    executionTime: number
  ) => void;
  onUpdateTab?: (tabId: string, updates: Partial<EditorTab>) => void;
  getSelectedText?: () => string | null;
}

export const useQueryExecutor = ({
  currentTab,
  selectedDatabase,
  selectedTimeRange,
  onQueryResult,
  onBatchQueryResults,
  onUpdateTab,
  getSelectedText,
}: QueryExecutorProps) => {
  const { activeConnectionId, connections } = useConnectionStore();
  const [loading, setLoading] = useState(false);
  const [actualExecutedQueries, setActualExecutedQueries] = useState<string[]>([]);

  // 为查询添加时间范围条件
  const addTimeRangeToQuery = useCallback((query: string, connectionId?: string): string => {
    if (!selectedTimeRange || selectedTimeRange.value === 'none') {
      return query;
    }

    const trimmedQuery = query.trim().toUpperCase();

    // 检查是否已经包含时间条件
    if (trimmedQuery.includes('WHERE') && trimmedQuery.includes('TIME')) {
      return query; // 已经有时间条件，不重复添加
    }

    // 获取连接信息以确定数据库类型
    const effectiveConnectionId = connectionId || currentTab?.connectionId || activeConnectionId;
    const connection = connections.find(c => c.id === effectiveConnectionId);
    const databaseType = connection?.version || '1.x';

    let timeCondition = '';

    if (databaseType === '1.x') {
      // InfluxDB 1.x (InfluxQL) 时间条件
      if (selectedTimeRange.start && selectedTimeRange.end) {
        // 检查是否是函数表达式（如 now() - 1h）还是绝对时间戳
        const isStartFunction = selectedTimeRange.start.includes('now()') || selectedTimeRange.start.includes('NOW()');
        const isEndFunction = selectedTimeRange.end.includes('now()') || selectedTimeRange.end.includes('NOW()');

        const startValue = isStartFunction ? selectedTimeRange.start : `'${selectedTimeRange.start}'`;
        const endValue = isEndFunction ? selectedTimeRange.end : `'${selectedTimeRange.end}'`;

        timeCondition = `time >= ${startValue} AND time <= ${endValue}`;
      } else if (selectedTimeRange.value.includes('h')) {
        // 相对时间，如 '1h', '24h'
        timeCondition = `time >= now() - ${selectedTimeRange.value}`;
      }
    } else {
      // InfluxDB 2.x/3.x (Flux) 时间条件会在range()函数中处理
      // 这里不需要修改查询，因为Flux查询通常已经包含range()
      return query;
    }

    if (!timeCondition) {
      return query;
    }

    // 添加时间条件到查询
    if (trimmedQuery.includes('WHERE')) {
      // 已有WHERE子句，添加AND条件
      return query.replace(/WHERE/i, `WHERE ${timeCondition} AND`);
    } else if (trimmedQuery.includes('FROM')) {
      // 没有WHERE子句，添加WHERE条件
      return query.replace(/FROM\s+[^\s]+/i, (match) => `${match} WHERE ${timeCondition}`);
    }

    return query;
  }, [selectedTimeRange, connections, activeConnectionId, currentTab?.connectionId]);

  // 检查是否有任何已连接的InfluxDB连接
  const hasAnyConnectedInfluxDB = useCallback(() => {
    return connections.some(conn => {
      if (!conn.id) return false;
      // 这里可以添加更多的连接状态检查逻辑
      return true; // 简化版本，实际应该检查连接状态
    });
  }, [connections]);

  // 执行查询
  const executeQuery = useCallback(async () => {
    if (!currentTab || currentTab.type !== 'query') {
      showMessage.warning('请选择一个查询标签页');
      return;
    }

    // 优先使用当前tab的connectionId,如果没有则使用全局activeConnectionId
    const effectiveConnectionId = currentTab.connectionId || activeConnectionId;

    if (!effectiveConnectionId) {
      showMessage.warning('请先选择数据库连接');
      return;
    }

    if (!selectedDatabase) {
      showMessage.warning('请先选择数据库');
      return;
    }

    // 优先使用选中的文本，如果没有选中则使用全部内容
    const selectedText = getSelectedText?.();
    const queryContent = selectedText || currentTab.content.trim();

    if (!queryContent) {
      showMessage.warning('请输入查询语句');
      return;
    }

    // 如果使用了选中的文本，给用户一个提示
    if (selectedText) {
      console.log('🎯 执行选中的SQL:', selectedText);
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      console.log('🚀 开始执行查询:', {
        connection_id: effectiveConnectionId,
        database: selectedDatabase,
        query: queryContent,
      });

      // 解析SQL语句，支持批量执行
      const parser = new SQLParser();
      const statements = parser.parseStatements(queryContent);

      if (statements.length === 0) {
        showMessage.warning('未找到有效的SQL语句');
        setLoading(false);
        return;
      }

      console.log(`📝 解析到 ${statements.length} 条SQL语句`);

      const results: QueryResult[] = [];
      const executedQueries: string[] = [];

      // 批量执行所有语句
      for (let i = 0; i < statements.length; i++) {
        let statement = statements[i].trim();
        if (!statement) continue;

        // 为查询添加时间范围条件
        statement = addTimeRangeToQuery(statement, effectiveConnectionId);

        console.log(`🔄 执行第 ${i + 1} 条语句:`, statement);

        try {
          const request: QueryRequest = {
            connectionId: effectiveConnectionId,
            database: selectedDatabase,
            query: statement,
          };

          const result = await safeTauriInvoke<QueryResult>('execute_query', {
            request,
          });

          console.log(`✅ 第 ${i + 1} 条语句执行成功:`, result);
          
          results.push(result);
          executedQueries.push(statement);
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 条语句执行失败:`, error);
          
          // 使用友好的错误处理
          const friendlyError = getInfluxDBQueryError(String(error));
          const errorMessage = formatErrorMessage(friendlyError);
          
          // 创建错误结果
          const errorResult: QueryResult = {
            results: [{
              error: `语句 ${i + 1} 执行失败: ${friendlyError.message}`
            }],
            executionTime: 0,
            rowCount: 1,
            error: errorMessage,
            columns: ['错误'],
            data: [[`语句 ${i + 1}: ${friendlyError.title} - ${friendlyError.message}`]],
          };
          
          results.push(errorResult);
          executedQueries.push(statement);
        }
      }

      // 计算后端返回的实际执行时间总和（而不是前端计算的总时间）
      const backendExecutionTime = results.reduce((sum, result) => {
        return sum + (result.executionTime || 0);
      }, 0);

      const totalExecutionTime = Date.now() - startTime;
      console.log(`🎉 批量查询完成，后端执行耗时: ${backendExecutionTime}ms，总耗时（含通信）: ${totalExecutionTime}ms`);

      // 保存实际执行的查询
      setActualExecutedQueries(executedQueries);

      // 更新tab的查询结果
      if (onUpdateTab && currentTab) {
        onUpdateTab(currentTab.id, {
          queryResults: results,
          executedQueries,
          executionTime: backendExecutionTime, // 使用后端返回的时间
        });
      }

      // 调用回调函数
      if (results.length === 1) {
        // 单个查询结果
        onQueryResult?.(results[0]);
      }

      // 批量查询结果 - 使用后端返回的执行时间
      onBatchQueryResults?.(results, executedQueries, backendExecutionTime);

      // 显示成功消息
      if (results.length === 1) {
        const result = results[0];
        if (result.error) {
          showMessage.error(`查询执行失败: ${result.error}`);
        } else {
          showMessage.success(
            `查询执行成功，返回 ${result.rowCount || 0} 行数据，耗时 ${result.executionTime || 0}ms`
          );
        }
      } else {
        const successCount = results.filter(r => !r.error).length;
        const errorCount = results.length - successCount;

        if (errorCount === 0) {
          showMessage.success(
            `批量查询执行成功，共 ${results.length} 条语句，耗时 ${backendExecutionTime}ms`
          );
        } else {
          showMessage.warning(
            `批量查询完成，成功 ${successCount} 条，失败 ${errorCount} 条，耗时 ${backendExecutionTime}ms`
          );
        }
      }

    } catch (error) {
      console.error('❌ 查询执行异常:', error);
      showMessage.error(`查询执行失败: ${error}`);
      
      // 清空结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);
    } finally {
      setLoading(false);
    }
  }, [
    currentTab,
    activeConnectionId,
    selectedDatabase,
    selectedTimeRange,
    addTimeRangeToQuery,
    getSelectedText,
    onQueryResult,
    onBatchQueryResults,
    onUpdateTab,
  ]);

  // 执行指定内容和数据库的查询
  const executeQueryWithContent = useCallback(async (query: string, database: string) => {
    // 优先使用当前tab的connectionId,如果没有则使用全局activeConnectionId
    const effectiveConnectionId = currentTab?.connectionId || activeConnectionId;

    if (!effectiveConnectionId) {
      showMessage.warning('请先选择数据库连接');
      return;
    }

    // 从查询中提取表名用于标题
    const tableMatch = query.match(/FROM\s+"([^"]+)"/i);
    const tableName = tableMatch ? tableMatch[1] : '未知表';

    console.log('🚀 执行表双击查询:', {
      connection_id: effectiveConnectionId,
      database,
      query: query.trim(),
    });

    // 确保数据库名称不为空
    if (!database || database.trim() === '') {
      console.log('❌ 数据库名称为空:', { database });
      showMessage.error('数据库名称为空，无法执行查询');
      return;
    }

    setLoading(true);
    try {
      // 对于表查询，直接使用生成的查询语句
      const processedQuery = query.trim();

      // 保存实际执行的查询
      setActualExecutedQueries([processedQuery]);

      const request: QueryRequest = {
        connectionId: effectiveConnectionId,
        database,
        query: processedQuery,
      };

      const result = await safeTauriInvoke<QueryResult>('execute_query', {
        request,
      });

      console.log('✅ 表查询执行成功:', result);

      // 调用回调函数
      onQueryResult?.(result);
      onBatchQueryResults?.([result], [processedQuery], result.executionTime || 0);

      showMessage.success(
        `查询执行成功，返回 ${result.rowCount} 行数据，耗时 ${result.executionTime}ms`
      );

    } catch (error) {
      console.error('❌ 表查询执行失败:', error);
      showMessage.error(`查询执行失败: ${error}`);
      
      // 清空结果
      onQueryResult?.(null);
      onBatchQueryResults?.([], [], 0);
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, currentTab?.connectionId, onQueryResult, onBatchQueryResults]);

  // 测试智能提示
  const testIntelligentHints = useCallback(async () => {
    if (!activeConnectionId || !selectedDatabase) {
      showMessage.warning('请先选择数据库连接和数据库');
      return;
    }

    try {
      console.log('🔍 直接调用后端获取建议...');
      const suggestions = await safeTauriInvoke<string[]>(
        'get_query_suggestions',
        {
          connectionId: activeConnectionId,
          database: selectedDatabase,
          partialQuery: '', // 空字符串获取所有表
        }
      );

      console.log('✅ 后端返回的建议:', suggestions);

      if (suggestions && suggestions.length > 0) {
        showMessage.success(
          `获取到 ${suggestions.length} 个建议: ${suggestions.slice(0, 3).join(', ')}${suggestions.length > 3 ? '...' : ''}`
        );
      } else {
        showMessage.warning('没有获取到任何建议，请检查数据库中是否有表数据');
      }
    } catch (error) {
      console.error('⚠️ 测试智能提示失败:', error);
      showMessage.error(`测试失败: ${error}`);
    }
  }, [activeConnectionId, selectedDatabase]);

  return {
    loading,
    actualExecutedQueries,
    hasAnyConnectedInfluxDB: hasAnyConnectedInfluxDB(),
    executeQuery,
    executeQueryWithContent,
    testIntelligentHints,
  };
};
