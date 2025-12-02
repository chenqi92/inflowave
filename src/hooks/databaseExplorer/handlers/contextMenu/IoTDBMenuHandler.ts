/**
 * IoTDBMenuHandler - IoTDB 相关节点菜单处理器
 * 包括设备、时间序列、模板等节点的处理
 */

import { BaseMenuHandler } from './BaseMenuHandler';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction } from '@/types/contextMenu';
import logger from '@/utils/logger';
import { tNs } from '@/i18n/translate';

/**
 * 设备节点菜单处理器
 */
export class DeviceMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const devicePath = metadata.devicePath || node.name;

    switch (action) {
      case 'view_device_data':
        await this.viewDeviceData(connectionId, devicePath);
        break;

      case 'refresh_device':
        await this.handleRefresh(action, connectionId);
        break;

      case 'create_timeseries':
        await this.createTimeseries(connectionId, devicePath);
        break;

      case 'show_timeseries':
        await this.showTimeseries(connectionId, devicePath);
        break;

      case 'device_info':
        await this.showDeviceInfo(connectionId, devicePath);
        break;

      case 'copy_device_name':
        await this.copyToClipboard(devicePath, action);
        break;

      case 'delete_device':
        await this.deleteDevice(connectionId, devicePath);
        break;

      case 'mount_template_to_device':
        await this.mountTemplateToDevice(connectionId, devicePath);
        break;

      default:
        logger.warn(`未处理的设备菜单动作: ${action}`);
    }
  }

  private async mountTemplateToDevice(connectionId: string, devicePath: string): Promise<void> {
    try {
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        iotdbTemplate: {
          open: true,
          connectionId,
          mode: 'mount',
          devicePath,
        },
      }));
    } catch (error) {
      this.showError('mount_template_to_device', error);
    }
  }

  private async viewDeviceData(connectionId: string, devicePath: string): Promise<void> {
    try {
      // IoTDB 使用完整路径，不需要单独的数据库参数
      // 但是为了兼容性，我们从设备路径中提取存储组
      const parts = devicePath.split('.');
      const storageGroup = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : '';

      // IoTDB 的 SELECT * 会自动包含 time 列
      const query = `SELECT * FROM ${devicePath} LIMIT 1000;`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, storageGroup, connectionId);
      }

      this.showSuccess('view_device_data', tNs('menu', 'iotdb_messages.querying_device_data', { devicePath }));
    } catch (error) {
      this.showError('view_device_data', error);
    }
  }

  private async createTimeseries(connectionId: string, devicePath: string): Promise<void> {
    try {
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        createTimeseries: {
          open: true,
          connectionId,
          devicePath,
        },
      }));
    } catch (error) {
      this.showError('create_timeseries', error);
    }
  }

  private async showTimeseries(connectionId: string, devicePath: string): Promise<void> {
    try {
      // IoTDB 设备路径格式: root.storage_group.device
      // 需要拆分成 storage_group 和 device
      const parts = devicePath.split('.');
      if (parts.length < 3) {
        throw new Error(`无效的设备路径: ${devicePath}`);
      }

      // 存储组是前两段: root.storage_group
      const storageGroup = `${parts[0]}.${parts[1]}`;
      // 设备是完整路径
      const device = devicePath;

      const timeseries = await this.invokeTauri<string[]>('get_iotdb_timeseries', {
        connectionId,
        storageGroup,
        device,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        timeseriesList: {
          open: true,
          connectionId,
          devicePath,
          timeseries,
        },
      }));
    } catch (error) {
      this.showError('show_timeseries', error);
    }
  }

  private async showDeviceInfo(connectionId: string, devicePath: string): Promise<void> {
    try {
      const info = await this.invokeTauri<any>('get_iotdb_device_info', {
        connectionId,
        devicePath,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        deviceInfo: {
          open: true,
          connectionId,
          devicePath,
          info,
        },
      }));
    } catch (error) {
      this.showError('device_info', error);
    }
  }

  private async deleteDevice(connectionId: string, devicePath: string): Promise<void> {
    await this.handleDelete(
      'delete_device',
      'delete_storage_group',
      { connectionId, path: devicePath },
      true
    );
  }
}

/**
 * 时间序列节点菜单处理器
 */
