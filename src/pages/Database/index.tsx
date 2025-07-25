import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Button,
  Badge,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from '@/components/ui';
import { showMessage } from '@/utils/message';
import {
  Database as DatabaseIcon,
  Plus,
  Trash2,
  Info,
  RefreshCw,
  BarChart,
  Edit,
  AlertCircle,
} from 'lucide-react';
import '@/styles/database-management.css';

import { safeTauriInvoke } from '@/utils/tauri';
import { saveJsonFile } from '@/utils/nativeDownload';
import { useConnectionStore } from '@/store/connection';
import ContextMenu from '@/components/common/ContextMenu';
import RetentionPolicyDialog from '@/components/common/RetentionPolicyDialog';
import DatabaseContextMenu from '@/components/database/DatabaseContextMenu';
import TableContextMenu from '@/components/database/TableContextMenu';
import type { RetentionPolicy } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useSmartSql } from '@/hooks/useSmartSql';
import { toast } from 'sonner';

// 生成图表查询的辅助函数
const generateChartQuery = (params: any): string => {
  const { database, measurement, chartType } = params;

  switch (chartType) {
    case 'timeSeries':
      return `SELECT *
              FROM "${measurement}"
              WHERE time >= now() - 1h
              ORDER BY time DESC`;
    case 'fieldDistribution':
      return `SELECT *
              FROM "${measurement}"
              WHERE time >= now() - 24h
              ORDER BY time DESC LIMIT 1000`;
    case 'tagStats':
      return `SELECT COUNT(*)
              FROM "${measurement}"
              WHERE time >= now() - 24h
              GROUP BY *`;
    default:
      return `SELECT *
              FROM "${measurement}"
              WHERE time >= now() - 1h
              ORDER BY time DESC LIMIT 100`;
  }
};

const generateFieldChartQuery = (params: any): string => {
  const { database, measurement, field, chartType } = params;

  switch (chartType) {
    case 'timeSeries':
      return `SELECT time, "${field}"
              FROM "${measurement}"
              WHERE time >= now() - 1h
              ORDER BY time DESC`;
    case 'histogram':
      return `SELECT "${field}"
              FROM "${measurement}"
              WHERE time >= now() - 24h AND "${field}" IS NOT NULL LIMIT 10000`;
    case 'boxplot':
      return `SELECT MIN("${field}"),
                     MAX("${field}"),
                     MEAN("${field}"),
                     PERCENTILE("${field}", 25),
                     PERCENTILE("${field}", 75)
              FROM "${measurement}"
              WHERE time >= now() - 24h`;
    default:
      return `SELECT time, "${field}"
              FROM "${measurement}"
              WHERE time >= now() - 1h
              ORDER BY time DESC`;
  }
};

const generateTagChartQuery = (params: any): string => {
  const { database, measurement, tagKey, chartType } = params;

  switch (chartType) {
    case 'distribution':
      return `SELECT COUNT(*)
              FROM "${measurement}"
              WHERE time >= now() - 24h
              GROUP BY "${tagKey}"`;
    default:
      return `SELECT COUNT(*)
              FROM "${measurement}"
              WHERE time >= now() - 24h
              GROUP BY "${tagKey}"`;
  }
};

interface DatabaseStats {
  name: string;
  measurementCount: number;
  seriesCount: number;
  pointCount: number;
  diskSize: number;
  lastUpdate: Date;
}

