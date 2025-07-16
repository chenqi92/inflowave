import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';

interface ConnectionState {
  // 连接配置列表
  connections: ConnectionConfig[];

  // 连接状态映射
  connectionStatuses: Record<string, ConnectionStatus>;

  // 已连接的连接ID列表
  connectedConnectionIds: string[];
  
  // 当前活跃的连接（用于兼容现有逻辑）
  activeConnectionId: string | null;

  // 监控状态
  monitoringActive: boolean;
  monitoringInterval: number;

  // 连接池统计信息
  poolStats: Record<string, any>;

  // 操作方法
  addConnection: (config: ConnectionConfig) => string;
  updateConnection: (id: string, config: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setActiveConnection: (id: string | null) => void;
  addConnectedConnection: (id: string) => void;
  removeConnectedConnection: (id: string) => void;
  isConnectionConnected: (id: string) => boolean;
  getConnection: (id: string) => ConnectionConfig | undefined;
  getConnectionStatus: (id: string) => ConnectionStatus | undefined;
  clearConnections: () => void;

  // 连接管理方法
  connectToDatabase: (id: string) => Promise<void>;
  disconnectFromDatabase: (id: string) => Promise<void>;

  // 监控方法
  startMonitoring: (intervalSeconds?: number) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refreshAllStatuses: () => Promise<void>;
  refreshConnectionStatus: (id: string) => Promise<void>;

  // 连接池方法
  getPoolStats: (id: string) => Promise<void>;
  setPoolStats: (id: string, stats: any) => void;
  
  // 状态同步方法
  syncConnectionStates: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // 初始状态
      connections: [],
      connectionStatuses: {},
      connectedConnectionIds: [],
      activeConnectionId: null,
      monitoringActive: false,
      monitoringInterval: 30,
      poolStats: {},
      
      // 添加连接
      addConnection: (config) => {
        const id = config.id || generateConnectionId();
        const newConnection: ConnectionConfig = {
          ...config,
          id,
          createdAt: new Date(),
          updatedAt: new Date()};
        
        set((state) => ({
          connections: [...state.connections, newConnection]}));
        
        return id;
      },
      
      // 更新连接
      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id
              ? { ...conn, ...updates, updatedAt: new Date() }
              : conn
          )}));
      },
      
      // 删除连接
      removeConnection: (id) => {
        set((state) => {
          const newStatuses = { ...state.connectionStatuses };
          delete newStatuses[id];
          
          return {
            connections: state.connections.filter((conn) => conn.id !== id),
            connectionStatuses: newStatuses,
            connectedConnectionIds: state.connectedConnectionIds.filter(connId => connId !== id),
            activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId};
        });
      },
      
      // 设置连接状态
      setConnectionStatus: (id, status) => {
        set((state) => {
          const currentStatus = state.connectionStatuses[id];

          // 如果状态没有实际变化，不更新
          if (currentStatus &&
              currentStatus.status === status.status &&
              currentStatus.error === status.error &&
              currentStatus.latency === status.latency) {
            return state;
          }

          return {
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                ...status,
                // 保留上次连接时间，除非是新的连接成功
                lastConnected: status.status === 'connected'
                  ? status.lastConnected || new Date()
                  : currentStatus?.lastConnected || status.lastConnected
              }
            }
          };
        });
      },
      
      // 设置活跃连接
      setActiveConnection: (id) => {
        set({ activeConnectionId: id });
      },
      
      // 添加已连接的连接
      addConnectedConnection: (id) => {
        set((state) => {
          if (!state.connectedConnectionIds.includes(id)) {
            return {
              connectedConnectionIds: [...state.connectedConnectionIds, id]
            };
          }
          return state;
        });
      },
      
      // 移除已连接的连接
      removeConnectedConnection: (id) => {
        set((state) => ({
          connectedConnectionIds: state.connectedConnectionIds.filter(connId => connId !== id)
        }));
      },
      
      // 检查连接是否已连接 - 优先使用connectionStatuses状态
      isConnectionConnected: (id) => {
        const state = get();
        const status = state.connectionStatuses[id];
        
        // 优先使用connectionStatuses的状态
        if (status) {
          return status.status === 'connected';
        }
        
        // 如果没有状态信息，则检查connectedConnectionIds数组
        return state.connectedConnectionIds.includes(id);
      },
      
      // 获取连接配置
      getConnection: (id) => {
        return get().connections.find((conn) => conn.id === id);
      },
      
      // 获取连接状态
      getConnectionStatus: (id) => {
        return get().connectionStatuses[id];
      },
      
      // 清空所有连接
      clearConnections: () => {
        set({
          connections: [],
          connectionStatuses: {},
          connectedConnectionIds: [],
          activeConnectionId: null,
          poolStats: {}});
      },

      // 连接到数据库
      connectToDatabase: async (id: string) => {
        console.log(`🔗 开始连接数据库: ${id}`);
        try {
          // 更新状态为连接中
          console.log(`⏳ 设置连接状态为连接中: ${id}`);
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                ...state.connectionStatuses[id],
                status: 'connecting',
                error: undefined}}}));

          console.log(`🚀 调用后端连接API: ${id}`);
          await safeTauriInvoke('connect_to_database', { connectionId: id });
          console.log(`✅ 后端连接成功: ${id}`);

          // 更新状态为已连接
          console.log(`✨ 设置连接状态为已连接: ${id}`);
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'connected' as const,
                lastConnected: new Date(),
                error: undefined,
                latency: undefined}},
            connectedConnectionIds: state.connectedConnectionIds.includes(id) 
              ? state.connectedConnectionIds 
              : [...state.connectedConnectionIds, id],
            activeConnectionId: id}));
          console.log(`🎉 连接完成: ${id}`);
        } catch (error) {
          console.error(`❌ 连接失败 (${id}):`, error);
          // 更新状态为错误
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined}},
            // 确保从已连接列表中移除
            connectedConnectionIds: state.connectedConnectionIds.filter(connId => connId !== id)}));
          throw error;
        }
      },

      // 断开数据库连接
      disconnectFromDatabase: async (id: string) => {
        console.log(`🔌 开始断开连接: ${id}`);
        try {
          await safeTauriInvoke('disconnect_from_database', { connectionId: id });
          console.log(`✅ 后端断开成功: ${id}`);

          // 更新状态为已断开
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'disconnected' as const,
                error: undefined,
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined}},
            connectedConnectionIds: state.connectedConnectionIds.filter(connId => connId !== id),
            activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId}));
        } catch (error) {
          console.error(`❌ 断开连接失败 (${id}):`, error);
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined}}}));
          throw error;
        }
      },

      // 启动监控
      startMonitoring: async (intervalSeconds = 30) => {
        try {
          await safeTauriInvoke('start_connection_monitoring', { intervalSeconds });
          set({ monitoringActive: true, monitoringInterval: intervalSeconds });
        } catch (error) {
          console.error('启动监控失败:', error);
          throw error;
        }
      },

      // 停止监控
      stopMonitoring: async () => {
        try {
          await safeTauriInvoke('stop_connection_monitoring');
          set({ monitoringActive: false });
        } catch (error) {
          console.error('停止监控失败:', error);
          throw error;
        }
      },

      // 刷新所有连接状态
      refreshAllStatuses: async () => {
        try {
          const statuses = await safeTauriInvoke<Record<string, ConnectionStatus>>('get_all_connection_statuses');
          if (statuses) {
            // 简化状态更新逻辑，直接使用后端状态
            set((state) => {
              const newConnectedIds: string[] = [];
              
              // 直接使用后端状态，并同步connectedConnectionIds
              Object.entries(statuses).forEach(([connectionId, status]) => {
                if (status.status === 'connected') {
                  newConnectedIds.push(connectionId);
                }
              });
              
              return { 
                connectionStatuses: statuses,
                connectedConnectionIds: newConnectedIds
              };
            });
          }
        } catch (error) {
          console.error('刷新连接状态失败:', error);
          throw error;
        }
      },

      // 刷新单个连接状态
      refreshConnectionStatus: async (id: string) => {
        try {
          console.log(`🔄 刷新单个连接状态: ${id}`);
          const status = await safeTauriInvoke<ConnectionStatus>('get_connection_status', { connectionId: id });
          if (status) {
            set((state) => {
              const newConnectedIds = [...state.connectedConnectionIds];
              
              // 简化逻辑，直接使用后端状态
              if (status.status === 'connected') {
                // 添加到已连接列表（如果不存在）
                if (!newConnectedIds.includes(id)) {
                  newConnectedIds.push(id);
                }
              } else {
                // 从已连接列表中移除
                const index = newConnectedIds.indexOf(id);
                if (index > -1) {
                  newConnectedIds.splice(index, 1);
                }
              }

              return {
                connectionStatuses: {
                  ...state.connectionStatuses,
                  [id]: status
                },
                connectedConnectionIds: newConnectedIds
              };
            });
          }
        } catch (error) {
          console.error(`刷新连接状态失败 (${id}):`, error);
          // 为单个连接创建错误状态，并从已连接列表中移除
          set((state) => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined
              }
            },
            connectedConnectionIds: state.connectedConnectionIds.filter(connId => connId !== id)
          }));
          throw error;
        }
      },

      // 获取连接池统计信息
      getPoolStats: async (id: string) => {
        try {
          const stats = await safeTauriInvoke('get_connection_pool_stats', { connectionId: id });
          set((state) => ({
            poolStats: {
              ...state.poolStats,
              [id]: stats}}));
        } catch (error) {
          console.error('获取连接池统计信息失败:', error);
          throw error;
        }
      },

      // 设置连接池统计信息
      setPoolStats: (id: string, stats: any) => {
        set((state) => ({
          poolStats: {
            ...state.poolStats,
            [id]: stats}}));
      },

      // 同步连接到后端
      syncConnectionsToBackend: async () => {
        try {
          const { connections } = get();
          if (connections.length === 0) {
            console.log('没有连接需要同步');
            return;
          }

          console.log(`开始同步 ${connections.length} 个连接到后端`);
          const syncedIds = await safeTauriInvoke<string[]>('sync_connections', { configs: connections });
          console.log(`成功同步 ${syncedIds.length} 个连接`);
          return syncedIds;
        } catch (error) {
          console.error('同步连接到后端失败:', error);
          throw error;
        }
      },

      // 同步连接状态 - 确保connectionStatuses和connectedConnectionIds一致
      syncConnectionStates: () => {
        set((state) => {
          const newConnectedIds: string[] = [];
          
          // 根据connectionStatuses重新构建connectedConnectionIds
          Object.entries(state.connectionStatuses).forEach(([id, status]) => {
            if (status.status === 'connected') {
              newConnectedIds.push(id);
            }
          });
          
          console.log(`🔄 同步连接状态: ${newConnectedIds.length} 个连接状态为已连接`);
          
          return {
            ...state,
            connectedConnectionIds: newConnectedIds
          };
        });
      }}),
    {
      name: 'influx-gui-connection-store',
      partialize: (state) => ({
        connections: state.connections,
        connectedConnectionIds: state.connectedConnectionIds,
        activeConnectionId: state.activeConnectionId})},
  )
);

