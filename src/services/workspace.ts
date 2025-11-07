/**
 * 工作区 API 服务
 * 用于管理保存的查询标签页
 */

import { safeTauriInvoke } from '@/utils/tauri';
import logger from '@/utils/logger';

export interface WorkspaceTab {
  id: string;
  title: string;
  content: string;
  tab_type: string;
  created_at: string;
  updated_at: string;
  database?: string;
  connection_id?: string;
  table_name?: string;
}

/**
 * 工作区管理 API 服务
 */
export class WorkspaceAPI {
  /**
   * 保存标签页到工作区
   */
  static async saveTabToWorkspace(
    tabId: string,
    title: string,
    content: string,
    tabType: string,
    database?: string,
    connectionId?: string,
    tableName?: string
  ): Promise<string> {
    logger.debug('保存标签页到工作区:', { tabId, title, tabType });
    return safeTauriInvoke<string>('save_tab_to_workspace', {
      tabId,
      title,
      content,
      tabType,
      database: database || null,
      connectionId: connectionId || null,
      tableName: tableName || null,
    });
  }

  /**
   * 从工作区删除标签页
   */
  static async removeTabFromWorkspace(tabId: string): Promise<void> {
    logger.debug('从工作区删除标签页:', tabId);
    return safeTauriInvoke<void>('remove_tab_from_workspace', {
      tabId,
    });
  }

  /**
   * 获取工作区所有标签页
   */
  static async getWorkspaceTabs(): Promise<WorkspaceTab[]> {
    logger.debug('获取工作区标签页列表');
    return safeTauriInvoke<WorkspaceTab[]>('get_workspace_tabs');
  }

  /**
   * 设置活跃标签页
   */
  static async setActiveWorkspaceTab(tabId: string | null): Promise<void> {
    logger.debug('设置活跃工作区标签页:', tabId);
    return safeTauriInvoke<void>('set_active_workspace_tab', {
      tabId,
    });
  }

  /**
   * 获取活跃标签页ID
   */
  static async getActiveWorkspaceTab(): Promise<string | null> {
    logger.debug('获取活跃工作区标签页');
    return safeTauriInvoke<string | null>('get_active_workspace_tab');
  }

  /**
   * 清空工作区
   */
  static async clearWorkspace(): Promise<void> {
    logger.debug('清空工作区');
    return safeTauriInvoke<void>('clear_workspace');
  }

  /**
   * 批量保存标签页到工作区
   */
  static async saveTabsToWorkspace(
    tabs: Array<{
      id: string;
      title: string;
      content: string;
      type: string;
      database?: string;
      connectionId?: string;
      tableName?: string;
    }>,
    activeTabId?: string
  ): Promise<void> {
    logger.debug('批量保存标签页到工作区:', { count: tabs.length });
    return safeTauriInvoke<void>('save_tabs_to_workspace', {
      tabs,
      activeTabId: activeTabId || null,
    });
  }

  /**
   * 批量删除标签页
   */
  static async removeTabsFromWorkspace(tabIds: string[]): Promise<void> {
    logger.debug('批量删除标签页:', { count: tabIds.length });
    const promises = tabIds.map(tabId => this.removeTabFromWorkspace(tabId));
    await Promise.all(promises);
  }
}

