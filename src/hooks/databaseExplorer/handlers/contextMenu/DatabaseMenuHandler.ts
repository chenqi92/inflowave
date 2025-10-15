/**
 * DatabaseMenuHandler - 数据库节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';

export class DatabaseMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, database } = this.getMetadata(node);

    switch (action) {
      case 'open_database':
        this.openDatabase(connectionId, database);
        break;

      case 'close_database':
        this.closeDatabase(connectionId, database);
        break;

      case 'refresh_database':
        await this.handleRefresh(action, connectionId);
        break;

      case 'create_table':
      case 'create_measurement':
        await this.createMeasurement(connectionId, database);
        break;

      case 'show_tables':
        await this.showTables(connectionId, database);
        break;

      case 'query_management':
        this.openQueryManagement(connectionId, database);
        break;

      case 'database_info':
        this.showDatabaseInfo(connectionId, database);
        break;

      case 'manage_retention_policies':
        this.manageRetentionPolicies(connectionId, database);
        break;

      case 'export_metadata':
        await this.exportMetadata(connectionId, database);
        break;

      case 'copy_database_name':
        await this.copyToClipboard(database, action);
        break;

      case 'copy_use_statement':
        await this.copyUseStatement(database);
        break;

      case 'delete_database':
        await this.deleteDatabase(connectionId, database);
        break;

      default:
        console.warn(`未处理的数据库菜单动作: ${action}`);
    }
  }

  /**
   * 打开数据库
   */
  private openDatabase(connectionId: string, database: string): void {
    this.deps.openDatabase(connectionId, database);
    this.showSuccess('open_database', `已打开数据库 "${database}"`);
  }

  /**
   * 关闭数据库
   */
  private closeDatabase(connectionId: string, database: string): void {
    this.deps.closeDatabase(connectionId, database);
    this.showSuccess('close_database', `已关闭数据库 "${database}"`);
  }

  /**
   * 创建测量值/表
   */
  private async createMeasurement(connectionId: string, database: string): Promise<void> {
    try {
      const template = await this.invokeTauri<string>('create_measurement_template', {
        connectionId,
        database,
      });

      // 显示创建模板对话框
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        createMeasurement: {
          open: true,
          connectionId,
          database,
          template,
        },
      }));
    } catch (error) {
      this.showError('create_measurement', error);
    }
  }

  /**
   * 显示所有表
   */
  private async showTables(connectionId: string, database: string): Promise<void> {
    try {
      const tables = await this.invokeTauri<string[]>('show_measurements', {
        connectionId,
        database,
      });

      // 显示表列表对话框
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        tableList: {
          open: true,
          connectionId,
          database,
          tables,
        },
      }));
    } catch (error) {
      this.showError('show_tables', error);
    }
  }

  /**
   * 打开查询管理
   */
  private openQueryManagement(connectionId: string, database: string): void {
    // 切换到查询标签页并设置数据库
    this.deps.setDialogStates((prev: any) => ({
      ...prev,
      activeTab: 'query',
      queryContext: {
        connectionId,
        database,
      },
    }));
  }

  /**
   * 显示数据库信息
   */
  private showDatabaseInfo(connectionId: string, database: string): void {
    this.handleInfo('database_info', {
      connectionId,
      databaseName: database,
    });
  }

  /**
   * 管理保留策略
   */
  private manageRetentionPolicies(connectionId: string, database: string): void {
    this.handleInfo('retention_policy', {
      connectionId,
      databaseName: database,
    });
  }

  /**
   * 导出元数据
   */
  private async exportMetadata(connectionId: string, database: string): Promise<void> {
    await this.handleExport('export_metadata', 'export_database_metadata', {
      connectionId,
      database,
    });
  }

  /**
   * 复制 USE 语句
   */
  private async copyUseStatement(database: string): Promise<void> {
    const statement = this.generateSqlStatement('use', database);
    await this.copyToClipboard(statement, 'copy_use_statement');
  }

  /**
   * 删除数据库
   */
  private async deleteDatabase(connectionId: string, database: string): Promise<void> {
    await this.handleDelete(
      'delete_database',
      'drop_database',
      { connectionId, database },
      true
    );
  }
}

