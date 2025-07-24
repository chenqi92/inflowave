import { useEffect, useState, useCallback } from 'react';
import { portDiscoveryService, type PortEvent, type PortInfo } from '@/services/portDiscovery';
import { getPortDiscoveryError, formatErrorMessage } from '@/utils/userFriendlyErrors';

export interface UsePortDiscoveryOptions {
  autoStart?: boolean;
  serviceName?: string;
  onPortChange?: (newPort: number, oldPort: number) => void;
  onPortConflict?: (port: number, service: string) => void;
  onHealthCheckFailed?: (port: number, error: string) => void;
}

export function usePortDiscovery(options: UsePortDiscoveryOptions = {}) {
  const {
    autoStart = true,
    serviceName = 'frontend-dev-server',
    onPortChange,
    onPortConflict,
    onHealthCheckFailed,
  } = options;

  const [currentPort, setCurrentPort] = useState<number>(1421);
  const [isInitialized, setIsInitialized] = useState(false);
  const [portStats, setPortStats] = useState<Record<string, PortInfo>>({});
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');
  const [error, setError] = useState<string | null>(null);

  // 初始化端口发现服务
  const initializeService = useCallback(async () => {
    try {
      await portDiscoveryService.initialize();
      const port = portDiscoveryService.getCurrentPort();
      setCurrentPort(port);
      setIsInitialized(true);
      setError(null);
      
      console.log(`Port discovery service initialized with port: ${port}`);
    } catch (err) {
      const errorString = err instanceof Error ? err.message : 'Failed to initialize port discovery service';
      const friendlyError = getPortDiscoveryError(errorString);
      setError(formatErrorMessage(friendlyError));
      console.error('Failed to initialize port discovery service:', err);
    }
  }, []);

  // 分配端口
  const allocatePort = useCallback(async (service: string) => {
    try {
      const port = await portDiscoveryService.allocatePort(service);
      if (service === serviceName) {
        setCurrentPort(port);
      }
      return port;
    } catch (err) {
      const errorString = err instanceof Error ? err.message : 'Failed to allocate port';
      const friendlyError = getPortDiscoveryError(errorString);
      setError(formatErrorMessage(friendlyError));
      throw err;
    }
  }, [serviceName]);

  // 释放端口
  const releasePort = useCallback(async (service: string) => {
    try {
      await portDiscoveryService.releasePort(service);
    } catch (err) {
      const errorString = err instanceof Error ? err.message : 'Failed to release port';
      const friendlyError = getPortDiscoveryError(errorString);
      setError(formatErrorMessage(friendlyError));
      throw err;
    }
  }, []);

  // 检查端口是否可用
  const checkPortAvailability = useCallback(async (port: number) => {
    try {
      return await portDiscoveryService.isPortAvailable(port);
    } catch (err) {
      console.error('Failed to check port availability:', err);
      return false;
    }
  }, []);

  // 进行健康检查
  const performHealthCheck = useCallback(async (service: string = serviceName) => {
    try {
      const healthy = await portDiscoveryService.healthCheck(service);
      setHealthStatus(healthy ? 'healthy' : 'unhealthy');
      return healthy;
    } catch (err) {
      setHealthStatus('unhealthy');
      const errorString = err instanceof Error ? err.message : 'Health check failed';
      const friendlyError = getPortDiscoveryError(errorString);
      setError(formatErrorMessage(friendlyError));
      console.error('Health check failed:', err);
      return false;
    }
  }, [serviceName]);

  // 启动健康检查循环
  const startHealthCheckLoop = useCallback(async (service: string = serviceName) => {
    try {
      await portDiscoveryService.startHealthCheckLoop(service);
    } catch (err) {
      const errorString = err instanceof Error ? err.message : 'Failed to start health check loop';
      const friendlyError = getPortDiscoveryError(errorString);
      setError(formatErrorMessage(friendlyError));
      console.error('Failed to start health check loop:', err);
    }
  }, [serviceName]);

  // 处理端口冲突
  const handlePortConflict = useCallback(async (service: string = serviceName) => {
    try {
      const newPort = await portDiscoveryService.handlePortConflict(service);
      if (service === serviceName) {
        setCurrentPort(newPort);
      }
      return newPort;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to handle port conflict';
      setError(errorMessage);
      throw err;
    }
  }, [serviceName]);

  // 获取端口统计信息
  const refreshPortStats = useCallback(async () => {
    try {
      const stats = await portDiscoveryService.getPortStats();
      setPortStats(stats);
      return stats;
    } catch (err) {
      console.error('Failed to get port stats:', err);
      return {};
    }
  }, []);

  // 检查端口冲突
  const checkPortConflicts = useCallback(async () => {
    try {
      return await portDiscoveryService.checkPortConflicts();
    } catch (err) {
      console.error('Failed to check port conflicts:', err);
      return [];
    }
  }, []);

  // 处理端口事件
  const handlePortEvent = useCallback((event: PortEvent) => {
    console.log('Port event:', event);
    
    switch (event.type) {
      case 'PortChanged':
        if (event.old_port && event.new_port) {
          setCurrentPort(event.new_port);
          onPortChange?.(event.new_port, event.old_port);
        }
        break;
        
      case 'PortConflict':
        if (event.port && event.service) {
          setHealthStatus('unhealthy');
          onPortConflict?.(event.port, event.service);
        }
        break;
        
      case 'HealthCheckFailed':
        if (event.port && event.error) {
          setHealthStatus('unhealthy');
          onHealthCheckFailed?.(event.port, event.error);
        }
        break;
        
      case 'HealthCheckSuccess':
        setHealthStatus('healthy');
        break;
        
      case 'PortAvailable':
        if (event.port) {
          setHealthStatus('healthy');
        }
        break;
    }
  }, [onPortChange, onPortConflict, onHealthCheckFailed]);

  // 监听端口变更事件
  useEffect(() => {
    const handlePortChangeEvent = (event: CustomEvent) => {
      const { newPort, oldPort } = event.detail;
      setCurrentPort(newPort);
      onPortChange?.(newPort, oldPort);
    };

    window.addEventListener('port-changed', handlePortChangeEvent as EventListener);
    
    return () => {
      window.removeEventListener('port-changed', handlePortChangeEvent as EventListener);
    };
  }, [onPortChange]);

  // 初始化服务
  useEffect(() => {
    if (autoStart && !isInitialized) {
      initializeService();
    }
  }, [autoStart, isInitialized, initializeService]);

  // 设置端口事件监听器
  useEffect(() => {
    if (isInitialized) {
      // 监听所有端口事件
      portDiscoveryService.onPortEvent('*', handlePortEvent);
      
      // 启动健康检查循环
      startHealthCheckLoop();
      
      // 初始获取端口统计信息
      refreshPortStats();
      
      return () => {
        portDiscoveryService.offPortEvent('*', handlePortEvent);
      };
    }
  }, [isInitialized, handlePortEvent, startHealthCheckLoop, refreshPortStats]);

  // 清理资源
  useEffect(() => {
    return () => {
      if (isInitialized) {
        portDiscoveryService.cleanup().catch(console.error);
      }
    };
  }, [isInitialized]);

  return {
    // 状态
    currentPort,
    isInitialized,
    portStats,
    healthStatus,
    error,
    
    // 方法
    initializeService,
    allocatePort,
    releasePort,
    checkPortAvailability,
    performHealthCheck,
    startHealthCheckLoop,
    handlePortConflict,
    refreshPortStats,
    checkPortConflicts,
    
    // 工具方法
    getServicePort: (service: string) => portDiscoveryService.getServicePort(service),
    reallocatePort: (service: string) => portDiscoveryService.reallocatePort(service),
  };
}