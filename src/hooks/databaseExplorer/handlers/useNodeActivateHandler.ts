import { useCallback } from 'react';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import logger from '@/utils/logger';
import type {
    ManagementNodeDialogState,
    ConnectionDetailDialogState
} from '@/types/databaseExplorer';

interface UseNodeActivateHandlerProps {
    onCreateDataBrowserTab?: (connectionId: string, database: string, table: string) => void;
    openDatabase: (connectionId: string, database: string) => void;
    setManagementNodeDialog: React.Dispatch<React.SetStateAction<ManagementNodeDialogState>>;
    setConnectionDetailDialog: React.Dispatch<React.SetStateAction<ConnectionDetailDialogState>>;
    setContextMenuOpen: (open: boolean) => void;
    contextMenuOpenRef: React.MutableRefObject<boolean>;
}

/**
 * Custom hook for handling node activation (double-click)
 */
export const useNodeActivateHandler = ({
    onCreateDataBrowserTab,
    openDatabase,
    setManagementNodeDialog,
    setConnectionDetailDialog,
    setContextMenuOpen,
    contextMenuOpenRef,
}: UseNodeActivateHandlerProps) => {
    // ============================================================================
    // Node Activate Handler (Double-click)
    // ============================================================================
    const handleNodeActivate = useCallback(async (node: any) => {
        logger.debug('🖱️ 双击节点:', node);

        // 关闭右键菜单（使用 ref 避免依赖 contextMenuOpen）
        if (contextMenuOpenRef.current) {
            setContextMenuOpen(false);
        }

        const nodeType = node.nodeType;
        const metadata = node.metadata || {};
        const connectionId = metadata.connectionId || '';
        const database = metadata.database || metadata.databaseName || '';
        const table = metadata.table || metadata.tableName || '';

        // 数据库节点：双击打开数据库
        if (nodeType === 'database' || nodeType === 'system_database') {
            logger.info(`📂 [DatabaseExplorer] 双击数据库节点，打开数据库: ${database}`);
            // 使用 getState() 访问最新数据，避免依赖 openedDatabasesSet
            const key = `${connectionId}/${database}`;
            const openedDatabases = useOpenedDatabasesStore.getState().openedDatabases;
            if (!openedDatabases.has(key)) {
                openDatabase(connectionId, database);
                showMessage.success(`已打开数据库 "${database}"`);
            } else {
                logger.info(`📂 [DatabaseExplorer] 数据库已打开，跳过: ${database}`);
            }
            return;
        }

        // InfluxDB 2.x Organization 节点：双击打开 organization
        if (nodeType === 'organization') {
            const organization = node.name;
            logger.info(`📂 [DatabaseExplorer] 双击 Organization 节点，打开 Organization: ${organization}`);
            const { openOrganization, isOrganizationOpened } = useOpenedDatabasesStore.getState();
            if (!isOrganizationOpened(connectionId, organization)) {
                openOrganization(connectionId, organization);
                showMessage.success(`已打开 Organization "${organization}"`);
            } else {
                logger.info(`📂 [DatabaseExplorer] Organization 已打开，跳过: ${organization}`);
            }
            return;
        }

        // InfluxDB 2.x Bucket 节点：双击打开 bucket
        if (nodeType === 'bucket' || nodeType === 'system_bucket') {
            const bucket = node.name;
            const organization = metadata.organization || '';
            logger.info(`📂 [DatabaseExplorer] 双击 Bucket 节点，打开 Bucket: ${bucket}, Organization: ${organization}`);
            const { openBucket, isBucketOpened } = useOpenedDatabasesStore.getState();
            if (!isBucketOpened(connectionId, organization, bucket)) {
                openBucket(connectionId, organization, bucket);
                showMessage.success(`已打开 Bucket "${bucket}"`);
            } else {
                logger.info(`📂 [DatabaseExplorer] Bucket 已打开，跳过: ${bucket}`);
            }
            return;
        }

        // 容器节点（connection 等）已经由 MultiConnectionTreeView 的 handleToggle 处理
        // 这里只处理叶子节点

        if (nodeType === 'measurement' || nodeType === 'table') {
            // 表节点：创建数据浏览器标签页
            logger.info(`📊 [DatabaseExplorer] 双击表节点，打开数据浏览器: ${table}`);
            if (onCreateDataBrowserTab) {
                onCreateDataBrowserTab(connectionId, database, table);
                showMessage.success(`正在打开表 "${table}"`);
            }
        } else if (nodeType === 'timeseries' || nodeType === 'aligned_timeseries') {
            // IoTDB 时间序列节点：创建数据浏览器标签页
            if (onCreateDataBrowserTab) {
                onCreateDataBrowserTab(connectionId, database, table);
                showMessage.success(`正在打开时间序列 "${table}"`);
            }
        } else if (nodeType === 'connection') {
            // 连接节点：打开连接详情对话框
            logger.info(`🔌 [DatabaseExplorer] 双击连接节点，打开详情: ${node.name}`);
            setConnectionDetailDialog({
                open: true,
                connectionId,
            });
        } else if (
            nodeType === 'function' ||
            nodeType === 'trigger' ||
            nodeType === 'system_info' ||
            nodeType === 'version_info' ||
            nodeType === 'schema_template'
        ) {
            // 管理节点：打开详情弹框
            setManagementNodeDialog({
                open: true,
                connectionId,
                nodeType,
                nodeName: node.name,
                nodeCategory: 'management',
            });
        } else {
            logger.debug(`ℹ️ 节点类型 ${nodeType} 的双击行为由 handleToggle 处理`);
        }
    }, [
        onCreateDataBrowserTab,
        openDatabase,
        setManagementNodeDialog,
        setConnectionDetailDialog,
        setContextMenuOpen,
        contextMenuOpenRef,
    ]);

    return {
        handleNodeActivate,
    };
};

