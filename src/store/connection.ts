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
  activeconnection_id: string | null;

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
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // 初始状态
      connections: [],
      connectionStatuses: {},
      connectedConnectionIds: [],
      activeconnection_id: null,
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
            activeconnection_id: state.activeconnection_id === id ? null : state.activeconnection_id};
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
        set({ activeconnection_id: id });
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
      
      // 检查连接是否已连接
      isConnectionConnected: (id) => {
        return get().connectedConnectionIds.includes(id);
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
          activeconnection_id: null,
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
          await safeTauriInvoke('connect_to_database', { connection_id: id });
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
            activeconnection_id: id}));
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
          await safeTauriInvoke('disconnect_from_database', { connection_id: id });
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
            activeconnection_id: state.activeconnection_id === id ? null : state.activeconnection_id}));
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
            // 智能合并状态，保护已连接的连接不被错误地断开
            set((state) => {
              const newStatuses = { ...state.connectionStatuses };

              for (const [connectionId, backendStatus] of Object.entries(statuses)) {
                const currentStatus = state.connectionStatuses[connectionId];

                // 如果当前状态是已连接，只有在后端明确报告错误或断开时才更新
                if (currentStatus?.status === 'connected') {
                  // 只有在后端状态是 error 或者有错误信息时才更新
                  if (backendStatus.status === 'error' || backendStatus.error) {
                    console.log(`🔄 连接 ${ connectionId } 状态从已连接更新为错误:`, backendStatus.error);
                    newStatuses[connectionId] = backendStatus;
                  } else if (backendStatus.status === 'disconnected' && backendStatus.error) {
                    // 只有在有明确错误信息的情况下才认为连接真的断开了
                    console.log(`🔄 连接 ${ connectionId } 状态从已连接更新为断开:`, backendStatus.error);
                    newStatuses[connectionId] = backendStatus;
                  } else {
                    // 保持当前的已连接状态，但更新延迟等其他信息
                    newStatuses[connectionId] = {
                      ...currentStatus,
                      latency: backendStatus.latency || currentStatus.latency,
                      lastConnected: backendStatus.lastConnected || currentStatus.lastConnected
                    };
                  }
                } else {
                  // 对于非已连接状态，可以安全地更新
                  newStatuses[connectionId] = backendStatus;
                }
              }

              return { connectionStatuses: newStatuses };
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
          const status = await safeTauriInvoke<ConnectionStatus>('get_connection_status', { connection_id: id });
          if (status) {
            set((state) => {
              const currentStatus = state.connectionStatuses[id];
              
              // 应用相同的智能合并逻辑
              let newStatus = status;
              if (currentStatus?.status === 'connected') {
                if (status.status === 'error' || status.error) {
                  console.log(`🔄 连接 ${id} 状态从已连接更新为错误:`, status.error);
                  newStatus = status;
                } else if (status.status === 'disconnected' && status.error) {
                  console.log(`🔄 连接 ${id} 状态从已连接更新为断开:`, status.error);
                  newStatus = status;
                } else {
                  // 保持当前的已连接状态，但更新延迟等其他信息
                  newStatus = {
                    ...currentStatus,
                    latency: status.latency || currentStatus.latency,
                    lastConnected: status.lastConnected || currentStatus.lastConnected
                  };
                }
              }

              return {
                connectionStatuses: {
                  ...state.connectionStatuses,
                  [id]: newStatus
                }
              };
            });
          }
        } catch (error) {
          console.error(`刷新连接状态失败 (${id}):`, error);
          // 为单个连接创建错误状态
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
            }
          }));
          throw error;
        }
      },

      // 获取连接池统计信息
      getPoolStats: async (id: string) => {
        try {
          const stats = await safeTauriInvoke('get_connection_pool_stats', { connection_id: id });
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
      }}),
    {
      name: 'influx-gui-connection-store',
      partialize: (state) => ({
        connections: state.connections,
        connectedConnectionIds: state.connectedConnectionIds,
        activeconnection_id: state.activeconnection_id})},
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
