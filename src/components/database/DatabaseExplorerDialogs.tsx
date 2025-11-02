import React from 'react';
import TableDesignerDialog from '@/components/database/TableDesignerDialog';
import TableInfoDialog from '@/components/database/TableInfoDialog';
import CreateDatabaseDialog from '@/components/database/CreateDatabaseDialog';
import DatabaseInfoDialog from '@/components/database/DatabaseInfoDialog';
import ConnectionDetailDialog from '@/components/database/ConnectionDetailDialog';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import { ManagementNodeDialog } from '@/components/database/ManagementNodeDialog';
import IoTDBTemplateDialog from '@/components/database/IoTDBTemplateDialog';
import QueryBuilder from '@/components/query/QueryBuilder';
import TableListDialog from '@/components/database/TableListDialog';
import TableStatisticsDialog from '@/components/database/TableStatisticsDialog';
import DataPreviewDialog from '@/components/database/DataPreviewDialog';
import type {
    DialogStates,
    DatabaseInfoDialogState,
    RetentionPolicyDialogState,
    ManagementNodeDialogState,
    ConnectionDetailDialogState,
} from '@/types/databaseExplorer';
import type { ConnectionConfig } from '@/types';

interface DatabaseExplorerDialogsProps {
    // Table dialogs
    dialogStates: DialogStates;
    closeDialog: (type: 'designer' | 'info') => void;
    setDialogStates: React.Dispatch<React.SetStateAction<DialogStates>>;

    // Database dialogs
    createDatabaseDialogOpen: boolean;
    setCreateDatabaseDialogOpen: (open: boolean) => void;
    databaseInfoDialog: DatabaseInfoDialogState;
    setDatabaseInfoDialog: (state: DatabaseInfoDialogState) => void;
    retentionPolicyDialog: RetentionPolicyDialogState;
    setRetentionPolicyDialog: (state: RetentionPolicyDialogState) => void;
    activeConnectionId: string | null;
    buildCompleteTreeData: (forceRefresh?: boolean) => Promise<void>;
    setTreeNodeCache: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
    refreshNode?: (nodeId: string) => void;

    // Connection dialog
    isConnectionDialogVisible: boolean;
    editingConnection: ConnectionConfig | null;
    handleCloseConnectionDialog: () => void;
    handleConnectionSuccess: (connection: ConnectionConfig) => Promise<void>;

    // Management node dialog
    managementNodeDialog: ManagementNodeDialogState;
    setManagementNodeDialog: (state: ManagementNodeDialogState) => void;

    // Detail dialogs
    connectionDetailDialog: ConnectionDetailDialogState;
    setConnectionDetailDialog: (state: ConnectionDetailDialogState) => void;

    // Query execution callback
    onCreateAndExecuteQuery?: (query: string, database: string, connectionId: string) => void;
}

