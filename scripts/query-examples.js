#!/usr/bin/env node

/**
 * InfluxDB 查询示例脚本
 * 展示如何查询不同类型的数据
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
    console.log(`\n📊 执行查询: ${query}`);
    
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
    return data;
  } catch (error) {
    console.error(`❌ 查询失败: ${error.message}`);
    throw error;
  }
}

/**
 * 格式化查询结果
 */
function formatResults(result, title) {
  console.log(`\n🔍 ${title}`);
  console.log('=' .repeat(50));
  
  if (result.results && result.results[0] && result.results[0].series) {
    const series = result.results[0].series[0];
    const columns = series.columns;
    const values = series.values;
    
    // 打印表头
    console.log(columns.join('\t\t'));
    console.log('-'.repeat(columns.join('\t\t').length + 10));
    
    // 打印数据行（最多显示10行）
    const maxRows = Math.min(10, values.length);
    for (let i = 0; i < maxRows; i++) {
      const row = values[i].map(val => {
        if (typeof val === 'number') {
          return val.toFixed(2);
        }
        return val || 'null';
      });
      console.log(row.join('\t\t'));
    }
    
    if (values.length > maxRows) {
      console.log(`... 还有 ${values.length - maxRows} 行数据`);
    }
    
    console.log(`\n📈 总计: ${values.length} 行数据`);
  } else {
    console.log('未找到数据');
  }
}

/**
 * 运行查询示例
 */
async function runQueryExamples() {
  console.log('InfluxDB 查询示例');
  console.log('==================');
  
  try {
    // 1. 系统监控数据查询
    console.log('\n🖥️  系统监控数据查询');
    
    // CPU 使用率 - 最近10条记录
    let result = await executeQuery(
      'SELECT time, usage_percent, load_avg FROM cpu_usage ORDER BY time DESC LIMIT 10',
      'monitoring'
    );
    formatResults(result, 'CPU 使用率 - 最近10条记录');
    
    // CPU 平均使用率 - 按小时聚合
    result = await executeQuery(
      'SELECT MEAN(usage_percent) as avg_cpu FROM cpu_usage WHERE time >= now() - 24h GROUP BY time(1h)',
      'monitoring'
    );
    formatResults(result, 'CPU 平均使用率 - 按小时聚合');
    
    // 内存使用情况
    result = await executeQuery(
      'SELECT time, used_percent, available_gb FROM memory_usage ORDER BY time DESC LIMIT 10',
      'monitoring'
    );
    formatResults(result, '内存使用情况 - 最近10条记录');
    
    // 2. 业务数据查询
    console.log('\n💼 业务数据查询');
    
    // 网站流量统计
    result = await executeQuery(
      'SELECT time, page_views, unique_visitors, bounce_rate FROM web_traffic ORDER BY time DESC LIMIT 10',
      'business'
    );
    formatResults(result, '网站流量统计 - 最近10条记录');
    
    // 销售数据统计
    result = await executeQuery(
      'SELECT time, revenue, orders, avg_order_value FROM sales ORDER BY time DESC LIMIT 10',
      'business'
    );
    formatResults(result, '销售数据统计 - 最近10条记录');
    
    // 日销售总额
    result = await executeQuery(
      'SELECT SUM(revenue) as total_revenue, SUM(orders) as total_orders FROM sales WHERE time >= now() - 7d GROUP BY time(1d)',
      'business'
    );
    formatResults(result, '日销售总额 - 最近7天');
    
    // 3. 传感器数据查询
    console.log('\n🌡️  传感器数据查询');
    
    // 温度传感器数据
    result = await executeQuery(
      'SELECT time, celsius, humidity FROM temperature ORDER BY time DESC LIMIT 10',
      'sensors'
    );
    formatResults(result, '温度传感器数据 - 最近10条记录');
    
    // 压力传感器数据
    result = await executeQuery(
      'SELECT time, psi, flow_rate FROM pressure ORDER BY time DESC LIMIT 10',
      'sensors'
    );
    formatResults(result, '压力传感器数据 - 最近10条记录');
    
    // 温度统计
    result = await executeQuery(
      'SELECT MIN(celsius) as min_temp, MAX(celsius) as max_temp, MEAN(celsius) as avg_temp FROM temperature WHERE time >= now() - 24h',
      'sensors'
    );
    formatResults(result, '温度统计 - 最近24小时');
    
    // 4. 日志数据查询
    console.log('\n📋 日志数据查询');
    
    // 应用日志统计
    result = await executeQuery(
      'SELECT time, count, level, response_time_ms FROM application_logs ORDER BY time DESC LIMIT 10',
      'logs'
    );
    formatResults(result, '应用日志 - 最近10条记录');
    
    // 按日志级别统计
    result = await executeQuery(
      'SELECT SUM(count) as total_count FROM application_logs WHERE time >= now() - 24h GROUP BY level',
      'logs'
    );
    formatResults(result, '日志级别统计 - 最近24小时');
    
    // 5. 高级查询示例
    console.log('\n🔬 高级查询示例');
    
    // 多表联合查询 - CPU和内存使用率对比
    result = await executeQuery(
      'SELECT MEAN(usage_percent) as avg_cpu FROM cpu_usage WHERE time >= now() - 1h GROUP BY time(10m)',
      'monitoring'
    );
    formatResults(result, 'CPU使用率趋势 - 最近1小时，10分钟间隔');
    
    // 异常检测 - 高CPU使用率
    result = await executeQuery(
      'SELECT time, usage_percent FROM cpu_usage WHERE usage_percent > 70 ORDER BY time DESC LIMIT 10',
      'monitoring'
    );
    formatResults(result, '高CPU使用率警报 - 使用率>70%');
    
    // 性能分析 - 响应时间统计
    result = await executeQuery(
      'SELECT MEAN(response_time_ms) as avg_response_time, MAX(response_time_ms) as max_response_time FROM application_logs WHERE time >= now() - 1h GROUP BY time(10m)',
      'logs'
    );
    formatResults(result, '响应时间趋势 - 最近1小时');
    
    console.log('\n✅ 所有查询示例执行完成！');
    console.log('\n💡 提示：');
    console.log('- 可以修改时间范围，如 now() - 1h, now() - 1d, now() - 1w');
    console.log('- 可以使用聚合函数：MEAN(), MAX(), MIN(), SUM(), COUNT()');
    console.log('- 可以使用 GROUP BY time() 进行时间分组');
    console.log('- 可以使用 WHERE 子句进行条件过滤');
    console.log('- 可以使用 ORDER BY 进行排序');
    console.log('- 可以使用 LIMIT 限制返回行数');
    
  } catch (error) {
    console.error('查询示例执行失败:', error);
    process.exit(1);
  }
}

// 运行查询示例
runQueryExamples().catch(error => {
  console.error('程序执行失败:', error);
  process.exit(1);
});

export { executeQuery, formatResults };
