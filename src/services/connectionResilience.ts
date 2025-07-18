import { invoke } from '@tauri-apps/api/core';
import { portDiscoveryService } from './portDiscovery';

export interface ConnectionAttempt {
  timestamp: number;
  success: boolean;
  error?: string;
  latency?: number;
}

export interface ReconnectionConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface ConnectionState {
  isConnected: boolean;
  isReconnecting: boolean;
  attempts: ConnectionAttempt[];
  lastSuccessful: number | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export class ConnectionResilienceService {
  private static instance: ConnectionResilienceService;
  private reconnectionConfig: ReconnectionConfig = {
    maxRetries: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
  };
  
  private connectionState: ConnectionState = {
    isConnected: false,
    isReconnecting: false,
    attempts: [],
    lastSuccessful: null,
    lastError: null,
    consecutiveFailures: 0,
  };

  private reconnectionTimeout?: NodeJS.Timeout;
  private listeners: Array<(state: ConnectionState) => void> = [];
  private heartbeatInterval?: NodeJS.Timeout;

  private constructor() {
    this.setupNetworkEventListeners();
  }

  static getInstance(): ConnectionResilienceService {
    if (!ConnectionResilienceService.instance) {
      ConnectionResilienceService.instance = new ConnectionResilienceService();
    }
    return ConnectionResilienceService.instance;
  }

  /**
   * 设置重连配置
   */
  setReconnectionConfig(config: Partial<ReconnectionConfig>): void {
    this.reconnectionConfig = { ...this.reconnectionConfig, ...config };
  }

  /**
   * 获取当前连接状态
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * 开始连接监控
   */
  async startMonitoring(): Promise<void> {
    console.log('Starting connection monitoring...');
    
    // 立即进行一次连接检查
    await this.checkConnection();
    
    // 启动心跳检查
    this.startHeartbeat();
  }

  /**
   * 停止连接监控
   */
  stopMonitoring(): void {
    console.log('Stopping connection monitoring...');
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
      this.reconnectionTimeout = undefined;
    }
    
    this.connectionState.isReconnecting = false;
    this.notifyListeners();
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // 检查端口管理器
      const portHealthy = await this.checkPortManager();
      
      // 检查 Tauri 应用连接
      const tauriHealthy = await this.checkTauriConnection();
      
      // 检查前端服务器
      const frontendHealthy = await this.checkFrontendServer();
      
      const isConnected = portHealthy && tauriHealthy && frontendHealthy;
      const latency = Date.now() - startTime;
      
      this.recordConnectionAttempt(isConnected, undefined, latency);
      
      if (isConnected) {
        this.handleSuccessfulConnection();
      } else {
        this.handleFailedConnection('Connection health check failed');
      }
      
      return isConnected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      this.recordConnectionAttempt(false, errorMessage, Date.now() - startTime);
      this.handleFailedConnection(errorMessage);
      return false;
    }
  }

  /**
   * 检查端口管理器
   */
  private async checkPortManager(): Promise<boolean> {
    try {
      const currentPort = await portDiscoveryService.getServicePort('frontend-dev-server');
      return currentPort !== null;
    } catch (error) {
      console.error('Port manager check failed:', error);
      return false;
    }
  }

  /**
   * 检查 Tauri 连接
   */
  private async checkTauriConnection(): Promise<boolean> {
    try {
      const result = await invoke<boolean>('health_check');
      return result === true;
    } catch (error) {
      console.error('Tauri connection check failed:', error);
      return false;
    }
  }

  /**
   * 检查前端服务器
   */
  private async checkFrontendServer(): Promise<boolean> {
    try {
      const currentPort = portDiscoveryService.getCurrentPort();
      const response = await fetch(`http://localhost:${currentPort}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch (error) {
      console.error('Frontend server check failed:', error);
      return false;
    }
  }

  /**
   * 记录连接尝试
   */
  private recordConnectionAttempt(success: boolean, error?: string, latency?: number): void {
    const attempt: ConnectionAttempt = {
      timestamp: Date.now(),
      success,
      error,
      latency,
    };
    
    this.connectionState.attempts.push(attempt);
    
    // 只保留最近 50 次尝试
    if (this.connectionState.attempts.length > 50) {
      this.connectionState.attempts = this.connectionState.attempts.slice(-50);
    }
  }

  /**
   * 处理成功的连接
   */
  private handleSuccessfulConnection(): void {
    const wasReconnecting = this.connectionState.isReconnecting;
    
    this.connectionState.isConnected = true;
    this.connectionState.isReconnecting = false;
    this.connectionState.lastSuccessful = Date.now();
    this.connectionState.lastError = null;
    this.connectionState.consecutiveFailures = 0;
    
    if (wasReconnecting) {
      console.log('Connection restored successfully');
    }
    
    this.notifyListeners();
  }

  /**
   * 处理失败的连接
   */
  private handleFailedConnection(error: string): void {
    this.connectionState.isConnected = false;
    this.connectionState.lastError = error;
    this.connectionState.consecutiveFailures++;
    
    if (!this.connectionState.isReconnecting) {
      console.log(`Connection failed: ${error}. Starting reconnection...`);
      this.startReconnection();
    }
    
    this.notifyListeners();
  }

  /**
   * 开始重连过程
   */
  private startReconnection(): void {
    if (this.connectionState.isReconnecting) {
      return;
    }
    
    this.connectionState.isReconnecting = true;
    this.notifyListeners();
    
    this.attemptReconnection(0);
  }

  /**
   * 尝试重新连接
   */
  private async attemptReconnection(attemptNumber: number): Promise<void> {
    if (attemptNumber >= this.reconnectionConfig.maxRetries) {
      console.error('Maximum reconnection attempts reached');
      this.connectionState.isReconnecting = false;
      this.notifyListeners();
      return;
    }
    
    const delay = this.calculateDelay(attemptNumber);
    console.log(`Reconnection attempt ${attemptNumber + 1}/${this.reconnectionConfig.maxRetries} in ${delay}ms`);
    
    this.reconnectionTimeout = setTimeout(async () => {
      try {
        // 尝试重新初始化关键服务
        await this.reinitializeServices();
        
        // 检查连接
        const isConnected = await this.checkConnection();
        
        if (isConnected) {
          console.log('Reconnection successful');
          return;
        }
        
        // 如果连接失败，继续重试
        this.attemptReconnection(attemptNumber + 1);
      } catch (error) {
        console.error('Reconnection attempt failed:', error);
        this.attemptReconnection(attemptNumber + 1);
      }
    }, delay);
  }

  /**
   * 计算重连延迟
   */
  private calculateDelay(attemptNumber: number): number {
    let delay = this.reconnectionConfig.initialDelay * 
                Math.pow(this.reconnectionConfig.backoffFactor, attemptNumber);
    
    delay = Math.min(delay, this.reconnectionConfig.maxDelay);
    
    if (this.reconnectionConfig.jitter) {
      // 添加随机抖动以避免惊群效应
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * 重新初始化服务
   */
  private async reinitializeServices(): Promise<void> {
    try {
      // 重新初始化端口管理器
      await portDiscoveryService.initialize();
      
      // 检查端口冲突并解决
      const conflicts = await portDiscoveryService.checkPortConflicts();
      if (conflicts.length > 0) {
        console.log('Resolving port conflicts:', conflicts);
        for (const service of conflicts) {
          await portDiscoveryService.reallocatePort(service);
        }
      }
      
      console.log('Services reinitialized successfully');
    } catch (error) {
      console.error('Failed to reinitialize services:', error);
      throw error;
    }
  }

  /**
   * 启动心跳检查
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(async () => {
      await this.checkConnection();
    }, 15000); // 每 15 秒检查一次
  }

  /**
   * 设置网络事件监听器
   */
  private setupNetworkEventListeners(): void {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      console.log('Network came back online');
      this.checkConnection();
    });
    
    window.addEventListener('offline', () => {
      console.log('Network went offline');
      this.handleFailedConnection('Network offline');
    });
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking connection');
        this.checkConnection();
      }
    });
  }

  /**
   * 添加状态监听器
   */
  addListener(listener: (state: ConnectionState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除状态监听器
   */
  removeListener(listener: (state: ConnectionState) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(): void {
    const state = this.getConnectionState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Connection state listener error:', error);
      }
    });
  }

  /**
   * 获取连接统计信息
   */
  getConnectionStats(): {
    totalAttempts: number;
    successRate: number;
    averageLatency: number;
    lastSuccessful: number | null;
    consecutiveFailures: number;
  } {
    const totalAttempts = this.connectionState.attempts.length;
    const successfulAttempts = this.connectionState.attempts.filter(a => a.success).length;
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0;
    
    const latencies = this.connectionState.attempts
      .filter(a => a.latency !== undefined)
      .map(a => a.latency!);
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0;
    
    return {
      totalAttempts,
      successRate,
      averageLatency,
      lastSuccessful: this.connectionState.lastSuccessful,
      consecutiveFailures: this.connectionState.consecutiveFailures,
    };
  }

  /**
   * 强制重连
   */
  async forceReconnect(): Promise<void> {
    console.log('Forcing reconnection...');
    
    // 停止当前重连过程
    if (this.reconnectionTimeout) {
      clearTimeout(this.reconnectionTimeout);
    }
    
    // 重置状态
    this.connectionState.isReconnecting = false;
    this.connectionState.consecutiveFailures = 0;
    
    // 开始重连
    this.startReconnection();
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopMonitoring();
    this.listeners = [];
    
    // 移除事件监听器
    window.removeEventListener('online', this.checkConnection);
    window.removeEventListener('offline', this.checkConnection);
    document.removeEventListener('visibilitychange', this.checkConnection);
  }
}

// 默认导出单例实例
export const connectionResilienceService = ConnectionResilienceService.getInstance();