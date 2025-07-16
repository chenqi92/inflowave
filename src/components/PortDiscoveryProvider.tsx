import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePortDiscovery } from '@/hooks/usePortDiscovery';
import { toast } from 'sonner';

interface PortDiscoveryContextType {
  currentPort: number;
  isInitialized: boolean;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  error: string | null;
  handlePortConflict: (service?: string) => Promise<number>;
  performHealthCheck: (service?: string) => Promise<boolean>;
  refreshPortStats: () => Promise<Record<string, any>>;
}

const PortDiscoveryContext = createContext<PortDiscoveryContextType | undefined>(undefined);

export const usePortDiscoveryContext = () => {
  const context = useContext(PortDiscoveryContext);
  if (context === undefined) {
    throw new Error('usePortDiscoveryContext must be used within a PortDiscoveryProvider');
  }
  return context;
};

interface PortDiscoveryProviderProps {
  children: React.ReactNode;
}

export const PortDiscoveryProvider: React.FC<PortDiscoveryProviderProps> = ({ children }) => {
  const [hasShownInitializationError, setHasShownInitializationError] = useState(false);
  
  const {
    currentPort,
    isInitialized,
    healthStatus,
    error,
    handlePortConflict,
    performHealthCheck,
    refreshPortStats,
  } = usePortDiscovery({
    autoStart: true,
    onPortChange: (newPort, oldPort) => {
      toast.success(`开发服务器端口已更改: ${oldPort} → ${newPort}`);
      
      // 通知用户可能需要刷新页面
      if (window.location.port !== newPort.toString()) {
        toast.info('页面将在 3 秒后刷新以适应新端口', {
          duration: 3000,
        });
        
        setTimeout(() => {
          const newUrl = `${window.location.protocol}//${window.location.hostname}:${newPort}${window.location.pathname}${window.location.search}${window.location.hash}`;
          window.location.href = newUrl;
        }, 3000);
      }
    },
    onPortConflict: (port, service) => {
      toast.error(`端口冲突检测: 端口 ${port} 被服务 ${service} 占用`);
      
      // 自动尝试解决冲突
      handlePortConflict(service).catch((err) => {
        toast.error(`自动解决端口冲突失败: ${err.message}`);
      });
    },
    onHealthCheckFailed: (port, error) => {
      toast.warning(`端口 ${port} 健康检查失败: ${error}`);
    },
  });

  // 显示初始化错误
  useEffect(() => {
    if (error && !hasShownInitializationError) {
      toast.error(`端口发现服务初始化失败: ${error}`);
      setHasShownInitializationError(true);
    }
  }, [error, hasShownInitializationError]);

  // 监听页面卸载，清理资源
  useEffect(() => {
    const handleBeforeUnload = () => {
      // 在页面卸载时清理端口发现服务
      // 这里不需要等待异步操作完成
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // 监听网络状态变化
  useEffect(() => {
    const handleOnline = () => {
      if (isInitialized) {
        // 网络恢复时重新进行健康检查
        performHealthCheck().catch(console.error);
      }
    };

    const handleOffline = () => {
      toast.warning('网络连接已断开，端口监控暂停');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isInitialized, performHealthCheck]);

  // 定期进行健康检查
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(async () => {
      try {
        await performHealthCheck();
      } catch (err) {
        console.error('定期健康检查失败:', err);
      }
    }, 30000); // 每30秒检查一次

    return () => clearInterval(interval);
  }, [isInitialized, performHealthCheck]);

  const contextValue: PortDiscoveryContextType = {
    currentPort,
    isInitialized,
    healthStatus,
    error,
    handlePortConflict,
    performHealthCheck,
    refreshPortStats,
  };

  return (
    <PortDiscoveryContext.Provider value={contextValue}>
      {children}
    </PortDiscoveryContext.Provider>
  );
};

export default PortDiscoveryProvider;