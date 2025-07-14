import React, { useState } from 'react';
import { Button, Title, Text } from '@/components/ui';
import { Card, CardHeader, CardTitle, CardContent, Space, toast } from '@/components/ui';

import { safeTauriInvoke } from '@/utils/tauri';

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
      const info = await safeTauriInvoke<DebugInfo>('debug_connection_manager');
      setDebugInfo(info);
      toast({ title: "成功", description: "调试信息获取成功" });
    } catch (error) {
      toast({ title: "错误", description: `获取调试信息失败: ${error}`, variant: "destructive" });
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Title level={3}>连接管理器调试</Title>

      <div className="flex flex-col gap-4 w-full">
        <Button
          variant="default"
          onClick={handleDebug}
          disabled={loading}
        >
          获取调试信息
        </Button>

        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle>调试信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 w-full">
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
                  <pre className="bg-muted p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo.connections, null, 2)}
                  </pre>
                </div>

                <div>
                  <Text strong>连接状态:</Text>
                  <pre className="bg-muted p-2 rounded mt-2 text-xs overflow-auto max-h-40">
                    {JSON.stringify(debugInfo.statuses, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ConnectionDebug;
