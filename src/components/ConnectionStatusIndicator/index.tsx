import React from 'react';
import { Tag, Text, Badge, TooltipWrapper as Tooltip } from '@/components/ui';
import { Wifi, Unlink, Loader2, Clock, AlertCircle } from 'lucide-react';
import type { ConnectionStatus } from '@/types';

interface ConnectionStatusIndicatorProps {
  status?: ConnectionStatus;
  showText?: boolean;
  showLatency?: boolean;
  showLastConnected?: boolean;
  size?: 'small' | 'default' | 'large';
  style?: React.CSSProperties;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  showText = true,
  showLatency = true,
  showLastConnected = false,
  size = 'default',
  style,
}) => {
  if (!status) {
    return (
      <div className='flex gap-2' style={style}>
        <Badge variant='secondary'>未知</Badge>
        {showText && <Text type='secondary'>未知状态</Text>}
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (status.status) {
      case 'connected':
        return {
          badgeStatus: 'success' as const,
          icon: <Wifi className='w-4 h-4' style={{ color: '#52c41a' }} />,
          text: '已连接',
          color: '#52c41a',
          tagColor: 'success',
        };
      case 'connecting':
        return {
          badgeStatus: 'processing' as const,
          icon: <Loader2 className='w-4 h-4' style={{ color: '#1890ff' }} />,
          text: '连接中',
          color: '#1890ff',
          tagColor: 'processing',
        };
      case 'error':
        return {
          badgeStatus: 'error' as const,
          icon: <AlertCircle style={{ color: '#ff4d4f' }} />,
          text: '连接错误',
          color: '#ff4d4f',
          tagColor: 'error',
        };
      case 'disconnected':
      default:
        return {
          badgeStatus: 'default' as const,
          icon: <Unlink className='w-4 h-4' style={{ color: '#d9d9d9' }} />,
          text: '已断开',
          color: '#d9d9d9',
          tagColor: 'default',
        };
    }
  };

  const config = getStatusConfig();

  const getTooltipContent = () => {
    const content = [];

    content.push(`状态: ${config.text}`);

    if (status.latency && showLatency) {
      content.push(`延迟: ${status.latency}ms`);
    }

    if (status.lastConnected && showLastConnected) {
      content.push(
        `最后连接: ${new Date(status.lastConnected).toLocaleString()}`
      );
    }

    if (status.error) {
      content.push(`错误: ${status.error}`);
    }

    return content.join('\n');
  };

  const renderContent = () => {
    if (size === 'small') {
      return (
        <Tooltip title={getTooltipContent()}>
          <Badge variant={config.badgeStatus === 'success' ? 'default' : config.badgeStatus === 'error' ? 'destructive' : 'secondary'}>{config.text}</Badge>
        </Tooltip>
      );
    }

    if (size === 'large') {
      return (
        <div className='flex flex-col gap-2'>
          <div className='flex gap-2'>
            {config.icon}
            {showText && (
              <Text strong style={{ color: config.color }}>
                {config.text}
              </Text>
            )}
          </div>
          {showLatency && status.latency && (
            <div className='flex gap-2'>
              <Clock
                className='w-4 h-4'
                style={{ fontSize: '12px', color: '#8c8c8c' }}
              />
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {status.latency}ms
              </Text>
            </div>
          )}
          {showLastConnected && status.lastConnected && (
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {new Date(status.lastConnected).toLocaleString()}
            </Text>
          )}
        </div>
      );
    }

    // Default size
    return (
      <Tooltip title={getTooltipContent()}>
        <div className='flex gap-2'>
          <Badge variant={config.badgeStatus === 'success' ? 'default' : config.badgeStatus === 'error' ? 'destructive' : 'secondary'}>{config.text}</Badge>
          {showText && (
            <Tag color={config.tagColor} style={{ margin: 0 }}>
              {config.text}
            </Tag>
          )}
          {showLatency && status.latency && (
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {status.latency}ms
            </Text>
          )}
        </div>
      </Tooltip>
    );
  };

  return <div style={style}>{renderContent()}</div>;
};

export default ConnectionStatusIndicator;
