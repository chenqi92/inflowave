import { useState, useEffect, useMemo } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryHistoryItem, SavedQuery } from '@/types';
import logger from '@/utils/logger';
import { useQueryTranslation } from './useTranslation';

interface UseQueryHistoryOptions {
  autoLoad?: boolean;
  limit?: number;
  offset?: number;
}

interface QueryHistoryFilters {
  searchText: string;
  database: string;
  timeFilter: string;
  statusFilter?: string;
  sortBy?: 'time' | 'duration' | 'rows';
  sortOrder?: 'asc' | 'desc';
}

export const useQueryHistory = (options: UseQueryHistoryOptions = {}) => {
  const { autoLoad = true, limit = 1000, offset = 0 } = options;
  const { t: tQuery } = useQueryTranslation();

  const [historyItems, setHistoryItems] = useState<QueryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载查询历史
  const loadQueryHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      logger.info('开始加载查询历史...');
      const history = await safeTauriInvoke<QueryHistoryItem[]>('get_query_history', {
        limit,
        offset
      });
      logger.info('查询历史加载成功:', history?.length || 0, '条记录');
      setHistoryItems(history || []);
    } catch (error) {
      logger.error('加载查询历史失败:', error);
      setError(error as string);
      setHistoryItems([]);
      // 不显示错误通知，避免干扰用户体验
    } finally {
      setLoading(false);
    }
  };

  // 删除历史记录项
  const deleteHistoryItem = async (id: string) => {
    try {
      await safeTauriInvoke('delete_query_history', { id });
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      showMessage.success(tQuery('history.deleteSuccess'));
      return true;
    } catch (error) {
      showMessage.error(tQuery('history.deleteFailed', { error: String(error) }));
      return false;
    }
  };

  // 清空历史记录
  const clearHistory = async () => {
    try {
      await safeTauriInvoke('clear_query_history');
      setHistoryItems([]);
      showMessage.success(tQuery('history.historyCleared'));
      return true;
    } catch (error) {
      showMessage.error(tQuery('history.clearFailed', { error: String(error) }));
      return false;
    }
  };

  // 过滤历史记录
  const getFilteredHistory = (filters: QueryHistoryFilters) => {
    let filtered = [...historyItems];

    // 文本搜索
    if (filters.searchText) {
      filtered = filtered.filter(item =>
        item.query.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        item.database?.toLowerCase().includes(filters.searchText.toLowerCase())
      );
    }

    // 数据库过滤
    if (filters.database !== '__all__' && filters.database !== 'all') {
      filtered = filtered.filter(item => 
        item.database === filters.database || 
        (filters.database === '__empty__' && !item.database)
      );
    }

    // 时间过滤
    if (filters.timeFilter !== '__all__' && filters.timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.timeFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setDate(now.getDate() - 30);
          break;
      }

      filtered = filtered.filter(item => new Date(item.executedAt) >= filterDate);
    }

    // 状态过滤
    if (filters.statusFilter && filters.statusFilter !== 'all') {
      filtered = filtered.filter(item => 
        filters.statusFilter === 'success' ? item.success : !item.success
      );
    }

    // 排序
    if (filters.sortBy && filters.sortOrder) {
      filtered.sort((a, b) => {
        let aValue: number, bValue: number;

        switch (filters.sortBy) {
          case 'time':
            aValue = new Date(a.executedAt).getTime();
            bValue = new Date(b.executedAt).getTime();
            break;
          case 'duration':
            aValue = a.duration || 0;
            bValue = b.duration || 0;
            break;
          case 'rows':
            aValue = a.rowCount || 0;
            bValue = b.rowCount || 0;
            break;
          default:
            return 0;
        }

        return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    return filtered;
  };

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadQueryHistory();
    }
  }, [autoLoad, limit, offset]);

  return {
    historyItems,
    loading,
    error,
    loadQueryHistory,
    deleteHistoryItem,
    clearHistory,
    getFilteredHistory
  };
};

