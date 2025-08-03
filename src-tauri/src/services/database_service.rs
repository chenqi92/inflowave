use crate::models::{DatabaseInfo, RetentionPolicy, Measurement, DatabaseStats};
use crate::services::ConnectionService;
use crate::utils::validation::ValidationUtils;
use anyhow::{Context, Result};
use std::sync::Arc;
use log::{debug, info, error};

/// 数据库服务
pub struct DatabaseService {
    connection_service: Arc<ConnectionService>,
}

impl DatabaseService {
    /// 创建新的数据库服务
    pub fn new(connection_service: Arc<ConnectionService>) -> Self {
        Self {
            connection_service,
        }
    }

    /// 获取数据库列表
    pub async fn get_databases(&self, connection_id: &str) -> Result<Vec<String>> {
        debug!("获取数据库列表: {}", connection_id);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        client.get_databases().await
            .context("获取数据库列表失败")
    }

    /// 创建数据库
    pub async fn create_database(&self, connection_id: &str, database_name: &str) -> Result<()> {
        debug!("创建数据库: {} - {}", connection_id, database_name);
        
        // 验证数据库名称
        ValidationUtils::validate_database_name(database_name)
            .context("数据库名称验证失败")?;
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        client.create_database(database_name).await
            .context("创建数据库失败")?;
        
        info!("数据库 '{}' 创建成功", database_name);
        Ok(())
    }

    /// 删除数据库
    pub async fn drop_database(&self, connection_id: &str, database_name: &str) -> Result<()> {
        debug!("删除数据库: {} - {}", connection_id, database_name);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        client.drop_database(database_name).await
            .context("删除数据库失败")?;
        
        info!("数据库 '{}' 删除成功", database_name);
        Ok(())
    }

    /// 获取数据库信息
    pub async fn get_database_info(&self, connection_id: &str, database_name: &str) -> Result<DatabaseInfo> {
        debug!("获取数据库信息: {} - {}", connection_id, database_name);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        // 获取保留策略
        let retention_policies = client.get_retention_policies(database_name).await
            .context("获取保留策略失败")?;
        
        // 获取测量列表
        let measurement_names = client.get_measurements(database_name).await
            .context("获取测量列表失败")?;
        
        // 构建测量信息（简化版本）
        let measurements: Vec<Measurement> = measurement_names
            .into_iter()
            .map(|name| Measurement {
                name,
                fields: vec![], // 需要额外查询获取
                tags: vec![],   // 需要额外查询获取
                last_write: None,
                series_count: None,
            })
            .collect();
        
        let database_info = DatabaseInfo {
            name: database_name.to_string(),
            retention_policies,
            measurements,
            created_at: None, // InfluxDB 1.x 不提供创建时间
        };
        
        info!("获取数据库信息成功: {}", database_name);
        Ok(database_info)
    }

    /// 获取保留策略
    pub async fn get_retention_policies(&self, connection_id: &str, database: &str) -> Result<Vec<RetentionPolicy>> {
        debug!("获取保留策略: {} - {}", connection_id, database);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        client.get_retention_policies(database).await
            .context("获取保留策略失败")
    }

    /// 创建保留策略
    pub async fn create_retention_policy(
        &self,
        connection_id: &str,
        database: &str,
        name: &str,
        duration: &str,
        shard_duration: Option<&str>,
        replica_n: Option<u32>,
        default: bool,
    ) -> Result<()> {
        debug!("创建保留策略: {} - {} - {}", connection_id, database, name);
        
        // 验证保留策略名称
        ValidationUtils::validate_retention_policy_name(name)
            .context("保留策略名称验证失败")?;
        
        // 验证持续时间
        ValidationUtils::validate_retention_duration(duration)
            .context("保留策略持续时间验证失败")?;
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        // 构建创建保留策略的查询
        let mut query = format!(
            "CREATE RETENTION POLICY \"{}\" ON \"{}\" DURATION {}",
            name, database, duration
        );
        
        if let Some(shard_dur) = shard_duration {
            query.push_str(&format!(" REPLICATION {}", shard_dur));
        }
        
        if let Some(replica) = replica_n {
            query.push_str(&format!(" REPLICATION {}", replica));
        }
        
        if default {
            query.push_str(" DEFAULT");
        }
        
        client.execute_query(&query, Some(database)).await
            .context("创建保留策略失败")?;
        
        info!("保留策略 '{}' 创建成功", name);
        Ok(())
    }

