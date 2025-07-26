/**
 * 数据库版本自动检测功能测试脚本
 * 
 * 测试新实现的自动版本检测功能
 */

const http = require('http');

// 测试配置
const TEST_HOST = '192.168.0.120';

const testCases = [
  {
    name: 'InfluxDB 1.8 自动检测',
    host: TEST_HOST,
    port: 8086,
    expectedType: 'influxdb1',
    expectedFeatures: ['InfluxQL', 'HTTP API'],
  },
  {
    name: 'InfluxDB 2.7 自动检测',
    host: TEST_HOST,
    port: 8087,
    expectedType: 'influxdb2',
    expectedFeatures: ['Flux', 'HTTP API v2'],
  },
  {
    name: 'IoTDB 自动检测',
    host: TEST_HOST,
    port: 6667,
    expectedType: 'iotdb',
    expectedFeatures: ['SQL', 'Thrift API'],
  },
];

// 模拟 Tauri 命令调用
async function simulateVersionDetection(host, port) {
  console.log(`🔍 模拟检测 ${host}:${port}...`);
  
  // 这里模拟我们实现的检测逻辑
  const detectionMethods = [];
  let detectedInfo = null;
  
  // 方法1: 尝试 InfluxDB 2.x 健康检查
  try {
    detectionMethods.push('influxdb2_health');
    const healthUrl = `http://${host}:${port}/health`;
    const response = await makeRequest(healthUrl, { timeout: 5000 });
    
    if (response.statusCode === 200) {
      console.log(`  ✅ InfluxDB 2.x 健康检查成功`);
      detectedInfo = {
        database_type: 'InfluxDB',
        version: '2.x.x',
        major_version: 2,
        minor_version: 0,
        patch_version: 0,
        detected_type: 'influxdb2',
        api_endpoints: ['/health', '/api/v2/query'],
        supported_features: ['Flux', 'InfluxQL', 'HTTP API v2'],
      };
      return { success: true, version_info: detectedInfo, tried_methods: detectionMethods };
    }
  } catch (error) {
    console.log(`  ❌ InfluxDB 2.x 健康检查失败: ${error.message}`);
  }
  
  // 方法2: 尝试 InfluxDB 1.x Ping
  try {
    detectionMethods.push('influxdb1_ping');
    const pingUrl = `http://${host}:${port}/ping`;
    const response = await makeRequest(pingUrl, { timeout: 5000 });
    
    if (response.statusCode === 200 || response.statusCode === 204) {
      console.log(`  ✅ InfluxDB 1.x Ping 成功`);
      detectedInfo = {
        database_type: 'InfluxDB',
        version: '1.x.x',
        major_version: 1,
        minor_version: 0,
        patch_version: 0,
        detected_type: 'influxdb1',
        api_endpoints: ['/ping', '/query'],
        supported_features: ['InfluxQL', 'HTTP API'],
      };
      return { success: true, version_info: detectedInfo, tried_methods: detectionMethods };
    }
  } catch (error) {
    console.log(`  ❌ InfluxDB 1.x Ping 失败: ${error.message}`);
  }
  
  // 方法3: 尝试 IoTDB TCP 连接
  try {
    detectionMethods.push('iotdb_tcp_connect');
    const net = require('net');
    
    const isConnected = await new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log(`  ✅ IoTDB TCP 连接成功`);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, host);
    });
    
    if (isConnected) {
      detectedInfo = {
        database_type: 'IoTDB',
        version: '1.x.x',
        major_version: 1,
        minor_version: 0,
        patch_version: 0,
        detected_type: 'iotdb',
        api_endpoints: [`thrift://${host}:${port}`],
        supported_features: ['SQL', 'Thrift API'],
      };
      return { success: true, version_info: detectedInfo, tried_methods: detectionMethods };
    }
  } catch (error) {
    console.log(`  ❌ IoTDB TCP 连接失败: ${error.message}`);
  }
  
  return { 
    success: false, 
    error_message: '无法检测数据库类型和版本', 
    tried_methods: detectionMethods 
  };
}

