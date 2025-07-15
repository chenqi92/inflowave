import React, {useState, useEffect} from 'react';
import {
    Button,
    Table,
    Alert,
    AlertTitle,
    AlertDescription,
    Text,
    Paragraph,
    Collapse,
    Panel
} from '@/components/ui';
import {Bug, RefreshCw, Info, Activity, Database, Wifi, AlertTriangle, XCircle} from 'lucide-react';
import {useConnectionStore} from '@/store/connection';
import {safeTauriInvoke} from '@/utils/tauri';

interface DebugInfo {
    frontendConnections: any[];
    backendConnections: any[];
    connectionStatuses: any;
    activeconnection_id: string | null;
    backendDebugInfo?: any;
}

const ConnectionDebugPanel: React.FC = () => {
    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const [loading, setLoading] = useState(false);
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

    const {
        connections,
        connectionStatuses,
        activeconnection_id,
        monitoringActive,
        monitoringInterval
    } = useConnectionStore();

    // 自动刷新调试信息
    useEffect(() => {
        if (autoRefreshEnabled && debugInfo) {
            const interval = setInterval(() => {
                collectDebugInfo();
            }, 10000); // 每10秒刷新一次
            return () => clearInterval(interval);
        }
    }, [autoRefreshEnabled, debugInfo]);

    // 初始化时自动收集一次调试信息
    useEffect(() => {
        collectDebugInfo();
    }, []);

    const collectDebugInfo = async () => {
        setLoading(true);
        try {
            // 获取后端连接信息
            const backendConnections = await safeTauriInvoke<any[]>('get_connections');
            const backendDebugInfo = await safeTauriInvoke<any>('debug_connection_manager');

            const info: DebugInfo = {
                frontendConnections: (connections || []).filter(conn => conn != null),
                backendConnections: (backendConnections || []).filter(conn => conn != null),
                connectionStatuses: connectionStatuses || {},
                activeconnection_id,
                backendDebugInfo
            };

            setDebugInfo(info);
        } catch (error) {
            console.error('收集调试信息失败:', error);
            // Set empty debug info on error to prevent undefined access
            setDebugInfo({
                frontendConnections: [],
                backendConnections: [],
                connectionStatuses: {},
                activeconnection_id: null,
                backendDebugInfo: null
            });
        } finally {
            setLoading(false);
        }
    };

    const findMismatchedConnections = () => {
        if (!debugInfo) return [];

        const mismatched = [];
        const frontendIds = new Set(debugInfo.frontendConnections.map(c => c.id));
        const backendIds = new Set(debugInfo.backendConnections.map(c => c.id));

        // 前端有但后端没有的连接
        for (const id of frontendIds) {
            if (!backendIds.has(id)) {
                mismatched.push({
                    id,
                    type: 'frontend_only',
                    description: '前端存在但后端缺失'
                });
            }
        }

        // 后端有但前端没有的连接
        for (const id of backendIds) {
            if (!frontendIds.has(id)) {
                mismatched.push({
                    id,
                    type: 'backend_only',
                    description: '后端存在但前端缺失'
                });
            }
        }

        return mismatched;
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: '25%',
            ellipsis: true,
            render: (id: string) => <Text code className="text-xs">{id || '-'}</Text>
        },
        {
            title: '名称',
            dataIndex: 'name',
            key: 'name',
            width: '20%',
            ellipsis: true
        },
        {
            title: '主机:端口',
            key: 'hostPort',
            width: '20%',
            render: (value: any, record: any) => record ? `${record.host}:${record.port}` : '-'
        },
        {
            title: '用户名',
            dataIndex: 'username',
            key: 'username',
            width: '15%',
            ellipsis: true
        },
        {
            title: '状态',
            key: 'status',
            width: '20%',
            render: (value: any, record: any) => {
                if (!record) return <span className="text-muted-foreground">未知</span>;
                const status = debugInfo?.connectionStatuses[record.id];
                return status ? (
                    <span className={status.status === 'connected' ? 'text-success' : 'text-muted-foreground'}>
            {status.status}
          </span>
                ) : (
                    <span className="text-muted-foreground">未知</span>
                );
            }
        }
    ];

    const mismatchedConnections = findMismatchedConnections();

    return (
        <div className="space-y-4">
            {/* 监控状态概览 */}
            <div>
                <div className="pb-3">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                        <Activity className="w-4 h-4"/>
                        实时监控状态
                    </h3>
                </div>
                <div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                            <Database className="w-5 h-5 text-blue-600"/>
                            <div>
                                <p className="text-sm text-blue-800 font-medium">总连接数</p>
                                <p className="text-2xl font-bold text-blue-600">{connections.length}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <Wifi className="w-5 h-5 text-green-600"/>
                            <div>
                                <p className="text-sm text-green-800 font-medium">已连接</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {Object.values(connectionStatuses).filter(s => s.status === 'connected').length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                            <Bug className="w-5 h-5 text-orange-600"/>
                            <div>
                                <p className="text-sm text-orange-800 font-medium">错误连接</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {Object.values(connectionStatuses).filter(s => s.status === 'error').length}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                            <div
                                className={`w-3 h-3 rounded-full ${monitoringActive ? 'bg-success animate-pulse' : 'bg-muted'}`}/>
                            <div>
                                <p className="text-sm text-purple-800 font-medium">监控状态</p>
                                <p className="text-sm font-bold text-purple-600">
                                    {monitoringActive ? `运行中 (${monitoringInterval}s)` : '已停止'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 调试信息面板 */}
            <div>
                <div className="pb-3">
                    <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <Bug className="w-4 h-4"/>
                            连接调试面板
                        </h3>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                                className={autoRefreshEnabled ? 'bg-green-50 border-green-200 text-green-700' : ''}
                            >
                                {autoRefreshEnabled ? '停止自动刷新' : '启用自动刷新'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={collectDebugInfo}
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`}/>
                                收集调试信息
                            </Button>
                        </div>
                    </div>
                </div>
                <div>
                    {!debugInfo ? (
                        <div className="text-center py-8">
                            <Info className="w-8 h-8 text-muted-foreground mb-4 mx-auto"/>
                            <Text className="text-muted-foreground mb-4">
                                正在加载调试信息...
                            </Text>
                            {loading && (
                                <div className="flex items-center justify-center gap-2">
                                    <RefreshCw className="w-4 h-4 animate-spin"/>
                                    <span className="text-sm">正在收集数据...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Collapse defaultActiveKey={mismatchedConnections.length > 0 ? ['mismatch'] : ['summary']}>
                            <Panel header="问题摘要" key="summary">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-primary">
                                                {debugInfo.frontendConnections.length}
                                            </div>
                                            <div className="text-sm text-blue-800">前端连接数</div>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-success">
                                                {debugInfo.backendConnections.length}
                                            </div>
                                            <div className="text-sm text-green-800">后端连接数</div>
                                        </div>
                                        <div className="bg-purple-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {Object.keys(debugInfo.connectionStatuses).length}
                                            </div>
                                            <div className="text-sm text-purple-800">状态记录数</div>
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-lg">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {mismatchedConnections.length}
                                            </div>
                                            <div className="text-sm text-orange-800">不匹配连接</div>
                                        </div>
                                    </div>

                                    {debugInfo.activeconnection_id && (
                                        <Alert>
                                            <Info className="h-4 w-4"/>
                                            <AlertTitle>活跃连接</AlertTitle>
                                            <AlertDescription>
                                                <Text code>{debugInfo.activeconnection_id}</Text>
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            </Panel>

                            {mismatchedConnections.length > 0 && (
                                <Panel header={`连接不匹配 (${mismatchedConnections.length})`} key="mismatch">
                                    <Alert className="mb-4">
                                        <AlertTriangle className="h-4 w-4"/>
                                        <AlertTitle>发现连接不同步问题</AlertTitle>
                                        <AlertDescription>前端和后端的连接配置不一致，这可能导致连接错误</AlertDescription>
                                    </Alert>
                                    <div className="space-y-2">
                                        {mismatchedConnections.map((item, index) => (
                                            <Alert key={index} variant="destructive">
                                                <XCircle className="h-4 w-4"/>
                                                <AlertTitle>连接 ID: {item.id}</AlertTitle>
                                                <AlertDescription>{item.description}</AlertDescription>
                                            </Alert>
                                        ))}
                                    </div>
                                </Panel>
                            )}

                            <Panel header="前端连接列表" key="frontend">
                                <div className="overflow-auto">
                                    <Table
                                        columns={columns}
                                        dataSource={debugInfo.frontendConnections || []}
                                        rowKey={(record) => record?.id || Math.random().toString()}
                                        pagination={false}
                                        size="small"
                                        scroll={{x: '100%'}}
                                        className="w-full"
                                    />
                                </div>
                            </Panel>

                            <Panel header="后端连接列表" key="backend">
                                <div className="overflow-auto">
                                    <Table
                                        columns={columns}
                                        dataSource={debugInfo.backendConnections || []}
                                        rowKey={(record) => record?.id || Math.random().toString()}
                                        pagination={false}
                                        size="small"
                                        scroll={{x: '100%'}}
                                        className="w-full"
                                    />
                                </div>
                            </Panel>

                            {debugInfo.backendDebugInfo && (
                                <Panel header="后端调试信息" key="backendDebug">
                                    <Paragraph>
                    <pre className="bg-muted/50 p-4 rounded overflow-auto text-xs">
                      {JSON.stringify(debugInfo.backendDebugInfo, null, 2)}
                    </pre>
                                    </Paragraph>
                                </Panel>
                            )}
                        </Collapse>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectionDebugPanel;