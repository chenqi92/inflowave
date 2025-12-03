/**
 * TableMenuHandler - 表/测量节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import logger from '@/utils/logger';

export class TableMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, database, table } = this.getMetadata(node);

    switch (action) {
      case 'view_table_data':
        await this.viewTableData(connectionId, database, table);
        break;

      case 'query_table':
        await this.queryTable(connectionId, database, table);
        break;

      case 'query_builder':
        await this.openQueryBuilder(connectionId, database, table);
        break;

      case 'refresh_table':
        await this.handleRefresh(action, connectionId);
        break;

      case 'generate_select_query':
        await this.generateQuery(connectionId, database, table, 'select');
        break;

      case 'generate_count_query':
        await this.generateQuery(connectionId, database, table, 'count');
        break;

      case 'generate_recent_query':
        await this.generateQuery(connectionId, database, table, 'recent');
        break;

      case 'generate_aggregate_query':
        await this.generateQuery(connectionId, database, table, 'aggregate');
        break;

      case 'table_statistics':
        await this.showTableStatistics(connectionId, database, table);
        break;

      case 'data_preview':
        await this.showDataPreview(connectionId, database, table);
        break;

      case 'table_info':
        this.showTableInfo(connectionId, database, table);
        break;

      case 'edit_table':
      case 'table_designer':
        this.openTableDesigner(connectionId, database, table);
        break;

      case 'export_table_data':
        await this.exportTableData(connectionId, database, table);
        break;

      case 'import_table_data':
        await this.importTableData(connectionId, database, table);
        break;

      case 'add_favorite':
        this.handleFavorite(node, true);
        break;

      case 'remove_favorite':
        this.handleFavorite(node, false);
        break;

      case 'copy_table_name':
        await this.copyToClipboard(table, action);
        break;

      case 'copy_select_statement':
        await this.copySelectStatement(database, table);
        break;

      case 'delete_table':
        await this.deleteTable(connectionId, database, table);
        break;

      default:
        logger.warn(`未处理的表菜单动作: ${action}`);
    }
  }

  /**
   * 查看表数据（打开数据浏览器tab）
   */
  private async viewTableData(connectionId: string, database: string, table: string): Promise<void> {
    try {
      // 调用数据浏览器回调（类似双击表的行为）
      if (this.deps.onCreateDataBrowserTab) {
        this.deps.onCreateDataBrowserTab(connectionId, database, table);
        this.showSuccess('view_table_data', `正在打开表 "${table}" 的数据浏览器`);
      } else {
        // 如果没有数据浏览器回调，降级为查询tab
        await this.generateAndExecuteQuery(connectionId, database, table, 'select');
        this.showSuccess('view_table_data', `正在查询表 "${table}"`);
      }
    } catch (error) {
      this.showError('view_table_data', error);
    }
  }

  /**
   * 查询表数据（创建查询tab）
   */
  private async queryTable(connectionId: string, database: string, table: string): Promise<void> {
    try {
      await this.generateAndExecuteQuery(connectionId, database, table, 'select');
      this.showSuccess('query_table', `正在查询表 "${table}"`);
    } catch (error) {
      this.showError('query_table', error);
    }
  }

  /**
   * 打开查询构建器
   */
  private async openQueryBuilder(connectionId: string, database: string, table: string): Promise<void> {
    try {
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        queryBuilder: {
          open: true,
          connectionId,
          database,
          table,
        },
      }));
    } catch (error) {
      this.showError('query_builder', error);
    }
  }

  /**
   * 生成查询
   */
  private async generateQuery(
    connectionId: string,
    database: string,
    table: string,
    type: 'select' | 'count' | 'recent' | 'aggregate'
  ): Promise<void> {
    try {
      let query = '';

      switch (type) {
        case 'select':
          query = this.generateSqlStatement('select', database, table);
          break;
        case 'count':
          query = this.generateSqlStatement('count', database, table);
          break;
        case 'recent':
          // InfluxDB 1.x: 只使用 measurement 名称，不加 database 前缀
          query = `SELECT * FROM "${table}" WHERE time > now() - 1h ORDER BY time DESC LIMIT 1000;`;
          break;
        case 'aggregate':
          // InfluxDB 1.x: 只使用 measurement 名称，不加 database 前缀
          query = `SELECT MEAN(*) FROM "${table}" WHERE time > now() - 1h GROUP BY time(1m);`;
          break;
      }

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, database, connectionId);
      }

      await this.copyToClipboard(query, `generate_${type}_query` as ContextMenuAction);
    } catch (error) {
      this.showError(`generate_${type}_query` as ContextMenuAction, error);
    }
  }

  /**
   * 显示表统计信息
   */
  private async showTableStatistics(connectionId: string, database: string, table: string): Promise<void> {
    try {
      const stats = await this.invokeTauri<any>('get_table_statistics', {
        connectionId,
        database,
        table,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        tableStatistics: {
          open: true,
          connectionId,
          database,
          table,
          stats,
        },
      }));
    } catch (error) {
      this.showError('table_statistics', error);
    }
  }

  /**
   * 显示数据预览
   */
  private async showDataPreview(connectionId: string, database: string, table: string): Promise<void> {
    try {
      const preview = await this.invokeTauri<any>('preview_table_data', {
        connectionId,
        database,
        table,
        limit: 100,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        dataPreview: {
          open: true,
          connectionId,
          database,
          table,
          data: preview,
        },
      }));
    } catch (error) {
      this.showError('data_preview', error);
    }
  }

  /**
   * 显示表信息
   */
  private showTableInfo(connectionId: string, database: string, table: string): void {
    this.deps.openDialog('info', connectionId, database, table);
  }

  /**
   * 打开表设计器
   */
  private openTableDesigner(connectionId: string, database: string, table: string): void {
    this.deps.openDialog('designer', connectionId, database, table);
  }

  /**
   * 导出表数据
   */
  private async exportTableData(connectionId: string, database: string, table: string): Promise<void> {
    try {
      // 获取连接信息以确定数据库类型
      const connection = this.deps.getConnection(connectionId);
      const dbType = connection?.dbType || 'influxdb';

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        exportData: {
          open: true,
          connectionId,
          database,
          table,
          dbType,
        },
      }));
    } catch (error) {
      this.showError('export_table_data', error);
    }
  }

  /**
   * 导入表数据
   */
  private async importTableData(connectionId: string, database: string, table: string): Promise<void> {
    try {
      // 获取连接信息以确定数据库类型
      const connection = this.deps.getConnection(connectionId);
      const dbType = connection?.dbType || 'influxdb';

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        importData: {
          open: true,
          connectionId,
          database,
          table,
          dbType,
        },
      }));
    } catch (error) {
      this.showError('import_table_data', error);
    }
  }

  /**
   * 复制 SELECT 语句
   */
  private async copySelectStatement(database: string, table: string): Promise<void> {
    const statement = this.generateSqlStatement('select', database, table);
    await this.copyToClipboard(statement, 'copy_select_statement');
  }

  /**
   * 删除表
   */
  private async deleteTable(connectionId: string, database: string, table: string): Promise<void> {
    // 删除表后，刷新数据库节点以更新表列表
    const databaseNodeId = `db_${database}`;
    await this.handleDelete(
      'delete_table',
      'drop_measurement',
      { connectionId, database, measurement: table },
      true,
      databaseNodeId
    );
  }
}

