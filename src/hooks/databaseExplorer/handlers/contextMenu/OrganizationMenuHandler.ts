/**
 * OrganizationMenuHandler - InfluxDB 2.x 组织节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';

export class OrganizationMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, organization } = this.getMetadata(node);

    switch (action) {
      case 'open_organization':
        this.openOrganization(connectionId, organization);
        break;

      case 'close_organization':
        this.closeOrganization(connectionId, organization);
        break;

      case 'refresh_organization':
        await this.handleRefresh(action, connectionId);
        break;

      case 'organization_info':
        await this.showOrganizationInfo(connectionId, organization);
        break;

      case 'copy_organization_name':
        await this.copyToClipboard(organization, action);
        break;

      case 'create_bucket':
        this.openCreateBucketDialog(connectionId, organization);
        break;

      default:
        console.warn(`未处理的组织菜单动作: ${action}`);
    }
  }

  /**
   * 打开组织
   */
  private openOrganization(connectionId: string, organization: string): void {
    const { openOrganization } = useOpenedDatabasesStore.getState();
    openOrganization(connectionId, organization);
    this.showSuccess('open_organization', `已打开 Organization "${organization}"`);
  }

  /**
   * 关闭组织
   */
  private closeOrganization(connectionId: string, organization: string): void {
    const { closeOrganization } = useOpenedDatabasesStore.getState();
    closeOrganization(connectionId, organization);
    this.showSuccess('close_organization', `已关闭 Organization "${organization}"`);
  }

  /**
   * 显示组织信息
   */
  private async showOrganizationInfo(connectionId: string, organization: string): Promise<void> {
    try {
      const orgInfo = await this.invokeTauri<any>('get_organization_info', {
        connectionId,
        orgName: organization,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        organizationInfo: {
          open: true,
          connectionId,
          organization,
          data: orgInfo,
        },
      }));
    } catch (error) {
      this.showError('organization_info', error);
    }
  }

  /**
   * 打开创建存储桶对话框
   * 复用 create_database 对话框，它已经支持 InfluxDB 2.x 的 Bucket 创建
   */
  private openCreateBucketDialog(connectionId: string, organization: string): void {
    // 将组织信息存储到元数据中，供对话框使用
    this.deps.setDialogStates((prev: any) => ({
      ...prev,
      create_database: {
        open: true,
        connectionId,
        metadata: {
          organization,
        },
      },
    }));
  }
}

