import type { ConnectionConfig } from '@/types';
import type { TimeRange } from '@/types/databaseExplorer';

/**
 * 生成时间条件语句（使用当前选择的时间范围）
 */
export const generateTimeCondition = (currentTimeRange?: TimeRange): string => {
    if (
        currentTimeRange &&
        currentTimeRange.value !== 'none' &&
        currentTimeRange.start &&
        currentTimeRange.end
    ) {
        // 使用当前选择的时间范围
        if (currentTimeRange.end === 'now()') {
            return `time >= ${currentTimeRange.start}`;
        } else {
            return `time >= ${currentTimeRange.start} AND time <= ${currentTimeRange.end}`;
        }
    }
    // 如果是"不限制时间"或没有时间范围，返回空字符串
    return '';
};

/**
 * 生成带时间筛选的查询语句
 */
export const generateQueryWithTimeFilter = (
    table: string,
    connectionId: string | undefined,
    activeConnectionId: string | null,
    getConnection: (id: string) => ConnectionConfig | undefined,
    currentTimeRange?: TimeRange
): string => {
    const timeCondition = generateTimeCondition(currentTimeRange);
    const limit = 'LIMIT 500'; // 默认分页500条

    // 智能检测数据库类型并生成正确的查询
    const targetConnectionId = connectionId || activeConnectionId;
    const activeConnection = targetConnectionId ? getConnection(targetConnectionId) : null;
    const isIoTDB = table.startsWith('root.') || (activeConnection?.dbType === 'iotdb');
    const tableRef = isIoTDB ? table : `"${table}"`;

    // IoTDB不支持ORDER BY语法，需要使用不同的查询方式
    if (isIoTDB) {
        if (timeCondition) {
            return `SELECT * FROM ${tableRef} WHERE ${timeCondition} ${limit}`;
        } else {
            return `SELECT * FROM ${tableRef} ${limit}`;
        }
    } else {
        // InfluxDB查询
        const orderBy = 'ORDER BY time DESC ';
        if (timeCondition) {
            return `SELECT *
                        FROM ${tableRef}
                        WHERE ${timeCondition}
                        ${orderBy}${limit}`;
        } else {
            return `SELECT *
                        FROM ${tableRef}
                        ${orderBy}${limit}`;
        }
    }
};

