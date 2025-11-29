/**
 * 数据库注册表
 * 
 * 管理所有支持的数据库类型及其特征配置
 */
import logger from '@/utils/logger';
import type { 
  DatabaseType,
  DatabaseFeatures, 
  DatabaseRegistryEntry,
  DatabaseLevel,
  NodeTypeConfig
} from '@/types/database/features';

export class DatabaseRegistry {
  private static instance: DatabaseRegistry;
  private entries: Map<DatabaseType, DatabaseRegistryEntry> = new Map();
  private initialized = false;

  private constructor() {}

  static getInstance(): DatabaseRegistry {
    if (!DatabaseRegistry.instance) {
      DatabaseRegistry.instance = new DatabaseRegistry();
    }
    return DatabaseRegistry.instance;
  }

  /**
   * 初始化默认数据库配置
   */
  initialize(): void {
    if (this.initialized) return;

    // 注册 InfluxDB
    this.registerInfluxDB();
    
    // 注册 IoTDB
    this.registerIoTDB();
    
    // 注册 Prometheus (为扩展性验证)
    this.registerPrometheus();

    this.initialized = true;
    logger.debug('🗃️ 数据库注册表初始化完成');
  }

  /**
   * 注册数据库类型
   */
  register(entry: DatabaseRegistryEntry): void {
    this.entries.set(entry.type, entry);
    logger.info(`📝 注册数据库类型: ${entry.type}`);
  }

  /**
   * 获取数据库特征
   */
  getFeatures(dbType: DatabaseType, version?: string): DatabaseFeatures {
    const entry = this.entries.get(dbType);
    if (!entry) {
      throw new Error(`不支持的数据库类型: ${dbType}`);
    }

    let features = { ...entry.features };

    // 应用版本特定的特性
    if (version && features.versionFeatures[version]) {
      features = this.mergeVersionFeatures(features, version);
    }

    return features;
  }

  /**
   * 获取所有支持的数据库类型
   */
  getSupportedTypes(): DatabaseType[] {
    return Array.from(this.entries.keys());
  }

  /**
   * 检查是否支持某个数据库类型
   */
  supports(dbType: DatabaseType): boolean {
    return this.entries.has(dbType);
  }

  /**
   * 获取数据库的层次结构
   */
  getHierarchy(dbType: DatabaseType, version?: string): DatabaseLevel[] {
    const features = this.getFeatures(dbType, version);
    return features.hierarchy.levels;
  }

  /**
   * 获取节点类型配置
   */
  getNodeTypeConfig(dbType: DatabaseType, nodeType: string, version?: string): NodeTypeConfig {
    const features = this.getFeatures(dbType, version);
    const config = features.nodeTypeMapping[nodeType];
    
    if (!config) {
      throw new Error(`数据库 ${dbType} 不支持节点类型: ${nodeType}`);
    }
    
    return config;
  }

  /**
   * 合并版本特定特性
   */
  private mergeVersionFeatures(features: DatabaseFeatures, version: string): DatabaseFeatures {
    const versionFeatures = features.versionFeatures[version];
    if (!versionFeatures) return features;

    // 深度合并版本特性
    return {
      ...features,
      queryCapabilities: {
        ...features.queryCapabilities,
        languages: versionFeatures.queryLanguages || features.queryCapabilities.languages,
      },
      // 可以根据需要添加更多合并逻辑
    };
  }

