#!/usr/bin/env node

/**
 * InfluxDB 数据库和表查询脚本
 * 用于查询指定 InfluxDB 实例中的所有数据库和测量表
 */

import fetch from 'node-fetch';

// InfluxDB 连接配置
const INFLUX_CONFIG = {
  url: 'http://192.168.0.120:8086',
  token: '', // InfluxDB 2.x 使用 token，1.x 使用用户名密码
  username: 'admin',
  password: 'abc9877',
  timeout: 10000 // 10秒超时
};

/**
 * 创建 InfluxDB 连接
 */
function createInfluxConnection() {
  // 对于 InfluxDB 1.x，我们需要使用不同的方法
  // 这里我们使用基本的 HTTP 请求来查询
  return {
    url: INFLUX_CONFIG.url,
    auth: {
      username: INFLUX_CONFIG.username,
      password: INFLUX_CONFIG.password
    }
  };
}

/**
 * 执行 InfluxQL 查询
 */
async function executeQuery(query, database = '') {
  
  const config = createInfluxConnection();
  const params = new URLSearchParams({
    q: query,
    pretty: 'true'
  });
  
  if (database) {
    params.append('db', database);
  }
  
  const url = `${config.url}/query?${params.toString()}`;
  
  try {
    console.log(`执行查询: ${query}`);
    console.log(`请求URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      timeout: INFLUX_CONFIG.timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`查询失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有数据库
 */
async function getDatabases() {
  try {
    console.log('\n=== 查询所有数据库 ===');
    const result = await executeQuery('SHOW DATABASES');
    
    if (result.results && result.results[0] && result.results[0].series) {
      const databases = result.results[0].series[0].values.map(row => row[0]);
      console.log('找到的数据库:');
      databases.forEach((db, index) => {
        console.log(`  ${index + 1}. ${db}`);
      });
      return databases;
    } else {
      console.log('未找到数据库');
      return [];
    }
  } catch (error) {
    console.error('获取数据库列表失败:', error.message);
    return [];
  }
}

/**
 * 获取指定数据库中的所有测量表
 */
async function getMeasurements(database) {
  try {
    console.log(`\n=== 查询数据库 "${database}" 中的测量表 ===`);
    const result = await executeQuery('SHOW MEASUREMENTS', database);
    
    if (result.results && result.results[0] && result.results[0].series) {
      const measurements = result.results[0].series[0].values.map(row => row[0]);
      console.log(`数据库 "${database}" 中的测量表:`);
      measurements.forEach((measurement, index) => {
        console.log(`  ${index + 1}. ${measurement}`);
      });
      return measurements;
    } else {
      console.log(`数据库 "${database}" 中未找到测量表`);
      return [];
    }
  } catch (error) {
    console.error(`获取数据库 "${database}" 的测量表失败:`, error.message);
    return [];
  }
}

/**
 * 获取测量表的字段信息
 */
async function getFieldKeys(database, measurement) {
  try {
    console.log(`\n--- 查询测量表 "${measurement}" 的字段信息 ---`);
    const result = await executeQuery(`SHOW FIELD KEYS FROM "${measurement}"`, database);
    
    if (result.results && result.results[0] && result.results[0].series) {
      const fields = result.results[0].series[0].values.map(row => ({
        name: row[0],
        type: row[1]
      }));
      console.log(`测量表 "${measurement}" 的字段:`);
      fields.forEach((field, index) => {
        console.log(`    ${index + 1}. ${field.name} (${field.type})`);
      });
      return fields;
    } else {
      console.log(`测量表 "${measurement}" 中未找到字段`);
      return [];
    }
  } catch (error) {
    console.error(`获取测量表 "${measurement}" 的字段信息失败:`, error.message);
    return [];
  }
}

/**
 * 获取测量表的标签信息
 */
async function getTagKeys(database, measurement) {
  try {
    console.log(`\n--- 查询测量表 "${measurement}" 的标签信息 ---`);
    const result = await executeQuery(`SHOW TAG KEYS FROM "${measurement}"`, database);
    
    if (result.results && result.results[0] && result.results[0].series) {
      const tags = result.results[0].series[0].values.map(row => row[0]);
      console.log(`测量表 "${measurement}" 的标签:`);
      tags.forEach((tag, index) => {
        console.log(`    ${index + 1}. ${tag}`);
      });
      return tags;
    } else {
      console.log(`测量表 "${measurement}" 中未找到标签`);
      return [];
    }
  } catch (error) {
    console.error(`获取测量表 "${measurement}" 的标签信息失败:`, error.message);
    return [];
  }
}

/**
 * 测试连接
 */
async function testConnection() {
  try {
    console.log('=== 测试 InfluxDB 连接 ===');
    console.log(`连接地址: ${INFLUX_CONFIG.url}`);
    console.log(`用户名: ${INFLUX_CONFIG.username}`);
    
    const result = await executeQuery('SHOW DATABASES');
    console.log('✅ 连接成功!');
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('InfluxDB 数据库和表查询工具');
  console.log('================================');
  
  // 测试连接
  const connected = await testConnection();
  if (!connected) {
    console.log('\n请检查 InfluxDB 连接配置和网络连接');
    process.exit(1);
  }
  
  // 获取所有数据库
  const databases = await getDatabases();
  
  if (databases.length === 0) {
    console.log('未找到任何数据库');
    return;
  }
  
  // 为每个数据库获取测量表信息
  for (const database of databases) {
    // 跳过系统数据库
    if (database === '_internal') {
      console.log(`\n跳过系统数据库: ${database}`);
      continue;
    }
    
    const measurements = await getMeasurements(database);
    
    // 如果有测量表，获取前几个的详细信息
    if (measurements.length > 0) {
      const maxMeasurements = Math.min(3, measurements.length); // 只显示前3个测量表的详细信息
      console.log(`\n显示前 ${maxMeasurements} 个测量表的详细信息:`);
      
      for (let i = 0; i < maxMeasurements; i++) {
        const measurement = measurements[i];
        await getFieldKeys(database, measurement);
        await getTagKeys(database, measurement);
      }
      
      if (measurements.length > maxMeasurements) {
        console.log(`\n... 还有 ${measurements.length - maxMeasurements} 个测量表未显示详细信息`);
      }
    }
  }
  
  console.log('\n=== 查询完成 ===');
}

// 运行主函数
main().catch(error => {
  console.error('程序执行失败:', error);
  process.exit(1);
});

export {
  executeQuery,
  getDatabases,
  getMeasurements,
  getFieldKeys,
  getTagKeys,
  testConnection
};
