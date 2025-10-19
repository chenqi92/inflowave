﻿import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import { createDefaultConnectionConfig } from '@/config/defaults';
import { generateUniqueId } from '@/utils/idGenerator';
import { logger } from '@/utils/logger';

interface ConnectionState {
  // 连接配置列表
  connections: ConnectionConfig[];

  // 连接状态映射 - 用于数据源树和实际连接操作
  connectionStatuses: Record<string, ConnectionStatus>;

  // 表格连接状态映射 - 仅用于连接管理表格显示
  tableConnectionStatuses: Record<string, ConnectionStatus>;

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
  setTableConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setActiveConnection: (id: string | null) => void;
  addConnectedConnection: (id: string) => void;
  removeConnectedConnection: (id: string) => void;
  isConnectionConnected: (id: string) => boolean;
  getConnection: (id: string) => ConnectionConfig | undefined;
  getConnectionStatus: (id: string) => ConnectionStatus | undefined;
  getTableConnectionStatus: (id: string) => ConnectionStatus | undefined;
  clearConnections: () => void;

  // 连接管理方法
  connectToDatabase: (id: string) => Promise<void>;
  disconnectFromDatabase: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<boolean>;

  // 监控方法
  startMonitoring: (intervalSeconds?: number) => Promise<void>;
  stopMonitoring: () => Promise<void>;
  refreshAllStatuses: () => Promise<void>;
  refreshConnectionStatus: (id: string) => Promise<void>;
  testAllConnections: () => Promise<void>;

  // 连接池方法
  getPoolStats: (id: string) => Promise<void>;
  setPoolStats: (id: string, stats: any) => void;

  // 状态同步方法
  syncConnectionStates: () => void;
  syncConnectionsToBackend: () => Promise<void>;
  syncConnectionsFromBackend: () => Promise<void>;
  startConnectionSync: () => void;
  stopConnectionSync: () => void;
  initializeConnectionStates: () => void;
  forceRefreshConnections: () => Promise<void>;

  // 连接恢复方法
  attemptReconnectAll: () => Promise<void>;
  attemptReconnect: (id: string) => Promise<boolean>;
  scheduleReconnect: (id: string, delayMs?: number) => void;
  cancelScheduledReconnect: (id: string) => void;

  // 同步状态
  syncInterval?: NodeJS.Timeout;
  // 重连定时器
  reconnectTimers: Record<string, NodeJS.Timeout>;
}

