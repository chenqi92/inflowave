import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Tree,
    TreeNode as UITreeNode,
    SearchInput,
    Button,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    Badge,
    Spin,
    Typography,
    Card,
    CardContent,
} from '@/components/ui';
import {
    Database,
    Table,
    RefreshCw,
    Settings,
    FileText,
    File,
    Hash,
    Tags,
    Clock,
    GitBranch,
    Star,
    StarOff,
    Plus,
    TrendingUp,
    Trash2,
    X,
    Info,
    Search,
    Edit,
    Copy,
    BarChart,
    FolderX,
} from 'lucide-react';
import {useConnectionStore} from '@/store/connection';
import {useFavoritesStore, favoritesUtils} from '@/store/favorites';
import {useOpenedDatabasesStore} from '@/stores/openedDatabasesStore';
import {SimpleConnectionDialog} from '@/components/ConnectionManager/SimpleConnectionDialog';
import type {ConnectionConfig} from '@/types';
import type {TreeNodeType, TreeNode} from '@/types/tree';
import {safeTauriInvoke} from '@/utils/tauri';
import {showMessage} from '@/utils/message';
import {writeToClipboard} from '@/utils/clipboard';
import {SimpleTreeView} from '@/components/database/SimpleTreeView';
import {DatabaseIcon, isOpenableNode} from '@/components/common/DatabaseIcon';
import CreateDatabaseDialog from '@/components/database/CreateDatabaseDialog';
import DatabaseInfoDialog from '@/components/database/DatabaseInfoDialog';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import {dialog} from '@/utils/dialog';
// DropdownMenu相关组件已移除，使用自定义右键菜单

// 导入弹框组件
import TableDesignerDialog from '@/components/database/TableDesignerDialog';
import TableInfoDialog from '@/components/database/TableInfoDialog';

// Note: Using Input directly for search functionality
// Note: Using TabsContent instead of TabPane

interface DataNode {
    key: string;
    title: React.ReactNode;
    children?: DataNode[];
    icon?: React.ReactNode;
    isLeaf?: boolean;
    disabled?: boolean;
    selectable?: boolean;
    checkable?: boolean;
}

interface MenuProps {
    items?: Array<{
        key: string;
        label?: React.ReactNode;
        icon?: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
        type?: 'divider' | 'group';
    }>;
}

interface DatabaseExplorerProps {
    collapsed?: boolean;
    refreshTrigger?: number; // 用于触发刷新
    onTableDoubleClick?: (database: string, table: string, query: string) => void; // 表格双击回调（保留兼容性）
    onCreateDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void; // 创建数据浏览tab回调
    onCreateQueryTab?: (query?: string, database?: string) => void; // 创建查询标签页回调
    onCreateAndExecuteQuery?: (query: string, database: string) => void; // 创建查询标签页并自动执行回调
    onViewChange?: (view: string) => void; // 视图切换回调
    onGetCurrentView?: () => string; // 获取当前视图回调
    onExpandedDatabasesChange?: (databases: string[]) => void; // 已展开数据库列表变化回调
    onEditConnection?: (connection: any) => void; // 编辑连接回调
    currentTimeRange?: {
        label: string;
        value: string;
        start: string;
        end: string;
    }; // 当前时间范围
}

// interface TableInfo {
//   name: string;
//   tags: string[];
//   fields: Array<{ name: string; type: string }>;
// }

