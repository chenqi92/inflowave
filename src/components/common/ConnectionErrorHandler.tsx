import { useEffect } from 'react';
import { useConnectionStore } from '@/store/connection';
import { toast } from 'sonner';

/**
 * 连接错误处理组件
 * 监听连接状态变化，为用户提供友好的错误提示
 */
export function ConnectionErrorHandler() {
  const connectionStatuses = useConnectionStore(state => state.connectionStatuses);
  
  useEffect(() => {
    Object.values(connectionStatuses).forEach(status => {
      if (!status?.error) return;
      
      const errorMessage = status.error;
      
      // 处理连接配置被删除的情况
      if (errorMessage.includes('连接配置已被删除')) {
        toast.error('连接配置冲突', {
          description: '检测到连接配置已在其他应用实例中被删除，已自动清理本地缓存',
          duration: 5000,
          action: {
            label: '了解更多',
            onClick: () => {
              toast.info('多实例同步', {
                description: '当同时运行多个应用实例时，连接配置会自动同步。如需避免此问题，请关闭其他实例。',
                duration: 8000,
              });
            },
          },
        });
      }
      // 处理一般连接错误
      else if (status.status === 'error' && errorMessage) {
        // 避免重复显示相同错误
        const errorKey = `connection-error-${status.id}-${errorMessage}`;
        if (!sessionStorage.getItem(errorKey)) {
          sessionStorage.setItem(errorKey, Date.now().toString());
          
          toast.error('连接失败', {
            description: errorMessage.length > 80 
              ? `${errorMessage.substring(0, 80)}...`
              : errorMessage,
            duration: 4000,
          });
          
          // 5分钟后清除错误记录，允许再次显示
          setTimeout(() => {
            sessionStorage.removeItem(errorKey);
          }, 5 * 60 * 1000);
        }
      }
    });
  }, [connectionStatuses]);
  
  return null; // 这是一个无UI的监听组件
}

export default ConnectionErrorHandler;