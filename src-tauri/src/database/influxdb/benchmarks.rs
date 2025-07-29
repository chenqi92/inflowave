/**
 * InfluxDB 性能基准测试
 * 
 * 测试各种操作的性能表现
 */

#[cfg(test)]
mod benchmarks {
    use super::*;
    use crate::database::influxdb::{
        InfluxDBClient, LineProtocolFormatter, Query, QueryLanguage,
        metrics::{get_global_metrics_collector, record_query_start}
    };
    use crate::models::{ConnectionConfig, DatabaseType, InfluxDBV2Config};
    use std::env;
    use std::time::{Duration, Instant};
    use tokio;
    use serde_json::Value;

    /// 获取基准测试配置
    fn get_benchmark_config() -> Option<ConnectionConfig> {
        let host = env::var("INFLUXDB_BENCH_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = env::var("INFLUXDB_BENCH_PORT")
            .unwrap_or_else(|_| "8086".to_string())
            .parse()
            .unwrap_or(8086);
        let token = env::var("INFLUXDB_BENCH_TOKEN").ok()?;
        let org = env::var("INFLUXDB_BENCH_ORG").unwrap_or_else(|_| "benchmark".to_string());

        Some(ConnectionConfig {
            id: "benchmark".to_string(),
            name: "Benchmark Connection".to_string(),
            database_type: DatabaseType::InfluxDB,
            host,
            port,
            ssl: false,
            username: None,
            password: None,
            database: Some("benchmark".to_string()),
            v2_config: Some(InfluxDBV2Config {
                api_token: token,
                organization: org,
            }),
            v1_config: None,
            iotdb_config: None,
        })
    }

    /// 检查是否应该跳过基准测试
    fn should_skip_benchmarks() -> bool {
        env::var("SKIP_BENCHMARKS").is_ok()
    }

    #[tokio::test]
    async fn benchmark_connection_creation() {
        if should_skip_benchmarks() {
            println!("跳过基准测试 - 设置了 SKIP_BENCHMARKS");
            return;
        }

        let config = match get_benchmark_config() {
            Some(config) => config,
            None => {
                println!("跳过基准测试 - 缺少基准测试配置");
                return;
            }
        };

        let iterations = 10;
        let mut total_time = Duration::new(0, 0);
        let mut successful_connections = 0;

        println!("开始连接创建基准测试 ({} 次迭代)", iterations);

        for i in 0..iterations {
            let start = Instant::now();
            
            match InfluxDBClient::new(config.clone()).await {
                Ok(client) => {
                    let duration = start.elapsed();
                    total_time += duration;
                    successful_connections += 1;
                    
                    println!("连接 {}: {}ms", i + 1, duration.as_millis());
                    
                    // 关闭连接
                    let _ = client.close().await;
                }
                Err(e) => {
                    println!("连接 {} 失败: {}", i + 1, e);
                }
            }
        }

        if successful_connections > 0 {
            let avg_time = total_time / successful_connections;
            println!("连接创建基准测试结果:");
            println!("  成功连接: {}/{}", successful_connections, iterations);
            println!("  平均时间: {}ms", avg_time.as_millis());
            println!("  总时间: {}ms", total_time.as_millis());
        }
    }

    #[tokio::test]
    async fn benchmark_write_performance() {
        if should_skip_benchmarks() {
            return;
        }

        let config = match get_benchmark_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(e) => {
                println!("创建客户端失败: {}", e);
                return;
            }
        };

        let database = "benchmark_db";
        let batch_sizes = vec![1, 10, 100, 1000];

        for batch_size in batch_sizes {
            println!("测试批量写入性能 (批大小: {})", batch_size);
            
            let mut line_protocols = Vec::new();
            
            // 生成测试数据
            for i in 0..batch_size {
                let tags = vec![
                    ("host", "benchmark_server"),
                    ("region", "test"),
                    ("instance", &format!("instance_{}", i % 10)),
                ];
                let fields = vec![
                    ("cpu_usage", &Value::Number(serde_json::Number::from_f64(50.0 + (i as f64 % 50.0)).unwrap())),
                    ("memory_usage", &Value::Number(serde_json::Number::from(1024 + i))),
                    ("disk_usage", &Value::Number(serde_json::Number::from_f64(75.5).unwrap())),
                ];
                let timestamp = Some(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0) + i as i64);

                if let Ok(line_protocol) = LineProtocolFormatter::format_point(
                    "benchmark_metrics",
                    &tags,
                    &fields,
                    timestamp,
                ) {
                    line_protocols.push(line_protocol);
                }
            }

            let batch_data = line_protocols.join("\n");
            
            // 执行写入基准测试
            let iterations = 5;
            let mut total_time = Duration::new(0, 0);
            let mut successful_writes = 0;

            for _ in 0..iterations {
                let start = Instant::now();
                
                match client.write_line_protocol(database, &batch_data).await {
                    Ok(_) => {
                        let duration = start.elapsed();
                        total_time += duration;
                        successful_writes += 1;
                    }
                    Err(e) => {
                        println!("写入失败: {}", e);
                    }
                }
            }

            if successful_writes > 0 {
                let avg_time = total_time / successful_writes;
                let points_per_second = (batch_size as f64 * successful_writes as f64) / total_time.as_secs_f64();
                
                println!("  批大小 {} 结果:", batch_size);
                println!("    成功写入: {}/{}", successful_writes, iterations);
                println!("    平均时间: {}ms", avg_time.as_millis());
                println!("    写入速度: {:.2} points/sec", points_per_second);
            }
        }

