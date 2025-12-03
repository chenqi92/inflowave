import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Badge,
  Card,
  CardContent,
} from '@/components/ui';
import { MultiConnectionTreeView } from '@/components/database/MultiConnectionTreeView';
import { DatabaseExplorerHeader } from '@/components/database/DatabaseExplorerHeader';
import { DatabaseExplorerDialogs } from '@/components/database/DatabaseExplorerDialogs';
import { DatabaseExplorerErrorTooltips } from '@/components/database/DatabaseExplorerErrorTooltips';
import { DatabaseExplorerCollapsedView } from '@/components/database/DatabaseExplorerCollapsedView';
import {
  Table,
  RefreshCw,
  Settings,
  FileText,
  File,
  Hash,
  Tags,
  Clock,
  Star,
  StarOff,
  TrendingUp,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { favoritesUtils } from '@/store/favorites';
import { useTreeStatusStore } from '@/stores/treeStatusStore';
import type { ConnectionConfig } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { writeToClipboard } from '@/utils/clipboard';

import { DatabaseIcon } from '@/components/common/DatabaseIcon';
// DropdownMenu相关组件已移除，使用自定义右键菜单

// 导入弹框组件

// 导入类型定义
import type {
  DataNode,
  MenuProps,
  DatabaseExplorerProps,
} from '@/types/databaseExplorer';

// 导入工具函数
import {
  getDatabaseNodeType,
  getIoTDBDisplayName,
  isIoTDBConnection,
  getNodeIcon,
} from '@/utils/databaseExplorer/nodeUtils';
import { generateQueryWithTimeFilter } from '@/utils/databaseExplorer/queryUtils';
import { logger } from '@/utils/logger';

// 导入自定义 Hooks
import {
  useDatabaseExplorerState,
  useDatabaseExplorerStores,
  useDatabaseExplorerCache,
  useConnectionHandlers,
  useNodeHandlers,
  useNodeActivateHandler,
  useContextMenuHandler,
} from '@/hooks/databaseExplorer';
import { useDataLoading } from '@/hooks/databaseExplorer/useDataLoading';
import { useDatabaseExplorerTranslation } from '@/hooks/useTranslation';

const DatabaseExplorer: React.FC<DatabaseExplorerProps> = ({
  collapsed = false,
  refreshTrigger,
  onTableDoubleClick,
  onCreateDataBrowserTab,
  onCreateS3BrowserTab,
  onCreateQueryTab,
  onCreateAndExecuteQuery,
  onViewChange,
  onGetCurrentView,
  onExpandedDatabasesChange,
  onEditConnection,
  currentTimeRange,
}) => {
  // ============================================================================
  // Custom Hooks
  // ============================================================================
  const state = useDatabaseExplorerState();
  const stores = useDatabaseExplorerStores();
  const navigate = useNavigate();
  const { t: tExplorer } = useDatabaseExplorerTranslation();

  // 添加渲染计数器（仅在开发环境的 DEBUG 级别）
   
  if (process.env.NODE_ENV === 'development') {
    state.renderCountRef.current++;
    logger.render(
      `DatabaseExplorer 重新渲染 (第 ${state.renderCountRef.current} 次)`
    );
  }

  // Initialize cache hook with state and store functions
  const cache = useDatabaseExplorerCache({
    treeNodeCache: state.treeNodeCache,
    setTreeNodeCache: state.setTreeNodeCache,
    databasesCache: state.databasesCache,
    setDatabasesCache: state.setDatabasesCache,
    getConnection: stores.getConnection,
    addConnection: stores.addConnection,
  });

  // Destructure commonly used values for convenience
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
    activeConnection,
    activeConnectionStatus,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    openedDatabasesList,
    openDatabase,
    closeDatabase,
    closeAllDatabasesForConnection,
    isDatabaseOpened,
  } = stores;

  const {
    treeData,
    setTreeData,
    expandedKeys,
    setExpandedKeys,
    searchValue,
    setSearchValue,
    hideSystemNodes,
    setHideSystemNodes,
    treeNodeCache,
    setTreeNodeCache,
    databasesCache,
    setDatabasesCache,
    loading,
    setLoading,
    loadingNodes,
    setLoadingNodes,
    connectionLoadingStates,
    setConnectionLoadingStates,
    databaseLoadingStates,
    setDatabaseLoadingStates,
    connectionErrors,
    setConnectionErrors,
    databaseErrors,
    setDatabaseErrors,
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
    connectionDetailDialog,
    setConnectionDetailDialog,
    contextMenuTarget,
    setContextMenuTarget,
    contextMenuOpen,
    setContextMenuOpen,
    contextMenuPosition,
    setContextMenuPosition,
    nodeRefsMap,
    contextMenuOpenRef,
    headerRef,
    isNarrow,
    setIsNarrow,
    _updateTimeouts,
    setUpdateTimeouts,
  } = state;

  // 需要刷新的节点 ID
  const [nodeToRefresh, setNodeToRefresh] = React.useState<string | null>(null);
  // 刷新节点的方法引用
  const refreshNodeRef = useRef<((nodeId: string) => void) | null>(null);

  const { clearDatabasesCache, getTreeNodesWithCache } = cache;

  // Initialize data loading hook
  const dataLoading = useDataLoading({
    getTreeNodesWithCache,
    databasesCache,
    setDatabasesCache,
  });
  const { loadDatabases, loadTables, loadFieldsAndTags } = dataLoading;

  // ✅ 同步状态到 TreeStatusStore
  // 将 connectionStatuses 同步到 store
  useEffect(() => {
    const statusMap = new Map<string, 'connecting' | 'connected' | 'disconnected' | 'error'>();
    connections.forEach(conn => {
      if (conn.id) {
        const status = connectionStatuses[conn.id];
        // 将所有状态同步到store，包括error状态
        statusMap.set(conn.id, status?.status || 'disconnected');
      }
    });
    useTreeStatusStore.getState().setConnectionStatuses(statusMap);
  }, [connections, connectionStatuses]);

  // 将 databaseLoadingStates 同步到 store
  useEffect(() => {
    useTreeStatusStore.getState().setDatabaseLoadingStates(databaseLoadingStates);
  }, [databaseLoadingStates]);

  // 将 connectionErrors 同步到 store
  useEffect(() => {
    useTreeStatusStore.getState().setConnectionErrors(connectionErrors);
  }, [connectionErrors]);

  // 将 databaseErrors 同步到 store
  useEffect(() => {
    useTreeStatusStore.getState().setDatabaseErrors(databaseErrors);
  }, [databaseErrors]);

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
  const openDialog = (
    type: 'designer' | 'info',
    connectionId: string,
    database: string,
    tableName: string
  ) => {
    logger.debug(`打开${type}弹框:`, { connectionId, database, tableName });
    setDialogStates(prev => ({
      ...prev,
      [type]: { open: true, connectionId, database, tableName },
    }));
  };

  const closeDialog = (type: 'designer' | 'info') => {
    setDialogStates(prev => ({
      ...prev,
      [type]: { open: false, connectionId: '', database: '', tableName: '' },
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
      logger.debug('💾 连接保存成功:', connection.name);

      // 如果是编辑现有连接，更新连接
      if (editingConnection) {
        showMessage.success(`连接 "${connection.name}" 已更新`);
      } else {
        showMessage.success(`连接 "${connection.name}" 已创建`);
      }

      // 关闭对话框
      handleCloseConnectionDialog();

      // 注意：RefactoredConnectionDialog 内部的 useConnection hook 已经调用了 addConnection
      // 这里不需要手动刷新，因为 useEffect 会监听 connections 变化自动重建树
      logger.info('连接保存完成，等待自动刷新数据源树');
    } catch (error) {
      logger.error('连接保存失败:', error);
      showMessage.error(`连接保存失败: ${error}`);
    }
  };

  // 包装查询生成函数，使其可以访问组件状态
  const generateQuery = useCallback(
    (table: string, connectionId?: string): string => {
      return generateQueryWithTimeFilter(
        table,
        connectionId,
        activeConnectionId,
        getConnection,
        currentTimeRange
      );
    },
    [activeConnectionId, currentTimeRange]
  );

  // 使用导入的工具函数，但保持相同的函数签名以兼容现有代码
  // 这些是包装函数，将组件状态传递给工具函数

  // IoTDB 路径显示组件 - 带有Tooltip显示完整路径
  const IoTDBPathDisplay: React.FC<{
    fullPath: string;
    nodeType?: string;
    isField?: boolean;
    className?: string;
  }> = ({ fullPath, nodeType = '', isField = false, className = '' }) => {
    const displayName = getIoTDBDisplayName(fullPath, nodeType, isField);
    const showTooltip = displayName !== fullPath && displayName.includes('...');

    if (!showTooltip) {
      return <span className={className}>{displayName}</span>;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>{displayName}</span>
        </TooltipTrigger>
        <TooltipContent>{fullPath}</TooltipContent>
      </Tooltip>
    );
  };

  // 构建完整的树形数据
  const buildCompleteTreeData = useCallback(
    async (
      showGlobalLoading: boolean = true,
      overrideHideSystemNodes?: boolean
    ) => {
      logger.debug(
        `🏗️ 开始构建树形数据，已连接: [${connectedConnectionIds.join(', ')}]`
      );
      const currentHideSystemNodes =
        overrideHideSystemNodes !== undefined
          ? overrideHideSystemNodes
          : hideSystemNodes;
      logger.debug(`🔧 系统节点过滤状态: ${currentHideSystemNodes}`);

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
        // 检查是否正在连接中（从连接状态中获取或本地状态）
        const isConnecting =
          connectionStatus?.status === 'connecting' ||
          connectionLoadingStates.get(connection.id) === true;
        // 获取连接错误信息
        const connectionError = connectionErrors.get(connection.id);
        // 在构建树时，显示连接状态中的loading或本地loading状态
        const showLoading = isConnecting;

        const connectionNode: DataNode = {
          title: (
            <div
              className='flex items-center gap-2 relative'
              ref={el => {
                if (el && connection.id) {
                  nodeRefsMap.current.set(`connection-${connection.id}`, el);
                }
              }}
            >
              {showLoading && (
                <Loader2 className='w-3 h-3 text-blue-500 animate-spin flex-shrink-0' />
              )}
              <span className='flex-1'>{connection.name}</span>
              {isFav && <Star className='w-3 h-3 text-warning fill-current' />}
            </div>
          ),
          key: `connection-${connection.id}`,
          icon: (
            <DatabaseIcon
              nodeType='connection'
              dbType={connection.dbType || 'influxdb'}
              isConnected={isConnected}
              size={16}
              className={isConnected ? 'text-success' : 'text-muted-foreground'}
            />
          ),
          // 未连接时设置为叶子节点（隐藏展开箭头），已连接时可展开
          isLeaf: !isConnected,
          // 连接节点始终显示，但只有已连接时才有子节点
          children: [],
        };

        // 为已连接的连接加载数据库列表
        if (isConnected && connection.id) {
          logger.debug(`处理已连接: ${connection.name} (${connection.id})`);
          try {
            // 使用统一的缓存方法获取树节点信息，避免重复查询
            const treeNodes = await getTreeNodesWithCache(connection.id, false);
            logger.debug(`🎯 获取树节点信息，节点数量: ${treeNodes.length}`);
            logger.debug(
              `🎯 树节点详情:`,
              treeNodes.map(n => `${n.name}(${n.node_type || n.nodeType})`)
            );

            // 区分数据库节点和管理功能节点
            const databaseNodes = treeNodes.filter(node => {
              const nodeType = node.node_type || node.nodeType;
              const isContainer = node.metadata?.is_container === true;
              const nodeCategory = node.metadata?.node_category;
              const nodeName = node.name || node.id;

              // 基础过滤：只有真正的数据库节点才被当作数据库处理
              // 排除管理功能节点（Functions、Triggers等）
              const isBasicDatabaseNode =
                nodeType === 'storage_group' ||
                nodeType === 'database' ||
                (nodeCategory !== 'management_container' &&
                  nodeCategory !== 'info_container' &&
                  ![
                    'function',
                    'trigger',
                    'system_info',
                    'version_info',
                    'schema_template',
                  ].includes(nodeType));

              if (!isBasicDatabaseNode) return false;

              // 系统节点过滤：如果启用系统节点过滤，过滤掉系统相关的数据库节点
              // 注意：这里只过滤数据库级别的节点，不过滤连接级别的节点
              logger.debug(
                `🔍 系统节点过滤检查: ${nodeName}, 连接类型: ${connection.dbType}, 节点类型: ${nodeType}, 过滤状态: ${currentHideSystemNodes}`
              );

              if (currentHideSystemNodes) {
                // InfluxDB: 过滤掉 _internal 等系统数据库
                if (connection.dbType === 'influxdb') {
                  if (nodeName.startsWith('_')) {
                    logger.debug(`🚫 过滤InfluxDB系统数据库: ${nodeName}`);
                    return false; // 过滤掉以下划线开头的系统数据库
                  }
                }

                // IoTDB: 过滤掉系统信息节点，只保留用户数据相关节点
                if (connection.dbType === 'iotdb') {
                  // 过滤掉管理功能节点
                  if (
                    [
                      'function',
                      'trigger',
                      'system_info',
                      'version_info',
                      'schema_template',
                    ].includes(nodeType)
                  ) {
                    logger.debug(
                      `🚫 过滤IoTDB管理节点: ${nodeName} (${nodeType})`
                    );
                    return false;
                  }
                  // 过滤掉系统相关的存储组
                  if (
                    nodeName.toLowerCase().includes('system') ||
                    nodeName.toLowerCase().includes('information') ||
                    nodeName.toLowerCase().includes('schema')
                  ) {
                    logger.debug(`🚫 过滤IoTDB系统存储组: ${nodeName}`);
                    return false;
                  }
                }

                logger.info(`系统节点过滤通过: ${nodeName}`);
              } else {
                logger.info(`显示所有节点（过滤已关闭）: ${nodeName}`);
              }

              return true;
            });

            const managementNodes = treeNodes.filter(node => {
              const nodeType = node.node_type || node.nodeType;
              const nodeCategory = node.metadata?.node_category;
              const nodeName = node.name || node.id;

              // 检查是否是管理功能节点
              const isManagementNode =
                nodeCategory === 'management_container' ||
                nodeCategory === 'info_container' ||
                [
                  'function',
                  'trigger',
                  'system_info',
                  'version_info',
                  'schema_template',
                ].includes(nodeType);

              if (!isManagementNode) {
                return false;
              }

              // 系统节点过滤模式下不显示管理功能节点
              if (currentHideSystemNodes) {
                logger.debug(`🚫 过滤管理节点: ${nodeName} (${nodeType})`);
                return false;
              }

              logger.info(`显示管理节点: ${nodeName} (${nodeType})`);
              return true;
            });

            logger.debug(
              `📁 为连接 ${connection.name} 创建 ${databaseNodes.length} 个数据库节点，${managementNodes.length} 个管理节点`
            );
            logger.debug(
              `🗂️ 数据库节点:`,
              databaseNodes.map(n => `${n.name}(${n.node_type || n.nodeType})`)
            );
            logger.debug(
              `⚙️ 管理节点:`,
              managementNodes.map(
                n => `${n.name}(${n.node_type || n.nodeType})`
              )
            );

            // 创建数据库子节点
            const databaseChildren = databaseNodes.map(dbNode => {
              const dbName = dbNode.name || dbNode.id;
              const dbPath = `${connection.id}/${dbName}`;
              const isFav = isFavorite(dbPath);
              const databaseKey = `database|${connection.id}|${dbName}`;
              const isExpanded = expandedKeys.includes(databaseKey);
              const isOpened = connection.id
                ? isDatabaseOpened(connection.id, dbName)
                : false;

              // 优先使用从后端获取的节点类型（snake_case格式）
              let nodeType = dbNode?.node_type || dbNode?.nodeType;

              // 如果没有找到，使用推断逻辑
              if (!nodeType) {
                nodeType = getDatabaseNodeType(
                  connection.id,
                  dbName,
                  connections,
                  treeNodeCache
                );
              }

              // 获取数据库节点的 loading 和 error 状态
              const dbLoading = databaseLoadingStates.get(databaseKey);
              const dbError = databaseErrors.get(databaseKey);

              const nodeData: any = {
                title: (
                  <div
                    className='flex items-center gap-2 relative'
                    ref={el => {
                      if (el && connection.id) {
                        nodeRefsMap.current.set(databaseKey, el);
                      }
                    }}
                  >
                    {dbLoading && (
                      <Loader2 className='w-3 h-3 text-blue-500 animate-spin flex-shrink-0' />
                    )}
                    <span className='flex-1'>{dbName}</span>
                    {isFav && (
                      <Star className='w-3 h-3 text-warning fill-current' />
                    )}
                  </div>
                ),
                key: databaseKey,
                // 使用正确的节点类型显示图标
                icon: (
                  <DatabaseIcon
                    nodeType={nodeType as any}
                    size={16}
                    isOpen={isOpened}
                    className={
                      isOpened ? 'text-purple-600' : 'text-muted-foreground'
                    }
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

            // 创建管理功能子节点（简化版，不支持展开，双击打开弹框）
            const managementChildren = managementNodes.map(mgmtNode => {
              const nodeName = mgmtNode.name || mgmtNode.id;
              const nodeType = mgmtNode.node_type || mgmtNode.nodeType;
              const isContainer = mgmtNode.metadata?.is_container === true;
              const nodeCategory = mgmtNode.metadata?.node_category;
              const managementKey = `management|${connection.id}|${nodeType}|${nodeName}`;

              logger.debug(
                `⚙️ 创建管理节点: ${nodeName} (${nodeType}), 容器: ${isContainer}, 分类: ${nodeCategory}`
              );

              return {
                title: (
                  <span className='flex items-center gap-1'>{nodeName}</span>
                ),
                key: managementKey,
                icon: (
                  <DatabaseIcon
                    nodeType={nodeType as any}
                    isOpen={false}
                    size={16}
                    className='flex-shrink-0'
                    title={`${nodeName} (${nodeType}) - 管理功能节点，双击查看详情`}
                  />
                ),
                isLeaf: true, // 所有管理节点都设为叶子节点，不支持展开
                children: undefined,
                selectable: true,
                checkable: false,
                disabled: false,
                disableCheckbox: false,
                switcherIcon: undefined,
                className: `tree-node management-node`,
                style: {},
                data: {
                  type: 'management',
                  connectionId: connection.id,
                  nodeType,
                  nodeName,
                  isContainer,
                  nodeCategory,
                  isExpanded: false,
                  metadata: mgmtNode?.metadata || {},
                },
              };
            });

            // 合并数据库节点和管理节点
            connectionNode.children = [
              ...databaseChildren,
              ...managementChildren,
            ];
          } catch (error) {
            logger.error('加载数据库失败:', error);
          }
        } else {
          logger.debug(`跳过未连接: ${connection.name}`);
        }

        treeNodes.push(connectionNode);
      }

      logger.debug(`🌳 树形数据构建完成，共 ${treeNodes.length} 个根节点`);
      setTreeData(treeNodes);

      // 只在之前显示了全局 loading 时才清除
      if (showGlobalLoading) {
        setLoading(false);
      }
    },
    [
      connections,
      connectedConnectionIds,
      isConnectionConnected,
      getConnectionStatus,
      loadDatabases,
      isFavorite,
      // 移除expandedKeys依赖，避免每次展开/收起都重建整个树
      isDatabaseOpened, // 添加数据库打开状态依赖
      hideSystemNodes, // 添加系统节点过滤状态依赖
      connectionLoadingStates, // 添加连接 loading 状态依赖
      connectionErrors, // 添加连接错误状态依赖
      databaseLoadingStates, // 添加数据库 loading 状态依赖
      databaseErrors, // 添加数据库错误状态依赖
    ]
  );

  // 动态加载节点数据
  const loadData = useCallback(
    async (node: DataNode): Promise<void> => {
      const { key } = node;
      logger.debug(`开始动态加载节点: ${key}`);

      if (loadingNodes.has(String(key))) {
        logger.debug(`⏳ 节点 ${key} 正在加载中，跳过`);
        return;
      }

      setLoadingNodes(prev => new Set(prev).add(String(key)));

      // 添加超时保护
      const timeoutId = setTimeout(() => {
        logger.warn(`⏰ 节点 ${key} 加载超时，强制清除loading状态`);
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
          logger.debug(
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
              key: `table|${connectionId}|${database}|${table}`,
              icon: <Table className='w-4 h-4 text-success' />,
              isLeaf: false,
              children: [], // 空数组表示有子节点但未加载
            };
          });

          // 更新树数据
          setTreeData((prevData: DataNode[]) => {
            const updateNode = (nodes: DataNode[]): DataNode[] => {
              return nodes.map((node: DataNode) => {
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
        } else if (String(key).startsWith('table|')) {
          // 加载表的字段和标签
          const [, connectionId, database, table] = String(key).split('|', 4);
          const { tags, fields } = await loadFieldsAndTags(
            connectionId,
            database,
            table
          );

          const children: DataNode[] = [];

          // 获取连接信息以确定数据库类型
          const isIoTDB = isIoTDBConnection(connectionId, connections);

          // 只为非 IoTDB 连接添加标签列（IoTDB 不支持标签概念）
          if (!isIoTDB && Array.isArray(tags)) {
            tags.forEach((tag: string) => {
              const tagPath = `${connectionId}/${database}/${table}/tags/${tag}`;
              const isFav = isFavorite(tagPath);
              children.push({
                title: (
                  <div className='flex items-center gap-2'>
                    <span className='flex-1'>{tag}</span>
                    {isFav && (
                      <Star className='w-3 h-3 text-warning fill-current' />
                    )}
                    <Badge
                      variant='secondary'
                      className='bg-orange-100 text-orange-600 text-xs px-1.5 py-0.5 h-auto'
                    >
                      Tag
                    </Badge>
                    <span className='text-xs text-muted-foreground flex-shrink-0'>
                      string
                    </span>
                  </div>
                ),
                key: `tag|${connectionId}|${database}|${table}|${tag}`,
                icon: <Tags className='w-4 h-4 text-orange-500' />,
                isLeaf: true,
              });
            });
          }

          // 添加字段列（根据数据库类型显示不同的标签）
          fields.forEach((field: { name: string; type: string }) => {
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
                case 'timeseries':
                  return <TrendingUp className='w-4 h-4 text-indigo-500' />;
                default:
                  return <File className='w-4 h-4 text-muted-foreground' />;
              }
            };

            // 根据数据库类型显示不同的标签文本
            const fieldLabel = isIoTDB ? 'Timeseries' : 'Field';
            const fieldBadgeClass = isIoTDB
              ? 'bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 h-auto'
              : 'bg-primary/10 text-primary text-xs px-1.5 py-0.5 h-auto';

            // 对于 IoTDB，优化字段显示名称
            const fieldDisplayName = isIoTDB
              ? getIoTDBDisplayName(field.name, '', true)
              : field.name;

            children.push({
              title: (
                <div className='flex items-center gap-2'>
                  <span className='flex-1' title={field.name}>
                    {fieldDisplayName}
                  </span>
                  {isFav && (
                    <Star className='w-3 h-3 text-warning fill-current' />
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
          setTreeData((prevData: DataNode[]) => {
            const updateNode = (nodes: DataNode[]): DataNode[] => {
              return nodes.map((node: DataNode) => {
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
        logger.error(`加载节点数据失败: ${key}`, error);
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
          showMessage.success(tExplorer('messages.favoriteRemoved'));
        }
      } else {
        const favoriteItem = favoritesUtils.createFavoriteFromPath(
          path,
          connectionId,
          connections
        );
        if (favoriteItem) {
          addFavorite(favoriteItem);
          showMessage.success(tExplorer('messages.favoriteAdded'));
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
      label: isFav ? tExplorer('contextMenu.removeFromFavorites') : tExplorer('contextMenu.addToFavorites'),
      icon: isFav ? (
        <StarOff className='w-4 h-4' />
      ) : (
        <Star className='w-4 h-4' />
      ),
      onClick: () => handleToggleFavorite(key),
    };

    if (String(key).startsWith('database|')) {
      return [
        favoriteMenuItem,
        { key: 'divider-db-1', type: 'divider' },
        {
          key: 'refresh-db',
          label: tExplorer('contextMenu.refreshDatabase'),
          icon: <RefreshCw className='w-4 h-4' />,
        },
        {
          key: 'new-query',
          label: tExplorer('contextMenu.newQuery'),
          icon: <FileText className='w-4 h-4' />,
        },
        { key: 'divider-db-2', type: 'divider' },
        {
          key: 'db-properties',
          label: tExplorer('contextMenu.properties'),
          icon: <Settings className='w-4 h-4' />,
        },
      ];
    }

    if (String(key).startsWith('table|')) {
      return [
        favoriteMenuItem,
        { key: 'divider-table-1', type: 'divider' },
        {
          key: 'refresh-table',
          label: tExplorer('contextMenu.refreshTable'),
          icon: <RefreshCw className='w-4 h-4' />,
        },
        {
          key: 'query-table',
          label: tExplorer('contextMenu.queryTable'),
          icon: <FileText className='w-4 h-4' />,
        },
        { key: 'divider-table-2', type: 'divider' },
        {
          key: 'table-properties',
          label: tExplorer('contextMenu.tableProperties'),
          icon: <Settings className='w-4 h-4' />,
        },
      ];
    }

    if (String(key).startsWith('field|') || String(key).startsWith('tag|')) {
      return [
        favoriteMenuItem,
        { key: 'divider-field-1', type: 'divider' },
        {
          key: 'insert-column',
          label: tExplorer('contextMenu.insertToQuery'),
          icon: <FileText className='w-4 h-4' />,
        },
        {
          key: 'copy-name',
          label: tExplorer('contextMenu.copyColumnName'),
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
          label: tExplorer('contextMenu.refreshConnection'),
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

  // 防重复执行的状态
  const [executingTableQuery, setExecutingTableQuery] = useState<string | null>(
    null
  );

  // 执行表查询的辅助函数 - 添加防重复执行逻辑
  const executeTableQuery = async (
    connectionId: string,
    database: string,
    table: string
  ) => {
    const queryKey = `${connectionId}|${database}|${table}`;

    // 防止重复执行同一个查询
    if (executingTableQuery === queryKey) {
      logger.debug('⚠️ 查询正在执行中，跳过重复请求:', queryKey);
      return;
    }

    try {
      setExecutingTableQuery(queryKey);

      // 优先使用新的数据浏览回调
      if (onCreateDataBrowserTab) {
        onCreateDataBrowserTab(connectionId, database, table);
        showMessage.info(`正在打开表 "${table}" 的数据浏览器...`);
      } else if (onTableDoubleClick) {
        // 保留原有逻辑以便兼容，传递connectionId以正确生成查询
        const query = generateQuery(table, connectionId);
        onTableDoubleClick(database, table, query);
        const timeDesc = currentTimeRange
          ? currentTimeRange.label
          : tExplorer('contextMenu.recentHour');
        showMessage.info(
          `正在查询表 "${table}" 的数据（时间范围：${timeDesc}）...`
        );
      } else if (onCreateQueryTab) {
        // 创建新查询标签页并填入查询语句，传递connectionId
        const query = generateQuery(table, connectionId);
        onCreateQueryTab(query, database, connectionId);
        showMessage.info(`已创建查询标签页，查询表 "${table}"`);
      } else {
        // 如果没有回调，复制查询到剪贴板，传递connectionId
        const query = generateQuery(table, connectionId);
        const success = await writeToClipboard(query, {
          successMessage: `查询语句已复制到剪贴板: ${query}`,
          errorMessage: tExplorer('messages.copyFailed'),
        });
        if (!success) {
          showMessage.info(`查询语句: ${query}`);
        }
      }
    } finally {
      // 延迟清除执行状态，防止快速重复点击
      setTimeout(() => {
        setExecutingTableQuery(null);
      }, 1000);
    }
  };

  useEffect(() => {
    contextMenuOpenRef.current = contextMenuOpen;
  }, [contextMenuOpen]);

  // 旧的 handleRightClick 已被 MultiConnectionTreeView 的 onNodeContextMenu 替代

  // 旧的 handleSelect 已被 MultiConnectionTreeView 的 onNodeSelect 替代

  // 更新单个连接节点（包含数据加载）
  const updateSingleConnectionNode = useCallback(
    async (connection_id: string) => {
      const connection = getConnection(connection_id);
      const isConnected = isConnectionConnected(connection_id);
      const connectionStatus = getConnectionStatus(connection_id);

      if (!connection) return;

      logger.debug(
        `🔄 更新单个连接节点（含数据加载）: ${connection.name}, 连接状态: ${isConnected}`
      );

      // 如果连接成功，检查是否需要加载子节点数据
      if (isConnected) {
        setTreeData((prevData: DataNode[]) => {
          return prevData.map((node: DataNode) => {
            if (node.key === `connection-${connection_id}`) {
              // 检查是否需要重新加载子节点
              const shouldLoadChildren =
                !node.children || node.children.length === 0;

              if (shouldLoadChildren) {
                logger.debug(`📁 开始为连接 ${connection.name} 加载数据库数据`);

                // 异步加载数据库数据
                loadDatabases(connection_id)
                  .then(databases => {
                    logger.debug(
                      `📁 连接 ${connection.name} 数据库加载完成: ${databases.length} 个数据库`
                    );
                    setTreeData((currentData: DataNode[]) => {
                      return currentData.map((currentNode: DataNode) => {
                        if (currentNode.key === `connection-${connection_id}`) {
                          // 再次检查是否已经有子节点，避免重复加载
                          if (
                            currentNode.children &&
                            currentNode.children.length > 0
                          ) {
                            logger.debug(
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
                              const isExpanded =
                                expandedKeys.includes(databaseKey);
                              const isOpened = isDatabaseOpened(
                                connection_id,
                                db
                              );

                              // 从缓存的树节点信息中获取节点类型
                              const cachedNodes =
                                treeNodeCache[connection_id] || [];
                              const treeNode = cachedNodes.find(
                                node => node.name === db
                              );
                              const nodeType =
                                treeNode?.nodeType ||
                                treeNode?.node_type ||
                                'database';

                              const nodeData: any = {
                                title: (
                                  <span className='flex items-center gap-1'>
                                    {db}
                                    {isFav && (
                                      <Star className='w-3 h-3 text-warning fill-current' />
                                    )}
                                    {treeNode?.isSystem && (
                                      <span className='text-xs text-gray-500 italic ml-1'>
                                        system
                                      </span>
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
                    logger.error('加载数据库失败:', error);
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
        setTreeData((prevData: DataNode[]) => {
          return prevData.map((node: DataNode) => {
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
        logger.debug(`测试连接: ${connection.name} (${connection.id})`);

        // 调用连接测试的API
        const testResult = await safeTauriInvoke('test_connection', {
          connectionId: connection.id,
        });

        if (testResult.success) {
          logger.info(`连接测试成功: ${connection.name}`);
        } else {
          logger.warn(
            `⚠️ 连接测试失败: ${connection.name} - ${testResult.error}`
          );
        }
      } catch (error) {
        logger.error(`连接测试失败: ${connection.name}`, error);
      }
    }
  }, [buildCompleteTreeData, connections]);

  // 创建稳定的 connections 序列化 key，用于 useMemo 依赖
  const connectionsKey = useMemo(() => {
    return connections
      .map(
        conn =>
          `${conn.id}:${conn.name}:${conn.dbType}:${isConnectionConnected(conn.id || '')}`
      )
      .join('|');
  }, [connections, connectionStatuses]);

  // 创建稳定的 connectionStatuses 序列化 key，用于 useMemo 依赖
  const connectionStatusesKey = useMemo(() => {
    return connections
      .map(conn => {
        const status =
          connectionStatuses[conn.id || '']?.status || 'disconnected';
        return `${conn.id}:${status}`;
      })
      .join('|');
  }, [connections, connectionStatuses]);

  // 🔧 性能优化：使用 ref 缓存 connections 和 connectionStatuses，避免引用变化
  const memoizedConnectionsRef = useRef<Array<{
    id: string;
    name: string;
    dbType: string;
    host: string;
    port: number;
    isConnected: boolean;
  }>>([]);
  const memoizedConnectionStatusesRef = useRef<Map<string, 'connecting' | 'connected' | 'disconnected'>>(new Map());

  // 只有当实际内容变化时才更新缓存
  const memoizedConnections = useMemo(() => {
    const newConnections = connections.map(conn => ({
      id: conn.id || '',
      name: conn.name,
      dbType: conn.dbType,
      host: conn.host,
      port: conn.port,
      isConnected: isConnectionConnected(conn.id || ''),
    }));

    // 检查是否真的有变化
    const hasChanges = connectionsKey !== JSON.stringify(memoizedConnectionsRef.current.map(c => `${c.id}:${c.name}:${c.isConnected}`));

    if (hasChanges) {
      memoizedConnectionsRef.current = newConnections;
    }

    return memoizedConnectionsRef.current;
  }, [connectionsKey, isConnectionConnected]); // 使用序列化的 key 作为依赖

  // 缓存 connectionStatuses Map，避免每次渲染都创建新 Map
  const memoizedConnectionStatuses = useMemo(() => {
    // 🔧 安全检查：确保 connections 是数组
    if (!Array.isArray(connections)) {
      logger.error('connections 不是数组:', connections);
      return memoizedConnectionStatusesRef.current;
    }

    const newStatuses = new Map(
      connections.map(conn => {
        const status =
          connectionStatuses[conn.id || '']?.status || 'disconnected';
        // 过滤掉 'error' 状态，将其映射为 'disconnected'
        return [
          conn.id || '',
          status === 'error' ? 'disconnected' : status,
        ] as [string, 'connecting' | 'connected' | 'disconnected'];
      })
    );

    // 检查是否真的有变化
    let hasChanges = false;
    if (newStatuses.size !== memoizedConnectionStatusesRef.current.size) {
      hasChanges = true;
    } else {
      newStatuses.forEach((status, id) => {
        if (memoizedConnectionStatusesRef.current.get(id) !== status) {
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      memoizedConnectionStatusesRef.current = newStatuses;
    }

    return memoizedConnectionStatusesRef.current;
  }, [connectionStatusesKey, connections, connectionStatuses]); // 使用序列化的 key 作为依赖

  // 🔧 性能优化：缓存 databaseLoadingStates、connectionErrors、databaseErrors Map
  // 避免每次渲染都创建新 Map 导致 MultiConnectionTreeView 重新渲染
  const memoizedDatabaseLoadingStatesRef = useRef<Map<string, boolean>>(new Map());
  const memoizedConnectionErrorsRef = useRef<Map<string, string>>(new Map());
  const memoizedDatabaseErrorsRef = useRef<Map<string, string>>(new Map());

  const memoizedDatabaseLoadingStates = useMemo(() => {
    // 🔧 安全检查：确保 databaseLoadingStates 是 Map 类型
    if (!(databaseLoadingStates instanceof Map)) {
      logger.error('databaseLoadingStates 不是 Map 类型:', databaseLoadingStates);
      return memoizedDatabaseLoadingStatesRef.current;
    }

    // 检查是否真的有变化
    let hasChanges = false;
    if (databaseLoadingStates.size !== memoizedDatabaseLoadingStatesRef.current.size) {
      hasChanges = true;
    } else {
      databaseLoadingStates.forEach((value, key) => {
        if (memoizedDatabaseLoadingStatesRef.current.get(key) !== value) {
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      memoizedDatabaseLoadingStatesRef.current = new Map(databaseLoadingStates);
    }

    return memoizedDatabaseLoadingStatesRef.current;
  }, [databaseLoadingStates]);

  const memoizedConnectionErrors = useMemo(() => {
    // 🔧 安全检查：确保 connectionErrors 是 Map 类型
    if (!(connectionErrors instanceof Map)) {
      logger.error('connectionErrors 不是 Map 类型:', connectionErrors);
      return memoizedConnectionErrorsRef.current;
    }

    // 检查是否真的有变化
    let hasChanges = false;
    if (connectionErrors.size !== memoizedConnectionErrorsRef.current.size) {
      hasChanges = true;
    } else {
      connectionErrors.forEach((value, key) => {
        if (memoizedConnectionErrorsRef.current.get(key) !== value) {
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      memoizedConnectionErrorsRef.current = new Map(connectionErrors);
    }

    return memoizedConnectionErrorsRef.current;
  }, [connectionErrors]);

  const memoizedDatabaseErrors = useMemo(() => {
    // 🔧 安全检查：确保 databaseErrors 是 Map 类型
    if (!(databaseErrors instanceof Map)) {
      logger.error('databaseErrors 不是 Map 类型:', databaseErrors);
      return memoizedDatabaseErrorsRef.current;
    }

    // 检查是否真的有变化
    let hasChanges = false;
    if (databaseErrors.size !== memoizedDatabaseErrorsRef.current.size) {
      hasChanges = true;
    } else {
      databaseErrors.forEach((value, key) => {
        if (memoizedDatabaseErrorsRef.current.get(key) !== value) {
          hasChanges = true;
        }
      });
    }

    if (hasChanges) {
      memoizedDatabaseErrorsRef.current = new Map(databaseErrors);
    }

    return memoizedDatabaseErrorsRef.current;
  }, [databaseErrors]);

  // 🔧 性能优化：移除 updateConnectionNodeDisplay 的 setTreeData 调用
  // MultiConnectionTreeView 会根据 connectionStatuses 自动更新节点显示
  const updateConnectionNodeDisplay = useCallback(
    (connection_id: string, forceLoading?: boolean) => {
      // 空实现，保持接口兼容性
      // MultiConnectionTreeView 会通过监听 connectionStatuses 自动处理节点显示更新
       
      if (process.env.NODE_ENV === 'development') {
        logger.render(`更新连接节点显示: ${connection_id} (由 MultiConnectionTreeView 自动处理)`);
      }
    },
    []
  );

  // ============================================================================
  // Initialize Event Handler Hooks
  // ============================================================================

  // Connection handlers
  const connectionHandlers = useConnectionHandlers({
    getConnection,
    connectToDatabase,
    disconnectFromDatabase,
    getConnectionStatus,
    isConnectionConnected,
    closeAllDatabasesForConnection,
    clearDatabasesCache,
    setConnectionLoadingStates,
    setConnectionErrors,
    setExpandedKeys,
    treeData,
    buildCompleteTreeData,
    updateConnectionNodeDisplay,
  });

  // Node handlers
  const nodeHandlers = useNodeHandlers({
    setContextMenuTarget,
    setContextMenuOpen,
    setContextMenuPosition,
    contextMenuOpenRef,
    buildCompleteTreeData,
  });

  // Node activate handler
  const { handleNodeActivate } = useNodeActivateHandler({
    onCreateDataBrowserTab,
    onCreateS3BrowserTab,
    openDatabase,
    setManagementNodeDialog,
    setConnectionDetailDialog,
    setContextMenuOpen,
    contextMenuOpenRef,
  });

  // 刷新特定节点
  const refreshNode = useCallback((nodeId: string) => {
    logger.debug(`[刷新节点] 触发节点刷新: ${nodeId}`);
    // 优先使用新的 refreshNodeRef 方法
    if (refreshNodeRef.current) {
      refreshNodeRef.current(nodeId);
    } else {
      // 降级到旧的 prop 方式
      setNodeToRefresh(nodeId);
      // 清除状态，以便下次可以再次刷新同一个节点
      setTimeout(() => {
        setNodeToRefresh(null);
      }, 100);
    }
  }, []);

  // Context menu handler
  const { handleContextMenuAction } = useContextMenuHandler({
    contextMenuTarget,
    setContextMenuOpen,
    setContextMenuTarget,
    getConnection,
    connections,
    isConnectionConnected,
    disconnectFromDatabase,
    removeConnection,
    openDatabase,
    closeDatabase,
    isDatabaseOpened,
    isFavorite,
    addFavorite,
    removeFavorite,
    clearDatabasesCache,
    buildCompleteTreeData,
    refreshNode: refreshNodeRef.current || undefined,
    setLoading,
    setCreateDatabaseDialogOpen,
    setDatabaseInfoDialog,
    setRetentionPolicyDialog,
    setManagementNodeDialog,
    setConnectionDetailDialog,
    setDialogStates,
    handleConnectionToggle: connectionHandlers.handleConnectionToggle,
    handleOpenConnectionDialog,
    onCreateQueryTab,
    onCreateAndExecuteQuery,
    onCreateDataBrowserTab,
    generateQuery,
    executeTableQuery,
    refreshTree,
    openDialog,
  });

  // 🔧 性能优化：使用 ref 存储 handler 函数，避免引用变化导致子组件重新渲染
  const handlersRef = useRef({
    handleConnectionAndLoadDatabases: connectionHandlers.handleConnectionAndLoadDatabases,
    handleNodeSelect: nodeHandlers.handleNodeSelect,
    handleNodeActivate,
    handleContextMenuAction,
    handleTreeRefresh: nodeHandlers.handleTreeRefresh,
  });

  // 更新 ref 中的函数引用
  useEffect(() => {
    handlersRef.current = {
      handleConnectionAndLoadDatabases: connectionHandlers.handleConnectionAndLoadDatabases,
      handleNodeSelect: nodeHandlers.handleNodeSelect,
      handleNodeActivate,
      handleContextMenuAction,
      handleTreeRefresh: nodeHandlers.handleTreeRefresh,
    };
  });

  // 创建稳定的 handler 包装函数
  const stableHandleConnectionAndLoadDatabases = useCallback(
    (...args: Parameters<typeof connectionHandlers.handleConnectionAndLoadDatabases>) => {
      return handlersRef.current.handleConnectionAndLoadDatabases(...args);
    },
    []
  );

  const stableHandleNodeSelect = useCallback(
    (...args: Parameters<typeof nodeHandlers.handleNodeSelect>) => {
      return handlersRef.current.handleNodeSelect(...args);
    },
    []
  );

  const stableHandleNodeActivate = useCallback(
    (...args: Parameters<typeof handleNodeActivate>) => {
      return handlersRef.current.handleNodeActivate(...args);
    },
    []
  );

  const stableHandleContextMenuAction = useCallback(
    (...args: Parameters<typeof handleContextMenuAction>) => {
      return handlersRef.current.handleContextMenuAction(...args);
    },
    []
  );

  const stableHandleTreeRefresh = useCallback(
    (...args: Parameters<typeof nodeHandlers.handleTreeRefresh>) => {
      return handlersRef.current.handleTreeRefresh(...args);
    },
    []
  );

  // Destructure handlers for easier access (保留原有的，用于内部使用)
  const {
    handleConnectionAndLoadDatabases,
    handleExpandConnection,
    handleConnectionToggle,
  } = connectionHandlers;

  const { handleNodeSelect, handleNodeContextMenu, handleTreeRefresh } =
    nodeHandlers;

  // 监听连接配置变化（只有连接增删改时才全量刷新）
  const prevConnectionsRef = useRef<typeof connections>([]);
  useEffect(() => {
    const prevConnections = prevConnectionsRef.current;

    // 检查是否是连接增删改操作（而不是连接状态变化）
    const isConfigChange =
      prevConnections.length !== connections.length ||
      prevConnections.some((prev, index) => {
        const current = connections[index];
        if (!current) return true;

        // 检查关键配置属性是否变化（不包括 isConnected 等状态属性）
        return (
          prev.id !== current.id ||
          prev.name !== current.name ||
          prev.host !== current.host ||
          prev.port !== current.port ||
          prev.username !== current.username ||
          prev.dbType !== current.dbType ||
          prev.database !== current.database
        );
      });

    if (isConfigChange) {
      logger.debug('DatabaseExplorer: 连接配置发生变化，需要重建树');
      logger.debug(
        `所有连接 (${connections.length}):`,
        connections.map(c => `${c.name} (${c.id})`)
      );

      // 新增连接时，延迟一点时间确保连接状态已同步
      const hasNewConnection = connections.length > prevConnections.length;
      const delay = hasNewConnection ? 200 : 0;

      setTimeout(() => {
        logger.debug(`开始重建树形数据 (延迟${delay}ms)`);
        buildCompleteTreeData(false); // 配置变化时不显示全局 loading
      }, delay);
    } else {
      logger.debug(`👀 DatabaseExplorer: 连接配置无变化，跳过重建`);
    }

    prevConnectionsRef.current = connections;
  }, [connections, buildCompleteTreeData]);

  // 清理特定连接的数据库子节点
  const clearDatabaseNodesForConnection = useCallback(
    (connection_id: string) => {
      logger.debug(`清理连接 ${connection_id} 的数据库子节点`);

      setTreeData((prevData: DataNode[]) => {
        return prevData.map((node: DataNode) => {
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
      logger.debug('收到刷新触发器，重新加载数据...');
      // 清除所有缓存，确保获取最新数据
      clearDatabasesCache();
      buildCompleteTreeData(true); // 外部触发器刷新时显示全局 loading
    }
  }, [refreshTrigger, buildCompleteTreeData, clearDatabasesCache]);

  // 使用 ref 跟踪上一次的 openedDatabasesList，避免内容相同但引用不同时触发更新
  const prevOpenedDatabasesListRef = useRef<string[]>([]);

  // 监听已打开数据库变化，通知父组件
  useEffect(() => {
    if (onExpandedDatabasesChange) {
      // 检查内容是否真正变化（深度比较）
      const prevList = prevOpenedDatabasesListRef.current;
      const hasChanged =
        prevList.length !== openedDatabasesList.length ||
        prevList.some((item, index) => item !== openedDatabasesList[index]);

      if (hasChanged) {
        logger.debug('DatabaseExplorer 已打开数据库列表变化:', {
          prev: prevList,
          current: openedDatabasesList,
          timestamp: new Date().toISOString(),
        });
        logger.debug('📤 DatabaseExplorer 通知父组件:', openedDatabasesList);
        onExpandedDatabasesChange(openedDatabasesList);
        prevOpenedDatabasesListRef.current = openedDatabasesList;
      } else {
        logger.debug(
          '👀 DatabaseExplorer 已打开数据库列表内容无变化，跳过通知父组件'
        );
      }
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

  // 监听来自工具栏的打开连接对话框事件
  useEffect(() => {
    const handleOpenConnectionDialogEvent = () => {
      logger.info('📥 DatabaseExplorer收到打开连接对话框事件');
      handleOpenConnectionDialog();
    };

    document.addEventListener('open-connection-dialog', handleOpenConnectionDialogEvent);

    return () => {
      document.removeEventListener('open-connection-dialog', handleOpenConnectionDialogEvent);
    };
  }, [handleOpenConnectionDialog]);

  if (collapsed) {
    return (
      <DatabaseExplorerCollapsedView
        refreshTree={refreshTree}
        loading={loading}
      />
    );
  }

  return (
    <>
      <Card className='database-explorer h-full flex flex-col rounded-none'>
        {/* 头部：连接状态和操作 */}
        <DatabaseExplorerHeader
          headerRef={headerRef}
          hideSystemNodes={hideSystemNodes}
          setHideSystemNodes={setHideSystemNodes}
          refreshTree={refreshTree}
          loading={loading}
          handleOpenConnectionDialog={handleOpenConnectionDialog}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />

        {/* 主要内容：数据源树 */}
        <CardContent className='flex-1 overflow-hidden p-0'>
          <div className='pl-2 h-full w-full'>
            {/* 使用新的 MultiConnectionTreeView */}
            <MultiConnectionTreeView
              connections={memoizedConnections}
              searchValue={searchValue}
              useVersionAwareFilter={hideSystemNodes}
              connectionStatuses={memoizedConnectionStatuses}
              databaseLoadingStates={memoizedDatabaseLoadingStates}
              connectionErrors={memoizedConnectionErrors}
              databaseErrors={memoizedDatabaseErrors}
              isDatabaseOpened={isDatabaseOpened}
              onConnectionToggle={stableHandleConnectionAndLoadDatabases}
              onNodeSelect={stableHandleNodeSelect}
              onNodeActivate={stableHandleNodeActivate}
              onContextMenuAction={stableHandleContextMenuAction}
              onRefresh={stableHandleTreeRefresh}
              nodeRefsMap={nodeRefsMap}
              nodeToRefresh={nodeToRefresh}
              onRefreshNodeReady={(refreshFn) => {
                refreshNodeRef.current = refreshFn;
              }}
              className='h-full'
            />
          </div>
        </CardContent>
      </Card>

      {/* 所有对话框 */}
      <DatabaseExplorerDialogs
        dialogStates={dialogStates}
        closeDialog={closeDialog}
        setDialogStates={setDialogStates}
        createDatabaseDialogOpen={createDatabaseDialogOpen}
        setCreateDatabaseDialogOpen={setCreateDatabaseDialogOpen}
        databaseInfoDialog={databaseInfoDialog}
        setDatabaseInfoDialog={setDatabaseInfoDialog}
        retentionPolicyDialog={retentionPolicyDialog}
        setRetentionPolicyDialog={setRetentionPolicyDialog}
        activeConnectionId={activeConnectionId}
        buildCompleteTreeData={buildCompleteTreeData}
        setTreeNodeCache={setTreeNodeCache}
        refreshNode={refreshNode}
        isConnectionDialogVisible={isConnectionDialogVisible}
        editingConnection={editingConnection}
        handleCloseConnectionDialog={handleCloseConnectionDialog}
        handleConnectionSuccess={handleConnectionSuccess}
        managementNodeDialog={managementNodeDialog}
        setManagementNodeDialog={setManagementNodeDialog}
        connectionDetailDialog={connectionDetailDialog}
        setConnectionDetailDialog={setConnectionDetailDialog}
        onCreateAndExecuteQuery={onCreateAndExecuteQuery}
      />

      {/* 错误提示 - 使用 Portal 渲染，避免被容器遮挡 */}
      <DatabaseExplorerErrorTooltips
        connectionErrors={connectionErrors}
        databaseErrors={databaseErrors}
        nodeRefsMap={nodeRefsMap}
        setConnectionErrors={setConnectionErrors}
        setDatabaseErrors={setDatabaseErrors}
      />
    </>
  );
};

// 🔧 性能优化：使用 React.memo 避免不必要的重新渲染
// 自定义比较函数，只有当关键 props 变化时才重新渲染
const MemoizedDatabaseExplorer = React.memo(DatabaseExplorer, (prevProps, nextProps) => {
  // 比较基本 props
  if (
    prevProps.collapsed !== nextProps.collapsed ||
    prevProps.refreshTrigger !== nextProps.refreshTrigger
  ) {
    return false; // props 变化，需要重新渲染
  }

  // 比较回调函数引用（如果父组件正确使用了 useCallback，这些引用应该是稳定的）
  if (
    prevProps.onTableDoubleClick !== nextProps.onTableDoubleClick ||
    prevProps.onCreateDataBrowserTab !== nextProps.onCreateDataBrowserTab ||
    prevProps.onCreateQueryTab !== nextProps.onCreateQueryTab ||
    prevProps.onCreateAndExecuteQuery !== nextProps.onCreateAndExecuteQuery ||
    prevProps.onViewChange !== nextProps.onViewChange ||
    prevProps.onGetCurrentView !== nextProps.onGetCurrentView ||
    prevProps.onExpandedDatabasesChange !== nextProps.onExpandedDatabasesChange ||
    prevProps.onEditConnection !== nextProps.onEditConnection
  ) {
    return false; // 回调函数引用变化，需要重新渲染
  }

  // 比较 currentTimeRange（深度比较）
  const prevTimeRange = prevProps.currentTimeRange;
  const nextTimeRange = nextProps.currentTimeRange;
  if (prevTimeRange !== nextTimeRange) {
    if (!prevTimeRange || !nextTimeRange) {
      return false; // 一个为 null，需要重新渲染
    }
    if (
      prevTimeRange.label !== nextTimeRange.label ||
      prevTimeRange.start !== nextTimeRange.start ||
      prevTimeRange.end !== nextTimeRange.end
    ) {
      return false; // 时间范围变化，需要重新渲染
    }
  }

  // 所有 props 都没有变化，跳过重新渲染
  return true;
});

MemoizedDatabaseExplorer.displayName = 'DatabaseExplorer';

export default MemoizedDatabaseExplorer;
