/**
 * 上下文菜单处理器统一入口
 * 
 * 提供统一的菜单处理器工厂和处理逻辑
 */

import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import { TreeNodeType } from '@/types/tree';
import { BaseMenuHandler, type MenuHandlerDependencies } from './BaseMenuHandler';
import { ConnectionMenuHandler } from './ConnectionMenuHandler';
import { DatabaseMenuHandler } from './DatabaseMenuHandler';
import { TableMenuHandler } from './TableMenuHandler';
import { FieldMenuHandler, TagMenuHandler } from './FieldMenuHandler';
import { DeviceMenuHandler, TimeseriesMenuHandler, TemplateMenuHandler } from './IoTDBMenuHandler';
import { OrganizationMenuHandler } from './OrganizationMenuHandler';
import { BucketMenuHandler } from './BucketMenuHandler';

/**
 * 通用菜单处理器 - 处理简单的通用操作
 */
class GenericMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId } = this.getMetadata(node);

    switch (action) {
      case 'refresh':
      case 'refresh_fields':
      case 'refresh_tags':
      case 'refresh_organization':
        await this.handleRefresh(action, connectionId);
        break;

      case 'copy_name':
      case 'copy_policy_name':
      case 'copy_organization_name':
        await this.copyToClipboard(node.name, action);
        break;

      case 'show_all_fields':
      case 'show_all_tags':
        await this.showAllItems(action, node);
        break;

      case 'view_retention_policy':
      case 'edit_retention_policy':
        await this.handleRetentionPolicy(action, node);
        break;

      case 'delete_retention_policy':
        await this.deleteRetentionPolicy(node);
        break;

      case 'organization_info':
        await this.showOrganizationInfo(node);
        break;

      default:
        console.warn(`未处理的通用菜单动作: ${action}`);
    }
  }

  private async showAllItems(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, database, table } = this.getMetadata(node);
    const itemType = action === 'show_all_fields' ? 'fields' : 'tags';

    try {
      const items = await this.invokeTauri<string[]>(`show_${itemType}`, {
        connectionId,
        database,
        table,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        [`${itemType}List`]: {
          open: true,
          connectionId,
          database,
          table,
          items,
        },
      }));
    } catch (error) {
      this.showError(action, error);
    }
  }

  private async handleRetentionPolicy(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const database = metadata.database || '';
    const policyName = metadata.policyName || node.name;

    try {
      // 获取策略详情
      const policy = await this.invokeTauri<any>('get_retention_policy', {
        connectionId,
        database,
        policyName,
      });

      if (action === 'view_retention_policy') {
        // 查看策略：使用编辑对话框但设置为只读模式
        this.handleInfo('retention_policy', {
          connectionId,
          database,  // 使用 database 而不是 databaseName
          policyName,
          policy,
          mode: 'view',  // 添加 view 模式
        });
      } else if (action === 'edit_retention_policy') {
        // 编辑策略时也需要传递策略详情
        this.handleInfo('retention_policy', {
          connectionId,
          database,  // 修复：使用 database 而不是 databaseName
          policyName,
          policy, // 传递策略详情用于回填
          mode: 'edit',
        });
      } else {
        this.handleInfo('retention_policy', {
          connectionId,
          database,  // 修复：使用 database 而不是 databaseName
          policyName,
        });
      }
    } catch (error) {
      this.showError(action, error);
    }
  }

  private async deleteRetentionPolicy(node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const database = metadata.database || '';
    const policyName = metadata.policyName || node.name;

    // 构造数据库节点 ID，用于局部刷新
    const databaseNodeId = `db_${database}`;

    await this.handleDelete(
      'delete_retention_policy',
      'drop_retention_policy',
      { connectionId, database, policyName },
      true,
      databaseNodeId
    );
  }

  private async showOrganizationInfo(node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const organizationId = metadata.organizationId || node.name;

    try {
      const info = await this.invokeTauri<any>('get_organization_info', {
        connectionId,
        organizationId,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        organizationInfo: {
          open: true,
          connectionId,
          organizationId,
          info,
        },
      }));
    } catch (error) {
      this.showError('organization_info', error);
    }
  }
}

