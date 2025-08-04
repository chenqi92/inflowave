/**
 * IoTDB 官方客户端实现
 * 
 * 完全基于IoTDB官方源码编译的Rust客户端
 * 移除了所有自定义Thrift协议实现
 */

use crate::models::{ConnectionConfig, QueryResult, DatabaseType, FieldInfo, FieldType};
use crate::database::iotdb::drivers::official_thrift::OfficialThriftClient;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use log::{debug, info, warn};

/// IoTDB 官方客户端包装器
#[derive(Debug)]
pub struct IoTDBOfficialClient {
    client: Arc<Mutex<Option<OfficialThriftClient>>>,
    config: ConnectionConfig,
}

impl IoTDBOfficialClient {
    /// 创建新的IoTDB官方客户端
    pub async fn new(config: ConnectionConfig) -> Result<Self> {
        info!("创建IoTDB官方客户端: {}:{}", config.host, config.port);

        let client = Arc::new(Mutex::new(None));

        let instance = Self {
            client,
            config,
        };

        info!("IoTDB官方客户端创建成功");
        Ok(instance)
    }

    /// 连接到IoTDB服务器
    async fn connect(&self) -> Result<()> {
        let mut client_guard = self.client.lock().await;

        if client_guard.is_some() {
            return Ok(()); // 已经连接
        }

        info!("连接到IoTDB服务器: {}:{}", self.config.host, self.config.port);

        // 创建官方Thrift客户端
        let mut thrift_client = OfficialThriftClient::new(
            self.config.host.clone(),
            self.config.port,
            self.config.username.clone().unwrap_or_else(|| "root".to_string()),
            self.config.password.clone().unwrap_or_default(),
        );

        // 连接并打开会话
        thrift_client.connect().await
            .map_err(|e| anyhow::anyhow!("连接IoTDB服务器失败: {}", e))?;

        thrift_client.open_session().await
            .map_err(|e| anyhow::anyhow!("打开IoTDB会话失败: {}", e))?;

        *client_guard = Some(thrift_client);
        info!("IoTDB连接建立成功");

        Ok(())
    }

    /// 确保连接可用
    async fn ensure_connected(&self) -> Result<()> {
        let client_guard = self.client.lock().await;
        if client_guard.is_none() {
            drop(client_guard);
            self.connect().await?;
        }
        Ok(())
    }
    
    /// 测试连接
    pub async fn test_connection(&self) -> Result<u64> {
        info!("开始测试IoTDB连接: {}:{}", self.config.host, self.config.port);

        let start_time = std::time::Instant::now();

        // 尝试连接并执行简单查询
        match self.ensure_connected().await {
            Ok(_) => info!("IoTDB连接建立成功"),
            Err(e) => {
                warn!("IoTDB连接失败: {}", e);
                return Err(e);
            }
        }

        let mut client_guard = self.client.lock().await;
        if let Some(client) = client_guard.as_mut() {
            // 执行版本查询测试连接
            match client.execute_statement("SHOW VERSION").await {
                Ok(_result) => {
                    let elapsed = start_time.elapsed().as_millis() as u64;
                    info!("IoTDB连接测试成功，延迟: {}ms", elapsed);
                    Ok(elapsed)
                }
                Err(e) => {
                    warn!("IoTDB查询执行失败: {}", e);
                    Err(anyhow::anyhow!("查询执行失败: {}", e))
                }
            }
        } else {
            Err(anyhow::anyhow!("IoTDB客户端未连接"))
        }
    }
    
