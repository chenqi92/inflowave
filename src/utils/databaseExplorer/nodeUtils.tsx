import React from 'react';
import { DatabaseIcon, isOpenableNode } from '@/components/common/DatabaseIcon';
import type { ConnectionConfig } from '@/types';

/**
 * Node icon configuration type
 */
export interface NodeIconConfig {
    nodeType: string;
    size: number;
    isOpen: boolean;
    className: string;
}

/**
 * 根据节点名称推断节点类型
 */
export const inferNodeTypeFromName = (nodeName: string): string => {
    // IoTDB 特殊节点名称映射
    const nameTypeMap: Record<string, string> = {
        'System Information': 'system_info',
        'Version Information': 'version_info',
        'Schema Templates': 'schema_template',
        'Functions': 'function',
        'Triggers': 'trigger',
        'Cluster Information': 'cluster_info',
        'Storage Engine Information': 'storage_engine_info',
        'Templates': 'template',
        'Device Templates': 'template',
        'Attribute Groups': 'attribute_group',
        'Attributes': 'attribute_group',
    };

    // 精确匹配
    if (nameTypeMap[nodeName]) {
        return nameTypeMap[nodeName];
    }

    // 模糊匹配
    const lowerName = nodeName.toLowerCase();
    if (lowerName.includes('function')) {
        return 'function';
    }
    if (lowerName.includes('trigger')) {
        return 'trigger';
    }
    if (lowerName.includes('user')) {
        return 'user1x';
    }
    if (lowerName.includes('privilege') || lowerName.includes('permission')) {
        return 'privilege';
    }
    if (lowerName.includes('cluster')) {
        return 'cluster_info';
    }
    if (lowerName.includes('storage') && lowerName.includes('engine')) {
        return 'storage_engine_info';
    }
    if (lowerName.includes('template')) {
        return 'template';
    }
    if (lowerName.includes('attribute')) {
        return 'attribute_group';
    }

    // 默认为存储组
    return 'storage_group';
};

/**
 * 根据连接类型确定数据库节点的图标类型
 */
export const getDatabaseNodeType = (
    connectionId: string | undefined,
    databaseName: string | undefined,
    connections: ConnectionConfig[],
    treeNodeCache: Record<string, any[]>
) => {
    if (!connectionId || !databaseName) return 'database';
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return 'database';

    const dbType = connection.dbType?.toLowerCase();

    // 根据数据库类型和名称确定节点类型
    switch (dbType) {
        case 'influxdb1':
        case 'influxdb':
            // InfluxDB 1.x 系统数据库
            if (databaseName === '_internal' || databaseName.startsWith('_')) {
                return 'system_database';
            }
            return 'database';

        case 'influxdb2':
            // InfluxDB 2.x 中第一级是 organization，第二级才是 bucket
            // 这里的 databaseName 实际上是 organization name
            return 'organization';

        case 'influxdb3':
            return 'database3x';

        case 'iotdb':
            // IoTDB 中需要从缓存的树节点信息中获取正确的节点类型
            {
                const cachedTreeNodes = treeNodeCache[connectionId as string] || [];

                const cachedNode = cachedTreeNodes.find((node: any) => {
                    return node.name === databaseName || node.id === databaseName;
                });

                if (cachedNode) {
                    // 优先使用 node_type (后端snake_case格式)，然后是 nodeType (前端camelCase格式)
                    const nodeType = cachedNode.node_type || cachedNode.nodeType;
                    if (nodeType) {
                        return nodeType;
                    }
                }
                // 根据节点名称推断类型
                return inferNodeTypeFromName(databaseName);
            }

        default:
            return 'database';
    }
};

/**
 * 根据连接类型确定表/测量节点的图标类型
 */
export const getTableNodeType = (connectionId: string | undefined, connections: ConnectionConfig[]) => {
    if (!connectionId) return 'measurement';
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) return 'measurement';

    const dbType = connection.dbType?.toLowerCase();

    switch (dbType) {
        case 'influxdb1':
        case 'influxdb':
        case 'influxdb2':
            return 'measurement';

        case 'influxdb3':
            return 'table';

        case 'iotdb':
            return 'timeseries';

        default:
            return 'measurement';
    }
};

/**
 * IoTDB 路径显示名称优化函数 - 隐藏root、折叠公共前缀、缩写中间段
 */
