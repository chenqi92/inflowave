import React from 'react';
import TableDesignerDialog from '@/components/database/TableDesignerDialog';
import TableInfoDialog from '@/components/database/TableInfoDialog';
import CreateDatabaseDialog from '@/components/database/CreateDatabaseDialog';
import DatabaseInfoDialog from '@/components/database/DatabaseInfoDialog';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import { ManagementNodeDialog } from '@/components/database/ManagementNodeDialog';
import type { DialogStates, DatabaseInfoDialogState, RetentionPolicyDialogState, ManagementNodeDialogState } from '@/types/databaseExplorer';
import type { ConnectionConfig } from '@/types';

interface DatabaseExplorerDialogsProps {
    // Table dialogs
    dialogStates: DialogStates;
    closeDialog: (type: 'designer' | 'info') => void;
    
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
}

export const DatabaseExplorerDialogs: React.FC<DatabaseExplorerDialogsProps> = ({
    dialogStates,
    closeDialog,
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
                open={createDatabaseDialogOpen}
                onClose={() => setCreateDatabaseDialogOpen(false)}
                onSuccess={() => {
                    // 刷新树形数据
                    buildCompleteTreeData(true);
                }}
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
        </>
    );
};

