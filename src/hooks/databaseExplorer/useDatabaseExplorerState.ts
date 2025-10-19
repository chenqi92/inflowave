import { useState, useRef, useReducer, useCallback } from 'react';
import type { ConnectionConfig } from '@/types';
import type {
    DataNode,
    DialogStates,
    DatabaseInfoDialogState,
    RetentionPolicyDialogState,
    ManagementNodeDialogState,
    ConnectionDetailDialogState,
    FieldDetailDialogState,
    TagDetailDialogState,
    ContextMenuPosition,
} from '@/types/databaseExplorer';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';

// 🔧 定义状态类型
interface DatabaseExplorerState {
    // UI State
    isNarrow: boolean;

    // Tree State
    treeData: DataNode[];
    expandedKeys: React.Key[];
    searchValue: string;
    selectedKeys: string[];
    hideSystemNodes: boolean;

    // Cache State
    treeNodeCache: Record<string, any[]>;
    databasesCache: Map<string, string[]>;

    // Loading State
    loading: boolean;
    loadingNodes: Set<string>;
    connectionLoadingStates: Map<string, boolean>;
    databaseLoadingStates: Map<string, boolean>;

    // Error State
    connectionErrors: Map<string, string>;
    databaseErrors: Map<string, string>;

    // Dialog State
    dialogStates: DialogStates;
    isConnectionDialogVisible: boolean;
    editingConnection: ConnectionConfig | null;
    createDatabaseDialogOpen: boolean;
    databaseInfoDialog: DatabaseInfoDialogState;
    retentionPolicyDialog: RetentionPolicyDialogState;
    managementNodeDialog: ManagementNodeDialogState;
    connectionDetailDialog: ConnectionDetailDialogState;
    fieldDetailDialog: FieldDetailDialogState;
    tagDetailDialog: TagDetailDialogState;

    // Context Menu State
    contextMenuTarget: TreeNodeData | null;
    contextMenuOpen: boolean;
    contextMenuPosition: ContextMenuPosition;

    // Other State
    _updateTimeouts: Map<string, number>;
}

// 🔧 定义 action 类型
type DatabaseExplorerAction =
    | { type: 'SET_IS_NARROW'; payload: boolean }
    | { type: 'SET_TREE_DATA'; payload: DataNode[] }
    | { type: 'SET_EXPANDED_KEYS'; payload: React.Key[] }
    | { type: 'SET_SEARCH_VALUE'; payload: string }
    | { type: 'SET_SELECTED_KEYS'; payload: string[] }
    | { type: 'SET_HIDE_SYSTEM_NODES'; payload: boolean }
    | { type: 'SET_TREE_NODE_CACHE'; payload: Record<string, any[]> }
    | { type: 'SET_DATABASES_CACHE'; payload: Map<string, string[]> }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_LOADING_NODES'; payload: Set<string> }
    | { type: 'SET_CONNECTION_LOADING_STATES'; payload: Map<string, boolean> }
    | { type: 'SET_DATABASE_LOADING_STATES'; payload: Map<string, boolean> }
    | { type: 'SET_CONNECTION_ERRORS'; payload: Map<string, string> }
    | { type: 'SET_DATABASE_ERRORS'; payload: Map<string, string> }
    | { type: 'SET_DIALOG_STATES'; payload: DialogStates }
    | { type: 'SET_IS_CONNECTION_DIALOG_VISIBLE'; payload: boolean }
    | { type: 'SET_EDITING_CONNECTION'; payload: ConnectionConfig | null }
    | { type: 'SET_CREATE_DATABASE_DIALOG_OPEN'; payload: boolean }
    | { type: 'SET_DATABASE_INFO_DIALOG'; payload: DatabaseInfoDialogState }
    | { type: 'SET_RETENTION_POLICY_DIALOG'; payload: RetentionPolicyDialogState }
    | { type: 'SET_MANAGEMENT_NODE_DIALOG'; payload: ManagementNodeDialogState }
    | { type: 'SET_CONNECTION_DETAIL_DIALOG'; payload: ConnectionDetailDialogState }
    | { type: 'SET_FIELD_DETAIL_DIALOG'; payload: FieldDetailDialogState }
    | { type: 'SET_TAG_DETAIL_DIALOG'; payload: TagDetailDialogState }
    | { type: 'SET_CONTEXT_MENU_TARGET'; payload: TreeNodeData | null }
    | { type: 'SET_CONTEXT_MENU_OPEN'; payload: boolean }
    | { type: 'SET_CONTEXT_MENU_POSITION'; payload: ContextMenuPosition }
    | { type: 'SET_UPDATE_TIMEOUTS'; payload: Map<string, number> }
    | { type: 'BATCH_UPDATE'; payload: Partial<DatabaseExplorerState> }; // 🔧 批量更新