// 生成连接ID
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 连接状态工具函数
export const connectionUtils = {
  // 检查连接是否已连接
  isConnected: (id: string): boolean => {
    const status = useConnectionStore.getState().getConnectionStatus(id);
    return status?.status === 'connected';
  },
  
  // 检查是否有任何已连接的InfluxDB连接 - 优先使用connectionStatuses状态
  hasAnyConnectedInfluxDB: (): boolean => {
    const { connections, connectionStatuses, connectedConnectionIds } = useConnectionStore.getState();
    
    // 优先检查connectionStatuses中是否有连接状态为connected的连接
    const hasConnectedByStatus = connections.some(conn => {
      const status = connectionStatuses[conn.id];
      return status?.status === 'connected';
    });
    
    // 如果connectionStatuses中找到了连接，直接返回true
    if (hasConnectedByStatus) {
      return true;
    }
    
    // 如果没有找到，检查connectedConnectionIds数组作为备用
    return connectedConnectionIds.length > 0;
  },
  
  // 获取所有已连接的InfluxDB连接数量 - 优先使用connectionStatuses状态
  getConnectedInfluxDBCount: (): number => {
    const { connections, connectionStatuses, connectedConnectionIds } = useConnectionStore.getState();
    
    // 优先使用connectionStatuses中的状态计数
    const countByStatus = connections.filter(conn => {
      const status = connectionStatuses[conn.id];
      return status?.status === 'connected';
    }).length;
    
    // 如果connectionStatuses中有连接，直接返回
    if (countByStatus > 0) {
      return countByStatus;
    }
    
    // 如果没有，使用connectedConnectionIds数组的长度作为备用
    return connectedConnectionIds.length;
  },
  
  // 获取连接显示名称
  getDisplayName: (id: string): string => {
    const connection = useConnectionStore.getState().getConnection(id);
    return connection?.name || 'Unknown Connection';
  },
  
  // 获取连接URL
  getConnectionUrl: (id: string): string => {
    const connection = useConnectionStore.getState().getConnection(id);
    if (!connection) return '';
    
    const protocol = connection.ssl ? 'https' : 'http';
    return `${protocol}://${connection.host}:${connection.port}`;
  },
  
  // 验证连接配置
  validateConnection: (config: Partial<ConnectionConfig>): string[] => {
    const errors: string[] = [];
    
    if (!config.name?.trim()) {
      errors.push('连接名称不能为空');
    }
    
    if (!config.host?.trim()) {
      errors.push('主机地址不能为空');
    }
    
    if (!config.port || config.port < 1 || config.port > 65535) {
      errors.push('端口号必须在 1-65535 之间');
    }
    
    if (!config.username?.trim()) {
      errors.push('用户名不能为空');
    }
    
    if (config.timeout && (config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('超时时间必须在 1-300 秒之间');
    }
    
    return errors;
  },
  
  // 创建默认连接配置
  createDefaultConfig: (): Partial<ConnectionConfig> => ({
    name: '',
    host: 'localhost',
    port: 8086,
    username: '',
    password: '',
    ssl: false,
    timeout: 60})};
