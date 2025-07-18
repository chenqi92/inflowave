import { invoke } from '@tauri-apps/api/core';
import { portDiscoveryService } from './portDiscovery';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message: string;
  timestamp: number;
  latency?: number;
  details?: Record<string, any>;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  checks: HealthCheckResult[];
  timestamp: number;
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private healthCheckInterval?: NodeJS.Timeout;
  private listeners: Array<(status: SystemHealthStatus) => void> = [];
  private lastHealthStatus: SystemHealthStatus = {
    overall: 'unhealthy',
    checks: [],
    timestamp: Date.now(),
  };

  private constructor() {}

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * 开始健康检查
   */
  startHealthCheck(interval: number = 30000): void {
    this.stopHealthCheck();
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.performHealthCheck();
        this.notifyListeners(status);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, interval);

    // 立即执行一次健康检查
    this.performHealthCheck().then((status) => {
      this.notifyListeners(status);
    });
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  /**
   * 执行完整的健康检查
   */
  async performHealthCheck(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // 1. 检查端口管理器状态
    const portCheck = await this.checkPortManager();
    checks.push(portCheck);

    // 2. 检查前端开发服务器
    const devServerCheck = await this.checkDevServer();
    checks.push(devServerCheck);

    // 3. 检查后端 Tauri 应用
    const tauriCheck = await this.checkTauriApp();
    checks.push(tauriCheck);

    // 4. 检查系统资源
    const systemCheck = await this.checkSystemResources();
    checks.push(systemCheck);

    // 5. 检查网络连接
    const networkCheck = await this.checkNetworkConnectivity();
    checks.push(networkCheck);

    // 计算整体状态
    const overall = this.calculateOverallStatus(checks);

    const status: SystemHealthStatus = {
      overall,
      checks,
      timestamp: Date.now(),
    };

    this.lastHealthStatus = status;
    return status;
  }

  /**
   * 检查端口管理器状态
   */
  private async checkPortManager(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 检查端口管理器是否初始化
      const currentPort = await portDiscoveryService.getServicePort('frontend-dev-server');
      const isAvailable = currentPort ? await portDiscoveryService.isPortAvailable(currentPort) : false;
      
      const latency = Date.now() - startTime;
      
      if (currentPort && isAvailable) {
        return {
          component: 'Port Manager',
          status: 'healthy',
          message: `端口管理器正常运行，当前端口: ${currentPort}`,
          timestamp: Date.now(),
          latency,
          details: { port: currentPort },
        };
      } else {
        return {
          component: 'Port Manager',
          status: 'unhealthy',
          message: currentPort ? `端口 ${currentPort} 不可用` : '端口管理器未初始化',
          timestamp: Date.now(),
          latency,
          details: { port: currentPort },
        };
      }
    } catch (error) {
      return {
        component: 'Port Manager',
        status: 'unhealthy',
        message: `端口管理器检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查前端开发服务器
   */
  private async checkDevServer(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const currentPort = portDiscoveryService.getCurrentPort();
      const url = `http://localhost:${currentPort}`;
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5秒超时
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        return {
          component: 'Dev Server',
          status: 'healthy',
          message: `开发服务器正常运行在端口 ${currentPort}`,
          timestamp: Date.now(),
          latency,
          details: { port: currentPort, url },
        };
      } else {
        return {
          component: 'Dev Server',
          status: 'unhealthy',
          message: `开发服务器响应异常: ${response.status} ${response.statusText}`,
          timestamp: Date.now(),
          latency,
          details: { port: currentPort, url, status: response.status },
        };
      }
    } catch (error) {
      return {
        component: 'Dev Server',
        status: 'unhealthy',
        message: `开发服务器检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查 Tauri 应用状态
   */
  private async checkTauriApp(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 调用 Tauri 命令检查应用状态
      const healthStatus = await invoke<boolean>('health_check');
      const latency = Date.now() - startTime;
      
      if (healthStatus) {
        return {
          component: 'Tauri App',
          status: 'healthy',
          message: 'Tauri 应用运行正常',
          timestamp: Date.now(),
          latency,
        };
      } else {
        return {
          component: 'Tauri App',
          status: 'unhealthy',
          message: 'Tauri 应用健康检查失败',
          timestamp: Date.now(),
          latency,
        };
      }
    } catch (error) {
      return {
        component: 'Tauri App',
        status: 'unhealthy',
        message: `Tauri 应用检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查系统资源
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const systemInfo = await invoke<any>('get_system_info');
      const latency = Date.now() - startTime;
      
      // 检查内存使用率
      const memoryUsage = (systemInfo.used_memory / systemInfo.total_memory) * 100;
      const cpuUsage = systemInfo.cpu_usage || 0;
      
      let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
      let message = '系统资源正常';
      
      if (memoryUsage > 90 || cpuUsage > 90) {
        status = 'unhealthy';
        message = '系统资源严重不足';
      } else if (memoryUsage > 70 || cpuUsage > 70) {
        status = 'degraded';
        message = '系统资源使用率较高';
      }
      
      return {
        component: 'System Resources',
        status: status as 'healthy' | 'unhealthy',
        message,
        timestamp: Date.now(),
        latency,
        details: {
          memory: {
            usage: `${memoryUsage.toFixed(2)  }%`,
            total: systemInfo.total_memory,
            used: systemInfo.used_memory,
          },
          cpu: {
            usage: `${cpuUsage.toFixed(2)  }%`,
          },
        },
      };
    } catch (error) {
      return {
        component: 'System Resources',
        status: 'unhealthy',
        message: `系统资源检查失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * 检查网络连接
   */
  private async checkNetworkConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // 检查本地网络连接
      const response = await fetch('http://localhost:1', { 
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2秒超时
      });
      
      const latency = Date.now() - startTime;
      
      return {
        component: 'Network',
        status: 'healthy',
        message: '网络连接正常',
        timestamp: Date.now(),
        latency,
      };
    } catch (error) {
      // 网络错误是预期的，因为我们只是测试连接性
      if (navigator.onLine) {
        return {
          component: 'Network',
          status: 'healthy',
          message: '网络连接正常',
          timestamp: Date.now(),
          latency: Date.now() - startTime,
        };
      } else {
        return {
          component: 'Network',
          status: 'unhealthy',
          message: '网络连接断开',
          timestamp: Date.now(),
          latency: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * 计算整体状态
   */
  private calculateOverallStatus(checks: HealthCheckResult[]): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    
    if (unhealthyCount > 0) {
      return unhealthyCount >= checks.length / 2 ? 'unhealthy' : 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * 添加健康状态监听器
   */
  addListener(listener: (status: SystemHealthStatus) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除健康状态监听器
   */
  removeListener(listener: (status: SystemHealthStatus) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(status: SystemHealthStatus): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Health check listener error:', error);
      }
    });
  }

  /**
   * 获取最后的健康状态
   */
  getLastHealthStatus(): SystemHealthStatus {
    return this.lastHealthStatus;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.stopHealthCheck();
    this.listeners = [];
  }
}

// 默认导出单例实例
export const healthCheckService = HealthCheckService.getInstance();