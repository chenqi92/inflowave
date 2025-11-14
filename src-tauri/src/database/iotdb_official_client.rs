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
use log::{debug, info, trace, warn};

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

        // 检查是否已经连接且会话有效
        if let Some(client) = client_guard.as_ref() {
            if client.is_connected() {
                debug!("IoTDB连接已存在且会话有效，跳过重新连接");
                return Ok(()); // 已经连接且会话有效
            } else {
                warn!("IoTDB会话已失效，需要重新连接");
            }
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

        let session_id = thrift_client.open_session().await
            .map_err(|e| anyhow::anyhow!("打开IoTDB会话失败: {}", e))?;

        info!("IoTDB连接建立成功，会话ID: {}", session_id);

        *client_guard = Some(thrift_client);

        Ok(())
    }

    /// 确保连接可用
    async fn ensure_connected(&self) -> Result<()> {
        let client_guard = self.client.lock().await;

        // 检查客户端是否存在以及会话是否有效
        let needs_reconnect = if let Some(client) = client_guard.as_ref() {
            !client.is_connected()
        } else {
            true
        };

        if needs_reconnect {
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

            debug!("查询响应 - 原始列数: {}, 列名: {:?}", columns.len(), columns);
            debug!("数据类型: {:?}", data_types);

            // 对于IoTDB的SELECT *查询，需要处理列名
            // IoTDB可能返回两种格式：
            // 1. [Time, root.xxx.yyy.field1, root.xxx.yyy.field2, ...] - 完整路径
            // 2. [Time, root.xxx.yyy, field1, field2, ...] - 表名 + 短字段名
            // 我们需要检测并处理第二种情况

            let table_name_column_index = if columns.len() > 1 {
                // 检查第二列是否是表名（以root.开头但不是完整的时间序列路径）
                if let Some(second_col) = columns.get(1) {
                    // 如果第二列以root.开头，且第三列不以root.开头，说明第二列是表名
                    if second_col.starts_with("root.") {
                        if columns.len() > 2 {
                            if let Some(third_col) = columns.get(2) {
                                if !third_col.starts_with("root.") {
                                    // 第二列是表名，第三列是短字段名
                                    debug!("检测到表名列（格式2）: {}", second_col);
                                    Some(1)
                                } else {
                                    // 第二列和第三列都是完整路径，没有表名列
                                    None
                                }
                            } else {
                                None
                            }
                        } else {
                            // 只有两列，无法判断
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            } else {
                None
            };

            // 解析IoTDB查询数据集
            if let Some(query_data_set) = response.query_data_set {
                debug!("开始解析IoTDB查询数据集");
                trace!("时间数据长度: {} 字节", query_data_set.time.len());
                trace!("值列表数量: {}", query_data_set.value_list.len());
                trace!("位图列表数量: {}", query_data_set.bitmap_list.len());

                // 检查是否有query_result字段（某些IoTDB版本可能使用这个字段）
                if let Some(ref query_result) = response.query_result {
                    debug!("发现query_result字段，包含 {} 行数据", query_result.len());

                    // 使用query_result解析数据
                    for (row_index, row_data) in query_result.iter().enumerate() {
                        trace!("解析第 {} 行，数据长度: {} 字节", row_index, row_data.len());
                        if row_data.len() > 0 {
                            trace!("第 {} 行数据前16字节: {:?}", row_index, &row_data[..std::cmp::min(16, row_data.len())]);
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
                        debug!("时间数据长度: {} 字节, value_list数量: {}", time_data.len(), value_list.len());
                        let timestamps = if !time_data.is_empty() {
                            self.parse_time_data(time_data)?
                        } else {
                            debug!("⚠️ 时间数据为空，无法解析时间戳");
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

                            // IoTDB的数据结构：
                            // columns: [Time, 表名或字段1, 字段2, ...]
                            // value_list: [字段1数据, 字段2数据, ...] (不包含Time)
                            // time: [时间戳数组]

                            // 第一列：添加时间戳（如果有时间数据）
                            if !timestamps.is_empty() && row_index < timestamps.len() {
                                row_values.push(serde_json::Value::Number(
                                    serde_json::Number::from(timestamps[row_index])
                                ));
                                trace!("第 {} 行，添加时间戳: {}", row_index, timestamps[row_index]);
                            } else if columns.first().map(|c| c.to_lowercase()).as_deref() == Some("time") {
                                // 如果第一列是time但没有时间数据，添加null
                                row_values.push(serde_json::Value::Null);
                                warn!("⚠️ 第 {} 行，时间戳为空，添加null。timestamps长度: {}, 第一列: {:?}",
                                      row_index, timestamps.len(), columns.first());
                            }

                            // 后续列：解析value_list中的数据
                            for (col_index, column_data) in value_list.iter().enumerate() {
                                let data_type = data_types.get(col_index).map(|s| s.as_str()).unwrap_or("TEXT");
                                let bitmap = bitmap_list.get(col_index);

                                trace!("解析第 {} 行，第 {} 列（value_list索引），数据类型: {}, 数据长度: {} 字节",
                                       row_index, col_index, data_type, column_data.len());

                                let value = self.parse_column_value(
                                    column_data,
                                    row_index,
                                    data_type,
                                    bitmap
                                )?;

                                trace!("第 {} 行，第 {} 列解析结果: {:?}", row_index, col_index, value);
                                row_values.push(value);
                            }

                            trace!("第 {} 行完整数据（共{}列）: {:?}", row_index, row_values.len(), row_values);
                            rows.push(row_values);
                        }
                    }
                }

                debug!("成功解析 {} 行数据", rows.len());
            } else {
                debug!("响应中没有查询数据集");
            }

            result.row_count = Some(rows.len());

            // 如果检测到表名列，需要过滤掉
            let (final_columns, final_rows) = if let Some(table_col_idx) = table_name_column_index {
                debug!("过滤表名列，索引: {}", table_col_idx);

                // 过滤列名
                let filtered_columns: Vec<String> = columns.iter()
                    .enumerate()
                    .filter(|(idx, _)| *idx != table_col_idx)
                    .map(|(_, col)| col.clone())
                    .collect();

                // 过滤每行数据
                let filtered_rows: Vec<Vec<serde_json::Value>> = rows.iter()
                    .map(|row| {
                        row.iter()
                            .enumerate()
                            .filter(|(idx, _)| *idx != table_col_idx)
                            .map(|(_, val)| val.clone())
                            .collect()
                    })
                    .collect();

                debug!("过滤后 - 列数: {}, 列名: {:?}", filtered_columns.len(), filtered_columns);
                (filtered_columns, filtered_rows)
            } else {
                (columns, rows)
            };

            // 构造series格式的结果
            if !final_columns.is_empty() {
                use crate::models::{QueryResultItem, Series};

                let series = Series {
                    name: database.unwrap_or("default").to_string(),
                    columns: final_columns,
                    values: final_rows,
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

                                    // IoTDB 查询结果格式：
                                    // SHOW STORAGE GROUP/DATABASES 返回: [Time, Database, ...]
                                    // 第一列是时间戳，第二列是存储组名称
                                    let db_name = if row.len() > 1 {
                                        // 尝试从第二列获取（SHOW STORAGE GROUP/DATABASES）
                                        row.get(1)
                                    } else {
                                        // 如果只有一列，从第一列获取
                                        row.first()
                                    };

                                    if let Some(db_value) = db_name {
                                        if let Some(name_str) = db_value.as_str() {
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

        // 如果所有查询都失败，尝试智能探测存储组
        debug!("所有存储组查询都失败，尝试智能探测存储组");
        let found_groups = self.discover_storage_groups_intelligently().await?;

        if !found_groups.is_empty() {
            info!("通过智能探测找到 {} 个存储组: {:?}", found_groups.len(), found_groups);
            return Ok(found_groups);
        }

        info!("没有找到任何存储组，返回空列表");
        Ok(vec![])
    }

    /// 获取表列表（设备）
    pub async fn get_tables(&self, database: &str) -> Result<Vec<String>> {
        debug!("获取IoTDB设备列表: {}", database);

        // 处理系统节点的特殊情况
        match database {
            "System Information" | "SystemInfo" | "system_info" => {
                debug!("处理系统信息节点");
                return self.get_system_info_items().await;
            }
            "Version Information" | "VersionInfo" | "version_info" => {
                debug!("处理版本信息节点");
                return self.get_version_info_items().await;
            }
            "Schema Templates" | "SchemaTemplate" | "schema_template" => {
                debug!("处理模式模板节点");
                return self.get_schema_templates().await;
            }
            "Functions" | "Function" | "function" => {
                debug!("处理函数节点");
                return self.get_functions().await;
            }
            "Triggers" | "Trigger" | "trigger" => {
                debug!("处理触发器节点");
                return self.get_triggers().await;
            }
            _ => {
                // 处理存储组节点
                debug!("处理存储组节点: {}", database);
            }
        }

        // 优先使用SHOW DEVICES查询，只有在失败时才使用SHOW TIMESERIES
        let device_queries = if database.is_empty() || database == "root" {
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

        // 首先尝试设备查询
        for query in device_queries {
            debug!("尝试设备查询: {}", query);
            match self.execute_query(&query, Some(database)).await {
                Ok(result) => {
                    debug!("设备查询 '{}' 成功，解析结果", query);
                    let mut tables = Vec::new();

                    if let Some(results) = result.results.first() {
                        if let Some(series_list) = &results.series {
                            for series in series_list {
                                debug!("处理设备series: {}, 行数: {}", series.name, series.values.len());
                                for (row_index, row) in series.values.iter().enumerate() {
                                    debug!("处理设备第 {} 行: {:?}", row_index, row);

                                    // IoTDB 查询结果格式：
                                    // SHOW DEVICES 返回: [Time, Device, IsAligned, Template, TTL(ms)]
                                    // 第一列是时间戳，第二列是设备名称
                                    let device_name = if row.len() > 1 {
                                        // 尝试从第二列获取（SHOW DEVICES）
                                        row.get(1)
                                    } else {
                                        // 如果只有一列，从第一列获取
                                        row.first()
                                    };

                                    if let Some(device_value) = device_name {
                                        if let Some(name_str) = device_value.as_str() {
                                            if !name_str.is_empty() {
                                                debug!("找到设备: {}", name_str);
                                                if !tables.contains(&name_str.to_string()) {
                                                    tables.push(name_str.to_string());
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if !tables.is_empty() {
                        tables.sort();
                        tables.dedup();
                        info!("使用设备查询 '{}' 获取到 {} 个设备: {:?}", query, tables.len(), tables);
                        return Ok(tables);
                    } else {
                        debug!("设备查询 '{}' 没有返回设备数据", query);
                    }
                }
                Err(e) => {
                    debug!("设备查询 '{}' 失败: {}", query, e);
                    continue;
                }
            }
        }

        // 如果设备查询都失败，尝试从时间序列中提取设备
        debug!("所有设备查询都失败，尝试从时间序列中提取设备");
        let timeseries_queries = if database.is_empty() || database == "root" {
            vec![
                "SHOW TIMESERIES".to_string(),
                "SHOW TIMESERIES root.**".to_string(),
            ]
        } else {
            vec![
                format!("SHOW TIMESERIES {}.**", database),
            ]
        };

        for query in timeseries_queries {
            debug!("尝试时间序列查询: {}", query);
            match self.execute_query(&query, Some(database)).await {
                Ok(result) => {
                    debug!("时间序列查询 '{}' 成功，解析结果", query);
                    let mut tables = Vec::new();

                    if let Some(results) = result.results.first() {
                        if let Some(series_list) = &results.series {
                            for series in series_list {
                                debug!("处理时间序列series: {}, 行数: {}", series.name, series.values.len());
                                for (row_index, row) in series.values.iter().enumerate() {
                                    debug!("处理时间序列第 {} 行: {:?}", row_index, row);

                                    // 时间序列查询：从时间序列路径提取设备名
                                    if let Some(timeseries_path) = row.first() {
                                        if let Some(path_str) = timeseries_path.as_str() {
                                            if let Some(device_path) = self.extract_device_from_timeseries(path_str) {
                                                debug!("从时间序列 '{}' 提取设备: {}", path_str, device_path);
                                                // 检查是否已存在，避免重复添加
                                                if !tables.contains(&device_path) {
                                                    tables.push(device_path);
                                                } else {
                                                    debug!("设备 '{}' 已存在，跳过重复添加", device_path);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if !tables.is_empty() {
                        // 去重处理
                        tables.sort();
                        tables.dedup();
                        info!("使用时间序列查询 '{}' 获取到 {} 个设备（去重后）: {:?}", query, tables.len(), tables);
                        return Ok(tables);
                    } else {
                        debug!("时间序列查询 '{}' 没有返回设备数据", query);
                    }
                }
                Err(e) => {
                    debug!("时间序列查询 '{}' 失败: {}", query, e);
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

        // 1. 添加系统信息节点（容器节点，可展开）
        let system_info_node = TreeNode::new(
            "SystemInfo".to_string(),
            "System Information".to_string(),
            TreeNodeType::SystemInfo,
        )
        .as_system()
        .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
        .with_metadata("node_category".to_string(), serde_json::Value::String("info_container".to_string()));
        nodes.push(system_info_node);

        // 2. 添加版本信息节点（容器节点，可展开）
        let version_info_node = TreeNode::new(
            "VersionInfo".to_string(),
            "Version Information".to_string(),
            TreeNodeType::VersionInfo,
        )
        .as_system()
        .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
        .with_metadata("node_category".to_string(), serde_json::Value::String("info_container".to_string()));
        nodes.push(version_info_node);

        // 3. 添加模式模板节点（容器节点，可展开）
        let schema_template_node = TreeNode::new(
            "SchemaTemplate".to_string(),
            "Schema Templates".to_string(),
            TreeNodeType::SchemaTemplate,
        )
        .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
        .with_metadata("node_category".to_string(), serde_json::Value::String("management_container".to_string()));
        nodes.push(schema_template_node);

        // 4. 获取存储组列表
        let storage_groups = self.get_databases().await?;
        let storage_groups_empty = storage_groups.is_empty();

        for storage_group in storage_groups {
            let node = TreeNode::new(
                format!("sg_{}", storage_group),
                storage_group.clone(),
                TreeNodeType::StorageGroup,
            );
            nodes.push(node);
        }

        // 5. 添加函数节点（容器节点，可展开）
        let functions_node = TreeNode::new(
            "Functions".to_string(),
            "Functions".to_string(),
            TreeNodeType::Function,
        )
        .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
        .with_metadata("node_category".to_string(), serde_json::Value::String("management_container".to_string()));
        nodes.push(functions_node);

        // 6. 添加触发器节点（容器节点，可展开）
        let triggers_node = TreeNode::new(
            "Triggers".to_string(),
            "Triggers".to_string(),
            TreeNodeType::Trigger,
        )
        .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
        .with_metadata("node_category".to_string(), serde_json::Value::String("management_container".to_string()));
        nodes.push(triggers_node);

        // 如果没有存储组，添加一个默认的root节点用于探索
        if storage_groups_empty {
            debug!("没有找到存储组，添加默认root节点");
            let root_node = TreeNode::new(
                "root".to_string(),
                "root".to_string(),
                TreeNodeType::StorageGroup,
            );
            nodes.push(root_node);
        }

        info!("生成了 {} 个树节点", nodes.len());
        Ok(nodes)
    }

    /// 获取系统信息项目
    async fn get_system_info_items(&self) -> Result<Vec<String>> {
        debug!("获取系统信息项目");
        let items = vec![
            "Cluster Status".to_string(),
            "Node Information".to_string(),
            "Storage Engine".to_string(),
            "Memory Usage".to_string(),
            "Performance Metrics".to_string(),
        ];
        Ok(items)
    }

    /// 获取版本信息项目
    async fn get_version_info_items(&self) -> Result<Vec<String>> {
        debug!("获取版本信息项目");

        // 执行SHOW VERSION查询获取真实的版本信息
        match self.execute_query("SHOW VERSION", None).await {
            Ok(result) => {
                let mut items = Vec::new();
                if let Some(results) = result.results.first() {
                    if let Some(series_list) = &results.series {
                        for series in series_list {
                            for row in &series.values {
                                if row.len() >= 2 {
                                    if let (Some(version), Some(build)) = (row[0].as_str(), row[1].as_str()) {
                                        items.push(format!("Version: {}", version));
                                        items.push(format!("Build: {}", build));
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(items)
            }
            Err(e) => {
                warn!("获取版本信息失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 获取模式模板
    async fn get_schema_templates(&self) -> Result<Vec<String>> {
        debug!("获取模式模板");

        // 尝试执行SHOW SCHEMA TEMPLATES查询
        match self.execute_query("SHOW SCHEMA TEMPLATES", None).await {
            Ok(result) => {
                let mut templates = Vec::new();
                if let Some(results) = result.results.first() {
                    if let Some(series_list) = &results.series {
                        for series in series_list {
                            for row in &series.values {
                                if let Some(template_name) = row.first() {
                                    if let Some(name_str) = template_name.as_str() {
                                        templates.push(name_str.to_string());
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(templates)
            }
            Err(e) => {
                warn!("获取模式模板失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 获取函数列表
    async fn get_functions(&self) -> Result<Vec<String>> {
        debug!("获取函数列表");

        // 尝试执行SHOW FUNCTIONS查询
        match self.execute_query("SHOW FUNCTIONS", None).await {
            Ok(result) => {
                let mut functions = Vec::new();
                if let Some(results) = result.results.first() {
                    if let Some(series_list) = &results.series {
                        for series in series_list {
                            for row in &series.values {
                                if let Some(function_name) = row.first() {
                                    if let Some(name_str) = function_name.as_str() {
                                        functions.push(name_str.to_string());
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(functions)
            }
            Err(e) => {
                warn!("获取函数列表失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 获取触发器列表
    async fn get_triggers(&self) -> Result<Vec<String>> {
        debug!("获取触发器列表");

        // 尝试执行SHOW TRIGGERS查询
        match self.execute_query("SHOW TRIGGERS", None).await {
            Ok(result) => {
                let mut triggers = Vec::new();
                if let Some(results) = result.results.first() {
                    if let Some(series_list) = &results.series {
                        for series in series_list {
                            for row in &series.values {
                                if let Some(trigger_name) = row.first() {
                                    if let Some(name_str) = trigger_name.as_str() {
                                        triggers.push(name_str.to_string());
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(triggers)
            }
            Err(e) => {
                warn!("获取触发器列表失败: {}", e);
                Ok(vec![])
            }
        }
    }

    /// 获取树子节点
    pub async fn get_tree_children(&self, parent_node_id: &str, node_type: &str, parent_metadata: Option<&serde_json::Value>) -> Result<Vec<crate::models::TreeNode>> {
        use crate::models::{TreeNode, TreeNodeType};

        info!("========== 获取树子节点开始 ==========");
        info!("父节点ID: {}", parent_node_id);
        info!("节点类型: {}", node_type);
        info!("元数据: {:?}", parent_metadata);

        let mut children = Vec::new();

        match node_type {
            "connection" => {
                // 连接节点：返回存储组列表
                debug!("为 IoTDB 连接节点获取存储组列表");
                let storage_groups = self.get_databases().await?;
                debug!("获取到 {} 个存储组", storage_groups.len());

                for storage_group in storage_groups {
                    let child = TreeNode::new(
                        format!("sg_{}", storage_group),
                        storage_group.clone(),
                        TreeNodeType::StorageGroup,
                    )
                    .with_parent(parent_node_id.to_string())
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("data_container".to_string()));
                    children.push(child);
                }
            }
            "SystemInfo" | "system_info" => {
                // 系统信息节点的子节点
                let items = self.get_system_info_items().await?;
                for item in items {
                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, item.replace(" ", "_")),
                        item,
                        TreeNodeType::SystemInfo,
                    )
                    .as_system()
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("info_item".to_string()));
                    children.push(child);
                }
            }
            "VersionInfo" | "version_info" => {
                // 版本信息节点的子节点
                let items = self.get_version_info_items().await?;
                for item in items {
                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, item.replace(" ", "_")),
                        item,
                        TreeNodeType::VersionInfo,
                    )
                    .as_system()
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("info_item".to_string()));
                    children.push(child);
                }
            }
            "SchemaTemplate" | "schema_template" => {
                // 模式模板节点的子节点
                let templates = self.get_schema_templates().await?;
                for template in templates {
                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, template.replace(" ", "_")),
                        template,
                        TreeNodeType::SchemaTemplate,
                    )
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("management_item".to_string()));
                    children.push(child);
                }
            }
            "Function" | "function" => {
                // 函数节点的子节点
                let functions = self.get_functions().await?;
                for function in functions {
                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, function.replace(" ", "_")),
                        function,
                        TreeNodeType::Function,
                    )
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("management_item".to_string()));
                    children.push(child);
                }
            }
            "Trigger" | "trigger" => {
                // 触发器节点的子节点
                let triggers = self.get_triggers().await?;
                for trigger in triggers {
                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, trigger.replace(" ", "_")),
                        trigger,
                        TreeNodeType::Trigger,
                    )
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("management_item".to_string()));
                    children.push(child);
                }
            }
            "StorageGroup" | "storage_group" => {
                // 存储组节点的子节点（设备）
                let storage_group_name = parent_node_id.strip_prefix("sg_").unwrap_or(parent_node_id);
                info!("获取存储组 {} 的设备列表", storage_group_name);

                let devices = self.get_devices(storage_group_name).await?;
                info!("获取到 {} 个设备: {:?}", devices.len(), devices);

                for device in devices {
                    // 使用设备的完整路径作为节点ID，而不是添加sg_前缀
                    // device 已经是完整路径，如 "root.factory.workshop2.conveyor01"
                    let child = TreeNode::new(
                        device.replace(".", "_"),  // 使用设备路径本身，只替换点号
                        device.clone(),
                        TreeNodeType::Device,
                    )
                    .with_parent(parent_node_id.to_string())
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(true))  // 设备是容器节点，可以展开
                    .with_metadata("node_category".to_string(), serde_json::Value::String("data_node".to_string()))
                    .with_metadata("devicePath".to_string(), serde_json::Value::String(device.clone()))
                    .with_metadata("storageGroup".to_string(), serde_json::Value::String(storage_group_name.to_string()));
                    children.push(child);
                }
                info!("存储组 {} 生成了 {} 个设备节点", storage_group_name, children.len());
            }
            "Device" | "device" => {
                // 设备节点的子节点（时间序列）
                // 从 metadata 中获取真实的设备路径和存储组
                let (device_path, storage_group) = if let Some(metadata) = &parent_metadata {
                    let device_path = if let Some(device_path_value) = metadata.get("devicePath") {
                        device_path_value.as_str().unwrap_or(parent_node_id).to_string()
                    } else {
                        // 后备方案：将下划线替换回点号
                        parent_node_id.replace("_", ".")
                    };

                    let storage_group = if let Some(sg_value) = metadata.get("storageGroup") {
                        sg_value.as_str().unwrap_or("").to_string()
                    } else {
                        // 后备方案：从设备路径中提取存储组（前两段）
                        let parts: Vec<&str> = device_path.split('.').collect();
                        if parts.len() >= 2 {
                            format!("{}.{}", parts[0], parts[1])
                        } else {
                            String::new()
                        }
                    };

                    (device_path, storage_group)
                } else {
                    // 后备方案：将下划线替换回点号
                    let device_path = parent_node_id.replace("_", ".");
                    let parts: Vec<&str> = device_path.split('.').collect();
                    let storage_group = if parts.len() >= 2 {
                        format!("{}.{}", parts[0], parts[1])
                    } else {
                        String::new()
                    };
                    (device_path, storage_group)
                };

                debug!("获取设备 {} 的时间序列（节点ID: {}, 存储组: {}）", device_path, parent_node_id, storage_group);
                let timeseries = self.get_timeseries(&device_path).await?;
                for ts in timeseries {
                    // 构建完整的时间序列路径
                    let full_timeseries_path = format!("{}.{}", device_path, ts);

                    let child = TreeNode::new(
                        format!("{}_{}", parent_node_id, ts.replace(".", "_")),
                        ts.clone(),
                        TreeNodeType::Timeseries,
                    )
                    .with_parent(parent_node_id.to_string())
                    .as_leaf()
                    .with_metadata("is_container".to_string(), serde_json::Value::Bool(false))
                    .with_metadata("node_category".to_string(), serde_json::Value::String("data_leaf".to_string()))
                    .with_metadata("devicePath".to_string(), serde_json::Value::String(device_path.to_string()))
                    .with_metadata("timeseriesPath".to_string(), serde_json::Value::String(full_timeseries_path))
                    .with_metadata("measurement".to_string(), serde_json::Value::String(ts.clone()))
                    .with_metadata("storageGroup".to_string(), serde_json::Value::String(storage_group.clone()));
                    children.push(child);
                }
            }
            _ => {
                debug!("未知的节点类型: {}", node_type);
            }
        }

        info!("========== 获取树子节点完成 ==========");
        info!("父节点ID: {}", parent_node_id);
        info!("节点类型: {}", node_type);
        info!("子节点数量: {}", children.len());
        Ok(children)
    }

    /// 获取设备
    pub async fn get_devices(&self, _database: &str) -> Result<Vec<String>> {
        self.get_tables(_database).await
    }

    /// 获取时间序列
    pub async fn get_timeseries(&self, device_path: &str) -> Result<Vec<String>> {
        debug!("获取设备 {} 的时间序列", device_path);

        // 执行 SHOW TIMESERIES 查询
        let query = format!("SHOW TIMESERIES {}.*", device_path);
        debug!("时间序列查询: {}", query);

        let result = self.execute_query(&query, None).await?;

        let mut timeseries = Vec::new();

        // 解析查询结果
        // SHOW TIMESERIES 返回格式：[Time, Timeseries, Alias, Database, DataType, ...]
        // 第0列是时间戳，第1列是时间序列路径
        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        // 从第二列获取时间序列路径（第一列是时间戳）
                        let timeseries_path = if row.len() > 1 {
                            row.get(1)
                        } else {
                            row.first()
                        };

                        if let Some(timeseries_path) = timeseries_path {
                            if let Some(path_str) = timeseries_path.as_str() {
                                // 从完整路径中提取测点名（最后一部分）
                                // 例如：root.test.device1.temperature -> temperature
                                if let Some(measurement) = path_str.split('.').last() {
                                    timeseries.push(measurement.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        info!("设备 {} 的时间序列: {:?}", device_path, timeseries);
        Ok(timeseries)
    }

    /// 解析时间戳数据
    fn parse_time_data(&self, time_data: &[u8]) -> Result<Vec<i64>> {
        trace!("解析时间戳数据，长度: {} 字节", time_data.len());

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

        trace!("解析到 {} 个时间戳", timestamps.len());
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
        // 如果bitmap为空，假设所有值都有效
        if bitmap.is_empty() {
            trace!("Bitmap为空，假设所有值都有效，行索引: {}", row_index);
            return false;
        }

        let byte_index = row_index / 8;
        let bit_index = row_index % 8;

        if byte_index < bitmap.len() {
            let byte_value = bitmap[byte_index];
            let bit_mask = 1 << bit_index;

            // 检查bitmap是否全为0
            let has_any_set_bits = bitmap.iter().any(|&b| b != 0);
            if !has_any_set_bits {
                // 如果bitmap全为0，可能表示所有值都有效（IoTDB的某些版本行为）
                trace!("Bitmap全为0，假设所有值都有效，行索引: {}", row_index);
                return false;
            }

            // 从多次日志分析发现，IoTDB的bitmap行为不一致
            // 有时候全为255时有数据，有时候248时部分有数据
            // 最安全的做法是：如果有原始数据，就尝试解析，忽略bitmap
            trace!("忽略bitmap检查，直接尝试解析数据，行索引: {}, 字节值: {}, 位掩码: {}",
                   row_index, byte_value, bit_mask);
            false // 总是返回false，表示数据有效
        } else {
            // 如果没有bitmap数据，假设值有效
            trace!("Bitmap索引超出范围，假设值有效，行索引: {}", row_index);
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
        trace!("解析文本值，行索引: {}, 数据长度: {} 字节", row_index, data.len());

        // 如果数据长度为0，直接返回null
        if data.is_empty() {
            debug!("数据长度为0，返回null");
            return Ok(serde_json::Value::Null);
        }

        // 对于IoTDB的TEXT类型，数据可能是以不同方式编码的
        // 先尝试直接解析为字符串（适用于某些IoTDB版本）
        if let Ok(text) = std::str::from_utf8(data) {
            // 检查是否包含null终止符
            if let Some(null_pos) = text.find('\0') {
                let clean_text = &text[..null_pos];
                if !clean_text.is_empty() {
                    trace!("直接解析文本成功: '{}'", clean_text);
                    return Ok(serde_json::Value::String(clean_text.to_string()));
                }
            } else if !text.is_empty() {
                trace!("直接解析文本成功: '{}'", text);
                return Ok(serde_json::Value::String(text.to_string()));
            }
        }

        // 尝试按长度前缀格式解析
        let mut offset = 0;

        // 跳过前面的字符串
        for i in 0..row_index {
            if offset + 4 > data.len() {
                trace!("跳过第 {} 行时数据不足，offset: {}, 数据长度: {}", i, offset, data.len());
                return Ok(serde_json::Value::Null);
            }

            // 读取字符串长度
            let length_bytes = &data[offset..offset + 4];
            let length = i32::from_be_bytes([
                length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
            ]) as usize;

            trace!("跳过第 {} 行，字符串长度: {}, offset: {}", i, length, offset);

            // 检查长度是否合理
            if length > data.len() || length > 1024 * 1024 {
                debug!("字符串长度异常: {}, 可能不是长度前缀格式", length);
                return Ok(serde_json::Value::Null);
            }

            offset += 4 + length;
        }

        // 读取目标字符串
        if offset + 4 <= data.len() {
            let length_bytes = &data[offset..offset + 4];
            let length = i32::from_be_bytes([
                length_bytes[0], length_bytes[1], length_bytes[2], length_bytes[3]
            ]) as usize;

            trace!("目标行 {} 字符串长度: {}, offset: {}", row_index, length, offset);

            // 检查长度是否合理
            if length > data.len() || length > 1024 * 1024 {
                debug!("目标字符串长度异常: {}, 可能不是长度前缀格式", length);
                return Ok(serde_json::Value::Null);
            }

            offset += 4;

            if offset + length <= data.len() {
                let text_bytes = &data[offset..offset + length];
                if let Ok(text) = std::str::from_utf8(text_bytes) {
                    trace!("成功解析文本: '{}'", text);
                    Ok(serde_json::Value::String(text.to_string()))
                } else {
                    trace!("UTF-8解析失败");
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

    /// 智能探测存储组
    async fn discover_storage_groups_intelligently(&self) -> Result<Vec<String>> {
        debug!("开始智能探测存储组");
        let mut found_groups = Vec::new();

        // 1. 尝试通过SHOW TIMESERIES探测
        debug!("尝试通过SHOW TIMESERIES探测存储组");
        if let Ok(result) = self.execute_query("SHOW TIMESERIES", None).await {
            let timeseries_groups = self.extract_storage_groups_from_timeseries(&result);
            found_groups.extend(timeseries_groups);
        }

        // 2. 尝试通过SHOW DEVICES探测
        debug!("尝试通过SHOW DEVICES探测存储组");
        if let Ok(result) = self.execute_query("SHOW DEVICES", None).await {
            let device_groups = self.extract_storage_groups_from_devices(&result);
            found_groups.extend(device_groups);
        }

        // 3. 尝试通过SHOW CHILD PATHS探测
        debug!("尝试通过SHOW CHILD PATHS探测存储组");
        let root_paths = vec!["root", "root.*"];
        for path in root_paths {
            if let Ok(result) = self.execute_query(&format!("SHOW CHILD PATHS {}", path), None).await {
                let path_groups = self.extract_storage_groups_from_paths(&result);
                found_groups.extend(path_groups);
            }
        }

        // 4. 尝试通过COUNT TIMESERIES探测
        debug!("尝试通过COUNT TIMESERIES探测存储组");
        if let Ok(result) = self.execute_query("COUNT TIMESERIES root.**", None).await {
            // 如果有时间序列计数，说明至少有一个存储组存在
            if self.has_meaningful_result(&result) {
                // 尝试更具体的探测
                found_groups.extend(self.probe_common_patterns().await);
            }
        }

        // 去重并排序
        found_groups.sort();
        found_groups.dedup();

        debug!("智能探测完成，找到 {} 个存储组: {:?}", found_groups.len(), found_groups);
        Ok(found_groups)
    }

    /// 从时间序列结果中提取存储组
    fn extract_storage_groups_from_timeseries(&self, result: &crate::models::QueryResult) -> Vec<String> {
        let mut groups = Vec::new();

        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if let Some(timeseries_path) = row.first() {
                            if let Some(path_str) = timeseries_path.as_str() {
                                if let Some(storage_group) = self.extract_storage_group_from_path(path_str) {
                                    groups.push(storage_group);
                                }
                            }
                        }
                    }
                }
            }
        }

        groups
    }

    /// 从设备结果中提取存储组
    fn extract_storage_groups_from_devices(&self, result: &crate::models::QueryResult) -> Vec<String> {
        let mut groups = Vec::new();

        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if let Some(device_path) = row.first() {
                            if let Some(path_str) = device_path.as_str() {
                                if let Some(storage_group) = self.extract_storage_group_from_path(path_str) {
                                    groups.push(storage_group);
                                }
                            }
                        }
                    }
                }
            }
        }

        groups
    }

    /// 从路径结果中提取存储组
    fn extract_storage_groups_from_paths(&self, result: &crate::models::QueryResult) -> Vec<String> {
        let mut groups = Vec::new();

        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                for series in series_list {
                    for row in &series.values {
                        if let Some(path) = row.first() {
                            if let Some(path_str) = path.as_str() {
                                // 对于SHOW CHILD PATHS，结果通常是直接的路径
                                if path_str.starts_with("root.") && path_str.matches('.').count() == 1 {
                                    groups.push(path_str.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }

        groups
    }

    /// 从路径中提取存储组名称
    fn extract_storage_group_from_path(&self, path: &str) -> Option<String> {
        if !path.starts_with("root.") {
            return None;
        }

        // 找到第二个点的位置，存储组通常是root.xxx的格式
        let parts: Vec<&str> = path.split('.').collect();
        if parts.len() >= 2 {
            Some(format!("{}.{}", parts[0], parts[1]))
        } else {
            None
        }
    }

    /// 检查结果是否有意义
    fn has_meaningful_result(&self, result: &crate::models::QueryResult) -> bool {
        if let Some(results) = result.results.first() {
            if let Some(series_list) = &results.series {
                return !series_list.is_empty() &&
                       series_list.iter().any(|s| !s.values.is_empty());
            }
        }
        false
    }

    /// 探测常见的存储组模式
    async fn probe_common_patterns(&self) -> Vec<String> {
        debug!("探测常见的存储组模式");
        let mut found_groups = Vec::new();

        // 常见的存储组命名模式
        let patterns = vec![
            // 业务相关
            "test", "demo", "example", "sample",
            // 行业相关
            "vehicle", "energy", "medical", "agriculture", "factory", "home", "city", "datacenter",
            // 功能相关
            "data", "sensor", "device", "monitor", "log", "metric",
            // 环境相关
            "dev", "prod", "staging", "local",
            // 通用
            "db", "database", "storage", "ts", "timeseries",
        ];

        for pattern in patterns {
            let storage_group = format!("root.{}", pattern);

            // 使用轻量级查询检测存储组是否存在
            let detection_queries = vec![
                format!("SHOW CHILD PATHS {}", storage_group),
                format!("COUNT TIMESERIES {}.**", storage_group),
            ];

            for query in detection_queries {
                match self.execute_query(&query, None).await {
                    Ok(result) => {
                        if self.has_meaningful_result(&result) {
                            debug!("通过模式探测发现存储组: {}", storage_group);
                            found_groups.push(storage_group.clone());
                            break; // 找到就跳出内层循环
                        }
                    }
                    Err(_) => {
                        // 忽略错误，继续尝试下一个查询
                    }
                }
            }
        }

        found_groups
    }

    /// 从时间序列路径中提取设备路径
    fn extract_device_from_timeseries(&self, timeseries_path: &str) -> Option<String> {
        // IoTDB时间序列格式：root.storage_group.device.measurement
        // 或者更复杂的：root.storage_group.device.sub_device.measurement
        // 我们需要提取到设备级别，通常是去掉最后一个部分（measurement）

        if !timeseries_path.starts_with("root.") {
            return None;
        }

        let parts: Vec<&str> = timeseries_path.split('.').collect();
        if parts.len() >= 4 {
            // 对于 root.storage_group.device.measurement，取前3部分
            // 对于 root.storage_group.device.sub_device.measurement，取前4部分
            // 智能判断：如果倒数第二个部分看起来像设备名，就多取一层
            let device_parts = if parts.len() >= 5 &&
                (parts[parts.len()-2].contains("sensor") ||
                 parts[parts.len()-2].contains("device") ||
                 parts[parts.len()-2].contains("appliances") ||
                 parts[parts.len()-2].len() > 8) {
                // 包含更多层级的设备路径
                &parts[..parts.len()-1]
            } else {
                // 标准的三层结构：root.storage_group.device
                &parts[..parts.len().min(4)-1]
            };

            Some(device_parts.join("."))
        } else if parts.len() == 3 {
            // root.storage_group.measurement，返回存储组
            Some(parts[..2].join("."))
        } else {
            None
        }
    }

}
