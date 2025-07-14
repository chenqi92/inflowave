import React, {useState, useEffect, useCallback} from 'react';
import {
    Table,
    Button,
    Badge,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    Progress,
    Typography,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from '@/components/ui';
import type { Column } from '@/components/ui/Table';
import {
    Settings,
    Trash2,
    Edit,
    Eye,
    Wifi,
    Unlink,
    PlayCircle,
    PauseCircle,
    MoreHorizontal,
    RefreshCw,
    Plus
} from 'lucide-react';
import type {ConnectionConfig, ConnectionStatus} from '@/types';
import {useConnectionStore} from '@/store/connection';
import {safeTauriInvoke} from '@/utils/tauri';
import {showMessage} from '@/utils/message';
import './ConnectionManager.css';

interface ConnectionManagerProps {
    onConnectionSelect?: (connectionId: string) => void;
    onEditConnection?: (connection: ConnectionConfig) => void;
    onCreateConnection?: () => void;
}

interface ConnectionWithStatus extends ConnectionConfig {
    status?: ConnectionStatus;
    poolStats?: any;
}

interface ColumnType<T = any> {
    title: string;
    dataIndex?: string;
    key: string;
    width?: number | string;
    render?: (value: any, record: T, index: number) => React.ReactNode;
    ellipsis?: boolean;
}

const ConnectionManager: React.FC<ConnectionManagerProps> = ({onConnectionSelect, onEditConnection, onCreateConnection}) => {
    const {
        connections,
        connectionStatuses,
        activeConnectionId,
        monitoringActive,
        monitoringInterval,
        poolStats,
        connectToDatabase,
        disconnectFromDatabase,
        startMonitoring,
        stopMonitoring,
        refreshAllStatuses,
        refreshConnectionStatus,
        getPoolStats,
        removeConnection
    } = useConnectionStore();

    const [loading, setLoading] = useState(false);
    const [poolStatsModalVisible, setPoolStatsModalVisible] = useState(false);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

    // 自动刷新状态 - 仅在用户手动启动监控时执行
    useEffect(() => {
        if (!monitoringActive) return;

        const interval = setInterval(() => {
            console.log('🔄 执行定时状态刷新...');
            refreshAllStatuses();
        }, monitoringInterval * 1000);

        return () => {
            console.log('🚫 清理定时刷新间隔');
            clearInterval(interval);
        };
    }, [monitoringActive, monitoringInterval]); // 移除refreshAllStatuses依赖

    // 初始加载 - 移除自动刷新，由用户手动触发
    // useEffect(() => {
    //   refreshAllStatuses();
    // }, []); // 禁用自动刷新以减少网络请求

    // 处理连接操作
    const handleConnectionToggle = useCallback(async (connectionId: string) => {
        setLoading(true);
        try {
            // 首先确保连接配置存在
            const connection = connections.find(c => c.id === connectionId);
            if (!connection) {
                showMessage.error('连接配置不存在，请重新加载页面');
                return;
            }

            const status = connectionStatuses[connectionId];
            if (status?.status === 'connected') {
                await disconnectFromDatabase(connectionId);
                showMessage.success('连接已断开');
                // 只刷新当前连接的状态
                await refreshConnectionStatus(connectionId);
            } else {
                try {
                    await connectToDatabase(connectionId);
                    showMessage.success('连接成功');
                    onConnectionSelect?.(connectionId);
                    // 只刷新当前连接的状态
                    await refreshConnectionStatus(connectionId);
                } catch (connectError) {
                    // 连接失败时记录详细错误信息并刷新状态以显示错误
                    console.error('连接失败:', connectError);
                    const errorMessage = String(connectError).replace('Error: ', '');
                    showMessage.error(`连接失败: ${errorMessage}`);
                    // 刷新单个连接状态以确保错误信息正确显示
                    try {
                        await refreshConnectionStatus(connectionId);
                    } catch (refreshError) {
                        console.warn('刷新连接状态失败:', refreshError);
                    }
                }
            }
        } catch (error) {
            console.error('连接操作失败:', error);
            const errorMessage = String(error).replace('Error: ', '');
            showMessage.error(`连接操作失败: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, [connections, connectionStatuses, connectToDatabase, disconnectFromDatabase, onConnectionSelect, refreshConnectionStatus]);

    // 处理监控切换
    const handleMonitoringToggle = useCallback(async () => {
        try {
            if (monitoringActive) {
                await stopMonitoring();
                showMessage.success('🛑 连接监控已停止');
            } else {
                await startMonitoring(30); // 30秒间隔监控
                showMessage.success('🟢 连接监控已启动，每30秒检查一次连接状态');
                // 立即执行一次状态刷新
                setTimeout(() => {
                    refreshAllStatuses();
                }, 1000);
            }
        } catch (error) {
            showMessage.error(`监控操作失败: ${error}`);
        }
    }, [monitoringActive, startMonitoring, stopMonitoring, refreshAllStatuses]);

    // 查看连接池统计
    const handleViewPoolStats = useCallback(async (connectionId: string) => {
        try {
            await getPoolStats(connectionId);
            setSelectedConnectionId(connectionId);
            setPoolStatsModalVisible(true);
        } catch (error) {
            showMessage.error(`获取连接池统计失败: ${error}`);
        }
    }, [getPoolStats]);

    // 获取状态标签
    const getStatusTag = (status?: ConnectionStatus) => {
        // 如果没有状态信息，显示默认的断开状态而不是"未知"
        const actualStatus = status || {
            id: '',
            status: 'disconnected' as const,
            error: undefined,
            lastConnected: undefined,
            latency: undefined
        };

        const statusConfig = {
            connected: {variant: 'default', text: '已连接', className: 'bg-green-100 text-green-800 border-green-200'},
            disconnected: {variant: 'secondary', text: '已断开', className: 'bg-gray-100 text-gray-800 border-gray-200'},
            connecting: {variant: 'default', text: '连接中', className: 'bg-yellow-100 text-yellow-800 border-yellow-200'},
            error: {variant: 'destructive', text: '错误', className: 'bg-red-100 text-red-800 border-red-200'}
        };

        const config = statusConfig[actualStatus.status] || statusConfig.disconnected;

        // 构建tooltip内容
        let tooltipContent = '';
        if (actualStatus.error) {
            tooltipContent = `错误详情: ${actualStatus.error}`;
        } else if (actualStatus.latency && actualStatus.status === 'connected') {
            tooltipContent = `连接正常，延迟: ${actualStatus.latency}ms`;
        } else if (actualStatus.status === 'connecting') {
            tooltipContent = '正在尝试连接到数据库...';
        } else if (actualStatus.status === 'connected') {
            tooltipContent = '连接正常';
        } else {
            tooltipContent = '连接已断开';
        }

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <Badge variant={config.variant as any} className={config.className}>
                        {config.text}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="max-w-xs">
                        <p className="text-sm">{tooltipContent}</p>
                        {actualStatus.lastConnected && (
                            <p className="text-xs text-muted-foreground mt-1">
                                最后连接: {new Date(actualStatus.lastConnected).toLocaleString()}
                            </p>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        );
    };

    // 表格列定义
    const columns: Column[] = [
        {
            title: '连接名称',
            dataIndex: 'name',
            key: 'name',
            width: 280,
            render: (name: string, record) => (
                <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                        connectionStatuses[record.id!]?.status === 'connected' ? 'bg-green-500' :
                            connectionStatuses[record.id!]?.status === 'error' ? 'bg-red-500' :
                                connectionStatuses[record.id!]?.status === 'connecting' ? 'bg-yellow-500' : 'bg-gray-300'
                    }`}/>
                    <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{name}</div>
                        <div className="text-sm text-muted-foreground truncate">{record.host}:{record.port}</div>
                    </div>
                    {activeConnectionId === record.id && (
                        <Badge className="ml-2 flex-shrink-0 bg-blue-100 text-blue-700 border-blue-200">活跃</Badge>
                    )}
                </div>
            )
        },
        {
            title: '连接信息',
            key: 'connectionInfo',
            width: 200,
            render: (_, record) => (
                <div className="space-y-1">
                    <div className="text-sm">
                        <span className="text-muted-foreground">用户：</span>
                        <span className="text-foreground font-medium">{record.username || '无'}</span>
                    </div>
                    <div className="text-sm">
                        <span className="text-muted-foreground">SSL：</span>
                        <span className={record.ssl ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
              {record.ssl ? '已启用' : '未启用'}
            </span>
                    </div>
                </div>
            )
        },
        {
            title: '状态',
            key: 'status',
            width: 120,
            render: (_, record) => {
                const status = connectionStatuses[record.id!];
                return (
                    <div className="space-y-1">
                        {getStatusTag(status)}
                        {status?.latency && (
                            <div className="text-xs text-muted-foreground">
                                延迟: {status.latency}ms
                            </div>
                        )}
                    </div>
                );
            }
        },
        {
            title: '最后连接',
            key: 'lastConnected',
            width: 160,
            render: (_, record) => {
                const status = connectionStatuses[record.id!];
                return status?.lastConnected ? (
                    <div className="text-sm text-muted-foreground">
                        {new Date(status.lastConnected).toLocaleString()}
                    </div>
                ) : (
                    <span className="text-muted-foreground">从未连接</span>
                );
            }
        },
        {
            title: '操作',
            key: 'actions',
            width: 300,
            render: (_, record) => {
                const status = connectionStatuses[record.id!];
                const isConnected = status?.status === 'connected';

                return (
                    <div className="flex items-center space-x-2">
                        <Button
                            variant={isConnected ? 'outline' : 'default'}
                            size="sm"
                            disabled={loading}
                            onClick={() => handleConnectionToggle(record.id!)}
                            className={isConnected ? 'text-red-600 hover:text-red-700 hover:border-red-300' : 'bg-green-600 hover:bg-green-700 text-white'}
                        >
                            {isConnected ? <Unlink className="w-4 h-4 mr-1"/> : <Wifi className="w-4 h-4 mr-1"/>}
                            {isConnected ? '断开' : '连接'}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                console.log('编辑连接:', record);
                                onEditConnection?.(record);
                            }}
                        >
                            <Edit className="w-4 h-4 mr-1"/>
                            编辑
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <MoreHorizontal className="w-4 h-4 mr-1"/>
                                    更多
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem
                                    disabled={!isConnected}
                                    onClick={() => handleViewPoolStats(record.id!)}
                                >
                                    <Eye className="w-4 h-4 mr-2"/>
                                    连接池统计
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => {
                                        if (window.confirm(`确定要删除连接 "${record.name}" 吗？此操作无法撤销。`)) {
                                            removeConnection(record.id!);
                                        }
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    删除连接
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            }
        },
    ];

    // 合并连接数据和状态
    const dataSource: ConnectionWithStatus[] = connections.map(conn => ({
        ...conn,
        status: connectionStatuses[conn.id!],
        poolStats: poolStats[conn.id!]
    }));

    return (
        <div className="h-full flex flex-col">
            {/* 统计信息和工具栏 */}
            <div className="border-b">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">连接管理</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                onClick={() => onCreateConnection?.()}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-1"/>
                                新建连接
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    console.log('🔄 手动刷新连接状态');
                                    refreshAllStatuses();
                                }}
                                size="sm"
                            >
                                <RefreshCw className="w-4 h-4 mr-1"/>
                                刷新状态
                            </Button>
                            <Button
                                variant={monitoringActive ? 'destructive' : 'default'}
                                onClick={handleMonitoringToggle}
                                size="sm"
                                className={monitoringActive ? 'bg-red-100 border-red-300 text-red-700 hover:bg-red-200' : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'}
                            >
                                {monitoringActive ? (
                                    <>
                                        <PauseCircle className="w-4 h-4 mr-1"/>
                                        停止监控
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="w-4 h-4 mr-1"/>
                                        启动监控
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                            <Settings className="w-4 h-4 text-muted-foreground"/>
                            <div className="text-sm">
                                <p className="text-muted-foreground">总连接</p>
                                <p className="font-semibold">{connections.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                            <Wifi className="w-4 h-4 text-green-600"/>
                            <div className="text-sm">
                                <p className="text-muted-foreground">已连接</p>
                                <p className="font-semibold text-green-600">
                                    {Object.values(connectionStatuses).filter(s => s.status === 'connected').length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                            <div
                                className={`w-4 h-4 rounded-full ${monitoringActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}/>
                            <div className="text-sm">
                                <p className="text-muted-foreground">监控状态</p>
                                <p className={`font-semibold ${monitoringActive ? 'text-green-600' : 'text-gray-600'}`}>
                                    {monitoringActive ? '运行中' : '已停止'}
                                </p>
                                {monitoringActive && (
                                    <p className="text-xs text-green-500">自动检查连接状态</p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                            <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center">
                                <span className="text-xs text-blue-600 font-medium">{monitoringInterval}</span>
                            </div>
                            <div className="text-sm">
                                <p className="text-muted-foreground">监控间隔</p>
                                <p className="font-semibold">{monitoringInterval}秒</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 连接表格 */}
            <div className="flex-1 overflow-hidden p-4">
                <div className="h-full rounded-lg border">
                    <Table
                        columns={columns}
                        dataSource={dataSource}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                            size: 'default'
                        }}
                        loading={loading}
                        scroll={{
                            x: 'max-content',
                            y: 'calc(100vh - 400px)'
                        }}
                        size="default"
                        className="w-full h-full"
                        rowClassName={(record) =>
                            activeConnectionId === record.id
                                ? 'bg-blue-50'
                                : 'hover:bg-muted/50'
                        }
                    />
                </div>
            </div>

            {/* 连接池统计模态框 */}
            <Dialog open={poolStatsModalVisible} onOpenChange={setPoolStatsModalVisible}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>连接池统计信息</DialogTitle>
                    </DialogHeader>
                    {selectedConnectionId && poolStats[selectedConnectionId] && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="p-4">
                                        <div className="text-sm text-muted-foreground">总连接数</div>
                                        <div className="text-2xl font-bold">
                                            {poolStats[selectedConnectionId].total_connections}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="p-4">
                                        <div className="text-sm text-muted-foreground">活跃连接数</div>
                                        <div className="text-2xl font-bold text-green-600">
                                            {poolStats[selectedConnectionId].active_connections}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="p-4">
                                        <div className="text-sm text-muted-foreground">空闲连接数</div>
                                        <div className="text-2xl font-bold">
                                            {poolStats[selectedConnectionId].idle_connections}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="p-4">
                                        <div className="text-sm text-muted-foreground">最大连接数</div>
                                        <div className="text-2xl font-bold">
                                            {poolStats[selectedConnectionId].max_connections}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <Typography.Title level={4}>连接池使用率</Typography.Title>
                                <Progress
                                    value={Math.round(
                                        (poolStats[selectedConnectionId].active_connections /
                                            poolStats[selectedConnectionId].max_connections) * 100
                                    )}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ConnectionManager;