  /**
   * 注册 InfluxDB
   */
  private registerInfluxDB(): void {
    const influxdbFeatures: DatabaseFeatures = {
      name: 'influxdb',
      displayName: 'InfluxDB',
      description: '时间序列数据库',
      
      hierarchy: {
        levels: [
          {
            name: 'database',
            displayName: '数据库',
            icon: 'database',
            queryMethod: 'getDatabases',
            hasChildren: true,
            childLevel: 'measurement'
          },
          {
            name: 'measurement',
            displayName: '测量',
            icon: 'table',
            queryMethod: 'getMeasurements',
            hasChildren: true,
            childLevel: 'field'
          },
          {
            name: 'field',
            displayName: '字段',
            icon: 'field',
            queryMethod: 'getFields',
            hasChildren: false,
            isLeaf: true
          }
        ],
        maxDepth: 3,
        rootLevel: 'database',
        leafLevel: 'field'
      },
      
      queryCapabilities: {
        languages: ['influxql', 'flux'],
        supportedOperations: ['select', 'show', 'describe', 'explain', 'insert', 'delete'],
        maxQuerySize: 1000000,
        timeoutSeconds: 300,
        supportsBatch: true,
        supportsTransaction: false,
        supportsAsync: true
      },
      
      versionFeatures: {
        '1.x': {
          apiType: 'rest',
          authMethod: 'basic',
          queryLanguages: ['influxql'],
          concepts: ['database', 'measurement', 'field', 'tag', 'retention_policy'],
          queryCommands: ['SHOW DATABASES', 'SHOW MEASUREMENTS', 'SHOW FIELD KEYS', 'SHOW TAG KEYS'],
          apiEndpoints: {
            query: '/query',
            write: '/write',
            ping: '/ping'
          }
        },
        '2.x': {
          apiType: 'rest',
          authMethod: 'token',
          queryLanguages: ['flux', 'influxql'],
          concepts: ['bucket', 'measurement', 'field', 'tag', 'organization'],
          queryCommands: ['buckets()', 'from(bucket:)', 'range()', 'filter()'],
          apiEndpoints: {
            query: '/api/v2/query',
            write: '/api/v2/write',
            ping: '/ping'
          },
          features: ['flux_language', 'tasks', 'alerts', 'dashboards']
        },
        '3.x': {
          apiType: 'flightsql',
          authMethod: 'token',
          queryLanguages: ['sql', 'influxql'],
          concepts: ['database', 'table', 'column', 'organization'],
          queryCommands: ['SHOW DATABASES', 'SHOW TABLES', 'DESCRIBE', 'SELECT'],
          apiEndpoints: {
            query: '/api/v3/query',
            write: '/api/v3/write',
            ping: '/api/v3/ping'
          },
          features: ['sql_language', 'flightsql', 'arrow_format', 'partition_templates'],
          limitations: ['no_flux', 'no_retention_policies']
        }
      },
      
      nodeTypeMapping: {
        database: {
          icon: 'database',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          displayName: '数据库',
          actions: ['refresh', 'create_measurement', 'drop_database']
        },
        measurement: {
          icon: 'table',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          displayName: '测量',
          actions: ['query', 'export', 'drop_measurement']
        },
        field: {
          icon: 'field',
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          displayName: '字段',
          actions: ['query', 'statistics']
        }
      },
      
      defaultConfig: {
        port: 8086,
        ssl: false,
        timeout: 30,
        queryLanguage: 'influxql'
      },
      
      connectionTest: {
        method: 'query',
        testQuery: 'SHOW DATABASES',
        expectedResponse: { results: [] }
      }
    };

    this.register({
      type: 'influxdb',
      features: influxdbFeatures,
      queryEngineClass: 'InfluxDBQueryEngine',
      clientClass: 'InfluxDBClient',
      enabled: true,
      priority: 1
    });
  }

