import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Tree,
  TreeNode,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Badge,
  Spin,
  Typography,
  Card,
  CardContent,
  Space,
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
  MousePointer,
  X,
  Plus,
  Info,
  Search,
  Edit,
  Copy,
  BarChart,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useFavoritesStore, favoritesUtils } from '@/store/favorites';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';
import { dialog } from '@/utils/dialog';
// DropdownMenu相关组件已移除，使用自定义右键菜单

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
  onViewChange?: (view: string) => void; // 视图切换回调
  onGetCurrentView?: () => string; // 获取当前视图回调
  onExpandedDatabasesChange?: (databases: string[]) => void; // 已展开数据库列表变化回调
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
  onViewChange,
  onGetCurrentView,
  onExpandedDatabasesChange,
  currentTimeRange,
}) => {
  const {
    connections,
    activeConnectionId,
    connectedConnectionIds,
    connectionStatuses,
    getConnection,
    addConnection,
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
    getFavoritesByType,
    markAsAccessed,
  } = useFavoritesStore();
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [_connectionLoadingStates, setConnectionLoadingStates] = useState<
    Map<string, boolean>
  >(new Map());
  const [favoritesFilter, setFavoritesFilter] = useState<
    'all' | 'connection' | 'database' | 'table' | 'field' | 'tag'
  >('all');
  const [_updateTimeouts, setUpdateTimeouts] = useState<
    Map<string, number>
  >(new Map());

  const activeConnection = activeConnectionId
    ? getConnection(activeConnectionId)
    : null;
  const activeConnectionStatus = activeConnectionId
    ? connectionStatuses[activeConnectionId]
    : null;

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

    if (timeCondition) {
      return `SELECT *
                    FROM "${table}"
                    WHERE ${timeCondition}
                    ${limit}`;
    } else {
      return `SELECT *
                    FROM "${table}"
                    ${limit}`;
    }
  };

  // 加载指定连接的数据库列表
  const loadDatabases = useCallback(
    async (connection_id: string): Promise<string[]> => {
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
                { config: connectionWithTimestamp }
              );
              console.log(`✨ 连接已重新创建，新ID: ${newConnectionId}`);

              // 如果ID发生变化，需要同步到前端存储
              if (newConnectionId !== connection_id) {
                const newConnection = { ...connection, id: newConnectionId };
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

        const dbList = await safeTauriInvoke<string[]>('get_databases', {
          connectionId: connection_id,
        });
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
    },
    [getConnection, addConnection]
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
        // 尝试分别获取字段和标签信息
        const [tags, fields] = await Promise.all([
          safeTauriInvoke<string[]>('get_tag_keys', {
            connectionId: connection_id,
            database,
            measurement: table,
          }).catch(() => []),
          safeTauriInvoke<string[]>('get_field_keys', {
            connectionId: connection_id,
            database,
            measurement: table,
          }).catch(() => []),
        ]);

        // 将字段转换为带类型的格式
        const fieldsWithType = fields.map(fieldName => ({
          name: fieldName,
          type: 'float', // 默认类型，因为 InfluxDB 字段类型需要额外查询
        }));

        return { tags: tags || [], fields: fieldsWithType };
      } catch (error) {
        console.error(`加载表 ${table} 的架构失败:`, error);

        // 如果是连接不存在的错误，显示友好消息
        const errorStr = String(error);
        if (errorStr.includes('连接') && errorStr.includes('不存在')) {
          showMessage.error(`连接不存在，无法加载表 ${table} 的架构`);
        }
        return { tags: [], fields: [] };
      }
    },
    []
  );

  // 获取连接状态指示器颜色
  const getConnectionStatusColor = useCallback((connection_id: string) => {
    const status = getConnectionStatus(connection_id);
    const isConnected = isConnectionConnected(connection_id);

    console.log(`🎨 获取连接状态颜色: ${connection_id}`, {
      statusObj: status,
      statusValue: status?.status,
      isConnected,
      finalColor:
        status?.status === 'error'
          ? 'red'
          : isConnected
            ? 'green'
            : status?.status === 'connecting'
              ? 'yellow'
              : 'gray',
    });

    // 优先检查错误状态
    if (status?.status === 'error') return 'bg-destructive';

    // 检查是否在已连接列表中（主要标准）
    if (isConnected) return 'bg-success';

    // 检查是否正在连接
    if (status?.status === 'connecting') return 'bg-warning';

    // 默认未连接状态
    return 'bg-muted-foreground';
  }, [getConnectionStatus, isConnectionConnected]);

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
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${getConnectionStatusColor(connection.id)}`}
            />
            <span className='flex-1'>{connection.name}</span>
            {showLoading && (
              <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin' />
            )}
            {isFav && <Star className='w-3 h-3 text-warning fill-current' />}
          </div>
        ),
        key: `connection-${connection.id}`,
        icon: isConnected ? (
          <Database className='w-4 h-4 text-success' />
        ) : (
          <Link className='w-4 h-4 text-muted-foreground' />
        ),
        // 只有连接状态才设置children数组，未连接状态不设置（这样就不会显示收缩按钮）
        ...(isConnected ? { children: [] } : { isLeaf: true }),
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
            const databaseKey = `database-${connection.id}-${db}`;
            const isExpanded = expandedKeys.includes(databaseKey);

            const nodeData: any = {
              title: (
                <span className='flex items-center gap-1'>
                  {db}
                  {isFav && (
                    <Star className='w-3 h-3 text-warning fill-current' />
                  )}
                </span>
              ),
              key: databaseKey,
              // 根据展开状态设置图标颜色：未展开为灰色，已展开为紫色
              icon: <Database className={`w-4 h-4 ${isExpanded ? 'text-purple-600' : 'text-muted-foreground'}`} />,
            };

            if (isExpanded) {
              // 已展开的数据库：设置为非叶子节点，有children数组
              nodeData.isLeaf = false;
              nodeData.children = [];
            } else {
              // 未展开的数据库：设置为叶子节点，不设置children属性
              nodeData.isLeaf = true;
              // 不设置children属性，这样Tree组件就不会显示展开按钮
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
    expandedKeys, // 添加expandedKeys依赖，确保展开状态变化时重新构建树形数据
  ]);

  // 动态加载节点数据
  const loadData = useCallback(
    async (node: DataNode): Promise<void> => {
      const { key } = node;
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
        if (String(key).startsWith('database-')) {
          // 加载表列表
          const [, connectionId, database] = String(key).split('-', 3);
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
                    <Star className='w-3 h-3 text-warning fill-current' />
                  )}
                  <span className='text-xs text-muted-foreground flex-shrink-0'>
                    表
                  </span>
                </div>
              ),
              key: `table-${connectionId}-${database}-${table}`,
              icon: <Table className='w-4 h-4 text-success' />,
              isLeaf: false,
              children: [], // 空数组表示有子节点但未加载
            };
          });

          // 更新树数据
          setTreeData(prevData => {
            const updateNode = (nodes: DataNode[]): DataNode[] => {
              return nodes.map(node => {
                if (node.key === key) {
                  return { ...node, children: tableNodes };
                }
                if (node.children) {
                  return { ...node, children: updateNode(node.children) };
                }
                return node;
              });
            };
            return updateNode(prevData);
          });
        } else if (String(key).startsWith('table-')) {
          // 加载表的字段和标签
          const [, connectionId, database, table] = String(key).split('-', 4);
          const { tags, fields } = await loadTableSchema(
            connectionId,
            database,
            table
          );

          const children: DataNode[] = [];

          // 直接添加标签列
          tags.forEach(tag => {
            const tagPath = `${connectionId}/${database}/${table}/tags/${tag}`;
            const isFav = isFavorite(tagPath);
            children.push({
              title: (
                <div className='flex items-center gap-2'>
                  <span className='flex-1'>{tag}</span>
                  {isFav && (
                    <Star className='w-3 h-3 text-warning fill-current' />
                  )}
                  <Badge variant='secondary' className='bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 h-auto'>
                    Tag
                  </Badge>
                  <span className='text-xs text-muted-foreground flex-shrink-0'>
                    string
                  </span>
                </div>
              ),
              key: `tag-${connectionId}-${database}-${table}-${tag}`,
              icon: <Tags className='w-4 h-4 text-orange-500' />,
              isLeaf: true,
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
                  return <Hash className='w-4 h-4 text-primary' />;
                case 'string':
                case 'text':
                  return <FileText className='w-4 h-4 text-muted-foreground' />;
                case 'time':
                case 'timestamp':
                  return <Clock className='text-purple-500' />;
                case 'boolean':
                case 'bool':
                  return <GitBranch className='w-4 h-4 text-success' />;
                default:
                  return <File className='w-4 h-4 text-muted-foreground' />;
              }
            };

            children.push({
              title: (
                <div className='flex items-center gap-2'>
                  <span className='flex-1'>{field.name}</span>
                  {isFav && (
                    <Star className='w-3 h-3 text-warning fill-current' />
                  )}
                  <Badge variant='secondary' className='bg-primary/10 text-primary text-xs px-1.5 py-0.5 h-auto'>
                    Field
                  </Badge>
                  <span className='text-xs text-muted-foreground flex-shrink-0'>
                    {field.type}
                  </span>
                </div>
              ),
              key: `field-${connectionId}-${database}-${table}-${field.name}`,
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
                  return { ...node, children: updateNode(node.children) };
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

  // 转换 DataNode 为 TreeNode 的适配器函数
  const loadDataAdapter = useCallback(
    async (node: TreeNode): Promise<void> => {
      const dataNode: DataNode = {
        key: node.key,
        title: node.title,
        children: node.children as DataNode[],
        icon: node.icon,
        isLeaf: node.isLeaf,
        disabled: node.disabled,
        selectable: node.selectable,
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
        },
      };

      let path = '';
      let connectionId = '';

      if (String(nodeKey).startsWith('connection-')) {
        connectionId = String(nodeKey).replace('connection-', '');
        path = paths.connection(String(nodeKey));
      } else if (String(nodeKey).startsWith('database-')) {
        const [, connId] = String(nodeKey).split('-');
        connectionId = connId;
        path = paths.database(String(nodeKey));
      } else if (String(nodeKey).startsWith('table-')) {
        const [, connId] = String(nodeKey).split('-');
        connectionId = connId;
        path = paths.table(String(nodeKey));
      } else if (String(nodeKey).startsWith('field-')) {
        const [, connId] = String(nodeKey).split('-');
        connectionId = connId;
        path = paths.field(String(nodeKey));
      } else if (String(nodeKey).startsWith('tag-')) {
        const [, connId] = String(nodeKey).split('-');
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
      },
    };

    let path = '';
    if (String(key).startsWith('connection-')) path = paths.connection();
    else if (String(key).startsWith('database-')) path = paths.database();
    else if (String(key).startsWith('table-')) path = paths.table();
    else if (String(key).startsWith('field-')) path = paths.field();
    else if (String(key).startsWith('tag-')) path = paths.tag();

    const isFav = isFavorite(path);

    const favoriteMenuItem = {
      key: 'toggle-favorite',
      label: isFav ? '取消收藏' : '添加到收藏',
      icon: isFav ? (
        <StarOff className='w-4 h-4' />
      ) : (
        <Star className='w-4 h-4' />
      ),
      onClick: () => handleToggleFavorite(key),
    };

    if (String(key).startsWith('database-')) {
      return [
        favoriteMenuItem,
        { key: 'divider-db-1', type: 'divider' },
        {
          key: 'refresh-db',
          label: '刷新数据库',
          icon: <RefreshCw className='w-4 h-4' />,
        },
        {
          key: 'new-query',
          label: '新建查询',
          icon: <FileText className='w-4 h-4' />,
        },
        { key: 'divider-db-2', type: 'divider' },
        {
          key: 'db-properties',
          label: '属性',
          icon: <Settings className='w-4 h-4' />,
        },
      ];
    }

    if (String(key).startsWith('table-')) {
      return [
        favoriteMenuItem,
        { key: 'divider-table-1', type: 'divider' },
        {
          key: 'refresh-table',
          label: '刷新表结构',
          icon: <RefreshCw className='w-4 h-4' />,
        },
        {
          key: 'query-table',
          label: '查询此表',
          icon: <FileText className='w-4 h-4' />,
        },
        { key: 'divider-table-2', type: 'divider' },
        {
          key: 'table-properties',
          label: '表属性',
          icon: <Settings className='w-4 h-4' />,
        },
      ];
    }

    if (String(key).startsWith('field-') || String(key).startsWith('tag-')) {
      return [
        favoriteMenuItem,
        { key: 'divider-field-1', type: 'divider' },
        {
          key: 'insert-column',
          label: '插入到查询',
          icon: <FileText className='w-4 h-4' />,
        },
        {
          key: 'copy-name',
          label: '复制列名',
          icon: <File className='w-4 h-4' />,
        },
      ];
    }

    if (String(key).startsWith('connection-')) {
      return [
        favoriteMenuItem,
        { key: 'divider-connection-1', type: 'divider' },
        {
          key: 'refresh-connection',
          label: '刷新连接',
          icon: <RefreshCw className='w-4 h-4' />,
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
      { connectionId: connection_id, currentStatus: currentStatus?.status }
    );

    // 设置该连接的loading状态
    setConnectionLoadingStates(prev => new Map(prev).set(connection_id, true));

    // 立即更新该连接节点的显示状态为加载中
    updateConnectionNodeDisplay(connection_id, true);

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

      console.log(`✅ 连接操作完成: ${connection.name}`);
    } catch (error) {
      console.error(`❌ 连接操作失败:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
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

        // 设置新的定时器 - 只更新显示状态，不重新加载数据
        const newTimeout = setTimeout(async () => {
          // 连接操作完成后，loading状态应该为false
          updateConnectionNodeDisplay(connection_id, false);

          // 根据连接状态处理数据库节点
          if (isConnectionConnected(connection_id)) {
            // 如果连接成功，为该连接加载数据库节点
            await addDatabaseNodesToConnection(connection_id);

            // 自动展开连接节点，显示数据库列表
            const connectionKey = `connection-${connection_id}`;
            if (!expandedKeys.includes(connectionKey)) {
              setExpandedKeys(prev => [...prev, connectionKey]);
              console.log(`🔄 自动展开连接节点: ${connection.name}`);
            }
          } else {
            // 如果连接断开，清理该连接的数据库子节点
            clearDatabaseNodesForConnection(connection_id);

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

  // 处理节点双击
  const handleDoubleClick = async (info: { node: TreeNode }) => {
    const { node } = info;
    const key = node.key;

    console.log(`🖱️ 双击节点: ${key}`, { nodeTitle: node.title });

    // 双击时立即关闭右键菜单，避免菜单状态冲突
    if (contextMenuOpen) {
      setContextMenuOpen(false);
    }

    if (String(key).startsWith('connection-')) {
      // 连接节点被双击，切换连接状态
      const connectionId = String(key).replace('connection-', '');
      const connection = getConnection(connectionId);

      if (!connection) {
        console.error(`❌ 双击连接失败: 连接配置不存在 ${connectionId}`);
        showMessage.error(`连接配置不存在: ${connectionId}`);
        return;
      }

      console.log(`🔄 双击连接: ${connection.name} (${connectionId})`);
      await handleConnectionToggle(connectionId);
    } else if (String(key).startsWith('database-')) {
      // 数据库节点被双击
      const parts = String(key).split('-');
      if (parts.length >= 3) {
        const connectionId = parts[1];
        const database = parts[2];
        const databaseKey = `database-${connectionId}-${database}`;

        // 检查数据库是否已经展开
        const isDatabaseExpanded = expandedKeys.includes(databaseKey);

        if (!isDatabaseExpanded) {
          // 如果数据库未展开，则展开数据库（加载表列表）
          const newExpandedKeys = [...expandedKeys, databaseKey];
          setExpandedKeys(newExpandedKeys);
          showMessage.info(`正在连接并加载数据库 "${database}" 的表列表...`);

          // 手动加载表数据并更新树形结构
          try {
            const tables = await loadTables(connectionId, database);
            console.log(`✅ 成功加载数据库 "${database}" 的表列表:`, tables);

            // 更新树形数据，为该数据库添加表节点
            setTreeData(prevData => {
              return prevData.map(connectionNode => {
                if (connectionNode.key === `connection-${connectionId}`) {
                  const updatedConnectionNode = { ...connectionNode };
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
                                  <Star className='w-3 h-3 text-warning fill-current' />
                                )}
                              </div>
                            ),
                            key: `table-${connectionId}-${database}-${table}`,
                            icon: <Table className='w-4 h-4 text-blue-600' />,
                            isLeaf: true,
                          };
                        });

                        return {
                          ...dbNode,
                          icon: <Database className='w-4 h-4 text-purple-600' />,
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
          } catch (error) {
            console.error('❌ 加载表列表失败:', error);
            showMessage.error(`加载数据库 "${database}" 的表列表失败`);
            // 如果加载失败，回滚展开状态
            setExpandedKeys(expandedKeys);
          }
        } else {
          // 如果数据库已经展开，则创建新的查询标签页并选中该数据库
          if (onViewChange) {
            onViewChange('query');
          }

          if (onCreateQueryTab) {
            onCreateQueryTab('', database);
            showMessage.info(`已创建新查询并选中数据库 "${database}"`);
          } else {
            showMessage.info(`正在切换到查询面板，数据库: "${database}"`);
          }
        }
      }
    } else if (String(key).startsWith('table-')) {
      // 表节点被双击，确保在查询面板中处理
      const parts = String(key).split('-');
      if (parts.length >= 4) {
        const connectionId = parts[1];
        const database = parts[2];
        const table = parts.slice(3).join('-'); // 处理表名包含连字符的情况

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
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  // 处理右键菜单
  const handleRightClick = (info: { node: TreeNode; event?: React.MouseEvent }) => {
    const { node, event } = info;
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
    } else if (String(key).startsWith('database-')) {
      // 数据库节点
      const parts = String(key).split('-');
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
    } else if (String(key).startsWith('table-')) {
      // 表节点
      const parts = String(key).split('-');
      if (parts.length >= 4) {
        const connectionId = parts[1];
        const database = parts[2];
        const table = parts.slice(3).join('-');
        target = {
          type: 'table',
          connectionId,
          database,
          table,
          title: node.title,
        };
      }
    } else if (String(key).startsWith('field-')) {
      // 字段节点
      const parts = String(key).split('-');
      if (parts.length >= 5) {
        const connectionId = parts[1];
        const database = parts[2];
        const table = parts[3];
        const field = parts.slice(4).join('-');
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
            // 重新加载连接状态（功能待实现）
            showMessage.success(`连接 ${contextMenuTarget.title} 已刷新`);
          }
          break;

        case 'disconnect':
          if (contextMenuTarget.type === 'connection') {
            // 断开连接逻辑
            showMessage.success(`连接 ${contextMenuTarget.title} 已断开`);
          }
          break;

        case 'connection_properties':
          if (contextMenuTarget.type === 'connection') {
            showMessage.info(`连接属性: ${contextMenuTarget.title}`);
          }
          break;

        case 'refresh_database':
          if (contextMenuTarget.type === 'database') {
            // 重新加载数据库结构（功能待实现）
            showMessage.success(`数据库 ${contextMenuTarget.database} 已刷新`);
          }
          break;

        case 'create_measurement':
          if (contextMenuTarget.type === 'database') {
            showMessage.info(`创建测量值功能开发中: ${contextMenuTarget.database}`);
          }
          break;

        case 'database_info':
          if (contextMenuTarget.type === 'database') {
            showMessage.info(`数据库信息: ${contextMenuTarget.database}`);
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
            if (onTableDoubleClick) {
              onTableDoubleClick(contextMenuTarget.database, contextMenuTarget.table, query);
            }
          }
          break;

        case 'table_designer':
          if (contextMenuTarget.type === 'table') {
            openTableDesigner(contextMenuTarget);
          }
          break;

        case 'table_info':
          if (contextMenuTarget.type === 'table') {
            showMessage.info(`表信息: ${contextMenuTarget.table}`);
          }
          break;

        case 'drop_table':
          if (contextMenuTarget.type === 'table') {
            const confirmed = await dialog.confirm({
              title: '确认删除',
              content: `确定要删除表 "${contextMenuTarget.table}" 吗？此操作不可撤销。`,
            });
            if (confirmed) {
              showMessage.info(`删除表功能开发中: ${contextMenuTarget.table}`);
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
    // 这里需要通知 TabEditor 创建表设计器 tab
    // 暂时使用 console.log
    console.log('打开表设计器:', tableInfo);
    showMessage.info(`表设计器功能开发中: ${tableInfo.table}`);
  };

  // 打开数据库设计器
  const openDatabaseDesigner = (dbInfo: { connectionId: string; database: string }) => {
    // 这里需要通知 TabEditor 创建数据库设计器 tab
    console.log('打开数据库设计器:', dbInfo);
    showMessage.info(`数据库设计器功能开发中: ${dbInfo.database}`);
  };

  // 处理节点选择
  const handleSelect = (selectedKeys: string[], info: { selected: boolean; node: TreeNode }) => {
    const { node } = info;
    console.log('选中节点:', node);

    const nodeKey = String(node.key);
    // 根据选中的节点类型执行相应操作
    if (nodeKey.startsWith('database-')) {
      // 数据库节点被选中
      console.log('选中数据库:', node.title);
    } else if (nodeKey.startsWith('table-')) {
      // 表节点被选中
      console.log('选中表:', node.title);
    } else if (nodeKey.startsWith('field-') || nodeKey.startsWith('tag-')) {
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
                              const databaseKey = `database-${connection_id}-${db}`;
                              const isExpanded = expandedKeys.includes(databaseKey);

                              const nodeData: any = {
                                title: (
                                  <span className='flex items-center gap-1'>
                                    {db}
                                    {isFav && (
                                      <Star className='w-3 h-3 text-warning fill-current' />
                                    )}
                                  </span>
                                ),
                                key: databaseKey,
                                // 根据展开状态设置图标颜色：未展开为灰色，已展开为紫色
                                icon: <Database className={`w-4 h-4 ${isExpanded ? 'text-purple-600' : 'text-muted-foreground'}`} />,
                              };

                              if (isExpanded) {
                                // 已展开的数据库：设置为非叶子节点，有children数组
                                nodeData.isLeaf = false;
                                nodeData.children = [];
                              } else {
                                // 未展开的数据库：设置为叶子节点，不设置children属性
                                nodeData.isLeaf = true;
                                // 不设置children属性，这样Tree组件就不会显示展开按钮
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
        // 如果断开连接，清空子节点
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
    ]
  );

  // 刷新树数据
  const refreshTree = useCallback(() => {
    buildCompleteTreeData(true); // 手动刷新时显示全局 loading
  }, [buildCompleteTreeData]);

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
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${getConnectionStatusColor(connection_id)}`}
                  />
                  <span className='flex-1'>{connection.name}</span>
                  {showLoading && (
                    <RefreshCw className='w-3 h-3 text-muted-foreground animate-spin' />
                  )}
                  {isFav && (
                    <Star className='w-3 h-3 text-warning fill-current' />
                  )}
                </div>
              ),
              icon: isConnected ? (
                <Database className='w-4 h-4 text-success' />
              ) : (
                <Link className='w-4 h-4 text-muted-foreground' />
              ),
              // 根据连接状态决定是否显示收缩按钮
              ...(isConnected ? { children: node.children || [] } : { isLeaf: true }),
            };
            
            // 如果从连接状态变为未连接状态，移除 children 属性
            if (!isConnected && updatedNode.children) {
              const { children, ...nodeWithoutChildren } = updatedNode;
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
      getConnectionStatusColor,
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
      // 配置变化时不显示全局 loading，因为这通常是由连接操作引起的
      buildCompleteTreeData(false);
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
        updateConnectionNodeDisplay(connectionId, false);
      });
    }

    // 更新引用值
    prevConnectedIdsRef.current = [...connectedConnectionIds];
    prevActiveIdRef.current = activeConnectionId;
  }, [connectedConnectionIds, activeConnectionId, updateConnectionNodeDisplay]);

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
                  const databaseKey = `database-${connection_id}-${databaseName}`;
                  const isExpanded = expandedKeys.includes(databaseKey);

                  const nodeData: any = {
                    title: (
                      <span className='flex items-center gap-1'>
                        {databaseName}
                        {isFav && (
                          <Star className='w-3 h-3 text-warning fill-current' />
                        )}
                      </span>
                    ),
                    key: databaseKey,
                    // 根据展开状态设置图标颜色：未展开为灰色，已展开为紫色
                    icon: <Database className={`w-4 h-4 ${isExpanded ? 'text-purple-600' : 'text-muted-foreground'}`} />,
                  };

                  if (isExpanded) {
                    // 已展开的数据库：设置为非叶子节点，有children数组
                    nodeData.isLeaf = false;
                    nodeData.children = [];
                  } else {
                    // 未展开的数据库：设置为叶子节点，不设置children属性
                    nodeData.isLeaf = true;
                    // 不设置children属性，这样Tree组件就不会显示展开按钮
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
            const { children, isLeaf, ...nodeWithoutChildren } = node;
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
            !String(key).startsWith(`database-${connection_id}`) &&
            !String(key).startsWith(`table-${connection_id}`)
        );
        return filtered;
      });

      // 清理该连接相关的加载状态
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        Array.from(newSet).forEach(key => {
          if (
            String(key).startsWith(`database-${connection_id}`) ||
            String(key).startsWith(`table-${connection_id}`)
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
      buildCompleteTreeData(true); // 外部触发器刷新时显示全局 loading
    }
  }, [refreshTrigger, buildCompleteTreeData]);

  // 监听已展开数据库变化，通知父组件
  useEffect(() => {
    if (onExpandedDatabasesChange) {
      // 从expandedKeys中提取数据库名称
      const expandedDatabases = expandedKeys
        .filter(key => String(key).startsWith('database-'))
        .map(key => {
          const parts = String(key).split('-');
          return parts.length >= 3 ? parts[2] : '';
        })
        .filter(db => db !== ''); // 过滤掉空字符串

      console.log('🔄 已展开数据库列表变化:', expandedDatabases);
      onExpandedDatabasesChange(expandedDatabases);
    }
  }, [expandedKeys, onExpandedDatabasesChange]);

  if (collapsed) {
    return (
      <div className='h-full flex flex-col items-center py-4'>
        <Space direction='vertical' size='large'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='w-8 h-8'>
                <Database className='w-4 h-4' />
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
                <RefreshCw className='w-4 h-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='right'>刷新</TooltipContent>
          </Tooltip>
        </Space>
      </div>
    );
  }

  return (
    <>
    <Card className='database-explorer h-full flex flex-col'>
      {/* 头部：连接状态和操作 */}
      <CardContent className='p-3 border-b'>
        <div className='flex items-center justify-between mb-3'>
          {displayConnectionInfo ? (
            <div className='flex items-center gap-2'>
              <Badge
                variant={
                  displayConnectionInfo.status.status === 'connected'
                    ? 'default'
                    : displayConnectionInfo.status.status === 'connecting'
                      ? 'secondary'
                      : 'destructive'
                }
                className={
                  displayConnectionInfo.status.status === 'connected'
                    ? 'bg-success text-success-foreground'
                    : displayConnectionInfo.status.status === 'connecting'
                      ? 'bg-warning text-warning-foreground'
                      : ''
                }
              >
                <div className='flex items-center gap-1'>
                  <span className='w-2 h-2 rounded-full bg-current'></span>
                  <Typography.Text className='text-sm font-medium'>
                    {displayConnectionInfo.status.status === 'connected'
                      ? '已连接'
                      : displayConnectionInfo.status.status === 'connecting'
                        ? '连接中'
                        : displayConnectionInfo.status.status === 'error'
                          ? '连接错误'
                          : '已断开'}
                  </Typography.Text>
                </div>
              </Badge>
              <div className='flex flex-col'>
                <Typography.Text className='text-sm font-medium'>
                  {displayConnectionInfo.connection.name}
                </Typography.Text>
                <Typography.Text className='text-xs text-muted-foreground'>
                  {displayConnectionInfo.connection.host}:
                  {displayConnectionInfo.connection.port}
                  {displayConnectionInfo.status.latency &&
                    ` • ${displayConnectionInfo.status.latency}ms`}
                </Typography.Text>
              </div>
            </div>
          ) : (
            <Badge variant='secondary'>
              <Typography.Text className='text-sm font-medium'>未连接</Typography.Text>
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={refreshTree}
                disabled={loading}
              >
                <RefreshCw className='w-4 h-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新</TooltipContent>
          </Tooltip>
        </div>

        {/* 搜索框 */}
        <Input
          placeholder='搜索连接、数据库、表...'
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          className='text-sm'
        />
      </CardContent>

      {/* 主要内容：标签页 */}
      <CardContent className='flex-1 overflow-hidden p-0'>
        <Tabs defaultValue='explorer' className='h-full'>
          <TabsList className='ml-3'>
            <TabsTrigger value='explorer' className='flex items-center gap-1'>
              <Database className='w-4 h-4' />
              数据源
            </TabsTrigger>
            <TabsTrigger value='favorites' className='flex items-center gap-1'>
              <Star className='w-4 h-4' />
              收藏 ({favorites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value='explorer' className='px-2 h-full overflow-auto'>
            {loading ? (
              <div className='flex items-center justify-center py-8'>
                <Spin tip='加载中...' />
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
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">连接操作</div>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('refresh_connection');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                                刷新连接
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('disconnect');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <X className="w-4 h-4" />
                                断开连接
                              </button>
                              <div className="my-1 h-px bg-border" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('connection_properties');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Settings className="w-4 h-4" />
                                连接属性
                              </button>
                            </>
                          )}

                          {contextMenuTarget.type === 'database' && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">数据库操作</div>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('refresh_database');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <RefreshCw className="w-4 h-4" />
                                刷新数据库
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('create_measurement');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Plus className="w-4 h-4" />
                                创建测量值
                              </button>
                              <div className="my-1 h-px bg-border" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('database_info');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Info className="w-4 h-4" />
                                数据库信息
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
                                onClick={() => {
                                  handleContextMenuAction('drop_database');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                删除数据库
                              </button>
                            </>
                          )}

                          {contextMenuTarget.type === 'table' && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">表操作</div>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('query_table');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Search className="w-4 h-4" />
                                查询表
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('table_designer');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                                表设计器
                              </button>
                              <div className="my-1 h-px bg-border" />
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('table_info');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Info className="w-4 h-4" />
                                表信息
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-destructive hover:text-destructive"
                                onClick={() => {
                                  handleContextMenuAction('drop_table');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                删除表
                              </button>
                            </>
                          )}

                          {contextMenuTarget.type === 'field' && (
                            <>
                              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">字段操作</div>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('copy_field_name');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <Copy className="w-4 h-4" />
                                复制字段名
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                onClick={() => {
                                  handleContextMenuAction('field_stats');
                                  setContextMenuOpen(false);
                                }}
                              >
                                <BarChart className="w-4 h-4" />
                                字段统计
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
              <Card className='text-center text-muted-foreground mt-8'>
                <CardContent className='pt-6'>
                  <Database className='w-8 h-8 mx-auto mb-2' />
                  <Typography.Text>暂无连接</Typography.Text>
                  <Typography.Text className='text-sm mt-1 block'>
                    请在连接管理中添加数据库连接
                  </Typography.Text>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='favorites' className='px-2 h-full overflow-auto'>
            {/* 收藏过滤器 */}
            <CardContent className='p-2 border-b'>
              <div className='flex flex-wrap gap-1'>
                {[
                  { key: 'all', label: '全部', icon: Star },
                  { key: 'connection', label: '连接', icon: Link },
                  { key: 'database', label: '数据库', icon: Database },
                  { key: 'table', label: '表', icon: Table },
                  { key: 'field', label: '字段', icon: Hash },
                  { key: 'tag', label: '标签', icon: Tags },
                ].map(({ key, label, icon: IconComponent }) => {
                  const count =
                    key === 'all'
                      ? favorites.length
                      : getFavoritesByType(key as Parameters<typeof getFavoritesByType>[0]).length;
                  return (
                    <Button
                      key={key}
                      variant={favoritesFilter === key ? 'default' : 'ghost'}
                      size='sm'
                      onClick={() => setFavoritesFilter(key as typeof favoritesFilter)}
                      className='px-2 py-1 h-auto text-xs flex items-center gap-1'
                    >
                      <IconComponent className='w-3 h-3' />
                      {label}
                      <Badge variant='secondary' className='bg-background/20 text-xs px-1 h-auto ml-1'>
                        {count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>
            </CardContent>

            {/* 收藏列表 */}
            <CardContent className='p-2'>
              <div>
                {(() => {
                  const filteredFavorites =
                    favoritesFilter === 'all'
                      ? favorites.sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                      : getFavoritesByType(favoritesFilter as Parameters<typeof getFavoritesByType>[0]);

                  if (filteredFavorites.length === 0) {
                    return (
                      <Card className='text-center text-muted-foreground py-8'>
                        <CardContent>
                          <Star className='w-8 h-8 mx-auto mb-2 opacity-50' />
                          <Typography.Text className='text-sm block'>
                            {favoritesFilter === 'all'
                              ? '暂无收藏项'
                              : `暂无${favoritesFilter}类型的收藏`}
                          </Typography.Text>
                          <Typography.Text className='text-xs mt-1 block'>
                            右键数据源树节点可添加收藏
                          </Typography.Text>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Space direction='vertical' size='small'>
                      {filteredFavorites.map(favorite => {
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

                        const colorClass = favoritesUtils.getFavoriteColor(
                          favorite.type
                        );

                        return (
                          <Card
                            key={favorite.id}
                            className='group cursor-pointer hover:bg-muted/50 transition-colors'
                            onClick={() => {
                              markAsAccessed(favorite.id);
                              // 这里可以添加导航到收藏项的逻辑
                              showMessage.info(`访问收藏: ${favorite.name}`);
                            }}
                          >
                            <CardContent className='p-2'>
                              <div className='flex items-start gap-2'>
                                <IconComponent
                                  className={`w-4 h-4 mt-0.5 ${colorClass} flex-shrink-0`}
                                />
                                <div className='flex-1 min-w-0'>
                                  <div className='flex items-center gap-2'>
                                    <Typography.Text className='font-medium text-sm truncate'>
                                      {favorite.name}
                                    </Typography.Text>
                                    <Badge
                                      variant='secondary'
                                      className={`text-xs px-1.5 py-0.5 h-auto ${colorClass} bg-current/10`}
                                    >
                                      {favorite.type}
                                    </Badge>
                                  </div>
                                  {favorite.description && (
                                    <Typography.Text className='text-xs text-muted-foreground truncate mt-1 block'>
                                      {favorite.description}
                                    </Typography.Text>
                                  )}
                                  <div className='flex items-center gap-3 mt-1 text-xs text-muted-foreground'>
                                    <span className='flex items-center gap-1'>
                                      <Calendar className='w-3 h-3' />
                                      {new Date(
                                        favorite.createdAt
                                      ).toLocaleDateString()}
                                    </span>
                                    {favorite.accessCount > 0 && (
                                      <span className='flex items-center gap-1'>
                                        <MousePointer className='w-3 h-3' />
                                        {favorite.accessCount}次
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={e => {
                                    e.stopPropagation();
                                    removeFavorite(favorite.id);
                                    showMessage.success('已移除收藏');
                                  }}
                                  className='opacity-0 group-hover:opacity-100 p-1 h-auto hover:bg-destructive/10 hover:text-destructive transition-all'
                                >
                                  <Trash2 className='w-3 h-3' />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Space>
                  );
                })()}
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </>
  );
};

export default DatabaseExplorer;
