/**
 * 数据库服务模块入口
 * 
 * 导出所有数据库相关的服务和工具
 */

// 核心类型导出
export type {
  DatabaseType,
  DatabaseFeatures,
  DatabaseLevel,
  NodeTypeConfig,
  QueryOperation,
  QueryParams,
  FieldInfo,
  QueryCapabilities,
  DatabaseQueryEngine,
  DataSourceNodeExtended,
  QueryLanguage,
  NodeType,
  VersionSpecificFeatures,
  DatabaseHierarchy
} from '@/types/database/features';

// 注册表和工厂
export { DatabaseRegistry, databaseRegistry } from './DatabaseRegistry';
export { QueryEngineFactory, queryEngineFactory } from './QueryEngineFactory';
export { DataSourceNodeBuilder, dataSourceNodeBuilder } from './DataSourceNodeBuilder';

// 查询引擎
export { QueryEngineBase } from './QueryEngineBase';
export { default as InfluxDBQueryEngine } from './InfluxDBQueryEngine';
export { default as IoTDBQueryEngine } from './IoTDBQueryEngine';

/**
 * 初始化数据库服务
 */
export function initializeDatabaseServices(): void {
  console.log('🚀 初始化数据库服务...');
  
  try {
    // 初始化数据库注册表
    databaseRegistry.initialize();
    
    // 验证注册的数据库类型
    const supportedTypes = databaseRegistry.getSupportedTypes();
    console.log('📋 支持的数据库类型:', supportedTypes);
    
    // 验证每个数据库类型的配置
    for (const dbType of supportedTypes) {
      try {
        const features = databaseRegistry.getFeatures(dbType);
        console.log(`✅ ${dbType} 配置验证通过:`, {
          levels: features.hierarchy.levels.length,
          languages: features.queryCapabilities.languages.length,
          versions: Object.keys(features.versionFeatures).length
        });
      } catch (error) {
        console.error(`❌ ${dbType} 配置验证失败:`, error);
      }
    }
    
    console.log('✅ 数据库服务初始化完成');
  } catch (error) {
    console.error('❌ 数据库服务初始化失败:', error);
    throw error;
  }
}

/**
 * 获取数据库服务状态
 */
export function getDatabaseServiceStatus(): {
  initialized: boolean;
  supportedTypes: string[];
  engineStats: any;
  registryStats: any;
} {
  try {
    const supportedTypes = databaseRegistry.getSupportedTypes();
    const engineStats = queryEngineFactory.getStats();
    
    return {
      initialized: true,
      supportedTypes,
      engineStats,
      registryStats: {
        totalTypes: supportedTypes.length,
        types: supportedTypes
      }
    };
  } catch (error) {
    return {
      initialized: false,
      supportedTypes: [],
      engineStats: { totalEngines: 0, enginesByType: {}, engineKeys: [] },
      registryStats: { totalTypes: 0, types: [] }
    };
  }
}

/**
 * 清理数据库服务
 */
export async function cleanupDatabaseServices(): Promise<void> {
  console.log('🧹 清理数据库服务...');
  
  try {
    await queryEngineFactory.cleanup();
    console.log('✅ 数据库服务清理完成');
  } catch (error) {
    console.error('❌ 数据库服务清理失败:', error);
    throw error;
  }
}

/**
 * 创建数据库查询引擎
 */
export function createQueryEngine(dbType: DatabaseType, version: string = 'latest') {
  return queryEngineFactory.create(dbType, version);
}

/**
 * 获取数据库特征配置
 */
export function getDatabaseFeatures(dbType: DatabaseType, version?: string) {
  return databaseRegistry.getFeatures(dbType, version);
}

/**
 * 构建数据源节点
 */
export function buildDataSourceNode(
  type: 'connection' | 'database' | 'table' | 'field',
  params: any
) {
  switch (type) {
    case 'connection':
      return dataSourceNodeBuilder.buildConnectionNode(
        params.connectionId,
        params.dbType,
        params.connectionName,
        params.version,
        params.isConnected,
        params.isFavorite
      );
    case 'database':
      return dataSourceNodeBuilder.buildDatabaseNode(
        params.connectionId,
        params.dbType,
        params.databaseName,
        params.version,
        params.isFavorite
      );
    case 'table':
      return dataSourceNodeBuilder.buildTableNode(
        params.connectionId,
        params.dbType,
        params.database,
        params.tableName,
        params.version,
        params.isFavorite
      );
    case 'field':
      return dataSourceNodeBuilder.buildFieldNode(
        params.connectionId,
        params.dbType,
        params.database,
        params.table,
        params.fieldInfo,
        params.version,
        params.isFavorite
      );
    default:
      throw new Error(`不支持的节点类型: ${type}`);
  }
}

/**
 * 验证数据库配置
 */
export function validateDatabaseConfig(dbType: DatabaseType, version: string) {
  return queryEngineFactory.validateEngine(dbType, version);
}

/**
 * 获取数据库层次结构
 */
export function getDatabaseHierarchy(dbType: DatabaseType, version?: string) {
  return databaseRegistry.getHierarchy(dbType, version);
}

/**
 * 获取节点类型配置
 */
export function getNodeTypeConfig(dbType: DatabaseType, nodeType: string, version?: string) {
  return databaseRegistry.getNodeTypeConfig(dbType, nodeType, version);
}

/**
 * 数据库服务工具函数
 */
export const DatabaseServiceUtils = {
  // 检查数据库类型支持
  isSupported: (dbType: DatabaseType) => databaseRegistry.supports(dbType),

  // 获取所有支持的数据库类型
  getSupportedTypes: () => databaseRegistry.getSupportedTypes(),

  // 获取数据库显示名称
  getDisplayName: (dbType: DatabaseType) => {
    try {
      const features = databaseRegistry.getFeatures(dbType);
      return features.displayName;
    } catch {
      return dbType;
    }
  },
  
  // 获取数据库描述
  getDescription: (dbType: DatabaseType) => {
    try {
      const features = databaseRegistry.getFeatures(dbType);
      return features.description;
    } catch {
      return '';
    }
  },
  
  // 获取默认配置
  getDefaultConfig: (dbType: DatabaseType) => {
    try {
      const features = databaseRegistry.getFeatures(dbType);
      return features.defaultConfig;
    } catch {
      return null;
    }
  },
  
  // 获取支持的查询语言
  getSupportedLanguages: (dbType: DatabaseType, version?: string) => {
    try {
      const features = databaseRegistry.getFeatures(dbType, version);
      return features.queryCapabilities.languages;
    } catch {
      return [];
    }
  },
  
  // 获取支持的操作
  getSupportedOperations: (dbType: DatabaseType, version?: string) => {
    try {
      const features = databaseRegistry.getFeatures(dbType, version);
      return features.queryCapabilities.supportedOperations;
    } catch {
      return [];
    }
  }
};

// 默认导出
export default {
  initialize: initializeDatabaseServices,
  cleanup: cleanupDatabaseServices,
  getStatus: getDatabaseServiceStatus,
  createEngine: createQueryEngine,
  getFeatures: getDatabaseFeatures,
  buildNode: buildDataSourceNode,
  validate: validateDatabaseConfig,
  getHierarchy: getDatabaseHierarchy,
  getNodeConfig: getNodeTypeConfig,
  utils: DatabaseServiceUtils
};
