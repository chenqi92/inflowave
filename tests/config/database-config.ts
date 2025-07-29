/**
 * 测试数据库配置
 * 
 * 基于 test/connecting.yml 的真实数据库连接配置
 */

export interface DatabaseConfig {
  id: string;
  name: string;
  dbType: 'influxdb' | 'influxdb2' | 'influxdb3' | 'iotdb';
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  token?: string;
  org?: string;
  bucket?: string;
}

// 测试主机 IP
const TEST_HOST = '192.168.0.120';

// 真实数据库连接配置
export const TEST_DATABASES: DatabaseConfig[] = [
  // InfluxDB 1.8
  {
    id: 'influxdb1-test',
    name: 'InfluxDB 1.8 测试',
    dbType: 'influxdb',
    host: TEST_HOST,
    port: 8086,
    username: 'admin',
    password: 'abc9987',
    database: 'allbs',
  },
  
  // InfluxDB 2.7
  {
    id: 'influxdb2-test',
    name: 'InfluxDB 2.7 测试',
    dbType: 'influxdb2',
    host: TEST_HOST,
    port: 8087,
    username: 'admin',
    password: '6;A]]Hs/GdG4:1Ti',
    org: 'my-org',
    bucket: 'allbs',
    token: '[)^1qm*]Fm+[?|~3}-|2rSt~u/6*6^3q{Z%gru]kQ-9TH',
  },
  
  // InfluxDB 3.x
  {
    id: 'influxdb3-test',
    name: 'InfluxDB 3.x 测试',
    dbType: 'influxdb3',
    host: TEST_HOST,
    port: 8181,
    // InfluxDB 3.x 配置可能需要根据实际情况调整
  },
  
  // IoTDB
  {
    id: 'iotdb-test',
    name: 'IoTDB 测试',
    dbType: 'iotdb',
    host: TEST_HOST,
    port: 6667,
    username: 'root',
    password: 'root',
  },
];

// 测试数据配置
export const TEST_DATA = {
  // InfluxDB 测试数据
  influxdb: {
    measurement: 'test_measurement',
    fields: {
      temperature: 25.5,
      humidity: 60.2,
      pressure: 1013.25,
    },
    tags: {
      location: 'office',
      sensor: 'DHT22',
    },
  },
  
  // IoTDB 测试数据
  iotdb: {
    storageGroup: 'root.test',
    device: 'root.test.device1',
    timeseries: [
      'root.test.device1.temperature',
      'root.test.device1.humidity',
      'root.test.device1.pressure',
    ],
    values: [25.5, 60.2, 1013.25],
  },
};

// 测试查询配置
export const TEST_QUERIES = {
  influxdb1: [
    'SHOW DATABASES',
    'SHOW MEASUREMENTS',
    `SELECT * FROM ${TEST_DATA.influxdb.measurement} LIMIT 10`,
    `SELECT mean(temperature) FROM ${TEST_DATA.influxdb.measurement} WHERE time > now() - 1h GROUP BY time(10m)`,
  ],
  
  influxdb2: [
    'buckets()',
    `from(bucket: "allbs") |> range(start: -1h) |> limit(n: 10)`,
    `from(bucket: "allbs") |> range(start: -1h) |> filter(fn: (r) => r._measurement == "${TEST_DATA.influxdb.measurement}")`,
  ],
  
  iotdb: [
    'SHOW STORAGE GROUP',
    'SHOW DEVICES',
    'SHOW TIMESERIES',
    'SELECT * FROM root.test.device1 LIMIT 10',
    'SELECT temperature FROM root.test.device1 WHERE time > now() - 1h',
  ],
};

// 性能测试配置
export const PERFORMANCE_CONFIG = {
  // 连接超时阈值 (毫秒)
  connectionTimeout: 5000,
  
  // 查询超时阈值 (毫秒)
  queryTimeout: 10000,
  
  // 大数据量查询行数
  largeQueryLimit: 10000,
  
  // 并发连接数
  concurrentConnections: 5,
  
  // 性能基准
  benchmarks: {
    connectionTime: 1000, // 1秒内建立连接
    simpleQueryTime: 2000, // 2秒内完成简单查询
    complexQueryTime: 10000, // 10秒内完成复杂查询
    largeQueryTime: 30000, // 30秒内完成大数据量查询
  },
};

// 错误测试配置
export const ERROR_TEST_CONFIG = {
  // 无效连接配置
  invalidConnections: [
    {
      id: 'invalid-host',
      name: '无效主机',
      dbType: 'influxdb' as const,
      host: '192.168.999.999',
      port: 8086,
      username: 'admin',
      password: 'password',
    },
    {
      id: 'invalid-port',
      name: '无效端口',
      dbType: 'influxdb' as const,
      host: TEST_HOST,
      port: 9999,
      username: 'admin',
      password: 'password',
    },
    {
      id: 'invalid-credentials',
      name: '无效凭据',
      dbType: 'influxdb' as const,
      host: TEST_HOST,
      port: 8086,
      username: 'invalid',
      password: 'invalid',
    },
  ],
  
  // 无效查询
  invalidQueries: [
    'INVALID SQL SYNTAX',
    'SELECT * FROM non_existent_table',
    'DROP DATABASE important_data', // 危险操作
    '', // 空查询
  ],
};

// 获取指定类型的数据库配置
export function getDatabaseConfig(dbType: string): DatabaseConfig | undefined {
  return TEST_DATABASES.find(db => db.dbType === dbType);
}

// 获取所有数据库配置
export function getAllDatabaseConfigs(): DatabaseConfig[] {
  return TEST_DATABASES;
}

// 获取测试查询
export function getTestQueries(dbType: string): string[] {
  switch (dbType) {
    case 'influxdb':
      return TEST_QUERIES.influxdb1;
    case 'influxdb2':
      return TEST_QUERIES.influxdb2;
    case 'iotdb':
      return TEST_QUERIES.iotdb;
    default:
      return [];
  }
}

// 验证数据库连接配置
export function validateDatabaseConfig(config: DatabaseConfig): boolean {
  if (!config.host || !config.port) {
    return false;
  }
  
  // 根据数据库类型验证必需字段
  switch (config.dbType) {
    case 'influxdb':
      return !!(config.username && config.password);
    case 'influxdb2':
      return !!(config.token && config.org);
    case 'iotdb':
      return !!(config.username && config.password);
    default:
      return true;
  }
}
