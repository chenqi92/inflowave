import { useState, useRef } from 'react';
import type { ConnectionConfig } from '@/types';
import type {
    DataNode,
    DialogStates,
    DatabaseInfoDialogState,
    RetentionPolicyDialogState,
    ManagementNodeDialogState,
    ContextMenuPosition,
} from '@/types/databaseExplorer';
import type { TreeNodeData } from '@/components/database/TreeNodeRenderer';

/**
 * Custom hook for managing database explorer component state
 */
export const useDatabaseExplorerState = () => {
    // ============================================================================
    // UI State
    // ============================================================================
    const [isNarrow, setIsNarrow] = useState(false);
    const headerRef = useRef<HTMLDivElement>(null);

    // ============================================================================
    // Tree State
    // ============================================================================
    const [treeData, setTreeData] = useState<DataNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [hideSystemNodes, setHideSystemNodes] = useState(true);

    // ============================================================================
    // Cache State
    // ============================================================================
    const [treeNodeCache, setTreeNodeCache] = useState<Record<string, any[]>>({});
    const [databasesCache, setDatabasesCache] = useState<Map<string, string[]>>(new Map());

    // ============================================================================
    // Loading State
    // ============================================================================
    const [loading, setLoading] = useState(false);
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
    const [connectionLoadingStates, setConnectionLoadingStates] = useState<Map<string, boolean>>(new Map());
    const [databaseLoadingStates, setDatabaseLoadingStates] = useState<Map<string, boolean>>(new Map());

    // ============================================================================
    // Error State
    // ============================================================================
    const [connectionErrors, setConnectionErrors] = useState<Map<string, string>>(new Map());
    const [databaseErrors, setDatabaseErrors] = useState<Map<string, string>>(new Map());

    // ============================================================================
    // Dialog State
    // ============================================================================
    const [dialogStates, setDialogStates] = useState<DialogStates>({
        designer: { open: false, connectionId: '', database: '', tableName: '' },
        info: { open: false, connectionId: '', database: '', tableName: '' },
    });

    const [isConnectionDialogVisible, setIsConnectionDialogVisible] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

    const [createDatabaseDialogOpen, setCreateDatabaseDialogOpen] = useState(false);
    const [databaseInfoDialog, setDatabaseInfoDialog] = useState<DatabaseInfoDialogState>({
        open: false,
        databaseName: '',
    });
    const [retentionPolicyDialog, setRetentionPolicyDialog] = useState<RetentionPolicyDialogState>({
        open: false,
        mode: 'create',
        database: '',
        policy: null,
    });
    const [managementNodeDialog, setManagementNodeDialog] = useState<ManagementNodeDialogState>({
        open: false,
        connectionId: '',
        nodeType: '',
        nodeName: '',
        nodeCategory: '',
    });

    // ============================================================================
    // Context Menu State
    // ============================================================================
    const [contextMenuTarget, setContextMenuTarget] = useState<TreeNodeData | null>(null);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

    // ============================================================================
    // Refs
    // ============================================================================
    const nodeRefsMap = useRef<Map<string, HTMLElement>>(new Map());
    const contextMenuOpenRef = useRef(false);
    const renderCountRef = useRef(0);

    // ============================================================================
    // Other State
    // ============================================================================
    const [_updateTimeouts, setUpdateTimeouts] = useState<Map<string, number>>(new Map());

    return {
        // UI State
        isNarrow,
        setIsNarrow,
        headerRef,

        // Tree State
        treeData,
        setTreeData,
        expandedKeys,
        setExpandedKeys,
        searchValue,
        setSearchValue,
        selectedKeys,
        setSelectedKeys,
        hideSystemNodes,
        setHideSystemNodes,

        // Cache State
        treeNodeCache,
        setTreeNodeCache,
        databasesCache,
        setDatabasesCache,

        // Loading State
        loading,
        setLoading,
        loadingNodes,
        setLoadingNodes,
        connectionLoadingStates,
        setConnectionLoadingStates,
        databaseLoadingStates,
        setDatabaseLoadingStates,

        // Error State
        connectionErrors,
        setConnectionErrors,
        databaseErrors,
        setDatabaseErrors,

        // Dialog State
        dialogStates,
        setDialogStates,
        isConnectionDialogVisible,
        setIsConnectionDialogVisible,
        editingConnection,
        setEditingConnection,
        createDatabaseDialogOpen,
        setCreateDatabaseDialogOpen,
        databaseInfoDialog,
        setDatabaseInfoDialog,
        retentionPolicyDialog,
        setRetentionPolicyDialog,
        managementNodeDialog,
        setManagementNodeDialog,

        // Context Menu State
        contextMenuTarget,
        setContextMenuTarget,
        contextMenuOpen,
        setContextMenuOpen,
        contextMenuPosition,
        setContextMenuPosition,

        // Refs
        nodeRefsMap,
        contextMenuOpenRef,
        renderCountRef,

        // Other State
        _updateTimeouts,
        setUpdateTimeouts,
    };
};

