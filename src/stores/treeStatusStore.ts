import { create } from 'zustand';
import { logger } from '@/utils/logger';

/**
 * 树节点状态 Store
 * 
 * 用于管理树节点的动态状态（连接状态、加载状态、错误状态）
 * 使用 Zustand 实现细粒度订阅，避免不必要的重新渲染
 */

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface TreeStatusState {
  // 连接状态 Map: connectionId -> status
  connectionStatuses: Map<string, ConnectionStatus>;
  
  // 数据库加载状态 Map: `${connectionId}/${database}` -> isLoading
  databaseLoadingStates: Map<string, boolean>;
  
  // 连接错误 Map: connectionId -> error message
  connectionErrors: Map<string, string>;
  
  // 数据库错误 Map: `${connectionId}/${database}` -> error message
  databaseErrors: Map<string, string>;
  
  // Actions
  setConnectionStatus: (connectionId: string, status: ConnectionStatus) => void;
  setConnectionError: (connectionId: string, error: string | undefined) => void;
  setDatabaseLoadingState: (connectionId: string, database: string, isLoading: boolean) => void;
  setDatabaseError: (connectionId: string, database: string, error: string | undefined) => void;
  
  // Batch updates
  setConnectionStatuses: (statuses: Map<string, ConnectionStatus>) => void;
  setDatabaseLoadingStates: (states: Map<string, boolean>) => void;
  setConnectionErrors: (errors: Map<string, string>) => void;
  setDatabaseErrors: (errors: Map<string, string>) => void;
  
  // Clear
  clearConnectionStatus: (connectionId: string) => void;
  clearDatabaseStatus: (connectionId: string, database: string) => void;
  clearAll: () => void;
}

export const useTreeStatusStore = create<TreeStatusState>((set) => ({
  connectionStatuses: new Map(),
  databaseLoadingStates: new Map(),
  connectionErrors: new Map(),
  databaseErrors: new Map(),
  
  setConnectionStatus: (connectionId, status) => {
    logger.debug(`[TreeStatusStore] 设置连接状态: ${connectionId} -> ${status}`);
    set((state) => ({
      connectionStatuses: new Map(state.connectionStatuses).set(connectionId, status),
    }));
  },
  
  setConnectionError: (connectionId, error) => {
    logger.debug(`[TreeStatusStore] 设置连接错误: ${connectionId} -> ${error || '(cleared)'}`);
    set((state) => {
      const newErrors = new Map(state.connectionErrors);
      if (error) {
        newErrors.set(connectionId, error);
      } else {
        newErrors.delete(connectionId);
      }
      return { connectionErrors: newErrors };
    });
  },
  
  setDatabaseLoadingState: (connectionId, database, isLoading) => {
    const key = `${connectionId}/${database}`;
    logger.debug(`[TreeStatusStore] 设置数据库加载状态: ${key} -> ${isLoading}`);
    set((state) => {
      const newStates = new Map(state.databaseLoadingStates);
      if (isLoading) {
        newStates.set(key, true);
      } else {
        newStates.delete(key);
      }
      return { databaseLoadingStates: newStates };
    });
  },
  
  setDatabaseError: (connectionId, database, error) => {
    const key = `${connectionId}/${database}`;
    logger.debug(`[TreeStatusStore] 设置数据库错误: ${key} -> ${error || '(cleared)'}`);
    set((state) => {
      const newErrors = new Map(state.databaseErrors);
      if (error) {
        newErrors.set(key, error);
      } else {
        newErrors.delete(key);
      }
      return { databaseErrors: newErrors };
    });
  },
  
  // Batch updates
  setConnectionStatuses: (statuses) => {
    logger.debug(`[TreeStatusStore] 批量设置连接状态: ${statuses.size} 个连接`);
    set({ connectionStatuses: new Map(statuses) });
  },
  
  setDatabaseLoadingStates: (states) => {
    logger.debug(`[TreeStatusStore] 批量设置数据库加载状态: ${states.size} 个数据库`);
    set({ databaseLoadingStates: new Map(states) });
  },
  
  setConnectionErrors: (errors) => {
    logger.debug(`[TreeStatusStore] 批量设置连接错误: ${errors.size} 个连接`);
    set({ connectionErrors: new Map(errors) });
  },
  
  setDatabaseErrors: (errors) => {
    logger.debug(`[TreeStatusStore] 批量设置数据库错误: ${errors.size} 个数据库`);
    set({ databaseErrors: new Map(errors) });
  },
  
  // Clear
  clearConnectionStatus: (connectionId) => {
    logger.debug(`[TreeStatusStore] 清除连接状态: ${connectionId}`);
    set((state) => {
      const newStatuses = new Map(state.connectionStatuses);
      const newErrors = new Map(state.connectionErrors);
      newStatuses.delete(connectionId);
      newErrors.delete(connectionId);
      return {
        connectionStatuses: newStatuses,
        connectionErrors: newErrors,
      };
    });
  },
  
  clearDatabaseStatus: (connectionId, database) => {
    const key = `${connectionId}/${database}`;
    logger.debug(`[TreeStatusStore] 清除数据库状态: ${key}`);
    set((state) => {
      const newStates = new Map(state.databaseLoadingStates);
      const newErrors = new Map(state.databaseErrors);
      newStates.delete(key);
      newErrors.delete(key);
      return {
        databaseLoadingStates: newStates,
        databaseErrors: newErrors,
      };
    });
  },
  
  clearAll: () => {
    logger.debug('[TreeStatusStore] 清除所有状态');
    set({
      connectionStatuses: new Map(),
      databaseLoadingStates: new Map(),
      connectionErrors: new Map(),
      databaseErrors: new Map(),
    });
  },
}));

/**
 * 细粒度选择器：获取特定连接的状态
 */
export const selectConnectionStatus = (connectionId: string) => (state: TreeStatusState) =>
  state.connectionStatuses.get(connectionId);

/**
 * 细粒度选择器：获取特定连接的错误
 */
export const selectConnectionError = (connectionId: string) => (state: TreeStatusState) =>
  state.connectionErrors.get(connectionId);

/**
 * 细粒度选择器：获取特定数据库的加载状态
 */
export const selectDatabaseLoadingState = (connectionId: string, database: string) => (state: TreeStatusState) =>
  state.databaseLoadingStates.get(`${connectionId}/${database}`);

/**
 * 细粒度选择器：获取特定数据库的错误
 */
export const selectDatabaseError = (connectionId: string, database: string) => (state: TreeStatusState) =>
  state.databaseErrors.get(`${connectionId}/${database}`);

