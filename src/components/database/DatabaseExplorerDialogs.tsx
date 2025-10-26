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
    isConnectionDialogVisible,
    editingConnection,
    handleCloseConnectionDialog,
    handleConnectionSuccess,
    managementNodeDialog,
    setManagementNodeDialog,
    connectionDetailDialog,
    setConnectionDetailDialog,
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
                open={createDatabaseDialogOpen || dialogStates.createDatabase?.open || false}
                onClose={() => {
                    setCreateDatabaseDialogOpen(false);
                    setDialogStates(prev => ({
                        ...prev,
                        createDatabase: { open: false, connectionId: '' },
                    }));
                }}
                onSuccess={() => {
                    // 刷新树形数据
                    buildCompleteTreeData(true);
                }}
                connectionId={dialogStates.createDatabase?.connectionId}
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
                connectionId={activeConnectionId || ''}
                onClose={() => setRetentionPolicyDialog({
                    open: false,
                    mode: 'create',
                    database: '',
                    policy: null,
                })}
                onSuccess={() => {
                    // 刷新数据库信息
                    buildCompleteTreeData(true);
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
                        // 执行查询的回调
                        // 可以通过 props 传递一个执行查询的函数
                        console.log('执行查询:', query);
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
        </>
    );
};

