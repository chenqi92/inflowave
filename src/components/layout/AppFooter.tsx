import React, { useState, useEffect } from 'react';
import { Footer, Text, Separator } from '@/components/ui';
import { Database, Wifi, Clock, HardDrive } from 'lucide-react';
import { useConnectionStore } from '@store/connection';
import dayjs from 'dayjs';

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
      <div className='flex items-center justify-between px-2 py-1'>
        {/* 左侧 - 应用信息 */}
        <div className='flex items-center gap-4'>
          <Text className='text-xs text-muted-foreground'>InfluxDB GUI Manager v0.1.0</Text>

          <Separator orientation="vertical" className="h-4" />

          <div className='flex items-center gap-2'>
            <HardDrive className='w-4 h-4 text-muted-foreground' />
            <Text className='text-xs text-muted-foreground'>内存: {getMemoryUsage()}MB</Text>
          </div>
        </div>

        {/* 中间 - 连接状态 */}
        <div className='flex items-center gap-4'>
          {activeConnectionId && currentStatus ? (
            <>
              <div className='flex items-center gap-2'>
                <Wifi
                  className={`w-4 h-4 ${
                    currentStatus.status === 'connected'
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                />
                <Text className='text-xs'>
                  {currentStatus.status === 'connected' ? '已连接' : '未连接'}
                </Text>
              </div>

              {currentStatus.latency && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <div className='flex items-center gap-2'>
                    <Database className='w-4 h-4 text-muted-foreground' />
                    <Text className='text-xs text-muted-foreground'>
                      延迟: {currentStatus.latency}ms
                    </Text>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className='flex items-center gap-2'>
              <Wifi className='w-4 h-4 text-muted-foreground' />
              <Text className='text-xs text-muted-foreground'>
                无活跃连接
              </Text>
            </div>
          )}
        </div>

        {/* 右侧 - 时间 */}
        <div className='flex items-center gap-2'>
          <Clock className='w-4 h-4 text-muted-foreground' />
          <Text className='text-xs text-muted-foreground'>
            {currentTime.format('YYYY-MM-DD HH:mm:ss')}
          </Text>
        </div>
      </div>
    </Footer>
  );
};

export default AppFooter;
