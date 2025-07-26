/**
 * 数据库连接测试脚本
 * 
 * 直接测试真实数据库连接，不依赖应用启动
 */

const http = require('http');
const https = require('https');

// 测试配置
const TEST_HOST = '192.168.0.120';

const databases = [
  {
    name: 'InfluxDB 1.8',
    type: 'influxdb1',
    host: TEST_HOST,
    port: 8086,
    username: 'admin',
    password: 'abc9987',
    database: 'allbs',
  },
  {
    name: 'InfluxDB 2.7',
    type: 'influxdb2',
    host: TEST_HOST,
    port: 8087,
    username: 'admin',
    password: '6;A]]Hs/GdG4:1Ti',
    org: 'my-org',
    bucket: 'allbs',
    token: '[)^1qm*]Fm+[?|~3}-|2rSt~u/6*6^3q{Z%gru]kQ-9TH',
  },
  {
    name: 'IoTDB',
    type: 'iotdb',
    host: TEST_HOST,
    port: 6667,
    username: 'root',
    password: 'abc9877',
  },
];

// HTTP 请求工具函数
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;
    
    const req = protocol.request(options, (res) => {
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
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// 测试 InfluxDB 1.8 连接
async function testInfluxDB1(config) {
  console.log(`\n🔍 测试 ${config.name} 连接...`);
  
  try {
    // 测试 ping 端点
    const pingOptions = {
      hostname: config.host,
      port: config.port,
      path: '/ping',
      method: 'GET',
    };
    
    const pingResult = await makeRequest(pingOptions);
    console.log(`  ✅ Ping 成功 (状态码: ${pingResult.statusCode})`);
    
    // 测试查询端点
    const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const queryOptions = {
      hostname: config.host,
      port: config.port,
      path: `/query?q=${encodeURIComponent('SHOW DATABASES')}&db=${encodeURIComponent(config.database)}`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    };
    
    const queryResult = await makeRequest(queryOptions);
    console.log(`  ✅ 查询成功 (状态码: ${queryResult.statusCode})`);
    
    if (queryResult.body) {
      try {
        const data = JSON.parse(queryResult.body);
        if (data.results && data.results.length > 0) {
          console.log(`  📊 查询结果: 找到 ${data.results.length} 个结果`);
        }
      } catch (e) {
        console.log(`  📊 查询结果: ${queryResult.body.substring(0, 100)}...`);
      }
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ 连接失败: ${error.message}`);
    return false;
  }
}

// 测试 InfluxDB 2.x 连接
async function testInfluxDB2(config) {
  console.log(`\n🔍 测试 ${config.name} 连接...`);
  
  try {
    // 测试健康检查端点
    const healthOptions = {
      hostname: config.host,
      port: config.port,
      path: '/health',
      method: 'GET',
    };
    
    const healthResult = await makeRequest(healthOptions);
    console.log(`  ✅ 健康检查成功 (状态码: ${healthResult.statusCode})`);
    
    // 测试查询端点
    const queryOptions = {
      hostname: config.host,
      port: config.port,
      path: `/api/v2/query?org=${encodeURIComponent(config.org)}`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.token}`,
        'Content-Type': 'application/vnd.flux',
        'Accept': 'application/csv',
      },
    };

    const fluxQuery = `buckets() |> limit(n: 5)`;
    const queryResult = await makeRequest(queryOptions, fluxQuery);
    console.log(`  ✅ Flux 查询成功 (状态码: ${queryResult.statusCode})`);
    
    if (queryResult.body) {
      console.log(`  📊 查询结果: ${queryResult.body.substring(0, 200)}...`);
    }
    
    return true;
  } catch (error) {
    console.log(`  ❌ 连接失败: ${error.message}`);
    return false;
  }
}

// 测试 IoTDB 连接 (简单的端口检查)
async function testIoTDB(config) {
  console.log(`\n🔍 测试 ${config.name} 连接...`);
  
  try {
    // IoTDB 使用 TCP 连接，这里只能做简单的端口检查
    const net = require('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log(`  ✅ TCP 连接成功 (端口 ${config.port})`);
        socket.destroy();
        resolve(true);
      });
      
      socket.on('error', (error) => {
        console.log(`  ❌ TCP 连接失败: ${error.message}`);
        resolve(false);
      });
      
      socket.on('timeout', () => {
        console.log(`  ❌ TCP 连接超时`);
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(config.port, config.host);
    });
  } catch (error) {
    console.log(`  ❌ 连接失败: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runDatabaseTests() {
  console.log('🚀 开始数据库连接测试...');
  console.log(`📍 测试主机: ${TEST_HOST}`);
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const config of databases) {
    let success = false;
    
    try {
      switch (config.type) {
        case 'influxdb1':
          success = await testInfluxDB1(config);
          break;
        case 'influxdb2':
          success = await testInfluxDB2(config);
          break;
        case 'iotdb':
          success = await testIoTDB(config);
          break;
        default:
          console.log(`\n⚠️  未知数据库类型: ${config.type}`);
      }
    } catch (error) {
      console.log(`\n❌ 测试 ${config.name} 时发生错误: ${error.message}`);
    }
    
    results.push({
      name: config.name,
      type: config.type,
      success: success,
    });
  }
  
  // 输出测试总结
  console.log('\n' + '=' .repeat(50));
  console.log('📊 测试结果总结:');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅ 成功' : '❌ 失败';
    console.log(`  ${result.name}: ${status}`);
    if (result.success) successCount++;
  }
  
  console.log('=' .repeat(50));
  console.log(`🎯 总计: ${successCount}/${results.length} 个数据库连接成功`);
  
  if (successCount === results.length) {
    console.log('🎉 所有数据库连接测试通过！');
    process.exit(0);
  } else {
    console.log('⚠️  部分数据库连接失败，请检查配置和网络连接');
    process.exit(1);
  }
}

// 运行测试
runDatabaseTests().catch((error) => {
  console.error('💥 测试过程中发生未处理的错误:', error);
  process.exit(1);
});
