/**
 * 数据库相关的类型定义
 */

import type { InfluxDBVersion, IoTDBVersion, DatabaseVersion, DatabaseType } from './index';

// 重新导出类型以保持向后兼容
export type { InfluxDBVersion, IoTDBVersion, DatabaseVersion, DatabaseType };

// 数据库语言类型（用于语法高亮和智能提示）
export type DatabaseLanguageType = 'sql' | 'influxql' | 'flux' | 'mysql' | 'postgresql' | 'mongodb' | 'unknown';

// 版本到语言类型的映射 - 支持多数据库
export function versionToLanguageType(version: DatabaseVersion | 'unknown', dbType?: DatabaseType): DatabaseLanguageType {
  if (version === 'unknown') {
    return 'sql';
  }

  // 根据数据库类型和版本确定语言类型
  if (dbType === 'iotdb' || ['0.13.x', '0.14.x', '1.0.x', '1.1.x', '1.2.x'].includes(version)) {
    return 'sql';
  }

  // InfluxDB 版本映射
  switch (version as InfluxDBVersion) {
    case '1.x':
      return 'influxql';
    case '2.x':
      return 'flux';
    case '3.x':
      return 'sql'; // InfluxDB 3.x 默认使用 SQL，也支持 InfluxQL
    default:
      return 'sql';
  }
}

// 语言类型到版本的映射（用于向后兼容）
export function languageTypeToVersion(languageType: DatabaseLanguageType): DatabaseVersion {
  switch (languageType) {
    case 'influxql':
      return '1.x';
    case 'flux':
      return '2.x';
    case 'sql':
      return '1.2.x'; // 默认返回 IoTDB 最新版本
    default:
      return '1.x'; // 默认返回 InfluxDB 1.x
  }
}

// 数据库连接类型（向后兼容）
export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  version: DatabaseVersion;
  dbType?: DatabaseType;
  // 其他连接属性...
}

// 查询上下文（向后兼容）
export interface QueryContext {
  connectionId: string;
  database: string;
  languageType: DatabaseLanguageType;
  version: DatabaseVersion;
  dbType?: DatabaseType;
}