  /**
   * 注册 IoTDB
   */
  private registerIoTDB(): void {
    const iotdbFeatures: DatabaseFeatures = {
      name: 'iotdb',
      displayName: 'Apache IoTDB',
      description: '物联网时间序列数据库',
      
      hierarchy: {
        levels: [
          {
            name: 'storage_group',
            displayName: '存储组',
            icon: 'folder',
            queryMethod: 'getStorageGroups',
            hasChildren: true,
            childLevel: 'device'
          },
          {
            name: 'device',
            displayName: '设备',
            icon: 'device',
            queryMethod: 'getDevices',
            hasChildren: true,
            childLevel: 'timeseries'
          },
          {
            name: 'timeseries',
            displayName: '时间序列',
            icon: 'timeseries',
            queryMethod: 'getTimeseries',
            hasChildren: false,
            isLeaf: true
          }
        ],
        maxDepth: 3,
        rootLevel: 'storage_group',
        leafLevel: 'timeseries'
      },
      
      queryCapabilities: {
        languages: ['iotdb-sql'],
        supportedOperations: ['select', 'show', 'describe', 'insert', 'delete', 'create', 'drop'],
        maxQuerySize: 500000,
        timeoutSeconds: 180,
        supportsBatch: true,
        supportsTransaction: false,
        supportsAsync: false
      },
      
      versionFeatures: {
        '0.13.x': {
          apiType: 'thrift',
          authMethod: 'basic',
          queryLanguages: ['iotdb-sql'],
          concepts: ['storage_group', 'device', 'timeseries', 'path'],
          queryCommands: ['SHOW STORAGE GROUP', 'SHOW DEVICES', 'SHOW TIMESERIES'],
          limitations: ['no_rest_api', 'limited_aggregation']
        },
        '1.x': {
          apiType: 'rest',
          authMethod: 'basic',
          queryLanguages: ['iotdb-sql'],
          concepts: ['database', 'device', 'timeseries', 'path'],
          queryCommands: ['SHOW DATABASES', 'SHOW DEVICES', 'SHOW TIMESERIES'],
          apiEndpoints: {
            query: '/rest/v1/query',
            insert: '/rest/v1/insertTablet',
            ping: '/ping'
          },
          features: ['rest_api', 'advanced_aggregation', 'udf_support']
        }
      },
      
      nodeTypeMapping: {
        storage_group: {
          icon: 'folder',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          displayName: '存储组',
          actions: ['refresh', 'create_device', 'drop_storage_group']
        },
        device: {
          icon: 'device',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          displayName: '设备',
          actions: ['query', 'create_timeseries', 'drop_device']
        },
        timeseries: {
          icon: 'timeseries',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          displayName: '时间序列',
          actions: ['query', 'statistics', 'drop_timeseries']
        }
      },
      
      defaultConfig: {
        port: 6667,
        ssl: false,
        timeout: 30,
        queryLanguage: 'iotdb-sql'
      },
      
      connectionTest: {
        method: 'query',
        testQuery: 'SHOW STORAGE GROUP',
        expectedResponse: { code: 200 }
      }
    };

    this.register({
      type: 'iotdb',
      features: iotdbFeatures,
      queryEngineClass: 'IoTDBQueryEngine',
      clientClass: 'IoTDBClient',
      enabled: true,
      priority: 2
    });
  }

  /**
   * 注册 Prometheus (扩展性验证)
   */
  private registerPrometheus(): void {
    const prometheusFeatures: DatabaseFeatures = {
      name: 'prometheus',
      displayName: 'Prometheus',
      description: '监控和告警系统',
      
      hierarchy: {
        levels: [
          {
            name: 'metric',
            displayName: '指标',
            icon: 'metric',
            queryMethod: 'getMetrics',
            hasChildren: true,
            childLevel: 'label'
          },
          {
            name: 'label',
            displayName: '标签',
            icon: 'label',
            queryMethod: 'getLabels',
            hasChildren: false,
            isLeaf: true
          }
        ],
        maxDepth: 2,
        rootLevel: 'metric',
        leafLevel: 'label'
      },
      
      queryCapabilities: {
        languages: ['promql'],
        supportedOperations: ['select', 'show'],
        maxQuerySize: 100000,
        timeoutSeconds: 60,
        supportsBatch: false,
        supportsTransaction: false,
        supportsAsync: false
      },
      
      versionFeatures: {
        '2.x': {
          apiType: 'rest',
          authMethod: 'basic',
          queryLanguages: ['promql'],
          concepts: ['metric', 'label', 'target', 'job'],
          apiEndpoints: {
            query: '/api/v1/query',
            query_range: '/api/v1/query_range',
            labels: '/api/v1/labels'
          }
        }
      },
      
      nodeTypeMapping: {
        metric: {
          icon: 'metric',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          displayName: '指标',
          actions: ['query', 'graph']
        },
        label: {
          icon: 'label',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          displayName: '标签',
          actions: ['filter']
        }
      },
      
      defaultConfig: {
        port: 9090,
        ssl: false,
        timeout: 30,
        queryLanguage: 'promql'
      },
      
      connectionTest: {
        method: 'ping',
        testQuery: '/api/v1/labels'
      }
    };

    this.register({
      type: 'prometheus',
      features: prometheusFeatures,
      queryEngineClass: 'PrometheusQueryEngine',
      clientClass: 'PrometheusClient',
      enabled: false, // 暂时禁用，用于未来扩展
      priority: 3
    });
  }
}

// 导出单例实例
export const databaseRegistry = DatabaseRegistry.getInstance();