/**
 * 菜单处理器工厂
 */
export class ContextMenuHandlerFactory {
  private handlers: Map<string, BaseMenuHandler>;
  private genericHandler: GenericMenuHandler;

  constructor(deps: MenuHandlerDependencies) {
    this.handlers = new Map();
    this.genericHandler = new GenericMenuHandler(deps);

    // 注册所有处理器
    this.registerHandler('connection', new ConnectionMenuHandler(deps));
    this.registerHandler('database', new DatabaseMenuHandler(deps));
    this.registerHandler('organization', new OrganizationMenuHandler(deps));
    this.registerHandler('bucket', new BucketMenuHandler(deps));
    this.registerHandler('table', new TableMenuHandler(deps));
    this.registerHandler('field', new FieldMenuHandler(deps));
    this.registerHandler('tag', new TagMenuHandler(deps));
    this.registerHandler('device', new DeviceMenuHandler(deps));
    this.registerHandler('timeseries', new TimeseriesMenuHandler(deps));
    this.registerHandler('template', new TemplateMenuHandler(deps));
  }

  private registerHandler(type: string, handler: BaseMenuHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * 根据节点类型获取对应的处理器
   */
  private getHandlerForNodeType(nodeType: TreeNodeType): BaseMenuHandler {
    // 连接节点
    if (nodeType === 'connection') {
      return this.handlers.get('connection')!;
    }

    // InfluxDB 2.x 组织节点
    if (nodeType === 'organization') {
      return this.handlers.get('organization')!;
    }

    // InfluxDB 2.x 存储桶节点
    if (nodeType === 'bucket') {
      return this.handlers.get('bucket')!;
    }

    // 数据库节点（InfluxDB 1.x 和 IoTDB 存储组）
    if (
      nodeType === 'database' ||
      nodeType === 'storage_group'
    ) {
      return this.handlers.get('database')!;
    }

    // 表/测量节点
    if (
      nodeType === 'table' ||
      nodeType === 'measurement' ||
      nodeType === 'device'
    ) {
      // IoTDB 设备节点使用专门的处理器
      if (nodeType === 'device') {
        return this.handlers.get('device')!;
      }
      return this.handlers.get('table')!;
    }

    // 字段节点
    if (
      nodeType === 'field' ||
      nodeType === 'field_group'
    ) {
      return this.handlers.get('field')!;
    }

    // 标签节点
    if (
      nodeType === 'tag' ||
      nodeType === 'tag_group'
    ) {
      return this.handlers.get('tag')!;
    }

    // IoTDB 时间序列节点
    if (nodeType === 'timeseries') {
      return this.handlers.get('timeseries')!;
    }

    // IoTDB 模板节点
    if (nodeType === 'template') {
      return this.handlers.get('template')!;
    }

    // 其他节点使用通用处理器
    return this.genericHandler;
  }

  /**
   * 处理菜单动作
   */
  async handleAction(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const handler = this.getHandlerForNodeType(node.nodeType);
    await handler.handle(action, node);
  }
}

/**
 * 创建上下文菜单处理器工厂
 */
export function createContextMenuHandlerFactory(
  deps: MenuHandlerDependencies
): ContextMenuHandlerFactory {
  return new ContextMenuHandlerFactory(deps);
}

// 导出所有处理器类型
export type {
  MenuHandlerDependencies,
};

export {
  BaseMenuHandler,
  ConnectionMenuHandler,
  DatabaseMenuHandler,
  TableMenuHandler,
  FieldMenuHandler,
  TagMenuHandler,
  DeviceMenuHandler,
  TimeseriesMenuHandler,
  TemplateMenuHandler,
  GenericMenuHandler,
};

