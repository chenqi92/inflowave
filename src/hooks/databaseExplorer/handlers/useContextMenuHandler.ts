import { useCallback } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { writeToClipboard } from '@/utils/clipboard';
import type { ConnectionConfig } from '@/types';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import type {
    DatabaseInfoDialogState,
    RetentionPolicyDialogState,
    ManagementNodeDialogState,
    DialogStates,
} from '@/types/databaseExplorer';

interface UseContextMenuHandlerProps {
    contextMenuTarget: TreeNodeData | null;
    setContextMenuOpen: (open: boolean) => void;
    setContextMenuTarget: (target: TreeNodeData | null) => void;
    getConnection: (id: string) => ConnectionConfig | undefined;
    connections: ConnectionConfig[];
    isConnectionConnected: (id: string) => boolean;
    disconnectFromDatabase: (id: string) => Promise<void>;
    removeConnection: (id: string) => void;
    openDatabase: (connectionId: string, database: string) => void;
    closeDatabase: (connectionId: string, database: string) => void;
    isDatabaseOpened: (connectionId: string, database: string) => boolean;
    addFavorite: (favorite: any) => void;
    removeFavorite: (id: string) => void;
    clearDatabasesCache: (connectionId?: string) => void;
    buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
    setLoading: (loading: boolean) => void;
    setCreateDatabaseDialogOpen: (open: boolean) => void;
    setDatabaseInfoDialog: React.Dispatch<React.SetStateAction<DatabaseInfoDialogState>>;
    setRetentionPolicyDialog: React.Dispatch<React.SetStateAction<RetentionPolicyDialogState>>;
    setManagementNodeDialog: React.Dispatch<React.SetStateAction<ManagementNodeDialogState>>;
    setDialogStates: React.Dispatch<React.SetStateAction<DialogStates>>;
    handleConnectionToggle: (connectionId: string) => Promise<void>;
    handleOpenConnectionDialog: (connection: ConnectionConfig) => void;
    onCreateAndExecuteQuery?: (query: string, database: string, connectionId: string) => void;
    generateQuery: (table: string, connectionId?: string) => string;
    executeTableQuery: (connectionId: string, database: string, table: string) => Promise<void>;
    refreshTree: () => void;
    openDialog: (type: 'designer' | 'info', connectionId: string, database: string, tableName: string) => void;
}

/**
 * Custom hook for handling context menu actions
 */
