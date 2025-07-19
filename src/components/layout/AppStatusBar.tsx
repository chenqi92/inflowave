import React, { useEffect, useState } from 'react';
import {
  Typography,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Separator,
} from '@/components/ui';

import { Wifi, Clock, Globe, Zap, HardDrive } from 'lucide-react';
import dayjs from 'dayjs';
import { useConnectionStore } from '@/store/connection';
import { getAppVersion } from '@/utils/version';

const { Text } = Typography;

const AppStatusBar: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(dayjs());
  const { activeConnectionId, connectionStatuses, connections } =
    useConnectionStore();

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 获取当前连接信息
  const currentConnection = activeConnectionId
    ? connections.find(conn => conn.id === activeConnectionId)
    : null;

  const currentStatus = activeConnectionId
    ? connectionStatuses[activeConnectionId]
    : null;

  // 获取内存使用情况
  const [memoryUsage, setMemoryUsage] = useState<number | null>(null);
  
  useEffect(() => {
    // 尝试获取真实的内存使用情况
    const getMemoryUsage = async () => {
      try {
        // 检查是否在 Tauri 环境中
        if (typeof window !== 'undefined' && window.__TAURI__) {
          // 可以调用 Tauri API 获取系统信息
          // const { invoke } = window.__TAURI__.tauri;
          // const memory = await invoke('get_memory_usage');
          // setMemoryUsage(memory);
          
          // 临时显示为未知，而不是随机数
          setMemoryUsage(null);
        } else {
          // 在开发环境中显示为未知
          setMemoryUsage(null);
        }
      } catch (error) {
        console.warn('无法获取内存使用情况:', error);
        setMemoryUsage(null);
      }
    };
    
    getMemoryUsage();
    // 每30秒更新一次
    const interval = setInterval(getMemoryUsage, 30000);
    return () => clearInterval(interval);
  }, []);


  return (
    <TooltipProvider>
      <div className='desktop-status-bar border-b bg-background'>
        <div className='flex items-center justify-between h-8 px-4'>
          {/* 左侧 - 空白 */}
          <div className='flex items-center'>
          </div>

          {/* 中间 - 连接信息 */}
          <div className='flex items-center'>
            {activeConnectionId && currentConnection && currentStatus ? (
              <div className="flex items-center gap-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='flex items-center gap-1'>
                      <Wifi
                        className={`w-3 h-3 ${
                          currentStatus.status === 'connected'
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      />
                      <Text className='text-xs'>{currentConnection.name}</Text>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{`${currentConnection.host}:${currentConnection.port}`}</p>
                  </TooltipContent>
                </Tooltip>

                {currentStatus.latency && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className='flex items-center gap-1'>
                          <Zap className='w-3 h-3 text-yellow-500' />
                          <Text className='text-xs'>{currentStatus.latency}ms</Text>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>连接延迟</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            ) : (
              <div className='flex items-center gap-1'>
                <Wifi className='w-3 h-3 text-muted-foreground' />
                <Text className='text-xs text-muted-foreground'>
                  无活跃连接
                </Text>
              </div>
            )}
          </div>

          {/* 右侧 - 系统信息 */}
          <div className='flex items-center gap-4'>
            {/* 内存使用 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center gap-1'>
                  <HardDrive className='w-3 h-3 text-blue-500' />
                  <Text className='text-xs'>
                    {memoryUsage !== null ? `${memoryUsage}MB` : '-- MB'}
                  </Text>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>内存使用情况</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4" />

            {/* 应用版本 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center gap-1'>
                  <Globe className='w-3 h-3 text-purple-500' />
                  <Text className='text-xs'>v{getAppVersion()}</Text>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>应用版本</p>
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4" />

            {/* 当前时间 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center gap-1'>
                  <Clock className='w-3 h-3 text-orange-500' />
                  <Text className='text-xs'>
                    {currentTime.format('HH:mm:ss')}
                  </Text>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>当前时间</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AppStatusBar;
