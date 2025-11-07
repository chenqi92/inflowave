/**
 * 查询引擎工厂
 * 
 * 根据数据库类型和版本创建相应的查询引擎实例
 */

import type { DatabaseType, DatabaseQueryEngine } from '@/types/database/features';
import { databaseRegistry } from './DatabaseRegistry';
import InfluxDBQueryEngine from './InfluxDBQueryEngine';
import IoTDBQueryEngine from './IoTDBQueryEngine';
import logger from '@/utils/logger';

export class QueryEngineFactory {
  private static engines: Map<string, DatabaseQueryEngine> = new Map();

  /**
   * 创建查询引擎实例
   */
  static create(dbType: DatabaseType, version: string = 'latest'): DatabaseQueryEngine {
    const engineKey = `${dbType}:${version}`;
    
    // 检查是否已有缓存的引擎实例
    if (this.engines.has(engineKey)) {
      return this.engines.get(engineKey)!;
    }

    // 验证数据库类型是否支持
    if (!databaseRegistry.supports(dbType)) {
      throw new Error(`不支持的数据库类型: ${dbType}`);
    }

    let engine: DatabaseQueryEngine;

    // 根据数据库类型创建相应的查询引擎
    switch (dbType) {
      case 'influxdb':
        engine = new InfluxDBQueryEngine(version);
        break;
        
      case 'iotdb':
        engine = new IoTDBQueryEngine(version);
        break;
        
      case 'prometheus':
        // 暂时使用基础实现，未来可以添加 PrometheusQueryEngine
        throw new Error('Prometheus 查询引擎尚未实现');
        
      default:
        throw new Error(`不支持的数据库类型: ${dbType}`);
    }

    // 缓存引擎实例
    this.engines.set(engineKey, engine);
    
    logger.info(`🏭 创建查询引擎: ${dbType} v${version}`);
    
    return engine;
  }

  /**
   * 获取已创建的查询引擎
   */
  static get(dbType: DatabaseType, version: string = 'latest'): DatabaseQueryEngine | null {
    const engineKey = `${dbType}:${version}`;
    return this.engines.get(engineKey) || null;
  }

  /**
   * 检查是否支持某个数据库类型
   */
  static supports(dbType: DatabaseType): boolean {
    return databaseRegistry.supports(dbType);
  }

  /**
   * 获取所有支持的数据库类型
   */
  static getSupportedTypes(): DatabaseType[] {
    return databaseRegistry.getSupportedTypes();
  }

  /**
   * 清理缓存的引擎实例
   */
  static async cleanup(): Promise<void> {
    logger.info('🧹 清理查询引擎缓存...');
    
    // 调用每个引擎的清理方法
    for (const [key, engine] of this.engines) {
      try {
        if ('cleanup' in engine && typeof engine.cleanup === 'function') {
          await engine.cleanup();
        }
        logger.debug(`✅ 清理引擎: ${key}`);
      } catch (error) {
        logger.error(`❌ 清理引擎失败: ${key}`, error);
      }
    }
    
    // 清空缓存
    this.engines.clear();
    logger.debug('🗑️ 查询引擎缓存已清空');
  }

  /**
   * 重新加载引擎（用于配置更新）
   */
  static reload(dbType: DatabaseType, version: string = 'latest'): DatabaseQueryEngine {
    const engineKey = `${dbType}:${version}`;
    
    // 移除旧的引擎实例
    if (this.engines.has(engineKey)) {
      this.engines.delete(engineKey);
      logger.info(`🔄 重新加载查询引擎: ${engineKey}`);
    }
    
    // 创建新的引擎实例
    return this.create(dbType, version);
  }

  /**
   * 获取引擎统计信息
   */
  static getStats(): {
    totalEngines: number;
    enginesByType: Record<string, number>;
    engineKeys: string[];
  } {
    const enginesByType: Record<string, number> = {};
    const engineKeys: string[] = [];
    
    for (const key of this.engines.keys()) {
      engineKeys.push(key);
      
      const dbType = key.split(':')[0];
      enginesByType[dbType] = (enginesByType[dbType] || 0) + 1;
    }
    
    return {
      totalEngines: this.engines.size,
      enginesByType,
      engineKeys
    };
  }

  /**
   * 验证引擎配置
   */
  static validateEngine(dbType: DatabaseType, version: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 检查数据库类型支持
      if (!databaseRegistry.supports(dbType)) {
        errors.push(`不支持的数据库类型: ${dbType}`);
        return { valid: false, errors, warnings };
      }

      // 获取数据库特征
      const features = databaseRegistry.getFeatures(dbType, version);
      
      // 检查版本特性
      if (version !== 'latest' && !features.versionFeatures[version]) {
        warnings.push(`版本 ${version} 的特性配置不存在，将使用默认配置`);
      }

      // 检查查询能力
      if (!features.queryCapabilities.languages.length) {
        errors.push(`数据库 ${dbType} 没有配置支持的查询语言`);
      }

      // 检查层次结构
      if (!features.hierarchy.levels.length) {
        errors.push(`数据库 ${dbType} 没有配置层次结构`);
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      errors.push(`验证引擎配置时发生错误: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * 创建引擎并验证
   */
  static createWithValidation(dbType: DatabaseType, version: string = 'latest'): {
    engine: DatabaseQueryEngine | null;
    validation: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
  } {
    const validation = this.validateEngine(dbType, version);
    
    if (!validation.valid) {
      return {
        engine: null,
        validation
      };
    }

    try {
      const engine = this.create(dbType, version);
      return {
        engine,
        validation
      };
    } catch (error) {
      validation.valid = false;
      validation.errors.push(`创建引擎失败: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        engine: null,
        validation
      };
    }
  }

  /**
   * 批量创建引擎
   */
  static createBatch(configs: Array<{ dbType: DatabaseType; version: string }>): {
    engines: DatabaseQueryEngine[];
    failures: Array<{ dbType: DatabaseType; version: string; error: string }>;
  } {
    const engines: DatabaseQueryEngine[] = [];
    const failures: Array<{ dbType: DatabaseType; version: string; error: string }> = [];

    for (const config of configs) {
      try {
        const engine = this.create(config.dbType, config.version);
        engines.push(engine);
      } catch (error) {
        failures.push({
          dbType: config.dbType,
          version: config.version,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return { engines, failures };
  }

  /**
   * 获取引擎能力信息
   */
  static getEngineCapabilities(dbType: DatabaseType, version: string = 'latest'): {
    dbType: DatabaseType;
    version: string;
    capabilities: any;
    features: any;
  } | null {
    try {
      const engine = this.get(dbType, version) || this.create(dbType, version);
      const features = databaseRegistry.getFeatures(dbType, version);
      
      return {
        dbType,
        version,
        capabilities: engine.getCapabilities(),
        features: {
          hierarchy: features.hierarchy,
          nodeTypeMapping: features.nodeTypeMapping,
          defaultConfig: features.defaultConfig
        }
      };
    } catch (error) {
      logger.error(`获取引擎能力信息失败: ${dbType} v${version}`, error);
      return null;
    }
  }
}

// 导出工厂实例
export const queryEngineFactory = QueryEngineFactory;

// 导出默认实例
export default QueryEngineFactory;
