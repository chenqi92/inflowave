import { useState, useCallback } from 'react';
import { useConnectionStore } from '@/store/connection';
import { ConnectionAPI } from '@/services/api';
import { getDatabaseConnectionError, formatErrorMessage } from '@/utils/userFriendlyErrors';
import type {
  ConnectionConfig,
  ConnectionStatus,
  ConnectionTestResult,
} from '@/types';

// 生成UUID的简单函数
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
    refreshAllStatuses,
  } = useConnectionStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 创建新连接
   */
  const createConnection = useCallback(
    async (config: Omit<ConnectionConfig, 'id'>) => {
      setLoading(true);
      setError(null);

      try {
        // 为新连接生成 UUID
        const id = generateUUID();
        const fullConfig: ConnectionConfig = {
          ...config,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const returnedId = await ConnectionAPI.createConnection(fullConfig);
        addConnection({ ...fullConfig, id: returnedId });
        return returnedId;
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addConnection]
  );

  /**
   * 测试连接
   */
  const testConnection = useCallback(
    async (connectionId: string): Promise<ConnectionTestResult> => {
      setLoading(true);
      setError(null);

      try {
        const result = await ConnectionAPI.testConnection(connectionId);
        return result;
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 创建临时连接用于测试（不添加到前端状态）
   */
  const createTempConnectionForTest = useCallback(
    async (config: Omit<ConnectionConfig, 'id'>): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        // 为临时连接生成 UUID
        const id = generateUUID();
        const fullConfig: ConnectionConfig = {
          ...config,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 只调用后端API，不添加到前端状态
        const returnedId = await ConnectionAPI.createConnection(fullConfig);
        return returnedId;
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * 删除临时连接
   */
  const deleteTempConnection = useCallback(
    async (connectionId: string): Promise<void> => {
      try {
        await ConnectionAPI.deleteConnection(connectionId);
      } catch (err) {
        console.warn('删除临时连接失败:', err);
        // 不抛出错误，因为这是清理操作
      }
    },
    []
  );

  /**
   * 更新连接配置
   */
  const editConnection = useCallback(
    async (config: ConnectionConfig) => {
      setLoading(true);
      setError(null);

      try {
        await ConnectionAPI.updateConnection(config);
        updateConnection(config.id!, config);
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [updateConnection]
  );

  /**
   * 删除连接
   */
  const deleteConnection = useCallback(
    async (connectionId: string) => {
      setLoading(true);
      setError(null);

      try {
        await ConnectionAPI.deleteConnection(connectionId);
        removeConnection(connectionId);
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [removeConnection]
  );

  /**
   * 连接到数据库
   */
  const connect = useCallback(
    async (connectionId: string) => {
      setLoading(true);
      setError(null);

      try {
        await connectToDatabase(connectionId);
        setActiveConnection(connectionId);
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [connectToDatabase, setActiveConnection]
  );

  /**
   * 断开数据库连接
   */
  const disconnect = useCallback(
    async (connectionId: string) => {
      setLoading(true);
      setError(null);

      try {
        await disconnectFromDatabase(connectionId);
        if (activeConnectionId === connectionId) {
          setActiveConnection(null);
        }
      } catch (err) {
        const errorString = err instanceof Error ? err.message : String(err);
        const friendlyError = getDatabaseConnectionError(errorString);
        setError(formatErrorMessage(friendlyError));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [disconnectFromDatabase, activeConnectionId, setActiveConnection]
  );

  /**
   * 获取连接状态
   */
  const getConnectionStatus = useCallback(
    (connectionId: string): ConnectionStatus | undefined => {
      return connectionStatuses[connectionId];
    },
    [connectionStatuses]
  );

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
    clearError,
  };
};
