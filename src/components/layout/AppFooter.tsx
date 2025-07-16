import React, { useState, useEffect } from 'react';
import { Layout, Typography } from '@/components/ui';

import { HddOutlined } from '@/components/ui';
import { Database, Wifi, Clock } from 'lucide-react';
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
    <Footer className='app-footer'>
      <div className='flex items-center justify-between'>
        {/* 左侧 - 应用信息 */}
        <div
          className='flex gap-2'
          split={<div className='border-t border my-4' type='vertical' />}
        >
          <Text className='text-xs'>InfluxDB GUI Manager v0.1.0</Text>

          <div className='flex gap-2'>
            <HddOutlined />
            <Text className='text-xs'>内存: {getMemoryUsage()}MB</Text>
          </div>
        </div>

        {/* 中间 - 连接状态 */}
        <div
          className='flex gap-2'
          split={<div className='border-t border my-4' type='vertical' />}
        >
          {activeConnectionId && currentStatus ? (
            <>
              <div className='flex gap-2'>
                <Wifi
                  className='w-4 h-4'
                  style={{
                    color:
                      currentStatus.status === 'connected'
                        ? '#52c41a'
                        : '#ff4d4f',
                  }}
                />
                <Text className='text-xs'>
                  {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                </Text>
              </div>

              {currentStatus.latency && (
                <div className='flex gap-2'>
                  <Database className='w-4 h-4' />
                  <Text className='text-xs'>
                    延迟: {currentStatus.latency}ms
                  </Text>
                </div>
              )}
            </>
          ) : (
            <div className='flex gap-2'>
              <Wifi className='w-4 h-4' style={{ color: '#d9d9d9' }} />
              <Text className='text-xs' type='secondary'>
                无活跃连接
              </Text>
            </div>
          )}
        </div>

        {/* 右侧 - 时间 */}
        <div className='flex gap-2'>
          <Clock className='w-4 h-4' />
          <Text className='text-xs'>
            {currentTime.format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;
