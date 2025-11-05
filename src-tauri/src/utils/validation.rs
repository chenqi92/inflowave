use crate::models::ConnectionConfig;
use anyhow::{anyhow, Result};
use std::net::IpAddr;
use std::str::FromStr;
use log::debug;

/// 验证工具
pub struct ValidationUtils;

impl ValidationUtils {
    /// 验证连接配置
    pub fn validate_connection_config(config: &ConnectionConfig) -> Result<()> {
        debug!("验证连接配置: {}", config.name);
        
        // 验证名称
        if config.name.trim().is_empty() {
            return Err(anyhow!("连接名称不能为空"));
        }
        
        if config.name.len() > 100 {
            return Err(anyhow!("连接名称长度不能超过 100 个字符"));
        }
        
        // 验证主机地址
        Self::validate_host(&config.host)?;
        
        // 验证端口
        Self::validate_port(config.port)?;
        
        // 验证超时时间
        if config.timeout == 0 || config.timeout > 300 {
            return Err(anyhow!("超时时间必须在 1-300 秒之间"));
        }
        
        // 验证用户名和密码
        if let Some(username) = &config.username {
            if username.trim().is_empty() {
                return Err(anyhow!("用户名不能为空"));
            }
        }
        
        debug!("连接配置验证通过");
        Ok(())
    }

    /// 验证主机地址
    fn validate_host(host: &str) -> Result<()> {
        if host.trim().is_empty() {
            return Err(anyhow!("主机地址不能为空"));
        }
        
        // 尝试解析为 IP 地址
        if let Ok(_) = IpAddr::from_str(host) {
            return Ok(());
        }
        
        // 验证域名格式
        if Self::is_valid_hostname(host) {
            return Ok(());
        }
        
        Err(anyhow!("无效的主机地址格式"))
    }

    /// 验证端口号
    fn validate_port(port: u16) -> Result<()> {
        if port == 0 {
            return Err(anyhow!("端口号不能为 0"));
        }
        
        // InfluxDB 常用端口范围检查
        if port < 1024 && port != 80 && port != 443 {
            return Err(anyhow!("端口号 {} 可能需要管理员权限", port));
        }
        
        Ok(())
    }

    /// 验证主机名格式
    fn is_valid_hostname(hostname: &str) -> bool {
        if hostname.is_empty() || hostname.len() > 253 {
            return false;
        }
        
        // 检查是否以点开头或结尾
        if hostname.starts_with('.') || hostname.ends_with('.') {
            return false;
        }
        
        // 分割并验证每个标签
        for label in hostname.split('.') {
            if !Self::is_valid_label(label) {
                return false;
            }
        }
        
        true
    }

    /// 验证域名标签
    fn is_valid_label(label: &str) -> bool {
        if label.is_empty() || label.len() > 63 {
            return false;
        }
        
        // 检查是否以连字符开头或结尾
        if label.starts_with('-') || label.ends_with('-') {
            return false;
        }
        
        // 检查字符是否有效
        label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    }

    /// 验证查询语句
    pub fn validate_query(query: &str) -> Result<()> {
        Self::validate_query_with_settings(query, None)
    }

    /// 带设置的查询验证
    pub fn validate_query_with_settings(query: &str, controller_settings: Option<&crate::commands::settings::ControllerSettings>) -> Result<()> {
        debug!("验证查询语句");

        let trimmed_query = query.trim();

        if trimmed_query.is_empty() {
            return Err(anyhow!("查询语句不能为空"));
        }

        // 检查查询长度
        if trimmed_query.len() > 10000 {
            return Err(anyhow!("查询语句长度不能超过 10000 个字符"));
        }

        let upper_query = trimmed_query.to_uppercase();

        // 检查控制器设置限制
        if let Some(settings) = controller_settings {
            // 检查DELETE语句权限
            if !settings.allow_delete_statements && upper_query.starts_with("DELETE") {
                return Err(anyhow!("DELETE语句已被禁用\n\n原因：为了保护数据安全，DELETE操作默认被禁用。\n\n解决方法：\n1. 打开应用设置（右上角齿轮图标）\n2. 进入「查询设置」标签\n3. 在「语句权限控制」区域启用「允许DELETE语句」\n4. 保存设置后重新执行查询"));
            }

            // 检查DROP语句权限
            if !settings.allow_drop_statements && upper_query.starts_with("DROP") {
                return Err(anyhow!("DROP语句已被禁用\n\n原因：为了保护数据安全，DROP操作默认被禁用。\n\n解决方法：\n1. 打开应用设置（右上角齿轮图标）\n2. 进入「查询设置」标签\n3. 在「语句权限控制」区域启用「允许DROP语句」\n4. 保存设置后重新执行查询"));
            }

            // 检查危险操作权限（只有在对应的语句类型被允许时才检查）
            if !settings.allow_dangerous_operations {
                let dangerous_operations = [
                    ("DROP DATABASE", settings.allow_drop_statements),
                    ("DROP MEASUREMENT", settings.allow_drop_statements),
                ];

                for (operation, is_allowed) in &dangerous_operations {
                    if upper_query.contains(operation) && !is_allowed {
                        return Err(anyhow!("危险操作 '{}' 已被管理员禁用。请在设置中启用控制器权限。", operation));
                    }
                }

                // DELETE FROM 只有在DELETE语句被允许但危险操作被禁用时才检查
                if upper_query.contains("DELETE FROM") && settings.allow_delete_statements {
                    return Err(anyhow!("危险操作 'DELETE FROM' 已被管理员禁用。请在设置中启用危险操作权限。"));
                }
            }
        }

        // 基本的 SQL 注入检查
        let dangerous_patterns = [
            "TRUNCATE",  // InfluxDB不支持TRUNCATE
            "; DROP",    // 防止SQL注入
            "; DELETE",  // 防止SQL注入
        ];

        for pattern in &dangerous_patterns {
            if upper_query.contains(pattern) {
                return Err(anyhow!("查询包含潜在危险的操作: {}", pattern));
            }
        }

        // 验证 InfluxQL 函数使用（仅对 SELECT 语句）
        if upper_query.starts_with("SELECT") {
            Self::validate_influxql_functions(trimmed_query)?;
        }

        debug!("查询语句验证通过");
        Ok(())
    }

