import { safeTauriInvoke } from '@/utils/tauri';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

export interface ConnectionPoolConfig {
  minConnections: number;
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxRetries: number;
  retryInterval: number;
  healthCheckInterval: number;
  enablePooling: boolean;
}

export interface ConnectionPoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  failedConnections: number;
  avgConnectionTime: number;
  poolUtilization: number;
  lastHealthCheck: Date;
}

export interface PoolConnection {
  id: string;
  connectionId: string;
  status: 'idle' | 'active' | 'failed';
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

/**
 * 高级连接池管理器
 */
export class ConnectionPoolManager {
  private static instance: ConnectionPoolManager;
  private pools = new Map<string, ConnectionPool>();
  private defaultConfig: ConnectionPoolConfig = {
    minConnections: 2,
    maxConnections: 10,
    connectionTimeout: 30000,
    idleTimeout: 300000, // 5分钟
    maxRetries: 3,
    retryInterval: 1000,
    healthCheckInterval: 60000, // 1分钟
    enablePooling: true};

  private constructor() {}

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * 创建连接池
   */
  async createPool(connectionId: string, config?: Partial<ConnectionPoolConfig>): Promise<void> {
    const poolConfig = { ...this.defaultConfig, ...config };
    const pool = new ConnectionPool(connectionId, poolConfig);
    this.pools.set(connectionId, pool);
    await pool.initialize();
  }

  /**
   * 获取连接
   */
  async getConnection(connectionId: string): Promise<PoolConnection | null> {
    const pool = this.pools.get(connectionId);
    if (!pool) {
      throw new Error(`Connection pool not found for connection: ${connectionId}`);
    }
    return pool.getConnection();
  }

  /**
   * 释放连接
   */
  async releaseConnection(connectionId: string, connection: PoolConnection): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (!pool) {
      throw new Error(`Connection pool not found for connection: ${connectionId}`);
    }
    return pool.releaseConnection(connection);
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(connectionId: string): ConnectionPoolStats | null {
    const pool = this.pools.get(connectionId);
    return pool ? pool.getStats() : null;
  }

  /**
   * 获取所有连接池统计信息
   */
  getAllPoolStats(): Record<string, ConnectionPoolStats> {
    const stats: Record<string, ConnectionPoolStats> = {};
    this.pools.forEach((pool, connectionId) => {
      stats[connectionId] = pool.getStats();
    });
    return stats;
  }

  /**
   * 销毁连接池
   */
  async destroyPool(connectionId: string): Promise<void> {
    const pool = this.pools.get(connectionId);
    if (pool) {
      await pool.destroy();
      this.pools.delete(connectionId);
    }
  }

  /**
   * 健康检查所有连接池
   */
  async healthCheckAllPools(): Promise<void> {
    const promises = Array.from(this.pools.values()).map(pool => pool.healthCheck());
    await Promise.all(promises);
  }

  /**
   * 优化连接池配置
   */
  async optimizePoolConfiguration(connectionId: string, usageStats: any): Promise<ConnectionPoolConfig> {
    const currentConfig = this.pools.get(connectionId)?.getConfig() || this.defaultConfig;
    
    // 基于使用统计优化配置
    const optimizedConfig: ConnectionPoolConfig = {
      ...currentConfig,
      // 根据平均使用量调整最大连接数
      maxConnections: Math.max(
        Math.min(Math.ceil(usageStats.avgConcurrentQueries * 1.5), 20),
        currentConfig.minConnections
      ),
      // 根据查询频率调整空闲超时
      idleTimeout: usageStats.avgQueryInterval > 600000 ? 300000 : 600000,
      // 根据错误率调整重试配置
      maxRetries: usageStats.errorRate > 0.1 ? 5 : 3};

    return optimizedConfig;
  }
}

/**
 * 连接池实现
 */
class ConnectionPool {
  private connections: PoolConnection[] = [];
  private waitingQueue: Array<{
    resolve: (connection: PoolConnection) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  private healthCheckTimer?: NodeJS.Timeout;
  private stats: ConnectionPoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    failedConnections: 0,
    avgConnectionTime: 0,
    poolUtilization: 0,
    lastHealthCheck: new Date()};

  constructor(
    private connectionId: string,
    private config: ConnectionPoolConfig
  ) {}

  /**
   * 初始化连接池
   */
  async initialize(): Promise<void> {
    if (!this.config.enablePooling) {
      return;
    }

    // 创建最小连接数
    const promises = [];
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection());
    }

    await Promise.all(promises);

