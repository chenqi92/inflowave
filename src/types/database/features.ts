/**
 * 数据库特征定义
 * 
 * 定义了数据库的层次结构、查询能力、版本特性等
 */

import type { DatabaseType } from '../index';

// 重新导出 DatabaseType 以便其他模块使用
export type { DatabaseType } from '../index';

// 查询语言类型
export type QueryLanguage = 'influxql' | 'flux' | 'sql' | 'iotdb-sql' | 'promql';

// 查询操作类型
export type QueryOperation = 'select' | 'show' | 'describe' | 'explain' | 'insert' | 'delete' | 'create' | 'drop';

// 节点类型
export type NodeType = 'connection' | 'database' | 'table' | 'field' | 'storage_group' | 'device' | 'timeseries' | 'bucket' | 'measurement' | 'metric' | 'label';

// 数据库层级定义
export interface DatabaseLevel {
  name: string;           // 层级名称，如 'database', 'storage_group'
  displayName: string;    // 显示名称，如 '数据库', '存储组'
  icon: string;          // 图标名称
  queryMethod: string;    // 获取该层级数据的方法名
  hasChildren: boolean;   // 是否有子节点
  childLevel?: string;    // 子层级名称
  isLeaf?: boolean;      // 是否为叶子节点
  metadata?: {           // 额外的元数据
    [key: string]: any;
  };
}

// 节点类型配置
export interface NodeTypeConfig {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  displayName: string;
  description?: string;
  actions?: string[];    // 支持的右键菜单操作
}

// 查询参数
export interface QueryParams {
  connectionId: string;
  database?: string;
  table?: string;
  field?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  timeRange?: {
    start: string;
    end: string;
  };
}

// 字段信息
export interface FieldInfo {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: any;
  description?: string;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

// 版本特定特性
export interface VersionSpecificFeatures {
  apiType?: string;           // API类型，如 'rest', 'grpc', 'thrift'
  authMethod?: string;        // 认证方法，如 'basic', 'token', 'oauth'
  queryLanguages?: QueryLanguage[];  // 支持的查询语言
  concepts?: string[];        // 数据库概念，如 ['database', 'measurement', 'field']
  queryCommands?: string[];   // 支持的查询命令
  apiEndpoints?: Record<string, string>;  // API端点映射
  limitations?: string[];     // 版本限制
  features?: string[];        // 特有功能
}

// 查询能力定义
export interface QueryCapabilities {
  languages: QueryLanguage[];
  supportedOperations: QueryOperation[];
  maxQuerySize?: number;
  timeoutSeconds?: number;
  supportsBatch?: boolean;
  supportsTransaction?: boolean;
  supportsAsync?: boolean;
}

// 数据库层次结构
export interface DatabaseHierarchy {
  levels: DatabaseLevel[];
  maxDepth: number;
  rootLevel: string;        // 根层级名称
  leafLevel: string;        // 叶子层级名称
}

// 数据库特征完整定义
export interface DatabaseFeatures {
  // 基本信息
  name: string;
  displayName: string;
  description: string;
  
  // 层次结构定义
  hierarchy: DatabaseHierarchy;
  
  // 查询能力
  queryCapabilities: QueryCapabilities;
  
  // 版本特性映射
  versionFeatures: Record<string, VersionSpecificFeatures>;
  
  // 节点类型映射
  nodeTypeMapping: Record<string, NodeTypeConfig>;
  
  // 默认配置
  defaultConfig?: {
    port: number;
    ssl: boolean;
    timeout: number;
    queryLanguage: QueryLanguage;
  };
  
  // 连接测试配置
  connectionTest?: {
    method: 'ping' | 'query' | 'custom';
    testQuery?: string;
    expectedResponse?: any;
  };
}

// 数据库注册表条目
export interface DatabaseRegistryEntry {
  type: DatabaseType;
  features: DatabaseFeatures;
  queryEngineClass: string;  // 查询引擎类名
  clientClass: string;       // 客户端类名
  enabled: boolean;
  priority: number;          // 优先级，用于排序
}

// 查询结果元数据
export interface QueryResultMetadata {
  queryLanguage: QueryLanguage;
  executionTime: number;
  rowCount: number;
  columnCount: number;
  fromCache?: boolean;
  warnings?: string[];
  queryPlan?: any;
}

// 数据源节点扩展接口
export interface DataSourceNodeExtended {
  key: string;
  title: React.ReactNode;
  children?: DataSourceNodeExtended[];
  icon?: React.ReactNode;
  isLeaf?: boolean;
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  
  // 扩展属性
  nodeType: NodeType;
  dbType: DatabaseType;
  version?: string;
  connectionId?: string;
  level?: string;
  
  // 路径信息
  path: string[];           // 从根到当前节点的路径
  parentPath?: string[];    // 父节点路径
  
  // 元数据
  metadata: {
    level: string;
    version: string;
    features: DatabaseFeatures;
    [key: string]: any;
  };
  
  // 操作配置
  actions?: {
    canExpand: boolean;
    canSelect: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    customActions?: string[];
  };
  
  // 状态信息
  status?: {
    loading: boolean;
    error?: string;
    lastUpdated?: Date;
    childrenLoaded: boolean;
  };
}

// 查询引擎接口
export interface DatabaseQueryEngine {
  // 基础查询方法
  getDatabases(connectionId: string): Promise<string[]>;
  getTables(connectionId: string, database: string): Promise<string[]>;
  getFields(connectionId: string, database: string, table: string): Promise<FieldInfo[]>;
  
  // 查询构建
  buildQuery(operation: QueryOperation, params: QueryParams): string;
  
  // 查询执行
  executeQuery(connectionId: string, query: string, params?: QueryParams): Promise<any>;
  
  // 版本适配
  adaptQuery(query: string, targetVersion: string): string;
  adaptResponse(response: any, sourceVersion: string): any;
  
  // 能力检查
  supportsOperation(operation: QueryOperation): boolean;
  supportsLanguage(language: QueryLanguage): boolean;
  
  // 元数据
  getCapabilities(): QueryCapabilities;
  getVersion(): string;
}

// 版本适配器接口
export interface VersionAdapter {
  sourceVersion: string;
  targetVersion: string;
  
  adaptQuery(query: string): string;
  adaptResponse(response: any): any;
  adaptConfig(config: any): any;
  
  getCapabilities(): QueryCapabilities;
  getMigrationNotes(): string[];
}

// 数据库客户端工厂接口
export interface DatabaseClientFactory {
  create(dbType: DatabaseType, config: any): any;
  supports(dbType: DatabaseType): boolean;
  getRequiredConfig(dbType: DatabaseType): string[];
}

export default DatabaseFeatures;
