import React, { useState } from 'react';
import { Button, Table, Alert, Typography, Collapse, Panel } from '@/components/ui';
import { Card, Space } from '@/components/ui';
import { Bug, RefreshCw, Info } from 'lucide-react';
import { useConnectionStore } from '@/store/connection';
import { safeTauriInvoke } from '@/utils/tauri';

const { Text, Paragraph } = Typography;

interface DebugInfo {
  frontendConnections: any[];
  backendConnections: any[];
  connectionStatuses: any;
  activeConnectionId: string | null;
  backendDebugInfo?: any;
}

const ConnectionDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { connections, connectionStatuses, activeConnectionId } = useConnectionStore();

  const collectDebugInfo = async () => {
    setLoading(true);
    try {
      // 获取后端连接信息
      const backendConnections = await safeTauriInvoke<any[]>('get_connections');
      const backendDebugInfo = await safeTauriInvoke<any>('debug_connection_manager');
      
      const info: DebugInfo = {
        frontendConnections: connections,
        backendConnections: backendConnections || [],
        connectionStatuses,
        activeConnectionId,
        backendDebugInfo};
      
      setDebugInfo(info);
    } catch (error) {
      console.error('收集调试信息失败:', error);
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
      render: (id: string) => <Text code className="text-xs">{id}</Text>
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
      render: (record: any) => `${record.host}:${record.port}`
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
      render: (record: any) => {
        const status = debugInfo?.connectionStatuses[record.id];
        return status ? (
          <span className={status.status === 'connected' ? 'text-success' : 'text-muted-foreground'}>
            {status.status}
          </span>
        ) : (
          <span className="text-gray-400">未知</span>
        );
      }
    }
  ];

  const mismatchedConnections = findMismatchedConnections();

  return (
    <Card 
      title={
        <div className="flex gap-2">
          <Bug className="w-4 h-4"  />
          连接调试面板
        </div>
      }
      extra={
        <Button 
          icon={<RefreshCw className="w-4 h-4"  />} 
          onClick={collectDebugInfo}
          disabled={loading}
          type="primary"
        >
          收集调试信息
        </Button>
      }
    >
      {!debugInfo ? (
        <div className="text-center py-8">
          <Info className="w-4 h-4 text-4xl text-gray-400 mb-4"   />
          <Typography.Text className="text-muted-foreground">点击"收集调试信息"开始诊断连接问题</Typography.Text>
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
              
              {debugInfo.activeConnectionId && (
                <Alert
                  message="活跃连接"
                  description={
                    <Text code>{debugInfo.activeConnectionId}</Text>
                  }
                  type="info"
                  showIcon
                />
              )}
            </div>
          </Panel>

          {mismatchedConnections.length > 0 && (
            <Panel header={`连接不匹配 (${mismatchedConnections.length})`} key="mismatch">
              <Alert
                message="发现连接不同步问题"
                description="前端和后端的连接配置不一致，这可能导致连接错误"
                type="warning"
                showIcon
                className="mb-4"
              />
              <div className="space-y-2">
                {mismatchedConnections.map((item, index) => (
                  <Alert
                    key={index}
                    message={`连接 ID: ${item.id}`}
                    description={item.description}
                    type="error"
                    showIcon
                  />
                ))}
              </div>
            </Panel>
          )}

          <Panel header="前端连接列表" key="frontend">
            <div className="overflow-auto">
              <Table
                columns={columns}
                dataSource={debugInfo.frontendConnections}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: '100%' }}
                className="w-full"
              />
            </div>
          </Panel>

          <Panel header="后端连接列表" key="backend">
            <div className="overflow-auto">
              <Table
                columns={columns}
                dataSource={debugInfo.backendConnections}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ x: '100%' }}
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
    </Card>
  );
};

export default ConnectionDebugPanel;