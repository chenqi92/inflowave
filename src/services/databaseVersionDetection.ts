/**
 * 数据库版本自动检测服务
 * 
 * 提供数据库版本自动检测功能，简化用户连接配置
 */

import { invoke } from '@tauri-apps/api/core';

export interface DatabaseVersionInfo {
  database_type: string;
  version: string;
  major_version: number;
  minor_version: number;
  patch_version: number;
  detected_type: string; // "influxdb1", "influxdb2", "influxdb3", "iotdb"
  api_endpoints: string[];
  supported_features: string[];
}

export interface VersionDetectionResult {
  success: boolean;
  version_info?: DatabaseVersionInfo;
  error_message?: string;
  detection_time_ms: number;
  tried_methods: string[];
}

export interface DetectionRequest {
  host: string;
  port: number;
  username?: string | undefined;
  password?: string | undefined;
  token?: string | undefined;
}

export interface DetectionResponse {
  success: boolean;
  result?: VersionDetectionResult;
  error?: string;
}

export interface ConnectionConfigSuggestions {
  detected_type: string;
  version: string;
  default_database?: string;
  default_bucket?: string;
  default_org?: string;
  query_language: string;
  auth_method: string;
  required_fields: string[];
  performance_tips: string[];
}

/**
 * 数据库版本检测服务类
 */
export class DatabaseVersionDetectionService {
  
  /**
   * 自动检测数据库版本
   */
  static async detectDatabaseVersion(request: DetectionRequest): Promise<VersionDetectionResult> {
    try {
      const response: DetectionResponse = await invoke('detect_database_version', { request });
      
      if (!response.success || !response.result) {
        throw new Error(response.error || '版本检测失败');
      }
      
      return response.result;
    } catch (error) {
      console.error('数据库版本检测失败:', error);
      throw error;
    }
  }

  /**
   * 快速检测数据库类型（不获取详细版本信息）
   */
  static async quickDetectDatabaseType(host: string, port: number): Promise<string> {
    try {
      const dbType: string = await invoke('quick_detect_database_type', { host, port });
      return dbType;
    } catch (error) {
      console.error('快速数据库类型检测失败:', error);
      return 'unknown';
    }
  }

  /**
   * 验证检测到的数据库连接
   */
  static async validateDetectedConnection(request: DetectionRequest): Promise<boolean> {
    try {
      const isValid: boolean = await invoke('validate_detected_connection', { request });
      return isValid;
    } catch (error) {
      console.error('连接验证失败:', error);
      return false;
    }
  }

  /**
   * 获取支持的数据库类型列表
   */
  static async getSupportedDatabaseTypes(): Promise<string[]> {
    try {
      const types: string[] = await invoke('get_supported_database_types');
      return types;
    } catch (error) {
      console.error('获取支持的数据库类型失败:', error);
      return [];
    }
  }

  /**
   * 根据检测结果生成连接配置建议
   */
  static async generateConnectionConfigSuggestions(
    detectionResult: VersionDetectionResult
  ): Promise<ConnectionConfigSuggestions> {
    try {
      const suggestions = await invoke('generate_connection_config_suggestions', { 
        detectionResult 
      });
      return suggestions as ConnectionConfigSuggestions;
    } catch (error) {
      console.error('生成连接配置建议失败:', error);
      throw error;
    }
  }

  /**
   * 根据检测结果自动填充连接表单
   */
  static autoFillConnectionForm(
    versionInfo: DatabaseVersionInfo,
    suggestions: ConnectionConfigSuggestions
  ): Partial<any> {
    const formData: any = {
      dbType: versionInfo.detected_type,
    };

    // 根据数据库类型设置默认值
    switch (versionInfo.detected_type) {
      case 'influxdb1':
        formData.database = suggestions.default_database || 'mydb';
        formData.queryLanguage = 'InfluxQL';
        break;
        
      case 'influxdb2':
        formData.org = suggestions.default_org || 'my-org';
        formData.bucket = suggestions.default_bucket || 'my-bucket';
        formData.queryLanguage = 'Flux';
        break;
        
      case 'iotdb':
        formData.database = suggestions.default_database || 'root';
        formData.queryLanguage = 'SQL';
        break;
    }

    return formData;
  }

