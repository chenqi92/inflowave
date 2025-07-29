/**
 * InfluxDB 统一客户端使用示例
 * 
 * 展示如何使用新的统一 InfluxDB 客户端进行各种操作
 */

use crate::database::influxdb::{
    InfluxDBClient, InfluxDBPool, PoolConfig,
    LineProtocolFormatter, LineProtocolPoint,
    Query, QueryLanguage,
    metrics::{get_global_metrics_collector, record_query_start},
};
use crate::models::{ConnectionConfig, DatabaseType, InfluxDBV2Config};
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

/// 基本使用示例
pub async fn basic_usage_example() -> Result<()> {
    println!("=== InfluxDB 统一客户端基本使用示例 ===");

    // 1. 创建连接配置
    let config = ConnectionConfig {
        id: "example".to_string(),
        name: "Example Connection".to_string(),
        database_type: DatabaseType::InfluxDB,
        host: "localhost".to_string(),
        port: 8086,
        ssl: false,
        username: None,
        password: None,
        database: Some("example_db".to_string()),
        v2_config: Some(InfluxDBV2Config {
            api_token: "your-token-here".to_string(),
            organization: "your-org".to_string(),
        }),
        v1_config: None,
        iotdb_config: None,
    };

    // 2. 创建统一客户端（自动版本探测）
    let client = InfluxDBClient::new(config).await?;
    
    // 3. 查看客户端能力
    let capabilities = client.capabilities();
    println!("InfluxDB 版本: {} (主版本: {})", capabilities.version, capabilities.major);
    println!("支持的功能:");
    println!("  - Flux: {}", capabilities.supports_flux);
    println!("  - InfluxQL: {}", capabilities.supports_influxql);
    println!("  - SQL: {}", capabilities.supports_sql);
    println!("  - FlightSQL: {}", capabilities.has_flightsql);

    // 4. 健康检查
    match client.health().await {
        Ok(health) => println!("健康状态: {:?}", health.status),
        Err(e) => println!("健康检查失败: {}", e),
    }

    // 5. 获取数据库列表
    match client.list_databases().await {
        Ok(databases) => {
            println!("数据库列表: {:?}", databases);
        }
        Err(e) => println!("获取数据库列表失败: {}", e),
    }

    Ok(())
}

/// 数据写入示例
pub async fn data_writing_example() -> Result<()> {
    println!("\n=== 数据写入示例 ===");

    let config = get_example_config();
    let client = InfluxDBClient::new(config).await?;
    let database = "example_db";

    // 方法1: 使用 Line Protocol 字符串
    let line_protocol = "temperature,location=office,sensor=A001 value=23.5,unit=\"celsius\" 1640995200000000000";
    
    match client.write_line_protocol(database, line_protocol).await {
        Ok(_) => println!("✅ Line Protocol 写入成功"),
        Err(e) => println!("❌ Line Protocol 写入失败: {}", e),
    }

    // 方法2: 使用 LineProtocolFormatter
    let tags = vec![("host", "server01"), ("region", "us-west")];
    let fields = vec![
        ("cpu_usage", &Value::Number(serde_json::Number::from_f64(85.5).unwrap())),
        ("memory_usage", &Value::Number(serde_json::Number::from(1024))),
        ("online", &Value::Bool(true)),
    ];
    let timestamp = Some(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));

    let formatted_line = LineProtocolFormatter::format_point(
        "system_metrics",
        &tags,
        &fields,
        timestamp,
    )?;

    match client.write_line_protocol(database, &formatted_line).await {
        Ok(_) => println!("✅ 格式化数据写入成功"),
        Err(e) => println!("❌ 格式化数据写入失败: {}", e),
    }

    // 方法3: 使用 LineProtocolPoint 构建器
    let point = LineProtocolPoint::new("network_metrics".to_string())
        .tag("interface".to_string(), "eth0".to_string())
        .tag("host".to_string(), "server02".to_string())
        .field("bytes_in".to_string(), Value::Number(serde_json::Number::from(1024000)))
        .field("bytes_out".to_string(), Value::Number(serde_json::Number::from(512000)))
        .field("packets_in".to_string(), Value::Number(serde_json::Number::from(1500)))
        .timestamp(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));

    let point_line = point.to_line_protocol()?;
    
    match client.write_line_protocol(database, &point_line).await {
        Ok(_) => println!("✅ 构建器数据写入成功"),
        Err(e) => println!("❌ 构建器数据写入失败: {}", e),
    }

    // 方法4: 批量写入
    let mut batch_points = Vec::new();
    for i in 0..10 {
        let point = LineProtocolPoint::new("batch_test".to_string())
            .tag("batch_id".to_string(), "batch_001".to_string())
            .tag("item".to_string(), format!("item_{}", i))
            .field("value".to_string(), Value::Number(serde_json::Number::from(i * 10)))
            .timestamp(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0) + i as i64);
        
        batch_points.push(point.to_line_protocol()?);
    }

    let batch_data = batch_points.join("\n");
    
    match client.write_line_protocol(database, &batch_data).await {
        Ok(_) => println!("✅ 批量数据写入成功 ({} 个数据点)", batch_points.len()),
        Err(e) => println!("❌ 批量数据写入失败: {}", e),
    }

    Ok(())
}

