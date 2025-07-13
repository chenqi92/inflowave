import { safeTauriInvoke } from '@/utils/tauri';
import type { 
  ConnectionConfig, 
  ConnectionStatus, 
  ConnectionTestResult,
  QueryRequest,
  QueryResult,
  QueryValidationResult,
  DatabaseInfo,
  MeasurementInfo,
  FieldInfo,
  TagInfo
} from '@/types';

/**
 * 连接管理 API 服务
 */
export class ConnectionAPI {
  /**
   * 创建新连接
   */
  static async createConnection(config: ConnectionConfig): Promise<string> {
    const configWithTimestamp = {
      ...config,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return safeTauriInvoke<string>('create_connection', { config: configWithTimestamp });
  }

  /**
   * 测试连接
   */
  static async testConnection(connectionId: string): Promise<ConnectionTestResult> {
    return safeTauriInvoke<ConnectionTestResult>('test_connection', { connectionId });
  }

  /**
   * 获取所有连接
   */
  static async getConnections(): Promise<ConnectionConfig[]> {
    return safeTauriInvoke<ConnectionConfig[]>('get_connections');
  }

  /**
   * 获取单个连接
   */
  static async getConnection(connectionId: string): Promise<ConnectionConfig | null> {
    return safeTauriInvoke<ConnectionConfig | null>('get_connection', { connectionId });
  }

  /**
   * 更新连接
   */
  static async updateConnection(config: ConnectionConfig): Promise<void> {
    return safeTauriInvoke<void>('update_connection', { config });
  }

  /**
   * 删除连接
   */
  static async deleteConnection(connectionId: string): Promise<void> {
    return safeTauriInvoke<void>('delete_connection', { connectionId });
  }

  /**
   * 连接到数据库
   */
  static async connectToDatabase(connectionId: string): Promise<void> {
    return safeTauriInvoke<void>('connect_to_database', { connectionId });
  }

  /**
   * 断开数据库连接
   */
  static async disconnectFromDatabase(connectionId: string): Promise<void> {
    return safeTauriInvoke<void>('disconnect_from_database', { connectionId });
  }

  /**
   * 获取连接状态
   */
  static async getConnectionStatus(connectionId: string): Promise<ConnectionStatus | null> {
    return safeTauriInvoke<ConnectionStatus | null>('get_connection_status', { connectionId });
  }

  /**
   * 获取所有连接状态
   */
  static async getAllConnectionStatuses(): Promise<Record<string, ConnectionStatus>> {
    return safeTauriInvoke<Record<string, ConnectionStatus>>('get_all_connection_statuses');
  }

  /**
   * 健康检查所有连接
   */
  static async healthCheckAllConnections(): Promise<Record<string, ConnectionTestResult>> {
    return safeTauriInvoke<Record<string, ConnectionTestResult>>('health_check_all_connections');
  }

  /**
   * 启动连接监控
   */
  static async startConnectionMonitoring(intervalSeconds?: number): Promise<void> {
    return safeTauriInvoke<void>('start_connection_monitoring', { intervalSeconds });
  }

  /**
   * 停止连接监控
   */
  static async stopConnectionMonitoring(): Promise<void> {
    return safeTauriInvoke<void>('stop_connection_monitoring');
  }

  /**
   * 获取连接池统计信息
   */
  static async getConnectionPoolStats(connectionId: string): Promise<any> {
    return safeTauriInvoke<any>('get_connection_pool_stats', { connectionId });
  }
}

/**
 * 查询管理 API 服务
 */
export class QueryAPI {
  /**
   * 执行查询
   */
  static async executeQuery(request: QueryRequest): Promise<QueryResult> {
    return safeTauriInvoke<QueryResult>('execute_query', { request });
  }

  /**
   * 验证查询
   */
  static async validateQuery(query: string): Promise<QueryValidationResult> {
    return safeTauriInvoke<QueryValidationResult>('validate_query', { query });
  }

  /**
   * 获取查询建议
   */
  static async getQuerySuggestions(
    connectionId: string, 
    database?: string, 
    partialQuery?: string
  ): Promise<string[]> {
    return safeTauriInvoke<string[]>('get_query_suggestions', { 
      connectionId, 
      database, 
      partialQuery 
    });
  }

  /**
   * 格式化查询
   */
  static async formatQuery(query: string): Promise<string> {
    return safeTauriInvoke<string>('format_query', { query });
  }

  /**
   * 解释查询执行计划
   */
  static async explainQuery(connectionId: string, query: string): Promise<string> {
    return safeTauriInvoke<string>('explain_query', { connectionId, query });
  }
}

/**
 * 数据库管理 API 服务
 */
export class DatabaseAPI {
  /**
   * 获取数据库列表
   */
  static async getDatabases(connectionId: string): Promise<DatabaseInfo[]> {
    return safeTauriInvoke<DatabaseInfo[]>('get_databases', { connectionId });
  }

  /**
   * 创建数据库
   */
  static async createDatabase(connectionId: string, name: string): Promise<void> {
    return safeTauriInvoke<void>('create_database', { connectionId, name });
  }

  /**
   * 删除数据库
   */
  static async dropDatabase(connectionId: string, name: string): Promise<void> {
    return safeTauriInvoke<void>('drop_database', { connectionId, name });
  }

