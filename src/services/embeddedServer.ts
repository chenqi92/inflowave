import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import logger from '@/utils/logger';

export interface ServerConfig {
  enabled: boolean;
  preferred_port: number;
  port_range: [number, number];
  auto_start: boolean;
  features: string[];
}

export class EmbeddedServerService {
  private static instance: EmbeddedServerService;
  private listeners: UnlistenFn[] = [];
  private serverPort: number | null = null;
  private isRunning: boolean = false;

  private constructor() {}

  static getInstance(): EmbeddedServerService {
    if (!EmbeddedServerService.instance) {
      EmbeddedServerService.instance = new EmbeddedServerService();
    }
    return EmbeddedServerService.instance;
  }

  /**
   * 初始化嵌入式服务器监控
   */
  async initialize(): Promise<void> {
    try {
      // 监听服务器启动事件
      const unlisten = await listen<number>('embedded-server-started', (event) => {
        this.serverPort = event.payload;
        this.isRunning = true;
        logger.info(`嵌入式服务器已启动，端口: ${this.serverPort}`);
      });
      
      this.listeners.push(unlisten);
      
      // 检查当前状态
      await this.checkStatus();
      
      logger.info('嵌入式服务器服务已初始化');
    } catch (error) {
      logger.error('初始化嵌入式服务器服务失败:', error);
      throw error;
    }
  }

  /**
   * 初始化嵌入式服务器
   */
  async initServer(config: ServerConfig): Promise<void> {
    try {
      await invoke('initEmbeddedServerCmd', { config });
      logger.info('嵌入式服务器已初始化');
    } catch (error) {
      logger.error('初始化嵌入式服务器失败:', error);
      throw error;
    }
  }

  /**
   * 启动嵌入式服务器
   */
  async startServer(): Promise<number> {
    try {
      const port = await invoke<number>('startEmbeddedServerCmd');
      this.serverPort = port;
      this.isRunning = true;
      logger.info(`嵌入式服务器已启动，端口: ${port}`);
      return port;
    } catch (error) {
      logger.error('启动嵌入式服务器失败:', error);
      throw error;
    }
  }

  /**
   * 停止嵌入式服务器
   */
  async stopServer(): Promise<void> {
    try {
      await invoke('stopEmbeddedServerCmd');
      this.serverPort = null;
      this.isRunning = false;
      logger.info('嵌入式服务器已停止');
    } catch (error) {
      logger.error('停止嵌入式服务器失败:', error);
      throw error;
    }
  }

  /**
   * 重启嵌入式服务器
   */
  async restartServer(): Promise<number> {
    try {
      const port = await invoke<number>('restartEmbeddedServerCmd');
      this.serverPort = port;
      this.isRunning = true;
      logger.info(`嵌入式服务器已重启，端口: ${port}`);
      return port;
    } catch (error) {
      logger.error('重启嵌入式服务器失败:', error);
      throw error;
    }
  }

  /**
   * 检查服务器状态
   */
  async checkStatus(): Promise<void> {
    try {
      const port = await invoke<number | null>('getEmbeddedServerStatus');
      const running = await invoke<boolean>('isEmbeddedServerRunning');
      
      this.serverPort = port;
      this.isRunning = running;
    } catch (error) {
      logger.error('检查嵌入式服务器状态失败:', error);
    }
  }

  /**
   * 获取服务器端口
   */
  getServerPort(): number | null {
    return this.serverPort;
  }

  /**
   * 检查服务器是否运行
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取服务器 URL
   */
  getServerUrl(): string | null {
    if (this.serverPort) {
      return `http://localhost:${this.serverPort}`;
    }
    return null;
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
      
      logger.info('嵌入式服务器服务已清理');
    } catch (error) {
      logger.error('清理嵌入式服务器服务失败:', error);
    }
  }
}

// 默认导出单例实例
export const embeddedServerService = EmbeddedServerService.getInstance();