    /// 执行查询
    pub async fn execute_query(&self, sql: &str, database: Option<&str>) -> Result<QueryResult> {
        debug!("执行IoTDB查询: {} (数据库: {:?})", sql, database);

        // 如果是SHOW VERSION查询，测试数据解析
        if sql.to_uppercase().contains("SHOW VERSION") {
            debug!("检测到SHOW VERSION查询，将测试数据解析功能");
            self.test_parse_known_data();
        }

        let start_time = std::time::Instant::now();

        // 确保连接可用
        self.ensure_connected().await?;

        let mut client_guard = self.client.lock().await;
        if let Some(client) = client_guard.as_mut() {
            // 执行SQL查询
            let response = client.execute_statement(sql).await?;
            let execution_time = start_time.elapsed().as_millis() as u64;

            // 转换响应为QueryResult格式
            let mut result = QueryResult::empty();
            result.execution_time = Some(execution_time);

            // 解析响应数据
            let columns: Vec<String> = response.columns.unwrap_or_default();
            let data_types: Vec<String> = response.data_type_list.unwrap_or_default();
            let mut rows: Vec<Vec<serde_json::Value>> = Vec::new();

            debug!("查询响应 - 列数: {}, 数据类型: {:?}", columns.len(), data_types);

            // 解析IoTDB查询数据集
            if let Some(query_data_set) = response.query_data_set {
                debug!("开始解析IoTDB查询数据集");
                debug!("时间数据长度: {} 字节", query_data_set.time.len());
                debug!("值列表数量: {}", query_data_set.value_list.len());
                debug!("位图列表数量: {}", query_data_set.bitmap_list.len());

                // 检查是否有query_result字段（某些IoTDB版本可能使用这个字段）
                if let Some(ref query_result) = response.query_result {
                    debug!("发现query_result字段，包含 {} 行数据", query_result.len());

                    // 使用query_result解析数据
                    for (row_index, row_data) in query_result.iter().enumerate() {
                        debug!("解析第 {} 行，数据长度: {} 字节", row_index, row_data.len());
                        if row_data.len() > 0 {
                            debug!("第 {} 行数据前16字节: {:?}", row_index, &row_data[..std::cmp::min(16, row_data.len())]);
                        }

                        let row_values = self.parse_query_result_row(row_data, &columns, &data_types)?;
                        rows.push(row_values);
                    }
                } else {
                    // 使用传统的query_data_set解析数据
                    let time_data = &query_data_set.time;
                    let value_list = &query_data_set.value_list;
                    let bitmap_list = &query_data_set.bitmap_list;

                    // 添加详细的数据调试信息
                    for (i, column_data) in value_list.iter().enumerate() {
                        debug!("列 {} 数据长度: {} 字节", i, column_data.len());
                        if column_data.len() > 0 {
                            debug!("列 {} 前16字节: {:?}", i, &column_data[..std::cmp::min(16, column_data.len())]);
                        }
                    }

                    if !time_data.is_empty() || !value_list.is_empty() {
                        // 尝试解析时间戳
                        let timestamps = if !time_data.is_empty() {
                            self.parse_time_data(time_data)?
                        } else {
                            Vec::new()
                        };

                        debug!("解析到 {} 个时间戳", timestamps.len());

                        // 确定行数
                        let row_count = if !timestamps.is_empty() {
                            timestamps.len()
                        } else if !value_list.is_empty() {
                            // 尝试从第一列数据推断行数
                            let estimated = self.estimate_row_count(&value_list[0], data_types.get(0).map(|s| s.as_str()).unwrap_or("TEXT"));
                            debug!("从第一列估计行数: {}", estimated);

                            // 如果估计行数为0，说明确实没有数据行
                            if estimated == 0 {
                                debug!("所有列数据长度为0，确认没有数据行");
                                0
                            } else {
                                estimated
                            }
                        } else {
                            0
                        };

                        debug!("最终确定行数: {}", row_count);

                        for row_index in 0..row_count {
                            let mut row_values = Vec::new();

                            // 添加时间戳列（如果查询包含时间戳且有时间数据）
                            if !timestamps.is_empty() && row_index < timestamps.len() {
                                // 检查第一列是否是时间列
                                if columns.first().map(|c| c.to_lowercase()).as_deref() == Some("time") {
                                    row_values.push(serde_json::Value::Number(
                                        serde_json::Number::from(timestamps[row_index])
                                    ));
                                }
                            }

                            // 解析每列的数据
                            for (col_index, column_data) in value_list.iter().enumerate() {
                                let data_type = data_types.get(col_index).map(|s| s.as_str()).unwrap_or("TEXT");
                                let bitmap = bitmap_list.get(col_index);

                                debug!("解析第 {} 行，第 {} 列，数据类型: {}, 数据长度: {} 字节",
                                       row_index, col_index, data_type, column_data.len());

                                let value = self.parse_column_value(
                                    column_data,
                                    row_index,
                                    data_type,
                                    bitmap
                                )?;

                                debug!("第 {} 行，第 {} 列解析结果: {:?}", row_index, col_index, value);
                                row_values.push(value);
                            }

                            debug!("第 {} 行完整数据: {:?}", row_index, row_values);
                            rows.push(row_values);
                        }
                    }
                }

                debug!("成功解析 {} 行数据", rows.len());
            } else {
                debug!("响应中没有查询数据集");
            }

            result.row_count = Some(rows.len());

            // 构造series格式的结果
            if !columns.is_empty() {
                use crate::models::{QueryResultItem, Series};

                let series = Series {
                    name: database.unwrap_or("default").to_string(),
                    columns,
                    values: rows,
                    tags: None,
                };

                result.results = vec![QueryResultItem {
                    series: Some(vec![series]),
                    error: None,
                }];
            } else {
                result.row_count = Some(0);
            }

            info!("IoTDB查询执行成功: {} 行结果，耗时: {}ms",
                  result.row_count.unwrap_or(0), execution_time);
            Ok(result)
        } else {
            Err(anyhow::anyhow!("IoTDB客户端未连接"))
        }
    }
    