    /// 删除保留策略
    pub async fn drop_retention_policy(
        &self,
        connection_id: &str,
        database: &str,
        policy_name: &str,
    ) -> Result<()> {
        debug!("删除保留策略: {} - {} - {}", connection_id, database, policy_name);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        let query = format!(
            "DROP RETENTION POLICY \"{}\" ON \"{}\"",
            policy_name, database
        );
        
        client.execute_query(&query, Some(database)).await
            .context("删除保留策略失败")?;
        
        info!("保留策略 '{}' 删除成功", policy_name);
        Ok(())
    }

    /// 获取测量列表
    pub async fn get_measurements(&self, connection_id: &str, database: &str) -> Result<Vec<String>> {
        debug!("获取测量列表: {} - {}", connection_id, database);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        client.get_measurements(database).await
            .context("获取测量列表失败")
    }

    /// 删除测量
    pub async fn drop_measurement(
        &self,
        connection_id: &str,
        database: &str,
        measurement: &str,
    ) -> Result<()> {
        debug!("删除测量: {} - {} - {}", connection_id, database, measurement);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        let query = format!("DROP MEASUREMENT \"{}\"", measurement);
        
        client.execute_query(&query, Some(database)).await
            .context("删除测量失败")?;
        
        info!("测量 '{}' 删除成功", measurement);
        Ok(())
    }

    /// 获取字段键
    pub async fn get_field_keys(
        &self,
        connection_id: &str,
        database: &str,
        measurement: Option<&str>,
    ) -> Result<Vec<String>> {
        debug!("获取字段键: {} - {} - {:?}", connection_id, database, measurement);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        // 根据连接类型构建查询语句
        let query = {
            let db_type = client.get_database_type();
            error!("🔍 database_service字段查询 - 数据库类型: {:?}, database: {}, measurement: {:?}", db_type, database, measurement);
            if matches!(db_type, crate::models::DatabaseType::IoTDB) {
                // IoTDB使用SHOW TIMESERIES语法
                if let Some(measurement) = measurement {
                    let query = format!("SHOW TIMESERIES {}.{}.*", database, measurement);
                    debug!("database_service生成IoTDB字段查询: {}", query);
                    query
                } else {
                    let query = format!("SHOW TIMESERIES {}.**", database);
                    debug!("database_service生成IoTDB字段查询: {}", query);
                    query
                }
            } else {
                // InfluxDB使用SHOW FIELD KEYS语法
                if let Some(measurement) = measurement {
                    let query = format!("SHOW FIELD KEYS ON \"{}\" FROM \"{}\"", database, measurement);
                    debug!("database_service生成InfluxDB字段查询: {}", query);
                    query
                } else {
                    let query = format!("SHOW FIELD KEYS ON \"{}\"", database);
                    debug!("database_service生成InfluxDB字段查询: {}", query);
                    query
                }
            }
        };
        
        let result = client.execute_query(&query, Some(database)).await
            .context("获取字段键失败")?;
        
        // 解析字段键
        let mut field_keys = Vec::new();
        for row in result.rows() {
            if let Some(field_key) = row.get(0) {
                if let Some(key_str) = field_key.as_str() {
                    field_keys.push(key_str.to_string());
                }
            }
        }
        
        Ok(field_keys)
    }