// 🔧 初始状态
const initialState: DatabaseExplorerState = {
    isNarrow: false,
    treeData: [],
    expandedKeys: [],
    searchValue: '',
    selectedKeys: [],
    hideSystemNodes: true,
    treeNodeCache: {},
    databasesCache: new Map(),
    loading: false,
    loadingNodes: new Set(),
    connectionLoadingStates: new Map(),
    databaseLoadingStates: new Map(),
    connectionErrors: new Map(),
    databaseErrors: new Map(),
    dialogStates: {
        designer: { open: false, connectionId: '', database: '', tableName: '' },
        info: { open: false, connectionId: '', database: '', tableName: '' },
    },
    isConnectionDialogVisible: false,
    editingConnection: null,
    createDatabaseDialogOpen: false,
    databaseInfoDialog: {
        open: false,
        databaseName: '',
    },
    retentionPolicyDialog: {
        open: false,
        mode: 'create',
        database: '',
        policy: null,
    },
    managementNodeDialog: {
        open: false,
        connectionId: '',
        nodeType: '',
        nodeName: '',
        nodeCategory: '',
    },
    connectionDetailDialog: {
        open: false,
        connectionId: '',
    },
    fieldDetailDialog: {
        open: false,
        connectionId: '',
        database: '',
        table: '',
        field: '',
    },
    tagDetailDialog: {
        open: false,
        connectionId: '',
        database: '',
        table: '',
        tag: '',
    },
    contextMenuTarget: null,
    contextMenuOpen: false,
    contextMenuPosition: { x: 0, y: 0 },
    _updateTimeouts: new Map(),
};

