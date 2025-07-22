/**
 * 数据库相关的类型定义
 */

// InfluxDB版本类型（用于连接配置）
export type InfluxDBVersion = '1.x' | '2.x' | '3.x' | 'unknown';

// 数据库语言类型（用于语法高亮和智能提示）
export type DatabaseLanguageType = 'sql' | 'influxql' | 'flux' | 'mysql' | 'postgresql' | 'mongodb' | 'unknown';

// 版本到语言类型的映射
export function versionToLanguageType(version: InfluxDBVersion): DatabaseLanguageType {
  switch (version) {
    case '1.x':
      return 'influxql';
    case '2.x':
    case '3.x':
      return 'flux';
    default:
      return 'sql';
  }
}

// 语言类型到版本的映射（用于向后兼容）
export function languageTypeToVersion(languageType: DatabaseLanguageType): InfluxDBVersion {
  switch (languageType) {
    case 'influxql':
      return '1.x';
    case 'flux':
      return '2.x';
    default:
      return 'unknown';
  }
}

// 数据库连接类型
export interface DatabaseConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  version: InfluxDBVersion;
  // 其他连接属性...
}

// 查询上下文
export interface QueryContext {
  connectionId: string;
  database: string;
  languageType: DatabaseLanguageType;
  version: InfluxDBVersion;
}
