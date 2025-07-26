/**
 * 多数据库元数据管理组件
 * 
 * 统一管理不同数据库类型的元数据信息
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Spin,
  Typography,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  Database,
  Table as TableIcon,
  Hash,
  Clock,
  Info,
  RefreshCw,
  Search,
  Filter,
  Download,
  TreePine,
  BarChart,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { DatabaseType } from '@/types';

// 元数据接口
interface DatabaseMetadata {
  name: string;
  type: DatabaseType;
  size?: string;
  tableCount?: number;
  createdAt?: string;
  description?: string;
}

interface TableMetadata {
  name: string;
  type: string;
  rowCount?: number;
  size?: string;
  createdAt?: string;
  lastModified?: string;
  description?: string;
  fields?: FieldMetadata[];
}

interface FieldMetadata {
  name: string;
  type: string;
  nullable?: boolean;
  defaultValue?: any;
  description?: string;
  tags?: string[];
}

interface MultiDatabaseMetadataProps {
  connectionId?: string;
  database?: string;
  table?: string;
  onTableSelect?: (database: string, table: string) => void;
}

export const MultiDatabaseMetadata: React.FC<MultiDatabaseMetadataProps> = ({
  connectionId,
  database,
  table,
  onTableSelect,
}) => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<DatabaseMetadata[]>([]);
  const [tables, setTables] = useState<TableMetadata[]>([]);
  const [fields, setFields] = useState<FieldMetadata[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('databases');

  const currentConnectionId = connectionId || activeConnectionId;
  const currentConnection = connections.find(conn => conn.id === currentConnectionId);
  const dbType = currentConnection?.dbType || 'influxdb';

  // 加载数据库列表
  const loadDatabases = useCallback(async () => {
    if (!currentConnectionId) return;

    setLoading(true);
    try {
      const databaseList = await safeTauriInvoke('get_databases', {
        connectionId: currentConnectionId,
      });

      const databasesWithMetadata = await Promise.all(
        databaseList.map(async (dbName: string) => {
          try {
            const metadata = await safeTauriInvoke('get_database_metadata', {
              connectionId: currentConnectionId,
              database: dbName,
            });
            
            return {
              name: dbName,
              type: dbType,
              size: metadata.size,
              tableCount: metadata.tableCount,
              createdAt: metadata.createdAt,
              description: metadata.description,
            };
          } catch (error) {
            console.warn(`获取数据库 ${dbName} 元数据失败:`, error);
            return {
              name: dbName,
              type: dbType,
            };
          }
        })
      );

      setDatabases(databasesWithMetadata);
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      showMessage.error(`加载数据库列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [currentConnectionId, dbType]);

  // 加载表列表
  const loadTables = useCallback(async (databaseName: string) => {
    if (!currentConnectionId || !databaseName) return;

    setLoading(true);
    try {
      const tableList = await safeTauriInvoke('get_tables', {
        connectionId: currentConnectionId,
        database: databaseName,
      });

      const tablesWithMetadata = await Promise.all(
        tableList.map(async (tableName: string) => {
          try {
            const metadata = await safeTauriInvoke('get_table_metadata', {
              connectionId: currentConnectionId,
              database: databaseName,
              table: tableName,
            });
            
            return {
              name: tableName,
              type: getTableType(dbType),
              rowCount: metadata.rowCount,
              size: metadata.size,
              createdAt: metadata.createdAt,
              lastModified: metadata.lastModified,
              description: metadata.description,
            };
          } catch (error) {
            console.warn(`获取表 ${tableName} 元数据失败:`, error);
            return {
              name: tableName,
              type: getTableType(dbType),
            };
          }
        })
      );

      setTables(tablesWithMetadata);
    } catch (error) {
      console.error('加载表列表失败:', error);
      showMessage.error(`加载表列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [currentConnectionId, dbType]);

  // 加载字段列表
  const loadFields = useCallback(async (databaseName: string, tableName: string) => {
    if (!currentConnectionId || !databaseName || !tableName) return;

    setLoading(true);
    try {
      const fieldList = await safeTauriInvoke('get_fields', {
        connectionId: currentConnectionId,
        database: databaseName,
        table: tableName,
      });

      const fieldsWithMetadata = fieldList.map((field: any) => ({
        name: field.name || field,
        type: field.type || 'unknown',
        nullable: field.nullable,
        defaultValue: field.defaultValue,
        description: field.description,
        tags: field.tags || [],
      }));

      setFields(fieldsWithMetadata);
    } catch (error) {
      console.error('加载字段列表失败:', error);
      showMessage.error(`加载字段列表失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [currentConnectionId]);

  // 获取表类型名称
  const getTableType = (dbType: DatabaseType): string => {
    switch (dbType) {
      case 'influxdb':
        return 'Measurement';
      case 'iotdb':
        return 'Device';
      case 'prometheus':
        return 'Metric';
      case 'elasticsearch':
        return 'Index';
      default:
        return 'Table';
    }
  };

  // 获取字段类型名称
  const getFieldType = (dbType: DatabaseType): string => {
    switch (dbType) {
      case 'influxdb':
        return 'Field';
      case 'iotdb':
        return 'Timeseries';
      case 'prometheus':
        return 'Label';
      case 'elasticsearch':
        return 'Field';
      default:
        return 'Column';
    }
  };

  // 获取数据库图标
  const getDatabaseIcon = (dbType: DatabaseType) => {
    switch (dbType) {
      case 'influxdb':
        return <Database className="w-4 h-4 text-blue-500" />;
      case 'iotdb':
        return <TreePine className="w-4 h-4 text-green-500" />;
      case 'prometheus':
        return <BarChart className="w-4 h-4 text-orange-500" />;
      case 'elasticsearch':
        return <Search className="w-4 h-4 text-purple-500" />;
      default:
        return <Database className="w-4 h-4" />;
    }
  };

  // 过滤数据
  const filteredDatabases = databases.filter(db => 
    db.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTables = tables.filter(table => {
    const matchesSearch = table.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || table.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 初始化
  useEffect(() => {
    if (currentConnectionId) {
      loadDatabases();
    }
  }, [currentConnectionId, loadDatabases]);

  useEffect(() => {
    if (database) {
      loadTables(database);
      setActiveTab('tables');
    }
  }, [database, loadTables]);

  useEffect(() => {
    if (database && table) {
      loadFields(database, table);
      setActiveTab('fields');
    }
  }, [database, table, loadFields]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getDatabaseIcon(dbType)}
          <span>元数据浏览器</span>
          {currentConnection && (
            <Badge variant="outline">
              {currentConnection.dbType?.toUpperCase() || 'INFLUXDB'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 搜索和过滤 */}
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Input
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === 'databases') loadDatabases();
              else if (activeTab === 'tables' && database) loadTables(database);
              else if (activeTab === 'fields' && database && table) loadFields(database, table);
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="databases">
              {dbType === 'iotdb' ? '存储组' : '数据库'} ({filteredDatabases.length})
            </TabsTrigger>
            <TabsTrigger value="tables">
              {getTableType(dbType)} ({filteredTables.length})
            </TabsTrigger>
            <TabsTrigger value="fields">
              {getFieldType(dbType)} ({filteredFields.length})
            </TabsTrigger>
          </TabsList>

          {/* 数据库列表 */}
          <TabsContent value="databases" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spin size="large" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>表数量</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDatabases.map((db) => (
                    <TableRow
                      key={db.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        loadTables(db.name);
                        setActiveTab('tables');
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {getDatabaseIcon(db.type)}
                          <span>{db.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{db.tableCount || '-'}</TableCell>
                      <TableCell>{db.size || '-'}</TableCell>
                      <TableCell>{db.createdAt || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* 表列表 */}
          <TabsContent value="tables" className="space-y-4">
            {activeTab === 'tables' && (
              <div className="flex items-center space-x-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value={getTableType(dbType)}>{getTableType(dbType)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spin size="large" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>行数</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>最后修改</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTables.map((table) => (
                    <TableRow
                      key={table.name}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        if (database) {
                          loadFields(database, table.name);
                          setActiveTab('fields');
                          onTableSelect?.(database, table.name);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <TableIcon className="w-4 h-4" />
                          <span>{table.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{table.type}</Badge>
                      </TableCell>
                      <TableCell>{table.rowCount || '-'}</TableCell>
                      <TableCell>{table.size || '-'}</TableCell>
                      <TableCell>{table.lastModified || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* 字段列表 */}
          <TabsContent value="fields" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Spin size="large" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>可空</TableHead>
                    <TableHead>默认值</TableHead>
                    <TableHead>描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFields.map((field) => (
                    <TableRow key={field.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          {dbType === 'iotdb' ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Hash className="w-4 h-4" />
                          )}
                          <span>{field.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{field.type}</Badge>
                      </TableCell>
                      <TableCell>
                        {field.nullable !== undefined ? (
                          field.nullable ? '是' : '否'
                        ) : '-'}
                      </TableCell>
                      <TableCell>{field.defaultValue || '-'}</TableCell>
                      <TableCell>{field.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MultiDatabaseMetadata;
