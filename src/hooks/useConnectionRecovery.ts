import { useEffect, useCallback, useRef } from 'react';
import { useConnectionStore } from '@/store/connection';
import { message } from '@/utils/message';

interface ConnectionRecoveryOptions {
  // 是否启用自动重连
  autoReconnect?: boolean;
  // 重连检查间隔（毫秒）
  checkInterval?: number;
  // 是否在应用获得焦点时检查连接
  checkOnFocus?: boolean;
  // 是否在网络恢复时检查连接
  checkOnOnline?: boolean;
  // 最大自动重连尝试次数
  maxAutoRetries?: number;
}

export function useConnectionRecovery(options: ConnectionRecoveryOptions = {}) {
  const {
    autoReconnect = true,
    checkInterval = 60000, // 1分钟
    checkOnFocus = true,
    checkOnOnline = true,
    maxAutoRetries = 3,
  } = options;

  const {
    connections,
    connectionStatuses,
    attemptReconnectAll,
    attemptReconnect,
    scheduleReconnect,
    cancelScheduledReconnect,
    testConnection,
  } = useConnectionStore();

  const intervalRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef<Record<string, number>>({});

  // 检查失败的连接并尝试恢复
  const checkAndRecoverConnections = useCallback(async () => {
    console.log('🔍 检查连接状态并尝试恢复...');
    
    const failedConnections = connections.filter(conn => {
      if (!conn.id) return false;
      const status = connectionStatuses[conn.id];
      return status && status.status === 'error';
    });

    if (failedConnections.length === 0) {
      return;
    }

    console.log(`🔄 发现 ${failedConnections.length} 个失败的连接，尝试恢复...`);

    for (const connection of failedConnections) {
      if (!connection.id) continue;

      const retryCount = retryCountRef.current[connection.id] || 0;
      
      if (retryCount >= maxAutoRetries) {
        console.log(`⏭️ 连接 ${connection.name} 已达到最大重试次数，跳过自动重连`);
        continue;
      }

      try {
        // 先测试连接
        const testResult = await testConnection(connection.id);
        
        if (testResult) {
          console.log(`✅ 连接 ${connection.name} 测试成功，尝试重连...`);
          
          const reconnectSuccess = await attemptReconnect(connection.id);
          
          if (reconnectSuccess) {
            console.log(`🎉 连接 ${connection.name} 恢复成功`);
            // 重置重试计数
            retryCountRef.current[connection.id] = 0;
            
            message.success(`连接 "${connection.name}" 已恢复`);
          } else {
            // 增加重试计数
            retryCountRef.current[connection.id] = retryCount + 1;
            console.log(`❌ 连接 ${connection.name} 重连失败，重试次数: ${retryCount + 1}/${maxAutoRetries}`);
          }
        } else {
          console.log(`❌ 连接 ${connection.name} 测试失败，数据源可能仍未恢复`);
          // 增加重试计数
          retryCountRef.current[connection.id] = retryCount + 1;
        }
      } catch (error) {
        console.error(`连接恢复检查失败 ${connection.name}:`, error);
        retryCountRef.current[connection.id] = retryCount + 1;
      }
    }
  }, [connections, connectionStatuses, testConnection, attemptReconnect, maxAutoRetries]);

  // 手动触发所有连接的恢复检查
  const triggerRecoveryCheck = useCallback(async () => {
    console.log('🔄 手动触发连接恢复检查...');
    
    try {
      await checkAndRecoverConnections();
      message.info('连接恢复检查完成');
    } catch (error) {
      console.error('连接恢复检查失败:', error);
      message.error('连接恢复检查失败');
    }
  }, [checkAndRecoverConnections]);

  // 重置特定连接的重试计数
  const resetRetryCount = useCallback((connectionId: string) => {
    retryCountRef.current[connectionId] = 0;
  }, []);

  // 重置所有连接的重试计数
  const resetAllRetryCounts = useCallback(() => {
    retryCountRef.current = {};
  }, []);

  // 获取连接的重试次数
  const getRetryCount = useCallback((connectionId: string) => {
    return retryCountRef.current[connectionId] || 0;
  }, []);

  // 设置定期检查
  useEffect(() => {
    if (!autoReconnect) return;

    console.log(`🚀 启动连接恢复监控，检查间隔: ${checkInterval}ms`);
    
    intervalRef.current = setInterval(checkAndRecoverConnections, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('🛑 停止连接恢复监控');
      }
    };
  }, [autoReconnect, checkInterval, checkAndRecoverConnections]);

  // 监听窗口焦点事件
  useEffect(() => {
    if (!checkOnFocus) return;

    const handleFocus = () => {
      console.log('🔍 窗口获得焦点，检查连接状态...');
      checkAndRecoverConnections();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [checkOnFocus, checkAndRecoverConnections]);

  // 监听网络状态变化
  useEffect(() => {
    if (!checkOnOnline) return;

    const handleOnline = () => {
      console.log('🌐 网络恢复，检查连接状态...');
      // 网络恢复后稍等一下再检查，给服务器一些启动时间
      setTimeout(checkAndRecoverConnections, 2000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [checkOnOnline, checkAndRecoverConnections]);

  // 清理重试计数中不存在的连接
  useEffect(() => {
    const currentConnectionIds = new Set(connections.map(conn => conn.id).filter(Boolean));
    const retryCountIds = Object.keys(retryCountRef.current);
    
    for (const id of retryCountIds) {
      if (!currentConnectionIds.has(id)) {
        delete retryCountRef.current[id];
      }
    }
  }, [connections]);

  return {
    // 方法
    triggerRecoveryCheck,
    resetRetryCount,
    resetAllRetryCounts,
    getRetryCount,
    
    // 状态
    isAutoRecoveryEnabled: autoReconnect,
    checkInterval,
    maxAutoRetries,
    
    // 统计信息
    failedConnectionsCount: connections.filter(conn => {
      if (!conn.id) return false;
      const status = connectionStatuses[conn.id];
      return status && status.status === 'error';
    }).length,
    
    totalRetriesCount: Object.values(retryCountRef.current).reduce((sum, count) => sum + count, 0),
  };
}
