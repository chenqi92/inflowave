import React from 'react';
import { Tag, Space, Typography, Badge, Tooltip } from '@/components/ui';
import { WifiOutlined, DisconnectOutlined, ExclamationCircleOutlined, LoadingOutlined, ClockCircleOutlined } from '@/components/ui';
import type { ConnectionStatus } from '@/types';

const { Text } = Typography;

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
      <Space style={style}>
        <Badge status="default" />
        {showText && <Text type="secondary">未知状态</Text>}
      </Space>
    );
  }

  const getStatusConfig = () => {
    switch (status.status) {
      case 'connected':
        return {
          badgeStatus: 'success' as const,
          icon: <WifiOutlined style={{ color: '#52c41a' }} />,
          text: '已连接',
          color: '#52c41a',
          tagColor: 'success',
        };
      case 'connecting':
        return {
          badgeStatus: 'processing' as const,
          icon: <LoadingOutlined style={{ color: '#1890ff' }} />,
          text: '连接中',
          color: '#1890ff',
          tagColor: 'processing',
        };
      case 'error':
        return {
          badgeStatus: 'error' as const,
          icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
          text: '连接错误',
          color: '#ff4d4f',
          tagColor: 'error',
        };
      case 'disconnected':
      default:
        return {
          badgeStatus: 'default' as const,
          icon: <DisconnectOutlined style={{ color: '#d9d9d9' }} />,
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
      content.push(`最后连接: ${new Date(status.lastConnected).toLocaleString()}`);
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
          <Badge status={config.badgeStatus} />
        </Tooltip>
      );
    }

    if (size === 'large') {
      return (
        <Space direction="vertical" size="small">
          <Space>
            {config.icon}
            {showText && (
              <Text strong style={{ color: config.color }}>
                {config.text}
              </Text>
            )}
          </Space>
          {showLatency && status.latency && (
            <Space size="small">
              <ClockCircleOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {status.latency}ms
              </Text>
            </Space>
          )}
          {showLastConnected && status.lastConnected && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {new Date(status.lastConnected).toLocaleString()}
            </Text>
          )}
        </Space>
      );
    }

    // Default size
    return (
      <Tooltip title={getTooltipContent()}>
        <Space>
          <Badge status={config.badgeStatus} />
          {showText && (
            <Tag color={config.tagColor} style={{ margin: 0 }}>
              {config.text}
            </Tag>
          )}
          {showLatency && status.latency && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {status.latency}ms
            </Text>
          )}
        </Space>
      </Tooltip>
    );
  };

  return <div style={style}>{renderContent()}</div>;
};

export default ConnectionStatusIndicator;
