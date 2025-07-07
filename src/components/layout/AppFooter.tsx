import React, { useState, useEffect } from 'react';
import { Layout, Space, Typography, Divider } from 'antd';
import { 
  ClockCircleOutlined, 
  DatabaseOutlined, 
  WifiOutlined,
  MemoryOutlined 
} from '@ant-design/icons';
import { useConnectionStore } from '@store/connection';
import dayjs from 'dayjs';

const { Footer } = Layout;
const { Text } = Typography;

const AppFooter: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const { activeConnectionId, connectionStatuses } = useConnectionStore();

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取当前连接状态
  const currentStatus = activeConnectionId 
    ? connectionStatuses[activeConnectionId]
    : null;

  // 获取内存使用情况 (模拟数据)
  const getMemoryUsage = () => {
    // 在实际应用中，这里应该从 Tauri 后端获取真实的内存使用情况
    return Math.floor(Math.random() * 100) + 50; // MB
  };

  return (
    <Footer className="app-footer">
      <div className="flex items-center justify-between">
        {/* 左侧 - 应用信息 */}
        <Space split={<Divider type="vertical" />}>
          <Text className="text-xs">
            InfluxDB GUI Manager v0.1.0
          </Text>
          
          <Space>
            <MemoryOutlined />
            <Text className="text-xs">
              内存: {getMemoryUsage()}MB
            </Text>
          </Space>
        </Space>

        {/* 中间 - 连接状态 */}
        <Space split={<Divider type="vertical" />}>
          {activeConnectionId && currentStatus ? (
            <>
              <Space>
                <WifiOutlined 
                  style={{ 
                    color: currentStatus.status === 'connected' ? '#52c41a' : '#ff4d4f' 
                  }} 
                />
                <Text className="text-xs">
                  {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                </Text>
              </Space>
              
              {currentStatus.latency && (
                <Space>
                  <DatabaseOutlined />
                  <Text className="text-xs">
                    延迟: {currentStatus.latency}ms
                  </Text>
                </Space>
              )}
            </>
          ) : (
            <Space>
              <WifiOutlined style={{ color: '#d9d9d9' }} />
              <Text className="text-xs" type="secondary">
                无活跃连接
              </Text>
            </Space>
          )}
        </Space>

        {/* 右侧 - 时间 */}
        <Space>
          <ClockCircleOutlined />
          <Text className="text-xs">
            {currentTime.format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </Space>
      </div>
    </Footer>
  );
};

export default AppFooter;