// 辅助函数：解析数据库版本字符串，支持多数据库类型
const parseDatabaseVersion = (versionString: string, dbType: string): string | undefined => {
  if (dbType === 'influxdb') {
    // InfluxDB 版本解析
    if (versionString.includes('v1.') || versionString.startsWith('1.') || versionString.includes('InfluxDB/1.')) {
      return '1.x';
    } else if (versionString.includes('v2.') || versionString.startsWith('2.') || versionString.includes('InfluxDB/2.')) {
      return '2.x';
    } else if (versionString.includes('v3.') || versionString.startsWith('3.') || versionString.includes('InfluxDB/3.')) {
      return '3.x';
    }
  } else if (dbType === 'iotdb') {
    // IoTDB 版本解析
    if (versionString.includes('0.13.') || versionString.includes('v0.13.')) {
      return '0.13.x';
    } else if (versionString.includes('0.14.') || versionString.includes('v0.14.')) {
      return '0.14.x';
    } else if (versionString.includes('1.0.') || versionString.includes('v1.0.')) {
      return '1.0.x';
    } else if (versionString.includes('1.1.') || versionString.includes('v1.1.')) {
      return '1.1.x';
    } else if (versionString.includes('1.2.') || versionString.includes('v1.2.')) {
      return '1.2.x';
    }
  }

  // 如果无法确定版本，返回 undefined
  return undefined;
};

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set, get) => ({
      // 初始状态 - 软件启动时所有连接都应该为断开状态
      connections: [],
      connectionStatuses: {},
      tableConnectionStatuses: {},
      connectedConnectionIds: [],
      activeConnectionId: null,
      monitoringActive: false,
      monitoringInterval: 30,
      poolStats: {},
      reconnectTimers: {},

      // 添加连接
      addConnection: config => {
        const id = config.id || generateUniqueId('conn');
        const newConnection: ConnectionConfig = {
          ...config,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set(state => {
          // 检查是否已存在相同ID的连接，避免重复添加
          const existingIndex = state.connections.findIndex(conn => conn.id === id);
          if (existingIndex >= 0) {
            logger.warn(`连接ID ${id} 已存在，将替换现有连接`);
            const updatedConnections = [...state.connections];
            updatedConnections[existingIndex] = newConnection;
            return { connections: updatedConnections };
          }

          logger.info(`添加新连接: ${newConnection.name} (${id})`);

          // 为新连接初始化连接状态
          const initialStatus: ConnectionStatus = {
            id,
            status: 'disconnected',
            error: undefined,
            latency: undefined,
            lastConnected: undefined,
          };

          return {
            connections: [...state.connections, newConnection],
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: initialStatus,
            },
            tableConnectionStatuses: {
              ...state.tableConnectionStatuses,
              [id]: initialStatus,
            },
          };
        });

        return id;
      },

      // 更新连接
      updateConnection: (id, updates) => {
        set(state => ({
          connections: state.connections.map(conn =>
            conn.id === id
              ? { ...conn, ...updates, updatedAt: new Date() }
              : conn
          ),
        }));
      },

      // 删除连接
      removeConnection: id => {
        set(state => {
          const newStatuses = { ...state.connectionStatuses };
          const newTableStatuses = { ...state.tableConnectionStatuses };
          delete newStatuses[id];
          delete newTableStatuses[id];

          return {
            connections: state.connections.filter(conn => conn.id !== id),
            connectionStatuses: newStatuses,
            tableConnectionStatuses: newTableStatuses,
            connectedConnectionIds: state.connectedConnectionIds.filter(
              connId => connId !== id
            ),
            activeConnectionId:
              state.activeConnectionId === id ? null : state.activeConnectionId,
          };
        });
      },

      // 设置连接状态
      setConnectionStatus: (id, status) => {
        set(state => {
          const currentStatus = state.connectionStatuses[id];

          // 如果状态没有实际变化，不更新
          if (
            currentStatus &&
            currentStatus.status === status.status &&
            currentStatus.error === status.error &&
            currentStatus.latency === status.latency
          ) {
            return state;
          }

          return {
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                ...status,
                // 保留上次连接时间，除非是新的连接成功
                lastConnected:
                  status.status === 'connected'
                    ? status.lastConnected || new Date()
                    : currentStatus?.lastConnected || status.lastConnected,
              },
            },
          };
        });
      },

      // 设置表格连接状态 - 仅用于连接管理表格显示
      setTableConnectionStatus: (id, status) => {
        set(state => {
          const currentStatus = state.tableConnectionStatuses[id];

          // 如果状态没有实际变化，不更新
          if (
            currentStatus &&
            currentStatus.status === status.status &&
            currentStatus.error === status.error &&
            currentStatus.latency === status.latency
          ) {
            return state;
          }

          return {
            tableConnectionStatuses: {
              ...state.tableConnectionStatuses,
              [id]: {
                ...status,
                // 保留上次连接时间，除非是新的连接成功
                lastConnected:
                  status.status === 'connected'
                    ? status.lastConnected || new Date()
                    : currentStatus?.lastConnected || status.lastConnected,
              },
            },
          };
        });
      },

      // 设置活跃连接
      setActiveConnection: id => {
        set({ activeConnectionId: id });
      },

      // 添加已连接的连接
      addConnectedConnection: id => {
        set(state => {
          if (!state.connectedConnectionIds.includes(id)) {
            return {
              connectedConnectionIds: [...state.connectedConnectionIds, id],
            };
          }
          return state;
        });
      },

      // 移除已连接的连接
      removeConnectedConnection: id => {
        set(state => ({
          connectedConnectionIds: state.connectedConnectionIds.filter(
            connId => connId !== id
          ),
        }));
      },

      // 检查连接是否已连接 - 优先使用connectionStatuses状态
      isConnectionConnected: id => {
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
      getConnection: id => {
        return get().connections.find(conn => conn.id === id);
      },

      // 获取连接状态
      getConnectionStatus: id => {
        return get().connectionStatuses[id];
      },

      // 获取表格连接状态
      getTableConnectionStatus: id => {
        return get().tableConnectionStatuses[id];
      },

      // 清空所有连接
      clearConnections: () => {
        logger.info('清空所有连接配置和状态');
        set({
          connections: [],
          connectionStatuses: {},
          tableConnectionStatuses: {},
          connectedConnectionIds: [],
          activeConnectionId: null,
          poolStats: {},
        });
      },

      // 连接到数据库
      connectToDatabase: async (id: string) => {
        logger.debug(`开始连接数据库: ${id}`);

        // 首先检查连接配置是否存在
        const connection = get().connections.find(conn => conn.id === id);
        if (!connection) {
          const errorMsg = `连接配置不存在: ${id}`;
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        logger.debug(`连接配置: ${connection.name} (${connection.host}:${connection.port})`);

        try {
          // 更新状态为连接中
          logger.debug(`设置连接状态为连接中: ${id}`);
          set(state => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'connecting',
                error: undefined,
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
          }));

          logger.debug(`调用后端连接API: ${id}`);

          // 确保后端有该连接配置 - 改进的同步逻辑
          try {
            const backendConnection = await safeTauriInvoke('get_connection', { connectionId: id });
            if (!backendConnection) {
              logger.debug(`后端连接配置不存在，正在创建: ${id}`);
              const connectionWithTimestamp = {
                ...connection,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              await safeTauriInvoke('create_connection', { config: connectionWithTimestamp });
              logger.info(`后端连接配置创建成功: ${id}`);
            } else {
              // 检查配置是否需要更新
              const needsUpdate =
                backendConnection.host !== connection.host ||
                backendConnection.port !== connection.port ||
                backendConnection.username !== connection.username ||
                backendConnection.name !== connection.name;

              if (needsUpdate) {
                logger.debug(`后端连接配置需要更新: ${id}`);
                const updatedConnection = {
                  ...connection,
                  updated_at: new Date().toISOString(),
                };
                await safeTauriInvoke('update_connection', {
                  connectionId: id,
                  config: updatedConnection
                });
                logger.info(`后端连接配置更新成功: ${id}`);
              }
            }
          } catch (syncError) {
            logger.warn(`连接配置同步检查失败，继续尝试连接: ${syncError}`);
            // 即使同步失败，也尝试创建连接配置
            try {
              const connectionWithTimestamp = {
                ...connection,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              await safeTauriInvoke('create_connection', { config: connectionWithTimestamp });
              logger.info(`后端连接配置创建成功（重试）: ${id}`);
            } catch (retryError) {
              logger.warn(`重试创建连接配置也失败: ${retryError}`);
            }
          }

          // 首先建立连接（如果尚未建立）
          await safeTauriInvoke('establish_connection', { connectionId: id });
          logger.debug(`后端连接建立成功: ${id}`);

          // 然后连接到数据库
          await safeTauriInvoke('connect_to_database', { connectionId: id });
          logger.info(`后端连接成功: ${id}`);

          // 更新状态为已连接
          logger.debug(`设置连接状态为已连接: ${id}`);
          set(state => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'connected' as const,
                lastConnected: new Date(),
                error: undefined,
                latency: undefined,
              },
            },
            connectedConnectionIds: state.connectedConnectionIds.includes(id)
              ? state.connectedConnectionIds
              : [...state.connectedConnectionIds, id],
            activeConnectionId: id,
          }));

          logger.info(`连接完成: ${id}`);
        } catch (error) {
          logger.error(`连接失败 (${id}):`, error);

          const errorMessage = String(error);
          let finalError = errorMessage;

          // 改进的错误处理 - 不轻易删除连接配置
          // 只有在明确确认连接配置损坏时才删除
          if (errorMessage.includes('连接配置已被删除') ||
              errorMessage.includes('配置文件损坏')) {
            logger.warn(`检测到连接配置损坏，将清理: ${id}`);
            set(state => ({
              connections: state.connections.filter(conn => conn.id !== id),
              connectionStatuses: {
                ...Object.fromEntries(
                  Object.entries(state.connectionStatuses).filter(([key]) => key !== id)
                ),
              },
              tableConnectionStatuses: {
                ...Object.fromEntries(
                  Object.entries(state.tableConnectionStatuses).filter(([key]) => key !== id)
                ),
              },
              connectedConnectionIds: state.connectedConnectionIds.filter(
                connId => connId !== id
              ),
              activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
            }));

            finalError = `连接配置已损坏，已自动清理。请重新创建连接配置。`;
          } else {
            // 对于其他错误（如网络问题、认证失败等），保留连接配置
            // 更新状态为错误，但不删除配置
            set(state => ({
              connectionStatuses: {
                ...state.connectionStatuses,
                [id]: {
                  id,
                  status: 'error' as const,
                  error: finalError,
                  lastConnected: state.connectionStatuses[id]?.lastConnected,
                  latency: undefined,
                },
              },
              // 确保从已连接列表中移除
              connectedConnectionIds: state.connectedConnectionIds.filter(
                connId => connId !== id
              ),
            }));

            // 如果是数据源停止的错误，提供更友好的错误信息
            if (errorMessage.includes('connection refused') ||
                errorMessage.includes('timeout') ||
                errorMessage.includes('unreachable')) {
              finalError = `无法连接到数据源 (${connection.host}:${connection.port})。请检查数据源是否正在运行，或稍后重试。连接配置已保留。`;
            }
          }

          throw new Error(finalError);
        }
      },

      // 断开数据库连接
      disconnectFromDatabase: async (id: string) => {
        logger.debug(`开始断开连接: ${id}`);

        // 取消任何安排的重连
        get().cancelScheduledReconnect(id);

        try {
          await safeTauriInvoke('disconnect_from_database', {
            connectionId: id,
          });
          logger.info(`后端断开成功: ${id}`);

          // 更新状态为已断开
          set(state => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'disconnected' as const,
                error: undefined,
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
            connectedConnectionIds: state.connectedConnectionIds.filter(
              connId => connId !== id
            ),
            activeConnectionId:
              state.activeConnectionId === id ? null : state.activeConnectionId,
          }));
        } catch (error) {
          logger.error(`断开连接失败 (${id}):`, error);
          set(state => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
          }));
          throw error;
        }
      },

      // 测试连接 - 只检测连通性，仅更新表格状态，不影响数据源树状态
      testConnection: async (id: string) => {
        logger.debug(`开始测试连接: ${id}`);
        try {
          // 暂时更新表格状态为测试中
          set(state => ({
            tableConnectionStatuses: {
              ...state.tableConnectionStatuses,
              [id]: {
                ...state.tableConnectionStatuses[id],
                id,
                status: 'connecting',
                error: undefined,
                lastConnected: state.tableConnectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
          }));

          // 调用后端测试连接API - 使用新的返回类型
          const result = await safeTauriInvoke<{success: boolean, latency?: number, error?: string, serverVersion?: string}>('test_connection', { connectionId: id });
          logger.debug(`测试连接结果: ${id}`, result);

          // 更新表格状态为测试结果，不影响数据源树连接状态
          if (result.success) {
            set(state => ({
              tableConnectionStatuses: {
                ...state.tableConnectionStatuses,
                [id]: {
                  id,
                  status: 'connected' as const,
                  lastConnected: new Date(),
                  error: undefined,
                  latency: result.latency,
                  serverVersion: result.serverVersion,
                },
              },
            }));

            // 如果检测到服务器版本，且与配置的版本不同，则更新连接配置
            if (result.serverVersion) {
              const currentState = get();
              const connection = currentState.connections.find((conn: ConnectionConfig) => conn.id === id);
              if (connection) {
                // 解析服务器版本，确定主版本号
                const detectedVersion = parseDatabaseVersion(result.serverVersion, connection.dbType || 'influxdb');
                if (detectedVersion && detectedVersion !== connection.version) {
                  logger.info(`检测到版本变更: ${connection.version} -> ${detectedVersion} (${connection.dbType})`);

                  // 更新连接配置中的版本
                  set(state => ({
                    connections: state.connections.map((conn: ConnectionConfig) =>
                      conn.id === id
                        ? { ...conn, version: detectedVersion as any, updatedAt: new Date() }
                        : conn
                    ),
                  }));
                }
              }
            }
          } else {
            set(state => ({
              tableConnectionStatuses: {
                ...state.tableConnectionStatuses,
                [id]: {
                  id,
                  status: 'error' as const,
                  error: result.error || '连接测试失败',
                  lastConnected: state.tableConnectionStatuses[id]?.lastConnected,
                  latency: undefined,
                },
              },
            }));
          }

          return result.success;
        } catch (error) {
          logger.error(`测试连接失败 (${id}):`, error);
          // 更新表格状态为错误
          set(state => ({
            tableConnectionStatuses: {
              ...state.tableConnectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.tableConnectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
          }));
          return false;
        }
      },

      // 启动监控
      startMonitoring: async (intervalSeconds = 30) => {
        try {
          await safeTauriInvoke('start_connection_monitoring', {
            intervalSeconds,
          });
          set({ monitoringActive: true, monitoringInterval: intervalSeconds });
        } catch (error) {
          logger.error('启动监控失败:', error);
          throw error;
        }
      },

      // 停止监控
      stopMonitoring: async () => {
        try {
          await safeTauriInvoke('stop_connection_monitoring');
          set({ monitoringActive: false });
        } catch (error) {
          logger.error('停止监控失败:', error);
          throw error;
        }
      },

      // 刷新所有连接状态 - 获取后端实际状态但启动时强制断开
      refreshAllStatuses: async () => {
        try {
          const connections = get().connections;

          // 为所有连接创建断开状态
          const disconnectedStatuses: Record<string, ConnectionStatus> = {};
          connections.forEach(conn => {
            if (conn.id) {
              disconnectedStatuses[conn.id] = {
                id: conn.id,
                status: 'disconnected',
                error: undefined,
                latency: undefined,
                lastConnected: undefined,
              };
            }
          });

          set(state => {
            return {
              connectionStatuses: disconnectedStatuses,
              connectedConnectionIds: [], // 启动时清空已连接列表
            };
          });

          logger.info('连接状态已重置为断开状态');
        } catch (error) {
          logger.error('刷新连接状态失败:', error);
          throw error;
        }
      },

      // 刷新单个连接状态
      refreshConnectionStatus: async (id: string) => {
        try {
          logger.debug(`刷新单个连接状态: ${id}`);
          const status = await safeTauriInvoke<ConnectionStatus>(
            'get_connection_status',
            { connectionId: id }
          );
          if (status) {
            set(state => {
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
                  [id]: status,
                },
                connectedConnectionIds: newConnectedIds,
              };
            });
          }
        } catch (error) {
          logger.error(`刷新连接状态失败 (${id}):`, error);
          // 为单个连接创建错误状态，并从已连接列表中移除
          set(state => ({
            connectionStatuses: {
              ...state.connectionStatuses,
              [id]: {
                id,
                status: 'error' as const,
                error: String(error),
                lastConnected: state.connectionStatuses[id]?.lastConnected,
                latency: undefined,
              },
            },
            connectedConnectionIds: state.connectedConnectionIds.filter(
              connId => connId !== id
            ),
          }));
          throw error;
        }
      },

      // 获取连接池统计信息
      getPoolStats: async (id: string) => {
        try {
          const stats = await safeTauriInvoke('get_connection_pool_stats', {
            connectionId: id,
          });
          set(state => ({
            poolStats: {
              ...state.poolStats,
              [id]: stats,
            },
          }));
        } catch (error) {
          logger.error('获取连接池统计信息失败:', error);
          throw error;
        }
      },

      // 设置连接池统计信息
      setPoolStats: (id: string, stats: any) => {
        set(state => ({
          poolStats: {
            ...state.poolStats,
            [id]: stats,
          },
        }));
      },

      // 测试所有连接 - 仅更新表格状态，不影响数据源树连接状态
      testAllConnections: async () => {
        logger.debug('开始测试所有连接...');
        const connections = get().connections;

        if (connections.length === 0) {
          logger.debug('没有连接需要测试');
          return;
        }

        // 并行测试所有连接
        const testPromises = connections.map(async (connection) => {
          if (!connection.id) return;

          try {
            logger.debug(`测试连接: ${connection.name} (${connection.id})`);

            // 设置表格测试中状态
            set(state => ({
              tableConnectionStatuses: {
                ...state.tableConnectionStatuses,
                [connection.id!]: {
                  ...state.tableConnectionStatuses[connection.id!],
                  id: connection.id!,
                  status: 'connecting',
                  error: undefined,
                },
              },
            }));

            // 调用后端测试连接API
            const result = await safeTauriInvoke<{success: boolean, latency?: number, error?: string}>('test_connection', { connectionId: connection.id });

            // 更新表格测试结果状态
            if (result.success) {
              set(state => ({
                tableConnectionStatuses: {
                  ...state.tableConnectionStatuses,
                  [connection.id!]: {
                    id: connection.id!,
                    status: 'connected' as const,
                    lastConnected: new Date(),
                    error: undefined,
                    latency: result.latency,
                  },
                },
              }));
              logger.debug(`连接测试成功: ${connection.name}`);
            } else {
              set(state => ({
                tableConnectionStatuses: {
                  ...state.tableConnectionStatuses,
                  [connection.id!]: {
                    id: connection.id!,
                    status: 'error' as const,
                    error: result.error || '连接测试失败',
                    lastConnected: state.tableConnectionStatuses[connection.id!]?.lastConnected,
                    latency: undefined,
                  },
                },
              }));
              logger.debug(`连接测试失败: ${connection.name} - ${result.error}`);
            }
          } catch (error) {
            logger.error(`测试连接异常 ${connection.name}:`, error);
            set(state => ({
              tableConnectionStatuses: {
                ...state.tableConnectionStatuses,
                [connection.id!]: {
                  id: connection.id!,
                  status: 'error' as const,
                  error: String(error),
                  lastConnected: state.tableConnectionStatuses[connection.id!]?.lastConnected,
                  latency: undefined,
                },
              },
            }));
          }
        });

        await Promise.all(testPromises);
        logger.info('所有连接测试完成');
      },

      // 同步连接到后端
      syncConnectionsToBackend: async () => {
        try {
          const { connections } = get();
          if (connections.length === 0) {
            logger.debug('没有连接需要同步');
            return;
          }

          logger.debug(`开始同步 ${connections.length} 个连接到后端`);
          const syncedIds = await safeTauriInvoke<string[]>(
            'sync_connections',
            { configs: connections }
          );
          logger.info(`成功同步 ${syncedIds?.length || 0} 个连接`);
        } catch (error) {
          logger.error('同步连接到后端失败:', error);
          throw error;
        }
      },

      // 同步连接状态 - 确保connectionStatuses和connectedConnectionIds一致
      syncConnectionStates: () => {
        set(state => {
          const newConnectedIds: string[] = [];

          // 根据connectionStatuses重新构建connectedConnectionIds
          Object.entries(state.connectionStatuses).forEach(([id, status]) => {
            if (status.status === 'connected') {
              newConnectedIds.push(id);
            }
          });

          logger.debug(
            `同步连接状态: ${newConnectedIds.length} 个连接状态为已连接`
          );

          return {
            ...state,
            connectedConnectionIds: newConnectedIds,
          };
        });
      },

      // 初始化连接状态 - 应用启动时调用
      initializeConnectionStates: () => {
        set(state => {
          const disconnectedStatuses: Record<string, ConnectionStatus> = {};

          // 为所有连接创建断开状态
          state.connections.forEach(conn => {
            if (conn.id) {
              disconnectedStatuses[conn.id] = {
                id: conn.id,
                status: 'disconnected',
                error: undefined,
                latency: undefined,
                lastConnected: undefined,
              };
            }
          });

          logger.debug('初始化连接状态: 所有连接设置为断开状态');

          return {
            ...state,
            connectionStatuses: disconnectedStatuses,
            tableConnectionStatuses: { ...disconnectedStatuses }, // 表格状态也初始化为断开
            connectedConnectionIds: [],
            activeConnectionId: null,
          };
        });
      },

      // 强制刷新连接列表
      forceRefreshConnections: async () => {
        try {
          logger.debug('强制刷新连接列表');

          // 从后端获取最新的连接配置
          const backendConnections = await safeTauriInvoke<ConnectionConfig[]>('get_connections');

          if (backendConnections) {
            logger.debug(`从后端获取到 ${backendConnections.length} 个连接配置`);

            // 清空当前状态
            set({
              connections: [],
              connectionStatuses: {},
              tableConnectionStatuses: {},
              connectedConnectionIds: [],
              activeConnectionId: null,
            });

            // 重新添加连接
            const { addConnection } = get();
            for (const conn of backendConnections) {
              addConnection(conn);
            }

            // 初始化所有连接为断开状态
            const disconnectedStatuses: Record<string, ConnectionStatus> = {};
            backendConnections.forEach(conn => {
              if (conn.id) {
                disconnectedStatuses[conn.id] = {
                  id: conn.id,
                  status: 'disconnected',
                  error: undefined,
                  latency: undefined,
                  lastConnected: undefined,
                };
              }
            });

            set(state => ({
              connectionStatuses: disconnectedStatuses,
              tableConnectionStatuses: disconnectedStatuses,
            }));

            logger.info(`强制刷新完成，当前有 ${backendConnections.length} 个连接`);
          }
        } catch (error) {
          logger.error('强制刷新连接列表失败:', error);
          throw error;
        }
      },

      // 从后端同步连接配置
      syncConnectionsFromBackend: async () => {
        try {
          logger.debug('同步后端连接配置...');
          const backendConnections = await safeTauriInvoke<ConnectionConfig[]>('get_connections');

          if (!backendConnections) {
            logger.warn('后端返回空连接列表');
            return;
          }
          
          const backendConnectionIds = new Set(backendConnections.map((conn: ConnectionConfig) => conn.id));
          
          // 检查前端连接是否在后端存在
          const { connections } = get();
          const invalidConnections: string[] = [];
          
          for (const connection of connections) {
            if (connection.id && !backendConnectionIds.has(connection.id)) {
              invalidConnections.push(connection.id);
              logger.warn(`发现无效连接: ${connection.id} (${connection.name})`);
            }
          }

          // 清理无效连接
          if (invalidConnections.length > 0) {
            logger.info(`清理 ${invalidConnections.length} 个无效连接`);
            set(state => ({
              connections: state.connections.filter(conn => conn.id && !invalidConnections.includes(conn.id)),
              connectionStatuses: Object.fromEntries(
                Object.entries(state.connectionStatuses).filter(([id]) => !invalidConnections.includes(id))
              ),
              tableConnectionStatuses: Object.fromEntries(
                Object.entries(state.tableConnectionStatuses).filter(([id]) => !invalidConnections.includes(id))
              ),
              connectedConnectionIds: state.connectedConnectionIds.filter(
                id => !invalidConnections.includes(id)
              ),
              activeConnectionId: state.activeConnectionId && invalidConnections.includes(state.activeConnectionId)
                ? null
                : state.activeConnectionId,
            }));
          }

          // 同步后端连接状态
          try {
            logger.debug('同步后端连接状态...');
            const backendStatuses = await safeTauriInvoke<Record<string, any>>('get_all_connection_statuses');

            if (backendStatuses) {
              const updatedStatuses: Record<string, ConnectionStatus> = {};
              const connectedIds: string[] = [];

              // 处理后端返回的连接状态
              Object.entries(backendStatuses).forEach(([id, status]) => {
                const isConnected = status?.status === 'connected' || status?.connected === true;

                updatedStatuses[id] = {
                  id,
                  status: isConnected ? 'connected' : 'disconnected',
                  error: status?.error,
                  latency: status?.latency,
                  lastConnected: isConnected ? new Date() : undefined,
                };

                if (isConnected) {
                  connectedIds.push(id);
                }
              });

              // 更新前端状态
              set(state => ({
                ...state,
                connectionStatuses: { ...state.connectionStatuses, ...updatedStatuses },
                tableConnectionStatuses: { ...state.tableConnectionStatuses, ...updatedStatuses },
                connectedConnectionIds: [...new Set([...state.connectedConnectionIds, ...connectedIds])],
              }));

              logger.info(`连接状态同步完成: ${connectedIds.length} 个连接已连接`);
            }
          } catch (statusError) {
            logger.warn('同步连接状态失败，将在后续重试:', statusError);
          }

          logger.info('连接配置同步完成');
        } catch (error) {
          logger.error('同步连接配置失败:', error);
        }
      },

      // 启动定期同步
      startConnectionSync: () => {
        logger.debug('启动连接配置同步机制');
        
        // 立即执行一次同步
        get().syncConnectionsFromBackend();
        
        // 每30秒同步一次
        const interval = setInterval(() => {
          get().syncConnectionsFromBackend();
        }, 30000);
        
        // 保存interval ID以便后续清理
        set(state => ({ ...state, syncInterval: interval }));
      },

      // 停止定期同步
      stopConnectionSync: () => {
        const { syncInterval } = get();
        if (syncInterval) {
          logger.debug('停止连接配置同步机制');
          clearInterval(syncInterval);
          set(state => ({ ...state, syncInterval: undefined }));
        }
      },

      // 尝试重连所有失败的连接
      attemptReconnectAll: async () => {
        logger.debug('开始尝试重连所有失败的连接...');
        const { connections, connectionStatuses } = get();

        const failedConnections = connections.filter(conn => {
          if (!conn.id) return false;
          const status = connectionStatuses[conn.id];
          return status && (status.status === 'error' || status.status === 'disconnected');
        });

        if (failedConnections.length === 0) {
          logger.debug('没有需要重连的连接');
          return;
        }

        logger.debug(`发现 ${failedConnections.length} 个需要重连的连接`);

        // 并行尝试重连所有失败的连接
        const reconnectPromises = failedConnections.map(async (connection) => {
          if (!connection.id) return false;

          try {
            return await get().attemptReconnect(connection.id);
          } catch (error) {
            logger.error(`重连失败 ${connection.name}:`, error);
            return false;
          }
        });

        const results = await Promise.all(reconnectPromises);
        const successCount = results.filter(Boolean).length;

        logger.info(`重连完成: ${successCount}/${failedConnections.length} 个连接成功重连`);
      },

      // 尝试重连单个连接
      attemptReconnect: async (id: string) => {
        logger.debug(`尝试重连: ${id}`);

        const connection = get().connections.find(conn => conn.id === id);
        if (!connection) {
          logger.warn(`连接配置不存在，无法重连: ${id}`);
          return false;
        }

        try {
          // 先测试连接是否可达
          const testResult = await get().testConnection(id);
          if (!testResult) {
            logger.debug(`连接测试失败，跳过重连: ${connection.name}`);
            return false;
          }

          // 如果测试成功，尝试建立连接
          await get().connectToDatabase(id);
          logger.info(`重连成功: ${connection.name}`);
          return true;
        } catch (error) {
          logger.error(`重连失败 ${connection.name}:`, error);

          // 如果是临时性错误，安排稍后重试
          const errorMessage = String(error);
          if (errorMessage.includes('timeout') ||
              errorMessage.includes('connection refused') ||
              errorMessage.includes('unreachable')) {
            logger.debug(`安排稍后重试重连: ${connection.name}`);
            get().scheduleReconnect(id, 30000); // 30秒后重试
          }

          return false;
        }
      },

      // 安排重连
      scheduleReconnect: (id: string, delayMs = 30000) => {
        const { reconnectTimers } = get();

        // 取消现有的重连定时器
        if (reconnectTimers[id]) {
          clearTimeout(reconnectTimers[id]);
        }

        const connection = get().connections.find(conn => conn.id === id);
        if (!connection) return;

        logger.debug(`安排 ${delayMs/1000} 秒后重连: ${connection.name}`);

        const timer = setTimeout(async () => {
          logger.debug(`执行定时重连: ${connection.name}`);

          try {
            const success = await get().attemptReconnect(id);
            if (!success) {
              // 如果重连失败，安排下次重连（指数退避）
              const nextDelay = Math.min(delayMs * 2, 300000); // 最大5分钟
              get().scheduleReconnect(id, nextDelay);
            }
          } catch (error) {
            logger.error(`定时重连失败 ${connection.name}:`, error);
          }

          // 清理定时器
          set(state => {
            const newTimers = { ...state.reconnectTimers };
            delete newTimers[id];
            return { ...state, reconnectTimers: newTimers };
          });
        }, delayMs);

        // 保存定时器
        set(state => ({
          ...state,
          reconnectTimers: {
            ...state.reconnectTimers,
            [id]: timer,
          },
        }));
      },

      // 取消安排的重连
      cancelScheduledReconnect: (id: string) => {
        const { reconnectTimers } = get();

        if (reconnectTimers[id]) {
          clearTimeout(reconnectTimers[id]);

          set(state => {
            const newTimers = { ...state.reconnectTimers };
            delete newTimers[id];
            return { ...state, reconnectTimers: newTimers };
          });

          const connection = get().connections.find(conn => conn.id === id);
          logger.debug(`取消安排的重连: ${connection?.name || id}`);
        }
      },
    }),
    {
      name: 'influx-gui-connection-store',
      partialize: state => ({
        connections: state.connections,
        // 不持久化连接状态，每次启动都应该是断开状态
        // connectedConnectionIds: state.connectedConnectionIds,
        // activeConnectionId: state.activeConnectionId,
      }),
    }
  )
);

// 生成连接ID (备用函数，优先使用 generateUniqueId)
function generateConnectionId(): string {
  return generateUniqueId('conn');
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
    const { connections, connectionStatuses, connectedConnectionIds } =
      useConnectionStore.getState();

    // 优先检查connectionStatuses中是否有连接状态为connected的连接
    const hasConnectedByStatus = connections.some(conn => {
      if (!conn.id) return false;
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
    const { connections, connectionStatuses, connectedConnectionIds } =
      useConnectionStore.getState();

    // 优先使用connectionStatuses中的状态计数
    const countByStatus = connections.filter(conn => {
      if (!conn.id) return false;
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

    if (config.timeout && (config.timeout < 1 || config.timeout > 300)) {
      errors.push('超时时间必须在 1-300 秒之间');
    }

    return errors;
  },

  // 创建默认连接配置
  createDefaultConfig: (): Partial<ConnectionConfig> => {
    const defaults = createDefaultConnectionConfig();
    return {
      name: defaults.name,
      host: defaults.host,
      port: defaults.port,
      username: defaults.username,
      password: defaults.password,
      ssl: defaults.ssl,
      timeout: defaults.timeout,
    };
  },
};