export const useSavedQueries = (options: UseQueryHistoryOptions = {}) => {
  const { autoLoad = true } = options;
  const { t: tQuery } = useQueryTranslation();

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载保存的查询
  const loadSavedQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      logger.info('开始加载保存的查询...');
      const queries = await safeTauriInvoke<SavedQuery[]>('get_saved_queries');
      logger.info('保存的查询加载成功:', queries?.length || 0, '条记录');
      setSavedQueries(queries || []);
    } catch (error) {
      logger.error('加载保存的查询失败:', error);
      setError(error as string);
      setSavedQueries([]);
      // 不显示错误通知，避免干扰用户体验
    } finally {
      setLoading(false);
    }
  };

  // 删除保存的查询
  const deleteSavedQuery = async (id: string) => {
    try {
      await safeTauriInvoke('delete_saved_query', { id });
      setSavedQueries(prev => prev.filter(query => query.id !== id));
      showMessage.success(tQuery('history.deleteSuccess'));
      return true;
    } catch (error) {
      showMessage.error(tQuery('history.deleteFailed', { error: String(error) }));
      return false;
    }
  };

  // 更新保存的查询
  const updateSavedQuery = async (updatedQuery: SavedQuery) => {
    try {
      await safeTauriInvoke('update_saved_query', { query: updatedQuery });
      setSavedQueries(prev => prev.map(q =>
        q.id === updatedQuery.id ? updatedQuery : q
      ));
      return true;
    } catch (error) {
      showMessage.error(tQuery('history.updateFailed', { error: String(error) }));
      return false;
    }
  };

  // 切换收藏状态
  const toggleFavorite = async (id: string) => {
    try {
      const query = savedQueries.find(q => q.id === id);
      if (!query) return false;

      const updatedQuery: SavedQuery = {
        ...query,
        favorite: !query.favorite,
        updatedAt: new Date()
      };

      const success = await updateSavedQuery(updatedQuery);
      if (success) {
        showMessage.success(updatedQuery.favorite ? tQuery('history.addedToFavorites') : tQuery('history.removedFromFavorites'));
      }
      return success;
    } catch (error) {
      showMessage.error(tQuery('history.operationFailed'));
      return false;
    }
  };

  // 过滤保存的查询
  const getFilteredSavedQueries = (filters: Omit<QueryHistoryFilters, 'timeFilter' | 'statusFilter' | 'sortBy' | 'sortOrder'>) => {
    let filtered = [...savedQueries];

    // 文本搜索
    if (filters.searchText) {
      filtered = filtered.filter(query =>
        query.name.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        query.query.toLowerCase().includes(filters.searchText.toLowerCase()) ||
        query.description?.toLowerCase().includes(filters.searchText.toLowerCase())
      );
    }

    // 数据库过滤
    if (filters.database !== '__all__' && filters.database !== 'all') {
      filtered = filtered.filter(query => 
        query.database === filters.database || 
        (filters.database === '__empty__' && !query.database)
      );
    }

    return filtered;
  };

  // 自动加载
  useEffect(() => {
    if (autoLoad) {
      loadSavedQueries();
    }
  }, [autoLoad]);

  return {
    savedQueries,
    loading,
    error,
    loadSavedQueries,
    deleteSavedQuery,
    updateSavedQuery,
    toggleFavorite,
    getFilteredSavedQueries
  };
};

// 组合Hook，同时管理历史记录和保存的查询
export const useQueryHistoryData = (options: UseQueryHistoryOptions = {}) => {
  const historyHook = useQueryHistory(options);
  const savedQueriesHook = useSavedQueries(options);

  // 获取所有唯一数据库
  const uniqueDatabases = useMemo(() => {
    const databases = new Set<string>();
    historyHook.historyItems.forEach(item => item.database && databases.add(item.database));
    savedQueriesHook.savedQueries.forEach(query => query.database && databases.add(query.database));
    return Array.from(databases);
  }, [historyHook.historyItems, savedQueriesHook.savedQueries]);

  // 重新加载所有数据
  const refreshAll = async () => {
    await Promise.all([
      historyHook.loadQueryHistory(),
      savedQueriesHook.loadSavedQueries()
    ]);
  };

  return {
    ...historyHook,
    ...savedQueriesHook,
    uniqueDatabases,
    refreshAll,
    loading: historyHook.loading || savedQueriesHook.loading
  };
};