    /// 检查是否为INSERT语句
    pub fn is_insert_statement(query: &str) -> bool {
        let trimmed_query = query.trim().to_uppercase();
        trimmed_query.starts_with("INSERT")
    }

    /// 检查是否为DDL语句（数据定义语言）
    pub fn is_ddl_statement(query: &str) -> bool {
        let trimmed_query = query.trim().to_uppercase();
        trimmed_query.starts_with("CREATE") ||
        trimmed_query.starts_with("DROP") ||
        trimmed_query.starts_with("ALTER")
    }

    /// 检查是否为DML语句（数据操作语言）
    pub fn is_dml_statement(query: &str) -> bool {
        let trimmed_query = query.trim().to_uppercase();
        trimmed_query.starts_with("INSERT") ||
        trimmed_query.starts_with("DELETE") ||
        trimmed_query.starts_with("UPDATE")
    }

    /// 检查是否为查询语句
    pub fn is_query_statement(query: &str) -> bool {
        let trimmed_query = query.trim().to_uppercase();
        trimmed_query.starts_with("SELECT") ||
        trimmed_query.starts_with("SHOW") ||
        trimmed_query.starts_with("EXPLAIN")
    }

    /// 获取SQL语句类型
    pub fn get_statement_type(query: &str) -> String {
        let trimmed_query = query.trim().to_uppercase();

        if trimmed_query.starts_with("SELECT") {
            // 检测聚合查询
            if Self::is_aggregate_query(&trimmed_query) {
                return "SELECT_AGGREGATE".to_string();
            }
            // 检测分组查询
            if Self::is_group_by_query(&trimmed_query) {
                return "SELECT_GROUP".to_string();
            }
            "SELECT".to_string()
        } else if trimmed_query.starts_with("INSERT") {
            "INSERT".to_string()
        } else if trimmed_query.starts_with("DELETE") {
            "DELETE".to_string()
        } else if trimmed_query.starts_with("UPDATE") {
            "UPDATE".to_string()
        } else if trimmed_query.starts_with("CREATE") {
            "CREATE".to_string()
        } else if trimmed_query.starts_with("DROP") {
            "DROP".to_string()
        } else if trimmed_query.starts_with("ALTER") {
            "ALTER".to_string()
        } else if trimmed_query.starts_with("SHOW") {
            "SHOW".to_string()
        } else if trimmed_query.starts_with("EXPLAIN") {
            "EXPLAIN".to_string()
        } else if trimmed_query.starts_with("GRANT") {
            "GRANT".to_string()
        } else if trimmed_query.starts_with("REVOKE") {
            "REVOKE".to_string()
        } else {
            "UNKNOWN".to_string()
        }
    }

    /// 检测是否为聚合查询
    fn is_aggregate_query(query: &str) -> bool {
        // InfluxQL 聚合函数
        let influxql_functions = [
            "COUNT(", "SUM(", "MEAN(", "MAX(", "MIN(", "STDDEV(", "VARIANCE(",
            "MEDIAN(", "MODE(", "SPREAD(", "INTEGRAL(", "DISTINCT(",
            "FIRST(", "LAST(", "PERCENTILE(", "SAMPLE(", "TOP(", "BOTTOM("
        ];
        // 标准 SQL 聚合函数（用于检测）
        let sql_functions = ["AVG("];

        influxql_functions.iter().any(|func| query.contains(func)) ||
        sql_functions.iter().any(|func| query.contains(func))
    }

