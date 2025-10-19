import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { logger } from '@/utils/logger';
export interface PortInfo {
  port: number;
  is_available: boolean;
  last_check: string;
  service_name: string;
}

export interface PortEvent {
  type: 'PortChanged' | 'PortConflict' | 'PortAvailable' | 'HealthCheckFailed' | 'HealthCheckSuccess';
  old_port?: number;
  new_port?: number;
  port?: number;
  service?: string;
  error?: string;
}

export class PortDiscoveryService {
  private static instance: PortDiscoveryService;
  private listeners: UnlistenFn[] = [];
  private currentPort: number = 1421;
  private eventCallbacks: Map<string, ((event: PortEvent) => void)[]> = new Map();

  private constructor() {}

  static getInstance(): PortDiscoveryService {
    if (!PortDiscoveryService.instance) {
      PortDiscoveryService.instance = new PortDiscoveryService();
    }
    return PortDiscoveryService.instance;
  }

  /**
   * 初始化端口发现服务
   */
  async initialize(): Promise<void> {
    try {
      // 初始化 Rust 端口管理器
      await invoke('init_port_manager');
      
      // 监听端口事件
      const unlisten = await listen<PortEvent>('port-event', (event) => {
        this.handlePortEvent(event.payload);
      });
      
      this.listeners.push(unlisten);
      
      // 确保前端端口可用
      const port = await this.ensureFrontendPortAvailable();
      this.currentPort = port;
      
      logger.debug(`Port discovery service initialized. Current port: ${this.currentPort}`);
    } catch (error) {
      logger.error('Failed to initialize port discovery service:', error);
      throw error;
    }
  }

  /**
   * 为服务分配端口
   */
  async allocatePort(serviceName: string): Promise<number> {
    try {
      const port = await invoke<number>('allocate_port', { serviceName });
      logger.debug(`Port ${port} allocated for service: ${serviceName}`);
      return port;
    } catch (error) {
      logger.error(`Failed to allocate port for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * 确保前端端口可用
   */
  async ensureFrontendPortAvailable(): Promise<number> {
    try {
      const port = await invoke<number>('ensure_frontend_port_available');
      logger.debug(`Frontend port ensured: ${port}`);
      this.currentPort = port;
      return port;
    } catch (error) {
      logger.error('Failed to ensure frontend port availability:', error);
      throw error;
    }
  }

  /**
   * 获取前端端口
   */
  async getFrontendPort(): Promise<number | null> {
    try {
      const port = await invoke<number | null>('get_frontend_port');
      return port;
    } catch (error) {
      logger.error('Failed to get frontend port:', error);
      return null;
    }
  }

  /**
   * 释放服务端口
   */
  async releasePort(serviceName: string): Promise<void> {
    try {
      await invoke('release_port', { serviceName });
      logger.debug(`Port released for service: ${serviceName}`);
    } catch (error) {
      logger.error(`Failed to release port for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * 获取当前端口
   */
  getCurrentPort(): number {
    return this.currentPort;
  }

  /**
   * 获取服务端口
   */
  async getServicePort(serviceName: string): Promise<number | null> {
    try {
      const port = await invoke<number | null>('get_service_port', { serviceName });
      return port;
    } catch (error) {
      logger.error(`Failed to get port for service ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * 检查端口是否可用
   */
  async isPortAvailable(port: number): Promise<boolean> {
    try {
      const available = await invoke<boolean>('is_port_available', { port });
      return available;
    } catch (error) {
      logger.error(`Failed to check port availability for ${port}:`, error);
      return false;
    }
  }

  /**
   * 进行健康检查
   */
  async healthCheck(serviceName: string): Promise<boolean> {
    try {
      const healthy = await invoke<boolean>('port_health_check', { serviceName });
      return healthy;
    } catch (error) {
      logger.error(`Health check failed for service ${serviceName}:`, error);
      return false;
    }
  }

  /**
   * 启动健康检查循环
   */
  async startHealthCheckLoop(serviceName: string): Promise<void> {
    try {
      await invoke('start_health_check_loop', { serviceName });
      logger.debug(`Health check loop started for service: ${serviceName}`);
    } catch (error) {
      logger.error(`Failed to start health check loop for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * 尝试重新分配端口
   */
  async reallocatePort(serviceName: string): Promise<number> {
    try {
      const port = await invoke<number>('try_reallocate_port', { serviceName });
      if (serviceName === 'frontend-dev-server') {
        this.currentPort = port;
      }
      logger.debug(`Port reallocated for service ${serviceName}: ${port}`);
      return port;
    } catch (error) {
      logger.error(`Failed to reallocate port for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * 检查端口冲突
   */
  async checkPortConflicts(): Promise<string[]> {
    try {
      const conflicts = await invoke<string[]>('check_port_conflicts');
      return conflicts;
    } catch (error) {
      logger.error('Failed to check port conflicts:', error);
      return [];
    }
  }

  /**
   * 获取端口统计信息
   */
  async getPortStats(): Promise<Record<string, PortInfo>> {
    try {
      const stats = await invoke<Record<string, PortInfo>>('get_port_stats');
      return stats;
    } catch (error) {
      logger.error('Failed to get port stats:', error);
      return {};
    }
  }

  /**
   * 注册端口事件监听器
   */
  onPortEvent(eventType: string, callback: (event: PortEvent) => void): void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);
  }

  /**
   * 移除端口事件监听器
   */
  offPortEvent(eventType: string, callback: (event: PortEvent) => void): void {
    const callbacks = this.eventCallbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 处理端口事件
   */
  private handlePortEvent(event: PortEvent): void {
    logger.debug('Port event received:', event);
    
    // 更新当前端口
    if (event.type === 'PortChanged' && event.new_port) {
      this.currentPort = event.new_port;
    }
    
    // 通知监听器
    const callbacks = this.eventCallbacks.get(event.type);
    if (callbacks) {
      callbacks.forEach(callback => callback(event));
    }
    
    // 通知所有事件监听器
    const allCallbacks = this.eventCallbacks.get('*');
    if (allCallbacks) {
      allCallbacks.forEach(callback => callback(event));
    }
  }

  /**
   * 自动处理端口冲突
   */
  async handlePortConflict(serviceName: string): Promise<number> {
    logger.warn(`Port conflict detected for service: ${serviceName}`);
    
    try {
      // 尝试重新分配端口
      const newPort = await this.reallocatePort(serviceName);
      
      // 如果是前端服务，需要重新启动开发服务器
      if (serviceName === 'frontend-dev-server') {
        this.notifyPortChange(newPort);
      }
      
      return newPort;
    } catch (error) {
      logger.error(`Failed to handle port conflict for service ${serviceName}:`, error);
      throw error;
    }
  }

  /**
   * 通知端口变更
   */
  private notifyPortChange(newPort: number): void {
    logger.debug(`Frontend port changed to: ${newPort}`);
    
    // 这里可以添加 UI 通知或其他处理逻辑
    // 比如显示 toast 通知用户端口已更改
    
    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('port-changed', {
      detail: { newPort, oldPort: this.currentPort }
    }));
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 取消所有监听器
      for (const unlisten of this.listeners) {
        await unlisten();
      }
      this.listeners = [];
      
      // 清理回调
      this.eventCallbacks.clear();
      
      // 释放前端服务端口
      await this.releasePort('frontend-dev-server');
      
      logger.debug('Port discovery service cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup port discovery service:', error);
    }
  }
}

// 默认导出单例实例
export const portDiscoveryService = PortDiscoveryService.getInstance();