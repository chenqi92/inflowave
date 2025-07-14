import { useState, useEffect, useCallback } from 'react';
import { useConnectionStore } from '@/store/connection';
import { ConnectionAPI } from '@/services/api';
import type { ConnectionConfig, ConnectionStatus, ConnectionTestResult } from '@/types';

/**
 * 连接管理 Hook
 */
export const useConnection = () => {
  const {
    connections,
    connectionStatuses,
    activeConnectionId,
    addConnection,
    updateConnection,
    removeConnection,
    setConnectionStatus,
    setActiveConnection,
    connectToDatabase,
    disconnectFromDatabase,
    startMonitoring,
    stopMonitoring,
    refreshAllStatuses} = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 创建新连接
   */
  const createConnection = useCallback(async (config: Omit<ConnectionConfig, 'id'>) => {
    setLoading(true);
    setError(null);

    try {
      const id = await ConnectionAPI.createConnection(config as ConnectionConfig);
      addConnection({ ...config, id } as ConnectionConfig);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addConnection]);

  /**
   * 测试连接
   */
  const testConnection = useCallback(async (connectionId: string): Promise<ConnectionTestResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await ConnectionAPI.testConnection(connectionId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 创建临时连接用于测试（不添加到前端状态）
   */
  const createTempConnectionForTest = useCallback(async (config: Omit<ConnectionConfig, 'id'>): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      // 只调用后端API，不添加到前端状态
      const id = await ConnectionAPI.createConnection(config as ConnectionConfig);
      return id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 删除临时连接
   */
  const deleteTempConnection = useCallback(async (connectionId: string): Promise<void> => {
    try {
      await ConnectionAPI.deleteConnection(connectionId);
    } catch (err) {
      console.warn('删除临时连接失败:', err);
      // 不抛出错误，因为这是清理操作
    }
  }, []);

  /**
   * 更新连接配置
   */
  const editConnection = useCallback(async (config: ConnectionConfig) => {
    setLoading(true);
    setError(null);

    try {
      await ConnectionAPI.updateConnection(config);
      updateConnection(config.id!, config);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateConnection]);

  /**
   * 删除连接
   */
  const deleteConnection = useCallback(async (connectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      await ConnectionAPI.deleteConnection(connectionId);
      removeConnection(connectionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [removeConnection]);

  /**
   * 连接到数据库
   */
  const connect = useCallback(async (connectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      await connectToDatabase(connectionId);
      setActiveConnection(connectionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [connectToDatabase, setActiveConnection]);

  /**
   * 断开数据库连接
   */
  const disconnect = useCallback(async (connectionId: string) => {
    setLoading(true);
    setError(null);

    try {
      await disconnectFromDatabase(connectionId);
      if (activeConnectionId === connectionId) {
        setActiveConnection(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [disconnectFromDatabase, activeConnectionId, setActiveConnection]);

  /**
   * 获取连接状态
   */
  const getConnectionStatus = useCallback((connectionId: string): ConnectionStatus | undefined => {
    return connectionStatuses[connectionId];
  }, [connectionStatuses]);

  /**
   * 获取活跃连接
   */
  const getActiveConnection = useCallback((): ConnectionConfig | undefined => {
    if (!activeConnectionId) return undefined;
    return connections.find(conn => conn.id === activeConnectionId);
  }, [connections, activeConnectionId]);

  /**
   * 刷新所有连接状态
   */
  const refreshStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await refreshAllStatuses();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refreshAllStatuses]);

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // 状态
    connections,
    connectionStatuses,
    activeConnectionId,
    loading,
    error,

    // 方法
    createConnection,
    testConnection,
    createTempConnectionForTest,
    deleteTempConnection,
    editConnection,
    deleteConnection,
    connect,
    disconnect,
    getConnectionStatus,
    getActiveConnection,
    refreshStatuses,
    startMonitoring,
    stopMonitoring,
    setActiveConnection,
    clearError};
};