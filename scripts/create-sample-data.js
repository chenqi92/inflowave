#!/usr/bin/env node

/**
 * InfluxDB 示例数据创建脚本
 * 创建示例数据库、测量表和数据
 */

import fetch from 'node-fetch';

// InfluxDB 连接配置
const INFLUX_CONFIG = {
  url: 'http://192.168.0.120:8086',
  username: 'admin',
  password: 'abc9877',
  timeout: 10000
};

/**
 * 执行 InfluxQL 查询
 */
async function executeQuery(query, database = '') {
  const params = new URLSearchParams({
    q: query,
    pretty: 'true'
  });
  
  if (database) {
    params.append('db', database);
  }
  
  const url = `${INFLUX_CONFIG.url}/query?${params.toString()}`;
  
  try {
    console.log(`执行查询: ${query}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${INFLUX_CONFIG.username}:${INFLUX_CONFIG.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: INFLUX_CONFIG.timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ 查询成功');
    return data;
  } catch (error) {
    console.error(`❌ 查询失败: ${error.message}`);
    throw error;
  }
}

/**
 * 写入数据到 InfluxDB
 */
async function writeData(database, data) {
  const url = `${INFLUX_CONFIG.url}/write?db=${database}&precision=s`;
  
  try {
    console.log(`写入数据到数据库: ${database}`);
    console.log(`数据: ${data}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${INFLUX_CONFIG.username}:${INFLUX_CONFIG.password}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: data,
      timeout: INFLUX_CONFIG.timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
    
    console.log('✅ 数据写入成功');
    return true;
  } catch (error) {
    console.error(`❌ 数据写入失败: ${error.message}`);
    throw error;
  }
}

/**
 * 创建数据库
 */
async function createDatabase(dbName) {
  try {
    console.log(`\n=== 创建数据库: ${dbName} ===`);
    await executeQuery(`CREATE DATABASE "${dbName}"`);
    console.log(`数据库 "${dbName}" 创建成功`);
  } catch (error) {
    if (error.message.includes('database already exists')) {
      console.log(`数据库 "${dbName}" 已存在`);
    } else {
      throw error;
    }
  }
}

/**
 * 生成时间序列数据
 */
function generateTimeSeriesData(measurement, tags, fields, count = 100, intervalSeconds = 60) {
  const data = [];
  const now = Math.floor(Date.now() / 1000);
  
  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i - 1) * intervalSeconds;
    
    // 构建标签字符串
    const tagString = Object.entries(tags).map(([key, value]) => `${key}=${value}`).join(',');
    
    // 构建字段字符串
    const fieldString = Object.entries(fields).map(([key, valueFunc]) => {
      const value = typeof valueFunc === 'function' ? valueFunc(i) : valueFunc;
      return `${key}=${value}`;
    }).join(',');
    
    data.push(`${measurement},${tagString} ${fieldString} ${timestamp}`);
  }
  
  return data.join('\n');
}

/**
 * 创建示例数据
 */
