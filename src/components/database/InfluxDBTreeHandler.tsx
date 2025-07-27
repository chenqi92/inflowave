/**
 * InfluxDB 树节点处理器
 * 
 * 专门处理 InfluxDB 1.x/2.x/3.x 的树节点生成和管理
 */

import React from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { ConnectionConfig, DatabaseType } from '@/types';

// InfluxDB 树节点接口
export interface InfluxDBTreeNode {
  key: string;
  title: React.ReactNode;
  children?: InfluxDBTreeNode[];
  icon?: React.ReactNode;
  isLeaf?: boolean;
  nodeType: 'organization' | 'bucket' | 'database' | 'measurement' | 'retention_policy' | 'field' | 'tag';
  dbType: DatabaseType;
  connectionId: string;
  database?: string;
  measurement?: string;
  organization?: string;
  bucket?: string;
  metadata?: any;
}

// InfluxDB 版本检测结果
export interface InfluxDBVersionInfo {
  version: string;
  type: '1.x' | '2.x' | '3.x';
  features: string[];
}

export class InfluxDBTreeHandler {
  private connectionId: string;
  private connection: ConnectionConfig;

  constructor(connectionId: string, connection: ConnectionConfig) {
    this.connectionId = connectionId;
    this.connection = connection;
  }

  /**
   * 检测 InfluxDB 版本
   */
  async detectVersion(): Promise<InfluxDBVersionInfo> {
    try {
      const versionInfo = await safeTauriInvoke<any>('detect_influxdb_version', {
        connectionId: this.connectionId,
      });

      return {
        version: versionInfo.version || 'unknown',
        type: this.parseVersionType(versionInfo.version),
        features: versionInfo.features || [],
      };
    } catch (error) {
      console.warn('InfluxDB 版本检测失败，使用默认配置:', error);
      return {
        version: 'unknown',
        type: '1.x',
        features: [],
      };
    }
  }

  /**
   * 解析版本类型
   */
  private parseVersionType(version: string): '1.x' | '2.x' | '3.x' {
    if (!version) return '1.x';
    
    if (version.startsWith('1.')) return '1.x';
    if (version.startsWith('2.')) return '2.x';
    if (version.startsWith('3.')) return '3.x';
    
    // 默认返回 1.x
    return '1.x';
  }

  /**
   * 获取 InfluxDB 树节点
   */
  async getTreeNodes(): Promise<InfluxDBTreeNode[]> {
    const versionInfo = await this.detectVersion();
    
    console.log(`🔍 InfluxDB 版本检测结果: ${versionInfo.type} (${versionInfo.version})`);
    
    switch (versionInfo.type) {
      case '1.x':
        return this.getInfluxDB1xNodes();
      case '2.x':
        return this.getInfluxDB2xNodes();
      case '3.x':
        return this.getInfluxDB3xNodes();
      default:
        return this.getInfluxDB1xNodes(); // 默认使用 1.x
    }
  }

  /**
   * 获取 InfluxDB 1.x 树节点
   */
  private async getInfluxDB1xNodes(): Promise<InfluxDBTreeNode[]> {
    try {
      console.log('🔍 获取 InfluxDB 1.x 数据库列表...');
      
      const databases = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: this.connectionId,
      });

      console.log(`✅ InfluxDB 1.x 获取到 ${databases.length} 个数据库:`, databases);

