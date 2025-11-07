/**
 * FieldMenuHandler - 字段节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import logger from '@/utils/logger';

export class FieldMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, database, table, field } = this.getMetadata(node);

    switch (action) {
      case 'query_field':
        await this.queryField(connectionId, database, table, field);
        break;

      case 'field_details':
        await this.showFieldDetails(connectionId, database, table, field);
        break;

      case 'field_max':
      case 'field_min':
      case 'field_avg':
      case 'field_sum':
      case 'field_count':
        await this.executeAggregateFunction(connectionId, database, table, field, action);
        break;

      case 'field_stats':
        await this.showFieldStatistics(connectionId, database, table, field);
        break;

      case 'field_distribution':
        await this.showFieldDistribution(connectionId, database, table, field);
        break;

      case 'copy_field_name':
        await this.copyToClipboard(field, action);
        break;

      default:
        logger.warn(`未处理的字段菜单动作: ${action}`);
    }
  }

  /**
   * 查询字段
   */
  private async queryField(
    connectionId: string,
    database: string,
    table: string,
    field: string
  ): Promise<void> {
    try {
      const query = `SELECT "${field}" FROM "${database}"."${table}" LIMIT 1000;`;
      
      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess('query_field', `正在查询字段 "${field}"`);
    } catch (error) {
      this.showError('query_field', error);
    }
  }

  /**
   * 显示字段详情
   */
  private async showFieldDetails(
    connectionId: string,
    database: string,
    table: string,
    field: string
  ): Promise<void> {
    try {
      const details = await this.invokeTauri<any>('get_field_details', {
        connectionId,
        database,
        table,
        field,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        fieldDetails: {
          open: true,
          connectionId,
          database,
          table,
          field,
          details,
        },
      }));
    } catch (error) {
      this.showError('field_details', error);
    }
  }

  /**
   * 执行聚合函数
   */
  private async executeAggregateFunction(
    connectionId: string,
    database: string,
    table: string,
    field: string,
    action: ContextMenuAction
  ): Promise<void> {
    try {
      const functionMap: Record<string, string> = {
        field_max: 'MAX',
        field_min: 'MIN',
        field_avg: 'MEAN',
        field_sum: 'SUM',
        field_count: 'COUNT',
      };

      const func = functionMap[action];
      const query = `SELECT ${func}("${field}") FROM "${database}"."${table}";`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess(action, `正在计算 ${func}("${field}")`);
    } catch (error) {
      this.showError(action, error);
    }
  }

  /**
   * 显示字段统计信息
   */
  private async showFieldStatistics(
    connectionId: string,
    database: string,
    table: string,
    field: string
  ): Promise<void> {
    try {
      const stats = await this.invokeTauri<any>('get_field_statistics', {
        connectionId,
        database,
        table,
        field,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        fieldStatistics: {
          open: true,
          connectionId,
          database,
          table,
          field,
          stats,
        },
      }));
    } catch (error) {
      this.showError('field_stats', error);
    }
  }

  /**
   * 显示字段数值分布
   */
  private async showFieldDistribution(
    connectionId: string,
    database: string,
    table: string,
    field: string
  ): Promise<void> {
    try {
      const distribution = await this.invokeTauri<any>('get_field_distribution', {
        connectionId,
        database,
        table,
        field,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        fieldDistribution: {
          open: true,
          connectionId,
          database,
          table,
          field,
          distribution,
        },
      }));
    } catch (error) {
      this.showError('field_distribution', error);
    }
  }
}

/**
 * TagMenuHandler - 标签节点菜单处理器
 */
export class TagMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, database, table, tag } = this.getMetadata(node);

    switch (action) {
      case 'query_tag':
        await this.queryTag(connectionId, database, table, tag);
        break;

      case 'tag_details':
        await this.showTagDetails(connectionId, database, table, tag);
        break;

      case 'tag_values':
        await this.showTagValues(connectionId, database, table, tag);
        break;

      case 'tag_cardinality':
        await this.showTagCardinality(connectionId, database, table, tag);
        break;

      case 'tag_distribution':
        await this.showTagDistribution(connectionId, database, table, tag);
        break;

      case 'generate_filter_query':
        await this.generateFilterQuery(connectionId, database, table, tag);
        break;

      case 'copy_tag_name':
        await this.copyToClipboard(tag, action);
        break;

      default:
        logger.warn(`未处理的标签菜单动作: ${action}`);
    }
  }

  /**
   * 查询标签
   */
  private async queryTag(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const query = `SELECT * FROM "${database}"."${table}" WHERE "${tag}" != '' LIMIT 1000;`;
      
      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess('query_tag', `正在查询标签 "${tag}"`);
    } catch (error) {
      this.showError('query_tag', error);
    }
  }

  /**
   * 显示标签详情
   */
  private async showTagDetails(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const details = await this.invokeTauri<any>('get_tag_details', {
        connectionId,
        database,
        table,
        tag,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        tagDetails: {
          open: true,
          connectionId,
          database,
          table,
          tag,
          details,
        },
      }));
    } catch (error) {
      this.showError('tag_details', error);
    }
  }

  /**
   * 显示标签所有值
   */
  private async showTagValues(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const values = await this.invokeTauri<string[]>('get_tag_values', {
        connectionId,
        database,
        table,
        tag,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        tagValues: {
          open: true,
          connectionId,
          database,
          table,
          tag,
          values,
        },
      }));
    } catch (error) {
      this.showError('tag_values', error);
    }
  }

  /**
   * 显示标签基数
   */
  private async showTagCardinality(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const cardinality = await this.invokeTauri<number>('get_tag_cardinality', {
        connectionId,
        database,
        table,
        tag,
      });

      this.showSuccess('tag_cardinality', `标签 "${tag}" 的基数为 ${cardinality}`);
    } catch (error) {
      this.showError('tag_cardinality', error);
    }
  }

  /**
   * 显示标签值分布
   */
  private async showTagDistribution(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const distribution = await this.invokeTauri<any>('get_tag_distribution', {
        connectionId,
        database,
        table,
        tag,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        tagDistribution: {
          open: true,
          connectionId,
          database,
          table,
          tag,
          distribution,
        },
      }));
    } catch (error) {
      this.showError('tag_distribution', error);
    }
  }

  /**
   * 生成筛选查询
   */
  private async generateFilterQuery(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      const query = `SELECT * FROM "${database}"."${table}" WHERE "${tag}" = '<value>' LIMIT 1000;`;
      await this.copyToClipboard(query, 'generate_filter_query');
    } catch (error) {
      this.showError('generate_filter_query', error);
    }
  }
}