export const getIoTDBDisplayName = (fullPath: string, nodeType: string = '', isField: boolean = false): string => {
    if (!fullPath) return fullPath;

    const parts = fullPath.split('.');

    // 如果路径太短，直接返回
    if (parts.length <= 2) return fullPath;

    // 隐藏 root 前缀
    const processedParts = parts[0] === 'root' ? parts.slice(1) : parts;

    // 根据节点类型和路径长度进行不同的处理
    if (processedParts.length <= 2) {
        // 短路径直接显示
        return processedParts.join('.');
    } else if (processedParts.length === 3) {
        // 三段路径：storage_group.device.measurement
        if (isField || nodeType === 'timeseries') {
            // 时间序列显示最后两段：device.measurement
            return processedParts.slice(-2).join('.');
        } else {
            // 设备显示最后一段
            return processedParts[processedParts.length - 1];
        }
    } else {
        // 长路径：缩写中间段，保留前一段和后两段
        if (isField || nodeType === 'timeseries') {
            // 时间序列：storage_group...device.measurement
            const first = processedParts[0];
            const lastTwo = processedParts.slice(-2);
            return `${first}...${lastTwo.join('.')}`;
        } else if (nodeType === 'device') {
            // 设备：storage_group...device
            const first = processedParts[0];
            const last = processedParts[processedParts.length - 1];
            return `${first}...${last}`;
        } else {
            // 其他类型显示最后一段
            return processedParts[processedParts.length - 1];
        }
    }
};

/**
 * 检查是否为 IoTDB 连接的辅助函数
 */
export const isIoTDBConnection = (connectionId: string, connections: ConnectionConfig[]): boolean => {
    const connection = connections.find(c => c.id === connectionId);
    return connection?.dbType?.toLowerCase() === 'iotdb';
};

/**
 * 获取节点图标
 */
export const getNodeIcon = (nodeType: string, isOpened: boolean = false) => {
    // 节点类型映射 - 将后端返回的类型映射到我们的图标类型
    const typeMapping: Record<string, string> = {
        // 数据库类型
        'database': 'database',
        'Database': 'database',
        'system_database': 'system_database',
        'SystemDatabase': 'system_database',
        'database3x': 'database3x',
        'Database3x': 'database3x',

        // InfluxDB 2.x 类型
        'bucket': 'bucket',
        'Bucket': 'bucket',
        'system_bucket': 'system_bucket',
        'SystemBucket': 'system_bucket',
        'organization': 'organization',
        'Organization': 'organization',

        // 测量和表
        'measurement': 'measurement',
        'Measurement': 'measurement',
        'table': 'table',
        'Table': 'table',

        // IoTDB 类型 - 修复图标一致性问题，确保每种类型都有正确的图标
        'storage_group': 'storage_group',
        'StorageGroup': 'storage_group',
        'device': 'device',
        'Device': 'device',
        'timeseries': 'timeseries',
        'TimeSeries': 'timeseries',
        'Timeseries': 'timeseries',
        'aligned_timeseries': 'aligned_timeseries',
        'AlignedTimeSeries': 'aligned_timeseries',
        'AlignedTimeseries': 'aligned_timeseries',
        'template': 'template',
        'Template': 'template',
        'system_info': 'system_info',
        'SystemInfo': 'system_info',
        'version_info': 'version_info',
        'VersionInfo': 'version_info',
        'schema_template': 'schema_template',
        'SchemaTemplate': 'schema_template',
        // IoTDB 管理节点类型映射 - 确保不同类型有不同图标
        'Function': 'function',
        'FunctionGroup': 'function_group',
        'Trigger': 'trigger',
        'TriggerGroup': 'trigger_group',
        'User': 'user1x',
        'UserGroup': 'user_group',
        'Privilege': 'privilege',
        'PrivilegeGroup': 'privilege',

        // 字段和标签
        'field': 'field',
        'Field': 'field',
        'tag': 'tag',
        'Tag': 'tag',
        'column': 'column',
        'Column': 'column',

        // 用户和权限
        'user1x': 'user1x',
        'user2x': 'user2x',
        'authorization': 'authorization',
        'Authorization': 'authorization',

        // 其他类型
        'index': 'index',
        'Index': 'index',
        'view': 'view',
        'View': 'view',
        'schema': 'schema',
        'Schema': 'schema',
        'namespace': 'namespace',
        'Namespace': 'namespace',
        'function': 'function',
        'procedure': 'procedure',
        'Procedure': 'procedure',
        'trigger': 'trigger',
        'storage_engine_info': 'storage_engine_info',
        'StorageEngineInfo': 'storage_engine_info',
        'cluster_info': 'cluster_info',
        'ClusterInfo': 'cluster_info',
        'data_type': 'data_type',
        'DataType': 'data_type',
        'encoding': 'encoding',
        'Encoding': 'encoding',
        'compression': 'compression',
        'Compression': 'compression',
    };

    // 获取映射后的类型，如果没有映射则使用原类型的小写版本
    const mappedType = typeMapping[nodeType] || nodeType.toLowerCase().replace(/([a-z])([A-Z])/g, '$1_$2');
    const colorClass = isOpened ? 'text-purple-600' : 'text-muted-foreground';

    // 只对可打开的节点使用 isOpen 状态
    const canOpen = isOpenableNode(mappedType as any);

    return (
        <DatabaseIcon
            nodeType={mappedType as any}
            size={16}
            isOpen={canOpen && isOpened}
            className={colorClass}
        />
    );
};

