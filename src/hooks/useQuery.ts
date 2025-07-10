import { useState, useCallback, useRef } from 'react';
import { useQueryStore } from '@/store/query';
import { QueryAPI } from '@/services/api';
import type { QueryRequest, QueryResult, QueryValidationResult } from '@/types';

/**
 * 查询管理 Hook
 */
export const useQuery = () => {
  const {
    tabs,
    activeTabId,
    history,
    isExecuting,
    queryResult,
    queryError,
    validationResult,
    suggestions,
    createTab,
    closeTab,
    setActiveTab,
    updateTabQuery,
    executeQuery: storeExecuteQuery,
    validateQuery: storeValidateQuery,
    formatQuery: storeFormatQuery,
    getQuerySuggestions: storeGetSuggestions,
    clearQueryResult,
    clearQueryError,
  } = useQueryStore();

  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 执行查询
   */
  const executeQuery = useCallback(async (request: QueryRequest): Promise<QueryResult> => {
    // 取消之前的查询
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await storeExecuteQuery(request);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLocalError(errorMessage);
      throw err;
    } finally {
      setLocalLoading(false);
      abortControllerRef.current = null;
    }
  }, [storeExecuteQuery]);

  /**
   * 取消查询
   */
  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLocalLoading(false);
      setLocalError('查询已取消');
    }
  }, []);

  /**
   * 验证查询
   */
  const validateQuery = useCallback(async (query: string): Promise<QueryValidationResult> => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await storeValidateQuery(query);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLocalError(errorMessage);
      throw err;
    } finally {
      setLocalLoading(false);
    }
  }, [storeValidateQuery]);

  /**
   * 格式化查询
   */
  const formatQuery = useCallback(async (query: string): Promise<string> => {
    setLocalLoading(true);
    setLocalError(null);

    try {
      const result = await storeFormatQuery(query);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLocalError(errorMessage);
      throw err;
    } finally {
      setLocalLoading(false);
    }
  }, [storeFormatQuery]);

  /**
   * 获取查询建议
   */
  const getQuerySuggestions = useCallback(async (
    connectionId: string,
    database?: string,
    partialQuery?: string
  ): Promise<string[]> => {
    try {
      const result = await storeGetSuggestions(connectionId, database, partialQuery);
      return result;
    } catch (err) {
      console.warn('获取查询建议失败:', err);
      return [];
    }
  }, [storeGetSuggestions]);

  /**
   * 获取当前选项卡
   */
  const getCurrentTab = useCallback(() => {
    if (!activeTabId) return null;
    return tabs.find(tab => tab.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  /**
   * 更新当前选项卡查询
   */
  const updateCurrentTabQuery = useCallback((query: string) => {
    if (activeTabId) {
      updateTabQuery(activeTabId, query);
    }
  }, [activeTabId, updateTabQuery]);

  /**
   * 在当前选项卡执行查询
   */
  const executeCurrentTabQuery = useCallback(async (
    connectionId: string,
    database?: string
  ): Promise<QueryResult | null> => {
    const currentTab = getCurrentTab();
    if (!currentTab || !currentTab.query.trim()) {
      throw new Error('没有可执行的查询');
    }

    const request: QueryRequest = {
      connectionId,
      database: database || currentTab.database,
      query: currentTab.query,
    };

    return executeQuery(request);
  }, [getCurrentTab, executeQuery]);

  /**
   * 创建新的查询选项卡
   */
  const newQueryTab = useCallback((query?: string, database?: string) => {
    return createTab(query, database);
  }, [createTab]);

  /**
   * 关闭查询选项卡
   */
  const closeQueryTab = useCallback((tabId: string) => {
    closeTab(tabId);
  }, [closeTab]);

  /**
   * 切换到指定选项卡
   */
  const switchToTab = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, [setActiveTab]);

  /**
   * 获取查询历史
   */
  const getQueryHistory = useCallback((limit?: number) => {
    return limit ? history.slice(0, limit) : history;
  }, [history]);

  /**
   * 从历史记录中重新执行查询
   */
  const rerunFromHistory = useCallback(async (
    historyItemId: string,
    connectionId: string
  ): Promise<QueryResult> => {
    const historyItem = history.find(item => item.id === historyItemId);
    if (!historyItem) {
      throw new Error('历史记录项不存在');
    }

    const request: QueryRequest = {
      connectionId,
      database: historyItem.database,
      query: historyItem.query,
    };

    return executeQuery(request);
  }, [history, executeQuery]);

  /**
   * 清除本地错误
   */
  const clearLocalError = useCallback(() => {
    setLocalError(null);
  }, []);

  /**
   * 清除所有错误
   */
  const clearAllErrors = useCallback(() => {
    setLocalError(null);
    clearQueryError();
  }, [clearQueryError]);

  return {
    // 状态
    tabs,
    activeTabId,
    history,
    isExecuting: isExecuting || localLoading,
    queryResult,
    queryError: queryError || localError,
    validationResult,
    suggestions,

    // 方法
    executeQuery,
    cancelQuery,
    validateQuery,
    formatQuery,
    getQuerySuggestions,
    getCurrentTab,
    updateCurrentTabQuery,
    executeCurrentTabQuery,
    newQueryTab,
    closeQueryTab,
    switchToTab,
    getQueryHistory,
    rerunFromHistory,
    clearQueryResult,
    clearLocalError,
    clearAllErrors,
  };
};