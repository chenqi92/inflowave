/**
 * 多数据库管理器组件
 * 
 * 整合数据源浏览器、上下文菜单和元数据管理的统一界面
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Separator,
} from '@/components/ui';
import {
  Database,
  TreePine,
  BarChart,
  Search,
  Settings,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { MultiDatabaseExplorer } from './MultiDatabaseExplorer';
import { MultiDatabaseMetadata } from './MultiDatabaseMetadata';
import { MultiDatabaseContextMenu } from './MultiDatabaseContextMenu';
import { useConnectionStore } from '@/store/connection';
import { SimpleConnectionDialog } from '@/components/ConnectionManager/SimpleConnectionDialog';
import type { ConnectionConfig, DatabaseType } from '@/types';
import { showMessage } from '@/utils/message';

// 数据库类型配置
const DATABASE_CONFIGS = {
  influxdb: {
    name: 'InfluxDB',
    icon: <Database className="w-4 h-4 text-blue-500" />,
    color: 'blue',
    description: '时间序列数据库',
  },
  iotdb: {
    name: 'IoTDB',
    icon: <TreePine className="w-4 h-4 text-green-500" />,
    color: 'green',
    description: '物联网时间序列数据库',
  },
  prometheus: {
    name: 'Prometheus',
    icon: <BarChart className="w-4 h-4 text-orange-500" />,
    color: 'orange',
    description: '监控和告警系统',
  },
  elasticsearch: {
    name: 'Elasticsearch',
    icon: <Search className="w-4 h-4 text-purple-500" />,
    color: 'purple',
    description: '搜索和分析引擎',
  },
} as const;

interface MultiDatabaseManagerProps {
  collapsed?: boolean;
  refreshTrigger?: number;
  onTableDoubleClick?: (database: string, table: string, query: string) => void;
  onCreateDataBrowserTab?: (connectionId: string, database: string, tableName: string) => void;
  onCreateQueryTab?: (query?: string, database?: string) => void;
  onCreateAndExecuteQuery?: (query: string, database: string) => void;
  onEditConnection?: (connection: ConnectionConfig) => void;
}

export const MultiDatabaseManager: React.FC<MultiDatabaseManagerProps> = ({
  collapsed = false,
  refreshTrigger = 0,
  onTableDoubleClick,
  onCreateDataBrowserTab,
  onCreateQueryTab,
  onCreateAndExecuteQuery,
  onEditConnection,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [activeTab, setActiveTab] = useState('explorer');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);

  // 获取连接统计
  const connectionStats = React.useMemo(() => {
    const stats = {
      total: connections.length,
      connected: 0,
      byType: {} as Record<DatabaseType, number>,
    };

    connections.forEach(conn => {
      const dbType = conn.dbType || 'influxdb';
      stats.byType[dbType] = (stats.byType[dbType] || 0) + 1;
      // TODO: 检查连接状态
      // if (isConnected(conn.id)) stats.connected++;
    });

    return stats;
  }, [connections]);

  // 处理数据源浏览器操作
  const handleExplorerAction = useCallback((action: string, node: any) => {
    console.log('数据源浏览器操作:', action, node);
    
    switch (action) {
      case 'refresh_database':
      case 'refresh_table':
        setRefreshKey(prev => prev + 1);
        break;
      case 'create_query':
        if (node.metadata?.query && onCreateQueryTab) {
          onCreateQueryTab(node.metadata.query, node.database);
        }
        break;
      case 'browse_data':
        if (node.connectionId && node.database && node.table && onCreateDataBrowserTab) {
          onCreateDataBrowserTab(node.connectionId, node.database, node.table);
        }
        break;
      case 'edit_connection':
        if (node.metadata?.connection && onEditConnection) {
          onEditConnection(node.metadata.connection);
        }
        break;
      default:
        console.log('未处理的操作:', action);
    }
  }, [onCreateQueryTab, onCreateDataBrowserTab, onEditConnection]);

  // 处理元数据浏览器表选择
  const handleTableSelect = useCallback((database: string, table: string) => {
    setSelectedDatabase(database);
    setSelectedTable(table);
    console.log('选择表:', database, table);
  }, []);

  // 刷新所有数据
  const handleRefreshAll = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    showMessage.success('已刷新数据源');
  }, []);

  // 创建新连接
  const handleCreateConnection = useCallback(() => {
    setShowConnectionDialog(true);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* 头部信息 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">多数据库管理器</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateConnection}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* 连接统计 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{connectionStats.total}</div>
              <div className="text-sm text-muted-foreground">总连接数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{connectionStats.connected}</div>
              <div className="text-sm text-muted-foreground">已连接</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(connectionStats.byType).length}
              </div>
              <div className="text-sm text-muted-foreground">数据库类型</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {currentConnection ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">活跃连接</div>
            </div>
          </div>

          {/* 数据库类型分布 */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(connectionStats.byType).map(([dbType, count]) => {
              const config = DATABASE_CONFIGS[dbType as DatabaseType];
              return (
                <Badge key={dbType} variant="outline" className="flex items-center space-x-1">
                  {config?.icon}
                  <span>{config?.name || dbType}</span>
                  <span className="ml-1 text-xs">({count})</span>
                </Badge>
              );
            })}
          </div>

          {/* 当前连接信息 */}
          {currentConnection && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                {DATABASE_CONFIGS[currentConnection.dbType || 'influxdb']?.icon}
                <span className="font-medium">{currentConnection.name}</span>
                <Badge variant="outline">
                  {currentConnection.dbType?.toUpperCase() || 'INFLUXDB'}
                </Badge>
                <Badge variant="outline">
                  {currentConnection.host}:{currentConnection.port}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="explorer">数据源浏览器</TabsTrigger>
            <TabsTrigger value="metadata">元数据管理</TabsTrigger>
          </TabsList>

          {/* 数据源浏览器 */}
          <TabsContent value="explorer" className="h-full mt-4">
            <MultiDatabaseExplorer
              collapsed={collapsed}
              refreshTrigger={refreshTrigger + refreshKey}
              onTableDoubleClick={onTableDoubleClick}
              onCreateDataBrowserTab={onCreateDataBrowserTab}
              onCreateQueryTab={onCreateQueryTab}
              onCreateAndExecuteQuery={onCreateAndExecuteQuery}
              onEditConnection={onEditConnection}
            />
          </TabsContent>

          {/* 元数据管理 */}
          <TabsContent value="metadata" className="h-full mt-4">
            <MultiDatabaseMetadata
              connectionId={activeConnectionId || undefined}
              database={selectedDatabase}
              table={selectedTable}
              onTableSelect={handleTableSelect}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 连接对话框 */}
      {showConnectionDialog && (
        <SimpleConnectionDialog
          visible={showConnectionDialog}
          onCancel={() => setShowConnectionDialog(false)}
          onSuccess={(connection) => {
            setShowConnectionDialog(false);
            setRefreshKey(prev => prev + 1);
            showMessage.success('连接创建成功');
          }}
        />
      )}
    </div>
  );
};

export default MultiDatabaseManager;