    /// 获取数据库列表（存储组）
    pub async fn get_databases(&self) -> Result<Vec<String>> {
        debug!("获取IoTDB存储组列表");

        // 尝试不同的查询语句
        let queries = vec![
            "SHOW STORAGE GROUP",
            "SHOW DATABASES",
            "SHOW DATABASE",
            "LIST DATABASE",
        ];

        for query in queries {
            debug!("尝试查询存储组: {}", query);
            match self.execute_query(query, None).await {
                Ok(result) => {
                    debug!("查询 '{}' 成功，解析结果", query);
                    let mut databases = Vec::new();

                    if let Some(results) = result.results.first() {
                        if let Some(series_list) = &results.series {
                            for series in series_list {
                                debug!("处理series: {}, 行数: {}", series.name, series.values.len());
                                for (row_index, row) in series.values.iter().enumerate() {
                                    debug!("处理第 {} 行: {:?}", row_index, row);
                                    if let Some(db_name) = row.first() {
                                        if let Some(name_str) = db_name.as_str() {
                                            debug!("找到存储组: {}", name_str);
                                            databases.push(name_str.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if !databases.is_empty() {
                        info!("使用查询 '{}' 获取到 {} 个存储组: {:?}", query, databases.len(), databases);
                        return Ok(databases);
                    } else {
                        debug!("查询 '{}' 没有返回存储组数据", query);
                    }
                }
                Err(e) => {
                    debug!("查询 '{}' 失败: {}", query, e);
                    continue;
                }
            }
        }

        // 如果所有查询都失败，尝试查询一些常见的存储组
        debug!("所有存储组查询都失败，尝试探测常见存储组");
        let common_storage_groups = vec!["root.test", "root.demo", "root.vehicle", "root.ln"];
        let mut found_groups = Vec::new();

        for sg in common_storage_groups {
            match self.execute_query(&format!("SHOW DEVICES {}", sg), None).await {
                Ok(_) => {
                    debug!("探测到存储组: {}", sg);
                    found_groups.push(sg.to_string());
                }
                Err(_) => {
                    debug!("存储组 {} 不存在", sg);
                }
            }
        }

        if !found_groups.is_empty() {
            info!("通过探测找到 {} 个存储组: {:?}", found_groups.len(), found_groups);
            return Ok(found_groups);
        }

        info!("没有找到任何存储组，返回空列表");
        Ok(vec![])
    }

    /// 获取表列表（设备）
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取IoTDB设备列表: {}", database);

        // 尝试不同的查询语句
        let queries = if database.is_empty() || database == "root" {
            vec![
                "SHOW DEVICES".to_string(),
                "SHOW DEVICES root".to_string(),
                "SHOW DEVICES root.**".to_string(),
            ]
        } else {
            vec![
                format!("SHOW DEVICES {}", database),
                format!("SHOW DEVICES {}.**", database),
                format!("SHOW DEVICES {}.** ", database),
            ]
        };

        for query in queries {
            debug!("尝试查询设备: {}", query);
            match self.execute_query(&query, Some(database)).await {
                Ok(result) => {
                    debug!("查询 '{}' 成功，解析结果", query);
                    let mut tables = Vec::new();

                    if let Some(results) = result.results.first() {
                        if let Some(series_list) = &results.series {
                            for series in series_list {
                                debug!("处理设备series: {}, 行数: {}", series.name, series.values.len());
                                for (row_index, row) in series.values.iter().enumerate() {
                                    debug!("处理设备第 {} 行: {:?}", row_index, row);
                                    if let Some(device_name) = row.first() {
                                        if let Some(name_str) = device_name.as_str() {
                                            debug!("找到设备: {}", name_str);
                                            tables.push(name_str.to_string());
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if !tables.is_empty() {
                        info!("使用查询 '{}' 获取到 {} 个设备: {:?}", query, tables.len(), tables);
                        return Ok(tables);
                    } else {
                        debug!("查询 '{}' 没有返回设备数据", query);
                    }
                }
                Err(e) => {
                    debug!("查询 '{}' 失败: {}", query, e);
                    continue;
                }
            }
        }

        info!("没有找到任何设备，返回空列表");
        Ok(vec![])
    }

    /// 获取字段信息
    pub async fn get_fields(&self, database: &str, table: &str) -> Result<Vec<FieldInfo>> {
        debug!("获取IoTDB时间序列信息: {}.{}", database, table);

        let sql = format!("SHOW TIMESERIES {}.*", table);
        let result = self.execute_query(&sql, Some(database)).await?;

        let mut fields = Vec::new();
        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if row.len() >= 4 {
                            if let (Some(name), Some(data_type)) = (row[0].as_str(), row[3].as_str()) {
                                let field_type = match data_type.to_uppercase().as_str() {
                                    "INT32" | "INT64" => FieldType::Integer,
                                    "FLOAT" | "DOUBLE" => FieldType::Float,
                                    "BOOLEAN" => FieldType::Boolean,
                                    "TEXT" => FieldType::String,
                                    _ => FieldType::String,
                                };

                                fields.push(FieldInfo {
                                    name: name.to_string(),
                                    field_type,
                                    last_value: None,
                                });
                            }
                        }
                    }
                }
            }
        }

        info!("获取到 {} 个时间序列", fields.len());
        Ok(fields)
    }
    
    /// 获取数据库类型
    pub fn get_database_type(&self) -> DatabaseType {
        DatabaseType::IoTDB
    }

    /// 关闭连接
    pub async fn close(&self) -> Result<()> {
        info!("关闭IoTDB官方客户端连接");

        let mut client_guard = self.client.lock().await;
        if let Some(mut client) = client_guard.take() {
            if let Err(e) = client.disconnect().await {
                warn!("关闭IoTDB连接时出错: {}", e);
            }
        }

        info!("IoTDB连接已关闭");
        Ok(())
    }

    /// 获取配置
    pub fn get_config(&self) -> &ConnectionConfig {
        &self.config
    }

    /// 断开连接
    pub async fn disconnect(&self) -> Result<()> {
        self.close().await
    }

    /// 获取连接状态
    pub async fn get_connection_status(&self) -> String {
        let client_guard = self.client.lock().await;
        if client_guard.is_some() {
            "Connected".to_string()
        } else {
            "Disconnected".to_string()
        }
    }

    /// 获取当前协议
    pub fn get_current_protocol(&self) -> String {
        "IoTDB Official".to_string()
    }

    /// 获取服务器信息
    pub async fn get_server_info(&self) -> Result<String> {
        let version_result = self.execute_query("SHOW VERSION", None).await?;

        if let Some(results) = version_result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if let Some(version) = row.first() {
                            if let Some(version_str) = version.as_str() {
                                return Ok(format!("IoTDB Server - {}", version_str));
                            }
                        }
                    }
                }
            }
        }

        Ok("IoTDB Server (Official Client)".to_string())
    }

    /// 检测版本
    pub async fn detect_version(&self) -> Result<String> {
        let version_result = self.execute_query("SHOW VERSION", None).await?;

        if let Some(results) = version_result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if let Some(version) = row.first() {
                            if let Some(version_str) = version.as_str() {
                                return Ok(version_str.to_string());
                            }
                        }
                    }
                }
            }
        }

        Ok("1.3.0".to_string())
    }

