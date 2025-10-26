import React from 'react';

/**
 * Tree node data structure for the database explorer tree
 */
export interface DataNode {
    key: string;
    title: React.ReactNode;
    children?: DataNode[];
    icon?: React.ReactNode;
    isLeaf?: boolean;
    disabled?: boolean;
    selectable?: boolean;
    checkable?: boolean;
}

/**
 * Menu properties for context menus
 */
export interface MenuProps {
    items?: Array<{
        key: string;
        label?: React.ReactNode;
        icon?: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        type?: 'divider' | 'group';
    }>;
}

/**
 * Time range configuration
 */
export interface TimeRange {
    label: string;
    value: string;
    start: string;
    end: string;
}

/**
 * Props for the DatabaseExplorer component
 */
export interface DatabaseExplorerProps {
    collapsed?: boolean;
    refreshTrigger?: number; // 用于触发刷新
    onTableDoubleClick?: (database: string, table: string, query: string) => void; // 表格双击回调（保留兼容性）
    onCreateDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void; // 创建数据浏览tab回调
    onCreateQueryTab?: (query?: string, database?: string, connectionId?: string) => void; // 创建查询标签页回调
    onCreateAndExecuteQuery?: (query: string, database: string, connectionId?: string) => void; // 创建查询标签页并自动执行回调
    onViewChange?: (view: string) => void; // 视图切换回调
    onGetCurrentView?: () => string; // 获取当前视图回调
    onExpandedDatabasesChange?: (databases: string[]) => void; // 已展开数据库列表变化回调
    onEditConnection?: (connection: any) => void; // 编辑连接回调
    currentTimeRange?: TimeRange; // 当前时间范围
}

/**
 * Dialog states for table designer and info dialogs
 */
export interface DialogStates {
    designer: {
        open: boolean;
        connectionId: string;
        database: string;
        tableName: string;
    };
    info: {
        open: boolean;
        connectionId: string;
        database: string;
        tableName: string;
    };
    iotdbTemplate?: {
        open: boolean;
        connectionId: string;
        mode: 'list' | 'create' | 'mount';
        devicePath?: string;
    };
    queryBuilder?: {
        open: boolean;
        connectionId: string;
        database: string;
        table: string;
    };
    createDatabase?: {
        open: boolean;
        connectionId: string;
    };
    tableList?: {
        open: boolean;
        connectionId: string;
        database: string;
        tables: string[];
    };
}

/**
 * Database info dialog state
 */
export interface DatabaseInfoDialogState {
    open: boolean;
    databaseName: string;
}

/**
 * Retention policy dialog state
 */
export interface RetentionPolicyDialogState {
    open: boolean;
    mode: 'create' | 'edit';
    database: string;
    policy: any | null;
}

/**
 * Management node dialog state
 */
export interface ManagementNodeDialogState {
    open: boolean;
    connectionId: string;
    nodeType: string;
    nodeName: string;
    nodeCategory: string;
}

/**
 * Connection detail dialog state
 */
export interface ConnectionDetailDialogState {
    open: boolean;
    connectionId: string;
}

/**
 * Context menu position
 */
export interface ContextMenuPosition {
    x: number;
    y: number;
}

