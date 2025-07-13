import React, { useEffect, useState } from 'react';
import { Button, Typography, Breadcrumb, Tooltip, Space } from '@/components/ui';

import { useLocation, useNavigate } from 'react-router-dom';
import { HddOutlined } from '@/components/ui';
import { Home, ChevronRight, Wifi, Clock, Globe, Zap } from 'lucide-react';
import dayjs from 'dayjs';
import { useConnectionStore } from '@/store/connection';

const { Text } = Typography;

const AppStatusBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // 获取内存使用情况 (模拟数据)
  const getMemoryUsage = () => {
    // 在实际应用中，这里应该从 Tauri 后端获取真实的内存使用情况
    return Math.floor(Math.random() * 100) + 50; // MB
  };

  // 生成面包屑导航
  const generateBreadcrumb = () => {
    const path = location.pathname;
    const pathMap: Record<string, string> = {
      '/': '仪表板',
      '/dashboard': '仪表板',
      '/connections': '连接管理',
      '/database': '数据库管理',
      '/query': '数据查询',
      '/visualization': '数据可视化',
      '/data-write': '数据写入',
      '/performance': '性能监控',
      '/extensions': '扩展管理',
      '/settings': '应用设置'};

    const items = [
      {
        title: (
          <Button
            type='text'
            size='small'
            icon={<Home className="w-4 h-4"  />}
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0 4px', height: '20px' }}
          />
        )},
    ];

    const currentPageTitle = pathMap[path] || '未知页面';
    if (path !== '/' && path !== '/dashboard') {
      items.push({
        title: currentPageTitle});
    }

    return items;
  };

  return (
    <div className='desktop-status-bar'>
      <div className='flex items-center justify-between h-full px-4'>
        {/* 左侧 - 面包屑导航 */}
        <div className='flex items-center space-x-4'>
          <Breadcrumb
            items={generateBreadcrumb()}
            separator={<ChevronRight className="w-4 h-4" style={{ fontSize: '10px' }}  />}
          />
        </div>

        {/* 中间 - 连接信息 */}
        <div className='flex items-center space-x-4'>
          {activeConnectionId && currentConnection && currentStatus ? (
            <Space split={<div className="border-t border-gray-200 my-4" type='vertical' />}>
              <Tooltip
                title={`${currentConnection.host}:${currentConnection.port}`}
              >
                <div className="flex gap-2">
                  <Wifi className="w-4 h-4" style={{
                      color:
                        currentStatus.status === 'connected'
                          ? '#52c41a'
                          : '#ff4d4f',
                      fontSize: '12px'}}
                   />
                  <Text className='text-xs'>{currentConnection.name}</Text>
                </div>
              </Tooltip>

              {currentStatus.latency && (
                <Tooltip title='连接延迟'>
                  <div className="flex gap-2">
                    <Zap className="w-3 h-3" />
                    <Text className='text-xs'>{currentStatus.latency}ms</Text>
                  </div>
                </Tooltip>
              )}
            </Space>
          ) : (
            <div className="flex gap-2">
              <Wifi className="w-3 h-3" style={{ color: '#d9d9d9' }} />
              <Text className='text-xs' type='secondary'>
                无活跃连接
              </Text>
            </div>
          )}
        </div>

        {/* 右侧 - 系统信息 */}
        <div className='flex items-center space-x-4'>
          <Space split={<div className="border-t border-gray-200 my-4" type='vertical' />}>
            {/* 内存使用 */}
            <Tooltip title='内存使用情况'>
              <div className="flex gap-2">
                <HddOutlined className="text-xs" />
                <Text className='text-xs'>{getMemoryUsage()}MB</Text>
              </div>
            </Tooltip>

            {/* 应用版本 */}
            <Tooltip title='应用版本'>
              <div className="flex gap-2">
                <Globe className="w-3 h-3" />
                <Text className='text-xs'>v0.1.0</Text>
              </div>
            </Tooltip>

            {/* 当前时间 */}
            <Tooltip title='当前时间'>
              <div className="flex gap-2">
                <Clock className="w-3 h-3" />
                <Text className='text-xs'>
                  {currentTime.format('HH:mm:ss')}
                </Text>
              </div>
            </Tooltip>
          </Space>
        </div>
      </div>
    </div>
  );
};

export default AppStatusBar;
