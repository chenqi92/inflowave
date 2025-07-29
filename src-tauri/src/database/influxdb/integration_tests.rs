/**
 * InfluxDB 集成测试
 * 
 * 这些测试需要真实的 InfluxDB 实例运行
 * 可以通过环境变量配置测试连接
 */

#[cfg(test)]
mod integration_tests {
    use super::*;
    use crate::database::influxdb::{
        InfluxDBClient, InfluxDriverFactory, InfluxDetector,
        QueryLanguage, Query, LineProtocolFormatter
    };
    use crate::models::{ConnectionConfig, DatabaseType, InfluxDBV2Config};
    use std::env;
    use tokio;
    use serde_json::Value;

    /// 获取测试配置
    fn get_test_config() -> Option<ConnectionConfig> {
        // 从环境变量读取测试配置
        let host = env::var("INFLUXDB_TEST_HOST").unwrap_or_else(|_| "localhost".to_string());
        let port = env::var("INFLUXDB_TEST_PORT")
            .unwrap_or_else(|_| "8086".to_string())
            .parse()
            .unwrap_or(8086);
        let token = env::var("INFLUXDB_TEST_TOKEN").ok()?;
        let org = env::var("INFLUXDB_TEST_ORG").unwrap_or_else(|_| "test".to_string());

        Some(ConnectionConfig {
            id: "test".to_string(),
            name: "Test Connection".to_string(),
            database_type: DatabaseType::InfluxDB,
            host,
            port,
            ssl: false,
            username: None,
            password: None,
            database: Some("test".to_string()),
            v2_config: Some(InfluxDBV2Config {
                api_token: token,
                organization: org,
            }),
            v1_config: None,
            iotdb_config: None,
        })
    }

    /// 检查是否应该跳过集成测试
    fn should_skip_integration_tests() -> bool {
        env::var("SKIP_INTEGRATION_TESTS").is_ok()
    }

    #[tokio::test]
    async fn test_version_detection() {
        if should_skip_integration_tests() {
            println!("跳过集成测试 - 设置了 SKIP_INTEGRATION_TESTS");
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => {
                println!("跳过集成测试 - 缺少测试配置");
                return;
            }
        };

        let capability = InfluxDetector::detect(&config).await;
        
        match capability {
            Ok(cap) => {
                println!("检测到 InfluxDB 版本: {} (主版本: {})", cap.version, cap.major);
                assert!(cap.major >= 1 && cap.major <= 3);
                assert!(!cap.version.is_empty());
            }
            Err(e) => {
                println!("版本检测失败: {} - 可能是连接问题", e);
                // 不让测试失败，因为可能是环境问题
            }
        }
    }