    /// 获取标签键
    pub async fn get_tag_keys(
        &self,
        connection_id: &str,
        database: &str,
        measurement: Option<&str>,
    ) -> Result<Vec<String>> {
        debug!("获取标签键: {} - {} - {:?}", connection_id, database, measurement);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        // 根据连接类型构建查询语句
        let query = {
            let db_type = client.get_database_type();
            error!("🔍 database_service标签查询 - 数据库类型: {:?}, database: {}, measurement: {:?}", db_type, database, measurement);
            if matches!(db_type, crate::models::DatabaseType::IoTDB) {
                // IoTDB不支持TAG概念，使用SHOW DEVICES
                if let Some(measurement) = measurement {
                    let query = format!("SHOW DEVICES {}.{}", database, measurement);
                    debug!("database_service生成IoTDB标签查询: {}", query);
                    query
                } else {
                    let query = format!("SHOW DEVICES {}.**", database);
                    debug!("database_service生成IoTDB标签查询: {}", query);
                    query
                }
            } else {
                // InfluxDB使用SHOW TAG KEYS语法
                if let Some(measurement) = measurement {
                    let query = format!("SHOW TAG KEYS ON \"{}\" FROM \"{}\"", database, measurement);
                    debug!("database_service生成InfluxDB标签查询: {}", query);
                    query
                } else {
                    let query = format!("SHOW TAG KEYS ON \"{}\"", database);
                    debug!("database_service生成InfluxDB标签查询: {}", query);
                    query
                }
            }
        };
        
        let result = client.execute_query(&query, Some(database)).await
            .context("获取标签键失败")?;
        
        // 解析标签键
        let mut tag_keys = Vec::new();
        for row in result.rows() {
            if let Some(tag_key) = row.get(0) {
                if let Some(key_str) = tag_key.as_str() {
                    tag_keys.push(key_str.to_string());
                }
            }
        }
        
        Ok(tag_keys)
    }

    /// 获取标签值
    pub async fn get_tag_values(
        &self,
        connection_id: &str,
        database: &str,
        tag_key: &str,
        measurement: Option<&str>,
    ) -> Result<Vec<String>> {
        debug!("获取标签值: {} - {} - {} - {:?}", connection_id, database, tag_key, measurement);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        let query = if let Some(measurement) = measurement {
            format!("SHOW TAG VALUES FROM \"{}\" WITH KEY = \"{}\"", measurement, tag_key)
        } else {
            format!("SHOW TAG VALUES WITH KEY = \"{}\"", tag_key)
        };
        
        let result = client.execute_query(&query, Some(database)).await
            .context("获取标签值失败")?;
        
        // 解析标签值
        let mut tag_values = Vec::new();
        for row in result.rows() {
            if let Some(tag_value) = row.get(1) { // 标签值通常在第二列
                if let Some(value_str) = tag_value.as_str() {
                    tag_values.push(value_str.to_string());
                }
            }
        }
        
        Ok(tag_values)
    }

    /// 获取数据库统计信息
    pub async fn get_database_stats(&self, connection_id: &str, database: &str) -> Result<DatabaseStats> {
        debug!("获取数据库统计信息: {} - {}", connection_id, database);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        // 获取保留策略
        let retention_policies = client.get_retention_policies(database).await
            .context("获取保留策略失败")?;
        
        // 获取测量数量
        let measurements = client.get_measurements(database).await
            .context("获取测量列表失败")?;
        let measurement_count = measurements.len() as u64;
        
        // 尝试获取序列数量
        let series_count = match self.get_series_count(connection_id, database).await {
            Ok(count) => count,
            Err(_) => 0,
        };
        
        let stats = DatabaseStats {
            name: database.to_string(),
            size: 0, // InfluxDB 1.x 难以直接获取数据库大小
            series_count,
            measurement_count,
            retention_policies,
            last_write: None, // 需要额外查询获取
        };
        
        Ok(stats)
    }

    /// 获取序列数量
    async fn get_series_count(&self, connection_id: &str, database: &str) -> Result<u64> {
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(connection_id).await
            .context("获取连接失败")?;
        
        let query = format!("SHOW SERIES ON \"{}\"", database);
        let result = client.execute_query(&query, Some(database)).await
            .context("获取序列数量失败")?;
        
        Ok(result.row_count.unwrap_or(0) as u64)
    }
}
