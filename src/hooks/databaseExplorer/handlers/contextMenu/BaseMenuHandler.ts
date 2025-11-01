/**
 * BaseMenuHandler - 上下文菜单处理器基类
 * 
 * 提供所有菜单处理器的通用功能
 */

import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { writeToClipboard } from '@/utils/clipboard';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type { ContextMenuAction, ContextMenuActionMetadata } from '@/types/contextMenu';
import { CONTEXT_MENU_ACTIONS } from '@/types/contextMenu';

/**
 * 菜单处理器依赖项
 */
export interface MenuHandlerDependencies {
  // 状态管理
  getConnection: (id: string) => any;
  isConnectionConnected: (id: string) => boolean;
  isDatabaseOpened: (connectionId: string, database: string) => boolean;
  isFavorite: (path: string) => boolean;
  
  // 数据操作
  disconnectFromDatabase: (id: string) => Promise<void>;
  removeConnection: (id: string) => void;
  openDatabase: (connectionId: string, database: string) => void;
  closeDatabase: (connectionId: string, database: string) => void;
  addFavorite: (favorite: any) => void;
  removeFavorite: (id: string) => void;
  clearDatabasesCache: (connectionId?: string) => void;
  buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
  refreshNode?: (nodeId: string) => void;

  // UI 操作
  setLoading: (loading: boolean) => void;
  setCreateDatabaseDialogOpen: (open: boolean) => void;
  setDatabaseInfoDialog: (state: any) => void;
  setRetentionPolicyDialog: (state: any) => void;
  setManagementNodeDialog: (state: any) => void;
  setDialogStates: (state: any) => void;
  
  // 连接操作
  handleConnectionToggle: (connectionId: string) => Promise<void>;
  handleOpenConnectionDialog: (connection: any) => void;
  
  // 查询操作
  onCreateAndExecuteQuery?: (query: string, database: string, connectionId: string) => void;
  onCreateDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void;
  generateQuery: (table: string, connectionId?: string) => string;
  executeTableQuery: (connectionId: string, database: string, table: string) => Promise<void>;
  refreshTree: () => void;
  openDialog: (type: 'designer' | 'info', connectionId: string, database: string, tableName: string) => void;
}

/**
 * 菜单处理器基类
 */
export abstract class BaseMenuHandler {
  protected deps: MenuHandlerDependencies;

  constructor(deps: MenuHandlerDependencies) {
    this.deps = deps;
  }

  /**
   * 处理菜单动作
   */
  abstract handle(action: ContextMenuAction, node: TreeNodeData): Promise<void>;

  /**
   * 获取动作元数据
   */
  protected getActionMetadata(action: ContextMenuAction): ContextMenuActionMetadata {
    return CONTEXT_MENU_ACTIONS[action];
  }

  /**
   * 显示成功消息
   */
  protected showSuccess(action: ContextMenuAction, customMessage?: string): void {
    const metadata = this.getActionMetadata(action);
    const message = customMessage || metadata.successMessage || `${metadata.label}成功`;
    showMessage.success(message);
  }

  /**
   * 显示错误消息
   */
  protected showError(action: ContextMenuAction, error: any): void {
    const metadata = this.getActionMetadata(action);
    const message = metadata.errorMessage || `${metadata.label}失败`;
    const errorDetail = error instanceof Error ? error.message : String(error);
    showMessage.error(`${message}: ${errorDetail}`);
  }

