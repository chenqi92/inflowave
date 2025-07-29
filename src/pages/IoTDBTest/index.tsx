/**
 * IoTDB 测试页面
 * 
 * 用于测试 IoTDB 驱动实现的功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Alert,
  AlertDescription,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import {
  TreePine,
  Database,
  Play,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';
import { showMessage } from '@/utils/message';
import type { QueryResult } from '@/types';

const IoTDBTestPage: React.FC = () => {
  // Store hooks
  const { connections, activeConnectionId } = useConnectionStore();

  // State
  const [storageGroups, setStorageGroups] = useState<string[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [timeseries, setTimeseries] = useState<string[]>([]);
  const [selectedStorageGroup, setSelectedStorageGroup] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testQuery, setTestQuery] = useState('SHOW STORAGE GROUP');
  const [serverInfo, setServerInfo] = useState<any>(null);

  // 获取当前连接
  const currentConnection = connections.find(conn => conn.id === activeConnectionId);
  const isIoTDBConnection = currentConnection?.dbType === 'iotdb';

  // 加载存储组列表
  const loadStorageGroups = async () => {
    if (!activeConnectionId || !isIoTDBConnection) return;

    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_iotdb_storage_groups', {
        connectionId: activeConnectionId,
      });
      setStorageGroups(result);
      showMessage.success(`加载了 ${result.length} 个存储组`);
    } catch (error) {
      console.error('加载存储组失败:', error);
      showMessage.error(`加载存储组失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载设备列表
  const loadDevices = async (storageGroup: string) => {
    if (!activeConnectionId || !isIoTDBConnection || !storageGroup) return;

    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_iotdb_devices', {
        connectionId: activeConnectionId,
        storageGroup,
      });
      setDevices(result);
      showMessage.success(`加载了 ${result.length} 个设备`);
    } catch (error) {
      console.error('加载设备失败:', error);
      showMessage.error(`加载设备失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 加载时间序列列表
  const loadTimeseries = async (storageGroup: string, device: string) => {
    if (!activeConnectionId || !isIoTDBConnection || !storageGroup || !device) return;

    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_iotdb_timeseries', {
        connectionId: activeConnectionId,
        storageGroup,
        device,
      });
      setTimeseries(result);
      showMessage.success(`加载了 ${result.length} 个时间序列`);
    } catch (error) {
      console.error('加载时间序列失败:', error);
      showMessage.error(`加载时间序列失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行查询
  const executeQuery = async () => {
    if (!activeConnectionId || !isIoTDBConnection || !testQuery.trim()) return;

    setLoading(true);
    try {
      const result = await safeTauriInvoke('execute_iotdb_query', {
        connectionId: activeConnectionId,
        query: testQuery.trim(),
        storageGroup: selectedStorageGroup || null,
      });
      setQueryResult(result);
      showMessage.success(`查询执行成功，耗时 ${result.executionTime || 0}ms`);
    } catch (error) {
      console.error('查询执行失败:', error);
      showMessage.error(`查询执行失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取服务器信息
  const loadServerInfo = async () => {
    if (!activeConnectionId || !isIoTDBConnection) return;

    setLoading(true);
    try {
      const result = await safeTauriInvoke('get_iotdb_server_info', {
        connectionId: activeConnectionId,
      });
      setServerInfo(result);
      showMessage.success('服务器信息加载成功');
    } catch (error) {
      console.error('加载服务器信息失败:', error);
      showMessage.error(`加载服务器信息失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 创建存储组
  const createStorageGroup = async () => {
    const sgName = prompt('请输入存储组名称 (例如: root.test):');
    if (!sgName || !activeConnectionId || !isIoTDBConnection) return;

    setLoading(true);
    try {
      await safeTauriInvoke('create_iotdb_storage_group', {
        connectionId: activeConnectionId,
        storageGroup: sgName,
        ttl: null,
      });
      showMessage.success(`存储组 '${sgName}' 创建成功`);
      await loadStorageGroups();
    } catch (error) {
      console.error('创建存储组失败:', error);
      showMessage.error(`创建存储组失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 删除存储组
  const deleteStorageGroup = async (storageGroup: string) => {
    if (!confirm(`确定要删除存储组 '${storageGroup}' 吗？此操作不可撤销。`)) return;
    if (!activeConnectionId || !isIoTDBConnection) return;

    setLoading(true);
    try {
      await safeTauriInvoke('delete_iotdb_storage_group', {
        connectionId: activeConnectionId,
        storageGroup,
      });
      showMessage.success(`存储组 '${storageGroup}' 删除成功`);
      await loadStorageGroups();
      if (selectedStorageGroup === storageGroup) {
        setSelectedStorageGroup('');
        setDevices([]);
        setTimeseries([]);
      }
    } catch (error) {
      console.error('删除存储组失败:', error);
      showMessage.error(`删除存储组失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 初始化
  useEffect(() => {
    if (isIoTDBConnection) {
      loadStorageGroups();
      loadServerInfo();
    }
  }, [activeConnectionId, isIoTDBConnection]);

  // 存储组变化时加载设备
  useEffect(() => {
    if (selectedStorageGroup) {
      loadDevices(selectedStorageGroup);
    } else {
      setDevices([]);
      setTimeseries([]);
    }
  }, [selectedStorageGroup]);

  // 设备变化时加载时间序列
  useEffect(() => {
    if (selectedStorageGroup && selectedDevice) {
      loadTimeseries(selectedStorageGroup, selectedDevice);
    } else {
      setTimeseries([]);
    }
  }, [selectedStorageGroup, selectedDevice]);

  if (!currentConnection) {
    return (
      <div className="p-4">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            请先创建并连接到数据库以使用 IoTDB 测试功能。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isIoTDBConnection) {
    return (
      <div className="p-4">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            当前连接不是 IoTDB 类型。请切换到 IoTDB 连接以使用此测试页面。
            <br />
            当前连接: {currentConnection.name} ({currentConnection.dbType?.toUpperCase()})
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* 页面标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TreePine className="w-6 h-6 text-green-500" />
            <span>IoTDB 驱动测试</span>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              {currentConnection.name}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            测试 IoTDB 驱动的各项功能，包括存储组管理、设备查询、时间序列操作等。
          </p>
        </CardContent>
      </Card>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="browser" className="h-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browser">数据浏览</TabsTrigger>
            <TabsTrigger value="query">查询测试</TabsTrigger>
            <TabsTrigger value="management">管理操作</TabsTrigger>
            <TabsTrigger value="info">服务器信息</TabsTrigger>
          </TabsList>

          {/* 数据浏览标签页 */}
          <TabsContent value="browser" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 存储组列表 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">存储组</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadStorageGroups}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {storageGroups.map((sg) => (
                      <div
                        key={sg}
                        className={`p-2 rounded cursor-pointer border ${
                          selectedStorageGroup === sg
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedStorageGroup(sg)}
                      >
                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4" />
                          <span className="text-sm font-mono">{sg}</span>
                        </div>
                      </div>
                    ))}
                    {storageGroups.length === 0 && !loading && (
                      <div className="text-center text-muted-foreground py-4">
                        没有找到存储组
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 设备列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">设备</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {devices.map((device) => (
                      <div
                        key={device}
                        className={`p-2 rounded cursor-pointer border ${
                          selectedDevice === device
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedDevice(device)}
                      >
                        <div className="flex items-center space-x-2">
                          <TreePine className="w-4 h-4" />
                          <span className="text-sm font-mono">{device}</span>
                        </div>
                      </div>
                    ))}
                    {devices.length === 0 && selectedStorageGroup && !loading && (
                      <div className="text-center text-muted-foreground py-4">
                        没有找到设备
                      </div>
                    )}
                    {!selectedStorageGroup && (
                      <div className="text-center text-muted-foreground py-4">
                        请先选择存储组
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 时间序列列表 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">时间序列</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {timeseries.map((ts) => (
                      <div
                        key={ts}
                        className="p-2 rounded border hover:bg-muted/50"
                      >
                        <div className="flex items-center space-x-2">
                          <TreePine className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-mono">{ts}</span>
                        </div>
                      </div>
                    ))}
                    {timeseries.length === 0 && selectedDevice && !loading && (
                      <div className="text-center text-muted-foreground py-4">
                        没有找到时间序列
                      </div>
                    )}
                    {!selectedDevice && (
                      <div className="text-center text-muted-foreground py-4">
                        请先选择设备
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 查询测试标签页 */}
          <TabsContent value="query" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>SQL 查询测试</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="输入 IoTDB SQL 查询..."
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={executeQuery}
                    disabled={loading || !testQuery.trim()}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    执行
                  </Button>
                </div>

                {/* 常用查询按钮 */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestQuery('SHOW STORAGE GROUP')}
                  >
                    显示存储组
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestQuery('SHOW DEVICES')}
                  >
                    显示设备
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestQuery('SHOW TIMESERIES')}
                  >
                    显示时间序列
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTestQuery('SHOW VERSION')}
                  >
                    显示版本
                  </Button>
                </div>

                {/* 查询结果 */}
                {queryResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">查询结果</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>执行时间: {queryResult.executionTime || 0}ms</span>
                          <span>行数: {queryResult.rowCount || 0}</span>
                        </div>
                        <pre className="bg-muted/50 p-4 rounded-md max-h-96 overflow-auto text-sm font-mono">
                          {JSON.stringify(queryResult, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 管理操作标签页 */}
          <TabsContent value="management" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>存储组管理</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button onClick={createStorageGroup} disabled={loading}>
                    <Plus className="w-4 h-4 mr-2" />
                    创建存储组
                  </Button>
                  <Button
                    variant="outline"
                    onClick={loadStorageGroups}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    刷新列表
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>存储组名称</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storageGroups.map((sg) => (
                      <TableRow key={sg}>
                        <TableCell className="font-mono">{sg}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteStorageGroup(sg)}
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 服务器信息标签页 */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>服务器信息</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadServerInfo}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {serverInfo ? (
                  <pre className="bg-muted/50 p-4 rounded-md overflow-auto text-sm font-mono">
                    {JSON.stringify(serverInfo, null, 2)}
                  </pre>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    点击刷新按钮加载服务器信息
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default IoTDBTestPage;