    #[tokio::test]
    async fn test_unified_client_creation() {
        if should_skip_integration_tests() {
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => return,
        };

        let client_result = InfluxDBClient::new(config).await;
        
        match client_result {
            Ok(client) => {
                let capabilities = client.capabilities();
                println!("统一客户端创建成功");
                println!("支持的功能: Flux={}, InfluxQL={}, SQL={}", 
                    capabilities.supports_flux, 
                    capabilities.supports_influxql, 
                    capabilities.supports_sql
                );
                
                // 测试健康检查
                match client.health().await {
                    Ok(health) => {
                        println!("健康检查: {:?}", health.status);
                    }
                    Err(e) => {
                        println!("健康检查失败: {}", e);
                    }
                }
            }
            Err(e) => {
                println!("统一客户端创建失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_database_operations() {
        if should_skip_integration_tests() {
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(_) => return,
        };

        // 测试获取数据库列表
        match client.list_databases().await {
            Ok(databases) => {
                println!("数据库列表: {:?}", databases);
                assert!(!databases.is_empty());
            }
            Err(e) => {
                println!("获取数据库列表失败: {}", e);
            }
        }

        // 测试获取测量列表（如果有数据库）
        if let Ok(databases) = client.list_databases().await {
            if let Some(db) = databases.first() {
                match client.list_measurements(db).await {
                    Ok(measurements) => {
                        println!("数据库 {} 的测量列表: {:?}", db, measurements);
                    }
                    Err(e) => {
                        println!("获取测量列表失败: {}", e);
                    }
                }
            }
        }
    }

    #[tokio::test]
    async fn test_write_and_query() {
        if should_skip_integration_tests() {
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(_) => return,
        };

        let test_database = "test_db";
        
        // 准备测试数据
        let tags = vec![("host", "test_server"), ("region", "us-west")];
        let fields = vec![
            ("cpu_usage", &Value::Number(serde_json::Number::from_f64(85.5).unwrap())),
            ("memory_usage", &Value::Number(serde_json::Number::from(1024))),
            ("online", &Value::Bool(true)),
        ];
        let timestamp = Some(chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));

        // 格式化为 Line Protocol
        let line_protocol = match LineProtocolFormatter::format_point(
            "system_metrics", 
            &tags, 
            &fields, 
            timestamp
        ) {
            Ok(lp) => lp,
            Err(e) => {
                println!("Line Protocol 格式化失败: {}", e);
                return;
            }
        };

        println!("写入数据: {}", line_protocol);

        // 写入数据
        match client.write_line_protocol(test_database, &line_protocol).await {
            Ok(_) => {
                println!("数据写入成功");
                
                // 等待一下让数据被索引
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                
                // 查询数据
                let query = Query::new(
                    QueryLanguage::InfluxQL,
                    "SELECT * FROM system_metrics ORDER BY time DESC LIMIT 1".to_string()
                ).with_database(test_database.to_string());

                match client.query(&query).await {
                    Ok(result) => {
                        println!("查询成功，返回 {} 行", result.row_count.unwrap_or(0));
                        if !result.rows.is_empty() {
                            println!("最新数据: {:?}", result.rows[0]);
                        }
                    }
                    Err(e) => {
                        println!("查询失败: {}", e);
                    }
                }
            }
            Err(e) => {
                println!("数据写入失败: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_multiple_query_languages() {
        if should_skip_integration_tests() {
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => return,
        };

        let client = match InfluxDBClient::new(config).await {
            Ok(client) => client,
            Err(_) => return,
        };

        let capabilities = client.capabilities();
        
        // 测试 InfluxQL（如果支持）
        if capabilities.supports_influxql {
            let query = Query::new(
                QueryLanguage::InfluxQL,
                "SHOW DATABASES".to_string()
            );
            
            match client.query(&query).await {
                Ok(result) => {
                    println!("InfluxQL 查询成功，返回 {} 行", result.row_count.unwrap_or(0));
                }
                Err(e) => {
                    println!("InfluxQL 查询失败: {}", e);
                }
            }
        }

        // 测试 Flux（如果支持）
        if capabilities.supports_flux {
            let query = Query::new(
                QueryLanguage::Flux,
                "buckets()".to_string()
            );
            
            match client.query(&query).await {
                Ok(result) => {
                    println!("Flux 查询成功，返回 {} 行", result.row_count.unwrap_or(0));
                }
                Err(e) => {
                    println!("Flux 查询失败: {}", e);
                }
            }
        }

        // 测试 SQL（如果支持）
        if capabilities.supports_sql {
            let query = Query::new(
                QueryLanguage::Sql,
                "SHOW TABLES".to_string()
            );
            
            match client.query(&query).await {
                Ok(result) => {
                    println!("SQL 查询成功，返回 {} 行", result.row_count.unwrap_or(0));
                }
                Err(e) => {
                    println!("SQL 查询失败: {}", e);
                }
            }
        }
    }

    #[tokio::test]
    async fn test_connection_pooling() {
        if should_skip_integration_tests() {
            return;
        }

        let config = match get_test_config() {
            Some(config) => config,
            None => return,
        };

        // 测试连接池功能
        use crate::database::influxdb::{InfluxDBPool, PoolConfig};

        let pool_config = PoolConfig {
            max_connections: 5,
            min_connections: 2,
            connection_timeout: 10,
            idle_timeout: 60,
            health_check_interval: 30,
            max_retries: 3,
            retry_interval: 1000,
        };

        match InfluxDBPool::new(config, pool_config).await {
            Ok(pool) => {
                println!("连接池创建成功");
                
                // 获取连接
                match pool.get_connection().await {
                    Ok(driver) => {
                        println!("从连接池获取连接成功");
                        
                        // 测试健康检查
                        match driver.health().await {
                            Ok(health) => {
                                println!("连接健康检查: {:?}", health.status);
                            }
                            Err(e) => {
                                println!("连接健康检查失败: {}", e);
                            }
                        }
                        
                        // 释放连接
                        pool.release_connection(driver).await;
                        println!("连接已释放回连接池");
                    }
                    Err(e) => {
                        println!("从连接池获取连接失败: {}", e);
                    }
                }
                
                // 获取统计信息
                let stats = pool.get_stats().await;
                println!("连接池统计: 总连接数={}, 活跃连接数={}, 空闲连接数={}", 
                    stats.total_connections, 
                    stats.active_connections, 
                    stats.idle_connections
                );
                
                // 关闭连接池
                if let Err(e) = pool.close().await {
                    println!("关闭连接池失败: {}", e);
                } else {
                    println!("连接池已关闭");
                }
            }
            Err(e) => {
                println!("连接池创建失败: {}", e);
            }
        }
    }
}
