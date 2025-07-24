/**
 * Tauri 类型安全性测试
 * 用于验证 safeTauriInvoke 的类型修复是否有效
 */

import { safeTauriInvoke } from './tauri';
import type { SystemInfo, HealthStatus, PerformanceMetrics } from '@/types/tauri';

/**
 * 测试类型安全的 Tauri 调用
 */
export class TauriTypeTest {
  /**
   * 测试系统信息获取 - 应该有正确的类型推断
   */
  static async testSystemInfo(): Promise<SystemInfo> {
    // 这应该返回 SystemInfo 类型，不会有 null 类型错误
    return safeTauriInvoke('get_system_info');
  }

  /**
   * 测试健康检查 - 应该有正确的类型推断
   */
  static async testHealthCheck(): Promise<HealthStatus> {
    // 这应该返回 HealthStatus 类型，不会有 null 类型错误
    return safeTauriInvoke('health_check');
  }

  /**
   * 测试性能指标获取 - 使用泛型类型
   */
  static async testPerformanceMetrics(connectionId: string): Promise<PerformanceMetrics> {
    // 使用泛型类型指定返回类型
    return safeTauriInvoke<PerformanceMetrics>('get_performance_metrics', {
      connectionId,
    });
  }

  /**
   * 测试数据质量报告 - 复杂类型
   */
  static async testDataQualityReport(
    connectionId: string,
    database: string,
    table?: string
  ) {
    // 这应该返回正确的复杂类型，不会有 null 类型错误
    return safeTauriInvoke('get_data_quality_report', {
      connectionId,
      database,
      table,
    });
  }

  /**
   * 测试文件对话框 - 可选返回值
   */
  static async testFileDialog(fileName: string) {
    // 这应该返回 FileDialogResult 类型
    return safeTauriInvoke('save_file_dialog', {
      params: {
        default_path: fileName,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      }
    });
  }

  /**
   * 测试 void 返回类型
   */
  static async testVoidCommand(connectionId: string): Promise<void> {
    // 这应该返回 void，不会有类型错误
    return safeTauriInvoke('perform_health_check', {
      connectionId,
    });
  }

  /**
   * 测试自定义类型
   */
  static async testCustomType<T>(command: string, args?: any): Promise<T> {
    // 使用泛型支持自定义类型
    return safeTauriInvoke<T>(command, args);
  }

  /**
   * 运行所有类型测试
   */
  static async runAllTests(): Promise<{
    success: boolean;
    results: Record<string, any>;
    errors: string[];
  }> {
    const results: Record<string, any> = {};
    const errors: string[] = [];

    try {
      console.log('🧪 开始 Tauri 类型安全性测试...');

      // 测试系统信息
      try {
        results.systemInfo = await this.testSystemInfo();
        console.log('✅ 系统信息类型测试通过');
      } catch (error) {
        errors.push(`系统信息测试失败: ${error}`);
      }

      // 测试健康检查
      try {
        results.healthCheck = await this.testHealthCheck();
        console.log('✅ 健康检查类型测试通过');
      } catch (error) {
        errors.push(`健康检查测试失败: ${error}`);
      }

      // 测试文件对话框
      try {
        results.fileDialog = await this.testFileDialog('test.json');
        console.log('✅ 文件对话框类型测试通过');
      } catch (error) {
        errors.push(`文件对话框测试失败: ${error}`);
      }

      console.log('🎉 Tauri 类型安全性测试完成');
      
      return {
        success: errors.length === 0,
        results,
        errors,
      };
    } catch (error) {
      console.error('❌ Tauri 类型测试失败:', error);
      return {
        success: false,
        results,
        errors: [...errors, String(error)],
      };
    }
  }
}

/**
 * 快速测试函数
 */
export const quickTypeTest = async () => {
  console.log('🚀 快速类型测试...');
  
  try {
    // 这些调用应该都有正确的类型推断，不会有编译错误
    const systemInfo = await safeTauriInvoke('get_system_info');
    const healthStatus = await safeTauriInvoke('health_check');
    const appConfig = await safeTauriInvoke('get_app_config');
    
    console.log('✅ 快速类型测试通过', {
      systemInfo: !!systemInfo,
      healthStatus: !!healthStatus,
      appConfig: !!appConfig,
    });
    
    return true;
  } catch (error) {
    console.error('❌ 快速类型测试失败:', error);
    return false;
  }
};

export default TauriTypeTest;
