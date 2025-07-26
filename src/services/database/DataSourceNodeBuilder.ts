/**
 * 数据源节点构建器
 * 
 * 根据数据库类型和特征配置构建统一的数据源树节点
 */

import React from 'react';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { 
  DatabaseType,
  DatabaseLevel,
  NodeTypeConfig,
  DataSourceNodeExtended,
  FieldInfo
} from '@/types/database/features';
import { databaseRegistry } from './DatabaseRegistry';
import { getDatabaseIcon } from '@/utils/databaseIcons';

export class DataSourceNodeBuilder {
  private registry = databaseRegistry;

  /**
   * 构建连接节点
   */
  buildConnectionNode(
    connectionId: string,
    dbType: DatabaseType,
    connectionName: string,
    version?: string,
    isConnected: boolean = false,
    isFavorite: boolean = false
  ): DataSourceNodeExtended {
    const features = this.registry.getFeatures(dbType, version);
    const rootLevel = features.hierarchy.levels[0];
    
    return {
      key: `connection:${connectionId}`,
      title: this.buildConnectionTitle(connectionName, dbType, isConnected, isFavorite),
      children: [],
      icon: getDatabaseIcon(dbType),
      isLeaf: false,
      nodeType: 'connection',
      dbType,
      version,
      connectionId,
      level: 'connection',
      path: [],
      metadata: {
        level: 'connection',
        version: version || 'unknown',
        features,
        connectionName,
        isConnected,
        nextLevel: rootLevel.name
      },
      actions: {
        canExpand: isConnected,
        canSelect: true,
        canEdit: true,
        canDelete: true,
        canExport: false,
        customActions: ['test_connection', 'refresh', 'disconnect']
      },
      status: {
        loading: false,
        childrenLoaded: false
      }
    };
  }

  /**
   * 构建数据库层级节点（数据库、存储组等）
   */
  buildDatabaseNode(
    connectionId: string,
    dbType: DatabaseType,
    databaseName: string,
    version?: string,
    isFavorite: boolean = false
  ): DataSourceNodeExtended {
    const features = this.registry.getFeatures(dbType, version);
    const databaseLevel = features.hierarchy.levels[0];
    const nodeConfig = features.nodeTypeMapping[databaseLevel.name];
    
    return {
      key: `database:${connectionId}:${databaseName}`,
      title: this.buildNodeTitle(databaseLevel, nodeConfig, databaseName, undefined, isFavorite),
      children: [],
      icon: this.getNodeIcon(nodeConfig, dbType),
      isLeaf: !databaseLevel.hasChildren,
      nodeType: databaseLevel.name as any,
      dbType,
      version,
      connectionId,
      level: databaseLevel.name,
      path: [databaseName],
      metadata: {
        level: databaseLevel.name,
        version: version || 'unknown',
        features,
        databaseName,
        nextLevel: databaseLevel.childLevel
      },
      actions: {
        canExpand: databaseLevel.hasChildren,
        canSelect: true,
        canEdit: false,
        canDelete: true,
        canExport: true,
        customActions: nodeConfig.actions || []
      },
      status: {
        loading: false,
        childrenLoaded: false
      }
    };
  }

  /**
   * 构建表/设备层级节点
   */
  buildTableNode(
    connectionId: string,
    dbType: DatabaseType,
    database: string,
    tableName: string,
    version?: string,
    isFavorite: boolean = false
  ): DataSourceNodeExtended {
    const features = this.registry.getFeatures(dbType, version);
    const tableLevel = features.hierarchy.levels[1]; // 假设表是第二层
    const nodeConfig = features.nodeTypeMapping[tableLevel.name];
    
    return {
      key: `table:${connectionId}:${database}:${tableName}`,
      title: this.buildNodeTitle(tableLevel, nodeConfig, tableName, undefined, isFavorite),
      children: [],
      icon: this.getNodeIcon(nodeConfig, dbType),
      isLeaf: !tableLevel.hasChildren,
      nodeType: tableLevel.name as any,
      dbType,
      version,
      connectionId,
      level: tableLevel.name,
      path: [database, tableName],
      parentPath: [database],
      metadata: {
        level: tableLevel.name,
        version: version || 'unknown',
        features,
        databaseName: database,
        tableName,
        nextLevel: tableLevel.childLevel
      },
      actions: {
        canExpand: tableLevel.hasChildren,
        canSelect: true,
        canEdit: false,
        canDelete: true,
        canExport: true,
        customActions: nodeConfig.actions || []
      },
      status: {
        loading: false,
        childrenLoaded: false
      }
    };
  }

  /**
   * 构建字段/时间序列层级节点
   */
  buildFieldNode(
    connectionId: string,
    dbType: DatabaseType,
    database: string,
    table: string,
    fieldInfo: FieldInfo,
    version?: string,
    isFavorite: boolean = false
  ): DataSourceNodeExtended {
    const features = this.registry.getFeatures(dbType, version);
    const fieldLevel = features.hierarchy.levels[2]; // 假设字段是第三层
    const nodeConfig = features.nodeTypeMapping[fieldLevel.name];
    
    return {
      key: `field:${connectionId}:${database}:${table}:${fieldInfo.name}`,
      title: this.buildNodeTitle(fieldLevel, nodeConfig, fieldInfo.name, fieldInfo.type, isFavorite),
      children: [],
      icon: this.getNodeIcon(nodeConfig, dbType),
      isLeaf: true,
      nodeType: fieldLevel.name as any,
      dbType,
      version,
      connectionId,
      level: fieldLevel.name,
      path: [database, table, fieldInfo.name],
      parentPath: [database, table],
      metadata: {
        level: fieldLevel.name,
        version: version || 'unknown',
        features,
        databaseName: database,
        tableName: table,
        fieldName: fieldInfo.name,
        fieldType: fieldInfo.type,
        fieldInfo
      },
      actions: {
        canExpand: false,
        canSelect: true,
        canEdit: false,
        canDelete: true,
        canExport: true,
        customActions: nodeConfig.actions || []
      },
      status: {
        loading: false,
        childrenLoaded: true
      }
    };
  }