  /**
   * 获取测量列表
   */
  static async getMeasurements(connectionId: string, database: string): Promise<MeasurementInfo[]> {
    return safeTauriInvoke<MeasurementInfo[]>('get_measurements', { connectionId, database });
  }

  /**
   * 获取字段信息
   */
  static async getFieldKeys(
    connectionId: string, 
    database: string, 
    measurement: string
  ): Promise<FieldInfo[]> {
    return safeTauriInvoke<FieldInfo[]>('get_field_keys', { 
      connectionId, 
      database, 
      measurement 
    });
  }

  /**
   * 获取标签信息
   */
  static async getTagKeys(
    connectionId: string, 
    database: string, 
    measurement: string
  ): Promise<TagInfo[]> {
    return safeTauriInvoke<TagInfo[]>('get_tag_keys', { 
      connectionId, 
      database, 
      measurement 
    });
  }

  /**
   * 获取数据库统计信息
   */
  static async getDatabaseStats(connectionId: string, database: string): Promise<any> {
    return safeTauriInvoke<any>('get_database_stats', { connectionId, database });
  }

  /**
   * 获取系列信息
   */
  static async getSeries(
    connectionId: string, 
    database: string, 
    measurement?: string,
    limit?: number
  ): Promise<string[]> {
    return safeTauriInvoke<string[]>('get_series', { 
      connectionId, 
      database, 
      measurement,
      limit 
    });
  }
}

/**
 * 数据写入 API 服务
 */
export class DataWriteAPI {
  /**
   * 写入单个数据点
   */
  static async writePoint(
    connectionId: string,
    database: string,
    measurement: string,
    fields: Record<string, any>,
    tags?: Record<string, string>,
    timestamp?: number
  ): Promise<void> {
    return safeTauriInvoke<void>('write_point', {
      connectionId,
      database,
      measurement,
      fields,
      tags,
      timestamp
    });
  }

  /**
   * 批量写入数据点
   */
  static async writePoints(
    connectionId: string,
    database: string,
    points: Array<{
      measurement: string;
      fields: Record<string, any>;
      tags?: Record<string, string>;
      timestamp?: number;
    }>
  ): Promise<void> {
    return safeTauriInvoke<void>('write_points', {
      connectionId,
      database,
      points
    });
  }

  /**
   * 从文件导入数据
   */
  static async importFromFile(
    connectionId: string,
    database: string,
    filePath: string,
    fileType: 'csv' | 'json' | 'line-protocol',
    options?: {
      measurement?: string;
      timeColumn?: string;
      delimiter?: string;
      skipHeader?: boolean;
    }
  ): Promise<{ imported: number; errors: string[] }> {
    return safeTauriInvoke<{ imported: number; errors: string[] }>('import_from_file', {
      connectionId,
      database,
      filePath,
      fileType,
      options
    });
  }
}

/**
 * 数据导出 API 服务
 */
export class DataExportAPI {
  /**
   * 导出查询结果
   */
  static async exportQueryResult(
    queryResult: QueryResult,
    filePath: string,
    format: 'csv' | 'json' | 'excel'
  ): Promise<void> {
    return safeTauriInvoke<void>('export_query_result', {
      queryResult,
      filePath,
      format
    });
  }

  /**
   * 导出数据库
   */
  static async exportDatabase(
    connectionId: string,
    database: string,
    filePath: string,
    options?: {
      format?: 'csv' | 'json' | 'line-protocol';
      measurements?: string[];
      timeRange?: { start: string; end: string };
    }
  ): Promise<void> {
    return safeTauriInvoke<void>('export_database', {
      connectionId,
      database,
      filePath,
      options
    });
  }
}

/**
 * 系统信息 API 服务
 */
export class SystemAPI {
  /**
   * 获取系统信息
   */
  static async getSystemInfo(): Promise<any> {
    return safeTauriInvoke<any>('get_system_info');
  }

  /**
   * 获取应用版本信息
   */
  static async getAppVersion(): Promise<string> {
    return safeTauriInvoke<string>('get_app_version');
  }

  /**
   * 检查更新
   */
  static async checkForUpdates(): Promise<{ hasUpdate: boolean; version?: string; url?: string }> {
    return safeTauriInvoke<{ hasUpdate: boolean; version?: string; url?: string }>('check_for_updates');
  }
}

/**
 * 设置管理 API 服务
 */
export class SettingsAPI {
  /**
   * 获取用户设置
   */
  static async getUserSettings(): Promise<any> {
    return safeTauriInvoke<any>('get_user_settings');
  }

  /**
   * 保存用户设置
   */
  static async saveUserSettings(settings: any): Promise<void> {
    return safeTauriInvoke<void>('save_user_settings', { settings });
  }

  /**
   * 重置设置
   */
  static async resetSettings(): Promise<void> {
    return safeTauriInvoke<void>('reset_settings');
  }

  /**
   * 导出设置
   */
  static async exportSettings(filePath: string): Promise<void> {
    return safeTauriInvoke<void>('export_settings', { filePath });
  }

  /**
   * 导入设置
   */
  static async importSettings(filePath: string): Promise<void> {
    return safeTauriInvoke<void>('import_settings', { filePath });
  }
}