const Database: React.FC = () => {
  const { activeConnectionId } = useConnectionStore();
  const navigate = useNavigate();
  const {
    generateQuickQuery,
    executeGeneratedSql,
    copySqlToClipboard,
    generateSelectQuery,
    generateCountQuery,
    generateShowQuery,
    generateFieldStatsQuery,
    generateTimeSeriesQuery,
    loading: sqlLoading,
  } = useSmartSql({
    onSqlGenerated: result => {
      toast.success(`SQL 已生成: ${result.description}`);
    },
    onError: error => {
      toast.error(`SQL 生成失败: ${error}`);
    },
  });
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>(
    []
  );
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(
    null
  );
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [retentionPolicyDialog, setRetentionPolicyDialog] = useState<{
    visible: boolean;
    mode: 'create' | 'edit';
    policy?: RetentionPolicy;
  }>({
    visible: false,
    mode: 'create',
    policy: undefined,
  });
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    target: any;
  }>({
    visible: false,
    x: 0,
    y: 0,
    target: null,
  });
  const [deleteMeasurementParams, setDeleteMeasurementParams] =
    useState<any>(null);
  const form = useForm();

  // 加载数据库列表
  const loadDatabases = async () => {
    if (!activeConnectionId) {
      return;
    }

    setLoading(true);
    try {
      const dbList = await safeTauriInvoke<string[]>('get_databases', {
        connectionId: activeConnectionId,
      });
      setDatabases(Array.isArray(dbList) ? dbList : []);

      // 如果有数据库且没有选中的，选择第一个
      if (dbList.length > 0 && !selectedDatabase) {
        setSelectedDatabase(dbList[0]);
      }
    } catch (error) {
      showMessage.error(`加载数据库列表失败: ${error}`);
      // Reset databases to prevent null/undefined errors
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  // 加载数据库详细信息
  const loadDatabaseDetails = async (database: string) => {
    if (!activeConnectionId || !database) return;

    setLoading(true);
    try {
      // 并行加载测量、保留策略和统计信息
      const [measurementList, retentionPolicyList, stats] = await Promise.all([
        safeTauriInvoke<string[]>('get_measurements', {
          connection_id: activeConnectionId,
          database,
        }).catch(() => []),
        safeTauriInvoke<RetentionPolicy[]>('get_retention_policies', {
          connection_id: activeConnectionId,
          database,
        }).catch(() => []),
        safeTauriInvoke<DatabaseStats>('get_database_stats', {
          connection_id: activeConnectionId,
          database,
        }).catch(() => null),
      ]);

      setMeasurements(Array.isArray(measurementList) ? measurementList : []);
      setRetentionPolicies(
        Array.isArray(retentionPolicyList) ? retentionPolicyList : []
      );
      setDatabaseStats(stats);
    } catch (error) {
      showMessage.error(`加载数据库详细信息失败: ${error}`);
      // Reset arrays to prevent null/undefined errors
      setMeasurements([]);
      setRetentionPolicies([]);
      setDatabaseStats(null);
    } finally {
      setLoading(false);
    }
  };

  // 创建数据库
  const createDatabase = async (values: any) => {
    if (!activeConnectionId) {
      showMessage.success('请先选择一个连接');
      return;
    }

    try {
      await safeTauriInvoke('create_database', {
        connection_id: activeConnectionId,
        config: {
          name: values.name,
          retentionPolicy: values.retentionPolicy,
        },
      });

      showMessage.success('数据库创建成功');
      setCreateModalVisible(false);
      form.reset();
      await loadDatabases();
    } catch (error) {
      showMessage.error(`创建数据库失败: ${error}`);
    }
  };

  // 删除测量
  const deleteMeasurement = async () => {
    if (!deleteMeasurementParams || !activeConnectionId) return;

    try {
      await safeTauriInvoke('drop_measurement', {
        connection_id: activeConnectionId,
        database: deleteMeasurementParams.database,
        measurement: deleteMeasurementParams.measurement,
      });
      showMessage.success(
        `测量 "${deleteMeasurementParams.measurement}" 删除成功`
      );
      loadDatabaseDetails(selectedDatabase);
      setDeleteMeasurementParams(null);
    } catch (error) {
      showMessage.error(`删除测量失败: ${error}`);
    }
  };

  // 删除数据库
  const deleteDatabase = async (database: string) => {
    if (!activeConnectionId) {
      showMessage.success('请先选择一个连接');
      return;
    }

    try {
      await safeTauriInvoke('drop_database', {
        connection_id: activeConnectionId,
        database,
      });

      showMessage.success('数据库删除成功');

      // 如果删除的是当前选中的数据库，清空选择
      if (selectedDatabase === database) {
        setSelectedDatabase('');
        setMeasurements([]);
        setRetentionPolicies([]);
        setDatabaseStats(null);
      }

      await loadDatabases();
    } catch (error) {
      showMessage.error(`删除数据库失败: ${error}`);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    if (activeConnectionId) {
      loadDatabases();
    }
  }, [activeConnectionId]);

  // 选中数据库变化时加载详细信息
  useEffect(() => {
    if (selectedDatabase) {
      loadDatabaseDetails(selectedDatabase);
    }
  }, [selectedDatabase]);

  if (!activeConnectionId) {
    return (
      <div className='h-full bg-background flex flex-col'>
        <div className='flex-1 overflow-hidden bg-background'>
          <div className='p-6'>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="space-y-2">
                  <div className="font-medium">请先连接到 InfluxDB</div>
                  <div>在连接管理页面选择一个连接并激活后，才能管理数据库。</div>
                  <Button size="sm" className="mt-2">
                    去连接
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className='h-full bg-background flex flex-col'>
        {/* 工具栏 */}
        <div className='border-b bg-background'>
          <div className='p-4 flex items-center justify-end'>
            <div className='flex gap-2'>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDatabases}
              disabled={loading}
            >
              <RefreshCw className='w-3 h-3 mr-1' />
              刷新
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateModalVisible(true)}
            >
              <Plus className='w-3 h-3 mr-1' />
              创建数据库
            </Button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className='flex-1 overflow-hidden bg-background'>
          <div className='p-6 database-management'>

        {/* 数据库选择器 */}
        <div className='mb-6'>
          <div className='flex items-center gap-4'>
            <Text className='font-semibold text-base'>
              选择数据库:
            </Text>
            <Select
              value={selectedDatabase}
              onValueChange={setSelectedDatabase}
            >
              <SelectTrigger className='w-[280px]'>
                <SelectValue placeholder='选择数据库' />
              </SelectTrigger>
              <SelectContent>
                {(databases || []).map(db => (
                  <SelectItem key={db} value={db}>
                    <DatabaseContextMenu
                      databaseName={db}
                      onAction={(action, dbName) => {
                        console.log('数据库操作:', action, dbName);
                        // 根据操作类型执行相应的处理
                        if (action === 'refresh_database') {
                          loadDatabaseDetails(dbName);
                        } else if (action === 'drop_database') {
                          loadDatabases(); // 重新加载数据库列表
                        }
                      }}
                    >
                      <div className='flex gap-2'>
                        <DatabaseIcon className='w-4 h-4' />
                        {db}
                      </div>
                    </DatabaseContextMenu>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDatabase && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className='w-4 h-4 mr-2' />
                    删除数据库
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>确定要删除这个数据库吗？</DialogTitle>
                    <DialogDescription>
                      删除后数据将无法恢复！
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline">取消</Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteDatabase(selectedDatabase)}
                    >
                      确定删除
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {selectedDatabase && (
          <>
            {/* 数据库统计信息 */}
            {databaseStats && (
              <Card className='mb-6'>
                <CardHeader>
                  <CardTitle>数据库统计</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <BarChart className='w-4 h-4 text-muted-foreground' />
                        <Text className="text-sm text-muted-foreground">测量数量</Text>
                      </div>
                      <div className="text-2xl font-bold">{databaseStats.measurementCount}</div>
                    </div>
                    <div className="space-y-2">
                      <Text className="text-sm text-muted-foreground">序列数量</Text>
                      <div className="text-2xl font-bold">{databaseStats.seriesCount}</div>
                    </div>
                    <div className="space-y-2">
                      <Text className="text-sm text-muted-foreground">数据点数量</Text>
                      <div className="text-2xl font-bold">{databaseStats.pointCount}</div>
                    </div>
                    <div className="space-y-2">
                      <Text className="text-sm text-muted-foreground">磁盘使用</Text>
                      <div className="text-2xl font-bold">{databaseStats.diskSize} MB</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 测量列表 */}
            <Card className='mb-6'>
              <CardHeader>
                <CardTitle>测量列表</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <Text>加载中...</Text>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>测量名称</TableHead>
                        <TableHead className="w-[180px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {measurements?.length ? (
                        measurements.map((name) => (
                          <TableRow
                            key={name}
                            onContextMenu={(event) => {
                              event.preventDefault();
                              setContextMenu({
                                visible: true,
                                x: event.clientX,
                                y: event.clientY,
                                target: {
                                  type: 'measurement',
                                  name,
                                  database: selectedDatabase,
                                },
                              });
                            }}
                          >
                            <TableCell>
                              <TableContextMenu
                                tableName={name}
                                databaseName={selectedDatabase}
                                onAction={(action, tableName) => {
                                  console.log('表操作:', action, tableName);
                                  // 根据操作类型执行相应的处理
                                  if (action === 'view_data') {
                                    // 触发表查询事件，让主布局处理
                                    const query = `SELECT * FROM "${tableName}" ORDER BY time DESC LIMIT 500`;
                                    window.dispatchEvent(new CustomEvent('table-query', {
                                      detail: {
                                        query,
                                        database: selectedDatabase,
                                        tableName
                                      }
                                    }));
                                  } else if (action === 'refresh_table') {
                                    loadDatabaseDetails(selectedDatabase);
                                  }
                                }}
                              >
                                <div className='flex gap-2 items-center'>
                                  <BarChart className='w-4 h-4' />
                                  <Text className='font-semibold'>
                                    {name}
                                  </Text>
                                </div>
                              </TableContextMenu>
                            </TableCell>
                            <TableCell>
                              <div className='flex gap-2'>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          showMessage.success(
                                            '查看测量详情功能开发中...'
                                          )
                                        }
                                      >
                                        <Info className='w-4 h-4' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>查看详情</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                          >
                                            <Trash2 className='w-4 h-4 text-destructive' />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>删除</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>确定要删除这个测量吗？</DialogTitle>
                                    </DialogHeader>
                                    <DialogFooter>
                                      <Button variant="outline">取消</Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => showMessage.success('删除测量功能开发中...')}
                                      >
                                        确定删除
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-8">
                            <Text className="text-muted-foreground">暂无测量数据</Text>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 保留策略 */}
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle>保留策略</CardTitle>
                  <Button
                    size="sm"
                    onClick={() =>
                      setRetentionPolicyDialog({
                        visible: true,
                        mode: 'create',
                        policy: undefined,
                      })
                    }
                  >
                    <Plus className='w-3 h-3 mr-1' />
                    创建策略
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                    <Text>加载中...</Text>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>策略名称</TableHead>
                        <TableHead>保留时间</TableHead>
                        <TableHead>分片组时间</TableHead>
                        <TableHead>副本数</TableHead>
                        <TableHead className="w-[120px]">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retentionPolicies?.length ? (
                        retentionPolicies.map((record) => (
                          <TableRow key={record.name}>
                            <TableCell>
                              <div className='flex gap-2 items-center'>
                                <Text className='font-semibold'>
                                  {record.name}
                                </Text>
                                {record.default && (
                                  <Badge variant="secondary">默认</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{record.duration}</TableCell>
                            <TableCell>{record.shardGroupDuration}</TableCell>
                            <TableCell>{record.replicaN}</TableCell>
                            <TableCell>
                              <div className='flex gap-2'>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setRetentionPolicyDialog({
                                            visible: true,
                                            mode: 'edit',
                                            policy: record,
                                          })
                                        }
                                      >
                                        <Edit className='w-4 h-4' />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>编辑</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {!record.default && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                            >
                                              <Trash2 className='w-4 h-4 text-destructive' />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>删除</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>确定要删除这个保留策略吗？</DialogTitle>
                                        <DialogDescription>
                                          删除后数据将无法恢复！
                                        </DialogDescription>
                                      </DialogHeader>
                                      <DialogFooter>
                                        <Button variant="outline">取消</Button>
                                        <Button
                                          variant="destructive"
                                          onClick={async () => {
                                            try {
                                              await safeTauriInvoke(
                                                'drop_retention_policy',
                                                {
                                                  connection_id: activeConnectionId,
                                                  database: selectedDatabase,
                                                  policyName: record.name,
                                                }
                                              );
                                              showMessage.success(
                                                `保留策略 "${record.name}" 删除成功`
                                              );
                                              loadDatabaseDetails(selectedDatabase);
                                            } catch (error) {
                                              showMessage.error(
                                                `删除保留策略失败: ${error}`
                                              );
                                            }
                                          }}
                                        >
                                          确定删除
                                        </Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Text className="text-muted-foreground">暂无保留策略</Text>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* 上下文菜单处理函数 */}
        {React.useMemo(() => {
          const handleContextMenuAction = async (
            action: string,
            params?: any
          ) => {
            setContextMenu({ visible: false, x: 0, y: 0, target: null });

            try {
              switch (action) {
                case 'generateSQL':
                  // 智能 SQL 生成
                  try {
                    let result;

                    switch (params.sqlType) {
                      case 'select_all':
                        result = await generateSelectQuery(
                          params.database,
                          params.measurement
                        );
                        break;
                      case 'select_fields':
                        result = await generateSelectQuery(
                          params.database,
                          params.measurement,
                          params.fields
                        );
                        break;
                      case 'count_records':
                        result = await generateCountQuery(
                          params.database,
                          params.measurement
                        );
                        break;
                      case 'time_series':
                        result = await generateTimeSeriesQuery(
                          params.database,
                          params.measurement,
                          params.time_range
                        );
                        break;
                      case 'aggregation':
                        result = await generateFieldStatsQuery(
                          params.fields?.[0] || 'value',
                          'count',
                          params.database,
                          params.measurement
                        );
                        break;
                      case 'show_measurements':
                        result = await generateShowQuery(
                          'measurements',
                          params.database
                        );
                        break;
                      case 'show_tag_keys':
                        result = await generateShowQuery(
                          'tag_keys',
                          params.database,
                          params.measurement
                        );
                        break;
                      case 'show_field_keys':
                        result = await generateShowQuery(
                          'field_keys',
                          params.database,
                          params.measurement
                        );
                        break;
                      case 'show_tag_values':
                        result = await generateShowQuery(
                          'tag_values',
                          params.database,
                          params.measurement,
                          params.tag
                        );
                        break;
                      default:
                        throw new Error(`不支持的 SQL 类型: ${params.sqlType}`);
                    }

                    // 跳转到查询页面并填充生成的 SQL
                    navigate('/query', {
                      state: {
                        query: result.sql,
                        database: params.database,
                        description: result.description,
                      },
                    });
                  } catch (error) {
                    showMessage.error(`SQL 生成失败: ${error}`);
                  }
                  break;

                case 'copyToClipboard':
                  // 复制到剪贴板
                  try {
                    await copySqlToClipboard(params.text);
                  } catch (error) {
                    showMessage.error(`复制失败: ${error}`);
                  }
                  break;
                case 'showMeasurements':
                  // 已经在当前页面显示
                  showMessage.success('测量列表已在当前页面显示');
                  break;

                case 'showRetentionPolicies':
                  // 已经在当前页面显示
                  showMessage.success('保留策略已在当前页面显示');
                  break;

                case 'showDatabaseInfo':
                  // 显示数据库详细信息对话框
                  toast.info(`数据库信息 - ${params.database}`, {
                    description: `测量数量: ${measurements.length}, 保留策略数量: ${retentionPolicies.length}${
                      databaseStats ? `, 序列数量: ${databaseStats.seriesCount}, 数据点数量: ${databaseStats.pointCount}, 磁盘使用: ${databaseStats.diskSize} MB` : ''
                    }`,
                    duration: 5000,
                  });
                  break;

                case 'showDatabaseStats':
                  // 显示数据库统计信息
                  if (databaseStats) {
                    toast.info(`数据库统计 - ${params.database}`, {
                      description: `测量数量: ${databaseStats.measurementCount}, 序列数量: ${databaseStats.seriesCount}, 数据点数量: ${databaseStats.pointCount}, 磁盘使用: ${databaseStats.diskSize} MB`,
                      duration: 5000,
                    });
                  } else {
                    showMessage.success('正在加载数据库统计信息...');
                    loadDatabaseDetails(params.database);
                  }
                  break;

                case 'exportDatabaseStructure':
                  // 导出数据库结构
                  try {
                    const structure = {
                      database: params.database,
                      measurements,
                      retentionPolicies,
                      exportTime: new Date().toISOString(),
                    };

                    const success = await saveJsonFile(structure, {
                      filename: `${params.database}_structure.json`,
                      filters: [
                        { name: '数据库结构文件', extensions: ['json'] },
                        { name: '所有文件', extensions: ['*'] }
                      ]
                    });

                    if (success) {
                      showMessage.success('数据库结构导出成功');
                    }
                  } catch (error) {
                    showMessage.error(`导出失败: ${error}`);
                  }
                  break;

                case 'deleteDatabase':
                  // 使用 toast 确认删除
                  toast.error(`确认删除数据库 "${params.database}"`, {
                    description: '此操作不可撤销！',
                    action: {
                      label: '删除',
                      onClick: () => deleteDatabase(params.database),
                    },
                    duration: 10000,
                  });
                  break;

                case 'previewData':
                  // 预览测量数据
                  try {
                    let query = `SELECT *
                                 FROM "${params.measurement}"`;

                    if (params.timeRange) {
                      query += ` WHERE time >= now() - ${params.timeRange}`;
                    }

                    if (params.limit) {
                      query += ` LIMIT ${params.limit}`;
                    }

                    if (params.orderBy) {
                      query += ` ORDER BY ${params.orderBy}`;
                    }

                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 使用 toast 显示预览结果
                    toast.info(`数据预览 - ${params.measurement}`, {
                      description: `查询: ${query}`,
                      duration: 5000,
                    });

                    // 跳转到查询页面显示完整结果
                    navigate('/query', {
                      state: {
                        query,
                        database: selectedDatabase,
                        description: `数据预览 - ${params.measurement}`,
                      },
                    });
                  } catch (error) {
                    showMessage.error(`数据预览失败: ${error}`);
                  }
                  break;

                case 'showFields':
                  // 查看字段信息
                  try {
                    const fields = await safeTauriInvoke('get_field_keys', {
                      connection_id: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                    });

                    // 使用 toast 显示字段信息
                    const fieldList = Array.isArray(fields)
                      ? fields.map((field: any) => field.fieldKey || field).join(', ')
                      : '无字段信息';

                    toast.info(`字段信息 - ${params.measurement}`, {
                      description: `字段列表: ${fieldList}`,
                      duration: 5000,
                    });
                  } catch (error) {
                    showMessage.error(`获取字段信息失败: ${error}`);
                  }
                  break;

                case 'showTagKeys':
                  // 查看标签键
                  try {
                    const tagKeys = await safeTauriInvoke('get_tag_keys', {
                      connectionId: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                    });

                    // 使用 toast 显示标签键信息
                    const tagKeyList = Array.isArray(tagKeys)
                      ? tagKeys.join(', ')
                      : '无标签键';

                    toast.info(`标签键 - ${params.measurement}`, {
                      description: `标签键列表: ${tagKeyList}`,
                      duration: 5000,
                    });
                  } catch (error) {
                    showMessage.error(`获取标签键失败: ${error}`);
                  }
                  break;

                case 'showTagValues':
                  // 查看标签值
                  try {
                    const tagKeys = await safeTauriInvoke('get_tag_keys', {
                      connectionId: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                    });

                    if (!Array.isArray(tagKeys) || tagKeys.length === 0) {
                      showMessage.success('该测量没有标签键');
                      return;
                    }

                    // 获取第一个标签键的值作为示例
                    const tagValues = await safeTauriInvoke('get_tag_values', {
                      connection_id: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                      tagKey: tagKeys[0],
                    });

                    // 使用 toast 显示标签值信息
                    const tagValueList = Array.isArray(tagValues)
                      ? tagValues.slice(0, 5).join(', ') + (tagValues.length > 5 ? '...' : '')
                      : '无标签值';

                    toast.info(`标签值 - ${params.measurement}`, {
                      description: `标签键 "${tagKeys[0]}" 的值: ${tagValueList}`,
                      duration: 5000,
                    });
                  } catch (error) {
                    showMessage.error(`获取标签值失败: ${error}`);
                  }
                  break;

                case 'showSeries':
                  // 查看序列信息
                  try {
                    const query = `SHOW SERIES FROM "${params.measurement}"`;
                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 跳转到查询页面显示序列信息
                    navigate('/query', {
                      state: {
                        query,
                        database: selectedDatabase,
                        description: `序列信息 - ${params.measurement}`,
                      },
                    });

                    toast.success('正在跳转到查询页面显示序列信息...');
                  } catch (error) {
                    showMessage.error(`获取序列信息失败: ${error}`);
                  }
                  break;

                case 'getRecordCount':
                  // 获取记录总数
                  try {
                    const query = `SELECT COUNT(*)
                                   FROM "${params.measurement}"`;
                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 使用 toast 显示记录统计
                    toast.info(`记录统计 - ${params.measurement}`, {
                      description: `总记录数: ${result.rowCount || 0}`,
                      duration: 5000,
                    });
                  } catch (error) {
                    showMessage.error(`获取记录数失败: ${error}`);
                  }
                  break;

                case 'getTimeRange':
                  // 获取时间范围
                  try {
                    const query = `SELECT MIN(time), MAX(time)
                                   FROM "${params.measurement}"`;
                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 跳转到查询页面显示时间范围
                    navigate('/query', {
                      state: {
                        query,
                        database: selectedDatabase,
                        description: `时间范围 - ${params.measurement}`,
                      },
                    });

                    toast.success('正在跳转到查询页面显示时间范围...');
                  } catch (error) {
                    showMessage.error(`获取时间范围失败: ${error}`);
                  }
                  break;

                case 'getFieldStats':
                  // 获取字段统计
                  try {
                    const fields = await safeTauriInvoke('get_field_keys', {
                      connection_id: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                    });

                    if (!Array.isArray(fields) || fields.length === 0) {
                      showMessage.success('该测量没有字段');
                      return;
                    }

                    // 为第一个字段生成统计查询
                    const firstField =
                      typeof fields[0] === 'string'
                        ? fields[0]
                        : fields[0].fieldKey;
                    const query = `SELECT MIN("${firstField}"), MAX("${firstField}"), MEAN("${firstField}")
                                   FROM "${params.measurement}"`;

                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 跳转到查询页面显示字段统计
                    navigate('/query', {
                      state: {
                        query,
                        database: selectedDatabase,
                        description: `字段统计 - ${params.measurement} (${firstField})`,
                      },
                    });

                    toast.success(`正在跳转到查询页面显示字段 "${firstField}" 的统计信息...`);
                  } catch (error) {
                    showMessage.error(`获取字段统计失败: ${error}`);
                  }
                  break;

                case 'getTagDistribution':
                  // 获取标签分布
                  try {
                    const tagKeys = await safeTauriInvoke('get_tag_keys', {
                      connectionId: activeConnectionId,
                      database: params.database,
                      measurement: params.measurement,
                    });

                    if (!Array.isArray(tagKeys) || tagKeys.length === 0) {
                      showMessage.success('该测量没有标签');
                      return;
                    }

                    // 获取第一个标签的分布
                    const firstTagKey = tagKeys[0];
                    const query = `SELECT COUNT(*)
                                   FROM "${params.measurement}"
                                   GROUP BY "${firstTagKey}"`;

                    const result = await safeTauriInvoke('execute_query', {
                      connection_id: activeConnectionId,
                      query,
                    });

                    // 跳转到查询页面显示标签分布
                    navigate('/query', {
                      state: {
                        query,
                        database: selectedDatabase,
                        description: `标签分布 - ${params.measurement} (${firstTagKey})`,
                      },
                    });

                    toast.success(`正在跳转到查询页面显示标签 "${firstTagKey}" 的分布统计...`);
                  } catch (error) {
                    showMessage.error(`获取标签分布失败: ${error}`);
                  }
                  break;

                case 'createChart':
                  // 跳转到可视化页面并预填充查询
                  const chartQuery = generateChartQuery(params);
                  navigate('/visualization', {
                    state: {
                      presetQuery: chartQuery,
                      database: params.database,
                      measurement: params.measurement,
                      chartType: params.chartType,
                    },
                  });
                  showMessage.success('正在跳转到可视化页面...');
                  break;

                case 'createFieldChart':
                  // 为字段创建图表
                  const fieldChartQuery = generateFieldChartQuery(params);
                  navigate('/visualization', {
                    state: {
                      presetQuery: fieldChartQuery,
                      database: params.database,
                      measurement: params.measurement,
                      field: params.field,
                      chartType: params.chartType,
                    },
                  });
                  showMessage.success('正在跳转到可视化页面...');
                  break;

                case 'createTagChart':
                  // 为标签创建图表
                  const tagChartQuery = generateTagChartQuery(params);
                  navigate('/visualization', {
                    state: {
                      presetQuery: tagChartQuery,
                      database: params.database,
                      measurement: params.measurement,
                      tagKey: params.tagKey,
                      chartType: params.chartType,
                    },
                  });
                  showMessage.success('正在跳转到可视化页面...');
                  break;

                case 'customChart':
                  // 跳转到可视化页面创建自定义图表
                  navigate('/visualization', {
                    state: {
                      database: params.database,
                      measurement: params.measurement,
                    },
                  });
                  showMessage.success('正在跳转到可视化页面...');
                  break;

                case 'exportData':
                  showMessage.info(
                    `导出测量 "${params.measurement}" 为 ${params.format} 格式功能开发中...`
                  );
                  break;

                case 'deleteMeasurement':
                  // 删除测量的逻辑将通过 Popconfirm 组件处理
                  setDeleteMeasurementParams(params);
                  break;

                default:
                  showMessage.info(`功能 "${action}" 开发中...`);
              }
            } catch (error) {
              showMessage.error(`操作失败: ${error}`);
            }
          };

          return (
            <ContextMenu
              open={contextMenu.visible}
              x={contextMenu.x}
              y={contextMenu.y}
              target={contextMenu.target}
              onClose={() =>
                setContextMenu({ visible: false, x: 0, y: 0, target: null })
              }
              onAction={handleContextMenuAction}
            />
          );
        }, [contextMenu, activeConnectionId, selectedDatabase])}

        {/* 创建数据库模态框 */}
        <Dialog open={createModalVisible} onOpenChange={setCreateModalVisible}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>创建数据库</DialogTitle>
              <DialogDescription>
                创建一个新的 InfluxDB 数据库
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(createDatabase)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{
                    required: '请输入数据库名称',
                    pattern: {
                      value: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
                      message: '数据库名称只能包含字母、数字和下划线，且不能以数字开头',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>数据库名称</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入数据库名称" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retentionPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>默认保留策略</FormLabel>
                      <FormControl>
                        <Input placeholder="例如: autogen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalVisible(false);
                  form.reset();
                }}
              >
                取消
              </Button>
              <Button onClick={() => form.handleSubmit(createDatabase)()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 保留策略管理对话框 */}
        <RetentionPolicyDialog
          visible={retentionPolicyDialog.visible}
          mode={retentionPolicyDialog.mode}
          policy={retentionPolicyDialog.policy}
          database={selectedDatabase}
          connectionId={activeConnectionId || ''}
          onClose={() =>
            setRetentionPolicyDialog({
              visible: false,
              mode: 'create',
              policy: undefined,
            })
          }
          onSuccess={() => {
            loadDatabaseDetails(selectedDatabase);
          }}
        />

        {/* 删除测量确认对话框 */}
        {deleteMeasurementParams && (
          <Dialog open={!!deleteMeasurementParams} onOpenChange={(open) => !open && setDeleteMeasurementParams(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除测量</DialogTitle>
                <DialogDescription>
                  确定要删除测量 "{deleteMeasurementParams.measurement}" 吗？此操作将删除所有相关数据！
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteMeasurementParams(null)}>
                  取消
                </Button>
                <Button variant="destructive" onClick={deleteMeasurement}>
                  删除
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Database;
