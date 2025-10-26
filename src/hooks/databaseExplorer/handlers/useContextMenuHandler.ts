import React, { useCallback, useMemo } from 'react';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { dialog } from '@/utils/dialog';
import { writeToClipboard } from '@/utils/clipboard';
import type { ConnectionConfig } from '@/types';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';
import { logger } from '@/utils/logger';
import type {
    DatabaseInfoDialogState,
    RetentionPolicyDialogState,
    ManagementNodeDialogState,
    ConnectionDetailDialogState,
    DialogStates,
} from '@/types/databaseExplorer';
import { createContextMenuHandlerFactory, type MenuHandlerDependencies } from './contextMenu';

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
    isFavorite: (path: string) => boolean;
    addFavorite: (favorite: any) => void;
    removeFavorite: (id: string) => void;
    clearDatabasesCache: (connectionId?: string) => void;
    buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
    refreshNode?: (nodeId: string) => void;
    setLoading: (loading: boolean) => void;
    setCreateDatabaseDialogOpen: (open: boolean) => void;
    setDatabaseInfoDialog: React.Dispatch<React.SetStateAction<DatabaseInfoDialogState>>;
    setRetentionPolicyDialog: React.Dispatch<React.SetStateAction<RetentionPolicyDialogState>>;
    setManagementNodeDialog: React.Dispatch<React.SetStateAction<ManagementNodeDialogState>>;
    setConnectionDetailDialog: React.Dispatch<React.SetStateAction<ConnectionDetailDialogState>>;
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
        isFavorite,
        addFavorite,
        removeFavorite,
        clearDatabasesCache,
        buildCompleteTreeData,
        refreshNode,
        setLoading,
        setCreateDatabaseDialogOpen,
        setDatabaseInfoDialog,
        setRetentionPolicyDialog,
        setManagementNodeDialog,
        setConnectionDetailDialog,
        setDialogStates,
        handleConnectionToggle,
        handleOpenConnectionDialog,
        onCreateAndExecuteQuery,
        generateQuery,
        executeTableQuery,
        refreshTree,
        openDialog,
    } = props;

    // ============================================================================
    // Create Context Menu Handler Factory
    // ============================================================================
    const handlerFactory = useMemo(() => {
        const deps: MenuHandlerDependencies = {
            getConnection,
            isConnectionConnected,
            isDatabaseOpened,
            isFavorite,
            disconnectFromDatabase,
            removeConnection,
            openDatabase,
            closeDatabase,
            addFavorite,
            removeFavorite,
            clearDatabasesCache,
            buildCompleteTreeData,
            refreshNode,
            setLoading,
            setCreateDatabaseDialogOpen,
            setDatabaseInfoDialog,
            setRetentionPolicyDialog,
            setManagementNodeDialog,
            setDialogStates,
            handleConnectionToggle,
            handleOpenConnectionDialog,
            onCreateAndExecuteQuery,
            generateQuery,
            executeTableQuery,
            refreshTree,
            openDialog,
        };
        return createContextMenuHandlerFactory(deps);
    }, [
        getConnection,
        isConnectionConnected,
        isDatabaseOpened,
        isFavorite,
        disconnectFromDatabase,
        removeConnection,
        openDatabase,
        closeDatabase,
        addFavorite,
        removeFavorite,
        clearDatabasesCache,
        buildCompleteTreeData,
        refreshNode,
        setLoading,
        setCreateDatabaseDialogOpen,
        setDatabaseInfoDialog,
        setRetentionPolicyDialog,
        setManagementNodeDialog,
        setDialogStates,
        handleConnectionToggle,
        handleOpenConnectionDialog,
        onCreateAndExecuteQuery,
        generateQuery,
        executeTableQuery,
        refreshTree,
        openDialog,
    ]);

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
            // 🔧 First try to handle with specialized handlers
            try {
                await handlerFactory.handleAction(action as any, node);
                // If successful, close menu and return
                setContextMenuOpen(false);
                setContextMenuTarget(null);
                return;
            } catch (handlerError) {
                // If handler doesn't support this action, fall through to legacy handling
                logger.debug(`Handler factory didn't handle action ${action}, falling back to legacy handler`);
            }

            // 🔧 Legacy handling for actions not yet migrated to specialized handlers
            switch (action) {
                // Connection actions
                case 'refresh_connection':
                    if (nodeType === 'connection') {
                        try {
                            clearDatabasesCache(connectionId);
                            buildCompleteTreeData(true);
                            showMessage.success(`连接 ${node.name} 已刷新`);
                        } catch (error) {
                            logger.error('刷新连接失败:', error);
                            // 🔧 不再显示全局toast - 错误会通过ErrorTooltip显示
                        }
                    }
                    break;

                case 'disconnect':
                    if (nodeType === 'connection') {
                        try {
                            await handleConnectionToggle(connectionId);
                            showMessage.success(`连接 ${node.name} 已断开`);
                        } catch (error) {
                            logger.error('断开连接失败:', error);
                            // 🔧 不再显示全局toast - 错误会通过ErrorTooltip显示
                        }
                    }
                    break;

                case 'test_connection':
                    if (nodeType === 'connection') {
                        try {
                            setLoading(true);
                            logger.debug(`🧪 测试连接: ${node.name} (${connectionId})`);
                            const result = await safeTauriInvoke<{ success: boolean; message: string }>(
                                'test_connection',
                                { connectionId }
                            );

                            if (result.success) {
                                showMessage.success(result.message || '连接测试成功');
                            } else {
                                showMessage.error(result.message || '连接测试失败');
                            }
                        } catch (error) {
                            logger.error('测试连接失败:', error);
                            showMessage.error(`测试连接失败: ${error}`);
                        } finally {
                            setLoading(false);
                        }
                    }
                    break;

                case 'connection_info':
                    if (nodeType === 'connection') {
                        try {
                            logger.debug(`📊 获取连接信息: ${node.name} (${connectionId})`);
                            const connection = getConnection(connectionId);
                            if (!connection) {
                                showMessage.error('连接不存在');
                                return;
                            }

                            // 打开连接详情对话框（ConnectionDetailDialog 会自动调用 get_connection_info）
                            setConnectionDetailDialog({
                                open: true,
                                connectionId,
                            });
                        } catch (error) {
                            logger.error('打开连接信息对话框失败:', error);
                            showMessage.error(`打开连接信息对话框失败: ${error}`);
                        }
                    }
                    break;

                case 'copy_connection_name':
                    if (nodeType === 'connection') {
                        try {
                            await writeToClipboard(node.name);
                            showMessage.success(`已复制连接名: ${node.name}`);
                        } catch (error) {
                            logger.error('复制连接名失败:', error);
                            showMessage.error('复制失败');
                        }
                    }
                    break;

                case 'connection_properties':
                    if (nodeType === 'connection') {
                        const connection = getConnection(connectionId);
                        if (connection) {
                            logger.debug(`🔧 编辑连接属性: ${connection.name}`);
                            handleOpenConnectionDialog(connection);
                        } else {
                            logger.error('连接不存在');
                            // 🔧 不再显示全局toast - 这种情况很少见
                        }
                    }
                    break;

                case 'manage_templates':
                    if (nodeType === 'connection') {
                        try {
                            logger.debug(`📋 管理 IoTDB 模板: ${node.name} (${connectionId})`);
                            props.setDialogStates((prev: any) => ({
                                ...prev,
                                iotdbTemplate: {
                                    open: true,
                                    connectionId,
                                    mode: 'list',
                                },
                            }));
                        } catch (error) {
                            logger.error('打开模板管理失败:', error);
                            showMessage.error('打开模板管理失败');
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
                                        logger.debug(`开始删除连接: ${connection.name} (${connectionId})`);
                                        await safeTauriInvoke('delete_connection', { connectionId });
                                        logger.info('后端删除成功');

                                        removeConnection(connectionId);
                                        logger.info('前端状态删除成功');

                                        showMessage.success(`连接 "${connection.name}" 已删除`);
                                        buildCompleteTreeData(true);
                                    } catch (deleteError) {
                                        logger.error('删除连接失败:', deleteError);
                                        // 🔧 不再显示全局toast - 错误会通过ErrorTooltip显示
                                    }
                                } catch (error) {
                                    logger.error('删除连接失败:', error);
                                    // 🔧 不再显示全局toast - 错误会通过ErrorTooltip显示
                                }
                            }
                        } else {
                            logger.error('连接不存在');
                            // 🔧 不再显示全局toast - 这种情况很少见
                        }
                    }
                    break;

                // Database actions
                case 'open_database':
                    if (nodeType.includes('database')) {
                        try {
                            logger.debug(`[DatabaseExplorer] 打开数据库连接: ${database}, connectionId: ${connectionId}`);
                            logger.debug(`[DatabaseExplorer] 打开前状态: ${isDatabaseOpened(connectionId, database)}`);

                            openDatabase(connectionId, database);

                            logger.debug(`[DatabaseExplorer] 打开后状态: ${isDatabaseOpened(connectionId, database)}`);
                            logger.debug('[DatabaseExplorer] 不触发树重建，只更新节点状态');

                            showMessage.success(`已打开数据库 "${database}"`);
                        } catch (error) {
                            logger.error('打开数据库失败:', error);
                            showMessage.error(`打开数据库失败: ${error}`);
                        }
                    }
                    break;

                case 'close_database':
                    if (nodeType.includes('database')) {
                        try {
                            logger.debug(`[DatabaseExplorer] 关闭数据库连接: ${database}, connectionId: ${connectionId}`);
                            logger.debug(`[DatabaseExplorer] 关闭前状态: ${isDatabaseOpened(connectionId, database)}`);

                            closeDatabase(connectionId, database);

                            logger.debug(`[DatabaseExplorer] 关闭后状态: ${isDatabaseOpened(connectionId, database)}`);
                            logger.debug('[DatabaseExplorer] 不触发树重建，只更新节点状态');

                            showMessage.success(`已关闭数据库 "${database}"`);
                        } catch (error) {
                            logger.error('关闭数据库失败:', error);
                            showMessage.error(`关闭数据库失败: ${error}`);
                        }
                    }
                    break;

                case 'refresh_database':
                    if (nodeType.includes('database')) {
                        try {
                            logger.debug(`刷新数据库结构: ${database}`);
                            await buildCompleteTreeData(true);
                            showMessage.success(`数据库 ${database} 已刷新`);
                        } catch (error) {
                            logger.error('刷新数据库结构失败:', error);
                            showMessage.error(`刷新数据库结构失败: ${error}`);
                        }
                    }
                    break;

                case 'create_database':
                    if (nodeType === 'connection') {
                        try {
                            logger.debug(`🗄️ 创建数据库: ${node.name} (${connectionId})`);
                            const connection = getConnection(connectionId);
                            if (!connection) {
                                showMessage.error('连接不存在');
                                return;
                            }

                            // 打开创建数据库对话框
                            setDialogStates((prev: any) => ({
                                ...prev,
                                createDatabase: {
                                    open: true,
                                    connectionId,
                                },
                            }));
                        } catch (error) {
                            logger.error('打开创建数据库对话框失败:', error);
                            showMessage.error('打开创建数据库对话框失败');
                        }
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
                            connectionId,
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
            logger.error('执行右键菜单动作失败:', error);
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
                            logger.debug('删除表:', { connectionId, database, table });

                            const dropQuery = `DROP MEASUREMENT "${table}"`;
                            await safeTauriInvoke('execute_query', {
                                request: { connectionId, database, query: dropQuery },
                            });

                            showMessage.success(`表 "${table}" 已成功删除`);
                            refreshTree();
                            logger.info('表删除成功');
                        } catch (error) {
                            logger.error('删除表失败:', error);
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
                logger.warn('未处理的右键菜单动作:', action);
                break;
        }
    };

    return {
        handleContextMenuAction,
    };
};