    // 启动健康检查
    this.startHealthCheck();
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<PoolConnection> {
    if (!this.config.enablePooling) {
      return this.createDirectConnection();
    }

    // 查找空闲连接
    const idleConnection = this.connections.find(conn => conn.status === 'idle');
    if (idleConnection) {
      idleConnection.status = 'active';
      idleConnection.lastUsed = new Date();
      idleConnection.useCount++;
      this.updateStats();
      return idleConnection;
    }

    // 如果没有空闲连接且未达到最大连接数，创建新连接
    if (this.connections.length < this.config.maxConnections) {
      const connection = await this.createConnection();
      connection.status = 'active';
      connection.lastUsed = new Date();
      connection.useCount++;
      this.updateStats();
      return connection;
    }

    // 等待连接可用
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);

      this.waitingQueue.push({
        resolve: (connection) => {
          clearTimeout(timeout);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        timestamp: Date.now()});

      this.stats.waitingRequests = this.waitingQueue.length;
    });
  }

  /**
   * 释放连接
   */
  async releaseConnection(connection: PoolConnection): Promise<void> {
    if (!this.config.enablePooling) {
      await this.destroyConnection(connection);
      return;
    }

    connection.status = 'idle';
    connection.lastUsed = new Date();

    // 处理等待队列
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift();
      if (waiter) {
        connection.status = 'active';
        connection.useCount++;
        waiter.resolve(connection);
      }
    }

    this.updateStats();
  }

  /**
   * 创建新连接
   */
  private async createConnection(): Promise<PoolConnection> {
    const connection: PoolConnection = {
      id: `pool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectionId: this.connectionId,
      status: 'idle',
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0};

    try {
      await safeTauriInvoke('create_pool_connection', {
        connection_id: this.connectionId,
        poolConnectionId: connection.id});

      this.connections.push(connection);
      this.stats.totalConnections++;
      return connection;
    } catch (error) {
      this.stats.failedConnections++;
      throw error;
    }
  }

  /**
   * 创建直接连接（不使用池）
   */
  private async createDirectConnection(): Promise<PoolConnection> {
    const connection: PoolConnection = {
      id: `direct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectionId: this.connectionId,
      status: 'active',
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1};

    await safeTauriInvoke('create_direct_connection', {
      connectionId: this.connectionId,
      directConnectionId: connection.id});

    return connection;
  }

  /**
   * 销毁连接
   */
  private async destroyConnection(connection: PoolConnection): Promise<void> {
    try {
      await safeTauriInvoke('destroy_pool_connection', {
        connection_id: this.connectionId,
        poolConnectionId: connection.id});

      const index = this.connections.indexOf(connection);
      if (index !== -1) {
        this.connections.splice(index, 1);
        this.stats.totalConnections--;
      }
    } catch (error) {
      console.error('Failed to destroy connection:', error);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<void> {
    const now = Date.now();
    const promises: Promise<void>[] = [];

    // 检查空闲连接是否超时
    for (const connection of this.connections) {
      if (connection.status === 'idle') {
        const idleTime = now - connection.lastUsed.getTime();
        if (idleTime > this.config.idleTimeout) {
          promises.push(this.destroyConnection(connection));
        }
      }
    }

    // 测试连接有效性
    for (const connection of this.connections) {
      if (connection.status === 'idle') {
        promises.push(this.testConnection(connection));
      }
    }

    await Promise.all(promises);

    // 确保最小连接数
    while (this.connections.length < this.config.minConnections) {
      try {
        await this.createConnection();
      } catch (error) {
        console.error('Failed to create connection during health check:', error);
        break;
      }
    }

    this.stats.lastHealthCheck = new Date();
    this.updateStats();
  }

  /**
   * 测试连接
   */
  private async testConnection(connection: PoolConnection): Promise<void> {
    try {
      await safeTauriInvoke('test_pool_connection', {
        connection_id: this.connectionId,
        poolConnectionId: connection.id});
    } catch (error) {
      connection.status = 'failed';
      this.stats.failedConnections++;
      await this.destroyConnection(connection);
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.healthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    this.stats.activeConnections = this.connections.filter(conn => conn.status === 'active').length;
    this.stats.idleConnections = this.connections.filter(conn => conn.status === 'idle').length;
    this.stats.waitingRequests = this.waitingQueue.length;
    this.stats.poolUtilization = this.stats.totalConnections > 0 
      ? this.stats.activeConnections / this.stats.totalConnections 
      : 0;
  }

  /**
   * 获取统计信息
   */
  getStats(): ConnectionPoolStats {
    return { ...this.stats };
  }

  /**
   * 获取配置
   */
  getConfig(): ConnectionPoolConfig {
    return { ...this.config };
  }

  /**
   * 销毁连接池
   */
  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const promises = this.connections.map(connection => this.destroyConnection(connection));
    await Promise.all(promises);

    // 清空等待队列
    this.waitingQueue.forEach(waiter => {
      waiter.reject(new Error('Connection pool destroyed'));
    });
    this.waitingQueue = [];

    this.connections = [];
    this.stats.totalConnections = 0;
    this.stats.activeConnections = 0;
    this.stats.idleConnections = 0;
    this.stats.waitingRequests = 0;
  }
}

export default ConnectionPoolManager;