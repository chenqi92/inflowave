/**
 * ConnectionMenuHandler - 连接节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import logger from '@/utils/logger';

export class ConnectionMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId } = this.getMetadata(node);
    const connection = this.deps.getConnection(connectionId);

    if (!connection) {
      this.showError(action, new Error('连接不存在'));
      return;
    }

    switch (action) {
      case 'test_connection':
        await this.testConnection(connectionId);
        break;

      case 'refresh_connection':
        await this.handleRefresh(action, connectionId);
        break;

      case 'create_database':
        // 只有 InfluxDB 1.x 支持创建数据库
        if (this.isInfluxDB1x(connection)) {
          this.openDialog('create_database', true);
        } else {
          this.showError(action, new Error('当前数据库版本不支持创建数据库操作'));
        }
        break;

      case 'connection_info':
        await this.showConnectionInfo(connectionId, connection);
        break;

      case 'connection_properties':
        this.deps.handleOpenConnectionDialog(connection);
        break;

      case 'copy_connection_name':
        await this.copyToClipboard(node.name, action);
        break;

      case 'disconnect':
        await this.disconnect(connectionId, node.name);
        break;

      case 'delete_connection':
        await this.deleteConnection(connectionId, node.name);
        break;

      case 'manage_templates':
        await this.manageTemplates(connectionId);
        break;

      default:
        logger.warn(`未处理的连接菜单动作: ${action}`);
    }
  }

  /**
   * 检查是否为 InfluxDB 1.x
   */
  private isInfluxDB1x(connection: any): boolean {
    return connection.dbType === 'influxdb' && connection.version === '1.x';
  }

  /**
   * 检查是否为 InfluxDB 2.x
   */
  private isInfluxDB2x(connection: any): boolean {
    return connection.dbType === 'influxdb' && connection.version === '2.x';
  }

  /**
   * 检查是否为 InfluxDB 3.x
   */
  private isInfluxDB3x(connection: any): boolean {
    return connection.dbType === 'influxdb' && connection.version === '3.x';
  }

  /**
   * 检查是否为 IoTDB
   */
  private isIoTDB(connection: any): boolean {
    return connection.dbType === 'iotdb';
  }

  /**
   * 管理 IoTDB 模板
   */
  private async manageTemplates(connectionId: string): Promise<void> {
    try {
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        iotdbTemplate: {
          open: true,
          connectionId,
          mode: 'list',
        },
      }));
    } catch (error) {
      this.showError('manage_templates', error);
    }
  }

  /**
   * 测试连接
   */
  private async testConnection(connectionId: string): Promise<void> {
    try {
      this.deps.setLoading(true);
      const result = await this.invokeTauri<{ success: boolean; message: string }>(
        'test_connection',
        { connectionId }
      );

      if (result.success) {
        this.showSuccess('test_connection', result.message || '连接测试成功');
      } else {
        this.showError('test_connection', new Error(result.message || '连接测试失败'));
      }
    } catch (error) {
      this.showError('test_connection', error);
    } finally {
      this.deps.setLoading(false);
    }
  }

  /**
   * 显示连接信息
   */
  private async showConnectionInfo(connectionId: string, connection: any): Promise<void> {
    try {
      // 获取连接详细信息
      const info = await this.invokeTauri<any>('get_connection_info', { connectionId });

      // 打开连接信息对话框
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        connectionInfo: {
          open: true,
          connectionId,
          connection,
          info,
        },
      }));
    } catch (error) {
      this.showError('connection_info', error);
    }
  }

  /**
   * 断开连接
   */
  private async disconnect(connectionId: string, connectionName: string): Promise<void> {
    const confirmed = await this.confirm(
      'disconnect',
      `确定要断开连接 "${connectionName}" 吗？`
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.deps.disconnectFromDatabase(connectionId);
      this.showSuccess('disconnect', `已断开连接 "${connectionName}"`);
      await this.refreshTree(true);
    } catch (error) {
      this.showError('disconnect', error);
    }
  }

  /**
   * 删除连接
   */
  private async deleteConnection(connectionId: string, connectionName: string): Promise<void> {
    const confirmed = await this.confirm(
      'delete_connection',
      `确定要删除连接 "${connectionName}" 吗？此操作不可撤销！`
    );

    if (!confirmed) {
      return;
    }

    try {
      // 如果连接已连接，先断开
      if (this.deps.isConnectionConnected(connectionId)) {
        await this.deps.disconnectFromDatabase(connectionId);
      }

      // 删除连接
      this.deps.removeConnection(connectionId);
      this.showSuccess('delete_connection', `连接 "${connectionName}" 已删除`);
      await this.refreshTree(true);
    } catch (error) {
      this.showError('delete_connection', error);
    }
  }
}