  /**
   * 确认操作
   */
  protected async confirm(action: ContextMenuAction, customMessage?: string): Promise<boolean> {
    const metadata = this.getActionMetadata(action);
    if (!metadata.requiresConfirmation) {
      return true;
    }

    const message = customMessage || metadata.confirmationMessage || `确定要${metadata.label}吗？`;
    
    return new Promise((resolve) => {
      dialog.confirm({
        title: '确认操作',
        content: message,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  /**
   * 复制到剪贴板
   */
  protected async copyToClipboard(text: string, action: ContextMenuAction): Promise<void> {
    try {
      await writeToClipboard(text);
      this.showSuccess(action);
    } catch (error) {
      this.showError(action, error);
    }
  }

  /**
   * 从节点获取元数据
   */
  protected getMetadata(node: TreeNodeData): {
    connectionId: string;
    database: string;
    table: string;
    field: string;
    tag: string;
    organization: string;
    bucket: string;
  } {
    const metadata = node.metadata || {};
    return {
      connectionId: metadata.connectionId || '',
      database: metadata.database || metadata.databaseName || node.name,
      table: metadata.table || metadata.tableName || node.name,
      field: metadata.field || metadata.fieldName || node.name,
      tag: metadata.tag || metadata.tagName || node.name,
      organization: metadata.organization || metadata.organizationName || node.name,
      bucket: metadata.bucket || metadata.bucketName || node.name,
    };
  }

  /**
   * 调用 Tauri 后端命令
   */
  protected async invokeTauri<T = any>(
    command: string,
    args: Record<string, any> = {}
  ): Promise<T> {
    return safeTauriInvoke<T>(command, args);
  }

  /**
   * 刷新树
   */
  protected async refreshTree(forceRefresh: boolean = false): Promise<void> {
    await this.deps.buildCompleteTreeData(forceRefresh);
  }

  /**
   * 打开对话框
   */
  protected openDialog(
    type: 'database_info' | 'retention_policy' | 'management_node' | 'create_database',
    state: any
  ): void {
    switch (type) {
      case 'database_info':
        this.deps.setDatabaseInfoDialog(state);
        break;
      case 'retention_policy':
        this.deps.setRetentionPolicyDialog(state);
        break;
      case 'management_node':
        this.deps.setManagementNodeDialog(state);
        break;
      case 'create_database':
        this.deps.setCreateDatabaseDialogOpen(state);
        break;
    }
  }

  /**
   * 生成查询并执行
   */
  protected async generateAndExecuteQuery(
    connectionId: string,
    database: string,
    table: string,
    queryType: 'select' | 'count' | 'recent' | 'aggregate' = 'select'
  ): Promise<void> {
    const query = this.deps.generateQuery(table, connectionId);
    
    if (this.deps.onCreateAndExecuteQuery) {
      this.deps.onCreateAndExecuteQuery(query, database, connectionId);
    } else {
      await this.deps.executeTableQuery(connectionId, database, table);
    }
  }

  /**
   * 处理收藏操作
   */
  protected handleFavorite(node: TreeNodeData, add: boolean): void {
    const { connectionId, database, table } = this.getMetadata(node);
    const path = `${connectionId}/${database}/${table}`;

    if (add) {
      this.deps.addFavorite({
        id: path,
        connectionId,
        database,
        table,
        name: table,
        type: node.nodeType,
      });
      this.showSuccess('add_favorite');
    } else {
      this.deps.removeFavorite(path);
      this.showSuccess('remove_favorite');
    }
  }

  /**
   * 处理删除操作
   */
  protected async handleDelete(
    action: ContextMenuAction,
    command: string,
    args: Record<string, any>,
    refreshAfter: boolean = true,
    nodeIdToRefresh?: string
  ): Promise<void> {
    const confirmed = await this.confirm(action);
    if (!confirmed) {
      return;
    }

    try {
      await this.invokeTauri(command, args);
      this.showSuccess(action);

      if (refreshAfter) {
        // 如果提供了节点 ID，使用局部刷新
        if (nodeIdToRefresh && this.deps.refreshNode) {
          this.deps.refreshNode(nodeIdToRefresh);
        } else {
          // 否则使用全局刷新
          await this.refreshTree(true);
        }
      }
    } catch (error) {
      this.showError(action, error);
    }
  }

  /**
   * 处理导出操作
   */
  protected async handleExport(
    action: ContextMenuAction,
    command: string,
    args: Record<string, any>
  ): Promise<void> {
    try {
      this.deps.setLoading(true);
      await this.invokeTauri(command, args);
      this.showSuccess(action);
    } catch (error) {
      this.showError(action, error);
    } finally {
      this.deps.setLoading(false);
    }
  }

  /**
   * 处理信息查看操作
   */
  protected handleInfo(
    dialogType: 'database_info' | 'retention_policy' | 'management_node',
    state: any
  ): void {
    this.openDialog(dialogType, { ...state, open: true });
  }

  /**
   * 处理刷新操作
   */
  protected async handleRefresh(
    action: ContextMenuAction,
    connectionId?: string
  ): Promise<void> {
    try {
      if (connectionId) {
        this.deps.clearDatabasesCache(connectionId);
      }
      await this.refreshTree(true);
      this.showSuccess(action);
    } catch (error) {
      this.showError(action, error);
    }
  }

  /**
   * 生成 SQL 语句
   */
  protected generateSqlStatement(
    type: 'use' | 'select' | 'count' | 'show',
    database: string,
    table?: string
  ): string {
    switch (type) {
      case 'use':
        return `USE "${database}";`;
      case 'select':
        // InfluxDB 1.x: 只使用 measurement 名称，不加 database 前缀
        // 数据库通过 execute_query 的 database 参数指定
        return table ? `SELECT * FROM "${table}" LIMIT 1000;` : '';
      case 'count':
        // InfluxDB 1.x: 只使用 measurement 名称，不加 database 前缀
        return table ? `SELECT COUNT(*) FROM "${table}";` : '';
      case 'show':
        return `SHOW MEASUREMENTS ON "${database}";`;
      default:
        return '';
    }
  }
}