/// 查询示例
pub async fn query_example() -> Result<()> {
    println!("\n=== 查询示例 ===");

    let config = get_example_config();
    let client = InfluxDBClient::new(config).await?;
    let database = "example_db";
    let capabilities = client.capabilities();

    // InfluxQL 查询（如果支持）
    if capabilities.supports_influxql {
        println!("\n--- InfluxQL 查询 ---");
        
        let queries = vec![
            "SHOW MEASUREMENTS",
            "SELECT * FROM system_metrics ORDER BY time DESC LIMIT 5",
            "SELECT MEAN(cpu_usage) FROM system_metrics WHERE time > now() - 1h GROUP BY TIME(5m)",
        ];

        for query_str in queries {
            let query = Query::new(QueryLanguage::InfluxQL, query_str.to_string())
                .with_database(database.to_string());

            match client.query(&query).await {
                Ok(result) => {
                    println!("✅ 查询成功: {}", query_str);
                    println!("   返回 {} 行，执行时间: {}ms", 
                        result.row_count.unwrap_or(0),
                        result.execution_time.unwrap_or(0)
                    );
                    if !result.rows.is_empty() {
                        println!("   列名: {:?}", result.columns);
                        println!("   第一行: {:?}", result.rows[0]);
                    }
                }
                Err(e) => println!("❌ 查询失败: {} - {}", query_str, e),
            }
        }
    }

    // Flux 查询（如果支持）
    if capabilities.supports_flux {
        println!("\n--- Flux 查询 ---");
        
        let flux_queries = vec![
            "buckets()",
            "from(bucket: \"example_db\") |> range(start: -1h) |> limit(n: 5)",
        ];

        for query_str in flux_queries {
            let query = Query::new(QueryLanguage::Flux, query_str.to_string());

            match client.query(&query).await {
                Ok(result) => {
                    println!("✅ Flux 查询成功: {}", query_str);
                    println!("   返回 {} 行", result.row_count.unwrap_or(0));
                }
                Err(e) => println!("❌ Flux 查询失败: {} - {}", query_str, e),
            }
        }
    }

    // SQL 查询（如果支持）
    if capabilities.supports_sql {
        println!("\n--- SQL 查询 ---");
        
        let sql_queries = vec![
            "SHOW TABLES",
            "SELECT * FROM system_metrics ORDER BY time DESC LIMIT 5",
        ];

        for query_str in sql_queries {
            let query = Query::new(QueryLanguage::Sql, query_str.to_string());

            match client.query(&query).await {
                Ok(result) => {
                    println!("✅ SQL 查询成功: {}", query_str);
                    println!("   返回 {} 行", result.row_count.unwrap_or(0));
                }
                Err(e) => println!("❌ SQL 查询失败: {} - {}", query_str, e),
            }
        }
    }

    Ok(())
}

