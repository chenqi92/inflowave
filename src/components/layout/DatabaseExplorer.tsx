import React, {useState, useEffect, useCallback} from 'react';
import {
    Tree,
    Input,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Button,
    Tooltip,
    Badge,
    Spin,
    Typography
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
    Link,
    GitBranch,
    Star,
    StarOff,
    Trash2,
    Calendar,
    MousePointer
} from 'lucide-react';
import {TooltipTrigger, TooltipContent} from '@/components/ui/tooltip';
import {useConnectionStore} from '@/store/connection';
import {useFavoritesStore, favoritesUtils} from '@/store/favorites';
import {safeTauriInvoke} from '@/utils/tauri';
import {showMessage} from '@/utils/message';

// Note: Using Input directly for search functionality
// Note: Using TabsContent instead of TabPane

interface DataNode {
    key: string | number;
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
        label: React.ReactNode;
        icon?: React.ReactNode;
        onClick?: () => void;
        disabled?: boolean;
    }>;
}

interface DatabaseExplorerProps {
    collapsed?: boolean;
    refreshTrigger?: number; // 用于触发刷新
    onTableDoubleClick?: (database: string, table: string, query: string) => void; // 表格双击回调
    currentTimeRange?: {
        label: string;
        value: string;
        start: string;
        end: string;
    }; // 当前时间范围
}

interface TableInfo {
    name: string;
    tags: string[];
    fields: Array<{ name: string; type: string }>;
}

