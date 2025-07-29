import React from 'react';
import { Text, Badge, TooltipWrapper as Tooltip } from '@/components/ui';
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
          badgeVariant: 'default' as const,
          badgeClassName: 'bg-success text-success-foreground',
          icon: <Wifi className='w-4 h-4 text-success' />,
          text: '已连接',
          textClassName: 'text-success',
        };
      case 'connecting':
        return {
          badgeVariant: 'secondary' as const,
          badgeClassName: 'bg-warning text-warning-foreground',
          icon: <Loader2 className='w-4 h-4 text-warning' />,
          text: '连接中',
          textClassName: 'text-warning',
        };
      case 'error':
        return {
          badgeVariant: 'destructive' as const,
          badgeClassName: '',
          icon: <AlertCircle className='w-4 h-4 text-destructive' />,
          text: '连接错误',
          textClassName: 'text-destructive',
        };
      case 'disconnected':
      default:
        return {
          badgeVariant: 'secondary' as const,
          badgeClassName: 'bg-muted text-muted-foreground',
          icon: <Unlink className='w-4 h-4 text-muted-foreground' />,
          text: '已断开',
          textClassName: 'text-muted-foreground',
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
          <Badge variant={config.badgeVariant} className={config.badgeClassName}>{config.text}</Badge>
        </Tooltip>
      );
    }

    if (size === 'large') {
      return (
        <div className='flex flex-col gap-2'>
          <div className='flex gap-2'>
            {config.icon}
            {showText && (
              <Text strong className={config.textClassName}>
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
          <Badge variant={config.badgeVariant} className={config.badgeClassName}>{config.text}</Badge>
          {showText && (
            <span className={`text-sm ${config.textClassName}`}>
              {config.text}
            </span>
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