/// 连接池使用示例
pub async fn connection_pool_example() -> Result<()> {
    println!("\n=== 连接池使用示例 ===");

    let config = get_example_config();
    
    // 创建连接池配置
    let pool_config = PoolConfig {
        max_connections: 10,
        min_connections: 2,
        connection_timeout: 30,
        idle_timeout: 300,
        health_check_interval: 60,
        max_retries: 3,
        retry_interval: 1000,
    };

    // 创建连接池
    let pool = InfluxDBPool::new(config, pool_config).await?;
    println!("✅ 连接池创建成功");

    // 获取连接并执行操作
    let driver = pool.get_connection().await?;
    println!("✅ 从连接池获取连接成功");

    // 执行健康检查
    match driver.health().await {
        Ok(health) => println!("✅ 连接健康: {:?}", health.status),
        Err(e) => println!("❌ 连接不健康: {}", e),
    }

    // 释放连接
    pool.release_connection(driver).await;
    println!("✅ 连接已释放回连接池");

    // 获取连接池统计信息
    let stats = pool.get_stats().await;
    println!("📊 连接池统计:");
    println!("   总连接数: {}", stats.total_connections);
    println!("   活跃连接数: {}", stats.active_connections);
    println!("   空闲连接数: {}", stats.idle_connections);

    // 关闭连接池
    pool.close().await?;
    println!("✅ 连接池已关闭");

    Ok(())
}

/// 性能监控示例
pub async fn metrics_example() -> Result<()> {
    println!("\n=== 性能监控示例 ===");

    let config = get_example_config();
    let client = InfluxDBClient::new(config).await?;
    let database = "example_db";

    // 执行一些查询并跟踪性能
    for i in 0..5 {
        let query_id = format!("example_query_{}", i);
        let query_str = format!("SELECT * FROM system_metrics WHERE host = 'server0{}' LIMIT 10", i + 1);
        
        // 开始跟踪查询
        let tracker = record_query_start(
            query_id.clone(),
            query_str.clone(),
            "example_connection".to_string(),
        );

        // 执行查询
        let query = Query::new(QueryLanguage::InfluxQL, query_str)
            .with_database(database.to_string());

        match client.query(&query).await {
            Ok(result) => {
                let row_count = result.row_count.unwrap_or(0);
                tracker.finish(true, row_count, None).await;
                println!("✅ 查询 {} 成功，返回 {} 行", query_id, row_count);
            }
            Err(e) => {
                tracker.finish(false, 0, Some(e.to_string())).await;
                println!("❌ 查询 {} 失败: {}", query_id, e);
            }
        }
    }

    // 获取性能统计
    let collector = get_global_metrics_collector();
    let stats = collector.get_performance_stats().await;
    
    println!("📊 性能统计:");
    println!("   总查询数: {}", stats.total_queries);
    println!("   成功查询数: {}", stats.successful_queries);
    println!("   失败查询数: {}", stats.failed_queries);
    println!("   平均响应时间: {:.2}ms", stats.avg_response_time());
    println!("   成功率: {:.2}%", stats.success_rate());

    // 获取慢查询
    let slow_queries = collector.get_slow_queries(100, Some(3)).await;
    if !slow_queries.is_empty() {
        println!("🐌 慢查询 (>100ms):");
        for query in slow_queries {
            println!("   {} - {}ms", query.query_id, query.execution_time);
        }
    }

    Ok(())
}

/// 获取示例配置
fn get_example_config() -> ConnectionConfig {
    ConnectionConfig {
        id: "example".to_string(),
        name: "Example Connection".to_string(),
        database_type: DatabaseType::InfluxDB,
        host: "localhost".to_string(),
        port: 8086,
        ssl: false,
        username: None,
        password: None,
        database: Some("example_db".to_string()),
        v2_config: Some(InfluxDBV2Config {
            api_token: "your-token-here".to_string(),
            organization: "your-org".to_string(),
        }),
        v1_config: None,
        iotdb_config: None,
    }
}

/// 主函数 - 运行所有示例
pub async fn run_all_examples() -> Result<()> {
    println!("🚀 InfluxDB 统一客户端使用示例");
    println!("=====================================");

    // 运行所有示例
    basic_usage_example().await?;
    data_writing_example().await?;
    query_example().await?;
    connection_pool_example().await?;
    metrics_example().await?;

    println!("\n🎉 所有示例运行完成！");
    println!("\n💡 提示:");
    println!("   - 确保 InfluxDB 实例正在运行");
    println!("   - 更新配置中的连接信息和认证令牌");
    println!("   - 查看日志获取详细的执行信息");

    Ok(())
}
