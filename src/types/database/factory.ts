/**
 * 数据库工厂模式实现
 * 
 * 这个文件实现了数据库驱动的工厂模式，用于创建和管理不同类型的数据库驱动。
 */

import { DatabaseType, DatabaseDriver, DatabaseDriverFactory } from './base';
import { InfluxDBDriver } from './influxdb';
import { IoTDBDriver } from './iotdb';

/**
 * 数据库驱动工厂实现
 */
export class DatabaseFactory implements DatabaseDriverFactory {
  private static instance: DatabaseFactory;
  private drivers = new Map<DatabaseType, () => DatabaseDriver>();

  private constructor() {
    this.registerDefaultDrivers();
  }

  /**
   * 获取工厂单例实例
   */
  public static getInstance(): DatabaseFactory {
    if (!DatabaseFactory.instance) {
      DatabaseFactory.instance = new DatabaseFactory();
    }
    return DatabaseFactory.instance;
  }

  /**
   * 注册默认驱动
   */
  private registerDefaultDrivers(): void {
    this.registerDriver('influxdb', () => new InfluxDBDriver());
    this.registerDriver('iotdb', () => new IoTDBDriver());
  }

  /**
   * 注册数据库驱动
   * @param type 数据库类型
   * @param driverFactory 驱动工厂函数
   */
  public registerDriver(type: DatabaseType, driverFactory: () => DatabaseDriver): void {
    this.drivers.set(type, driverFactory);
  }

  /**
   * 创建数据库驱动实例
   * @param type 数据库类型
   * @returns 数据库驱动实例
   */
  public createDriver(type: DatabaseType): DatabaseDriver {
    const driverFactory = this.drivers.get(type);
    if (!driverFactory) {
      throw new Error(`Unsupported database type: ${type}`);
    }
    return driverFactory();
  }

  /**
   * 获取支持的数据库类型列表
   * @returns 支持的数据库类型数组
   */
  public getSupportedTypes(): DatabaseType[] {
    return Array.from(this.drivers.keys());
  }

  /**
   * 检查是否支持指定的数据库类型
   * @param type 数据库类型
   * @returns 是否支持
   */
  public isSupported(type: DatabaseType): boolean {
    return this.drivers.has(type);
  }

  /**
   * 获取数据库类型的显示信息
   * @param type 数据库类型
   * @returns 显示信息
   */
  public getDatabaseInfo(type: DatabaseType): {
    displayName: string;
    description: string;
    defaultPort: number;
    supportedVersions: string[];
    supportedLanguages: string[];
  } | null {
    try {
      const driver = this.createDriver(type);
      return {
        displayName: driver.displayName,
        description: driver.description,
        defaultPort: driver.defaultPort,
        supportedVersions: driver.supportedVersions,
        supportedLanguages: driver.supportedLanguages
      };
    } catch {
      return null;
    }
  }

  /**
   * 获取所有支持的数据库信息
   * @returns 数据库信息数组
   */
  public getAllDatabaseInfo(): Array<{
    type: DatabaseType;
    displayName: string;
    description: string;
    defaultPort: number;
    supportedVersions: string[];
    supportedLanguages: string[];
  }> {
    return this.getSupportedTypes().map(type => {
      const info = this.getDatabaseInfo(type);
      return {
        type,
        ...info!
      };
    });
  }
}

// 导出工厂单例
export const databaseFactory = DatabaseFactory.getInstance();

// 便捷函数
export function createDatabaseDriver(type: DatabaseType): DatabaseDriver {
  return databaseFactory.createDriver(type);
}

export function getSupportedDatabaseTypes(): DatabaseType[] {
  return databaseFactory.getSupportedTypes();
}

export function isDatabaseTypeSupported(type: DatabaseType): boolean {
  return databaseFactory.isSupported(type);
}

export function getDatabaseDisplayName(type: DatabaseType): string {
  const info = databaseFactory.getDatabaseInfo(type);
  return info?.displayName || type;
}

export function getDatabaseDefaultPort(type: DatabaseType): number {
  const info = databaseFactory.getDatabaseInfo(type);
  return info?.defaultPort || 8086;
}

export function getDatabaseSupportedLanguages(type: DatabaseType): string[] {
  const info = databaseFactory.getDatabaseInfo(type);
  return info?.supportedLanguages || [];
}

// 类型守卫函数
export function isInfluxDBType(type: DatabaseType): type is 'influxdb' {
  return type === 'influxdb';
}

export function isIoTDBType(type: DatabaseType): type is 'iotdb' {
  return type === 'iotdb';
}

// 配置验证函数
export async function validateDatabaseConfig(type: DatabaseType, config: any): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  try {
    const driver = createDatabaseDriver(type);
    const result = await driver.validateConnection(config);
    return {
      valid: result.valid,
      errors: result.errors.map(e => e.message),
      warnings: result.warnings.map(w => w.message)
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate config: ${error}`],
      warnings: []
    };
  }
}

// 连接测试函数
export async function testDatabaseConnection(type: DatabaseType, config: any): Promise<{
  success: boolean;
  latency?: number;
  error?: string;
  serverVersion?: string;
  databases?: string[];
}> {
  try {
    const driver = createDatabaseDriver(type);
    return await driver.testConnection(config);
  } catch (error) {
    return {
      success: false,
      error: `Failed to test connection: ${error}`
    };
  }
}
