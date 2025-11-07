/**
 * 性能监控健康检查工具
 */

import { safeTauriInvoke } from './tauri';
import { showMessage } from './message';
import logger from '@/utils/logger';

export interface HealthCheckResult {
  system_monitoring: boolean;
  memory_usage_mb: number;
  overflow_risk: boolean;
  timestamp: string;
}

/**
 * 执行性能监控健康检查
 */
export async function performHealthCheck(): Promise<HealthCheckResult | null> {
  try {
    logger.debug('🔍 开始执行性能监控健康检查...');
    
    const result = await safeTauriInvoke<HealthCheckResult>('check_performance_monitoring_health');
    
    logger.debug('✅ 健康检查完成:', result);
    
    // 检查是否有警告
    // if (result.overflow_risk) {
    //   showMessage.warning(`内存使用量较高: ${result.memory_usage_mb}MB，建议关注系统性能`);
    // }
    
    if (!result.system_monitoring) {
      showMessage.error('系统监控功能异常，请检查系统状态');
    }
    
    return result;
  } catch (error) {
    logger.error('❌ 健康检查失败:', error);
    showMessage.error(`健康检查失败: ${error}`);
    return null;
  }
}

/**
 * 定期健康检查
 */
export class PerformanceHealthMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * 开始定期健康检查
   * @param intervalMinutes 检查间隔（分钟）
   */
  start(intervalMinutes: number = 30) {
    if (this.isRunning) {
      logger.warn('健康检查已在运行中');
      return;
    }

    logger.info(`🚀 启动定期健康检查，间隔: ${intervalMinutes} 分钟`);
    
    this.isRunning = true;
    
    // 立即执行一次
    performHealthCheck();
    
    // 设置定期检查
    this.intervalId = setInterval(() => {
      performHealthCheck();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * 停止定期健康检查
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    logger.info('🛑 已停止定期健康检查');
  }

  /**
   * 检查是否正在运行
   */
  get running() {
    return this.isRunning;
  }
}

// 导出全局实例
export const healthMonitor = new PerformanceHealthMonitor();

/**
 * 在应用启动时自动开始健康检查
 */
export function initializeHealthCheck() {
  // 延迟5秒后开始，避免应用启动时的性能影响
  setTimeout(() => {
    healthMonitor.start(30); // 每30分钟检查一次
  }, 5000);
}
