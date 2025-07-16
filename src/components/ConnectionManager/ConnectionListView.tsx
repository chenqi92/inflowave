import React from 'react';
import {
  Button,
  Badge,
  Avatar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Typography,
} from '@/components/ui';
import {
  Wifi,
  Unlink,
  Edit,
  Trash2,
  Database,
  CheckCircle,
} from 'lucide-react';
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
      case 'connected':
        return 'success';
      case 'connecting':
        return 'processing';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status?: ConnectionStatus) => {
    if (!status) return '未知';
    switch (status.status) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中';
      case 'error':
        return '错误';
      default:
        return '已断开';
    }
  };

  if (connections.length === 0) {
    return (
      <div className='text-center py-12'>
        <Database className='w-4 h-4 text-6xl text-gray-300 mb-4' />
        <Typography variant='h3' className='text-lg text-muted-foreground mb-2'>
          暂无连接配置
        </Typography>
        <Typography.Text className='text-gray-400'>
          点击"新建连接"开始创建您的第一个数据库连接
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {connections.map(connection => {
        const status = connectionStatuses[connection.id!];
        const isConnected = status?.status === 'connected';
        const isActive = activeConnectionId === connection.id;

        return (
          <div
            key={connection.id}
            className={`transition-all duration-200 hover:shadow-lg cursor-pointer p-4 ${
              isActive ? 'ring-2 ring-blue-500 shadow-lg' : ''
            }`}
          >
            {/* 卡片头部 */}
            <div className='flex items-start justify-between mb-3'>
              <div className='flex items-center space-x-3'>
                <Avatar
                  className={`${
                    isConnected ? 'bg-green-500' : 'bg-gray-400'
                  } transition-colors duration-200`}
                >
                  <Database className='w-4 h-4' />
                </Avatar>
                <div>
                  <h4 className='font-medium text-gray-900 truncate max-w-[140px]'>
                    {connection.name}
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    {connection.host}:{connection.port}
                  </p>
                </div>
              </div>
              {isActive && (
                <Badge className='text-xs bg-blue-100 text-blue-700 border-blue-200'>
                  活跃
                </Badge>
              )}
            </div>

            {/* 连接信息 */}
            <div className='space-y-2 mb-4'>
              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>状态：</span>
                <Badge
                  variant={
                    getStatusColor(status) === 'success'
                      ? 'default'
                      : 'secondary'
                  }
                  className='text-xs'
                >
                  {getStatusText(status)}
                </Badge>
              </div>

              {connection.username && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>用户：</span>
                  <span className='text-gray-700'>{connection.username}</span>
                </div>
              )}

              <div className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>SSL：</span>
                <div className='flex items-center space-x-1'>
                  {connection.ssl && <CheckCircle className='text-success' />}
                  <span
                    className={
                      connection.ssl ? 'text-success' : 'text-gray-400'
                    }
                  >
                    {connection.ssl ? '已启用' : '未启用'}
                  </span>
                </div>
              </div>

              {status?.latency && (
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>延迟：</span>
                  <span className='text-gray-700'>{status.latency}ms</span>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
              <Button
                variant={isConnected ? 'outline' : 'default'}
                size='sm'
                disabled={loading}
                onClick={() => onConnect(connection.id!)}
                className={
                  isConnected
                    ? 'text-red-600 hover:text-red-700 hover:border-red-300'
                    : 'bg-green-600 hover:bg-green-700 border-green-600 text-white'
                }
              >
                {isConnected ? (
                  <Unlink className='w-4 h-4 mr-1' />
                ) : (
                  <Wifi className='w-4 h-4 mr-1' />
                )}
                {isConnected ? '断开' : '连接'}
              </Button>

              <div className='flex gap-2'>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => onEdit(connection)}
                    >
                      <Edit className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>编辑连接</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-red-600 hover:text-red-700 hover:border-red-300'
                      onClick={() => onDelete(connection.id!)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除连接</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* 错误信息 */}
            {status?.error && (
              <div className='mt-2 p-2 bg-destructive/10 border border-destructive rounded text-xs text-red-600'>
                {status.error}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ConnectionListView;
