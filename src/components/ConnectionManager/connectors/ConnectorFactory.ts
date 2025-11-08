import type { IConnectionConnector, ConnectorRegistry } from './types';
import { InfluxDBConnector } from './InfluxDBConnector';
import { IoTDBConnector } from './IoTDBConnector';
import { ObjectStorageConnector } from './ObjectStorageConnector';

/**
 * 连接器工厂类
 */
class ConnectionConnectorFactory implements ConnectorRegistry {
  private connectors: Map<string, IConnectionConnector> = new Map();

  constructor() {
    // 自动注册所有内置连接器
    this.registerBuiltinConnectors();
  }

  /**
   * 注册内置连接器
   */
  private registerBuiltinConnectors() {
    this.register(new InfluxDBConnector());
    this.register(new IoTDBConnector());
    this.register(new ObjectStorageConnector());
  }

  /**
   * 注册连接器
   */
  register(connector: IConnectionConnector): void {
    this.connectors.set(connector.type, connector);
  }

  /**
   * 获取连接器
   */
  get(type: string): IConnectionConnector | undefined {
    return this.connectors.get(type);
  }

  /**
   * 获取所有连接器
   */
  getAll(): IConnectionConnector[] {
    return Array.from(this.connectors.values());
  }

  /**
   * 获取所有连接器类型
   */
  getTypes(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * 创建连接器实例
   */
  createConnector(type: string): IConnectionConnector | null {
    const connector = this.get(type);
    if (!connector) {
      console.error(`Connector type "${type}" not found`);
      return null;
    }
    return connector;
  }

  /**
   * 检查连接器是否存在
   */
  hasConnector(type: string): boolean {
    return this.connectors.has(type);
  }

  /**
   * 清空所有连接器
   */
  clear(): void {
    this.connectors.clear();
  }

  /**
   * 重新加载内置连接器
   */
  reload(): void {
    this.clear();
    this.registerBuiltinConnectors();
  }
}

// 创建单例实例
let factoryInstance: ConnectionConnectorFactory | null = null;

/**
 * 获取连接器工厂实例
 */
export function getConnectorFactory(): ConnectionConnectorFactory {
  if (!factoryInstance) {
    factoryInstance = new ConnectionConnectorFactory();
  }
  return factoryInstance;
}

/**
 * 重置连接器工厂（主要用于测试）
 */
export function resetConnectorFactory(): void {
  factoryInstance = null;
}

// 导出便捷方法
export function getConnector(type: string): IConnectionConnector | undefined {
  return getConnectorFactory().get(type);
}

export function getAllConnectors(): IConnectionConnector[] {
  return getConnectorFactory().getAll();
}

export function getConnectorTypes(): string[] {
  return getConnectorFactory().getTypes();
}

export function registerConnector(connector: IConnectionConnector): void {
  getConnectorFactory().register(connector);
}

// 导出所有连接器类型，方便类型检查
export type DatabaseType = 'influxdb' | 'iotdb' | 'object-storage';

// 导出连接器类型映射
export const ConnectorTypeMap: Record<DatabaseType, string> = {
  'influxdb': 'InfluxDB',
  'iotdb': 'Apache IoTDB',
  'object-storage': 'Object Storage'
};