// interface DatabaseInfo {
//     name: string;
//     tables: TableInfo[];
// }

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
                                                               collapsed = false,
                                                               refreshTrigger,
                                                               onTableDoubleClick,
                                                               onCreateDataBrowserTab,
                                                               onCreateQueryTab,
                                                               onCreateAndExecuteQuery,
                                                               onViewChange,
                                                               onGetCurrentView,
                                                               onExpandedDatabasesChange,
                                                               onEditConnection,
                                                               currentTimeRange,
                                                           }) => {
    // 用于检测容器宽度的 ref
    const headerRef = useRef<HTMLDivElement>(null);
    const [isNarrow, setIsNarrow] = useState(false);
    const navigate = useNavigate();
    const {
        connections,
        activeConnectionId,
        connectedConnectionIds,
        connectionStatuses,
        getConnection,
        addConnection,
        removeConnection,
        connectToDatabase,
        disconnectFromDatabase,
        getConnectionStatus,
        isConnectionConnected,
    } = useConnectionStore();
    const {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        getFavorite,
        getFavoritesByType,
        markAsAccessed,
    } = useFavoritesStore();

    // 使用全局 store 管理已打开的数据库
    const {
        openedDatabasesList,
        openDatabase,
        closeDatabase,
        closeAllDatabasesForConnection,
        isDatabaseOpened
    } = useOpenedDatabasesStore();

    const [treeData, setTreeData] = useState<DataNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [treeNodeCache, setTreeNodeCache] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(false);
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
    // 数据库列表缓存，避免重复查询
    const [databasesCache, setDatabasesCache] = useState<Map<string, string[]>>(new Map());

    // 清除指定连接的缓存
    const clearDatabasesCache = useCallback((connectionId?: string) => {
        if (connectionId) {
            setDatabasesCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(connectionId);
                return newCache;
            });
            console.log(`🗑️ 已清除连接 ${connectionId} 的数据库缓存`);
        } else {
            setDatabasesCache(new Map());
            console.log(`🗑️ 已清除所有数据库缓存`);
        }
    }, []);
    const [_connectionLoadingStates, setConnectionLoadingStates] = useState<
        Map<string, boolean>
    >(new Map());

    // 版本感知树视图状态
    const [useVersionAwareTree, setUseVersionAwareTree] = useState(false);

    const [_updateTimeouts, setUpdateTimeouts] = useState<
        Map<string, number>
    >(new Map());

    // 弹框状态管理
    const [dialogStates, setDialogStates] = useState({
        designer: {open: false, connectionId: '', database: '', tableName: ''},
        info: {open: false, connectionId: '', database: '', tableName: ''},
    });

    // 连接对话框状态
    const [isConnectionDialogVisible, setIsConnectionDialogVisible] = useState(false);
    const [editingConnection, setEditingConnection] = useState<ConnectionConfig | null>(null);

    // 数据库管理对话框状态
    const [createDatabaseDialogOpen, setCreateDatabaseDialogOpen] = useState(false);
    const [databaseInfoDialog, setDatabaseInfoDialog] = useState({
        open: false,
        databaseName: '',
    });
    const [retentionPolicyDialog, setRetentionPolicyDialog] = useState({
        open: false,
        mode: 'create' as 'create' | 'edit',
        database: '',
        policy: null as any,
    });

    const activeConnection = activeConnectionId
        ? getConnection(activeConnectionId)
        : null;
    const activeConnectionStatus = activeConnectionId
        ? connectionStatuses[activeConnectionId]
        : null;

    // 数据库状态管理函数现在来自 store，无需本地定义

    // 获取要显示的连接状态（优先显示正在连接的连接）
    const getDisplayConnectionStatus = () => {
        // 首先检查是否有正在连接的连接
        const connectingConnection = connections.find(conn => {
            if (!conn.id) return false;
            const status = connectionStatuses[conn.id];
            return status?.status === 'connecting';
        });

        if (connectingConnection && connectingConnection.id) {
            return {
                connection: connectingConnection,
                status: connectionStatuses[connectingConnection.id],
            };
        }

        // 如果没有正在连接的，显示活跃连接状态
        if (activeConnection && activeConnectionStatus) {
            return {
                connection: activeConnection,
                status: activeConnectionStatus,
            };
        }

        return null;
    };

    const displayConnectionInfo = getDisplayConnectionStatus();

    // 弹框操作辅助函数
    const openDialog = (type: 'designer' | 'info', connectionId: string, database: string, tableName: string) => {
        console.log(`🔍 打开${type}弹框:`, {connectionId, database, tableName});
        setDialogStates(prev => ({
            ...prev,
            [type]: {open: true, connectionId, database, tableName}
        }));
    };

    const closeDialog = (type: 'designer' | 'info') => {
        setDialogStates(prev => ({
            ...prev,
            [type]: {open: false, connectionId: '', database: '', tableName: ''}
        }));
    };

    // 连接对话框处理函数
    const handleOpenConnectionDialog = (connection?: ConnectionConfig) => {
        setEditingConnection(connection || null);
        setIsConnectionDialogVisible(true);
    };

    const handleCloseConnectionDialog = () => {
        setIsConnectionDialogVisible(false);
        setEditingConnection(null);
    };

    const handleConnectionSuccess = async (connection: ConnectionConfig) => {
        try {
            console.log('💾 连接保存成功:', connection.name);

            // 如果是编辑现有连接，更新连接
            if (editingConnection) {
                showMessage.success(`连接 "${connection.name}" 已更新`);
            } else {
                showMessage.success(`连接 "${connection.name}" 已创建`);
            }

            // 关闭对话框
            handleCloseConnectionDialog();

            // 简化刷新策略，避免竞态条件
            console.log('🔄 新连接保存成功，等待连接状态同步后刷新树');

            // 等待一小段时间让连接状态同步，然后刷新树
            setTimeout(async () => {
                try {
                    console.log('🔄 开始刷新数据源树以显示新连接');
                    await buildCompleteTreeData(true);
                    console.log('✅ 数据源树刷新完成');
                } catch (error) {
                    console.error('❌ 数据源树刷新失败:', error);
                }
            }, 300);

        } catch (error) {
            console.error('连接保存失败:', error);
            showMessage.error(`连接保存失败: ${error}`);
        }
    };

    // 生成时间条件语句（使用当前选择的时间范围）
    const generateTimeCondition = (): string => {
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

    // 生成带时间筛选的查询语句
    const generateQueryWithTimeFilter = (table: string): string => {
        const timeCondition = generateTimeCondition();
        const limit = 'LIMIT 500'; // 默认分页500条

        // 智能检测数据库类型并生成正确的查询
        const activeConnection = activeConnectionId ? getConnection(activeConnectionId) : null;
        const isIoTDB = table.startsWith('root.') || (activeConnection?.dbType === 'iotdb');
        const tableRef = isIoTDB ? table : `"${table}"`;
        const orderBy = isIoTDB ? '' : 'ORDER BY time DESC '; // IoTDB不需要ORDER BY

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
    };

    // 根据节点类型获取图标
    // 根据连接类型确定数据库节点的图标类型
    const getDatabaseNodeType = (connectionId: string | undefined, databaseName: string | undefined) => {
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
                // IoTDB 中数据库实际上是 storage group
                return 'storage_group';

            default:
                return 'database';
        }
    };

    // 根据连接类型确定表/测量节点的图标类型
    const getTableNodeType = (connectionId: string | undefined) => {
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

    // IoTDB 路径显示名称优化函数
    const getIoTDBDisplayName = (fullPath: string, isField: boolean = false): string => {
        if (!fullPath) return fullPath;

        // 对于字段/时间序列，显示最后两个部分（设备.传感器）
        if (isField) {
            const parts = fullPath.split('.');
            if (parts.length >= 2) {
                return parts.slice(-2).join('.');
            }
        } else {
            // 对于设备/表，显示最后一个部分
            const parts = fullPath.split('.');
            if (parts.length > 1) {
                return parts[parts.length - 1];
            }
        }

        return fullPath;
    };

    // 检查是否为 IoTDB 连接的辅助函数
    const isIoTDBConnection = (connectionId: string): boolean => {
        const connection = connections.find(c => c.id === connectionId);
        return connection?.dbType?.toLowerCase() === 'iotdb';
    };

    const getNodeIcon = (nodeType: string, isOpened: boolean = false) => {
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

            // IoTDB 类型
            'storage_group': 'storage_group',
            'StorageGroup': 'storage_group',
            'device': 'device',
            'Device': 'device',
            'timeseries': 'timeseries',
            'TimeSeries': 'timeseries',
            'aligned_timeseries': 'aligned_timeseries',
            'AlignedTimeSeries': 'aligned_timeseries',

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
            'Function': 'function',
            'procedure': 'procedure',
            'Procedure': 'procedure',
            'trigger': 'trigger',
            'Trigger': 'trigger',

            // IoTDB 管理节点 (使用现有类型替换)
            'UserGroup': 'user',
            'PrivilegeGroup': 'privilege',
            'FunctionGroup': 'function',
            'TriggerGroup': 'trigger',
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

    // 加载指定连接的数据库列表
    const loadDatabases = useCallback(
        async (connection_id: string, forceRefresh: boolean = false): Promise<string[]> => {
            // 优先使用缓存，除非强制刷新
            if (!forceRefresh && databasesCache.has(connection_id)) {
                const cachedDatabases = databasesCache.get(connection_id)!;
                console.log(`✅ 使用缓存的数据库列表，连接: ${connection_id}，数据库数量: ${cachedDatabases.length}`);
                return cachedDatabases;
            }

            console.log(`🔍 开始加载连接 ${connection_id} 的数据库列表...`);
            try {
                // 首先验证连接是否在后端存在
                const backendConnections =
                    await safeTauriInvoke<Array<{ id: string; [key: string]: unknown }>>('get_connections');
                const backendConnection = backendConnections?.find(
                    (c) => c.id === connection_id
                );

                if (!backendConnection) {
                    console.warn(
                        `⚠️ 连接 ${connection_id} 在后端不存在，尝试重新创建...`
                    );

                    // 从前端获取连接配置
                    const connection = getConnection(connection_id);
                    if (connection) {
                        try {
                            // 重新创建连接到后端
                            const connectionWithTimestamp = {
                                ...connection,
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString(),
                            };
                            const newConnectionId = await safeTauriInvoke<string>(
                                'create_connection',
                                {config: connectionWithTimestamp}
                            );
                            console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);

                            // 如果ID发生变化，需要同步到前端存储
                            if (newConnectionId !== connection_id) {
                                const newConnection = {...connection, id: newConnectionId};
                                addConnection(newConnection);
                                showMessage.warning(
                                    '连接配置已重新同步，请刷新页面或重新选择连接'
                                );
                                return [];
                            }
                        } catch (createError) {
                            console.error(`❌ 重新创建连接失败:`, createError);
                            showMessage.error(`连接 ${connection_id} 不存在且重新创建失败`);
                            return [];
                        }
                    } else {
                        console.error(`❌ 前端也没有找到连接 ${connection_id} 的配置`);
                        showMessage.error(`连接配置不存在: ${connection_id}`);
                        return [];
                    }
                }

                // 使用 get_tree_nodes 获取完整的树节点结构
                const treeNodes = await safeTauriInvoke<any[]>('get_tree_nodes', {
                    connectionId: connection_id,
                });
                console.log(`✅ 成功加载树节点:`, treeNodes);

                // 存储完整的树节点信息，用于后续的图标显示
                setTreeNodeCache(prev => ({
                    ...prev,
                    [connection_id]: treeNodes
                }));

                // 提取数据库名称用于兼容现有逻辑
                const dbList = treeNodes.map(node => node.name || node.id);
                console.log(`✅ 提取的数据库列表:`, dbList);

                // 更新缓存
                setDatabasesCache(prev => new Map(prev).set(connection_id, dbList || []));

                return dbList || [];
            } catch (error) {
                console.error(`❌ 加载连接 ${connection_id} 的数据库失败:`, error);

                // 如果是连接不存在的错误，显示更友好的消息
                const errorStr = String(error);
                if (errorStr.includes('连接') && errorStr.includes('不存在')) {
                    showMessage.error(`连接不存在，请检查连接配置: ${connection_id}`);
                } else {
                    showMessage.error(`加载数据库列表失败: ${error}`);
                }
                return [];
            }
        },
        [getConnection, addConnection, databasesCache]
    );

    // 加载指定数据库的表列表
    const loadTables = useCallback(
        async (connection_id: string, database: string): Promise<string[]> => {
            console.log(`🔍 开始加载数据库 "${database}" 的表列表...`);
            try {
                // 验证连接是否存在（简化版，因为loadDatabases已经做过验证）
                const tables = await safeTauriInvoke<string[]>('get_measurements', {
                    connectionId: connection_id,
                    database,
                });
                console.log(`✅ 成功加载表列表 (数据库: ${database}):`, tables);
                return tables || [];
            } catch (error) {
                console.error(`❌ 加载数据库 ${database} 的表失败:`, error);

                // 如果是连接不存在的错误，显示友好消息
                const errorStr = String(error);
                if (errorStr.includes('连接') && errorStr.includes('不存在')) {
                    showMessage.error(`连接不存在，无法加载数据库 ${database} 的表列表`);
                }
                return [];
            }
        },
        []
    );

    // 加载指定表的字段和标签信息
    const loadTableSchema = useCallback(
        async (
            connection_id: string,
            database: string,
            table: string
        ): Promise<{
            tags: string[];
            fields: Array<{ name: string; type: string }>;
        }> => {
            try {
                // 获取连接信息以确定数据库类型
                const connection = connections.find(c => c.id === connection_id);
                const isIoTDB = connection?.dbType?.toLowerCase() === 'iotdb';

                // 根据数据库类型决定是否获取标签信息
                const tagsPromise = isIoTDB
                    ? Promise.resolve([]) // IoTDB 不支持标签概念，直接返回空数组
                    : safeTauriInvoke<string[]>('get_tag_keys', {
                        connectionId: connection_id,
                        database,
                        measurement: table,
                    }).catch(() => []);

                // 获取字段信息（所有数据库类型都支持）
                const fieldsPromise = safeTauriInvoke<string[]>('get_field_keys', {
                    connectionId: connection_id,
                    database,
                    measurement: table,
                }).catch(() => []);

                const [tags, fields] = await Promise.all([tagsPromise, fieldsPromise]);

                // 将字段转换为带类型的格式
                const fieldsWithType = fields.map(fieldName => ({
                    name: fieldName,
                    type: isIoTDB ? 'timeseries' : 'float', // IoTDB 使用 timeseries 类型，InfluxDB 默认 float
                }));

                return {tags: tags || [], fields: fieldsWithType};
            } catch (error) {
                console.error(`加载表 ${table} 的架构失败:`, error);

                // 如果是连接不存在的错误，显示友好消息
                const errorStr = String(error);
                if (errorStr.includes('连接') && errorStr.includes('不存在')) {
                    showMessage.error(`连接不存在，无法加载表 ${table} 的架构`);
                }
                return {tags: [], fields: []};
            }
        },
        []
    );


    // 构建完整的树形数据
    const buildCompleteTreeData = useCallback(async (showGlobalLoading: boolean = true) => {
        console.log(
            `🏗️ 开始构建树形数据，已连接: [${connectedConnectionIds.join(', ')}]`
        );

        // 只在明确需要时才显示全局 loading
        if (showGlobalLoading) {
            setLoading(true);
        }

        const treeNodes: DataNode[] = [];

        for (const connection of connections) {
            if (!connection.id) continue;

            const isConnected = isConnectionConnected(connection.id);
            const connectionPath = connection.id;
            const isFav = isFavorite(connectionPath);
            const connectionStatus = getConnectionStatus(connection.id);
            // 检查是否正在连接中（从连接状态中获取）
            const isConnecting = connectionStatus?.status === 'connecting';
            // 在构建树时，只显示连接状态中的loading，不显示本地loading状态
            const showLoading = isConnecting;

            const connectionNode: DataNode = {
                title: (
                    <div className='flex items-center gap-2'>
                        <span className='flex-1'>{connection.name}</span>
                        {showLoading && (
                            <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin'/>
                        )}
                        {isFav && <Star className='w-3 h-3 text-warning fill-current'/>}
                    </div>
                ),
                key: `connection-${connection.id}`,
                icon: (
                    <DatabaseIcon
                        nodeType="connection"
                        dbType={connection.dbType || 'influxdb'}
                        isConnected={isConnected}
                        size={16}
                        className={isConnected ? 'text-success' : 'text-muted-foreground'}
                    />
                ),
                // 只有连接状态才设置children数组，未连接状态不设置（这样就不会显示收缩按钮）
                ...(isConnected ? {children: []} : {isLeaf: true}),
            };

            // 为已连接的连接加载数据库列表
            if (isConnected && connection.id) {
                console.log(`🔗 处理已连接: ${connection.name} (${connection.id})`);
                try {
                    const databases = await loadDatabases(connection.id);
                    console.log(
                        `📁 为连接 ${connection.name} 创建 ${databases.length} 个数据库节点`
                    );
                    connectionNode.children = databases.map(db => {
                        const dbPath = `${connection.id}/${db}`;
                        const isFav = isFavorite(dbPath);
                        const databaseKey = `database|${connection.id}|${db}`;
                        const isExpanded = expandedKeys.includes(databaseKey);
                        const isOpened = connection.id ? isDatabaseOpened(connection.id, db) : false;

                        const nodeData: any = {
                            title: (
                                <span className='flex items-center gap-1'>
                  {db}
                                    {isFav && (
                                        <Star className='w-3 h-3 text-warning fill-current'/>
                                    )}
                </span>
                            ),
                            key: databaseKey,
                            // 根据打开状态设置图标颜色：未打开为灰色，已打开为紫色
                            icon: (
                                <DatabaseIcon
                                    nodeType={getDatabaseNodeType(connection.id, db) as any}
                                    size={16}
                                    isOpen={isOpened}
                                    className={isOpened ? 'text-purple-600' : 'text-muted-foreground'}
                                />
                            ),
                        };

                        if (isOpened) {
                            // 已打开的数据库：设置为非叶子节点，有展开按钮和children数组
                            nodeData.isLeaf = false;
                            nodeData.children = []; // 空数组表示有子节点但未加载
                        } else {
                            // 未打开的数据库：设置为叶子节点，无展开按钮
                            nodeData.isLeaf = true;
                        }

                        return nodeData;
                    });
                } catch (error) {
                    console.error('❌ 加载数据库失败:', error);
                }
            } else {
                console.log(`⏭️ 跳过未连接: ${connection.name}`);
            }

            treeNodes.push(connectionNode);
        }

        console.log(`🌳 树形数据构建完成，共 ${treeNodes.length} 个根节点`);
        setTreeData(treeNodes);

        // 只在之前显示了全局 loading 时才清除
        if (showGlobalLoading) {
            setLoading(false);
        }
    }, [
        connections,
        connectedConnectionIds,
        isConnectionConnected,
        getConnectionStatus,
        loadDatabases,
        isFavorite,
        // 移除expandedKeys依赖，避免每次展开/收起都重建整个树
        isDatabaseOpened, // 添加数据库打开状态依赖
    ]);

    // 动态加载节点数据
    const loadData = useCallback(
        async (node: DataNode): Promise<void> => {
            const {key} = node;
            console.log(`🔄 开始动态加载节点: ${key}`);

            if (loadingNodes.has(String(key))) {
                console.log(`⏳ 节点 ${key} 正在加载中，跳过`);
                return;
            }

            setLoadingNodes(prev => new Set(prev).add(String(key)));

            // 添加超时保护
            const timeoutId = setTimeout(() => {
                console.warn(`⏰ 节点 ${key} 加载超时，强制清除loading状态`);
                setLoadingNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(String(key));
                    return newSet;
                });
                showMessage.error(`加载超时: ${key}`);
            }, 30000); // 30秒超时

            try {
                if (String(key).startsWith('database|')) {
                    // 加载表列表
                    const [, connectionId, database] = String(key).split('|', 3);
                    console.log(
                        `📋 加载数据库表列表: connectionId=${connectionId}, database=${database}`
                    );
                    const tables = await loadTables(connectionId, database);

                    const tableNodes: DataNode[] = tables.map(table => {
                        const tablePath = `${connectionId}/${database}/${table}`;
                        const isFav = isFavorite(tablePath);
                        return {
                            title: (
                                <div className='flex items-center gap-2'>
                                    <span className='flex-1'>{table}</span>
                                    {isFav && (
                                        <Star className='w-3 h-3 text-warning fill-current'/>
                                    )}
                                    <span className='text-xs text-muted-foreground flex-shrink-0'>
                    表
                  </span>
                                </div>
                            ),
                            key: `table|${connectionId}|${database}|${table}`,
                            icon: <Table className='w-4 h-4 text-success'/>,
                            isLeaf: false,
                            children: [], // 空数组表示有子节点但未加载
                        };
                    });

                    // 更新树数据
                    setTreeData(prevData => {
                        const updateNode = (nodes: DataNode[]): DataNode[] => {
                            return nodes.map(node => {
                                if (node.key === key) {
                                    return {...node, children: tableNodes};
                                }
                                if (node.children) {
                                    return {...node, children: updateNode(node.children)};
                                }
                                return node;
                            });
                        };
                        return updateNode(prevData);
                    });
                } else if (String(key).startsWith('table|')) {
                    // 加载表的字段和标签
                    const [, connectionId, database, table] = String(key).split('|', 4);
                    const {tags, fields} = await loadTableSchema(
                        connectionId,
                        database,
                        table
                    );

                    const children: DataNode[] = [];

                    // 获取连接信息以确定数据库类型
                    const isIoTDB = isIoTDBConnection(connectionId);

                    // 只为非 IoTDB 连接添加标签列（IoTDB 不支持标签概念）
                    if (!isIoTDB) {
                        tags.forEach(tag => {
                            const tagPath = `${connectionId}/${database}/${table}/tags/${tag}`;
                            const isFav = isFavorite(tagPath);
                            children.push({
                                title: (
                                    <div className='flex items-center gap-2'>
                                        <span className='flex-1'>{tag}</span>
                                        {isFav && (
                                            <Star className='w-3 h-3 text-warning fill-current'/>
                                        )}
                                        <Badge variant='secondary'
                                               className='bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 h-auto'>
                                            Tag
                                        </Badge>
                                        <span className='text-xs text-muted-foreground flex-shrink-0'>
                        string
                      </span>
                                    </div>
                                ),
                                key: `tag|${connectionId}|${database}|${table}|${tag}`,
                                icon: <Tags className='w-4 h-4 text-orange-500'/>,
                                isLeaf: true,
                            });
                        });
                    }

                    // 添加字段列（根据数据库类型显示不同的标签）
                    fields.forEach(field => {
                        const fieldPath = `${connectionId}/${database}/${table}/${field.name}`;
                        const isFav = isFavorite(fieldPath);
                        const getFieldIcon = (type: string) => {
                            switch (type.toLowerCase()) {
                                case 'number':
                                case 'float':
                                case 'integer':
                                case 'int64':
                                    return <Hash className='w-4 h-4 text-primary'/>;
                                case 'string':
                                case 'text':
                                    return <FileText className='w-4 h-4 text-muted-foreground'/>;
                                case 'time':
                                case 'timestamp':
                                    return <Clock className='text-purple-500'/>;
                                case 'boolean':
                                case 'bool':
                                    return <GitBranch className='w-4 h-4 text-success'/>;
                                case 'timeseries':
                                    return <TrendingUp className='w-4 h-4 text-indigo-500'/>;
                                default:
                                    return <File className='w-4 h-4 text-muted-foreground'/>;
                            }
                        };

                        // 根据数据库类型显示不同的标签文本
                        const fieldLabel = isIoTDB ? 'Timeseries' : 'Field';
                        const fieldBadgeClass = isIoTDB
                            ? 'bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 h-auto'
                            : 'bg-primary/10 text-primary text-xs px-1.5 py-0.5 h-auto';

                        // 对于 IoTDB，优化字段显示名称
                        const fieldDisplayName = isIoTDB ? getIoTDBDisplayName(field.name, true) : field.name;

                        children.push({
                            title: (
                                <div className='flex items-center gap-2'>
                                    <span className='flex-1' title={field.name}>{fieldDisplayName}</span>
                                    {isFav && (
                                        <Star className='w-3 h-3 text-warning fill-current'/>
                                    )}
                                    <Badge variant='secondary' className={fieldBadgeClass}>
                                        {fieldLabel}
                                    </Badge>
                                    <span className='text-xs text-muted-foreground flex-shrink-0'>
                    {field.type}
                  </span>
                                </div>
                            ),
                            key: `field|${connectionId}|${database}|${table}|${field.name}`,
                            icon: getFieldIcon(field.type),
                            isLeaf: true,
                        });
                    });

                    // 更新树数据，同时更新表节点显示列数
                    setTreeData(prevData => {
                        const updateNode = (nodes: DataNode[]): DataNode[] => {
                            return nodes.map(node => {
                                if (node.key === key) {
                                    const totalColumns = tags.length + fields.length;
                                    const updatedTitle = (
                                        <div className='flex items-center gap-2'>
                                            <span className='flex-1'>{table}</span>
                                            <span className='text-xs text-muted-foreground flex-shrink-0'>
                        {totalColumns} 列
                      </span>
                                        </div>
                                    );
                                    return {
                                        ...node,
                                        children,
                                        title: updatedTitle,
                                    };
                                }
                                if (node.children) {
                                    return {...node, children: updateNode(node.children)};
                                }
                                return node;
                            });
                        };
                        return updateNode(prevData);
                    });
                }
            } catch (error) {
                console.error(`❌ 加载节点数据失败: ${key}`, error);
                showMessage.error(`加载数据失败: ${error}`);
            } finally {
                clearTimeout(timeoutId);
                // 使用 setTimeout 确保在下一个事件循环中清除状态，避免竞态条件
                setTimeout(() => {
                    setLoadingNodes(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(String(key));
                        return newSet;
                    });
                }, 0);
            }
        },
        [loadingNodes]
    );

    // 转换 UI TreeNode 为我们的 TreeNode 的适配器函数
    const loadDataAdapter = useCallback(
        async (uiNode: UITreeNode): Promise<void> => {
            // 从 UI TreeNode 转换为我们的 TreeNode
            const customNode: TreeNode = {
                id: String(uiNode.key),
                key: String(uiNode.key),
                name: String(uiNode.title),
                nodeType: 'database', // 默认类型，实际应该从元数据获取
                children: [],
                isLeaf: uiNode.isLeaf || false,
                isSystem: false,
                isExpandable: !uiNode.isLeaf,
                isExpanded: false,
                isLoading: false,
                metadata: {}
            };

            // 创建对应的 DataNode
            const dataNode: DataNode = {
                key: uiNode.key,
                title: uiNode.title,
                children: uiNode.children as DataNode[],
                icon: uiNode.icon,
                isLeaf: uiNode.isLeaf,
                disabled: uiNode.disabled,
                selectable: uiNode.selectable,
            };
            return loadData(dataNode);
        },
        [loadData]
    );

    // 处理收藏操作
    const handleToggleFavorite = useCallback(
        (nodeKey: string) => {
            const paths = {
                connection: (key: string) => key.replace('connection-', ''),
                database: (key: string) => {
                    const [, connectionId, database] = key.split('|');
                    return `${connectionId}/${database}`;
                },
                table: (key: string) => {
                    const [, connectionId, database, table] = key.split('|');
                    return `${connectionId}/${database}/${table}`;
                },
                field: (key: string) => {
                    const [, connectionId, database, table, field] = key.split('|');
                    return `${connectionId}/${database}/${table}/${field}`;
                },
                tag: (key: string) => {
                    const [, connectionId, database, table, tag] = key.split('|');
                    return `${connectionId}/${database}/${table}/tags/${tag}`;
                },
            };

            let path = '';
            let connectionId = '';

            if (String(nodeKey).startsWith('connection-')) {
                connectionId = String(nodeKey).replace('connection-', '');
                path = paths.connection(String(nodeKey));
            } else if (String(nodeKey).startsWith('database|')) {
                const [, connId] = String(nodeKey).split('|');
                connectionId = connId;
                path = paths.database(String(nodeKey));
            } else if (String(nodeKey).startsWith('table|')) {
                const [, connId] = String(nodeKey).split('|');
                connectionId = connId;
                path = paths.table(String(nodeKey));
            } else if (String(nodeKey).startsWith('field|')) {
                const [, connId] = String(nodeKey).split('|');
                connectionId = connId;
                path = paths.field(String(nodeKey));
            } else if (String(nodeKey).startsWith('tag|')) {
                const [, connId] = String(nodeKey).split('|');
                connectionId = connId;
                path = paths.tag(String(nodeKey));
            }

            if (isFavorite(path)) {
                const favorite = favorites.find(fav => fav.path === path);
                if (favorite) {
                    removeFavorite(favorite.id);
                    showMessage.success('已取消收藏');
                }
            } else {
                const favoriteItem = favoritesUtils.createFavoriteFromPath(
                    path,
                    connectionId,
                    connections
                );
                if (favoriteItem) {
                    addFavorite(favoriteItem);
                    showMessage.success('已添加到收藏');
                }
            }
        },
        [favorites, connections, isFavorite, addFavorite, removeFavorite]
    );

    // 处理节点右键菜单
    const getContextMenu = (node: DataNode): MenuProps['items'] => {
        const key = node.key as string;
        const paths = {
            connection: () => key.replace('connection-', ''),
            database: () => {
                const [, connectionId, database] = key.split('|');
                return `${connectionId}/${database}`;
            },
            table: () => {
                const [, connectionId, database, table] = key.split('|');
                return `${connectionId}/${database}/${table}`;
            },
            field: () => {
                const [, connectionId, database, table, field] = key.split('|');
                return `${connectionId}/${database}/${table}/${field}`;
            },
            tag: () => {
                const [, connectionId, database, table, tag] = key.split('|');
                return `${connectionId}/${database}/${table}/tags/${tag}`;
            },
        };

        let path = '';
        if (String(key).startsWith('connection-')) path = paths.connection();
        else if (String(key).startsWith('database|')) path = paths.database();
        else if (String(key).startsWith('table|')) path = paths.table();
        else if (String(key).startsWith('field|')) path = paths.field();
        else if (String(key).startsWith('tag|')) path = paths.tag();

        const isFav = isFavorite(path);

        const favoriteMenuItem = {
            key: 'toggle-favorite',
            label: isFav ? '取消收藏' : '添加到收藏',
            icon: isFav ? (
                <StarOff className='w-4 h-4'/>
            ) : (
                <Star className='w-4 h-4'/>
            ),
            onClick: () => handleToggleFavorite(key),
        };

        if (String(key).startsWith('database|')) {
            return [
                favoriteMenuItem,
                {key: 'divider-db-1', type: 'divider'},
                {
                    key: 'refresh-db',
                    label: '刷新数据库',
                    icon: <RefreshCw className='w-4 h-4'/>,
                },
                {
                    key: 'new-query',
                    label: '新建查询',
                    icon: <FileText className='w-4 h-4'/>,
                },
                {key: 'divider-db-2', type: 'divider'},
                {
                    key: 'db-properties',
                    label: '属性',
                    icon: <Settings className='w-4 h-4'/>,
                },
            ];
        }

        if (String(key).startsWith('table|')) {
            return [
                favoriteMenuItem,
                {key: 'divider-table-1', type: 'divider'},
                {
                    key: 'refresh-table',
                    label: '刷新表结构',
                    icon: <RefreshCw className='w-4 h-4'/>,
                },
                {
                    key: 'query-table',
                    label: '查询此表',
                    icon: <FileText className='w-4 h-4'/>,
                },
                {key: 'divider-table-2', type: 'divider'},
                {
                    key: 'table-properties',
                    label: '表属性',
                    icon: <Settings className='w-4 h-4'/>,
                },
            ];
        }

        if (String(key).startsWith('field|') || String(key).startsWith('tag|')) {
            return [
                favoriteMenuItem,
                {key: 'divider-field-1', type: 'divider'},
                {
                    key: 'insert-column',
                    label: '插入到查询',
                    icon: <FileText className='w-4 h-4'/>,
                },
                {
                    key: 'copy-name',
                    label: '复制列名',
                    icon: <File className='w-4 h-4'/>,
                },
            ];
        }

        if (String(key).startsWith('connection-')) {
            return [
                favoriteMenuItem,
                {key: 'divider-connection-1', type: 'divider'},
                {
                    key: 'refresh-connection',
                    label: '刷新连接',
                    icon: <RefreshCw className='w-4 h-4'/>,
                },
            ];
        }

        return [];
    };

    // 处理树节点展开
    const handleExpand = (expandedKeysValue: React.Key[]) => {
        setExpandedKeys(expandedKeysValue);
        // buildTreeData会通过expandedKeys依赖项自动重新执行，无需手动调用
    };

    // 统一处理连接建立和数据库加载
    const handleConnectionAndLoadDatabases = useCallback(async (connectionId: string) => {
        const connection = getConnection(connectionId);
        if (!connection) return;

        console.log(`🚀 开始连接并加载数据库: ${connection.name}`);

        // 设置加载状态
        setConnectionLoadingStates(prev => new Map(prev).set(connectionId, true));
        updateConnectionNodeDisplay(connectionId, true);

        try {
            // 1. 建立连接
            console.log(`🔗 建立连接: ${connection.name}`);
            await connectToDatabase(connectionId);

            // 2. 清理之前的数据库状态
            closeAllDatabasesForConnection(connectionId);
            clearDatabasesCache(connectionId);

            // 3. 加载数据库列表
            console.log(`📂 加载数据库列表: ${connection.name}`);
            const databases = await loadDatabases(connectionId, true); // 强制刷新

            // 4. 更新树形数据，一次性显示完整结果
            setTreeData(prevData => {
                return prevData.map(node => {
                    if (node.key === `connection-${connectionId}`) {
                        const databaseChildren: DataNode[] = databases.map(databaseName => {
                            const dbPath = `${connectionId}/${databaseName}`;
                            const isFav = isFavorite(dbPath);
                            const databaseKey = `database|${connectionId}|${databaseName}`;
                            const isOpened = isDatabaseOpened(connectionId, databaseName);

                            return {
                                title: (
                                    <span className='flex items-center gap-1'>
                                        {databaseName}
                                        {isFav && <Star className='w-3 h-3 text-warning fill-current'/>}
                                    </span>
                                ),
                                key: databaseKey,
                                icon: (
                                    <DatabaseIcon
                                        nodeType={getDatabaseNodeType(connectionId, databaseName) as any}
                                        size={16}
                                        isOpen={isOpened}
                                        className={isOpened ? 'text-purple-600' : 'text-muted-foreground'}
                                    />
                                ),
                                isLeaf: !isOpened,
                                children: isOpened ? [] : undefined,
                            };
                        });

                        return {
                            ...node,
                            children: databaseChildren,
                            isLeaf: databaseChildren.length === 0,
                        };
                    }
                    return node;
                });
            });

            // 5. 自动展开连接节点
            const connectionKey = `connection-${connectionId}`;
            if (!expandedKeys.includes(connectionKey)) {
                setExpandedKeys(prev => [...prev, connectionKey]);
            }

            showMessage.success(`已连接并加载 ${databases.length} 个数据库: ${connection.name}`);
            console.log(`✅ 连接并加载数据库完成: ${connection.name}`);

        } catch (error) {
            console.error(`❌ 连接并加载数据库失败:`, error);
            showMessage.error(`连接失败: ${error}`);
        } finally {
            // 清除加载状态
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connectionId);
                return newMap;
            });
            updateConnectionNodeDisplay(connectionId, false);
        }
    }, [getConnection, connectToDatabase, closeAllDatabasesForConnection, clearDatabasesCache,
        loadDatabases, isFavorite, isDatabaseOpened, getDatabaseNodeType, expandedKeys,
        ]);

    // 处理已连接的连接节点展开
    const handleExpandConnection = useCallback(async (connectionId: string) => {
        const connection = getConnection(connectionId);
        if (!connection) return;

        console.log(`📂 展开已连接的连接: ${connection.name}`);

        const connectionKey = `connection-${connectionId}`;

        // 检查是否已有数据库子节点
        const currentNode = treeData.find(node => node.key === connectionKey);
        const hasChildren = currentNode?.children && currentNode.children.length > 0;

        if (!hasChildren) {
            // 如果没有子节点，需要加载数据库列表
            setConnectionLoadingStates(prev => new Map(prev).set(connectionId, true));
            updateConnectionNodeDisplay(connectionId, true);

            try {
                console.log(`📊 加载数据库列表: ${connection.name}`);
                await addDatabaseNodesToConnection(connectionId);
                showMessage.success(`已加载数据库列表: ${connection.name}`);
            } catch (error) {
                console.error(`❌ 加载数据库列表失败:`, error);
                showMessage.error(`加载数据库列表失败: ${error}`);
                return; // 加载失败时不展开
            } finally {
                setConnectionLoadingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(connectionId);
                    return newMap;
                });
                updateConnectionNodeDisplay(connectionId, false);
            }
        }

        // 展开连接节点
        setExpandedKeys(prev => [...prev, connectionKey]);
        showMessage.info(`已展开连接 "${connection.name}"`);

    }, [getConnection, treeData]);

    // 处理连接操作
    const handleConnectionToggle = async (connection_id: string) => {
        const isCurrentlyConnected = isConnectionConnected(connection_id);
        const connection = getConnection(connection_id);
        const currentStatus = getConnectionStatus(connection_id);

        if (!connection) {
            showMessage.error('连接配置不存在');
            return;
        }

        // 检查是否正在连接中，避免重复操作
        if (currentStatus?.status === 'connecting') {
            console.log(`⏳ 连接 ${connection.name} 正在连接中，跳过操作`);
            showMessage.warning(`连接 ${connection.name} 正在连接中，请稍候...`);
            return;
        }

        console.log(
            `🔄 开始连接操作: ${connection.name}, 当前状态: ${isCurrentlyConnected ? '已连接' : '未连接'}`,
            {connectionId: connection_id, currentStatus: currentStatus?.status}
        );

        // 设置该连接的loading状态
        setConnectionLoadingStates(prev => new Map(prev).set(connection_id, true));

        // 立即更新该连接节点的显示状态为加载中
        updateConnectionNodeDisplay(connection_id, true);

        // 添加超时控制
        const timeoutMs = (connection.connectionTimeout || 30) * 1000;
        const abortController = new AbortController();

        const timeoutId = setTimeout(() => {
            abortController.abort();
            console.warn(`⏰ 连接操作超时: ${connection.name}`);
            showMessage.error(`连接操作超时: ${connection.name}`);
        }, timeoutMs);

        try {
            if (isCurrentlyConnected) {
                // 断开连接
                console.log(`🔌 断开连接: ${connection.name}`);
                await disconnectFromDatabase(connection_id);
                showMessage.success(`已断开连接: ${connection.name}`);
            } else {
                // 建立连接
                console.log(`🔗 建立连接: ${connection.name}`);
                await connectToDatabase(connection_id);
                showMessage.success(`已连接: ${connection.name}`);
            }

            clearTimeout(timeoutId);
            console.log(`✅ 连接操作完成: ${connection.name}`);
        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`❌ 连接操作失败:`, error);

            let errorMessage = error instanceof Error ? error.message : String(error);

            // 检查是否是超时错误
            if (abortController.signal.aborted) {
                errorMessage = `连接超时 (${connection.connectionTimeout || 30}秒)`;
            }

            showMessage.error(`连接操作失败: ${errorMessage}`);

            // 确保错误状态被正确设置
            console.log(`🔄 确保错误状态被设置: ${connection_id}`);
        } finally {
            // 清除loading状态
            setConnectionLoadingStates(prev => {
                const newMap = new Map(prev);
                newMap.delete(connection_id);
                return newMap;
            });

            // 使用防抖机制更新节点显示，避免重复更新
            setUpdateTimeouts(prev => {
                const newMap = new Map(prev);
                // 清除之前的定时器
                const existingTimeout = newMap.get(connection_id);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                // 设置新的定时器 - 只更新显示状态，不自动加载数据
                const newTimeout = setTimeout(async () => {
                    // 连接操作完成后，loading状态应该为false
                    updateConnectionNodeDisplay(connection_id, false);

                    // 根据连接状态处理节点显示
                    if (isConnectionConnected(connection_id)) {
                        // 如果连接成功，只清理数据库打开状态，不自动加载数据库节点
                        // 数据库节点的加载由双击处理函数统一管理
                        closeAllDatabasesForConnection(connection_id);
                        console.log(`✅ 连接建立完成: ${connection.name}`);
                    } else {
                        // 如果连接断开，清理该连接的数据库子节点和打开状态
                        clearDatabaseNodesForConnection(connection_id);
                        closeAllDatabasesForConnection(connection_id);

                        // 收起连接节点
                        const connectionKey = `connection-${connection_id}`;
                        if (expandedKeys.includes(connectionKey)) {
                            setExpandedKeys(prev => prev.filter(key => key !== connectionKey));
                            console.log(`🔄 收起连接节点: ${connection.name}`);
                        }
                    }

                    // 清除定时器引用
                    setUpdateTimeouts(current => {
                        const updated = new Map(current);
                        updated.delete(connection_id);
                        return updated;
                    });
                }, 150);

                newMap.set(connection_id, Number(newTimeout));
                return newMap;
            });
        }
    };

    // UI TreeNode 到自定义 TreeNode 的转换函数
    const convertUINodeToCustomNode = (uiNode: UITreeNode): TreeNode => {
        return {
            id: String(uiNode.key),
            key: String(uiNode.key),
            name: String(uiNode.title),
            title: String(uiNode.title),
            nodeType: 'database', // 默认类型，实际应该从元数据获取
            children: [],
            isLeaf: uiNode.isLeaf || false,
            isSystem: false,
            isExpandable: !uiNode.isLeaf,
            isExpanded: false,
            isLoading: false,
            metadata: {},
            icon: uiNode.icon,
            disabled: uiNode.disabled,
            selectable: uiNode.selectable,
        };
    };

    // 处理节点双击
    const handleDoubleClick = async (info: { node: UITreeNode }) => {
        const node = convertUINodeToCustomNode(info.node);
        const key = node.key;

        console.log(`🖱️ 双击节点: ${key}`, {nodeTitle: node.title, nodeType: typeof key, keyString: String(key)});

        // 双击时立即关闭右键菜单，避免菜单状态冲突
        if (contextMenuOpen) {
            setContextMenuOpen(false);
        }

        if (String(key).startsWith('connection-')) {
            // 连接节点被双击，统一处理连接和数据加载
            const connectionId = String(key).replace('connection-', '');
            const connection = getConnection(connectionId);

            if (!connection) {
                console.error(`❌ 双击连接失败: 连接配置不存在 ${connectionId}`);
                showMessage.error(`连接配置不存在: ${connectionId}`);
                return;
            }

            const isConnected = isConnectionConnected(connectionId);
            const connectionKey = `connection-${connectionId}`;
            const isExpanded = expandedKeys.includes(connectionKey);

            console.log(`🖱️ 双击连接: ${connection.name} (${connectionId})`, {
                isConnected,
                isExpanded
            });

            if (!isConnected) {
                // 如果连接未建立，建立连接并加载数据库列表
                await handleConnectionAndLoadDatabases(connectionId);
            } else {
                // 如果连接已建立，切换展开/收起状态
                if (isExpanded) {
                    // 当前已展开，收起连接节点
                    const newExpandedKeys = expandedKeys.filter(k => !String(k).startsWith(connectionKey));
                    setExpandedKeys(newExpandedKeys);
                    console.log(`📁 收起连接节点: ${connection.name}`);
                    showMessage.info(`已收起连接 "${connection.name}"`);
                } else {
                    // 当前已收起，展开连接节点并确保数据已加载
                    await handleExpandConnection(connectionId);
                }
            }
        } else if (String(key).startsWith('database|')) {
            // 数据库节点被双击
            const parts = String(key).split('|');
            if (parts.length >= 3) {
                const connectionId = parts[1];
                // 处理数据库名称可能包含分隔符的情况
                const database = parts.slice(2).join('|');
                const databaseKey = `database|${connectionId}|${database}`;

                // 首先检查连接状态
                const isConnected = isConnectionConnected(connectionId);
                if (!isConnected) {
                    console.warn(`⚠️ 连接 ${connectionId} 未建立，无法打开数据库 "${database}"`);
                    showMessage.warning(`请先建立连接后再打开数据库 "${database}"`);
                    return;
                }

                // 检查数据库是否已经打开
                const isOpened = isDatabaseOpened(connectionId, database);
                const isDatabaseExpanded = expandedKeys.includes(databaseKey);

                console.log(`🖱️ 双击数据库 "${database}":`, {
                    connectionId,
                    database,
                    isConnected,
                    isOpened,
                    isDatabaseExpanded,
                    openedDatabasesList
                });

                if (!isOpened) {
                    // 如果数据库未打开，则打开数据库并自动展开加载表列表
                    openDatabase(connectionId, database);
                    showMessage.success(`已打开数据库 "${database}"，正在加载表列表...`);

                    // 自动展开数据库
                    const newExpandedKeys = [...expandedKeys, databaseKey];
                    setExpandedKeys(newExpandedKeys);

                    // 加载表数据并更新树形结构
                    try {
                        const tables = await loadTables(connectionId, database);
                        console.log(`✅ 成功加载数据库 "${database}" 的表列表:`, tables);

                        // 更新树形数据，为该数据库添加表节点
                        setTreeData(prevData => {
                            return prevData.map(connectionNode => {
                                if (connectionNode.key === `connection-${connectionId}`) {
                                    const updatedConnectionNode = {...connectionNode};
                                    if (updatedConnectionNode.children) {
                                        updatedConnectionNode.children = updatedConnectionNode.children.map(dbNode => {
                                            if (dbNode.key === databaseKey) {
                                                const tableNodes = tables.map(table => {
                                                    const tablePath = `${connectionId}/${database}/${table}`;
                                                    const isFav = isFavorite(tablePath);

                                                    // 对于 IoTDB，优化显示名称
                                                    const isIoTDB = isIoTDBConnection(connectionId);
                                                    const displayName = isIoTDB ? getIoTDBDisplayName(table, false) : table;

                                                    return {
                                                        title: (
                                                            <div className='flex items-center gap-2'>
                                                                <span className='flex-1' title={table}>{displayName}</span>
                                                                {isFav && (
                                                                    <Star
                                                                        className='w-3 h-3 text-warning fill-current'/>
                                                                )}
                                                            </div>
                                                        ),
                                                        key: `table|${connectionId}|${database}|${table}`,
                                                        icon: (
                                                            <DatabaseIcon
                                                                nodeType={getTableNodeType(connectionId) as any}
                                                                size={16}
                                                                className="text-blue-600"
                                                            />
                                                        ),
                                                        isLeaf: false, // 表应该有展开按钮以显示tags和fields
                                                        children: [], // 空数组表示有子节点但未加载
                                                    };
                                                });

                                                const isOpened = isDatabaseOpened(connectionId, database);
                                                return {
                                                    ...dbNode,
                                                    icon: (
                                                        <DatabaseIcon
                                                            nodeType={getDatabaseNodeType(connectionId, database) as any}
                                                            size={16}
                                                            isOpen={isOpened}
                                                            className="text-purple-600"
                                                        />
                                                    ),
                                                    isLeaf: false,
                                                    children: tableNodes,
                                                };
                                            }
                                            return dbNode;
                                        });
                                    }
                                    return updatedConnectionNode;
                                }
                                return connectionNode;
                            });
                        });

                        showMessage.success(`已打开数据库 "${database}" 并加载了 ${tables.length} 个表`);
                    } catch (error) {
                        console.error('❌ 加载表列表失败:', error);
                        showMessage.error(`打开数据库 "${database}" 失败: ${error}`);
                        // 如果加载失败，回滚打开状态
                        closeDatabase(connectionId, database);
                        setExpandedKeys(expandedKeys);
                    }
                } else if (!isDatabaseExpanded) {
                    // 如果数据库未展开，则展开数据库（加载表列表）
                    const newExpandedKeys = [...expandedKeys, databaseKey];
                    console.log('🔄 双击展开数据库，更新 expandedKeys:', {
                        oldKeys: expandedKeys,
                        newKeys: newExpandedKeys,
                        databaseKey
                    });

                    // 立即更新展开状态，提供即时反馈
                    setExpandedKeys(newExpandedKeys);
                    showMessage.info(`正在加载数据库 "${database}" 的表列表...`);

                    // 异步加载表数据，不阻塞UI
                    loadTables(connectionId, database).then(tables => {
                        console.log(`✅ 成功加载数据库 "${database}" 的表列表:`, tables);

                        // 更新树形数据，为该数据库添加表节点
                        setTreeData(prevData => {
                            return prevData.map(connectionNode => {
                                if (connectionNode.key === `connection-${connectionId}`) {
                                    const updatedConnectionNode = {...connectionNode};
                                    if (updatedConnectionNode.children) {
                                        updatedConnectionNode.children = updatedConnectionNode.children.map(dbNode => {
                                            if (dbNode.key === databaseKey) {
                                                const tableNodes = tables.map(table => {
                                                    const tablePath = `${connectionId}/${database}/${table}`;
                                                    const isFav = isFavorite(tablePath);
                                                    return {
                                                        title: (
                                                            <div className='flex items-center gap-2'>
                                                                <span className='flex-1'>{table}</span>
                                                                {isFav && (
                                                                    <Star
                                                                        className='w-3 h-3 text-warning fill-current'/>
                                                                )}
                                                            </div>
                                                        ),
                                                        key: `table|${connectionId}|${database}|${table}`,
                                                        icon: (
                                                            <DatabaseIcon
                                                                nodeType={getTableNodeType(connectionId) as any}
                                                                size={16}
                                                                className="text-blue-600"
                                                            />
                                                        ),
                                                        isLeaf: false, // 修复：表应该有展开按钮以显示tags和fields
                                                        children: [], // 空数组表示有子节点但未加载
                                                    };
                                                });

                                                return {
                                                    ...dbNode,
                                                    icon: (
                                                        <DatabaseIcon
                                                            nodeType={getDatabaseNodeType(connectionId, database) as any}
                                                            size={16}
                                                            isOpen={isDatabaseOpened(connectionId, database)}
                                                            className="text-purple-600"
                                                        />
                                                    ),
                                                    isLeaf: false,
                                                    children: tableNodes,
                                                };
                                            }
                                            return dbNode;
                                        });
                                    }
                                    return updatedConnectionNode;
                                }
                                return connectionNode;
                            });
                        });

                        showMessage.success(`已加载数据库 "${database}" 的 ${tables.length} 个表`);
                    }).catch(error => {
                        console.error('❌ 加载表列表失败:', error);
                        showMessage.error(`加载数据库 "${database}" 的表列表失败`);
                        // 如果加载失败，回滚展开状态
                        const rollbackKeys = expandedKeys.filter(k => k !== databaseKey);
                        setExpandedKeys(rollbackKeys);
                    });
                } else {
                    // 如果数据库已经展开，则收起数据库节点
                    const newExpandedKeys = expandedKeys.filter(k => k !== databaseKey);
                    setExpandedKeys(newExpandedKeys);
                    console.log(`📁 收起数据库节点: ${database}`);
                    showMessage.info(`已收起数据库 "${database}"`);
                }
            }
        } else if (String(key).startsWith('table|')) {
            // 表节点被双击，确保在查询面板中处理
            const parts = String(key).split('|');
            if (parts.length >= 4) {
                const connectionId = parts[1];
                const database = parts[2];
                const table = parts.slice(3).join('|'); // 处理表名包含分隔符的情况

                // 如果当前不在查询面板，先切换到查询面板
                if (onViewChange && onGetCurrentView && onGetCurrentView() !== 'query') {
                    onViewChange('query');
                    // 延迟执行表查询，确保查询面板已加载
                    setTimeout(() => {
                        executeTableQuery(connectionId, database, table);
                    }, 100);
                } else {
                    // 直接执行表查询
                    executeTableQuery(connectionId, database, table);
                }
            }
        }
    };

    // 执行表查询的辅助函数
    const executeTableQuery = async (connectionId: string, database: string, table: string) => {
        // 优先使用新的数据浏览回调
        if (onCreateDataBrowserTab) {
            onCreateDataBrowserTab(connectionId, database, table);
            showMessage.info(`正在打开表 "${table}" 的数据浏览器...`);
        } else if (onTableDoubleClick) {
            // 保留原有逻辑以便兼容
            const query = generateQueryWithTimeFilter(table);
            onTableDoubleClick(database, table, query);
            const timeDesc = currentTimeRange
                ? currentTimeRange.label
                : '最近1小时';
            showMessage.info(
                `正在查询表 "${table}" 的数据（时间范围：${timeDesc}）...`
            );
        } else if (onCreateQueryTab) {
            // 创建新查询标签页并填入查询语句
            const query = generateQueryWithTimeFilter(table);
            onCreateQueryTab(query, database);
            showMessage.info(`已创建查询标签页，查询表 "${table}"`);
        } else {
            // 如果没有回调，复制查询到剪贴板
            const query = generateQueryWithTimeFilter(table);
            const success = await writeToClipboard(query, {
                successMessage: `查询语句已复制到剪贴板: ${query}`,
                errorMessage: '复制失败',
            });
            if (!success) {
                showMessage.info(`查询语句: ${query}`);
            }
        }
    };

    // 右键菜单状态
    const [contextMenuTarget, setContextMenuTarget] = useState<any>(null);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({x: 0, y: 0});

    // 处理右键菜单
    const handleRightClick = (info: { node: UITreeNode; event?: React.MouseEvent }) => {
        const node = convertUINodeToCustomNode(info.node);
        const {event} = info;
        event?.preventDefault();
        event?.stopPropagation();

        // 记录鼠标位置
        if (event) {
            setContextMenuPosition({
                x: event.clientX,
                y: event.clientY
            });
        }

        const key = node.key;
        let target = null;

        // 根据节点类型创建不同的目标对象
        if (String(key).startsWith('connection-')) {
            // 连接节点
            const connectionId = String(key).replace('connection-', '');
            target = {
                type: 'connection',
                connectionId,
                title: node.title,
            };
        } else if (String(key).startsWith('database|')) {
            // 数据库节点
            const parts = String(key).split('|');
            if (parts.length >= 3) {
                const connectionId = parts[1];
                const database = parts[2];
                target = {
                    type: 'database',
                    connectionId,
                    database,
                    title: node.title,
                };
            }
        } else if (String(key).startsWith('table|')) {
            // 表节点
            const parts = String(key).split('|');
            if (parts.length >= 4) {
                const connectionId = parts[1];
                const database = parts[2];
                const table = parts.slice(3).join('|');
                target = {
                    type: 'table',
                    connectionId,
                    database,
                    table,
                    title: node.title,
                };
            }
        } else if (String(key).startsWith('field|')) {
            // 字段节点
            const parts = String(key).split('|');
            if (parts.length >= 5) {
                const connectionId = parts[1];
                const database = parts[2];
                const table = parts[3];
                const field = parts.slice(4).join('|');
                target = {
                    type: 'field',
                    connectionId,
                    database,
                    table,
                    field,
                    title: node.title,
                };
            }
        }

        if (target) {
            setContextMenuTarget(target);
            // 延迟打开菜单，避免与双击事件冲突
            setTimeout(() => setContextMenuOpen(true), 50);
        }
    };

    // 处理右键菜单动作
    const handleContextMenuAction = async (action: string) => {
        if (!contextMenuTarget) return;

        try {
            switch (action) {
                case 'refresh_connection':
                    if (contextMenuTarget.type === 'connection') {
                        // 刷新连接状态
                        const connectionId = contextMenuTarget.connectionId;
                        try {
                            // 清除该连接的缓存，强制重新加载
                            clearDatabasesCache(connectionId);
                            // 重新加载数据库列表（强制刷新）
                            await loadDatabases(connectionId, true);
                            // 刷新树形数据
                            buildCompleteTreeData(true);
                            showMessage.success(`连接 ${contextMenuTarget.title} 已刷新`);
                        } catch (error) {
                            console.error('刷新连接失败:', error);
                            showMessage.error(`刷新连接失败: ${error}`);
                        }
                    }
                    break;

                case 'disconnect':
                    if (contextMenuTarget.type === 'connection') {
                        // 断开连接逻辑
                        const connectionId = contextMenuTarget.connectionId;
                        try {
                            await handleConnectionToggle(connectionId);
                            showMessage.success(`连接 ${contextMenuTarget.title} 已断开`);
                        } catch (error) {
                            console.error('断开连接失败:', error);
                            showMessage.error(`断开连接失败: ${error}`);
                        }
                    }
                    break;

                case 'connection_properties':
                    if (contextMenuTarget.type === 'connection') {
                        // 打开连接编辑对话框
                        const connectionId = contextMenuTarget.connectionId;
                        const connection = getConnection(connectionId);
                        if (connection) {
                            console.log(`🔧 编辑连接属性: ${connection.name}`);
                            handleOpenConnectionDialog(connection);
                        } else {
                            showMessage.error('连接不存在');
                        }
                    }
                    break;

                case 'delete_connection':
                    if (contextMenuTarget.type === 'connection') {
                        const connectionId = contextMenuTarget.connectionId;
                        const connection = getConnection(connectionId);
                        if (connection) {
                            // 显示确认对话框
                            const confirmed = await dialog.confirm({
                                title: '删除连接',
                                content: `确定要删除连接 "${connection.name}" 吗？此操作不可撤销。`,
                            });

                            if (confirmed) {
                                try {
                                    // 先断开连接
                                    if (isConnectionConnected(connectionId)) {
                                        await disconnectFromDatabase(connectionId);
                                    }

                                    // 删除连接
                                    try {
                                        console.log(`🗑️ 开始删除连接: ${connection.name} (${connectionId})`);

                                        // 调用删除连接的API
                                        await safeTauriInvoke('delete_connection', {connectionId});
                                        console.log('✅ 后端删除成功');

                                        // 从前端状态删除
                                        removeConnection(connectionId);
                                        console.log('✅ 前端状态删除成功');

                                        showMessage.success(`连接 "${connection.name}" 已删除`);

                                        // 刷新树形数据
                                        buildCompleteTreeData(true);
                                    } catch (deleteError) {
                                        console.error('❌ 删除连接失败:', deleteError);
                                        showMessage.error(`删除连接失败: ${deleteError}`);
                                    }
                                } catch (error) {
                                    console.error('删除连接失败:', error);
                                    showMessage.error(`删除连接失败: ${error}`);
                                }
                            }
                        } else {
                            showMessage.error('连接不存在');
                        }
                    }
                    break;

                case 'close_database':
                    if (contextMenuTarget.type === 'database') {
                        // 关闭数据库
                        closeDatabase(contextMenuTarget.connectionId, contextMenuTarget.database);
                        showMessage.success(`已关闭数据库 "${contextMenuTarget.database}"`);

                        // 立即更新树形数据以反映数据库关闭状态
                        setTreeData(prevData => {
                            return prevData.map(connectionNode => {
                                if (connectionNode.key === `connection-${contextMenuTarget.connectionId}`) {
                                    const updatedConnectionNode = {...connectionNode};
                                    if (updatedConnectionNode.children) {
                                        updatedConnectionNode.children = updatedConnectionNode.children.map(dbNode => {
                                            if (dbNode.key === `database|${contextMenuTarget.connectionId}|${contextMenuTarget.database}`) {
                                                return {
                                                    ...dbNode,
                                                    icon: (
                                                        <DatabaseIcon
                                                            nodeType={getDatabaseNodeType(contextMenuTarget?.connectionId, contextMenuTarget?.database) as any}
                                                            size={16}
                                                            isOpen={false}
                                                            className="text-muted-foreground"
                                                        />
                                                    ),
                                                    isLeaf: true, // 关闭后不能展开
                                                    children: undefined, // 清除子节点
                                                };
                                            }
                                            return dbNode;
                                        });
                                    }
                                    return updatedConnectionNode;
                                }
                                return connectionNode;
                            });
                        });

                        // 同时收起该数据库的展开状态
                        const databaseKey = `database|${contextMenuTarget.connectionId}|${contextMenuTarget.database}`;
                        setExpandedKeys(prev => prev.filter(key => key !== databaseKey));
                    }
                    break;

                case 'refresh_database':
                    if (contextMenuTarget.type === 'database') {
                        try {
                            console.log(`🔄 刷新数据库结构: ${contextMenuTarget.database}`);

                            // 重新加载数据库结构
                            await buildCompleteTreeData(true);

                            showMessage.success(`数据库 ${contextMenuTarget.database} 已刷新`);
                        } catch (error) {
                            console.error('❌ 刷新数据库结构失败:', error);
                            showMessage.error(`刷新数据库结构失败: ${error}`);
                        }
                    }
                    break;

                case 'create_database':
                    if (contextMenuTarget.type === 'connection') {
                        setCreateDatabaseDialogOpen(true);
                    }
                    break;

                case 'create_measurement':
                    if (contextMenuTarget.type === 'database') {
                        showMessage.info(`创建测量值功能开发中: ${contextMenuTarget.database}`);
                    }
                    break;

                case 'database_info':
                    if (contextMenuTarget.type === 'database') {
                        setDatabaseInfoDialog({
                            open: true,
                            databaseName: contextMenuTarget.database,
                        });
                    }
                    break;

                case 'manage_retention_policies':
                    if (contextMenuTarget.type === 'database') {
                        setRetentionPolicyDialog({
                            open: true,
                            mode: 'create',
                            database: contextMenuTarget.database,
                            policy: null,
                        });
                    }
                    break;

                case 'drop_database':
                    if (contextMenuTarget.type === 'database') {
                        const confirmed = await dialog.confirm({
                            title: '确认删除',
                            content: `确定要删除数据库 "${contextMenuTarget.database}" 吗？此操作不可撤销。`,
                        });
                        if (confirmed) {
                            showMessage.info(`删除数据库功能开发中: ${contextMenuTarget.database}`);
                        }
                    }
                    break;

                case 'query_table':
                    if (contextMenuTarget.type === 'table') {
                        const query = generateQueryWithTimeFilter(contextMenuTarget.table);
                        // 优先使用创建并执行查询的回调
                        if (onCreateAndExecuteQuery) {
                            onCreateAndExecuteQuery(query, contextMenuTarget.database);
                            showMessage.success(`正在查询表 "${contextMenuTarget.table}"`);
                        } else {
                            // 回退到原有逻辑
                            await executeTableQuery(contextMenuTarget.connectionId, contextMenuTarget.database, contextMenuTarget.table);
                        }
                    }
                    break;


                case 'table_designer':
                    if (contextMenuTarget.type === 'table') {
                        // 打开表设计器弹框
                        openDialog('designer', contextMenuTarget.connectionId, contextMenuTarget.database, contextMenuTarget.table);
                    }
                    break;

                case 'table_info':
                    if (contextMenuTarget.type === 'table') {
                        // 打开表信息弹框
                        openDialog('info', contextMenuTarget.connectionId, contextMenuTarget.database, contextMenuTarget.table);
                    }
                    break;

                case 'drop_table':
                    if (contextMenuTarget.type === 'table') {
                        const confirmed = await dialog.confirm({
                            title: '确认删除表',
                            content: `确定要删除表 "${contextMenuTarget.table}" 吗？\n\n⚠️ 警告：此操作将永久删除表中的所有数据，无法恢复！`,
                        });
                        if (confirmed) {
                            try {
                                setLoading(true);
                                console.log('🗑️ 删除表:', {
                                    connectionId: contextMenuTarget.connectionId,
                                    database: contextMenuTarget.database,
                                    table: contextMenuTarget.table
                                });

                                // 执行删除表的SQL命令
                                const dropQuery = `DROP MEASUREMENT "${contextMenuTarget.table}"`;
                                await safeTauriInvoke('execute_query', {
                                    request: {
                                        connectionId: contextMenuTarget.connectionId,
                                        database: contextMenuTarget.database,
                                        query: dropQuery,
                                    },
                                });

                                showMessage.success(`表 "${contextMenuTarget.table}" 已成功删除`);

                                // 刷新数据库树以反映删除操作
                                refreshTree();

                                console.log('✅ 表删除成功');
                            } catch (error) {
                                console.error('❌ 删除表失败:', error);
                                showMessage.error(`删除表失败: ${error}`);
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                    break;

                case 'copy_field_name':
                    if (contextMenuTarget.type === 'field') {
                        await writeToClipboard(contextMenuTarget.field, {
                            successMessage: `已复制字段名: ${contextMenuTarget.field}`,
                        });
                    }
                    break;

                case 'field_stats':
                    if (contextMenuTarget.type === 'field') {
                        showMessage.info(`字段统计功能开发中: ${contextMenuTarget.field}`);
                    }
                    break;

                case 'copy_connection_name':
                    if (contextMenuTarget.type === 'connection') {
                        const connection = connections.find(c => c.id === contextMenuTarget.connectionId);
                        if (connection) {
                            await writeToClipboard(connection.name, {
                                successMessage: `已复制连接名: ${connection.name}`,
                            });
                        }
                    }
                    break;

                case 'copy_database_name':
                    if (contextMenuTarget.type === 'database') {
                        await writeToClipboard(contextMenuTarget.database, {
                            successMessage: `已复制数据库名: ${contextMenuTarget.database}`,
                        });
                    }
                    break;

                case 'copy_table_name':
                    if (contextMenuTarget.type === 'table') {
                        await writeToClipboard(contextMenuTarget.table, {
                            successMessage: `已复制表名: ${contextMenuTarget.table}`,
                        });
                    }
                    break;

                case 'copy_tag_name':
                    if (contextMenuTarget.type === 'tag') {
                        await writeToClipboard(contextMenuTarget.tag, {
                            successMessage: `已复制标签名: ${contextMenuTarget.tag}`,
                        });
                    }
                    break;

                case 'tag_values':
                    if (contextMenuTarget.type === 'tag') {
                        showMessage.info(`查看标签值功能开发中: ${contextMenuTarget.tag}`);
                    }
                    break;


                default:
                    console.warn('未处理的右键菜单动作:', action);
                    break;
            }
        } catch (error) {
            console.error('执行右键菜单动作失败:', error);
            showMessage.error(`操作失败: ${error}`);
        }

        // 关闭右键菜单
        setContextMenuOpen(false);
        setContextMenuTarget(null);
    };

    // 打开表设计器
    const openTableDesigner = (tableInfo: { connectionId: string; database: string; table: string }) => {
        try {
            console.log('🔧 打开表设计器:', tableInfo);

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
            console.error('❌ 打开表设计器失败:', error);
            showMessage.error(`打开表设计器失败: ${error}`);
        }
    };

    // 打开数据库设计器
    const openDatabaseDesigner = (dbInfo: { connectionId: string; database: string }) => {
        try {
            console.log('🗄️ 打开数据库设计器:', dbInfo);

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
            console.error('❌ 打开数据库设计器失败:', error);
            showMessage.error(`打开数据库设计器失败: ${error}`);
        }
    };

    // 处理节点选择
    const handleSelect = (selectedKeys: string[], info: { selected: boolean; node: UITreeNode }) => {
        const node = convertUINodeToCustomNode(info.node);
        console.log('选中节点:', node);

        const nodeKey = String(node.key);
        // 根据选中的节点类型执行相应操作
        if (nodeKey.startsWith('database|')) {
            // 数据库节点被选中
            console.log('选中数据库:', node.title);
        } else if (nodeKey.startsWith('table|')) {
            // 表节点被选中
            console.log('选中表:', node.title);
        } else if (nodeKey.startsWith('field|') || nodeKey.startsWith('tag|')) {
            // 字段或标签节点被选中
            console.log('选中字段/标签:', node.title);
        }
    };

    // 提取节点文本内容用于搜索
    const extractTextFromNode = (node: DataNode): string => {
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

    // 搜索过滤
    const filterTreeData = (data: DataNode[]): DataNode[] => {
        if (!searchValue.trim()) return data;

        const filterNode = (node: DataNode): DataNode | null => {
            const nodeText = extractTextFromNode(node);
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

    // 更新单个连接节点（包含数据加载）
    const updateSingleConnectionNode = useCallback(
        async (connection_id: string) => {
            const connection = getConnection(connection_id);
            const isConnected = isConnectionConnected(connection_id);
            const connectionStatus = getConnectionStatus(connection_id);

            if (!connection) return;

            console.log(
                `🔄 更新单个连接节点（含数据加载）: ${connection.name}, 连接状态: ${isConnected}`
            );

            // 如果连接成功，检查是否需要加载子节点数据
            if (isConnected) {
                setTreeData(prevData => {
                    return prevData.map(node => {
                        if (node.key === `connection-${connection_id}`) {
                            // 检查是否需要重新加载子节点
                            const shouldLoadChildren =
                                !node.children || node.children.length === 0;

                            if (shouldLoadChildren) {
                                console.log(`📁 开始为连接 ${connection.name} 加载数据库数据`);

                                // 异步加载数据库数据
                                loadDatabases(connection_id)
                                    .then(databases => {
                                        console.log(
                                            `📁 连接 ${connection.name} 数据库加载完成: ${databases.length} 个数据库`
                                        );
                                        setTreeData(currentData => {
                                            return currentData.map(currentNode => {
                                                if (currentNode.key === `connection-${connection_id}`) {
                                                    // 再次检查是否已经有子节点，避免重复加载
                                                    if (
                                                        currentNode.children &&
                                                        currentNode.children.length > 0
                                                    ) {
                                                        console.log(
                                                            `📁 节点已有子节点，跳过加载: ${connection.name}`
                                                        );
                                                        return currentNode;
                                                    }

                                                    return {
                                                        ...currentNode,
                                                        children: databases.map(db => {
                                                            const dbPath = `${connection_id}/${db}`;
                                                            const isFav = isFavorite(dbPath);
                                                            const databaseKey = `database|${connection_id}|${db}`;
                                                            const isExpanded = expandedKeys.includes(databaseKey);
                                                            const isOpened = isDatabaseOpened(connection_id, db);

                                                            // 从缓存的树节点信息中获取节点类型
                                                            const cachedNodes = treeNodeCache[connection_id] || [];
                                                            const treeNode = cachedNodes.find(node => node.name === db);
                                                            const nodeType = treeNode?.nodeType || treeNode?.node_type || 'database';

                                                            const nodeData: any = {
                                                                title: (
                                                                    <span className='flex items-center gap-1'>
                                    {db}
                                                                        {isFav && (
                                                                            <Star
                                                                                className='w-3 h-3 text-warning fill-current'/>
                                                                        )}
                                                                        {treeNode?.isSystem && (
                                                                            <span
                                                                                className="text-xs text-gray-500 italic ml-1">system</span>
                                                                        )}
                                  </span>
                                                                ),
                                                                key: databaseKey,
                                                                // 使用正确的图标类型
                                                                icon: getNodeIcon(nodeType, isOpened),
                                                            };

                                                            if (isOpened) {
                                                                // 已打开的数据库：设置为非叶子节点，有展开按钮和children数组
                                                                nodeData.isLeaf = false;
                                                                nodeData.children = []; // 空数组表示有子节点但未加载
                                                            } else {
                                                                // 未打开的数据库：设置为叶子节点，无展开按钮
                                                                nodeData.isLeaf = true;
                                                            }

                                                            return nodeData;
                                                        }),
                                                    };
                                                }
                                                return currentNode;
                                            });
                                        });
                                    })
                                    .catch(error => {
                                        console.error('加载数据库失败:', error);
                                    });
                            }

                            return node;
                        }
                        return node;
                    });
                });
            } else {
                // 如果断开连接，清空子节点并关闭所有相关数据库
                closeAllDatabasesForConnection(connection_id);
                setTreeData(prevData => {
                    return prevData.map(node => {
                        if (node.key === `connection-${connection_id}`) {
                            return {
                                ...node,
                                children: [],
                            };
                        }
                        return node;
                    });
                });
            }
        },
        [
            getConnection,
            isConnectionConnected,
            getConnectionStatus,
            isFavorite,
            loadDatabases,
            expandedKeys, // 添加expandedKeys依赖，确保数据库节点状态正确
            isDatabaseOpened, // 添加数据库打开状态依赖
        ]
    );

    // 刷新树数据并测试所有连接
    const refreshTree = useCallback(async () => {
        buildCompleteTreeData(true); // 手动刷新时显示全局 loading

        // 测试所有连接的连通性
        for (const connection of connections) {
            try {
                console.log(`🔍 测试连接: ${connection.name} (${connection.id})`);

                // 调用连接测试的API
                const testResult = await safeTauriInvoke('test_connection', {
                    connectionId: connection.id
                });

                if (testResult.success) {
                    console.log(`✅ 连接测试成功: ${connection.name}`);
                } else {
                    console.warn(`⚠️ 连接测试失败: ${connection.name} - ${testResult.error}`);
                }
            } catch (error) {
                console.error(`❌ 连接测试失败: ${connection.name}`, error);
            }
        }
    }, [buildCompleteTreeData, connections]);

    // 更新特定连接节点的显示状态（不影响其他节点）
    const updateConnectionNodeDisplay = useCallback(
        (connection_id: string, forceLoading?: boolean) => {
            console.log(`🎨 更新连接节点显示: ${connection_id}`);

            setTreeData(prevData => {
                return prevData.map(node => {
                    // 只更新目标连接节点
                    if (node.key === `connection-${connection_id}`) {
                        const connection = getConnection(connection_id);
                        const connectionStatus = getConnectionStatus(connection_id);

                        if (!connection) return node;

                        const isFav = isFavorite(connection_id);
                        const isConnecting = connectionStatus?.status === 'connecting';
                        const showLoading = forceLoading || isConnecting;

                        console.log(`🎨 节点 ${connection.name} 显示状态更新:`, {
                            forceLoading,
                            isConnecting,
                            showLoading,
                            connectionStatus: connectionStatus?.status,
                        });

                        const isConnected = isConnectionConnected(connection_id);

                        // 构建更新后的节点，确保收缩按钮的正确显示
                        const updatedNode = {
                            ...node,
                            title: (
                                <div className='flex items-center gap-2'>
                                    <span className='flex-1'>{connection.name}</span>
                                    {showLoading && (
                                        <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin'/>
                                    )}
                                    {isFav && (
                                        <Star className='w-3 h-3 text-warning fill-current'/>
                                    )}
                                </div>
                            ),
                            icon: (
                                <DatabaseIcon
                                    nodeType="connection"
                                    dbType={connection.dbType || 'influxdb'}
                                    isConnected={isConnected}
                                    size={16}
                                    className={isConnected ? 'text-success' : 'text-muted-foreground'}
                                />
                            ),
                            // 根据连接状态决定是否显示收缩按钮
                            ...(isConnected ? {children: node.children || []} : {isLeaf: true}),
                        };

                        // 如果从连接状态变为未连接状态，移除 children 属性
                        if (!isConnected && updatedNode.children) {
                            const {children, ...nodeWithoutChildren} = updatedNode;
                            return nodeWithoutChildren;
                        }

                        return updatedNode;
                    }
                    // 其他节点保持不变
                    return node;
                });
            });
        },
        [
            getConnection,
            getConnectionStatus,
            isFavorite,
            isConnectionConnected,
        ]
    );

    // 监听连接配置变化（只有连接增删改时才全量刷新）
    const prevConnectionsRef = useRef<typeof connections>([]);
    useEffect(() => {
        const prevConnections = prevConnectionsRef.current;

        // 检查是否是连接增删改操作（而不是连接状态变化）
        const isConfigChange =
            prevConnections.length !== connections.length ||
            prevConnections.some((prev, index) => {
                const current = connections[index];
                return !current || prev.id !== current.id || prev.name !== current.name;
            });

        if (isConfigChange) {
            console.log(`🔄 DatabaseExplorer: 连接配置发生变化，需要重建树`);
            console.log(
                `🔗 所有连接 (${connections.length}):`,
                connections.map(c => `${c.name} (${c.id})`)
            );

            // 新增连接时，延迟一点时间确保连接状态已同步
            const hasNewConnection = connections.length > prevConnections.length;
            const delay = hasNewConnection ? 200 : 0;

            setTimeout(() => {
                console.log(`🔄 开始重建树形数据 (延迟${delay}ms)`);
                buildCompleteTreeData(false); // 配置变化时不显示全局 loading
            }, delay);
        } else {
            console.log(`👀 DatabaseExplorer: 连接配置无变化，跳过重建`);
        }

        prevConnectionsRef.current = connections;
    }, [connections, buildCompleteTreeData]);

    // 监听连接状态变化（仅更新相关节点显示，不重建整棵树）
    const prevConnectedIdsRef = useRef<string[]>([]);
    const prevActiveIdRef = useRef<string | null>(null);

    useEffect(() => {
        const prevConnectedIds = prevConnectedIdsRef.current;
        const prevActiveId = prevActiveIdRef.current;

        // 找出状态发生变化的连接
        const changedConnections = new Set<string>();

        // 检查已连接列表的变化
        connectedConnectionIds.forEach(id => {
            if (!prevConnectedIds.includes(id)) {
                changedConnections.add(id); // 新连接
            }
        });

        prevConnectedIds.forEach(id => {
            if (!connectedConnectionIds.includes(id)) {
                changedConnections.add(id); // 断开的连接
            }
        });

        // 检查活跃连接的变化
        if (activeConnectionId !== prevActiveId) {
            if (activeConnectionId) changedConnections.add(activeConnectionId);
            if (prevActiveId) changedConnections.add(prevActiveId);
        }

        // 只更新发生变化的连接节点
        if (changedConnections.size > 0) {
            console.log(
                `🎯 DatabaseExplorer: 检测到连接状态变化:`,
                Array.from(changedConnections)
            );
            changedConnections.forEach(connectionId => {
                // 清除该连接的数据库缓存，确保下次获取最新数据
                clearDatabasesCache(connectionId);
                updateConnectionNodeDisplay(connectionId, false);
            });
        }

        // 更新引用值
        prevConnectedIdsRef.current = [...connectedConnectionIds];
        prevActiveIdRef.current = activeConnectionId;
    }, [connectedConnectionIds, activeConnectionId, updateConnectionNodeDisplay, clearDatabasesCache]);

    // 为单个连接添加数据库子节点（局部更新）
    const addDatabaseNodesToConnection = useCallback(
        async (connection_id: string) => {
            console.log(`📂 为连接 ${connection_id} 加载数据库节点`);

            const connection = getConnection(connection_id);
            if (!connection) return;

            try {
                // 获取数据库列表
                const databases = await loadDatabases(connection_id);

                setTreeData(prevData => {
                    return prevData.map(node => {
                        if (node.key === `connection-${connection_id}`) {
                            // 构建数据库子节点 - 根据展开状态设置属性
                            const databaseChildren: DataNode[] = databases.map(
                                databaseName => {
                                    const dbPath = `${connection_id}/${databaseName}`;
                                    const isFav = isFavorite(dbPath);
                                    const databaseKey = `database|${connection_id}|${databaseName}`;
                                    const isExpanded = expandedKeys.includes(databaseKey);
                                    const isOpened = isDatabaseOpened(connection_id, databaseName);

                                    const nodeData: any = {
                                        title: (
                                            <span className='flex items-center gap-1'>
                        {databaseName}
                                                {isFav && (
                                                    <Star className='w-3 h-3 text-warning fill-current'/>
                                                )}
                      </span>
                                        ),
                                        key: databaseKey,
                                        // 根据打开状态设置图标颜色：未打开为灰色，已打开为紫色
                                        icon: (
                                            <DatabaseIcon
                                                nodeType={getDatabaseNodeType(connection_id, databaseName) as any}
                                                size={16}
                                                isOpen={isOpened}
                                                className={isOpened ? 'text-purple-600' : 'text-muted-foreground'}
                                            />
                                        ),
                                    };

                                    if (isOpened) {
                                        // 已打开的数据库：设置为非叶子节点，有展开按钮和children数组
                                        nodeData.isLeaf = false;
                                        nodeData.children = []; // 空数组表示有子节点但未加载
                                    } else {
                                        // 未打开的数据库：设置为叶子节点，无展开按钮
                                        nodeData.isLeaf = true;
                                    }

                                    return nodeData;
                                }
                            );

                            return {
                                ...node,
                                children: databaseChildren,
                                isLeaf: databaseChildren.length === 0,
                            };
                        }
                        return node;
                    });
                });
            } catch (error) {
                console.error(`❌ 为连接 ${connection_id} 加载数据库失败:`, error);
            }
        },
        [getConnection, loadDatabases, isFavorite, expandedKeys]
    );

    // 清理特定连接的数据库子节点
    const clearDatabaseNodesForConnection = useCallback(
        (connection_id: string) => {
            console.log(`🧹 清理连接 ${connection_id} 的数据库子节点`);

            setTreeData(prevData => {
                return prevData.map(node => {
                    if (node.key === `connection-${connection_id}`) {
                        const {children, isLeaf, ...nodeWithoutChildren} = node;
                        return {
                            ...nodeWithoutChildren,
                            // 断开连接后，移除 children 属性并设置为叶子节点，这样就不会显示收缩按钮
                            isLeaf: true,
                        };
                    }
                    return node;
                });
            });

            // 清理该连接相关的展开状态
            setExpandedKeys(prev => {
                const filtered = prev.filter(
                    key =>
                        !String(key).startsWith(`database|${connection_id}|`) &&
                        !String(key).startsWith(`table|${connection_id}|`)
                );
                return filtered;
            });

            // 清理该连接相关的加载状态
            setLoadingNodes(prev => {
                const newSet = new Set(prev);
                Array.from(newSet).forEach(key => {
                    if (
                        String(key).startsWith(`database|${connection_id}|`) ||
                        String(key).startsWith(`table|${connection_id}|`)
                    ) {
                        newSet.delete(key);
                    }
                });
                return newSet;
            });
        },
        []
    );

    // 监听刷新触发器
    useEffect(() => {
        if (refreshTrigger) {
            console.log(`🔄 收到刷新触发器，重新加载数据...`);
            // 清除所有缓存，确保获取最新数据
            clearDatabasesCache();
            buildCompleteTreeData(true); // 外部触发器刷新时显示全局 loading
        }
    }, [refreshTrigger, buildCompleteTreeData, clearDatabasesCache]);

    // 监听已打开数据库变化，通知父组件
    useEffect(() => {
        if (onExpandedDatabasesChange) {
            console.log('🔄 DatabaseExplorer 已打开数据库列表变化:', {
                openedDatabasesList,
                timestamp: new Date().toISOString()
            });
            console.log('📤 DatabaseExplorer 通知父组件:', openedDatabasesList);
            onExpandedDatabasesChange(openedDatabasesList);
        }
    }, [openedDatabasesList, onExpandedDatabasesChange]);

    // 监听容器宽度变化，判断是否需要隐藏文字
    useEffect(() => {
        const headerElement = headerRef.current;
        if (!headerElement) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                // 当宽度小于200px时隐藏文字，只显示状态点
                setIsNarrow(width < 200);
            }
        });

        resizeObserver.observe(headerElement);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    if (collapsed) {
        return (
            <div className='h-full flex flex-col items-center py-4 space-y-4'>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant='ghost' size='icon' className='w-8 h-8'>
                            <Database className='w-4 h-4'/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side='right'>数据库浏览器</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant='ghost'
                            size='icon'
                            className='w-8 h-8'
                            onClick={refreshTree}
                            disabled={loading}
                        >
                            <RefreshCw className='w-4 h-4'/>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side='right'>刷新</TooltipContent>
                </Tooltip>
            </div>
        );
    }

    return (
        <>
            <Card className='database-explorer h-full flex flex-col'>
                {/* 头部：连接状态和操作 */}
                <CardContent className='p-3 border-b'>
                    <div ref={headerRef} className='flex items-center justify-between mb-3'>
                        <div className='flex items-center gap-2'>
                            <Typography.Text className='text-sm font-medium'>数据源</Typography.Text>
                        </div>
                        <div className='flex items-center gap-1'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={useVersionAwareTree ? 'default' : 'ghost'}
                                        size='sm'
                                        onClick={() => setUseVersionAwareTree(!useVersionAwareTree)}
                                        title={useVersionAwareTree ? '切换到传统视图' : '切换到版本感知视图'}
                                    >
                                        <GitBranch className='w-4 h-4'/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {useVersionAwareTree ? '切换到传统视图' : '切换到版本感知视图'}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={refreshTree}
                                        disabled={loading}
                                        title='刷新数据源树并测试连接'
                                    >
                                        <RefreshCw className='w-4 h-4'/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>刷新数据源树并测试连接</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => handleOpenConnectionDialog()}
                                        title='添加数据源'
                                    >
                                        <Plus className='w-4 h-4'/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>添加数据源</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* 搜索框 */}
                    <SearchInput
                        placeholder='搜索连接、数据库、表...'
                        value={searchValue}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchValue(e.target.value)}
                        onClear={() => setSearchValue('')}
                        className='text-sm'
                    />
                </CardContent>

                {/* 主要内容：数据源树 */}
                <CardContent className='flex-1 overflow-hidden p-0'>
                    <div className='px-2 h-full overflow-auto'>
                        {useVersionAwareTree ? (
                            // 版本感知树视图
                            activeConnectionId ? (
                                <SimpleTreeView
                                    connectionId={activeConnectionId}
                                    className="h-full"
                                />
                            ) : (
                                <div className='flex items-center justify-center py-8 text-gray-500'>
                                    <div className='text-center'>
                                        <Database className='w-8 h-8 mx-auto mb-2 opacity-50'/>
                                        <p className='text-sm'>请选择一个连接</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            // 传统树视图
                            <>
                                {loading ? (
                                    <div className='flex items-center justify-center py-8'>
                                        <Spin tip='加载中...'/>
                                    </div>
                                ) : treeData.length > 0 ? (
                                    <div className="relative w-full">
                                        <Tree
                                            showIcon
                                            showLine
                                            treeData={filterTreeData(treeData)}
                                            expandedKeys={expandedKeys.map(String)}
                                            onExpand={handleExpand}
                                            onSelect={handleSelect}
                                            onDoubleClick={handleDoubleClick}
                                            onRightClick={handleRightClick}
                                            loadData={loadDataAdapter}
                                            className='bg-transparent database-explorer-tree'
                                        />

                                        {/* 使用自定义定位的右键菜单 */}
                                        {contextMenuOpen && contextMenuTarget && (
                                            <div
                                                className="fixed inset-0 z-50"
                                                onClick={() => setContextMenuOpen(false)}
                                            >
                                                <div
                                                    className="absolute z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                                                    style={{
                                                        left: Math.min(contextMenuPosition.x, window.innerWidth - 200),
                                                        top: Math.min(contextMenuPosition.y, window.innerHeight - 300),
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {contextMenuTarget && (
                                                        <>
                                                            {contextMenuTarget.type === 'connection' && (
                                                                <>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">连接操作
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('copy_connection_name');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-4 h-4"/>
                                                                        复制连接名
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('create_database');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Plus className="w-4 h-4"/>
                                                                        创建数据库
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('refresh_connection');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <RefreshCw className="w-4 h-4"/>
                                                                        刷新连接
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('disconnect');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <X className="w-4 h-4"/>
                                                                        断开连接
                                                                    </button>
                                                                    <div className="my-1 h-px bg-border"/>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('connection_properties');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Settings className="w-4 h-4"/>
                                                                        连接属性
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('delete_connection');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4"/>
                                                                        删除连接
                                                                    </button>
                                                                </>
                                                            )}

                                                            {contextMenuTarget.type === 'database' && (
                                                                <>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">数据库操作
                                                                    </div>
                                                                    {/* 只有已打开的数据库才显示关闭选项 */}
                                                                    {isDatabaseOpened(contextMenuTarget.connectionId, contextMenuTarget.database) && (
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                            onClick={() => {
                                                                                handleContextMenuAction('close_database');
                                                                                setContextMenuOpen(false);
                                                                            }}
                                                                        >
                                                                            <FolderX className="w-4 h-4"/>
                                                                            关闭数据库
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('copy_database_name');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-4 h-4"/>
                                                                        复制数据库名
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('refresh_database');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <RefreshCw className="w-4 h-4"/>
                                                                        刷新数据库
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('create_measurement');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Plus className="w-4 h-4"/>
                                                                        创建测量值
                                                                    </button>
                                                                    <div className="my-1 h-px bg-border"/>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">数据库管理
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('database_info');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Info className="w-4 h-4"/>
                                                                        数据库信息
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('manage_retention_policies');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Clock className="w-4 h-4"/>
                                                                        保留策略
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('drop_database');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4"/>
                                                                        删除数据库
                                                                    </button>
                                                                </>
                                                            )}

                                                            {contextMenuTarget.type === 'table' && (
                                                                <>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">查询操作
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('query_table');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Search className="w-4 h-4"/>
                                                                        查询表
                                                                    </button>
                                                                    <div className="my-1 h-px bg-border"/>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">表操作
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('copy_table_name');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-4 h-4"/>
                                                                        复制表名
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('table_designer');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Edit className="w-4 h-4"/>
                                                                        表设计器
                                                                    </button>
                                                                    <div className="my-1 h-px bg-border"/>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('table_info');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Info className="w-4 h-4"/>
                                                                        表信息
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('drop_table');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4"/>
                                                                        删除表
                                                                    </button>
                                                                </>
                                                            )}

                                                            {contextMenuTarget.type === 'field' && (
                                                                <>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">字段操作
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('copy_field_name');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-4 h-4"/>
                                                                        复制字段名
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('field_stats');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <BarChart className="w-4 h-4"/>
                                                                        字段统计
                                                                    </button>
                                                                </>
                                                            )}

                                                            {contextMenuTarget.type === 'tag' && (
                                                                <>
                                                                    <div
                                                                        className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">标签操作
                                                                    </div>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('copy_tag_name');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Copy className="w-4 h-4"/>
                                                                        复制标签名
                                                                    </button>
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                                                        onClick={() => {
                                                                            handleContextMenuAction('tag_values');
                                                                            setContextMenuOpen(false);
                                                                        }}
                                                                    >
                                                                        <Tags className="w-4 h-4"/>
                                                                        查看标签值
                                                                    </button>
                                                                </>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className='p-4 text-center'>
                                        <div className='flex flex-col items-center justify-center py-8'>
                                            <Database className='w-8 h-8 text-muted-foreground/40 mb-3'/>
                                            <Typography.Text className='text-sm text-muted-foreground mb-4 block'>
                                                暂无数据库连接
                                            </Typography.Text>
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => handleOpenConnectionDialog()}
                                                className='text-xs h-8 px-3 border border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                                            >
                                                <Plus className='w-3 h-3 mr-1'/>
                                                添加连接
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>


            </Card>

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
                open={createDatabaseDialogOpen}
                onClose={() => setCreateDatabaseDialogOpen(false)}
                onSuccess={() => {
                    // 刷新树形数据
                    buildCompleteTreeData(true);
                }}
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
                connectionId={activeConnectionId || ''}
                onClose={() => setRetentionPolicyDialog({
                    open: false,
                    mode: 'create',
                    database: '',
                    policy: null,
                })}
                onSuccess={() => {
                    // 刷新数据库信息
                    buildCompleteTreeData(true);
                }}
            />

            {/* 连接配置对话框 */}
            <SimpleConnectionDialog
                visible={isConnectionDialogVisible}
                connection={editingConnection || undefined}
                onCancel={handleCloseConnectionDialog}
                onSuccess={handleConnectionSuccess}
            />
        </>
    );
};

export default DatabaseExplorer;