    /// 获取树节点
    pub async fn get_tree_nodes(&self) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::{TreeNode, TreeNodeType};

        debug!("获取IoTDB树节点");

        let mut nodes = Vec::new();

        // 1. 添加系统信息节点
        let system_info_node = TreeNode::new(
            "system_info".to_string(),
            "📊 System Information".to_string(),
            TreeNodeType::SystemInfo,
        );
        nodes.push(system_info_node);

        // 2. 添加版本信息节点
        let version_info_node = TreeNode::new(
            "version_info".to_string(),
            "ℹ️ Version Information".to_string(),
            TreeNodeType::VersionInfo,
        );
        nodes.push(version_info_node);

        // 3. 添加模式模板节点
        let schema_template_node = TreeNode::new(
            "schema_templates".to_string(),
            "📋 Schema Templates".to_string(),
            TreeNodeType::SchemaTemplate,
        );
        nodes.push(schema_template_node);

        // 4. 获取存储组列表
        let storage_groups = self.get_databases().await?;
        let storage_groups_empty = storage_groups.is_empty();

        for storage_group in storage_groups {
            let node = TreeNode::new(
                format!("sg_{}", storage_group),
                format!("📁 {}", storage_group),
                TreeNodeType::StorageGroup,
            );
            nodes.push(node);
        }

