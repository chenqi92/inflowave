import React, { useState } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';
import { safeTauriInvoke } from '@/utils/tauri';

const { Title, Text } = Typography;

interface DebugInfo {
  connection_count: number;
  connections: any[];
  statuses: Record<string, any>;
  timestamp: string;
}

const ConnectionDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDebug = async () => {
    setLoading(true);
    try {
      const info = await invoke<DebugInfo>('debug_connection_manager');
      setDebugInfo(info);
      message.success('调试信息获取成功');
    } catch (error) {
      message.error(`获取调试信息失败: ${error}`);
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Title level={3}>连接管理器调试</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button 
          type="primary" 
          onClick={handleDebug}
          loading={loading}
        >
          获取调试信息
        </Button>

        {debugInfo && (
          <Card title="调试信息" size="small">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>连接数量: </Text>
                <Text>{debugInfo.connection_count}</Text>
              </div>
              
              <div>
                <Text strong>时间戳: </Text>
                <Text>{new Date(debugInfo.timestamp).toLocaleString()}</Text>
              </div>

              <div>
                <Text strong>连接配置:</Text>
                <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo.connections, null, 2)}
                </pre>
              </div>

              <div>
                <Text strong>连接状态:</Text>
                <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                  {JSON.stringify(debugInfo.statuses, null, 2)}
                </pre>
              </div>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default ConnectionDebug;