  /**
   * 构建通用节点
   */
  buildGenericNode(
    connectionId: string,
    dbType: DatabaseType,
    level: DatabaseLevel,
    data: any,
    parentPath: string[] = [],
    version?: string,
    isFavorite: boolean = false
  ): DataSourceNodeExtended {
    const features = this.registry.getFeatures(dbType, version);
    const nodeConfig = features.nodeTypeMapping[level.name];
    const currentPath = [...parentPath, data.name];
    
    return {
      key: this.generateNodeKey(connectionId, level.name, data.name, parentPath),
      title: this.buildNodeTitle(level, nodeConfig, data.name, data.type, isFavorite),
      children: [],
      icon: this.getNodeIcon(nodeConfig, dbType),
      isLeaf: level.isLeaf || !level.hasChildren,
      nodeType: level.name as any,
      dbType,
      version,
      connectionId,
      level: level.name,
      path: currentPath,
      parentPath: parentPath.length > 0 ? parentPath : undefined,
      metadata: {
        level: level.name,
        version: version || 'unknown',
        features,
        ...data,
        nextLevel: level.childLevel
      },
      actions: {
        canExpand: level.hasChildren && !level.isLeaf,
        canSelect: true,
        canEdit: false,
        canDelete: true,
        canExport: true,
        customActions: nodeConfig?.actions || []
      },
      status: {
        loading: false,
        childrenLoaded: level.isLeaf || !level.hasChildren
      }
    };
  }

  /**
   * 构建节点标题
   */
  private buildNodeTitle(
    level: DatabaseLevel,
    nodeConfig: NodeTypeConfig,
    name: string,
    type?: string,
    isFavorite: boolean = false
  ): React.ReactNode {
    return React.createElement('div', {
      className: 'flex items-center justify-between w-full'
    }, [
      React.createElement('div', {
        key: 'content',
        className: 'flex items-center space-x-2'
      }, [
        this.getNodeIcon(nodeConfig),
        React.createElement('span', { key: 'name' }, name),
        type && React.createElement(Badge, {
          key: 'type',
          variant: 'outline',
          className: 'text-xs'
        }, type)
      ]),
      isFavorite && React.createElement(Star, {
        key: 'favorite',
        className: 'w-3 h-3 text-yellow-500 fill-current'
      })
    ]);
  }

  /**
   * 构建连接节点标题
   */
  private buildConnectionTitle(
    connectionName: string,
    dbType: DatabaseType,
    isConnected: boolean,
    isFavorite: boolean
  ): React.ReactNode {
    return React.createElement('div', {
      className: 'flex items-center justify-between w-full'
    }, [
      React.createElement('div', {
        key: 'content',
        className: 'flex items-center space-x-2'
      }, [
        getDatabaseIcon(dbType),
        React.createElement('span', { key: 'name' }, connectionName),
        React.createElement('div', {
          key: 'status',
          className: `w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`
        })
      ]),
      isFavorite && React.createElement(Star, {
        key: 'favorite',
        className: 'w-3 h-3 text-yellow-500 fill-current'
      })
    ]);
  }

  /**
   * 获取节点图标
   */
  private getNodeIcon(nodeConfig: NodeTypeConfig, dbType?: DatabaseType): React.ReactNode {
    if (dbType) {
      return getDatabaseIcon(dbType);
    }
    
    // 这里可以根据 nodeConfig.icon 返回相应的图标
    // 暂时返回默认图标
    return getDatabaseIcon('influxdb');
  }

  /**
   * 生成节点键
   */
  private generateNodeKey(
    connectionId: string,
    level: string,
    name: string,
    parentPath: string[] = []
  ): string {
    const pathStr = parentPath.length > 0 ? parentPath.join(':') + ':' : '';
    return `${level}:${connectionId}:${pathStr}${name}`;
  }

  /**
   * 批量构建节点
   */
  buildNodes(
    connectionId: string,
    dbType: DatabaseType,
    level: DatabaseLevel,
    dataList: any[],
    parentPath: string[] = [],
    version?: string
  ): DataSourceNodeExtended[] {
    return dataList.map(data => 
      this.buildGenericNode(connectionId, dbType, level, data, parentPath, version)
    );
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(
    node: DataSourceNodeExtended,
    status: Partial<DataSourceNodeExtended['status']>
  ): DataSourceNodeExtended {
    return {
      ...node,
      status: {
        ...node.status,
        ...status
      }
    };
  }

  /**
   * 更新节点子节点
   */
  updateNodeChildren(
    node: DataSourceNodeExtended,
    children: DataSourceNodeExtended[]
  ): DataSourceNodeExtended {
    return {
      ...node,
      children,
      status: {
        ...node.status,
        childrenLoaded: true
      }
    };
  }

  /**
   * 检查节点是否可以展开
   */
  canExpandNode(node: DataSourceNodeExtended): boolean {
    return node.actions?.canExpand && !node.isLeaf && !node.status?.loading;
  }

  /**
   * 获取节点的下一级类型
   */
  getNextLevelType(node: DataSourceNodeExtended): string | undefined {
    return node.metadata.nextLevel;
  }
}

// 导出单例实例
export const dataSourceNodeBuilder = new DataSourceNodeBuilder();

export default DataSourceNodeBuilder;