// 🔧 Reducer 函数
function databaseExplorerReducer(
    state: DatabaseExplorerState,
    action: DatabaseExplorerAction
): DatabaseExplorerState {
    switch (action.type) {
        case 'SET_IS_NARROW':
            return { ...state, isNarrow: action.payload };
        case 'SET_TREE_DATA':
            return { ...state, treeData: action.payload };
        case 'SET_EXPANDED_KEYS':
            return { ...state, expandedKeys: action.payload };
        case 'SET_SEARCH_VALUE':
            return { ...state, searchValue: action.payload };
        case 'SET_SELECTED_KEYS':
            return { ...state, selectedKeys: action.payload };
        case 'SET_HIDE_SYSTEM_NODES':
            return { ...state, hideSystemNodes: action.payload };
        case 'SET_TREE_NODE_CACHE':
            return { ...state, treeNodeCache: action.payload };
        case 'SET_DATABASES_CACHE':
            return { ...state, databasesCache: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_LOADING_NODES':
            return { ...state, loadingNodes: action.payload };
        case 'SET_CONNECTION_LOADING_STATES':
            return { ...state, connectionLoadingStates: action.payload };
        case 'SET_DATABASE_LOADING_STATES':
            return { ...state, databaseLoadingStates: action.payload };
        case 'SET_CONNECTION_ERRORS':
            return { ...state, connectionErrors: action.payload };
        case 'SET_DATABASE_ERRORS':
            return { ...state, databaseErrors: action.payload };
        case 'SET_DIALOG_STATES':
            return { ...state, dialogStates: action.payload };
        case 'SET_IS_CONNECTION_DIALOG_VISIBLE':
            return { ...state, isConnectionDialogVisible: action.payload };
        case 'SET_EDITING_CONNECTION':
            return { ...state, editingConnection: action.payload };
        case 'SET_CREATE_DATABASE_DIALOG_OPEN':
            return { ...state, createDatabaseDialogOpen: action.payload };
        case 'SET_DATABASE_INFO_DIALOG':
            return { ...state, databaseInfoDialog: action.payload };
        case 'SET_RETENTION_POLICY_DIALOG':
            return { ...state, retentionPolicyDialog: action.payload };
        case 'SET_MANAGEMENT_NODE_DIALOG':
            return { ...state, managementNodeDialog: action.payload };
        case 'SET_CONNECTION_DETAIL_DIALOG':
            return { ...state, connectionDetailDialog: action.payload };
        case 'SET_FIELD_DETAIL_DIALOG':
            return { ...state, fieldDetailDialog: action.payload };
        case 'SET_TAG_DETAIL_DIALOG':
            return { ...state, tagDetailDialog: action.payload };
        case 'SET_CONTEXT_MENU_TARGET':
            return { ...state, contextMenuTarget: action.payload };
        case 'SET_CONTEXT_MENU_OPEN':
            return { ...state, contextMenuOpen: action.payload };
        case 'SET_CONTEXT_MENU_POSITION':
            return { ...state, contextMenuPosition: action.payload };
        case 'SET_UPDATE_TIMEOUTS':
            return { ...state, _updateTimeouts: action.payload };
        case 'BATCH_UPDATE':
            // 🔧 批量更新多个状态，只触发一次渲染
            return { ...state, ...action.payload };
        default:
            return state;
    }
}

/**
 * Custom hook for managing database explorer component state
 * 🔧 使用 useReducer 替代多个 useState，减少启动时的渲染次数
 */
export const useDatabaseExplorerState = () => {
    const [state, dispatch] = useReducer(databaseExplorerReducer, initialState);
    const headerRef = useRef<HTMLDivElement>(null);

    // ============================================================================
    // Refs
    // ============================================================================
    const nodeRefsMap = useRef<Map<string, HTMLElement>>(new Map());
    const contextMenuOpenRef = useRef(false);
    const renderCountRef = useRef(0);

    // 🔧 创建稳定的 setter 函数，使用 useCallback 包装
    const setIsNarrow = useCallback((value: boolean) => {
        dispatch({ type: 'SET_IS_NARROW', payload: value });
    }, []);

    const setTreeData = useCallback((value: DataNode[]) => {
        dispatch({ type: 'SET_TREE_DATA', payload: value });
    }, []);

    const setExpandedKeys = useCallback((value: React.Key[] | ((prev: React.Key[]) => React.Key[])) => {
        if (typeof value === 'function') {
            const newValue = value(stateRef.current.expandedKeys);
            dispatch({ type: 'SET_EXPANDED_KEYS', payload: newValue });
        } else {
            dispatch({ type: 'SET_EXPANDED_KEYS', payload: value });
        }
    }, []);

    const setSearchValue = useCallback((value: string) => {
        dispatch({ type: 'SET_SEARCH_VALUE', payload: value });
    }, []);

    const setSelectedKeys = useCallback((value: string[] | ((prev: string[]) => string[])) => {
        if (typeof value === 'function') {
            const newValue = value(stateRef.current.selectedKeys);
            dispatch({ type: 'SET_SELECTED_KEYS', payload: newValue });
        } else {
            dispatch({ type: 'SET_SELECTED_KEYS', payload: value });
        }
    }, []);

    const setHideSystemNodes = useCallback((value: boolean) => {
        dispatch({ type: 'SET_HIDE_SYSTEM_NODES', payload: value });
    }, []);

    const setTreeNodeCache = useCallback((value: Record<string, any[]>) => {
        dispatch({ type: 'SET_TREE_NODE_CACHE', payload: value });
    }, []);

    const setDatabasesCache = useCallback((value: Map<string, string[]>) => {
        dispatch({ type: 'SET_DATABASES_CACHE', payload: value });
    }, []);

    const setLoading = useCallback((value: boolean) => {
        dispatch({ type: 'SET_LOADING', payload: value });
    }, []);

    const setLoadingNodes = useCallback((value: Set<string> | ((prev: Set<string>) => Set<string>)) => {
        if (typeof value === 'function') {
            const newValue = value(stateRef.current.loadingNodes);
            dispatch({ type: 'SET_LOADING_NODES', payload: newValue });
        } else {
            dispatch({ type: 'SET_LOADING_NODES', payload: value });
        }
    }, []);

    const setConnectionLoadingStates = useCallback((value: Map<string, boolean> | ((prev: Map<string, boolean>) => Map<string, boolean>)) => {
        if (typeof value === 'function') {
            const newValue = value(stateRef.current.connectionLoadingStates);
            dispatch({ type: 'SET_CONNECTION_LOADING_STATES', payload: newValue });
        } else {
            dispatch({ type: 'SET_CONNECTION_LOADING_STATES', payload: value });
        }
    }, []);

    const setDatabaseLoadingStates = useCallback((value: Map<string, boolean> | ((prev: Map<string, boolean>) => Map<string, boolean>)) => {
        if (typeof value === 'function') {
            const newValue = value(stateRef.current.databaseLoadingStates);
            dispatch({ type: 'SET_DATABASE_LOADING_STATES', payload: newValue });
        } else {
            dispatch({ type: 'SET_DATABASE_LOADING_STATES', payload: value });
        }
    }, []);

    // 🔧 使用 useRef 保存最新的 state，以便在 setter 中访问
    const stateRef = useRef(state);
    stateRef.current = state;

    const setConnectionErrors = useCallback((value: Map<string, string> | ((prev: Map<string, string>) => Map<string, string>)) => {
        if (typeof value === 'function') {
            // 如果是函数，使用当前状态调用函数获取新值
            const newValue = value(stateRef.current.connectionErrors);
            dispatch({ type: 'SET_CONNECTION_ERRORS', payload: newValue });
        } else {
            dispatch({ type: 'SET_CONNECTION_ERRORS', payload: value });
        }
    }, []);

    const setDatabaseErrors = useCallback((value: Map<string, string> | ((prev: Map<string, string>) => Map<string, string>)) => {
        if (typeof value === 'function') {
            // 如果是函数，使用当前状态调用函数获取新值
            const newValue = value(stateRef.current.databaseErrors);
            dispatch({ type: 'SET_DATABASE_ERRORS', payload: newValue });
        } else {
            dispatch({ type: 'SET_DATABASE_ERRORS', payload: value });
        }
    }, []);

    const setDialogStates = useCallback((value: DialogStates) => {
        dispatch({ type: 'SET_DIALOG_STATES', payload: value });
    }, []);

    const setIsConnectionDialogVisible = useCallback((value: boolean) => {
        dispatch({ type: 'SET_IS_CONNECTION_DIALOG_VISIBLE', payload: value });
    }, []);

    const setEditingConnection = useCallback((value: ConnectionConfig | null) => {
        dispatch({ type: 'SET_EDITING_CONNECTION', payload: value });
    }, []);

    const setCreateDatabaseDialogOpen = useCallback((value: boolean) => {
        dispatch({ type: 'SET_CREATE_DATABASE_DIALOG_OPEN', payload: value });
    }, []);

    const setDatabaseInfoDialog = useCallback((value: DatabaseInfoDialogState) => {
        dispatch({ type: 'SET_DATABASE_INFO_DIALOG', payload: value });
    }, []);

    const setRetentionPolicyDialog = useCallback((value: RetentionPolicyDialogState) => {
        dispatch({ type: 'SET_RETENTION_POLICY_DIALOG', payload: value });
    }, []);

    const setManagementNodeDialog = useCallback((value: ManagementNodeDialogState) => {
        dispatch({ type: 'SET_MANAGEMENT_NODE_DIALOG', payload: value });
    }, []);

    const setConnectionDetailDialog = useCallback((value: ConnectionDetailDialogState) => {
        dispatch({ type: 'SET_CONNECTION_DETAIL_DIALOG', payload: value });
    }, []);

    const setFieldDetailDialog = useCallback((value: FieldDetailDialogState) => {
        dispatch({ type: 'SET_FIELD_DETAIL_DIALOG', payload: value });
    }, []);

    const setTagDetailDialog = useCallback((value: TagDetailDialogState) => {
        dispatch({ type: 'SET_TAG_DETAIL_DIALOG', payload: value });
    }, []);

    const setContextMenuTarget = useCallback((value: TreeNodeData | null) => {
        dispatch({ type: 'SET_CONTEXT_MENU_TARGET', payload: value });
    }, []);

    const setContextMenuOpen = useCallback((value: boolean) => {
        dispatch({ type: 'SET_CONTEXT_MENU_OPEN', payload: value });
    }, []);

    const setContextMenuPosition = useCallback((value: ContextMenuPosition) => {
        dispatch({ type: 'SET_CONTEXT_MENU_POSITION', payload: value });
    }, []);

    const setUpdateTimeouts = useCallback((value: Map<string, number>) => {
        dispatch({ type: 'SET_UPDATE_TIMEOUTS', payload: value });
    }, []);

    // 🔧 批量更新函数，用于一次性更新多个状态
    const batchUpdate = useCallback((updates: Partial<DatabaseExplorerState>) => {
        dispatch({ type: 'BATCH_UPDATE', payload: updates });
    }, []);

    return {
        // UI State
        isNarrow: state.isNarrow,
        setIsNarrow,
        headerRef,

        // Tree State
        treeData: state.treeData,
        setTreeData,
        expandedKeys: state.expandedKeys,
        setExpandedKeys,
        searchValue: state.searchValue,
        setSearchValue,
        selectedKeys: state.selectedKeys,
        setSelectedKeys,
        hideSystemNodes: state.hideSystemNodes,
        setHideSystemNodes,

        // Cache State
        treeNodeCache: state.treeNodeCache,
        setTreeNodeCache,
        databasesCache: state.databasesCache,
        setDatabasesCache,

        // Loading State
        loading: state.loading,
        setLoading,
        loadingNodes: state.loadingNodes,
        setLoadingNodes,
        connectionLoadingStates: state.connectionLoadingStates,
        setConnectionLoadingStates,
        databaseLoadingStates: state.databaseLoadingStates,
        setDatabaseLoadingStates,

        // Error State
        connectionErrors: state.connectionErrors,
        setConnectionErrors,
        databaseErrors: state.databaseErrors,
        setDatabaseErrors,

        // Dialog State
        dialogStates: state.dialogStates,
        setDialogStates,
        isConnectionDialogVisible: state.isConnectionDialogVisible,
        setIsConnectionDialogVisible,
        editingConnection: state.editingConnection,
        setEditingConnection,
        createDatabaseDialogOpen: state.createDatabaseDialogOpen,
        setCreateDatabaseDialogOpen,
        databaseInfoDialog: state.databaseInfoDialog,
        setDatabaseInfoDialog,
        retentionPolicyDialog: state.retentionPolicyDialog,
        setRetentionPolicyDialog,
        managementNodeDialog: state.managementNodeDialog,
        setManagementNodeDialog,
        connectionDetailDialog: state.connectionDetailDialog,
        setConnectionDetailDialog,
        fieldDetailDialog: state.fieldDetailDialog,
        setFieldDetailDialog,
        tagDetailDialog: state.tagDetailDialog,
        setTagDetailDialog,

        // Context Menu State
        contextMenuTarget: state.contextMenuTarget,
        setContextMenuTarget,
        contextMenuOpen: state.contextMenuOpen,
        setContextMenuOpen,
        contextMenuPosition: state.contextMenuPosition,
        setContextMenuPosition,

        // Refs
        nodeRefsMap,
        contextMenuOpenRef,
        renderCountRef,

        // Other State
        _updateTimeouts: state._updateTimeouts,
        setUpdateTimeouts,

        // 🔧 批量更新函数
        batchUpdate,
    };
};