async function createSampleData() {
  console.log('InfluxDB 示例数据创建工具');
  console.log('================================');
  
  try {
    // 1. 创建监控数据库
    await createDatabase('monitoring');
    
    // 2. 创建系统监控数据
    console.log('\n=== 创建系统监控数据 ===');
    
    // CPU 使用率数据
    const cpuData = generateTimeSeriesData(
      'cpu_usage',
      { host: 'server01', region: 'us-west' },
      {
        usage_percent: (i) => (50 + Math.sin(i * 0.1) * 20 + Math.random() * 10).toFixed(2),
        load_avg: (i) => (1.5 + Math.sin(i * 0.05) * 0.5 + Math.random() * 0.3).toFixed(2)
      },
      200,
      30
    );
    await writeData('monitoring', cpuData);
    
    // 内存使用率数据
    const memoryData = generateTimeSeriesData(
      'memory_usage',
      { host: 'server01', region: 'us-west' },
      {
        used_percent: (i) => (60 + Math.sin(i * 0.08) * 15 + Math.random() * 8).toFixed(2),
        available_gb: (i) => (32 - (60 + Math.sin(i * 0.08) * 15 + Math.random() * 8) * 0.32).toFixed(2)
      },
      200,
      30
    );
    await writeData('monitoring', memoryData);
    
    // 磁盘 I/O 数据
    const diskData = generateTimeSeriesData(
      'disk_io',
      { host: 'server01', device: 'sda1' },
      {
        read_bytes: (i) => Math.floor(1000000 + Math.random() * 500000),
        write_bytes: (i) => Math.floor(800000 + Math.random() * 400000),
        iops: (i) => Math.floor(100 + Math.random() * 50)
      },
      200,
      30
    );
    await writeData('monitoring', diskData);
    
    // 3. 创建业务数据库
    await createDatabase('business');
    
    console.log('\n=== 创建业务数据 ===');
    
    // 网站访问数据
    const webTrafficData = generateTimeSeriesData(
      'web_traffic',
      { site: 'www.example.com', region: 'global' },
      {
        page_views: (i) => Math.floor(1000 + Math.sin(i * 0.2) * 500 + Math.random() * 200),
        unique_visitors: (i) => Math.floor(800 + Math.sin(i * 0.15) * 300 + Math.random() * 100),
        bounce_rate: (i) => (0.3 + Math.sin(i * 0.1) * 0.1 + Math.random() * 0.05).toFixed(3)
      },
      150,
      300
    );
    await writeData('business', webTrafficData);
    
    // 销售数据
    const salesData = generateTimeSeriesData(
      'sales',
      { store: 'store_001', category: 'electronics' },
      {
        revenue: (i) => (5000 + Math.sin(i * 0.3) * 2000 + Math.random() * 1000).toFixed(2),
        orders: (i) => Math.floor(50 + Math.sin(i * 0.25) * 20 + Math.random() * 10),
        avg_order_value: (i) => (100 + Math.random() * 50).toFixed(2)
      },
      100,
      3600
    );
    await writeData('business', salesData);
    
    // 4. 创建传感器数据库
    await createDatabase('sensors');
    
    console.log('\n=== 创建传感器数据 ===');
    
    // 温度传感器数据
    const temperatureData = generateTimeSeriesData(
      'temperature',
      { sensor_id: 'temp_001', location: 'warehouse_a' },
      {
        celsius: (i) => (20 + Math.sin(i * 0.1) * 5 + Math.random() * 2).toFixed(1),
        humidity: (i) => (45 + Math.sin(i * 0.08) * 10 + Math.random() * 5).toFixed(1)
      },
      300,
      60
    );
    await writeData('sensors', temperatureData);
    
    // 压力传感器数据
    const pressureData = generateTimeSeriesData(
      'pressure',
      { sensor_id: 'press_001', location: 'pipeline_1' },
      {
        psi: (i) => (100 + Math.sin(i * 0.05) * 20 + Math.random() * 5).toFixed(2),
        flow_rate: (i) => (50 + Math.sin(i * 0.07) * 10 + Math.random() * 3).toFixed(2)
      },
      250,
      120
    );
    await writeData('sensors', pressureData);
    
    // 5. 创建日志数据库
    await createDatabase('logs');
    
    console.log('\n=== 创建日志数据 ===');
    
    // 应用日志数据
    const logLevels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const logData = generateTimeSeriesData(
      'application_logs',
      { service: 'api_server', environment: 'production' },
      {
        count: (i) => Math.floor(10 + Math.random() * 20),
        level: () => `"${logLevels[Math.floor(Math.random() * logLevels.length)]}"`,
        response_time_ms: (i) => Math.floor(50 + Math.random() * 200)
      },
      180,
      60
    );
    await writeData('logs', logData);
    
    console.log('\n=== 数据创建完成 ===');
    console.log('已创建以下数据库和测量表:');
    console.log('1. monitoring 数据库:');
    console.log('   - cpu_usage (CPU使用率)');
    console.log('   - memory_usage (内存使用率)');
    console.log('   - disk_io (磁盘I/O)');
    console.log('2. business 数据库:');
    console.log('   - web_traffic (网站流量)');
    console.log('   - sales (销售数据)');
    console.log('3. sensors 数据库:');
    console.log('   - temperature (温度传感器)');
    console.log('   - pressure (压力传感器)');
    console.log('4. logs 数据库:');
    console.log('   - application_logs (应用日志)');
    
  } catch (error) {
    console.error('创建示例数据失败:', error);
    process.exit(1);
  }
}

// 运行主函数
createSampleData().catch(error => {
  console.error('程序执行失败:', error);
  process.exit(1);
});

export {
  executeQuery,
  writeData,
  createDatabase,
  generateTimeSeriesData
};