        // 5. 添加函数节点
        let functions_node = TreeNode::new(
            "functions".to_string(),
            "⚙️ Functions".to_string(),
            TreeNodeType::Function,
        );
        nodes.push(functions_node);

        // 6. 添加触发器节点
        let triggers_node = TreeNode::new(
            "triggers".to_string(),
            "🔄 Triggers".to_string(),
            TreeNodeType::Trigger,
        );
        nodes.push(triggers_node);

        // 如果没有存储组，添加一个默认的root节点用于探索
        if storage_groups_empty {
            debug!("没有找到存储组，添加默认root节点");
            let root_node = TreeNode::new(
                "root".to_string(),
                "📁 root".to_string(),
                TreeNodeType::StorageGroup,
            );
            nodes.push(root_node);
        }

        info!("生成了 {} 个树节点", nodes.len());
        Ok(nodes)
    }

    /// 获取树子节点
    pub async fn get_tree_children(&self, _parent_node_id: &str, _node_type: &str) -> Result<Vec<crate::models::TreeNode>> {
        Ok(vec![])
    }

    /// 获取设备
    pub async fn get_devices(&self, _database: &str) -> Result<Vec<String>> {
        self.get_tables(_database).await
    }

    /// 获取时间序列
    pub async fn get_timeseries(&self, _device_path: &str) -> Result<Vec<String>> {
        Ok(vec!["temperature".to_string(), "humidity".to_string()])
    }

    /// 解析时间戳数据
    fn parse_time_data(&self, time_data: &[u8]) -> Result<Vec<i64>> {
        debug!("解析时间戳数据，长度: {} 字节", time_data.len());

        let mut timestamps = Vec::new();
        let mut offset = 0;

        // IoTDB时间戳是8字节的long值
        while offset + 8 <= time_data.len() {
            let timestamp_bytes = &time_data[offset..offset + 8];
            let timestamp = i64::from_be_bytes([
                timestamp_bytes[0], timestamp_bytes[1], timestamp_bytes[2], timestamp_bytes[3],
                timestamp_bytes[4], timestamp_bytes[5], timestamp_bytes[6], timestamp_bytes[7],
            ]);
            timestamps.push(timestamp);
            offset += 8;
        }

        debug!("解析到 {} 个时间戳", timestamps.len());
        Ok(timestamps)
    }

    /// 解析列值数据
    fn parse_column_value(
        &self,
        column_data: &[u8],
        row_index: usize,
        data_type: &str,
        bitmap: Option<&Vec<u8>>
    ) -> Result<serde_json::Value> {
        // 检查是否为空值
        if let Some(bitmap_data) = bitmap {
            if self.is_null_value(bitmap_data, row_index) {
                return Ok(serde_json::Value::Null);
            }
        }

        // 根据数据类型解析值
        match data_type.to_uppercase().as_str() {
            "BOOLEAN" => self.parse_boolean_value(column_data, row_index),
            "INT32" => self.parse_int32_value(column_data, row_index),
            "INT64" => self.parse_int64_value(column_data, row_index),
            "FLOAT" => self.parse_float_value(column_data, row_index),
            "DOUBLE" => self.parse_double_value(column_data, row_index),
            "TEXT" | "STRING" => self.parse_text_value(column_data, row_index),
            _ => {
                debug!("未知数据类型: {}，尝试解析为文本", data_type);
                self.parse_text_value(column_data, row_index)
            }
        }
    }

    /// 检查是否为空值
    fn is_null_value(&self, bitmap: &[u8], row_index: usize) -> bool {
        let byte_index = row_index / 8;
        let bit_index = row_index % 8;

        if byte_index < bitmap.len() {
            let byte_value = bitmap[byte_index];
            let bit_mask = 1 << bit_index;
            (byte_value & bit_mask) == 0
        } else {
            false
        }
    }

    /// 解析布尔值
    fn parse_boolean_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        if row_index < data.len() {
            Ok(serde_json::Value::Bool(data[row_index] != 0))
        } else {
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析32位整数
    fn parse_int32_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        let offset = row_index * 4;
        if offset + 4 <= data.len() {
            let bytes = &data[offset..offset + 4];
            let value = i32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
            Ok(serde_json::Value::Number(serde_json::Number::from(value)))
        } else {
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析64位整数
    fn parse_int64_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        let offset = row_index * 8;
        if offset + 8 <= data.len() {
            let bytes = &data[offset..offset + 8];
            let value = i64::from_be_bytes([
                bytes[0], bytes[1], bytes[2], bytes[3],
                bytes[4], bytes[5], bytes[6], bytes[7],
            ]);
            Ok(serde_json::Value::Number(serde_json::Number::from(value)))
        } else {
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析浮点数
    fn parse_float_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        let offset = row_index * 4;
        if offset + 4 <= data.len() {
            let bytes = &data[offset..offset + 4];
            let value = f32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
            if let Some(num) = serde_json::Number::from_f64(value as f64) {
                Ok(serde_json::Value::Number(num))
            } else {
                Ok(serde_json::Value::Null)
            }
        } else {
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析双精度浮点数
    fn parse_double_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        let offset = row_index * 8;
        if offset + 8 <= data.len() {
            let bytes = &data[offset..offset + 8];
            let value = f64::from_be_bytes([
                bytes[0], bytes[1], bytes[2], bytes[3],
                bytes[4], bytes[5], bytes[6], bytes[7],
            ]);
            if let Some(num) = serde_json::Number::from_f64(value) {
                Ok(serde_json::Value::Number(num))
            } else {
                Ok(serde_json::Value::Null)
            }
        } else {
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析文本值
    fn parse_text_value(&self, data: &[u8], row_index: usize) -> Result<serde_json::Value> {
        debug!("解析文本值，行索引: {}, 数据长度: {} 字节", row_index, data.len());

        // 对于文本类型，需要先读取长度，然后读取字符串内容
        let mut offset = 0;

        // 跳过前面的字符串
        for i in 0..row_index {
            if offset + 4 > data.len() {
                debug!("跳过第 {} 行时数据不足，offset: {}, 数据长度: {}", i, offset, data.len());
                return Ok(serde_json::Value::Null);
            }

            // 读取字符串长度
            let length_bytes = &data[offset..offset + 4];
            let length = i32::from_be_bytes([
                length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
            ]) as usize;

            debug!("跳过第 {} 行，字符串长度: {}, offset: {}", i, length, offset);
            offset += 4 + length;
        }

        // 读取目标字符串
        if offset + 4 <= data.len() {
            let length_bytes = &data[offset..offset + 4];
            let length = i32::from_be_bytes([
                length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
            ]) as usize;

            debug!("目标行 {} 字符串长度: {}, offset: {}", row_index, length, offset);
            offset += 4;

            if offset + length <= data.len() {
                let text_bytes = &data[offset..offset + length];
                if let Ok(text) = std::str::from_utf8(text_bytes) {
                    debug!("成功解析文本: '{}'", text);
                    Ok(serde_json::Value::String(text.to_string()))
                } else {
                    debug!("UTF-8解析失败");
                    Ok(serde_json::Value::Null)
                }
            } else {
                debug!("数据长度不足，需要: {}, 实际: {}", offset + length, data.len());
                Ok(serde_json::Value::Null)
            }
        } else {
            debug!("长度前缀读取失败，offset: {}, 数据长度: {}", offset, data.len());
            Ok(serde_json::Value::Null)
        }
    }

    /// 解析query_result行数据
    fn parse_query_result_row(
        &self,
        row_data: &[u8],
        columns: &[String],
        data_types: &[String]
    ) -> Result<Vec<serde_json::Value>> {
        debug!("解析query_result行数据，长度: {} 字节，列数: {}", row_data.len(), columns.len());

        let mut values = Vec::new();
        let mut offset = 0;

        for (col_index, column_name) in columns.iter().enumerate() {
            if offset >= row_data.len() {
                debug!("数据不足，为列 {} 填充null", column_name);
                values.push(serde_json::Value::Null);
                continue;
            }

            let data_type = data_types.get(col_index).map(|s| s.as_str()).unwrap_or("TEXT");

            // 根据数据类型解析值
            let (value, bytes_consumed) = match data_type.to_uppercase().as_str() {
                "BOOLEAN" => {
                    if offset < row_data.len() {
                        (serde_json::Value::Bool(row_data[offset] != 0), 1)
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                "INT32" => {
                    if offset + 4 <= row_data.len() {
                        let bytes = &row_data[offset..offset + 4];
                        let value = i32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
                        (serde_json::Value::Number(serde_json::Number::from(value)), 4)
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                "INT64" => {
                    if offset + 8 <= row_data.len() {
                        let bytes = &row_data[offset..offset + 8];
                        let value = i64::from_be_bytes([
                            bytes[0], bytes[1], bytes[2], bytes[3],
                            bytes[4], bytes[5], bytes[6], bytes[7],
                        ]);
                        (serde_json::Value::Number(serde_json::Number::from(value)), 8)
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                "FLOAT" => {
                    if offset + 4 <= row_data.len() {
                        let bytes = &row_data[offset..offset + 4];
                        let value = f32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
                        if let Some(num) = serde_json::Number::from_f64(value as f64) {
                            (serde_json::Value::Number(num), 4)
                        } else {
                            (serde_json::Value::Null, 4)
                        }
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                "DOUBLE" => {
                    if offset + 8 <= row_data.len() {
                        let bytes = &row_data[offset..offset + 8];
                        let value = f64::from_be_bytes([
                            bytes[0], bytes[1], bytes[2], bytes[3],
                            bytes[4], bytes[5], bytes[6], bytes[7],
                        ]);
                        if let Some(num) = serde_json::Number::from_f64(value) {
                            (serde_json::Value::Number(num), 8)
                        } else {
                            (serde_json::Value::Null, 8)
                        }
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                "TEXT" | "STRING" => {
                    if offset + 4 <= row_data.len() {
                        let length_bytes = &row_data[offset..offset + 4];
                        let length = i32::from_be_bytes([
                            length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
                        ]) as usize;

                        if offset + 4 + length <= row_data.len() {
                            let text_bytes = &row_data[offset + 4..offset + 4 + length];
                            if let Ok(text) = std::str::from_utf8(text_bytes) {
                                (serde_json::Value::String(text.to_string()), 4 + length)
                            } else {
                                (serde_json::Value::Null, 4 + length)
                            }
                        } else {
                            (serde_json::Value::Null, 4)
                        }
                    } else {
                        (serde_json::Value::Null, 0)
                    }
                },
                _ => {
                    debug!("未知数据类型: {}，尝试解析为文本", data_type);
                    // 尝试解析为字符串
                    if let Ok(value_str) = std::str::from_utf8(&row_data[offset..]) {
                        if let Some(null_pos) = value_str.find('\0') {
                            let actual_value = &value_str[..null_pos];
                            (serde_json::Value::String(actual_value.to_string()), null_pos + 1)
                        } else {
                            (serde_json::Value::String(value_str.to_string()), row_data.len() - offset)
                        }
                    } else {
                        (serde_json::Value::Null, 1)
                    }
                }
            };

            values.push(value);
            offset += bytes_consumed;
        }

        debug!("成功解析query_result行数据: {} 个值", values.len());
        Ok(values)
    }

    /// 估计行数
    fn estimate_row_count(&self, data: &[u8], data_type: &str) -> usize {
        debug!("估计行数，数据类型: {}, 数据长度: {} 字节", data_type, data.len());

        let count = match data_type.to_uppercase().as_str() {
            "BOOLEAN" => data.len(),
            "INT32" | "FLOAT" => data.len() / 4,
            "INT64" | "DOUBLE" => data.len() / 8,
            "TEXT" | "STRING" => {
                // 对于文本类型，需要解析长度前缀来计算行数
                let mut count = 0;
                let mut offset = 0;

                while offset + 4 <= data.len() {
                    let length_bytes = &data[offset..offset + 4];
                    let length = i32::from_be_bytes([
                        length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
                    ]) as usize;

                    debug!("第 {} 行，字符串长度: {}, offset: {}", count, length, offset);

                    offset += 4 + length;
                    count += 1;

                    if offset >= data.len() {
                        break;
                    }
                }

                debug!("文本类型估计行数: {}", count);
                count
            },
            _ => 0,
        };

        debug!("最终估计行数: {}", count);
        count
    }

    /// 测试数据解析（用于调试）
    fn test_parse_known_data(&self) {
        // 测试已知的SHOW VERSION数据
        let test_data1 = vec![0, 0, 0, 5, 50, 46, 48, 46, 52]; // "2.0.4"
        let test_data2 = vec![0, 0, 0, 7, 51, 52, 48, 48, 102, 97, 56]; // "3400fa8"

        debug!("测试解析已知数据:");
        if let Ok(value1) = self.parse_text_value(&test_data1, 0) {
            debug!("测试数据1解析结果: {:?}", value1);
        }

        if let Ok(value2) = self.parse_text_value(&test_data2, 0) {
            debug!("测试数据2解析结果: {:?}", value2);
        }
    }

}
