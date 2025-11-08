// 导出类型
export type {
  IConnectionConnector,
  BaseConnectionConfig,
  FormField,
  FormSection,
  ValidationErrors,
  ConnectorRegistry
} from './types';

// 导出基础连接器
export { BaseConnector } from './BaseConnector';

// 导出具体连接器
export { InfluxDBConnector } from './InfluxDBConnector';
export type { InfluxDBConfig } from './InfluxDBConnector';

export { IoTDBConnector } from './IoTDBConnector';
export type { IoTDBConfig } from './IoTDBConnector';

export { ObjectStorageConnector } from './ObjectStorageConnector';
export type { ObjectStorageConfig } from './ObjectStorageConnector';

// 导出工厂和辅助方法
export {
  getConnectorFactory,
  resetConnectorFactory,
  getConnector,
  getAllConnectors,
  getConnectorTypes,
  registerConnector,
  ConnectorTypeMap,
  type DatabaseType
} from './ConnectorFactory';