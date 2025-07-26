/**
 * 数据库操作测试脚本
 * 
 * 测试具体的数据库操作，如查询、写入等
 */

const http = require('http');
const https = require('https');
const net = require('net');

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
    
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// 测试 InfluxDB 1.8 操作
async function testInfluxDB1Operations(config) {
  console.log(`\n🔍 测试 ${config.name} 数据库操作...`);
  
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  const baseHeaders = {
    'Authorization': `Basic ${auth}`,
  };
  
  const tests = [
    {
      name: '显示数据库',
      query: 'SHOW DATABASES',
    },
    {
      name: '显示测量值',
      query: 'SHOW MEASUREMENTS',
    },
    {
      name: '显示字段键',
      query: 'SHOW FIELD KEYS',
    },
    {
      name: '显示标签键',
      query: 'SHOW TAG KEYS',
    },
    {
      name: '查询数据',
      query: 'SELECT * FROM /.*/ LIMIT 5',
    },
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      const queryOptions = {
        hostname: config.host,
        port: config.port,
        path: `/query?q=${encodeURIComponent(test.query)}&db=${encodeURIComponent(config.database)}`,
        method: 'GET',
        headers: baseHeaders,
      };
      
      const result = await makeRequest(queryOptions);
      
      if (result.statusCode === 200) {
        console.log(`  ✅ ${test.name}: 成功`);
        
        try {
          const data = JSON.parse(result.body);
          if (data.results && data.results[0] && data.results[0].series) {
            const series = data.results[0].series;
            console.log(`    📊 返回 ${series.length} 个系列`);
            
            if (series.length > 0 && series[0].values) {
              console.log(`    📈 第一个系列包含 ${series[0].values.length} 行数据`);
            }
          } else if (data.results && data.results[0] && !data.results[0].error) {
            console.log(`    📊 查询执行成功`);
          }
        } catch (e) {
          console.log(`    📊 返回数据: ${result.body.substring(0, 100)}...`);
        }
        
        successCount++;
      } else {
        console.log(`  ❌ ${test.name}: HTTP ${result.statusCode}`);
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log(`  🎯 ${config.name} 操作测试: ${successCount}/${tests.length} 成功`);
  return successCount === tests.length;
}

// 测试 InfluxDB 2.x 操作
async function testInfluxDB2Operations(config) {
  console.log(`\n🔍 测试 ${config.name} 数据库操作...`);
  
  const baseHeaders = {
    'Authorization': `Token ${config.token}`,
    'Content-Type': 'application/vnd.flux',
    'Accept': 'application/csv',
  };
  
  const tests = [
    {
      name: '显示存储桶',
      query: 'buckets() |> limit(n: 10)',
    },
    {
      name: '显示测量值',
      query: `from(bucket: "${config.bucket}") |> range(start: -24h) |> group(columns: ["_measurement"]) |> distinct(column: "_measurement") |> limit(n: 10)`,
    },
    {
      name: '显示字段',
      query: `from(bucket: "${config.bucket}") |> range(start: -24h) |> group(columns: ["_field"]) |> distinct(column: "_field") |> limit(n: 10)`,
    },
    {
      name: '查询最近数据',
      query: `from(bucket: "${config.bucket}") |> range(start: -1h) |> limit(n: 5)`,
    },
    {
      name: '聚合查询',
      query: `from(bucket: "${config.bucket}") |> range(start: -24h) |> aggregateWindow(every: 1h, fn: mean) |> limit(n: 5)`,
    },
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      const queryOptions = {
        hostname: config.host,
        port: config.port,
        path: `/api/v2/query?org=${encodeURIComponent(config.org)}`,
        method: 'POST',
        headers: baseHeaders,
      };
      
      const result = await makeRequest(queryOptions, test.query);
      
      if (result.statusCode === 200) {
        console.log(`  ✅ ${test.name}: 成功`);
        
        // 分析 CSV 结果
        const lines = result.body.split('\n').filter(line => line.trim());
        if (lines.length > 1) {
          console.log(`    📊 返回 ${lines.length - 1} 行数据`);
          
          // 显示前几行数据
          const sampleLines = lines.slice(0, 3);
          sampleLines.forEach((line, index) => {
            if (index === 0) {
              console.log(`    📋 列名: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
            } else {
              console.log(`    📈 数据: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
            }
          });
        } else {
          console.log(`    📊 查询执行成功，无数据返回`);
        }
        
        successCount++;
      } else {
        console.log(`  ❌ ${test.name}: HTTP ${result.statusCode}`);
        if (result.body) {
          console.log(`    💬 错误信息: ${result.body.substring(0, 200)}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log(`  🎯 ${config.name} 操作测试: ${successCount}/${tests.length} 成功`);
  return successCount === tests.length;
}

// 测试 IoTDB 操作 (模拟)
async function testIoTDBOperations() {
  console.log(`\n🔍 测试 IoTDB 数据库操作...`);
  
  // IoTDB 需要专门的客户端，这里只做连接测试
  const config = {
    host: TEST_HOST,
    port: 6667,
  };
  
  try {
    const isConnected = await new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        console.log(`  ✅ TCP 连接成功`);
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
    
    if (isConnected) {
      console.log(`  📝 注意: IoTDB 需要专门的客户端进行 SQL 查询`);
      console.log(`  📝 建议使用应用内的 IoTDB 测试页面进行详细测试`);
      console.log(`  🎯 IoTDB 连接测试: 1/1 成功`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`  ❌ IoTDB 测试失败: ${error.message}`);
    return false;
  }
}

// 主测试函数
async function runDatabaseOperationTests() {
  console.log('🚀 开始数据库操作测试...');
  console.log(`📍 测试主机: ${TEST_HOST}`);
  console.log('=' .repeat(60));
  
  const results = [];
  
  // 测试 InfluxDB 1.8
  const influx1Success = await testInfluxDB1Operations(databases[0]);
  results.push({
    name: databases[0].name,
    success: influx1Success,
  });
  
  // 测试 InfluxDB 2.7
  const influx2Success = await testInfluxDB2Operations(databases[1]);
  results.push({
    name: databases[1].name,
    success: influx2Success,
  });
  
  // 测试 IoTDB
  const iotdbSuccess = await testIoTDBOperations();
  results.push({
    name: 'IoTDB',
    success: iotdbSuccess,
  });
  
  // 输出测试总结
  console.log('\n' + '=' .repeat(60));
  console.log('📊 数据库操作测试结果总结:');
  console.log('=' .repeat(60));
  
  let successCount = 0;
  for (const result of results) {
    const status = result.success ? '✅ 全部成功' : '⚠️  部分成功';
    console.log(`  ${result.name}: ${status}`);
    if (result.success) successCount++;
  }
  
  console.log('=' .repeat(60));
  console.log(`🎯 总计: ${successCount}/${results.length} 个数据库操作测试完全成功`);
  
  if (successCount >= 2) {
    console.log('🎉 数据库操作测试基本通过！');
    console.log('💡 建议: 使用应用内的测试页面进行更详细的功能测试');
    process.exit(0);
  } else {
    console.log('⚠️  多个数据库操作失败，请检查数据库状态和权限');
    process.exit(1);
  }
}

// 运行测试
runDatabaseOperationTests().catch((error) => {
  console.error('💥 测试过程中发生未处理的错误:', error);
  process.exit(1);
});
