/**
 * Path construction utilities for database explorer
 */

/**
 * 构建连接路径
 */
export const buildConnectionPath = (connectionId: string): string => {
    return connectionId;
};

/**
 * 构建数据库路径
 */
export const buildDatabasePath = (connectionId: string, database: string): string => {
    return `${connectionId}/${database}`;
};

/**
 * 构建表路径
 */
export const buildTablePath = (connectionId: string, database: string, table: string): string => {
    return `${connectionId}/${database}/${table}`;
};

/**
 * 构建字段路径
 */
export const buildFieldPath = (connectionId: string, database: string, table: string, field: string): string => {
    return `${connectionId}/${database}/${table}/${field}`;
};

/**
 * 构建标签路径
 */
export const buildTagPath = (connectionId: string, database: string, table: string, tag: string): string => {
    return `${connectionId}/${database}/${table}/tags/${tag}`;
};

/**
 * 从节点 key 解析路径
 */
export const parseNodeKeyToPath = (nodeKey: string): string => {
    if (String(nodeKey).startsWith('connection-')) {
        const connectionId = String(nodeKey).replace('connection-', '');
        return buildConnectionPath(connectionId);
    } else if (String(nodeKey).startsWith('database|')) {
        const [, connectionId, database] = String(nodeKey).split('|');
        return buildDatabasePath(connectionId, database);
    } else if (String(nodeKey).startsWith('table|')) {
        const [, connectionId, database, table] = String(nodeKey).split('|');
        return buildTablePath(connectionId, database, table);
    } else if (String(nodeKey).startsWith('field|')) {
        const [, connectionId, database, table, field] = String(nodeKey).split('|');
        return buildFieldPath(connectionId, database, table, field);
    } else if (String(nodeKey).startsWith('tag|')) {
        const [, connectionId, database, table, tag] = String(nodeKey).split('|');
        return buildTagPath(connectionId, database, table, tag);
    }
    return '';
};

/**
 * 从节点 key 提取 connectionId
 */
export const extractConnectionIdFromKey = (nodeKey: string): string => {
    if (String(nodeKey).startsWith('connection-')) {
        return String(nodeKey).replace('connection-', '');
    } else if (String(nodeKey).includes('|')) {
        const [, connId] = String(nodeKey).split('|');
        return connId;
    }
    return '';
};

