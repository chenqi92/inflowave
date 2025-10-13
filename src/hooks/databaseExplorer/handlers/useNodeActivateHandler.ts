import { useCallback } from 'react';
import { useOpenedDatabasesStore } from '@/stores/openedDatabasesStore';
import { showMessage } from '@/utils/message';
import type { ManagementNodeDialogState } from '@/types/databaseExplorer';

interface UseNodeActivateHandlerProps {
    onCreateDataBrowserTab?: (connectionId: string, database: string, table: string) => void;
    openDatabase: (connectionId: string, database: string) => void;
    setManagementNodeDialog: React.Dispatch<React.SetStateAction<ManagementNodeDialogState>>;
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
    setContextMenuOpen,
    contextMenuOpenRef,
}: UseNodeActivateHandlerProps) => {
    // ============================================================================
    // Node Activate Handler (Double-click)
    // ============================================================================
    const handleNodeActivate = useCallback(async (node: any) => {
        console.log('🖱️ 双击节点:', node);

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
            console.log(`📂 [DatabaseExplorer] 双击数据库节点，打开数据库: ${database}`);
            // 使用 getState() 访问最新数据，避免依赖 openedDatabasesSet
            const key = `${connectionId}/${database}`;
            const openedDatabases = useOpenedDatabasesStore.getState().openedDatabases;
            if (!openedDatabases.has(key)) {
                openDatabase(connectionId, database);
                showMessage.success(`已打开数据库 "${database}"`);
            } else {
                console.log(`📂 [DatabaseExplorer] 数据库已打开，跳过: ${database}`);
            }
            return;
        }

        // 容器节点（connection 等）已经由 MultiConnectionTreeView 的 handleToggle 处理
        // 这里只处理叶子节点

        if (nodeType === 'measurement' || nodeType === 'table') {
            // 表节点：创建数据浏览器标签页
            console.log(`📊 [DatabaseExplorer] 双击表节点，打开数据浏览器: ${table}`);
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
        } else if (nodeType === 'field' || nodeType === 'tag') {
            // 字段/标签节点：显示详情
            showMessage.info(`字段/标签: ${node.name}`);
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
                nodeType: nodeType,
                nodeName: node.name,
                nodeCategory: 'management',
            });
        } else {
            console.log(`ℹ️ 节点类型 ${nodeType} 的双击行为由 handleToggle 处理`);
        }
    }, [
        onCreateDataBrowserTab,
        openDatabase,
        setManagementNodeDialog,
        setContextMenuOpen,
        contextMenuOpenRef,
    ]);

    return {
        handleNodeActivate,
    };
};

