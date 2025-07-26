/**
 * 多数据库数据源浏览器组件
 * 
 * 支持多种数据库类型的统一数据源管理界面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tree,
  TreeNode,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  Plus,
  Trash2,
  Calendar,
  MousePointer,
  X,
  Info,
  Search,
  Edit,
  Copy,
  BarChart,
  FolderX,
  Server,
  Layers,
  TreePine,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { useFavoritesStore } from '@/store/favorites';
import type { ConnectionConfig, DatabaseType } from '@/types';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import { getDatabaseIcon as getUnifiedDatabaseIcon } from '@/utils/databaseIcons';

// 数据节点接口
interface DataSourceNode {
  key: string;
  title: React.ReactNode;
  children?: DataSourceNode[];
  icon?: React.ReactNode;
  isLeaf?: boolean;
  disabled?: boolean;
  selectable?: boolean;
  checkable?: boolean;
  nodeType: 'connection' | 'database' | 'table' | 'field' | 'storage_group' | 'device' | 'timeseries';
  dbType?: DatabaseType;
  connectionId?: string;
  database?: string;
  table?: string;
  metadata?: any;
}

// 数据库特定的图标映射
const DATABASE_ICONS = {
  influxdb: <Database className="w-4 h-4 text-blue-500" />,
  iotdb: <TreePine className="w-4 h-4 text-green-500" />,
  prometheus: <BarChart className="w-4 h-4 text-orange-500" />,
  elasticsearch: <Search className="w-4 h-4 text-purple-500" />,
} as const;

// 节点类型图标映射
const NODE_TYPE_ICONS = {
  connection: <Server className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  storage_group: <Layers className="w-4 h-4" />,
  table: <Table className="w-4 h-4" />,
  device: <Hash className="w-4 h-4" />,
  timeseries: <Clock className="w-4 h-4" />,
  field: <FileText className="w-4 h-4" />,
} as const;

interface MultiDatabaseExplorerProps {
  collapsed?: boolean;
  refreshTrigger?: number;
  onTableDoubleClick?: (database: string, table: string, query: string) => void;
  onCreateDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void;
  onCreateQueryTab?: (query?: string, database?: string) => void;
  onCreateAndExecuteQuery?: (query: string, database: string) => void;
  onEditConnection?: (connection: ConnectionConfig) => void;
}

export const MultiDatabaseExplorer: React.FC<MultiDatabaseExplorerProps> = ({
  collapsed = false,
  refreshTrigger = 0,
  onTableDoubleClick,
  onCreateDataBrowserTab,
  onCreateQueryTab,
  onCreateAndExecuteQuery,
  onEditConnection,
}) => {
  // Store hooks
  const { 
    connections, 
    activeConnectionId, 
    connectedConnectionIds,
    isConnectionConnected,
    getConnectionStatus 
  } = useConnectionStore();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

  // State
  const [treeData, setTreeData] = useState<DataSourceNode[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());

  // 获取数据库特定的图标
  const getDatabaseIcon = useCallback((dbType: DatabaseType) => {
    return getUnifiedDatabaseIcon(dbType, 'w-4 h-4');
  }, []);

  // 获取节点类型图标
  const getNodeTypeIcon = useCallback((nodeType: DataSourceNode['nodeType']) => {
    return NODE_TYPE_ICONS[nodeType] || NODE_TYPE_ICONS.table;
  }, []);

  // 构建连接节点
  const buildConnectionNode = useCallback((connection: ConnectionConfig): DataSourceNode => {
    const isConnected = connection.id ? isConnectionConnected(connection.id) : false;
    const status = connection.id ? getConnectionStatus(connection.id) : null;
    
    return {
      key: `connection:${connection.id}`,
      title: (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            {getDatabaseIcon(connection.dbType || 'influxdb')}
            <span className="font-medium">{connection.name}</span>
            <Badge 
              variant={isConnected ? 'default' : 'secondary'}
              className="text-xs"
            >
              {connection.dbType?.toUpperCase() || 'INFLUXDB'}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`} 
            />
            {connection.id && isFavorite(`connection:${connection.id}`) && (
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
            )}
          </div>
        </div>
      ),
      children: [],
      icon: getDatabaseIcon(connection.dbType || 'influxdb'),
      isLeaf: false,
      nodeType: 'connection',
      dbType: connection.dbType || 'influxdb',
      connectionId: connection.id,
      metadata: { connection, isConnected, status },
    };
  }, [isConnectionConnected, getConnectionStatus, getDatabaseIcon, isFavorite]);

  // 构建数据库节点（InfluxDB/IoTDB 存储组）
  const buildDatabaseNode = useCallback((
    connectionId: string, 
    dbType: DatabaseType, 
    databaseName: string
  ): DataSourceNode => {
    const nodeType = dbType === 'iotdb' ? 'storage_group' : 'database';
    
    return {
      key: `database:${connectionId}:${databaseName}`,
      title: (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            {getNodeTypeIcon(nodeType)}
            <span>{databaseName}</span>
          </div>
          {isFavorite(`database:${connectionId}:${databaseName}`) && (
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
          )}
        </div>
      ),
      children: [],
      icon: getNodeTypeIcon(nodeType),
      isLeaf: false,
      nodeType,
      dbType,
      connectionId,
      database: databaseName,
      metadata: { databaseName },
    };
  }, [getNodeTypeIcon, isFavorite]);

  // 构建表/设备节点
  const buildTableNode = useCallback((
    connectionId: string,
    dbType: DatabaseType,
    database: string,
    tableName: string
  ): DataSourceNode => {
    const nodeType = dbType === 'iotdb' ? 'device' : 'table';
    
    return {
      key: `table:${connectionId}:${database}:${tableName}`,
      title: (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            {getNodeTypeIcon(nodeType)}
            <span>{tableName}</span>
          </div>
          {isFavorite(`table:${connectionId}:${database}:${tableName}`) && (
            <Star className="w-3 h-3 text-yellow-500 fill-current" />
          )}
        </div>
      ),
      children: [],
      icon: getNodeTypeIcon(nodeType),
      isLeaf: dbType !== 'iotdb', // IoTDB 设备可能有时间序列子节点
      nodeType,
      dbType,
      connectionId,
      database,
      table: tableName,
      metadata: { tableName },
    };
  }, [getNodeTypeIcon, isFavorite]);

  // 构建字段/时间序列节点
  const buildFieldNode = useCallback((
    connectionId: string,
    dbType: DatabaseType,
    database: string,
    table: string,
    fieldName: string,
    fieldType?: string
  ): DataSourceNode => {
    const nodeType = dbType === 'iotdb' ? 'timeseries' : 'field';
    
    return {
      key: `field:${connectionId}:${database}:${table}:${fieldName}`,
      title: (
        <div className="flex items-center space-x-2">
          {getNodeTypeIcon(nodeType)}
          <span>{fieldName}</span>
          {fieldType && (
            <Badge variant="outline" className="text-xs">
              {fieldType}
            </Badge>
          )}
        </div>
      ),
      icon: getNodeTypeIcon(nodeType),
      isLeaf: true,
      nodeType,
      dbType,
      connectionId,
      database,
      table,
      metadata: { fieldName, fieldType },
    };
  }, [getNodeTypeIcon]);

  // 加载数据库列表
  const loadDatabases = useCallback(async (connectionId: string, dbType: DatabaseType) => {
    try {
      setLoadingNodes(prev => new Set(prev).add(`connection:${connectionId}`));
      
      const databases = await safeTauriInvoke('get_databases', { connectionId });
      
      return databases.map((db: string) => buildDatabaseNode(connectionId, dbType, db));
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      showMessage.error(`加载数据库列表失败: ${error}`);
      return [];
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(`connection:${connectionId}`);
        return newSet;
      });
    }
  }, [buildDatabaseNode]);

  // 加载表/设备列表
  const loadTables = useCallback(async (
    connectionId: string, 
    dbType: DatabaseType, 
    database: string
  ) => {
    try {
      setLoadingNodes(prev => new Set(prev).add(`database:${connectionId}:${database}`));
      
      const tables = await safeTauriInvoke('get_tables', { 
        connectionId, 
        database 
      });
      
      return tables.map((table: string) => 
        buildTableNode(connectionId, dbType, database, table)
      );
    } catch (error) {
      console.error('加载表列表失败:', error);
      showMessage.error(`加载表列表失败: ${error}`);
      return [];
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(`database:${connectionId}:${database}`);
        return newSet;
      });
    }
  }, [buildTableNode]);

  // 加载字段/时间序列列表
  const loadFields = useCallback(async (
    connectionId: string,
    dbType: DatabaseType,
    database: string,
    table: string
  ) => {
    try {
      setLoadingNodes(prev => new Set(prev).add(`table:${connectionId}:${database}:${table}`));
      
      const fields = await safeTauriInvoke('get_fields', {
        connectionId,
        database,
        table
      });
      
      return fields.map((field: any) => 
        buildFieldNode(
          connectionId, 
          dbType, 
          database, 
          table, 
          field.name || field, 
          field.type
        )
      );
    } catch (error) {
      console.error('加载字段列表失败:', error);
      showMessage.error(`加载字段列表失败: ${error}`);
      return [];
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(`table:${connectionId}:${database}:${table}`);
        return newSet;
      });
    }
  }, [buildFieldNode]);

  // 构建完整的树形数据
  const buildTreeData = useCallback(async () => {
    setLoading(true);
    
    try {
      const treeNodes: DataSourceNode[] = [];
      
      for (const connection of connections) {
        if (!connection.id) continue;
        
        const connectionNode = buildConnectionNode(connection);
        
        // 如果连接已建立，加载数据库列表
        if (isConnectionConnected(connection.id)) {
          const databases = await loadDatabases(connection.id, connection.dbType || 'influxdb');
          connectionNode.children = databases;
        }
        
        treeNodes.push(connectionNode);
      }
      
      setTreeData(treeNodes);
    } catch (error) {
      console.error('构建树形数据失败:', error);
      showMessage.error(`构建树形数据失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [connections, buildConnectionNode, isConnectionConnected, loadDatabases]);

  // 处理节点展开
  const handleExpand = useCallback(async (expandedKeys: string[], info: any) => {
    setExpandedKeys(expandedKeys);
    
    const { node } = info;
    const nodeKey = String(node.key);
    const nodeData = node as DataSourceNode;
    
    // 如果节点已有子节点，不需要重新加载
    if (nodeData.children && nodeData.children.length > 0) {
      return;
    }
    
    // 根据节点类型加载子节点
    if (nodeData.nodeType === 'connection' && nodeData.connectionId) {
      const databases = await loadDatabases(nodeData.connectionId, nodeData.dbType || 'influxdb');
      updateNodeChildren(nodeKey, databases);
    } else if (nodeData.nodeType === 'database' && nodeData.connectionId && nodeData.database) {
      const tables = await loadTables(nodeData.connectionId, nodeData.dbType || 'influxdb', nodeData.database);
      updateNodeChildren(nodeKey, tables);
    } else if (nodeData.nodeType === 'table' && nodeData.connectionId && nodeData.database && nodeData.table) {
      // 只有 IoTDB 的设备节点需要加载时间序列
      if (nodeData.dbType === 'iotdb') {
        const fields = await loadFields(nodeData.connectionId, nodeData.dbType, nodeData.database, nodeData.table);
        updateNodeChildren(nodeKey, fields);
      }
    }
  }, [loadDatabases, loadTables, loadFields]);

  // 更新节点子节点
  const updateNodeChildren = useCallback((nodeKey: string, children: DataSourceNode[]) => {
    setTreeData(prevData => {
      const updateNode = (nodes: DataSourceNode[]): DataSourceNode[] => {
        return nodes.map(node => {
          if (node.key === nodeKey) {
            return { ...node, children };
          }
          if (node.children) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prevData);
    });
  }, []);

  // 初始化和刷新
  useEffect(() => {
    buildTreeData();
  }, [buildTreeData, refreshTrigger]);

  // 处理节点双击
  const handleDoubleClick = useCallback(async (info: { node: TreeNode }) => {
    const { node } = info;
    const nodeData = node as DataSourceNode;

    console.log('双击节点:', nodeData);

    if (nodeData.nodeType === 'table' && nodeData.connectionId && nodeData.database && nodeData.table) {
      // 双击表节点，创建数据浏览标签页
      if (onCreateDataBrowserTab) {
        onCreateDataBrowserTab(nodeData.connectionId, nodeData.database, nodeData.table);
      } else if (onTableDoubleClick) {
        // 向后兼容
        const query = generateDefaultQuery(nodeData.dbType || 'influxdb', nodeData.database, nodeData.table);
        onTableDoubleClick(nodeData.database, nodeData.table, query);
      }
    } else if (nodeData.nodeType === 'field' && nodeData.connectionId && nodeData.database && nodeData.table) {
      // 双击字段节点，生成查询
      const query = generateFieldQuery(
        nodeData.dbType || 'influxdb',
        nodeData.database,
        nodeData.table,
        nodeData.metadata?.fieldName
      );

      if (onCreateAndExecuteQuery) {
        onCreateAndExecuteQuery(query, nodeData.database);
      } else if (onCreateQueryTab) {
        onCreateQueryTab(query, nodeData.database);
      }
    }
  }, [onCreateDataBrowserTab, onTableDoubleClick, onCreateAndExecuteQuery, onCreateQueryTab]);

  // 生成默认查询语句
  const generateDefaultQuery = useCallback((dbType: DatabaseType, database: string, table: string) => {
    switch (dbType) {
      case 'influxdb':
        return `SELECT * FROM "${table}" LIMIT 100`;
      case 'iotdb':
        return `SELECT * FROM ${database}.${table} LIMIT 100`;
      case 'prometheus':
        return `{__name__="${table}"}[5m]`;
      case 'elasticsearch':
        return `GET /${table}/_search\n{\n  "size": 100\n}`;
      default:
        return `SELECT * FROM "${table}" LIMIT 100`;
    }
  }, []);

  // 生成字段查询语句
  const generateFieldQuery = useCallback((
    dbType: DatabaseType,
    database: string,
    table: string,
    field: string
  ) => {
    switch (dbType) {
      case 'influxdb':
        return `SELECT "${field}" FROM "${table}" WHERE time >= now() - 1h`;
      case 'iotdb':
        return `SELECT ${field} FROM ${database}.${table} WHERE time >= now() - 1h`;
      case 'prometheus':
        return `${field}[1h]`;
      case 'elasticsearch':
        return `GET /${table}/_search\n{\n  "_source": ["${field}"],\n  "size": 100\n}`;
      default:
        return `SELECT "${field}" FROM "${table}" WHERE time >= now() - 1h`;
    }
  }, []);

  // 处理右键菜单
  const handleRightClick = useCallback((info: { node: TreeNode; event?: React.MouseEvent }) => {
    const { node, event } = info;
    event?.preventDefault();
    event?.stopPropagation();

    const nodeData = node as DataSourceNode;
    console.log('右键点击节点:', nodeData);

    // TODO: 实现右键菜单逻辑
    // 根据节点类型显示不同的菜单选项
  }, []);

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchValue.trim()) return treeData;

    const filterNode = (node: DataSourceNode): DataSourceNode | null => {
      const nodeText = typeof node.title === 'string' ? node.title : '';
      const titleMatch = nodeText.toLowerCase().includes(searchValue.toLowerCase());

      let filteredChildren: DataSourceNode[] = [];
      if (node.children) {
        filteredChildren = node.children
          .map(child => filterNode(child))
          .filter(Boolean) as DataSourceNode[];
      }

      if (titleMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return treeData
      .map(node => filterNode(node))
      .filter(Boolean) as DataSourceNode[];
  }, [treeData, searchValue]);

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col">
        {/* 搜索栏 */}
        <div className="mb-4">
          <SearchInput
            placeholder="搜索数据源..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full"
          />
        </div>
        
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-4">
          <Typography.Text className="text-sm font-medium">
            数据源浏览器
          </Typography.Text>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => buildTreeData()}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新数据源</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* 树形结构 */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Spin size="large" />
            </div>
          ) : (
            <Tree
              treeData={filteredTreeData}
              expandedKeys={expandedKeys}
              onExpand={handleExpand}
              onDoubleClick={handleDoubleClick}
              onRightClick={handleRightClick}
              showIcon
              showLine
              className="w-full"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiDatabaseExplorer;
