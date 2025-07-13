import React, { useState } from 'react';
import { Button, Badge, Tooltip, Dropdown, Progress } from 'antd';
import { Card } from '@/components/ui';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SettingOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  WifiOutlined, 
  DisconnectOutlined,
  CopyOutlined,
  InfoCircleOutlined
} from '@/components/ui';
import { useConnection } from '@/hooks/useConnection';
import { FormatUtils } from '@/utils/format';
import type { ConnectionConfig, ConnectionStatus } from '@/types';
import { cn } from '@/utils/cn';

interface ConnectionCardProps {
  connection: ConnectionConfig;
  status?: ConnectionStatus;
  poolStats?: any;
  isActive?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  onViewStats?: () => void;
  className?: string;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  status,
  poolStats,
  isActive = false,
  onClick,
  onEdit,
  onDelete,
  onTest,
  onViewStats,
  className,
}) => {
  const { connect, disconnect, testConnection } = useConnection();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleConnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connection.id) return;

    setIsConnecting(true);
    try {
      if (status?.status === 'connected') {
        await disconnect(connection.id);
      } else {
        await connect(connection.id);
      }
    } catch (error) {
      console.error('连接操作失败:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTest = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connection.id) return;

    setIsTesting(true);
    try {
      await testConnection(connection.id);
      onTest?.();
    } catch (error) {
      console.error('测试连接失败:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const connectionString = FormatUtils.formatConnectionString(connection);
    try {
      await navigator.clipboard.writeText(connectionString);
      // TODO: 显示成功提示
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const getStatusBadge = () => {
    if (!status) {
      return <Badge status="default" text="未知" />;
    }

    switch (status.status) {
      case 'connected':
        return <Badge status="success" text="已连接" />;
      case 'connecting':
        return <Badge status="processing" text="连接中" />;
      case 'disconnected':
        return <Badge status="default" text="未连接" />;
      case 'error':
        return <Badge status="error" text="错误" />;
      default:
        return <Badge status="default" text="未知" />;
    }
  };

  const getConnectionIcon = () => {
    if (isConnecting) {
      return <Progress type="circle" size={16} />;
    }

    switch (status?.status) {
      case 'connected':
        return <WifiOutlined className="text-green-500" />;
      case 'connecting':
        return <Progress type="circle" size={16} />;
      case 'error':
        return <DisconnectOutlined className="text-red-500" />;
      default:
        return <DisconnectOutlined className="text-gray-400" />;
    }
  };

  const getLatencyDisplay = () => {
    if (status?.latency !== undefined) {
      const latencyClass = status.latency < 100 ? 'text-green-500' : 
                          status.latency < 500 ? 'text-yellow-500' : 'text-red-500';
      return (
        <span className={`text-xs ${latencyClass}`}>
          延迟: {status.latency}ms
        </span>
      );
    }
    return null;
  };

  const menuItems = [
    {
      key: 'test',
      label: '测试连接',
      icon: <PlayCircleOutlined />,
      onClick: handleTest,
      disabled: isTesting,
    },
    {
      key: 'copy',
      label: '复制连接字符串',
      icon: <CopyOutlined />,
      onClick: handleCopy,
    },
    {
      key: 'edit',
      label: '编辑连接',
      icon: <EditOutlined />,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.();
      },
    },
    {
      key: 'stats',
      label: '查看统计',
      icon: <InfoCircleOutlined />,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onViewStats?.();
      },
      disabled: !poolStats,
    },
    {
      key: 'divider',
      type: 'divider',
    },
    {
      key: 'delete',
      label: '删除连接',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.();
      },
    },
  ];

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        'border-2 hover:border-blue-300',
        isActive && 'border-blue-500 shadow-md',
        status?.status === 'error' && 'border-red-200 bg-red-50',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        {/* 连接信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {getConnectionIcon()}
            <h3 className="font-medium text-gray-900 truncate">
              {connection.name}
            </h3>
            {getStatusBadge()}
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center gap-1">
              <span className="w-12 text-gray-400">主机:</span>
              <span className="font-mono">{connection.host}:{connection.port}</span>
            </div>
            
            {connection.database && (
              <div className="flex items-center gap-1">
                <span className="w-12 text-gray-400">库:</span>
                <span className="font-mono">{connection.database}</span>
              </div>
            )}
            
            {connection.username && (
              <div className="flex items-center gap-1">
                <span className="w-12 text-gray-400">用户:</span>
                <span className="font-mono">{connection.username}</span>
              </div>
            )}
          </div>

          {/* 状态信息 */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            {getLatencyDisplay()}
            
            {status?.lastConnected && (
              <span>
                最后连接: {FormatUtils.formatRelativeTime(status.lastConnected)}
              </span>
            )}
            
            {poolStats && (
              <span className="text-blue-600">
                连接池: {poolStats.active}/{poolStats.max}
              </span>
            )}
          </div>

          {/* 错误信息 */}
          {status?.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              {status.error}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 ml-2">
          {/* 连接/断开按钮 */}
          <Tooltip title={status?.status === 'connected' ? '断开连接' : '连接'}>
            <Button
              type={status?.status === 'connected' ? 'default' : 'primary'}
              size="small"
              icon={status?.status === 'connected' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              loading={isConnecting}
              onClick={handleConnect}
              danger={status?.status === 'connected'}
            />
          </Tooltip>

          {/* 更多操作菜单 */}
          <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<SettingOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>

      {/* 连接进度条 */}
      {(isConnecting || status?.status === 'connecting') && (
        <div className="mt-3">
          <Progress 
            percent={status?.status === 'connecting' ? 50 : 100}
            showInfo={false}
            strokeColor="#1890ff"
            size="small"
          />
        </div>
      )}
    </Card>
  );
};