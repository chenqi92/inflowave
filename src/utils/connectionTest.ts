/**
 * 前后端通信测试工具
 */
import { safeTauriInvoke } from './tauri';
import logger from '@/utils/logger';

export const testBackendConnection = async () => {
  logger.debug('🔍 开始测试前后端通信...');
  
  try {
    // 测试基础系统信息
    const systemInfo = await safeTauriInvoke<any>('get_system_info');
    logger.debug('✅ 系统信息获取成功:', systemInfo);

    // 测试健康检查
    const healthStatus = await safeTauriInvoke<any>('health_check');
    logger.debug('✅ 健康检查成功:', healthStatus);

    // 测试连接管理
    const connections = await safeTauriInvoke<any>('get_connections');
    logger.debug('✅ 连接列表获取成功:', connections);

    // 测试应用配置
    const appConfig = await safeTauriInvoke<any>('get_app_config');
    logger.debug('✅ 应用配置获取成功:', appConfig);
    
    return {
      success: true,
      message: '前后端通信正常',
      details: {
        systemInfo,
        healthStatus,
        connections,
        appConfig
      }
    };
    
  } catch (error) {
    logger.error('❌ 前后端通信测试失败:', error);
    return {
      success: false,
      message: '前后端通信失败',
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const testSpecificCommand = async (command: string, args?: any) => {
  logger.debug(`🔍 测试命令: ${command}`, args);
  
  try {
    const result = await safeTauriInvoke<any>(command, args);
    logger.debug(`✅ 命令 ${command} 执行成功:`, result);
    return { success: true, result };
  } catch (error) {
    logger.error(`❌ 命令 ${command} 执行失败:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
};

export const runComprehensiveTest = async () => {
  logger.info('🚀 开始综合测试...');
  
  const testCommands = [
    'get_system_info',
    'health_check',
    'get_connections',
    'get_app_config',
    'get_app_settings',
    'get_query_history',
    'get_saved_queries',
    'get_dashboards',
    'get_user_preferences'
  ];
  
  const results = [];
  
  for (const command of testCommands) {
    const result = await testSpecificCommand(command);
    results.push({ command, ...result });
    
    // 添加延迟以避免过快的请求
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  
  logger.info(`📊 测试结果统计: ${successCount} 成功, ${failureCount} 失败`);
  
  return {
    summary: {
      total: results.length,
      success: successCount,
      failure: failureCount,
      successRate: (successCount / results.length) * 100
    },
    details: results
  };
};