    /// 检测是否为分组查询
    fn is_group_by_query(query: &str) -> bool {
        query.contains("GROUP BY")
    }

    /// 验证 InfluxQL 函数使用
    /// 检测不支持的 SQL 函数并提供建议
    pub fn validate_influxql_functions(query: &str) -> Result<()> {
        let upper_query = query.to_uppercase();

        // 不支持的 SQL 函数及其 InfluxQL 替代方案
        let unsupported_functions = [
            ("AVG(", "MEAN(", "AVG() 函数在 InfluxQL 中不支持，请使用 MEAN() 代替"),
            ("AVERAGE(", "MEAN(", "AVERAGE() 函数在 InfluxQL 中不支持，请使用 MEAN() 代替"),
            ("STDEV(", "STDDEV(", "STDEV() 函数在 InfluxQL 中不支持，请使用 STDDEV() 代替"),
            ("VAR(", "VARIANCE(", "VAR() 函数在 InfluxQL 中不支持，请使用 VARIANCE() 代替"),
        ];

        for (unsupported, replacement, message) in &unsupported_functions {
            if upper_query.contains(unsupported) {
                return Err(anyhow!(
                    "{}。\n建议修改：将 {} 替换为 {}",
                    message,
                    unsupported.trim_end_matches('('),
                    replacement.trim_end_matches('(')
                ));
            }
        }

        Ok(())
    }

    /// 将INSERT语句转换为Line Protocol格式
    /// 支持单条或多条INSERT语句（通过分号或多个INSERT关键字分割）
    pub fn parse_insert_to_line_protocol(query: &str) -> Result<String> {
        debug!("解析INSERT语句: {}", query);

        let trimmed_query = query.trim();

        // 检查是否包含INSERT关键字
        if !trimmed_query.to_uppercase().contains("INSERT") {
            return Err(anyhow!("不是有效的INSERT语句"));
        }

        // 分割多条INSERT语句
        // 1. 先按分号分割
        // 2. 再按INSERT关键字分割（处理没有分号的多条INSERT）
        let mut line_protocols = Vec::new();

        // 按分号分割
        let statements: Vec<&str> = trimmed_query
            .split(';')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();

        for statement in statements {
            // 检查是否包含多个INSERT关键字（没有分号分割的情况）
            if statement.matches("INSERT").count() > 1 || statement.matches("insert").count() > 1 {
                // 使用正则表达式或简单的字符串处理来分割
                // 这里使用简单的方法：找到所有INSERT关键字的位置
                let upper_statement = statement.to_uppercase();
                let mut insert_positions = Vec::new();

                // 找到所有INSERT关键字的位置
                let mut pos = 0;
                while let Some(found_pos) = upper_statement[pos..].find("INSERT") {
                    insert_positions.push(pos + found_pos);
                    pos += found_pos + 6; // "INSERT".len() = 6
                }

                // 根据位置分割语句
                for i in 0..insert_positions.len() {
                    let start = insert_positions[i];
                    let end = if i + 1 < insert_positions.len() {
                        insert_positions[i + 1]
                    } else {
                        statement.len()
                    };

                    let single_statement = statement[start..end].trim();
                    if !single_statement.is_empty() {
                        let line_protocol = Self::parse_single_insert(single_statement)?;
                        line_protocols.push(line_protocol);
                    }
                }
            } else {
                // 单条INSERT语句
                let line_protocol = Self::parse_single_insert(statement)?;
                line_protocols.push(line_protocol);
            }
        }

        if line_protocols.is_empty() {
            return Err(anyhow!("没有找到有效的INSERT语句"));
        }

        // 合并所有Line Protocol（每行一个数据点）
        let result = line_protocols.join("\n");
        debug!("INSERT语句转换为Line Protocol ({} 行): {}", line_protocols.len(), result);
        Ok(result)
    }

    /// 解析单条INSERT语句
    fn parse_single_insert(statement: &str) -> Result<String> {
        let trimmed = statement.trim();

        // 去掉INSERT关键字
        let line_protocol = trimmed
            .strip_prefix("INSERT")
            .or_else(|| trimmed.strip_prefix("insert"))
            .ok_or_else(|| anyhow!("无法解析INSERT语句: {}", trimmed))?
            .trim();

        // 验证Line Protocol格式
        Self::validate_line_protocol_format(line_protocol)?;

        Ok(line_protocol.to_string())
    }

