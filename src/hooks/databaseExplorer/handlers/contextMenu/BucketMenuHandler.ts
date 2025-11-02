/**
 * BucketMenuHandler - InfluxDB 2.x 存储桶节点菜单处理器
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';

export class BucketMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const { connectionId, bucket, organization } = this.getMetadata(node);

    switch (action) {
      case 'open_bucket':
        this.openBucket(connectionId, organization, bucket);
        break;

      case 'close_bucket':
        this.closeBucket(connectionId, organization, bucket);
        break;

      case 'refresh_bucket':
        await this.handleRefresh(action, connectionId);
        break;

      case 'bucket_info':
        await this.showBucketInfo(connectionId, bucket);
        break;

      case 'update_bucket_retention':
        await this.updateBucketRetention(connectionId, bucket);
        break;

      case 'copy_bucket_name':
        await this.copyToClipboard(bucket, action);
        break;

      case 'delete_bucket':
        await this.deleteBucket(connectionId, bucket);
        break;

      default:
        console.warn(`未处理的存储桶菜单动作: ${action}`);
    }
  }

  /**
   * 打开 Bucket
   */
  private openBucket(connectionId: string, organization: string, bucket: string): void {
    const { openBucket } = useOpenedDatabasesStore.getState();
    openBucket(connectionId, organization, bucket);
    this.showSuccess('open_bucket', `已打开 Bucket "${bucket}"`);
  }

  /**
   * 关闭 Bucket
   */
  private closeBucket(connectionId: string, organization: string, bucket: string): void {
    const { closeBucket } = useOpenedDatabasesStore.getState();
    closeBucket(connectionId, organization, bucket);
    this.showSuccess('close_bucket', `已关闭 Bucket "${bucket}"`);
  }

  /**
   * 显示存储桶信息
   */
  private async showBucketInfo(connectionId: string, bucket: string): Promise<void> {
    try {
      const bucketInfo = await this.invokeTauri<any>('get_bucket_info', {
        connectionId,
        bucketName: bucket,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        bucketInfo: {
          open: true,
          connectionId,
          bucket,
          data: bucketInfo,
        },
      }));
    } catch (error) {
      this.showError('bucket_info', error);
    }
  }

  /**
   * 更新存储桶保留策略
   */
  private async updateBucketRetention(connectionId: string, bucket: string): Promise<void> {
    try {
      // 先获取当前存储桶信息
      const bucketInfo = await this.invokeTauri<any>('get_bucket_info', {
        connectionId,
        bucketName: bucket,
      });

      // 打开保留策略编辑对话框
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        updateBucketRetention: {
          open: true,
          connectionId,
          bucket,
          currentRetention: bucketInfo.retention_period,
        },
      }));
    } catch (error) {
      this.showError('update_bucket_retention', error);
    }
  }

  /**
   * 删除存储桶
   */
  private async deleteBucket(connectionId: string, bucket: string): Promise<void> {
    const confirmed = await this.confirm(
      'delete_bucket',
      `确定要删除存储桶 "${bucket}" 吗？此操作将删除所有数据且不可撤销！`
    );

    if (!confirmed) {
      return;
    }

    try {
      // 先获取存储桶信息以获取 ID
      const bucketInfo = await this.invokeTauri<any>('get_bucket_info', {
        connectionId,
        bucketName: bucket,
      });

      // 删除存储桶
      await this.invokeTauri('delete_influxdb2_bucket', {
        connectionId,
        bucketId: bucketInfo.id,
      });

      this.showSuccess('delete_bucket', `存储桶 "${bucket}" 已删除`);
      await this.refreshTree(true);
    } catch (error) {
      this.showError('delete_bucket', error);
    }
  }
}

