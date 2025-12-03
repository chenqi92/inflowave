import React from 'react';
import TableDesignerDialog from '@/components/database/TableDesignerDialog';
import TableInfoDialog from '@/components/database/TableInfoDialog';
import CreateDatabaseDialog from '@/components/database/CreateDatabaseDialog';
import DatabaseInfoDialog from '@/components/database/DatabaseInfoDialog';
import ConnectionDetailDialog from '@/components/database/ConnectionDetailDialog';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import RefactoredConnectionDialog from '@/components/ConnectionManager/RefactoredConnectionDialog';
import { ManagementNodeDialog } from '@/components/database/ManagementNodeDialog';
import IoTDBTemplateDialog from '@/components/database/IoTDBTemplateDialog';
import QueryBuilder from '@/components/query/QueryBuilder';
import TableListDialog from '@/components/database/TableListDialog';
import TableStatisticsDialog from '@/components/database/TableStatisticsDialog';
import DataPreviewDialog from '@/components/database/DataPreviewDialog';
import TagValuesDialog from '@/components/database/TagValuesDialog';
import CreateDeviceDialog from '@/components/database/CreateDeviceDialog';
import CreateTimeseriesDialog from '@/components/database/CreateTimeseriesDialog';
import DeviceListDialog from '@/components/database/DeviceListDialog';
import DeviceInfoDialog from '@/components/database/DeviceInfoDialog';
import TimeseriesInfoDialog from '@/components/database/TimeseriesInfoDialog';
import TableExportDialog from '@/components/database/TableExportDialog';
import TableImportDialog from '@/components/database/TableImportDialog';
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
                    // 使用局部刷新而不是全局刷新
                    const connectionId = dialogStates.createDatabase?.connectionId || dialogStates.create_database?.connectionId;
                    if (connectionId && refreshNode) {
                        // 延迟刷新，确保后端已完成创建操作
                        setTimeout(() => {
                            const connectionNodeId = `connection-${connectionId}`;
                            refreshNode(connectionNodeId);
                        }, 300);
                    } else {
                        // 降级到全局刷新
                        setTimeout(() => {
                            buildCompleteTreeData(true);
                        }, 300);
                    }
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
            <RefactoredConnectionDialog
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

            {/* 标签值对话框 */}
            {dialogStates.tagValues && (
                <TagValuesDialog
                    open={dialogStates.tagValues.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            tagValues: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                                tag: '',
                                values: [],
                            },
                        }));
                    }}
                    connectionId={dialogStates.tagValues.connectionId}
                    database={dialogStates.tagValues.database}
                    table={dialogStates.tagValues.table}
                    tag={dialogStates.tagValues.tag}
                    values={dialogStates.tagValues.values}
                />
            )}

            {/* IoTDB 设备创建对话框 */}
            {dialogStates.createDevice && (
                <CreateDeviceDialog
                    open={dialogStates.createDevice.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            createDevice: {
                                open: false,
                                connectionId: '',
                                storageGroup: '',
                            },
                        }));
                    }}
                    onSuccess={() => {
                        // 使用局部刷新而不是全局刷新
                        const storageGroup = dialogStates.createDevice?.storageGroup;
                        if (storageGroup && refreshNode) {
                            // 延迟刷新，确保后端已完成创建操作
                            setTimeout(() => {
                                const storageGroupNodeId = `sg_${storageGroup}`;
                                refreshNode(storageGroupNodeId);
                            }, 300);
                        } else {
                            // 降级到全局刷新
                            setTimeout(() => {
                                buildCompleteTreeData(true);
                            }, 300);
                        }
                    }}
                    connectionId={dialogStates.createDevice.connectionId}
                    storageGroup={dialogStates.createDevice.storageGroup}
                />
            )}

            {/* IoTDB 创建时间序列对话框 */}
            {dialogStates.createTimeseries && (
                <CreateTimeseriesDialog
                    open={dialogStates.createTimeseries.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            createTimeseries: {
                                open: false,
                                connectionId: '',
                                devicePath: '',
                            },
                        }));
                    }}
                    onSuccess={() => {
                        // 使用局部刷新而不是全局刷新
                        const devicePath = dialogStates.createTimeseries?.devicePath;
                        if (devicePath && refreshNode) {
                            // 延迟刷新，确保后端已完成创建操作
                            setTimeout(() => {
                                // 从设备路径提取设备节点 ID
                                // 例如: root.sg1.device1 -> device_root_sg1_device1
                                const deviceNodeId = `device_${devicePath.replace(/\./g, '_')}`;
                                refreshNode(deviceNodeId);
                            }, 300);
                        } else {
                            // 降级到全局刷新
                            setTimeout(() => {
                                buildCompleteTreeData(true);
                            }, 300);
                        }
                    }}
                    connectionId={dialogStates.createTimeseries.connectionId}
                    devicePath={dialogStates.createTimeseries.devicePath}
                />
            )}

            {/* IoTDB 设备列表对话框 */}
            {dialogStates.deviceList && (
                <DeviceListDialog
                    open={dialogStates.deviceList.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            deviceList: {
                                open: false,
                                connectionId: '',
                                storageGroup: '',
                                devices: [],
                            },
                        }));
                    }}
                    connectionId={dialogStates.deviceList.connectionId}
                    storageGroup={dialogStates.deviceList.storageGroup}
                    devices={dialogStates.deviceList.devices}
                />
            )}

            {/* IoTDB 设备信息对话框 */}
            {dialogStates.deviceInfo && (
                <DeviceInfoDialog
                    open={dialogStates.deviceInfo.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            deviceInfo: {
                                open: false,
                                connectionId: '',
                                devicePath: '',
                                info: null,
                            },
                        }));
                    }}
                    connectionId={dialogStates.deviceInfo.connectionId}
                    devicePath={dialogStates.deviceInfo.devicePath}
                    info={dialogStates.deviceInfo.info}
                />
            )}

            {/* IoTDB 时间序列信息对话框 */}
            {dialogStates.timeseriesInfo && (
                <TimeseriesInfoDialog
                    open={dialogStates.timeseriesInfo.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            timeseriesInfo: {
                                open: false,
                                connectionId: '',
                                timeseriesPath: '',
                                info: null,
                            },
                        }));
                    }}
                    connectionId={dialogStates.timeseriesInfo.connectionId}
                    timeseriesPath={dialogStates.timeseriesInfo.timeseriesPath}
                    info={dialogStates.timeseriesInfo.info}
                />
            )}

            {/* 表数据导出对话框 */}
            {dialogStates.exportData && (
                <TableExportDialog
                    open={dialogStates.exportData.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            exportData: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                                dbType: '',
                            },
                        }));
                    }}
                    connectionId={dialogStates.exportData.connectionId}
                    database={dialogStates.exportData.database}
                    table={dialogStates.exportData.table}
                    dbType={dialogStates.exportData.dbType}
                />
            )}

            {/* 表数据导入对话框 */}
            {dialogStates.importData && (
                <TableImportDialog
                    open={dialogStates.importData.open}
                    onClose={() => {
                        setDialogStates((prev) => ({
                            ...prev,
                            importData: {
                                open: false,
                                connectionId: '',
                                database: '',
                                table: '',
                                dbType: '',
                            },
                        }));
                    }}
                    onSuccess={() => {
                        // 延迟刷新树形数据，确保后端已完成导入操作
                        setTimeout(() => {
                            buildCompleteTreeData(true);
                        }, 300);
                    }}
                    connectionId={dialogStates.importData.connectionId}
                    database={dialogStates.importData.database}
                    table={dialogStates.importData.table}
                    dbType={dialogStates.importData.dbType}
                />
            )}
        </>
    );
};