interface DatabaseInfo {
    name: string;
    tables: TableInfo[];
}

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
                                                               collapsed = false,
                                                               refreshTrigger,
                                                               onTableDoubleClick,
                                                               currentTimeRange
                                                           }) => {
    const {
        connections,
        activeconnection_id,
        connectedConnectionIds,
        getConnection,
        addConnection,
        connectToDatabase,
        disconnectFromDatabase,
        getConnectionStatus,
        isConnectionConnected
    } = useConnectionStore();
    const {
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        getFavoritesByType,
        markAsAccessed
    } = useFavoritesStore();
    const [treeData, setTreeData] = useState<DataNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
    const [favoritesFilter, setFavoritesFilter] = useState<'all' | 'connection' | 'database' | 'table' | 'field' | 'tag'>('all');


    const activeConnection = activeconnection_id ? getConnection(activeconnection_id) : null;

    // 生成时间条件语句（使用当前选择的时间范围）
    const generateTimeCondition = (): string => {
        if (currentTimeRange && currentTimeRange.start && currentTimeRange.end) {
            // 使用当前选择的时间范围
            if (currentTimeRange.end === 'now()') {
                return `time >= ${currentTimeRange.start}`;
            } else {
                return `time >= ${currentTimeRange.start} AND time <= ${currentTimeRange.end}`;
            }
        }
        // 默认使用最近1小时的数据
        return `time >= now() - 1h`;
    };

    // 生成带时间筛选的查询语句
    const generateQueryWithTimeFilter = (table: string): string => {
        const timeCondition = generateTimeCondition();
        const limit = 'LIMIT 500'; // 默认分页500条

        if (timeCondition) {
            return `SELECT *
                    FROM "${table}"
                    WHERE ${timeCondition} ${limit}`;
        } else {
            return `SELECT *
                    FROM "${table}" ${limit}`;
        }
    };

    // 加载指定连接的数据库列表
    const loadDatabases = useCallback(async (connection_id: string): Promise<string[]> => {
        console.log(`🔍 开始加载连接 ${connection_id} 的数据库列表...`);
        try {
            // 首先验证连接是否在后端存在
            const backendConnections = await safeTauriInvoke<any[]>('get_connections');
            const backendConnection = backendConnections?.find((c: any) => c.id === connection_id);

            if (!backendConnection) {
                console.warn(`⚠️ 连接 ${connection_id} 在后端不存在，尝试重新创建...`);

                // 从前端获取连接配置
                const connection = getConnection(connection_id);
                if (connection) {
                    try {
                        // 重新创建连接到后端
                        const connectionWithTimestamp = {
                            ...connection,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };
                        const newConnectionId = await safeTauriInvoke<string>('create_connection', {config: connectionWithTimestamp});
                        console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);

                        // 如果ID发生变化，需要同步到前端存储
                        if (newConnectionId !== connection_id) {
                            const newConnection = {...connection, id: newConnectionId};
                            addConnection(newConnection);
                            showMessage.warning('连接配置已重新同步，请刷新页面或重新选择连接');
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

            const dbList = await safeTauriInvoke<string[]>('get_databases', {connectionId: connection_id});
            console.log(`✅ 成功加载数据库列表:`, dbList);
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
    }, [getConnection]);

    // 加载指定数据库的表列表
    const loadTables = useCallback(async (connection_id: string, database: string): Promise<string[]> => {
        console.log(`🔍 开始加载数据库 "${database}" 的表列表...`);
        try {
            // 验证连接是否存在（简化版，因为loadDatabases已经做过验证）
            const tables = await safeTauriInvoke<string[]>('get_measurements', {
                connectionId: connection_id,
                database
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
    }, []);

    // 加载指定表的字段和标签信息
    const loadTableSchema = useCallback(async (connection_id: string, database: string, table: string): Promise<{
        tags: string[];
        fields: Array<{ name: string; type: string }>
    }> => {
        try {
            // 尝试分别获取字段和标签信息
            const [tags, fields] = await Promise.all([
                safeTauriInvoke<string[]>('get_tag_keys', {
                    connectionId: connection_id,
                    database,
                    measurement: table
                }).catch(() => []),
                safeTauriInvoke<string[]>('get_field_keys', {
                    connectionId: connection_id,
                    database,
                    measurement: table
                }).catch(() => []),
            ]);

            // 将字段转换为带类型的格式
            const fieldsWithType = fields.map(fieldName => ({
                name: fieldName,
                type: 'float' // 默认类型，因为 InfluxDB 字段类型需要额外查询
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
    }, []);

    // 获取连接状态指示器颜色
    const getConnectionStatusColor = (connection_id: string) => {
        const status = getConnectionStatus(connection_id);
        const isConnected = isConnectionConnected(connection_id);

        console.log(`🎨 获取连接状态颜色: ${connection_id}`, {
            statusObj: status,
            statusValue: status?.status,
            isConnected,
            finalColor: status?.status === 'error' ? 'red' :
                isConnected ? 'green' :
                    status?.status === 'connecting' ? 'yellow' : 'gray'
        });

        // 优先检查错误状态
        if (status?.status === 'error') return 'bg-destructive';

        // 检查是否在已连接列表中（主要标准）
        if (isConnected) return 'bg-success';

        // 检查是否正在连接
        if (status?.status === 'connecting') return 'bg-warning';

        // 默认未连接状态
        return 'bg-muted';
    };

    // 构建完整的树形数据
    const buildCompleteTreeData = useCallback(async () => {
        console.log(`🏗️ 开始构建树形数据，已连接: [${connectedConnectionIds.join(', ')}]`);
        setLoading(true);
        const treeNodes: DataNode[] = [];

        for (const connection of connections) {
            const isConnected = isConnectionConnected(connection.id);
            const connectionPath = connection.id;
            const isFav = isFavorite(connectionPath);
            const connectionNode: DataNode = {
                title: (
                    <div className="flex items-center gap-2">
                        <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${getConnectionStatusColor(connection.id)}`}/>
                        <span className="flex-1">{connection.name}</span>
                        {isFav && <Star className="w-3 h-3 text-warning fill-current"/>}
                    </div>
                ),
                key: `connection-${connection.id}`,
                icon: <Link className="w-4 h-4 text-primary"/>,
                children: []
            };

            // 为已连接的连接加载数据库
            if (isConnected && connection.id) {
                console.log(`🔗 处理已连接: ${connection.name} (${connection.id})`);
                try {
                    const databases = await loadDatabases(connection.id);
                    console.log(`📁 为连接 ${connection.name} 创建 ${databases.length} 个数据库节点`);
                    connectionNode.children = databases.map(db => {
                        const dbPath = `${connection.id}/${db}`;
                        const isFav = isFavorite(dbPath);
                        return {
                            title: (
                                <span className="flex items-center gap-1">
                  {db}
                                    {isFav && <Star className="w-3 h-3 text-warning fill-current"/>}
                </span>
                            ),
                            key: `database-${connection.id}-${db}`,
                            icon: <Database className="w-4 h-4 text-purple-600"/>,
                            isLeaf: false,
                            children: [], // 空数组表示有子节点但未加载
                            // 延迟加载表数据
                        };
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
        setLoading(false);
    }, [connections, connectedConnectionIds, isConnectionConnected, getConnectionStatus, loadDatabases]);

    // 动态加载节点数据
    const loadData = useCallback(async (node: any): Promise<void> => {
        const {key} = node;
        console.log(`🔄 开始动态加载节点: ${key}`);

        if (loadingNodes.has(key)) {
            console.log(`⏳ 节点 ${key} 正在加载中，跳过`);
            return;
        }

        setLoadingNodes(prev => new Set(prev).add(key));

        try {
            if (key.startsWith('database-')) {
                // 加载表列表
                const [, connectionId, database] = key.split('-', 3);
                console.log(`📋 加载数据库表列表: connectionId=${connectionId}, database=${database}`);
                const tables = await loadTables(connectionId, database);

                const tableNodes: DataNode[] = tables.map(table => {
                    const tablePath = `${connectionId}/${database}/${table}`;
                    const isFav = isFavorite(tablePath);
                    return {
                        title: (
                            <div className="flex items-center gap-2">
                                <span className="flex-1">{table}</span>
                                {isFav && <Star className="w-3 h-3 text-warning fill-current"/>}
                                <span className="text-xs text-muted-foreground flex-shrink-0">表</span>
                            </div>
                        ),
                        key: `table-${connectionId}-${database}-${table}`,
                        icon: <Table className="w-4 h-4 text-success"/>,
                        isLeaf: false,
                        children: [] // 空数组表示有子节点但未加载
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
            } else if (key.startsWith('table-')) {
                // 加载表的字段和标签
                const [, connectionId, database, table] = key.split('-', 4);
                const {tags, fields} = await loadTableSchema(connectionId, database, table);

                const children: DataNode[] = [];

                // 直接添加标签列
                tags.forEach(tag => {
                    const tagPath = `${connectionId}/${database}/${table}/tags/${tag}`;
                    const isFav = isFavorite(tagPath);
                    children.push({
                        title: (
                            <div className="flex items-center gap-2">
                                <span className="flex-1">{tag}</span>
                                {isFav && <Star className="w-3 h-3 text-warning fill-current"/>}
                                <span
                                    className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-600 rounded flex-shrink-0">
                  Tag
                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">string</span>
                            </div>
                        ),
                        key: `tag-${connectionId}-${database}-${table}-${tag}`,
                        icon: <Tags className="w-4 h-4 text-orange-500"/>,
                        isLeaf: true
                    });
                });

                // 直接添加字段列
                fields.forEach(field => {
                    const fieldPath = `${connectionId}/${database}/${table}/${field.name}`;
                    const isFav = isFavorite(fieldPath);
                    const getFieldIcon = (type: string) => {
                        switch (type.toLowerCase()) {
                            case 'number':
                            case 'float':
                            case 'integer':
                            case 'int64':
                                return <Hash className="w-4 h-4 text-primary"/>;
                            case 'string':
                            case 'text':
                                return <FileText className="w-4 h-4 text-muted-foreground"/>;
                            case 'time':
                            case 'timestamp':
                                return <Clock className="text-purple-500"/>;
                            case 'boolean':
                            case 'bool':
                                return <GitBranch className="w-4 h-4 text-success"/>;
                            default:
                                return <File className="w-4 h-4 text-muted-foreground"/>;
                        }
                    };

                    children.push({
                        title: (
                            <div className="flex items-center gap-2">
                                <span className="flex-1">{field.name}</span>
                                {isFav && <Star className="w-3 h-3 text-warning fill-current"/>}
                                <span
                                    className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded flex-shrink-0">
                  Field
                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{field.type}</span>
                            </div>
                        ),
                        key: `field-${connectionId}-${database}-${table}-${field.name}`,
                        icon: getFieldIcon(field.type),
                        isLeaf: true
                    });
                });

                // 更新树数据，同时更新表节点显示列数
                setTreeData(prevData => {
                    const updateNode = (nodes: DataNode[]): DataNode[] => {
                        return nodes.map(node => {
                            if (node.key === key) {
                                const totalColumns = tags.length + fields.length;
                                const updatedTitle = (
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1">{table}</span>
                                        <span className="text-xs text-muted-foreground flex-shrink-0">
                      {totalColumns} 列
                    </span>
                                    </div>
                                );
                                return {
                                    ...node,
                                    children,
                                    title: updatedTitle
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
            showMessage.error(`加载数据失败: ${error}`);
        } finally {
            setLoadingNodes(prev => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
            });
        }
    }, [loadingNodes]);

    // 处理收藏操作
    const handleToggleFavorite = useCallback((nodeKey: string) => {
        const paths = {
            connection: (key: string) => key.replace('connection-', ''),
            database: (key: string) => {
                const [, connectionId, database] = key.split('-');
                return `${connectionId}/${database}`;
            },
            table: (key: string) => {
                const [, connectionId, database, table] = key.split('-');
                return `${connectionId}/${database}/${table}`;
            },
            field: (key: string) => {
                const [, connectionId, database, table, field] = key.split('-');
                return `${connectionId}/${database}/${table}/${field}`;
            },
            tag: (key: string) => {
                const [, connectionId, database, table, tag] = key.split('-');
                return `${connectionId}/${database}/${table}/tags/${tag}`;
            }
        };

        let path = '';
        let connectionId = '';

        if (nodeKey.startsWith('connection-')) {
            connectionId = nodeKey.replace('connection-', '');
            path = paths.connection(nodeKey);
        } else if (nodeKey.startsWith('database-')) {
            const [, connId] = nodeKey.split('-');
            connectionId = connId;
            path = paths.database(nodeKey);
        } else if (nodeKey.startsWith('table-')) {
            const [, connId] = nodeKey.split('-');
            connectionId = connId;
            path = paths.table(nodeKey);
        } else if (nodeKey.startsWith('field-')) {
            const [, connId] = nodeKey.split('-');
            connectionId = connId;
            path = paths.field(nodeKey);
        } else if (nodeKey.startsWith('tag-')) {
            const [, connId] = nodeKey.split('-');
            connectionId = connId;
            path = paths.tag(nodeKey);
        }

        if (isFavorite(path)) {
            const favorite = favorites.find(fav => fav.path === path);
            if (favorite) {
                removeFavorite(favorite.id);
                showMessage.success('已取消收藏');
            }
        } else {
            const favoriteItem = favoritesUtils.createFavoriteFromPath(path, connectionId, connections);
            if (favoriteItem) {
                addFavorite(favoriteItem);
                showMessage.success('已添加到收藏');
            }
        }
    }, [favorites, connections, isFavorite, addFavorite, removeFavorite]);

    // 处理节点右键菜单
    const getContextMenu = (node: DataNode): MenuProps['items'] => {
        const key = node.key as string;
        const paths = {
            connection: () => key.replace('connection-', ''),
            database: () => {
                const [, connectionId, database] = key.split('-');
                return `${connectionId}/${database}`;
            },
            table: () => {
                const [, connectionId, database, table] = key.split('-');
                return `${connectionId}/${database}/${table}`;
            },
            field: () => {
                const [, connectionId, database, table, field] = key.split('-');
                return `${connectionId}/${database}/${table}/${field}`;
            },
            tag: () => {
                const [, connectionId, database, table, tag] = key.split('-');
                return `${connectionId}/${database}/${table}/tags/${tag}`;
            }
        };

        let path = '';
        if (key.startsWith('connection-')) path = paths.connection();
        else if (key.startsWith('database-')) path = paths.database();
        else if (key.startsWith('table-')) path = paths.table();
        else if (key.startsWith('field-')) path = paths.field();
        else if (key.startsWith('tag-')) path = paths.tag();

        const isFav = isFavorite(path);

        const favoriteMenuItem = {
            key: 'toggle-favorite',
            label: isFav ? '取消收藏' : '添加到收藏',
            icon: isFav ? <StarOff className="w-4 h-4"/> : <Star className="w-4 h-4"/>,
            onClick: () => handleToggleFavorite(key)
        };

        if (key.startsWith('database-')) {
            return [
                favoriteMenuItem,
                {type: 'divider'},
                {
                    key: 'refresh-db',
                    label: '刷新数据库',
                    icon: <RefreshCw className="w-4 h-4"/>
                },
                {
                    key: 'new-query',
                    label: '新建查询',
                    icon: <FileText className="w-4 h-4"/>
                },
                {type: 'divider'},
                {
                    key: 'db-properties',
                    label: '属性',
                    icon: <Settings className="w-4 h-4"/>
                },
            ];
        }

        if (key.startsWith('table-')) {
            return [
                favoriteMenuItem,
                {type: 'divider'},
                {
                    key: 'refresh-table',
                    label: '刷新表结构',
                    icon: <RefreshCw className="w-4 h-4"/>
                },
                {
                    key: 'query-table',
                    label: '查询此表',
                    icon: <FileText className="w-4 h-4"/>
                },
                {type: 'divider'},
                {
                    key: 'table-properties',
                    label: '表属性',
                    icon: <Settings className="w-4 h-4"/>
                },
            ];
        }

        if (key.startsWith('field-') || key.startsWith('tag-')) {
            return [
                favoriteMenuItem,
                {type: 'divider'},
                {
                    key: 'insert-column',
                    label: '插入到查询',
                    icon: <FileText className="w-4 h-4"/>
                },
                {
                    key: 'copy-name',
                    label: '复制列名',
                    icon: <File className="w-4 h-4"/>
                },
            ];
        }

        if (key.startsWith('connection-')) {
            return [
                favoriteMenuItem,
                {type: 'divider'},
                {
                    key: 'refresh-connection',
                    label: '刷新连接',
                    icon: <RefreshCw className="w-4 h-4"/>
                },
            ];
        }

        return [];
    };

    // 处理树节点展开
    const handleExpand = (expandedKeysValue: React.Key[]) => {
        setExpandedKeys(expandedKeysValue);
    };

    // 处理连接操作
    const handleConnectionToggle = async (connection_id: string) => {
        const isCurrentlyConnected = isConnectionConnected(connection_id);
        const connection = getConnection(connection_id);

        if (!connection) {
            showMessage.error('连接配置不存在');
            return;
        }

        console.log(`🔄 开始连接操作: ${connection.name}, 当前状态: ${isCurrentlyConnected ? '已连接' : '未连接'}`);

        try {
            if (isCurrentlyConnected) {
                // 断开连接
                await disconnectFromDatabase(connection_id);
                showMessage.success(`已断开连接: ${connection.name}`);
            } else {
                // 建立连接
                await connectToDatabase(connection_id);
                showMessage.success(`已连接: ${connection.name}`);
            }
            // 不需要手动重新构建树，依赖更新会自动触发
            console.log(`✅ 连接操作完成: ${connection.name}`);
        } catch (error) {
            console.error(`❌ 连接操作失败:`, error);
            showMessage.error(`连接操作失败: ${error}`);
        }
    };

    // 处理节点双击
    const handleDoubleClick = (info: any) => {
        const {node} = info;
        const key = node.key as string;

        if (key.startsWith('connection-')) {
            // 连接节点被双击，切换连接状态
            const connectionId = key.replace('connection-', '');
            handleConnectionToggle(connectionId);
        } else if (key.startsWith('table-')) {
            // 表节点被双击，自动生成查询
            const parts = key.split('-');
            if (parts.length >= 4) {
                const connectionId = parts[1];
                const database = parts[2];
                const table = parts.slice(3).join('-'); // 处理表名包含连字符的情况

                // 生成带时间筛选的查询
                const query = generateQueryWithTimeFilter(table);

                // 调用回调函数执行查询
                if (onTableDoubleClick) {
                    onTableDoubleClick(database, table, query);
                    const timeDesc = currentTimeRange ? currentTimeRange.label : '最近1小时';
                    showMessage.info(`正在查询表 "${table}" 的数据（时间范围：${timeDesc}）...`);
                } else {
                    // 如果没有回调，复制查询到剪贴板
                    navigator.clipboard.writeText(query).then(() => {
                        showMessage.success(`查询语句已复制到剪贴板: ${query}`);
                    }).catch(() => {
                        showMessage.info(`查询语句: ${query}`);
                    });
                }
            }
        }
    };

    // 处理节点选择
    const handleSelect = (selectedKeys: React.Key[], info: any) => {
        const {node} = info;
        console.log('选中节点:', node);

        // 根据选中的节点类型执行相应操作
        if (node.key.startsWith('database-')) {
            // 数据库节点被选中
            console.log('选中数据库:', node.title);
        } else if (node.key.startsWith('table-')) {
            // 表节点被选中
            console.log('选中表:', node.title);
        } else if (node.key.startsWith('field-') || node.key.startsWith('tag-')) {
            // 字段或标签节点被选中
            console.log('选中字段/标签:', node.title);
        }
    };

    // 提取节点文本内容用于搜索
    const extractTextFromNode = (node: DataNode): string => {
        // 从key中提取实际的名称
        const key = node.key as string;
        if (key.startsWith('connection-')) {
            // 从连接store中获取连接名称
            const connectionId = key.replace('connection-', '');
            const connection = getConnection(connectionId);
            return connection?.name || '';
        } else if (key.startsWith('database-')) {
            // 提取数据库名称
            const parts = key.split('-');
            return parts[2] || '';
        } else if (key.startsWith('table-')) {
            // 提取表名称
            const parts = key.split('-');
            return parts[3] || '';
        } else if (key.startsWith('field-') || key.startsWith('tag-')) {
            // 提取字段/标签名称
            const parts = key.split('-');
            return parts[4] || '';
        }
        return '';
    };

    // 搜索过滤
    const filterTreeData = (data: DataNode[]): DataNode[] => {
        if (!searchValue.trim()) return data;

        const filterNode = (node: DataNode): DataNode | null => {
            const nodeText = extractTextFromNode(node);
            const titleMatch = nodeText.toLowerCase().includes(searchValue.toLowerCase());

            let filteredChildren: DataNode[] = [];
            if (node.children) {
                filteredChildren = node.children
                    .map(child => filterNode(child))
                    .filter(Boolean) as DataNode[];
            }

            if (titleMatch || filteredChildren.length > 0) {
                return {
                    ...node,
                    children: filteredChildren.length > 0 ? filteredChildren : node.children
                };
            }

            return null;
        };

        return data.map(node => filterNode(node)).filter(Boolean) as DataNode[];
    };

    // 刷新树数据
    const refreshTree = useCallback(() => {
        buildCompleteTreeData();
    }, [buildCompleteTreeData]);

    // 监听连接和连接变化
    useEffect(() => {
        console.log(`🔄 DatabaseExplorer: 连接或连接状态发生变化`);
        console.log(`🔗 所有连接 (${connections.length}):`, connections.map(c => `${c.name} (${c.id})`));
        console.log(`✨ 已连接ID: [${connectedConnectionIds.join(', ')}]`);
        console.log(`🎯 活跃连接ID: ${activeconnection_id}`);
        buildCompleteTreeData();
    }, [connections, connectedConnectionIds, activeconnection_id]); // 移除buildCompleteTreeData从依赖数组

    // 监听刷新触发器
    useEffect(() => {
        if (refreshTrigger) {
            console.log(`🔄 收到刷新触发器，重新加载数据...`);
            buildCompleteTreeData();
        }
    }, [refreshTrigger]); // 移除buildCompleteTreeData从依赖数组

    if (collapsed) {
        return (
            <div className="h-full flex flex-col items-center py-4 space-y-4">
                <Tooltip title="数据库浏览器" placement="right">
                    <Button
                        type="text"
                        icon={<Database className="w-4 h-4"/>}
                        className="w-8 h-8"
                    />
                </Tooltip>
                <Tooltip title="刷新" placement="right">
                    <Button
                        type="text"
                        icon={<RefreshCw className="w-4 h-4"/>}
                        className="w-8 h-8"
                        onClick={refreshTree}
                        disabled={loading}
                    />
                </Tooltip>
            </div>
        );
    }

    return (
        <div className="database-explorer h-full flex flex-col bg-background border-0 shadow-none">
            {/* 头部：连接状态和操作 */}
            <div className="p-3 border-b border">
                <div className="flex items-center justify-between mb-3">
                    <Badge
                        variant={activeConnection ? "default" : "secondary"}
                        className={activeConnection ? "bg-success text-success-foreground" : ""}
                    >
            <span className="text-sm font-medium">
              {activeConnection ? activeConnection.name : '未连接'}
            </span>
                    </Badge>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={refreshTree}
                                disabled={loading}
                            >
                                <RefreshCw className="w-4 h-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>刷新</TooltipContent>
                    </Tooltip>
                </div>

                {/* 搜索框 */}
                <Input
                    placeholder="搜索连接、数据库、表..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="text-sm"
                />

            </div>

            {/* 主要内容：标签页 */}
            <div className="flex-1 overflow-hidden p-0">
                <Tabs defaultValue="explorer" className="h-full">
                    <TabsList className="ml-3">
                        <TabsTrigger value="explorer" className="flex items-center gap-1">
                            <Database className="w-4 h-4"/>
                            数据源
                        </TabsTrigger>
                        <TabsTrigger value="favorites" className="flex items-center gap-1">
                            <Star className="w-4 h-4"/>
                            收藏 ({favorites.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="explorer" className="px-2 h-full overflow-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Spin tip="加载中..."/>
                            </div>
                        ) : treeData.length > 0 ? (
                            <Tree
                                showIcon
                                showLine
                                loadData={loadData}
                                treeData={filterTreeData(treeData)}
                                expandedKeys={expandedKeys}
                                onExpand={handleExpand}
                                onSelect={handleSelect}
                                onDoubleClick={handleDoubleClick}
                                className="bg-transparent database-explorer-tree"
                            />
                        ) : (
                            <div className="text-center text-muted-foreground mt-8 border-0 shadow-none">
                                <div className="pt-6">
                                    <Database className="w-8 h-8 mx-auto mb-2"/>
                                    <p>暂无连接</p>
                                    <Typography.Text
                                        className="text-sm mt-1">请在连接管理中添加数据库连接</Typography.Text>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="favorites" className="px-2 h-full overflow-auto">
                        {/* 收藏过滤器 */}
                        <div className="p-2 border-b border-0 shadow-none">
                            <div className="flex flex-wrap gap-1 p-0">
                                {[
                                    {key: 'all', label: '全部', icon: Star},
                                    {key: 'connection', label: '连接', icon: Link},
                                    {key: 'database', label: '数据库', icon: Database},
                                    {key: 'table', label: '表', icon: Table},
                                    {key: 'field', label: '字段', icon: Hash},
                                    {key: 'tag', label: '标签', icon: Tags}
                                ].map(({key, label, icon: IconComponent}) => {
                                    const count = key === 'all' ? favorites.length : getFavoritesByType(key as any).length;
                                    return (
                                        <Button
                                            key={key}
                                            variant={favoritesFilter === key ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => setFavoritesFilter(key as any)}
                                            className="px-2 py-1 h-auto text-xs flex items-center gap-1"
                                        >
                                            <IconComponent className="w-3 h-3"/>
                                            {label}
                                            <span className="bg-background/20 px-1 rounded">{count}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 收藏列表 */}
                        <div className="p-2 border-0 shadow-none">
                            <div className="p-0">
                                {(() => {
                                    const filteredFavorites = favoritesFilter === 'all'
                                        ? favorites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                        : getFavoritesByType(favoritesFilter);

                                    if (filteredFavorites.length === 0) {
                                        return (
                                            <div className="text-center text-muted-foreground py-8">
                                                <Star className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                                                <p className="text-sm">
                                                    {favoritesFilter === 'all' ? '暂无收藏项' : `暂无${favoritesFilter}类型的收藏`}
                                                </p>
                                                <p className="text-xs mt-1">右键数据源树节点可添加收藏</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-1">
                                            {filteredFavorites.map((favorite) => {
                                                const IconComponent = (() => {
                                                    switch (favorite.type) {
                                                        case 'connection':
                                                            return Link;
                                                        case 'database':
                                                            return Database;
                                                        case 'table':
                                                            return Table;
                                                        case 'field':
                                                            return Hash;
                                                        case 'tag':
                                                            return Tags;
                                                        default:
                                                            return Star;
                                                    }
                                                })();

                                                const colorClass = favoritesUtils.getFavoriteColor(favorite.type);

                                                return (
                                                    <div
                                                        key={favorite.id}
                                                        className="group p-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer"
                                                        onClick={() => {
                                                            markAsAccessed(favorite.id);
                                                            // 这里可以添加导航到收藏项的逻辑
                                                            showMessage.info(`访问收藏: ${favorite.name}`);
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <IconComponent
                                                                className={`w-4 h-4 mt-0.5 ${colorClass} flex-shrink-0`}/>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span
                                                                        className="font-medium text-sm truncate">{favorite.name}</span>
                                                                    <span
                                                                        className={`px-1.5 py-0.5 text-xs rounded ${colorClass} bg-current/10`}>
                                  {favorite.type}
                                </span>
                                                                </div>
                                                                {favorite.description && (
                                                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                                                        {favorite.description}
                                                                    </p>
                                                                )}
                                                                <div
                                                                    className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3"/>
                                    {new Date(favorite.createdAt).toLocaleDateString()}
                                </span>
                                                                    {favorite.accessCount > 0 && (
                                                                        <span className="flex items-center gap-1">
                                    <MousePointer className="w-3 h-3"/>
                                                                            {favorite.accessCount}次
                                  </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeFavorite(favorite.id);
                                                                    showMessage.success('已移除收藏');
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3"/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default DatabaseExplorer;