export class TimeseriesMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const timeseriesPath = metadata.timeseriesPath || node.name;

    switch (action) {
      case 'query_timeseries':
        await this.queryTimeseries(connectionId, timeseriesPath);
        break;

      case 'timeseries_info':
        await this.showTimeseriesInfo(connectionId, timeseriesPath);
        break;

      case 'timeseries_stats':
        await this.showTimeseriesStats(connectionId, timeseriesPath);
        break;

      case 'copy_timeseries_name':
        await this.copyToClipboard(timeseriesPath, action);
        break;

      case 'delete_timeseries':
        await this.deleteTimeseries(connectionId, timeseriesPath);
        break;

      default:
        logger.warn(`未处理的时间序列菜单动作: ${action}`);
    }
  }

  private async queryTimeseries(connectionId: string, timeseriesPath: string): Promise<void> {
    try {
      // IoTDB 时间序列路径格式: root.storage_group.device.measurement
      // 需要提取设备路径和测点名来生成正确的 SQL
      const parts = timeseriesPath.split('.');
      if (parts.length < 2) {
        throw new Error(`无效的时间序列路径: ${timeseriesPath}`);
      }

      // 最后一部分是测点名，其余部分是设备路径
      const measurement = parts[parts.length - 1];
      const devicePath = parts.slice(0, -1).join('.');

      // 提取存储组（前两段）
      const storageGroup = parts.length >= 2 ? `${parts[0]}.${parts[1]}` : '';

      // 生成正确的 IoTDB SQL: SELECT measurement FROM devicePath LIMIT 1000
      const query = `SELECT ${measurement} FROM ${devicePath} LIMIT 1000;`;

      if (this.deps.onCreateAndExecuteQuery) {
        this.deps.onCreateAndExecuteQuery(query, storageGroup, connectionId);
      }

      this.showSuccess('query_timeseries', tNs('menu', 'iotdb_messages.querying_timeseries', { timeseriesPath }));
    } catch (error) {
      this.showError('query_timeseries', error);
    }
  }

  private async showTimeseriesInfo(connectionId: string, timeseriesPath: string): Promise<void> {
    try {
      const info = await this.invokeTauri<any>('get_iotdb_timeseries_info', {
        connectionId,
        timeseriesPath,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        timeseriesInfo: {
          open: true,
          connectionId,
          timeseriesPath,
          info,
        },
      }));
    } catch (error) {
      this.showError('timeseries_info', error);
    }
  }

  private async showTimeseriesStats(connectionId: string, timeseriesPath: string): Promise<void> {
    try {
      const stats = await this.invokeTauri<any>('get_iotdb_timeseries_statistics', {
        connectionId,
        timeseriesPath,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        timeseriesStats: {
          open: true,
          connectionId,
          timeseriesPath,
          stats,
        },
      }));
    } catch (error) {
      this.showError('timeseries_stats', error);
    }
  }

  private async deleteTimeseries(connectionId: string, timeseriesPath: string): Promise<void> {
    await this.handleDelete(
      'delete_timeseries',
      'delete_timeseries',
      { connectionId, path: timeseriesPath },
      true
    );
  }
}

/**
 * 模板节点菜单处理器
 */
export class TemplateMenuHandler extends BaseMenuHandler {
  async handle(action: ContextMenuAction, node: TreeNodeData): Promise<void> {
    const metadata = node.metadata || {};
    const connectionId = metadata.connectionId || '';
    const templateName = metadata.templateName || node.name;

    switch (action) {
      case 'view_template':
        await this.viewTemplate(connectionId, templateName);
        break;

      case 'edit_template':
        await this.editTemplate(connectionId, templateName);
        break;

      case 'refresh_template':
        await this.handleRefresh(action, connectionId);
        break;

      case 'mount_template':
        await this.mountTemplate(connectionId, templateName);
        break;

      case 'unmount_template':
        await this.unmountTemplate(connectionId, templateName);
        break;

      case 'copy_template_name':
        await this.copyToClipboard(templateName, action);
        break;

      case 'delete_template':
        await this.deleteTemplate(connectionId, templateName);
        break;

      default:
        logger.warn(`未处理的模板菜单动作: ${action}`);
    }
  }

  private async viewTemplate(connectionId: string, templateName: string): Promise<void> {
    try {
      const template = await this.invokeTauri<any>('get_template', {
        connectionId,
        templateName,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        templateView: {
          open: true,
          connectionId,
          templateName,
          template,
        },
      }));
    } catch (error) {
      this.showError('view_template', error);
    }
  }

  private async editTemplate(connectionId: string, templateName: string): Promise<void> {
    try {
      const template = await this.invokeTauri<any>('get_template', {
        connectionId,
        templateName,
      });

      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        templateEditor: {
          open: true,
          connectionId,
          templateName,
          template,
        },
      }));
    } catch (error) {
      this.showError('edit_template', error);
    }
  }

  private async mountTemplate(connectionId: string, templateName: string): Promise<void> {
    try {
      this.deps.setDialogStates((prev: any) => ({
        ...prev,
        mountTemplate: {
          open: true,
          connectionId,
          templateName,
        },
      }));
    } catch (error) {
      this.showError('mount_template', error);
    }
  }

  private async unmountTemplate(connectionId: string, templateName: string): Promise<void> {
    const confirmed = await this.confirm(
      'unmount_template',
      `${tNs('menu', 'context_menu.delete_template')  } "${templateName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.invokeTauri('unmount_template', {
        connectionId,
        templateName,
      });

      this.showSuccess('unmount_template', tNs('menu', 'iotdb_messages.template_unmounted', { templateName }));
      await this.refreshTree(true);
    } catch (error) {
      this.showError('unmount_template', error);
    }
  }

  private async deleteTemplate(connectionId: string, templateName: string): Promise<void> {
    await this.handleDelete(
      'delete_template',
      'drop_schema_template',
      { connectionId, templateName },
      true
    );
  }
}

