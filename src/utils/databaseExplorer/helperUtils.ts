import { showMessage } from '@/utils/message';
import type { DataNode } from '@/types/databaseExplorer';
import type { ConnectionConfig } from '@/types';
import logger from '@/utils/logger';

/**
 * 打开表设计器
 */
export const openTableDesigner = (tableInfo: { connectionId: string; database: string; table: string }) => {
    try {
        logger.debug('🔧 打开表设计器:', tableInfo);

        // 创建表设计器标签页
        const newTab = {
            id: `table-designer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `表设计器: ${tableInfo.table}`,
            content: '', // 表设计器不需要文本内容
            type: 'table-designer' as const,
            modified: false,
            saved: true,
            connectionId: tableInfo.connectionId,
            database: tableInfo.database,
            tableName: tableInfo.table,
        };

        // 通过事件通知 TabEditor 创建新标签页
        window.dispatchEvent(new CustomEvent('create-tab', {
            detail: newTab
        }));

        showMessage.success(`已打开表设计器: ${tableInfo.table}`);
    } catch (error) {
        logger.error('❌ 打开表设计器失败:', error);
        showMessage.error(`打开表设计器失败: ${error}`);
    }
};

/**
 * 打开数据库设计器
 */
export const openDatabaseDesigner = (dbInfo: { connectionId: string; database: string }) => {
    try {
        logger.debug('🗄️ 打开数据库设计器:', dbInfo);

        // 创建数据库设计器标签页
        const newTab = {
            id: `database-designer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: `数据库设计器: ${dbInfo.database}`,
            content: '', // 数据库设计器不需要文本内容
            type: 'database-designer' as const,
            modified: false,
            saved: true,
            connectionId: dbInfo.connectionId,
            database: dbInfo.database,
        };

        // 通过事件通知 TabEditor 创建新标签页
        window.dispatchEvent(new CustomEvent('create-tab', {
            detail: newTab
        }));

        showMessage.success(`已打开数据库设计器: ${dbInfo.database}`);
    } catch (error) {
        logger.error('❌ 打开数据库设计器失败:', error);
        showMessage.error(`打开数据库设计器失败: ${error}`);
    }
};

/**
 * 提取节点文本内容用于搜索
 */
export const extractTextFromNode = (
    node: DataNode,
    getConnection: (id: string) => ConnectionConfig | undefined
): string => {
    // 从key中提取实际的名称
    const key = String(node.key);
    if (key.startsWith('connection-')) {
        // 从连接store中获取连接名称
        const connectionId = key.replace('connection-', '');
        const connection = getConnection(connectionId);
        return connection?.name || '';
    } else if (key.startsWith('database|')) {
        // 提取数据库名称
        const parts = key.split('|');
        return parts[2] || '';
    } else if (key.startsWith('table|')) {
        // 提取表名称
        const parts = key.split('|');
        return parts[3] || '';
    } else if (key.startsWith('field|') || key.startsWith('tag|')) {
        // 提取字段/标签名称
        const parts = key.split('|');
        return parts[4] || '';
    }
    return '';
};

/**
 * 搜索过滤树数据
 */
export const filterTreeData = (
    data: DataNode[],
    searchValue: string,
    getConnection: (id: string) => ConnectionConfig | undefined
): DataNode[] => {
    if (!searchValue.trim()) return data;

    const filterNode = (node: DataNode): DataNode | null => {
        const nodeText = extractTextFromNode(node, getConnection);
        const titleMatch = nodeText
            .toLowerCase()
            .includes(searchValue.toLowerCase());

        let filteredChildren: DataNode[] = [];
        if (node.children) {
            filteredChildren = node.children
                .map(child => filterNode(child))
                .filter(Boolean) as DataNode[];
        }

        if (titleMatch || filteredChildren.length > 0) {
            return {
                ...node,
                children:
                    filteredChildren.length > 0 ? filteredChildren : node.children,
            };
        }

        return null;
    };

    return data.map(node => filterNode(node)).filter(Boolean) as DataNode[];
};