      return databases.map(dbName => ({
        key: `database:${this.connectionId}:${dbName}`,
        title: dbName,
        children: [],
        isLeaf: false,
        nodeType: 'database' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        database: dbName,
        metadata: { 
          databaseName: dbName,
          version: '1.x',
          isSystemDatabase: dbName.startsWith('_'),
        },
      }));
    } catch (error) {
      console.error('❌ 获取 InfluxDB 1.x 数据库列表失败:', error);
      showMessage.error(`获取 InfluxDB 1.x 数据库列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取 InfluxDB 2.x 树节点
   */
  private async getInfluxDB2xNodes(): Promise<InfluxDBTreeNode[]> {
    try {
      console.log('🔍 获取 InfluxDB 2.x 组织列表...');
      
      const organizations = await safeTauriInvoke<string[]>('get_organizations', {
        connectionId: this.connectionId,
      });

      console.log(`✅ InfluxDB 2.x 获取到 ${organizations.length} 个组织:`, organizations);

      return organizations.map(orgName => ({
        key: `organization:${this.connectionId}:${orgName}`,
        title: orgName,
        children: [],
        isLeaf: false,
        nodeType: 'organization' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        organization: orgName,
        metadata: { 
          organizationName: orgName,
          version: '2.x',
        },
      }));
    } catch (error) {
      console.error('❌ 获取 InfluxDB 2.x 组织列表失败:', error);
      showMessage.error(`获取 InfluxDB 2.x 组织列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取 InfluxDB 3.x 树节点
   */
  private async getInfluxDB3xNodes(): Promise<InfluxDBTreeNode[]> {
    try {
      console.log('🔍 获取 InfluxDB 3.x 数据库列表...');
      
      const databases = await safeTauriInvoke<string[]>('get_databases_v3', {
        connectionId: this.connectionId,
      });

      console.log(`✅ InfluxDB 3.x 获取到 ${databases.length} 个数据库:`, databases);

      return databases.map(dbName => ({
        key: `database:${this.connectionId}:${dbName}`,
        title: dbName,
        children: [],
        isLeaf: false,
        nodeType: 'database' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        database: dbName,
        metadata: { 
          databaseName: dbName,
          version: '3.x',
          isSystemDatabase: dbName.startsWith('_'),
        },
      }));
    } catch (error) {
      console.error('❌ 获取 InfluxDB 3.x 数据库列表失败:', error);
      showMessage.error(`获取 InfluxDB 3.x 数据库列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取组织的存储桶列表 (InfluxDB 2.x)
   */
  async getBucketsForOrganization(orgName: string): Promise<InfluxDBTreeNode[]> {
    try {
      console.log(`🔍 获取组织 "${orgName}" 的存储桶列表...`);
      
      const buckets = await safeTauriInvoke<string[]>('get_buckets_for_org', {
        connectionId: this.connectionId,
        orgName,
      });

      console.log(`✅ 组织 "${orgName}" 获取到 ${buckets.length} 个存储桶:`, buckets);

      return buckets.map(bucketName => ({
        key: `bucket:${this.connectionId}:${orgName}:${bucketName}`,
        title: bucketName,
        children: [],
        isLeaf: false,
        nodeType: 'bucket' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        organization: orgName,
        bucket: bucketName,
        metadata: { 
          bucketName,
          organizationName: orgName,
          version: '2.x',
          isSystemBucket: bucketName.startsWith('_'),
        },
      }));
    } catch (error) {
      console.error(`❌ 获取组织 "${orgName}" 的存储桶列表失败:`, error);
      showMessage.error(`获取组织 "${orgName}" 的存储桶列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取数据库的测量值列表 (InfluxDB 1.x/3.x)
   */
  async getMeasurementsForDatabase(database: string): Promise<InfluxDBTreeNode[]> {
    try {
      console.log(`🔍 获取数据库 "${database}" 的测量值列表...`);
      
      const measurements = await safeTauriInvoke<string[]>('get_measurements', {
        connectionId: this.connectionId,
        database,
      });

      console.log(`✅ 数据库 "${database}" 获取到 ${measurements.length} 个测量值:`, measurements);

      return measurements.map(measurementName => ({
        key: `measurement:${this.connectionId}:${database}:${measurementName}`,
        title: measurementName,
        children: [],
        isLeaf: false,
        nodeType: 'measurement' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        database,
        measurement: measurementName,
        metadata: { 
          measurementName,
          databaseName: database,
        },
      }));
    } catch (error) {
      console.error(`❌ 获取数据库 "${database}" 的测量值列表失败:`, error);
      showMessage.error(`获取数据库 "${database}" 的测量值列表失败: ${error}`);
      return [];
    }
  }

  /**
   * 获取存储桶的测量值列表 (InfluxDB 2.x)
   */
  async getMeasurementsForBucket(orgName: string, bucketName: string): Promise<InfluxDBTreeNode[]> {
    try {
      console.log(`🔍 获取存储桶 "${bucketName}" 的测量值列表...`);
      
      const measurements = await safeTauriInvoke<string[]>('get_measurements_for_bucket', {
        connectionId: this.connectionId,
        orgName,
        bucketName,
      });

      console.log(`✅ 存储桶 "${bucketName}" 获取到 ${measurements.length} 个测量值:`, measurements);

      return measurements.map(measurementName => ({
        key: `measurement:${this.connectionId}:${orgName}:${bucketName}:${measurementName}`,
        title: measurementName,
        children: [],
        isLeaf: false,
        nodeType: 'measurement' as const,
        dbType: 'influxdb' as const,
        connectionId: this.connectionId,
        organization: orgName,
        bucket: bucketName,
        measurement: measurementName,
        metadata: { 
          measurementName,
          bucketName,
          organizationName: orgName,
        },
      }));
    } catch (error) {
      console.error(`❌ 获取存储桶 "${bucketName}" 的测量值列表失败:`, error);
      showMessage.error(`获取存储桶 "${bucketName}" 的测量值列表失败: ${error}`);
      return [];
    }
  }
}

export default InfluxDBTreeHandler;
