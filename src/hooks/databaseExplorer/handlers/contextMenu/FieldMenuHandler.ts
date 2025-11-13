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

      case 'field_max':
      case 'field_min':
      case 'field_avg':
      case 'field_sum':
      case 'field_count':
        await this.executeAggregateFunction(connectionId, database, table, field, action);
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
      // InfluxDB 1.x 正确语法：SELECT "field" FROM "measurement" WHERE time > now() - 1h LIMIT 1000
      const query = `SELECT "${field}" FROM "${table}" WHERE time > now() - 1h LIMIT 1000`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess('query_field', `正在查询字段 "${field}"`);
    } catch (error) {
      this.showError('query_field', error);
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
      // InfluxDB 1.x 正确语法：SELECT MAX("field") FROM "measurement" WHERE time > now() - 1h
      const query = `SELECT ${func}("${field}") FROM "${table}" WHERE time > now() - 1h`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess(action, `正在计算 ${func}("${field}")`);
    } catch (error) {
      this.showError(action, error);
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

      case 'tag_values':
        await this.showTagValues(connectionId, database, table, tag);
        break;

      case 'tag_cardinality':
        await this.showTagCardinality(connectionId, database, table, tag);
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
      // InfluxDB 1.x 正确语法：SELECT * FROM "measurement" WHERE "tag" != '' AND time > now() - 1h LIMIT 1000
      const query = `SELECT * FROM "${table}" WHERE "${tag}" != '' AND time > now() - 1h LIMIT 1000`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      this.showSuccess('query_tag', `正在查询标签 "${tag}"`);
    } catch (error) {
      this.showError('query_tag', error);
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
      // 后端命令参数名是 tagKey 而不是 tag
      const values = await this.invokeTauri<string[]>('get_tag_values', {
        connectionId,
        database,
        tagKey: tag,
        measurement: table,
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
   * 生成筛选查询
   */
  private async generateFilterQuery(
    connectionId: string,
    database: string,
    table: string,
    tag: string
  ): Promise<void> {
    try {
      // InfluxDB 1.x 正确语法：SELECT * FROM "measurement" WHERE "tag" = '<value>' AND time > now() - 1h LIMIT 1000
      const query = `SELECT * FROM "${table}" WHERE "${tag}" = '<value>' AND time > now() - 1h LIMIT 1000`;
      await this.copyToClipboard(query, 'generate_filter_query');
    } catch (error) {
      this.showError('generate_filter_query', error);
    }
  }
}

