/**
 * 数据库抽象层统一导出
 * 
 * 这个文件统一导出所有数据库相关的类型定义和工厂函数。
 */

// 基础接口和类型
export * from './base';

// InfluxDB 相关
export * from './influxdb';

// IoTDB 相关
export * from './iotdb';

// 工厂模式
export * from './factory';

// 重新导出常用类型（避免命名冲突）
export type {
  DatabaseType,
  QueryLanguage,
  DatabaseDriver,
  DatabaseConnectionConfig,
  DatabaseConnection,
  ValidationResult,
  ValidationError,
  ConnectionTestResult,
  Query,
  QueryResult,
  DatabaseInfo,
  MeasurementInfo,
  FieldInfo,
  TagInfo,
  SmartSuggestion,
  QueryContext
} from './base';

// 重新导出工厂函数
export {
  databaseFactory,
  createDatabaseDriver,
  getSupportedDatabaseTypes,
  isDatabaseTypeSupported,
  getDatabaseDisplayName,
  getDatabaseDefaultPort,
  getDatabaseSupportedLanguages,
  validateDatabaseConfig,
  testDatabaseConnection
} from './factory';
