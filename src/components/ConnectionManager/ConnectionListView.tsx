import React from 'react';
import { Card, Button, Tag, Space, Avatar, Tooltip } from '@/components/ui';
import { 
  WifiOutlined, 
  DisconnectOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  MoreOutlined,
  DatabaseOutlined,
  CheckCircleOutlined
} from '@/components/ui';
import type { ConnectionConfig, ConnectionStatus } from '@/types';

interface ConnectionListViewProps {
  connections: ConnectionConfig[];
  connectionStatuses: Record<string, ConnectionStatus>;
  activeConnectionId: string | null;
  loading: boolean;
  onConnect: (connectionId: string) => void;
  onEdit: (connection: ConnectionConfig) => void;
  onDelete: (connectionId: string) => void;
}

const ConnectionListView: React.FC<ConnectionListViewProps> = ({
  connections,
  connectionStatuses,
  activeConnectionId,
  loading,
  onConnect,
  onEdit,
  onDelete,
}) => {
  const getStatusColor = (status?: ConnectionStatus) => {
    if (!status) return 'default';
    switch (status.status) {
      case 'connected': return 'success';
      case 'connecting': return 'processing';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status?: ConnectionStatus) => {
    if (!status) return '未知';
    switch (status.status) {
      case 'connected': return '已连接';
      case 'connecting': return '连接中';
      case 'error': return '错误';
      default: return '已断开';
    }
  };

  if (connections.length === 0) {
    return (
      <div className="text-center py-12">
        <DatabaseOutlined className="text-6xl text-gray-300 mb-4" />
        <h3 className="text-lg text-gray-500 mb-2">暂无连接配置</h3>
        <p className="text-gray-400">点击"新建连接"开始创建您的第一个数据库连接</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {connections.map((connection) => {
        const status = connectionStatuses[connection.id!];
        const isConnected = status?.status === 'connected';
        const isActive = activeConnectionId === connection.id;

        return (
          <Card
            key={connection.id}
            className={`transition-all duration-200 hover:shadow-lg cursor-pointer ${
              isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
            }`}
            bodyStyle={{ padding: '16px' }}
          >
            {/* 卡片头部 */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Avatar
                  icon={<DatabaseOutlined />}
                  className={`${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  } transition-colors duration-200`}
                />
                <div>
                  <h4 className="font-medium text-gray-900 truncate max-w-[140px]">
                    {connection.name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {connection.host}:{connection.port}
                  </p>
                </div>
              </div>
              {isActive && (
                <Tag color="blue" className="text-xs">
                  活跃
                </Tag>
              )}
            </div>

            {/* 连接信息 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">状态：</span>
                <Tag color={getStatusColor(status)} className="text-xs">
                  {getStatusText(status)}
                </Tag>
              </div>
              
              {connection.username && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">用户：</span>
                  <span className="text-gray-700">{connection.username}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">SSL：</span>
                <div className="flex items-center space-x-1">
                  {connection.ssl && <CheckCircleOutlined className="text-green-500" />}
                  <span className={connection.ssl ? 'text-green-600' : 'text-gray-400'}>
                    {connection.ssl ? '已启用' : '未启用'}
                  </span>
                </div>
              </div>

              {status?.latency && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">延迟：</span>
                  <span className="text-gray-700">{status.latency}ms</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Button
                type={isConnected ? 'default' : 'primary'}
                icon={isConnected ? <DisconnectOutlined /> : <WifiOutlined />}
                size="small"
                loading={loading}
                onClick={() => onConnect(connection.id!)}
                className={isConnected ? '' : 'bg-green-600 hover:bg-green-700 border-green-600'}
              >
                {isConnected ? '断开' : '连接'}
              </Button>

              <Space size="small">
                <Tooltip title="编辑连接">
                  <Button
                    icon={<EditOutlined />}
                    size="small"
                    onClick={() => onEdit(connection)}
                  />
                </Tooltip>
                
                <Tooltip title="删除连接">
                  <Button
                    icon={<DeleteOutlined />}
                    size="small"
                    danger
                    onClick={() => onDelete(connection.id!)}
                  />
                </Tooltip>
              </Space>
            </div>

            {/* 错误信息 */}
            {status?.error && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {status.error}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default ConnectionListView;