    /// 验证Line Protocol格式
    fn validate_line_protocol_format(line_protocol: &str) -> Result<()> {
        if line_protocol.trim().is_empty() {
            return Err(anyhow!("Line Protocol内容不能为空"));
        }

        // 基本格式验证：至少包含测量名和字段
        let parts: Vec<&str> = line_protocol.split_whitespace().collect();
        if parts.len() < 2 {
            return Err(anyhow!("Line Protocol格式错误：至少需要测量名和字段"));
        }

        // 检查测量名部分（可能包含标签）
        let measurement_part = parts[0];
        if measurement_part.is_empty() {
            return Err(anyhow!("测量名不能为空"));
        }

        // 检查字段部分
        let fields_part = parts[1];
        if !fields_part.contains('=') {
            return Err(anyhow!("字段格式错误：必须包含键值对"));
        }

        Ok(())
    }

    /// 验证数据库名称
    pub fn validate_database_name(name: &str) -> Result<()> {
        debug!("验证数据库名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow!("数据库名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow!("数据库名称长度不能超过 64 个字符"));
        }
        
        // 检查首字符
        if !name.chars().next().unwrap().is_ascii_alphabetic() {
            return Err(anyhow!("数据库名称必须以字母开头"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            return Err(anyhow!("数据库名称只能包含字母、数字和下划线"));
        }
        
        // 检查保留字
        let reserved_words = ["_internal", "system"];
        if reserved_words.contains(&name.to_lowercase().as_str()) {
            return Err(anyhow!("数据库名称不能使用保留字: {}", name));
        }
        
        debug!("数据库名称验证通过");
        Ok(())
    }

    /// 验证测量名称
    pub fn validate_measurement_name(name: &str) -> Result<()> {
        debug!("验证测量名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow!("测量名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow!("测量名称长度不能超过 64 个字符"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
            return Err(anyhow!("测量名称只能包含字母、数字、下划线和连字符"));
        }
        
        debug!("测量名称验证通过");
        Ok(())
    }

    /// 验证保留策略名称
    pub fn validate_retention_policy_name(name: &str) -> Result<()> {
        debug!("验证保留策略名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow!("保留策略名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow!("保留策略名称长度不能超过 64 个字符"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            return Err(anyhow!("保留策略名称只能包含字母、数字和下划线"));
        }
        
        debug!("保留策略名称验证通过");
        Ok(())
    }

    /// 验证保留策略持续时间
    pub fn validate_retention_duration(duration: &str) -> Result<()> {
        debug!("验证保留策略持续时间: {}", duration);
        
        if duration.trim().is_empty() {
            return Err(anyhow!("持续时间不能为空"));
        }
        
        // 简单的持续时间格式验证
        let valid_suffixes = ["ns", "us", "ms", "s", "m", "h", "d", "w"];
        let has_valid_suffix = valid_suffixes.iter().any(|&suffix| duration.ends_with(suffix));
        
        if !has_valid_suffix {
            return Err(anyhow!("无效的持续时间格式，支持的单位: ns, us, ms, s, m, h, d, w"));
        }
        
        debug!("保留策略持续时间验证通过");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    // use crate::models::ConnectionConfig;

    #[test]
    fn test_validate_host() {
        // 有效的 IP 地址
        assert!(ValidationUtils::validate_host("192.168.1.1").is_ok());
        assert!(ValidationUtils::validate_host("::1").is_ok());
        
        // 有效的域名
        assert!(ValidationUtils::validate_host("localhost").is_ok());
        assert!(ValidationUtils::validate_host("example.com").is_ok());
        assert!(ValidationUtils::validate_host("sub.example.com").is_ok());
        
        // 无效的地址
        assert!(ValidationUtils::validate_host("").is_err());
        assert!(ValidationUtils::validate_host(" ").is_err());
        assert!(ValidationUtils::validate_host(".example.com").is_err());
        assert!(ValidationUtils::validate_host("example.com.").is_err());
    }

    #[test]
    fn test_validate_port() {
        // 有效端口
        assert!(ValidationUtils::validate_port(8086).is_ok());
        assert!(ValidationUtils::validate_port(80).is_ok());
        assert!(ValidationUtils::validate_port(443).is_ok());
        assert!(ValidationUtils::validate_port(65535).is_ok());
        
        // 无效端口
        assert!(ValidationUtils::validate_port(0).is_err());
    }

    #[test]
    fn test_validate_database_name() {
        // 有效名称
        assert!(ValidationUtils::validate_database_name("mydb").is_ok());
        assert!(ValidationUtils::validate_database_name("my_database").is_ok());
        assert!(ValidationUtils::validate_database_name("db123").is_ok());
        
        // 无效名称
        assert!(ValidationUtils::validate_database_name("").is_err());
        assert!(ValidationUtils::validate_database_name("123db").is_err());
        assert!(ValidationUtils::validate_database_name("my-db").is_err());
        assert!(ValidationUtils::validate_database_name("_internal").is_err());
    }
}
