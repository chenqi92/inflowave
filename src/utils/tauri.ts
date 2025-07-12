/**
 * Tauri 环境检测和兼容性工具
 */

// 扩展 Window 接口以包含 Tauri 特定的属性
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

// 检查是否在 Tauri 环境中运行
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         window.__TAURI__ !== undefined;
};

// 检查是否在浏览器开发环境中
export const isBrowserEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         window.__TAURI__ === undefined;
};

// 安全的 Tauri API 调用包装器
export const safeTauriInvoke = async <T = any>(
  command: string,
  args?: Record<string, any>
): Promise<T | null> => {
  const isRunningInTauri = isTauriEnvironment();
  console.log(`🚀 API 调用: ${command}`, {
    args,
    environment: isRunningInTauri ? 'Tauri' : 'Browser',
    willUseMockData: !isRunningInTauri
  });
  
  if (!isRunningInTauri) {
    console.warn(`🌐 Tauri command "${command}" called in browser environment, returning mock data`);
    const mockResult = getMockData<T>(command, args);
    console.log(`🤖 模拟数据返回:`, mockResult);
    return mockResult;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<T>(command, args);
    console.log(`✅ Tauri API 返回结果 (${command}):`, result);
    return result;
  } catch (error) {
    console.error(`❌ Tauri invoke error for command "${command}":`, error);
    throw error;
  }
};

// 安全的 Tauri 事件监听包装器
export const safeTauriListen = async <T = any>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> => {
  if (!isTauriEnvironment()) {
    console.warn(`Tauri event listener "${event}" called in browser environment, using mock handler`);
    // 返回一个空的取消监听函数
    return () => {};
  }

  try {
    const { listen } = await import('@tauri-apps/api/event');
    const unlisten = await listen<T>(event, handler);
    return unlisten;
  } catch (error) {
    console.error(`Tauri event listener error for event "${event}":`, error);
    // 返回一个空的取消监听函数
    return () => {};
  }
};