export const DatabaseExplorerDialogs: React.FC<DatabaseExplorerDialogsProps> = ({
    dialogStates,
    closeDialog,
    setDialogStates,
    createDatabaseDialogOpen,
    setCreateDatabaseDialogOpen,
    databaseInfoDialog,
    setDatabaseInfoDialog,
    retentionPolicyDialog,
    setRetentionPolicyDialog,
    activeConnectionId,
    buildCompleteTreeData,
    setTreeNodeCache,
    refreshNode,
    isConnectionDialogVisible,
    editingConnection,
    handleCloseConnectionDialog,
    handleConnectionSuccess,
    managementNodeDialog,
    setManagementNodeDialog,
    connectionDetailDialog,
    setConnectionDetailDialog,
    onCreateAndExecuteQuery,
}) => {
    return (
        <>
            {/* 表相关弹框 */}
            <TableDesignerDialog
                key={`designer-${dialogStates.designer.connectionId}-${dialogStates.designer.database}-${dialogStates.designer.tableName}`}
                open={dialogStates.designer.open}
                onClose={() => closeDialog('designer')}
                connectionId={dialogStates.designer.connectionId}
                database={dialogStates.designer.database}
                tableName={dialogStates.designer.tableName}
            />

            <TableInfoDialog
                key={`info-${dialogStates.info.connectionId}-${dialogStates.info.database}-${dialogStates.info.tableName}`}
                open={dialogStates.info.open}
                onClose={() => closeDialog('info')}
                connectionId={dialogStates.info.connectionId}
                database={dialogStates.info.database}
                tableName={dialogStates.info.tableName}
            />

            {/* 数据库管理对话框 */}
            <CreateDatabaseDialog
                open={createDatabaseDialogOpen || dialogStates.createDatabase?.open || dialogStates.create_database?.open || false}
                onClose={() => {
                    setCreateDatabaseDialogOpen(false);
                    setDialogStates(prev => ({
                        ...prev,
                        createDatabase: { open: false, connectionId: '' },
                        create_database: { open: false, connectionId: '', metadata: {} },
                    }));
                }}
                onSuccess={() => {
                    // 延迟刷新树形数据，确保后端已完成创建操作
                    setTimeout(() => {
                        buildCompleteTreeData(true);
                    }, 300);
                }}
                connectionId={dialogStates.createDatabase?.connectionId || dialogStates.create_database?.connectionId}
                metadata={dialogStates.create_database?.metadata}
            />

            <DatabaseInfoDialog
                open={databaseInfoDialog.open}
                onClose={() => setDatabaseInfoDialog({open: false, databaseName: ''})}
                databaseName={databaseInfoDialog.databaseName}
            />

            <RetentionPolicyDialog
                visible={retentionPolicyDialog.open}
                mode={retentionPolicyDialog.mode}
                database={retentionPolicyDialog.database}
                policy={retentionPolicyDialog.policy}
                connectionId={retentionPolicyDialog.connectionId}
                onClose={() => setRetentionPolicyDialog({
                    open: false,
                    mode: 'create',
                    connectionId: '',
                    database: '',
                    policy: null,
                })}
                onSuccess={() => {
                    // 清除树节点缓存，确保获取最新数据
                    if (retentionPolicyDialog.connectionId) {
                        setTreeNodeCache(prev => {
                            const newCache = { ...prev };
                            delete newCache[retentionPolicyDialog.connectionId];
                            return newCache;
                        });
                    }
                    // 触发数据库节点刷新
                    if (refreshNode && retentionPolicyDialog.database) {
                        const nodeId = `db_${retentionPolicyDialog.database}`;
                        refreshNode(nodeId);
                    }
                }}
            />

            {/* 连接配置对话框 */}
            <SimpleConnectionDialog
                visible={isConnectionDialogVisible}
                connection={editingConnection || undefined}
                onCancel={handleCloseConnectionDialog}
                onSuccess={handleConnectionSuccess}
            />

            {/* 管理节点详情弹框 */}
            <ManagementNodeDialog
                open={managementNodeDialog.open}
                onClose={() => setManagementNodeDialog({
                    open: false,
                    connectionId: '',
                    nodeType: '',
                    nodeName: '',
                    nodeCategory: '',
                })}
                connectionId={managementNodeDialog.connectionId}
                nodeType={managementNodeDialog.nodeType}
                nodeName={managementNodeDialog.nodeName}
                nodeCategory={managementNodeDialog.nodeCategory}
            />

            {/* 连接详情对话框 */}
            <ConnectionDetailDialog
                open={connectionDetailDialog.open}
                onClose={() => setConnectionDetailDialog({
                    open: false,
                    connectionId: '',
                })}
                connectionId={connectionDetailDialog.connectionId}
            />

            {/* IoTDB 模板管理对话框 */}
            {dialogStates.iotdbTemplate && (
                <IoTDBTemplateDialog
                    open={dialogStates.iotdbTemplate.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            iotdbTemplate: {
                                open: false,
                                connectionId: '',
                                mode: 'list' as const,
                            },
                        }));
                    }}
                    connectionId={dialogStates.iotdbTemplate.connectionId}
                    mode={dialogStates.iotdbTemplate.mode}
                    devicePath={dialogStates.iotdbTemplate.devicePath}
                />
            )}

            {/* 查询构建器对话框 */}
            {dialogStates.queryBuilder && (
                <QueryBuilder
                    open={dialogStates.queryBuilder.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            queryBuilder: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                            },
                        }));
                    }}
                    connectionId={dialogStates.queryBuilder.connectionId}
                    database={dialogStates.queryBuilder.database}
                    table={dialogStates.queryBuilder.table}
                    onExecute={(query) => {
                        // 创建查询tab并执行查询
                        if (onCreateAndExecuteQuery && dialogStates.queryBuilder) {
                            onCreateAndExecuteQuery(
                                query,
                                dialogStates.queryBuilder.database,
                                dialogStates.queryBuilder.connectionId
                            );
                        }
                    }}
                />
            )}

            {/* 表列表对话框 */}
            {dialogStates.tableList && (
                <TableListDialog
                    open={dialogStates.tableList.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            tableList: {
                                open: false,
                                connectionId: '',
                                database: '',
                                tables: [],
                            },
                        }));
                    }}
                    connectionId={dialogStates.tableList.connectionId}
                    database={dialogStates.tableList.database}
                    tables={dialogStates.tableList.tables}
                />
            )}

            {/* 表统计分析对话框 */}
            {dialogStates.tableStatistics && (
                <TableStatisticsDialog
                    open={dialogStates.tableStatistics.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            tableStatistics: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                                stats: null,
                            },
                        }));
                    }}
                    connectionId={dialogStates.tableStatistics.connectionId}
                    database={dialogStates.tableStatistics.database}
                    table={dialogStates.tableStatistics.table}
                    stats={dialogStates.tableStatistics.stats}
                />
            )}

            {/* 数据预览对话框 */}
            {dialogStates.dataPreview && (
                <DataPreviewDialog
                    open={dialogStates.dataPreview.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            dataPreview: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                                data: null,
                            },
                        }));
                    }}
                    connectionId={dialogStates.dataPreview.connectionId}
                    database={dialogStates.dataPreview.database}
                    table={dialogStates.dataPreview.table}
                    data={dialogStates.dataPreview.data}
                />
            )}
        </>
    );
};