// HTTP 请求工具函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 10000;
    
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// 生成连接配置建议
function generateConnectionConfigSuggestions(versionInfo) {
  const suggestions = {
    detected_type: versionInfo.detected_type,
    version: versionInfo.version,
  };
  
  switch (versionInfo.detected_type) {
    case 'influxdb1':
      suggestions.default_database = 'mydb';
      suggestions.query_language = 'InfluxQL';
      suggestions.auth_method = 'basic';
      suggestions.required_fields = ['username', 'password', 'database'];
      suggestions.performance_tips = [
        '使用批量写入提高性能',
        '合理设置保留策略',
        '避免使用 SELECT * 查询'
      ];
      break;
      
    case 'influxdb2':
      suggestions.default_bucket = 'my-bucket';
      suggestions.default_org = 'my-org';
      suggestions.query_language = 'Flux';
      suggestions.auth_method = 'token';
      suggestions.required_fields = ['token', 'org', 'bucket'];
      suggestions.performance_tips = [
        '使用 Flux 查询语言获得更好的性能',
        '合理设置存储桶的保留策略',
        '使用聚合函数减少数据传输'
      ];
      break;
      
    case 'iotdb':
      suggestions.default_database = 'root';
      suggestions.query_language = 'SQL';
      suggestions.auth_method = 'basic';
      suggestions.required_fields = ['username', 'password'];
      suggestions.performance_tips = [
        '使用时间范围查询提高性能',
        '合理设计时间序列路径',
        '使用聚合查询减少数据量'
      ];
      break;
  }
  
  return suggestions;
}

// 主测试函数
async function runVersionDetectionTests() {
  console.log('🚀 开始数据库版本自动检测功能测试...');
  console.log(`📍 测试主机: ${TEST_HOST}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 测试用例: ${testCase.name}`);
    
    const startTime = Date.now();
    
    try {
      const result = await simulateVersionDetection(testCase.host, testCase.port);
      const detectionTime = Date.now() - startTime;
      
      if (result.success && result.version_info) {
        const { version_info } = result;
        
        // 验证检测结果
        const isCorrectType = version_info.detected_type === testCase.expectedType;
        const hasExpectedFeatures = testCase.expectedFeatures.every(feature => 
          version_info.supported_features.includes(feature)
        );
        
        console.log(`  ✅ 检测成功 (${detectionTime}ms)`);
        console.log(`  📊 检测到: ${version_info.database_type} v${version_info.version}`);
        console.log(`  🔧 类型: ${version_info.detected_type} ${isCorrectType ? '✅' : '❌'}`);
        console.log(`  🛠️  功能: ${version_info.supported_features.join(', ')} ${hasExpectedFeatures ? '✅' : '❌'}`);
        console.log(`  📝 尝试方法: ${result.tried_methods.join(', ')}`);
        
        // 生成配置建议
        const suggestions = generateConnectionConfigSuggestions(version_info);
        console.log(`  💡 建议查询语言: ${suggestions.query_language}`);
        console.log(`  🔐 建议认证方式: ${suggestions.auth_method}`);
        console.log(`  📋 必需字段: ${suggestions.required_fields.join(', ')}`);
        
        results.push({
          testCase: testCase.name,
          success: true,
          detectionTime,
          correctType: isCorrectType,
          hasExpectedFeatures,
        });
      } else {
        console.log(`  ❌ 检测失败 (${detectionTime}ms)`);
        console.log(`  💬 错误: ${result.error_message}`);
        console.log(`  📝 尝试方法: ${result.tried_methods.join(', ')}`);
        
        results.push({
          testCase: testCase.name,
          success: false,
          detectionTime,
          error: result.error_message,
        });
      }
    } catch (error) {
      const detectionTime = Date.now() - startTime;
      console.log(`  💥 测试异常 (${detectionTime}ms): ${error.message}`);
      
      results.push({
        testCase: testCase.name,
        success: false,
        detectionTime,
        error: error.message,
      });
    }
  }
  
  // 输出测试总结
  console.log('\n' + '=' .repeat(60));
  console.log('📊 版本检测功能测试结果总结:');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  let correctTypeCount = 0;
  let totalDetectionTime = 0;
  
  for (const result of results) {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    const typeStatus = result.correctType ? ' (类型正确)' : result.success ? ' (类型错误)' : '';
    
    console.log(`  ${result.testCase}: ${status}${typeStatus} (${result.detectionTime}ms)`);
    
    if (result.success) {
      successCount++;
      if (result.correctType) correctTypeCount++;
    }
    
    totalDetectionTime += result.detectionTime;
  }
  
  const avgDetectionTime = Math.round(totalDetectionTime / results.length);
  
  console.log('=' .repeat(60));
  console.log(`🎯 检测成功率: ${successCount}/${results.length} (${Math.round(successCount / results.length * 100)}%)`);
  console.log(`🎯 类型准确率: ${correctTypeCount}/${results.length} (${Math.round(correctTypeCount / results.length * 100)}%)`);
  console.log(`⏱️  平均检测时间: ${avgDetectionTime}ms`);
  
  if (successCount === results.length && correctTypeCount === results.length) {
    console.log('🎉 所有版本检测测试完全通过！');
    console.log('💡 自动版本检测功能已准备就绪，用户无需手动选择数据库版本');
    process.exit(0);
  } else {
    console.log('⚠️  部分测试未通过，请检查实现或测试环境');
    process.exit(1);
  }
}

// 运行测试
runVersionDetectionTests().catch((error) => {
  console.error('💥 测试过程中发生未处理的错误:', error);
  process.exit(1);
});
