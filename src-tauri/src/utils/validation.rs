use crate::models::ConnectionConfig;
use anyhow::Result;
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
            return Err(anyhow::anyhow!("连接名称不能为空"));
        }
        
        if config.name.len() > 100 {
            return Err(anyhow::anyhow!("连接名称长度不能超过 100 个字符"));
        }
        
        // 验证主机地址
        Self::validate_host(&config.host)?;
        
        // 验证端口
        Self::validate_port(config.port)?;
        
        // 验证超时时间
        if config.timeout == 0 || config.timeout > 300 {
            return Err(anyhow::anyhow!("超时时间必须在 1-300 秒之间"));
        }
        
        // 验证用户名和密码
        if let Some(username) = &config.username {
            if username.trim().is_empty() {
                return Err(anyhow::anyhow!("用户名不能为空"));
            }
        }
        
        debug!("连接配置验证通过");
        Ok(())
    }

    /// 验证主机地址
    fn validate_host(host: &str) -> Result<()> {
        if host.trim().is_empty() {
            return Err(anyhow::anyhow!("主机地址不能为空"));
        }
        
        // 尝试解析为 IP 地址
        if let Ok(_) = IpAddr::from_str(host) {
            return Ok(());
        }
        
        // 验证域名格式
        if Self::is_valid_hostname(host) {
            return Ok(());
        }
        
        Err(anyhow::anyhow!("无效的主机地址格式"))
    }

    /// 验证端口号
    fn validate_port(port: u16) -> Result<()> {
        if port == 0 {
            return Err(anyhow::anyhow!("端口号不能为 0"));
        }
        
        // InfluxDB 常用端口范围检查
        if port < 1024 && port != 80 && port != 443 {
            return Err(anyhow::anyhow!("端口号 {} 可能需要管理员权限", port));
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
            return Err(anyhow::anyhow!("查询语句不能为空"));
        }

        // 检查查询长度
        if trimmed_query.len() > 10000 {
            return Err(anyhow::anyhow!("查询语句长度不能超过 10000 个字符"));
        }

        let upper_query = trimmed_query.to_uppercase();

        // 检查控制器设置限制
        if let Some(settings) = controller_settings {
            // 检查DELETE语句权限
            if !settings.allow_delete_statements && upper_query.starts_with("DELETE") {
                return Err(anyhow::anyhow!("DELETE语句已被管理员禁用。请在设置中启用控制器权限。"));
            }

            // 检查DROP语句权限
            if !settings.allow_drop_statements && upper_query.starts_with("DROP") {
                return Err(anyhow::anyhow!("DROP语句已被管理员禁用。请在设置中启用控制器权限。"));
            }

            // 检查危险操作权限（只有在对应的语句类型被允许时才检查）
            if !settings.allow_dangerous_operations {
                let dangerous_operations = [
                    ("DROP DATABASE", settings.allow_drop_statements),
                    ("DROP MEASUREMENT", settings.allow_drop_statements),
                ];

                for (operation, is_allowed) in &dangerous_operations {
                    if upper_query.contains(operation) && !is_allowed {
                        return Err(anyhow::anyhow!("危险操作 '{}' 已被管理员禁用。请在设置中启用控制器权限。", operation));
                    }
                }

                // DELETE FROM 只有在DELETE语句被允许但危险操作被禁用时才检查
                if upper_query.contains("DELETE FROM") && settings.allow_delete_statements {
                    return Err(anyhow::anyhow!("危险操作 'DELETE FROM' 已被管理员禁用。请在设置中启用危险操作权限。"));
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
                return Err(anyhow::anyhow!("查询包含潜在危险的操作: {}", pattern));
            }
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

    /// 将INSERT语句转换为Line Protocol格式
    pub fn parse_insert_to_line_protocol(query: &str) -> Result<String> {
        debug!("解析INSERT语句: {}", query);

        let trimmed_query = query.trim();

        // 检查是否为INSERT语句
        if !Self::is_insert_statement(trimmed_query) {
            return Err(anyhow::anyhow!("不是有效的INSERT语句"));
        }

        // 简单的INSERT语句解析
        // 支持格式: INSERT measurement,tag1=value1,tag2=value2 field1=value1,field2=value2 timestamp
        // 去掉INSERT关键字
        let line_protocol = trimmed_query
            .strip_prefix("INSERT")
            .or_else(|| trimmed_query.strip_prefix("insert"))
            .ok_or_else(|| anyhow::anyhow!("无法解析INSERT语句"))?
            .trim();

        // 验证Line Protocol格式
        Self::validate_line_protocol_format(line_protocol)?;

        debug!("INSERT语句转换为Line Protocol: {}", line_protocol);
        Ok(line_protocol.to_string())
    }

    /// 验证Line Protocol格式
    fn validate_line_protocol_format(line_protocol: &str) -> Result<()> {
        if line_protocol.trim().is_empty() {
            return Err(anyhow::anyhow!("Line Protocol内容不能为空"));
        }

        // 基本格式验证：至少包含测量名和字段
        let parts: Vec<&str> = line_protocol.split_whitespace().collect();
        if parts.len() < 2 {
            return Err(anyhow::anyhow!("Line Protocol格式错误：至少需要测量名和字段"));
        }

        // 检查测量名部分（可能包含标签）
        let measurement_part = parts[0];
        if measurement_part.is_empty() {
            return Err(anyhow::anyhow!("测量名不能为空"));
        }

        // 检查字段部分
        let fields_part = parts[1];
        if !fields_part.contains('=') {
            return Err(anyhow::anyhow!("字段格式错误：必须包含键值对"));
        }

        Ok(())
    }

    /// 验证数据库名称
    pub fn validate_database_name(name: &str) -> Result<()> {
        debug!("验证数据库名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow::anyhow!("数据库名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow::anyhow!("数据库名称长度不能超过 64 个字符"));
        }
        
        // 检查首字符
        if !name.chars().next().unwrap().is_ascii_alphabetic() {
            return Err(anyhow::anyhow!("数据库名称必须以字母开头"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            return Err(anyhow::anyhow!("数据库名称只能包含字母、数字和下划线"));
        }
        
        // 检查保留字
        let reserved_words = ["_internal", "system"];
        if reserved_words.contains(&name.to_lowercase().as_str()) {
            return Err(anyhow::anyhow!("数据库名称不能使用保留字: {}", name));
        }
        
        debug!("数据库名称验证通过");
        Ok(())
    }

    /// 验证测量名称
    pub fn validate_measurement_name(name: &str) -> Result<()> {
        debug!("验证测量名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow::anyhow!("测量名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow::anyhow!("测量名称长度不能超过 64 个字符"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
            return Err(anyhow::anyhow!("测量名称只能包含字母、数字、下划线和连字符"));
        }
        
        debug!("测量名称验证通过");
        Ok(())
    }

    /// 验证保留策略名称
    pub fn validate_retention_policy_name(name: &str) -> Result<()> {
        debug!("验证保留策略名称: {}", name);
        
        if name.trim().is_empty() {
            return Err(anyhow::anyhow!("保留策略名称不能为空"));
        }
        
        if name.len() > 64 {
            return Err(anyhow::anyhow!("保留策略名称长度不能超过 64 个字符"));
        }
        
        // 检查字符有效性
        if !name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            return Err(anyhow::anyhow!("保留策略名称只能包含字母、数字和下划线"));
        }
        
        debug!("保留策略名称验证通过");
        Ok(())
    }

    /// 验证保留策略持续时间
    pub fn validate_retention_duration(duration: &str) -> Result<()> {
        debug!("验证保留策略持续时间: {}", duration);
        
        if duration.trim().is_empty() {
            return Err(anyhow::anyhow!("持续时间不能为空"));
        }
        
        // 简单的持续时间格式验证
        let valid_suffixes = ["ns", "us", "ms", "s", "m", "h", "d", "w"];
        let has_valid_suffix = valid_suffixes.iter().any(|&suffix| duration.ends_with(suffix));
        
        if !has_valid_suffix {
            return Err(anyhow::anyhow!("无效的持续时间格式，支持的单位: ns, us, ms, s, m, h, d, w"));
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