  /**
   * 获取数据库类型的显示名称
   */
  static getDatabaseTypeDisplayName(detectedType: string): string {
    const displayNames: Record<string, string> = {
      'influxdb1': 'InfluxDB 1.x',
      'influxdb2': 'InfluxDB 2.x',
      'influxdb3': 'InfluxDB 3.x',
      'iotdb': 'Apache IoTDB',
      'unknown': '未知数据库',
    };

    return displayNames[detectedType] || detectedType;
  }

  /**
   * 获取数据库类型的图标
   */
  static getDatabaseTypeIcon(detectedType: string): string {
    const icons: Record<string, string> = {
      'influxdb1': '📊',
      'influxdb2': '📈',
      'influxdb3': '🚀',
      'iotdb': '🏭',
      'unknown': '❓',
    };

    return icons[detectedType] || '💾';
  }

  /**
   * 获取数据库类型的颜色主题
   */
  static getDatabaseTypeColor(detectedType: string): string {
    const colors: Record<string, string> = {
      'influxdb1': '#22c55e', // green
      'influxdb2': '#3b82f6', // blue
      'influxdb3': '#8b5cf6', // purple
      'iotdb': '#f59e0b',     // amber
      'unknown': '#6b7280',   // gray
    };

    return colors[detectedType] || '#6b7280';
  }

  /**
   * 检查是否需要特定的认证字段
   */
  static getRequiredAuthFields(detectedType: string): string[] {
    const authFields: Record<string, string[]> = {
      'influxdb1': ['username', 'password', 'database'],
      'influxdb2': ['token', 'org', 'bucket'],
      'influxdb3': ['token', 'org', 'bucket'],
      'iotdb': ['username', 'password'],
    };

    return authFields[detectedType] || [];
  }



  /**
   * 获取数据库类型的默认端口
   */
  static getDefaultPort(detectedType: string): number {
    const defaultPorts: Record<string, number> = {
      'influxdb1': 8086,
      'influxdb2': 8086,
      'influxdb3': 8086,
      'iotdb': 6667,
    };

    return defaultPorts[detectedType] || 8086;
  }

  /**
   * 格式化检测时间
   */
  static formatDetectionTime(timeMs: number): string {
    if (timeMs < 1000) {
      return `${timeMs}ms`;
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(1)}s`;
    } else {
      return `${(timeMs / 60000).toFixed(1)}min`;
    }
  }

  /**
   * 生成检测结果摘要
   */
  static generateDetectionSummary(result: VersionDetectionResult): string {
    if (!result.success || !result.version_info) {
      return `检测失败 (${this.formatDetectionTime(result.detection_time_ms)})`;
    }

    const { version_info } = result;
    const displayName = this.getDatabaseTypeDisplayName(version_info.detected_type);
    const timeStr = this.formatDetectionTime(result.detection_time_ms);
    
    return `检测到 ${displayName} v${version_info.version} (${timeStr})`;
  }

  /**
   * 检查版本兼容性
   */
  static checkVersionCompatibility(versionInfo: DatabaseVersionInfo): {
    compatible: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let compatible = true;

    switch (versionInfo.detected_type) {
      case 'influxdb1':
        if (versionInfo.major_version < 1 || (versionInfo.major_version === 1 && versionInfo.minor_version < 7)) {
          compatible = false;
          warnings.push('InfluxDB 版本过低，建议升级到 1.7 或更高版本');
        }
        recommendations.push('考虑升级到 InfluxDB 2.x 以获得更好的性能和功能');
        break;
        
      case 'influxdb2':
        if (versionInfo.major_version < 2) {
          compatible = false;
          warnings.push('检测到的版本不是 InfluxDB 2.x');
        }
        if (versionInfo.minor_version < 1) {
          warnings.push('建议升级到 InfluxDB 2.1 或更高版本以获得更好的稳定性');
        }
        break;
        
      case 'iotdb':
        if (versionInfo.major_version < 1) {
          warnings.push('IoTDB 版本较低，可能存在兼容性问题');
        }
        recommendations.push('确保 IoTDB 服务正常运行并且网络连接稳定');
        break;
    }

    return { compatible, warnings, recommendations };
  }
}
