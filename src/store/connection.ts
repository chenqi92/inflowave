import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

interface ConnectionState {
  // 连接配置列表
  connections: ConnectionConfig[];
  
  // 连接状态映射
  connectionStatuses: Record<string, ConnectionStatus>;
  
  // 当前活跃的连接
  activeConnectionId: string | null;
  
  // 操作方法
  addConnection: (config: ConnectionConfig) => void;
  updateConnection: (id: string, config: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setActiveConnection: (id: string | null) => void;
  getConnection: (id: string) => ConnectionConfig | undefined;
  getConnectionStatus: (id: string) => ConnectionStatus | undefined;
  clearConnections: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // 初始状态
      connections: [],
      connectionStatuses: {},
      activeConnectionId: null,
      
      // 添加连接
      addConnection: (config) => {
        const id = config.id || generateConnectionId();
        const newConnection: ConnectionConfig = {
          ...config,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        set((state) => ({
          connections: [...state.connections, newConnection],
        }));
        
        return id;
      },
      
      // 更新连接
      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id
              ? { ...conn, ...updates, updatedAt: new Date() }
              : conn
          ),
        }));
      },
      
      // 删除连接
      removeConnection: (id) => {
        set((state) => {
          const newStatuses = { ...state.connectionStatuses };
          delete newStatuses[id];
          
          return {
            connections: state.connections.filter((conn) => conn.id !== id),
            connectionStatuses: newStatuses,
            activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
          };
        });
      },
      
      // 设置连接状态
      setConnectionStatus: (id, status) => {
        set((state) => ({
          connectionStatuses: {
            ...state.connectionStatuses,
            [id]: status,
          },
        }));
      },
      
      // 设置活跃连接
      setActiveConnection: (id) => {
        set({ activeConnectionId: id });
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
          activeConnectionId: null,
        });
      },
    }),
    {
      name: 'influx-gui-connection-store',
      partialize: (state) => ({
        connections: state.connections.map(conn => ({
          ...conn,
          password: '', // 不持久化密码，安全考虑
        })),
        activeConnectionId: state.activeConnectionId,
      }),
    }
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
    timeout: 5000,
  }),
};