        let _ = client.close().await;
    }

    #[tokio::test]
    async fn benchmark_query_performance() {
        if should_skip_benchmarks() {
            return;
        }

        let config = match get_benchmark_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(e) => {
                println!("创建客户端失败: {}", e);
                return;
            }
        };

        let database = "benchmark_db";
        let capabilities = client.capabilities();

        // 测试不同类型的查询
        let test_queries = vec![
            ("简单查询", QueryLanguage::InfluxQL, "SHOW MEASUREMENTS"),
            ("聚合查询", QueryLanguage::InfluxQL, "SELECT MEAN(cpu_usage) FROM benchmark_metrics WHERE time > now() - 1h GROUP BY TIME(5m)"),
            ("范围查询", QueryLanguage::InfluxQL, "SELECT * FROM benchmark_metrics WHERE time > now() - 10m LIMIT 100"),
        ];

        for (name, language, query_str) in test_queries {
            // 检查是否支持该查询语言
            let supported = match language {
                QueryLanguage::InfluxQL => capabilities.supports_influxql,
                QueryLanguage::Flux => capabilities.supports_flux,
                QueryLanguage::Sql => capabilities.supports_sql,
            };

            if !supported {
                println!("跳过 {} - 不支持 {:?}", name, language);
                continue;
            }

            println!("测试查询性能: {}", name);

            let query = Query::new(language, query_str.to_string())
                .with_database(database.to_string());

            let iterations = 10;
            let mut total_time = Duration::new(0, 0);
            let mut successful_queries = 0;
            let mut total_rows = 0;

            for _ in 0..iterations {
                let tracker = record_query_start(
                    format!("bench_{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)),
                    query_str.to_string(),
                    "benchmark".to_string(),
                );

                let start = Instant::now();
                
                match client.query(&query).await {
                    Ok(result) => {
                        let duration = start.elapsed();
                        total_time += duration;
                        successful_queries += 1;
                        total_rows += result.row_count.unwrap_or(0);
                        
                        tracker.finish(true, result.row_count.unwrap_or(0), None).await;
                    }
                    Err(e) => {
                        tracker.finish(false, 0, Some(e.to_string())).await;
                        println!("查询失败: {}", e);
                    }
                }
            }

            if successful_queries > 0 {
                let avg_time = total_time / successful_queries;
                let avg_rows = total_rows / successful_queries as u64;
                
                println!("  {} 结果:", name);
                println!("    成功查询: {}/{}", successful_queries, iterations);
                println!("    平均时间: {}ms", avg_time.as_millis());
                println!("    平均行数: {}", avg_rows);
                println!("    查询速度: {:.2} queries/sec", successful_queries as f64 / total_time.as_secs_f64());
            }
        }

        let _ = client.close().await;
    }

    #[tokio::test]
    async fn benchmark_concurrent_operations() {
        if should_skip_benchmarks() {
            return;
        }

        let config = match get_benchmark_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(e) => {
                println!("创建客户端失败: {}", e);
                return;
            }
        };

        let database = "benchmark_db";
        let concurrent_tasks = 10;
        let operations_per_task = 5;

        println!("测试并发操作性能 ({} 并发任务，每个任务 {} 操作)", concurrent_tasks, operations_per_task);

        let start = Instant::now();
        let mut handles = Vec::new();

        for task_id in 0..concurrent_tasks {
            let client_clone = client.clone();
            let database_clone = database.to_string();
            
            let handle = tokio::spawn(async move {
                let mut successful_ops = 0;
                
                for op_id in 0..operations_per_task {
                    // 交替执行写入和查询操作
                    if op_id % 2 == 0 {
                        // 写入操作
                        let line_protocol = format!(
                            "concurrent_test,task={},op={} value={} {}",
                            task_id,
                            op_id,
                            task_id * 100 + op_id,
                            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
                        );
                        
                        if client_clone.write_line_protocol(&database_clone, &line_protocol).await.is_ok() {
                            successful_ops += 1;
                        }
                    } else {
                        // 查询操作
                        let query = Query::new(
                            QueryLanguage::InfluxQL,
                            format!("SELECT * FROM concurrent_test WHERE task = '{}' LIMIT 1", task_id)
                        ).with_database(database_clone.clone());
                        
                        if client_clone.query(&query).await.is_ok() {
                            successful_ops += 1;
                        }
                    }
                }
                
                successful_ops
            });
            
            handles.push(handle);
        }

        // 等待所有任务完成
        let mut total_successful_ops = 0;
        for handle in handles {
            if let Ok(successful_ops) = handle.await {
                total_successful_ops += successful_ops;
            }
        }

        let total_time = start.elapsed();
        let total_expected_ops = concurrent_tasks * operations_per_task;
        let ops_per_second = total_successful_ops as f64 / total_time.as_secs_f64();

        println!("并发操作基准测试结果:");
        println!("  成功操作: {}/{}", total_successful_ops, total_expected_ops);
        println!("  总时间: {}ms", total_time.as_millis());
        println!("  操作速度: {:.2} ops/sec", ops_per_second);
        println!("  平均延迟: {:.2}ms", total_time.as_millis() as f64 / total_successful_ops as f64);

        let _ = client.close().await;
    }

    #[tokio::test]
    async fn benchmark_metrics_collection() {
        if should_skip_benchmarks() {
            return;
        }

        println!("测试指标收集性能");

        let collector = get_global_metrics_collector();
        let iterations = 1000;

        let start = Instant::now();

        for i in 0..iterations {
            let tracker = record_query_start(
                format!("metrics_test_{}", i),
                "SELECT * FROM test".to_string(),
                "benchmark".to_string(),
            );

            // 模拟查询执行时间
            tokio::time::sleep(tokio::time::Duration::from_millis(1)).await;

            tracker.finish(true, 100, None).await;
        }

        let total_time = start.elapsed();

        // 获取统计信息
        let stats = collector.get_performance_stats().await;

        println!("指标收集基准测试结果:");
        println!("  记录指标数: {}", iterations);
        println!("  总时间: {}ms", total_time.as_millis());
        println!("  记录速度: {:.2} metrics/sec", iterations as f64 / total_time.as_secs_f64());
        println!("  统计信息:");
        println!("    总查询数: {}", stats.total_queries);
        println!("    成功查询数: {}", stats.successful_queries);
        println!("    平均响应时间: {:.2}ms", stats.avg_response_time());
        println!("    成功率: {:.2}%", stats.success_rate());
    }
}