export const useContextMenuHandler = (props: UseContextMenuHandlerProps) => {
    const {
        contextMenuTarget,
        setContextMenuOpen,
        setContextMenuTarget,
        getConnection,
        connections,
        isConnectionConnected,
        disconnectFromDatabase,
        removeConnection,
        openDatabase,
        closeDatabase,
        isDatabaseOpened,
        addFavorite,
        removeFavorite,
        clearDatabasesCache,
        buildCompleteTreeData,
        setLoading,
        setCreateDatabaseDialogOpen,
        setDatabaseInfoDialog,
        setRetentionPolicyDialog,
        setManagementNodeDialog,
        handleConnectionToggle,
        handleOpenConnectionDialog,
        onCreateAndExecuteQuery,
        generateQuery,
        executeTableQuery,
        refreshTree,
        openDialog,
    } = props;

    // ============================================================================
    // Context Menu Action Handler
    // ============================================================================
    const handleContextMenuAction = useCallback(async (action: string, node: TreeNodeData) => {
        // Use the node parameter instead of contextMenuTarget state
        const nodeType = node.nodeType;
        const metadata = node.metadata || {};
        const connectionId = metadata.connectionId || '';
        const database = metadata.database || metadata.databaseName || node.name;
        const table = metadata.table || metadata.tableName || node.name;

        try {
            switch (action) {
                // Connection actions
                case 'refresh_connection':
                    if (nodeType === 'connection') {
                        try {
                            clearDatabasesCache(connectionId);
                            buildCompleteTreeData(true);
                            showMessage.success(`连接 ${node.name} 已刷新`);
                        } catch (error) {
                            console.error('刷新连接失败:', error);
                            showMessage.error(`刷新连接失败: ${error}`);
                        }
                    }
                    break;

                case 'disconnect':
                    if (nodeType === 'connection') {
                        try {
                            await handleConnectionToggle(connectionId);
                            showMessage.success(`连接 ${node.name} 已断开`);
                        } catch (error) {
                            console.error('断开连接失败:', error);
                            showMessage.error(`断开连接失败: ${error}`);
                        }
                    }
                    break;

                case 'connection_properties':
                    if (nodeType === 'connection') {
                        const connection = getConnection(connectionId);
                        if (connection) {
                            console.log(`🔧 编辑连接属性: ${connection.name}`);
                            handleOpenConnectionDialog(connection);
                        } else {
                            showMessage.error('连接不存在');
                        }
                    }
                    break;

                case 'delete_connection':
                    if (nodeType === 'connection') {
                        const connection = getConnection(connectionId);
                        if (connection) {
                            const confirmed = await dialog.confirm({
                                title: '删除连接',
                                content: `确定要删除连接 "${connection.name}" 吗？此操作不可撤销。`,
                            });

                            if (confirmed) {
                                try {
                                    if (isConnectionConnected(connectionId)) {
                                        await disconnectFromDatabase(connectionId);
                                    }

                                    try {
                                        console.log(`🗑️ 开始删除连接: ${connection.name} (${connectionId})`);
                                        await safeTauriInvoke('delete_connection', { connectionId });
                                        console.log('✅ 后端删除成功');

                                        removeConnection(connectionId);
                                        console.log('✅ 前端状态删除成功');

                                        showMessage.success(`连接 "${connection.name}" 已删除`);
                                        buildCompleteTreeData(true);
                                    } catch (deleteError) {
                                        console.error('❌ 删除连接失败:', deleteError);
                                        showMessage.error(`删除连接失败: ${deleteError}`);
                                    }
                                } catch (error) {
                                    console.error('删除连接失败:', error);
                                    showMessage.error(`删除连接失败: ${error}`);
                                }
                            }
                        } else {
                            showMessage.error('连接不存在');
                        }
                    }
                    break;

                // Database actions
                case 'open_database':
                    if (nodeType.includes('database')) {
                        try {
                            console.log(`📂 [DatabaseExplorer] 打开数据库连接: ${database}, connectionId: ${connectionId}`);
                            console.log(`📂 [DatabaseExplorer] 打开前状态: ${isDatabaseOpened(connectionId, database)}`);

                            openDatabase(connectionId, database);

                            console.log(`📂 [DatabaseExplorer] 打开后状态: ${isDatabaseOpened(connectionId, database)}`);
                            console.log(`📂 [DatabaseExplorer] 不触发树重建，只更新节点状态`);

                            showMessage.success(`已打开数据库 "${database}"`);
                        } catch (error) {
                            console.error('❌ 打开数据库失败:', error);
                            showMessage.error(`打开数据库失败: ${error}`);
                        }
                    }
                    break;

                case 'close_database':
                    if (nodeType.includes('database')) {
                        try {
                            console.log(`📂 [DatabaseExplorer] 关闭数据库连接: ${database}, connectionId: ${connectionId}`);
                            console.log(`📂 [DatabaseExplorer] 关闭前状态: ${isDatabaseOpened(connectionId, database)}`);

                            closeDatabase(connectionId, database);

                            console.log(`📂 [DatabaseExplorer] 关闭后状态: ${isDatabaseOpened(connectionId, database)}`);
                            console.log(`📂 [DatabaseExplorer] 不触发树重建，只更新节点状态`);

                            showMessage.success(`已关闭数据库 "${database}"`);
                        } catch (error) {
                            console.error('❌ 关闭数据库失败:', error);
                            showMessage.error(`关闭数据库失败: ${error}`);
                        }
                    }
                    break;

                case 'refresh_database':
                    if (nodeType.includes('database')) {
                        try {
                            console.log(`🔄 刷新数据库结构: ${database}`);
                            await buildCompleteTreeData(true);
                            showMessage.success(`数据库 ${database} 已刷新`);
                        } catch (error) {
                            console.error('❌ 刷新数据库结构失败:', error);
                            showMessage.error(`刷新数据库结构失败: ${error}`);
                        }
                    }
                    break;

                case 'create_database':
                    if (nodeType === 'connection') {
                        setCreateDatabaseDialogOpen(true);
                    }
                    break;

                case 'create_measurement':
                    if (nodeType.includes('database')) {
                        showMessage.info(`创建测量值功能开发中: ${database}`);
                    }
                    break;

                case 'database_info':
                    if (nodeType.includes('database')) {
                        setDatabaseInfoDialog({
                            open: true,
                            databaseName: database,
                        });
                    }
                    break;

                case 'manage_retention_policies':
                    if (nodeType.includes('database')) {
                        setRetentionPolicyDialog({
                            open: true,
                            mode: 'create',
                            database,
                            policy: null,
                        });
                    }
                    break;

                case 'delete_database':
                case 'drop_database':
                    if (nodeType.includes('database')) {
                        const confirmed = await dialog.confirm({
                            title: '确认删除',
                            content: `确定要删除数据库 "${database}" 吗？此操作不可撤销。`,
                        });
                        if (confirmed) {
                            showMessage.info(`删除数据库功能开发中: ${database}`);
                        }
                    }
                    break;

                // Table actions - will be continued in next part
                default:
                    // Handle remaining actions
                    await handleRemainingActions(action, nodeType, connectionId, database, table);
                    break;
            }
        } catch (error) {
            console.error('执行右键菜单动作失败:', error);
            showMessage.error(`操作失败: ${error}`);
        }

        // 关闭右键菜单
        setContextMenuOpen(false);
        setContextMenuTarget(null);
    }, [
        contextMenuTarget,
        setContextMenuOpen,
        setContextMenuTarget,
        getConnection,
        isConnectionConnected,
        disconnectFromDatabase,
        removeConnection,
        openDatabase,
        closeDatabase,
        isDatabaseOpened,
        clearDatabasesCache,
        buildCompleteTreeData,
        setCreateDatabaseDialogOpen,
        setDatabaseInfoDialog,
        setRetentionPolicyDialog,
        handleConnectionToggle,
        handleOpenConnectionDialog,
    ]);

    // Helper function for remaining actions
    const handleRemainingActions = async (
        action: string,
        nodeType: string,
        connectionId: string,
        database: string,
        table: string
    ) => {
        switch (action) {
            // Table actions
            case 'view_table_data':
            case 'query_table':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    const query = generateQuery(table, connectionId);
                    if (onCreateAndExecuteQuery) {
                        onCreateAndExecuteQuery(query, database, connectionId);
                        showMessage.success(`正在查询表 "${table}"`);
                    } else {
                        await executeTableQuery(connectionId, database, table);
                    }
                }
                break;

            case 'edit_table':
            case 'table_designer':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    openDialog('designer', connectionId, database, table);
                }
                break;

            case 'table_info':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    openDialog('info', connectionId, database, table);
                }
                break;

            case 'delete_table':
            case 'drop_table':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    const confirmed = await dialog.confirm({
                        title: '确认删除表',
                        content: `确定要删除表 "${table}" 吗？\n\n⚠️ 警告：此操作将永久删除表中的所有数据，无法恢复！`,
                    });
                    if (confirmed) {
                        try {
                            setLoading(true);
                            console.log('🗑️ 删除表:', { connectionId, database, table });

                            const dropQuery = `DROP MEASUREMENT "${table}"`;
                            await safeTauriInvoke('execute_query', {
                                request: { connectionId, database, query: dropQuery },
                            });

                            showMessage.success(`表 "${table}" 已成功删除`);
                            refreshTree();
                            console.log('✅ 表删除成功');
                        } catch (error) {
                            console.error('❌ 删除表失败:', error);
                            showMessage.error(`删除表失败: ${error}`);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
                break;

            // Field actions
            case 'copy_field_name':
                if (nodeType === 'field' && contextMenuTarget) {
                    await writeToClipboard(contextMenuTarget.name, {
                        successMessage: `已复制字段名: ${contextMenuTarget.name}`,
                    });
                }
                break;

            case 'field_stats':
                if (nodeType === 'field' && contextMenuTarget) {
                    showMessage.info(`字段统计功能开发中: ${contextMenuTarget.name}`);
                }
                break;

            // Copy actions
            case 'copy_connection_name':
                if (nodeType === 'connection') {
                    const connection = connections.find(c => c.id === connectionId);
                    if (connection) {
                        await writeToClipboard(connection.name, {
                            successMessage: `已复制连接名: ${connection.name}`,
                        });
                    }
                }
                break;

            case 'copy_database_name':
                if (nodeType.includes('database')) {
                    await writeToClipboard(database, {
                        successMessage: `已复制数据库名: ${database}`,
                    });
                }
                break;

            case 'copy_table_name':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    await writeToClipboard(table, {
                        successMessage: `已复制表名: ${table}`,
                    });
                }
                break;

            case 'copy_tag_name':
                if (nodeType === 'tag' && contextMenuTarget) {
                    await writeToClipboard(contextMenuTarget.name, {
                        successMessage: `已复制标签名: ${contextMenuTarget.name}`,
                    });
                }
                break;

            // Tag actions
            case 'tag_values':
                if (nodeType === 'tag' && contextMenuTarget) {
                    showMessage.info(`查看标签值功能开发中: ${contextMenuTarget.name}`);
                }
                break;

            // Favorite actions
            case 'add_favorite':
            case 'remove_favorite':
                if (nodeType === 'measurement' || nodeType === 'table') {
                    const path = `${connectionId}/${database}/${table}`;
                    if (action === 'add_favorite') {
                        addFavorite({
                            path,
                            type: 'table',
                            name: table,
                            connectionId,
                            database,
                        });
                        showMessage.success(`已添加到收藏: ${table}`);
                    } else {
                        removeFavorite(path);
                        showMessage.success(`已取消收藏: ${table}`);
                    }
                }
                break;

            default:
                console.warn('未处理的右键菜单动作:', action);
                break;
        }
    };

    return {
        handleContextMenuAction,
    };
};

