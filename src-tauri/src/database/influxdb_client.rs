/**
 * 新的 InfluxDB 客户端实现
 * 
 * 使用统一的驱动架构替代原有的分散实现
 */

use crate::database::influxdb::{InfluxDriver, InfluxDriverFactory};
use crate::models::{ConnectionConfig, QueryResult, QueryRequest};
use anyhow::Result;
use log::{debug, info, warn};
use std::sync::Arc;
use std::time::Instant;

/// 新的 InfluxDB 客户端
pub struct InfluxDBClient {
    driver: Arc<dyn InfluxDriver>,
    config: ConnectionConfig,
}

impl InfluxDBClient {
    /// 创建新的 InfluxDB 客户端
    pub async fn new(config: ConnectionConfig) -> Result<Self> {
        info!("创建 InfluxDB 客户端: {}:{}", config.host, config.port);
        
        let driver = InfluxDriverFactory::create_driver(&config).await?;
        
        Ok(Self {
            driver,
            config,
        })
    }
    
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        debug!("测试 InfluxDB 连接");
        self.driver.test_connection().await
    }
    
    /// 执行查询
    pub async fn execute_query(&self, request: &QueryRequest) -> Result<QueryResult> {
        debug!("执行查询: {}", request.query);
        
        let start_time = Instant::now();
        
        // 构建查询对象
        let language = self.detect_query_language(&request.query);
        let mut query = crate::database::influxdb::Query::new(language, request.query.clone());
        
        if let Some(database) = &request.database {
            query = query.with_database(database.clone());
        }
        
        if let Some(timeout) = request.timeout {
            query = query.with_timeout(timeout);
        }
        
        // 执行查询
        let dataset = self.driver.query(&query).await?;
        
        let execution_time = start_time.elapsed().as_millis() as u64;
        
        // 转换为 QueryResult
        let result = QueryResult::new(
            dataset.columns,
            dataset.rows,
            dataset.execution_time.unwrap_or(execution_time),
        );
        
        info!("查询执行完成，耗时: {}ms，返回 {} 行", execution_time, result.row_count.unwrap_or(0));
        Ok(result)
    }
    
    /// 执行查询（带数据库参数）
    pub async fn execute_query_with_database(&self, query: &str, database: Option<&str>) -> Result<QueryResult> {
        let request = QueryRequest {
            connection_id: self.config.id.clone(),
            query: query.to_string(),
            database: database.map(|s| s.to_string()),
            timeout: Some(self.config.query_timeout as u64),
        };
        
        self.execute_query(&request).await
    }
    
    /// 写入 Line Protocol 数据
    pub async fn write_line_protocol(&self, database: &str, line_protocol: &str) -> Result<()> {
        debug!("写入 Line Protocol 数据到数据库: {}", database);
        
        let bucket_info = crate::database::influxdb::BucketInfo::new(database.to_string());
        self.driver.write(line_protocol, &bucket_info).await?;
        
        info!("Line Protocol 数据写入成功");
        Ok(())
    }
    
    /// 获取数据库列表
    pub async fn list_databases(&self) -> Result<Vec<String>> {
        debug!("获取数据库列表");
        self.driver.list_databases().await
    }
    
    /// 获取测量列表
    pub async fn list_measurements(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取测量列表: {}", database);
        self.driver.list_measurements(database).await
    }
    
    /// 创建数据库
    pub async fn create_database(&self, name: &str) -> Result<()> {
        debug!("创建数据库: {}", name);
        self.driver.create_database(name).await
    }
    
    /// 删除数据库
    pub async fn drop_database(&self, name: &str) -> Result<()> {
        debug!("删除数据库: {}", name);
        self.driver.drop_database(name).await
    }
    
    /// 获取健康状态
    pub async fn health(&self) -> Result<crate::database::influxdb::Health> {
        self.driver.health().await
    }
    
    /// 获取驱动能力
    pub fn capabilities(&self) -> &crate::database::influxdb::Capability {
        self.driver.capabilities()
    }

    /// 获取配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }

    /// 获取驱动（用于内部访问）
    pub(crate) fn get_driver(&self) -> &Arc<dyn crate::database::influxdb::InfluxDriver> {
        &self.driver
    }
    
    /// 关闭连接
    pub async fn close(&self) -> Result<()> {
        info!("关闭 InfluxDB 客户端连接");
        self.driver.close().await
    }
    
    /// 检测查询语言
    fn detect_query_language(&self, query: &str) -> crate::database::influxdb::QueryLanguage {
        let query_upper = query.trim().to_uppercase();
        
        // 检测 Flux 查询
        if query_upper.contains("FROM(") || query_upper.contains("RANGE(") || query_upper.contains("|>") {
            return crate::database::influxdb::QueryLanguage::Flux;
        }
        
        // 检测 SQL 查询
        if query_upper.starts_with("SELECT") && (query_upper.contains("FROM") || query_upper.contains("WHERE")) {
            // 进一步检查是否是标准 SQL 而不是 InfluxQL
            if query_upper.contains("GROUP BY TIME") || query_upper.contains("FILL(") {
                return crate::database::influxdb::QueryLanguage::InfluxQL;
            }
            // 如果驱动支持 SQL，优先使用 SQL
            if self.driver.capabilities().supports_sql {
                return crate::database::influxdb::QueryLanguage::Sql;
            }
        }
        
        // 默认使用 InfluxQL
        crate::database::influxdb::QueryLanguage::InfluxQL
    }
    
    /// 获取树节点的子节点（懒加载）
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        debug!("获取树节点子节点: {} ({})", parent_node_id, node_type);
        
        match node_type {
            "database" => {
                // 获取数据库列表
                let databases = self.list_databases().await?;
                let nodes = databases
                    .into_iter()
                    .map(|db_name| {
                        crate::models::TreeNode::new(
                            format!("db_{}", db_name),
                            db_name.clone(),
                            crate::models::TreeNodeType::Database,
                        )
                        .with_parent(parent_node_id.to_string())
                        .with_metadata("database".to_string(), serde_json::Value::String(db_name))
                    })
                    .collect();
                Ok(nodes)
            }
            "measurement" => {
                // 从 parent_node_id 中提取数据库名
                if let Some(database) = parent_node_id.strip_prefix("db_") {
                    let measurements = self.list_measurements(database).await?;
                    let nodes = measurements
                        .into_iter()
                        .map(|measurement_name| {
                            crate::models::TreeNode::new(
                                format!("measurement_{}_{}", database, measurement_name),
                                measurement_name.clone(),
                                crate::models::TreeNodeType::Measurement,
                            )
                            .with_parent(parent_node_id.to_string())
                            .as_leaf()
                            .with_metadata("database".to_string(), serde_json::Value::String(database.to_string()))
                            .with_metadata("measurement".to_string(), serde_json::Value::String(measurement_name))
                        })
                        .collect();
                    Ok(nodes)
                } else {
                    Ok(vec![])
                }
            }
            _ => {
                warn!("不支持的节点类型: {}", node_type);
                Ok(vec![])
            }
        }
    }
}

impl std::fmt::Debug for InfluxDBClient {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("InfluxDBClient")
            .field("config", &self.config)
            .field("capabilities", &self.driver.capabilities())
            .finish()
    }
}

impl Clone for InfluxDBClient {
    fn clone(&self) -> Self {
        Self {
            driver: self.driver.clone(),
            config: self.config.clone(),
        }
    }
}