// 模拟数据生成器
const getMockData = <T = any>(command: string, args?: Record<string, any>): T | null => {
  console.log(`Mock data for command: ${command}`, args);
  
  switch (command) {
    case 'get_app_config':
      return {
        theme: 'light',
        language: 'zh-CN',
        autoSave: true,
        queryTimeout: 30000,
        maxConnections: 10,
        enableNotifications: true,
        logLevel: 'info'
      } as T;
      
    case 'get_connections':
      return [
        {
          id: 'demo-connection-1',
          name: '演示连接 (模拟数据)',
          host: 'demo.example.com',
          port: 8086,
          database: 'demo_db',
          username: 'demo_user',
          ssl: false,
          status: 'disconnected',
          lastConnected: null
        },
        {
          id: 'demo-connection-2', 
          name: '示例远程连接',
          host: 'remote.example.com',
          port: 8086,
          database: 'sample_db',
          username: 'readonly',
          ssl: true,
          status: 'disconnected',
          lastConnected: null
        }
      ] as T;
      
    case 'test_connection':
      return {
        success: true,
        message: '连接测试成功 (模拟)',
        latency: Math.floor(Math.random() * 100) + 10,
        version: '1.8.10'
      } as T;
      
    case 'get_databases':
      return [
        'mydb',
        'telegraf', 
        '_internal',
        'test_db'  // 添加测试数据库
      ] as T;

    case 'get_database_info':
      const dbName = args?.database;
      const dbInfoMap: Record<string, any> = {
        'mydb': { name: 'mydb', retentionPolicies: ['autogen'], measurementCount: 5 },
        'telegraf': { name: 'telegraf', retentionPolicies: ['autogen', '30d'], measurementCount: 12 },
        '_internal': { name: '_internal', retentionPolicies: ['monitor'], measurementCount: 3 },
        'test_db': { name: 'test_db', retentionPolicies: ['autogen'], measurementCount: 5 }
      };
      return dbInfoMap[dbName || 'mydb'] || null as T;

    case 'get_measurements':
      const dbParam = args?.database;
      const measurementsMap: Record<string, string[]> = {
        'mydb': [
          'cpu',
          'memory', 
          'disk',
          'network',
          'temperature'
        ],
        'telegraf': [
          'cpu',
          'mem',
          'disk',
          'net',
          'system'
        ],
        '_internal': [
          'database',
          'httpd',
          'write'
        ],
        'test_db': [
          'sensor_data',        // IoT传感器数据
          'system_metrics',     // 系统监控数据
          'business_metrics',   // 业务指标数据
          'network_traffic',    // 网络流量数据
          'app_performance'     // 应用性能数据
        ]
      };
      return measurementsMap[dbParam || 'mydb'] || measurementsMap['mydb'] as T;

    case 'get_retention_policies':
      const database = args?.database;
      const policiesMap: Record<string, any[]> = {
        'mydb': [
          { name: 'autogen', duration: '0s', shardGroupDuration: '168h', replicationFactor: 1, default: true }
        ],
        'telegraf': [
          { name: 'autogen', duration: '0s', shardGroupDuration: '168h', replicationFactor: 1, default: true },
          { name: '30d', duration: '720h', shardGroupDuration: '24h', replicationFactor: 1, default: false }
        ],
        '_internal': [
          { name: 'monitor', duration: '168h', shardGroupDuration: '24h', replicationFactor: 1, default: true }
        ],
        'test_db': [
          { name: 'autogen', duration: '0s', shardGroupDuration: '168h', replicationFactor: 1, default: true }
        ]
      };
      return policiesMap[database || 'mydb'] || [] as T;
      
    case 'execute_query':
      return {
        results: [
          {
            series: [
              {
                name: 'cpu',
                columns: ['time', 'host', 'usage_idle'],
                values: [
                  ['2024-01-01T00:00:00Z', 'server01', 85.5],
                  ['2024-01-01T00:01:00Z', 'server01', 82.3],
                  ['2024-01-01T00:02:00Z', 'server01', 88.1]
                ]
              }
            ]
          }
        ]
      } as T;
      
    case 'get_system_info':
      return {
        os: 'Browser',
        arch: 'wasm32',
        version: '1.0.0',
        memory: {
          total: 8589934592,
          available: 4294967296
        },
        cpu: {
          cores: 8,
          usage: 25.5
        }
      } as T;

    // 扩展管理模拟数据
    case 'get_installed_plugins':
      return [
        {
          id: 'plugin-1',
          name: 'InfluxDB 数据导出器',
          version: '1.2.0',
          description: '支持多种格式的数据导出功能',
          enabled: true,
          author: 'InfloWave Team'
        },
        {
          id: 'plugin-2',
          name: 'Grafana 集成',
          version: '2.1.0',
          description: '与 Grafana 仪表板的无缝集成',
          enabled: false,
          author: 'Community'
        }
      ] as T;

    case 'get_api_integrations':
      return [
        {
          id: 'api-1',
          name: 'Slack 通知',
          integration_type: 'webhook',
          endpoint: 'https://hooks.slack.com/services/...',
          enabled: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      ] as T;

    case 'get_webhooks':
      return [
        {
          id: 'webhook-1',
          name: '数据异常告警',
          url: 'https://api.example.com/webhook',
          events: ['data_anomaly', 'connection_lost'],
          enabled: true
        }
      ] as T;

    case 'get_automation_rules':
      return [
        {
          id: 'rule-1',
          name: '自动备份规则',
          description: '每日凌晨自动备份数据库',
          enabled: true,
          trigger: { type: 'schedule', cron: '0 0 * * *' },
          actions: [{ type: 'backup', config: {} }]
        }
      ] as T;

    // 性能监控模拟数据
    case 'get_performance_metrics':
      return {
        cpu_usage: Math.random() * 100,
        memory_usage: Math.random() * 100,
        disk_usage: Math.random() * 100,
        network_io: {
          bytes_in: Math.floor(Math.random() * 1000000),
          bytes_out: Math.floor(Math.random() * 1000000)
        },
        query_performance: {
          avg_response_time: Math.random() * 1000,
          queries_per_second: Math.random() * 100
        },
        connection_count: Math.floor(Math.random() * 50),
        uptime: Math.floor(Math.random() * 86400)
      } as T;

    case 'get_slow_query_analysis':
      return [
        {
          query: 'SELECT * FROM cpu WHERE time > now() - 1h',
          duration: 2500,
          timestamp: '2024-01-01T12:00:00Z',
          database: 'telegraf'
        },
        {
          query: 'SELECT mean(usage_idle) FROM cpu GROUP BY time(1m)',
          duration: 1800,
          timestamp: '2024-01-01T11:30:00Z',
          database: 'monitoring'
        }
      ] as T;

    default:
      console.warn(`No mock data available for command: ${command}`);
      return null;
  }
};

// 环境信息
export const getEnvironmentInfo = () => {
  return {
    isTauri: isTauriEnvironment(),
    isBrowser: isBrowserEnvironment(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
    platform: typeof window !== 'undefined' ? window.navigator.platform : 'Unknown'
  };
};

// 显示环境警告
export const showEnvironmentWarning = () => {
  if (isBrowserEnvironment()) {
    console.warn(
      '%c🌐 浏览器开发模式',
      'color: #ff9800; font-size: 14px; font-weight: bold;',
      '\n当前在浏览器中运行，Tauri API 不可用。\n正在使用模拟数据进行开发。\n要体验完整功能，请使用 `npm run tauri:dev` 启动。'
    );
  }
};

// 初始化环境检测
export const initializeEnvironment = () => {
  const envInfo = getEnvironmentInfo();
  
  console.log('🔍 环境信息:', envInfo);
  
  if (envInfo.isBrowser) {
    showEnvironmentWarning();
  }
  
  return envInfo;
};
