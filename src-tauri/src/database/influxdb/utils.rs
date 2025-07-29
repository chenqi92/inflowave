/**
 * InfluxDB 工具函数
 * 
 * 提供 Line Protocol 格式化、数据验证等工具函数
 */

use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;

/// Line Protocol 格式化器
pub struct LineProtocolFormatter;

impl LineProtocolFormatter {
    /// 格式化单个数据点为 Line Protocol
    pub fn format_point(
        measurement: &str,
        tags: &[(&str, &str)],
        fields: &[(&str, &Value)],
        timestamp: Option<i64>,
    ) -> Result<String> {
        // 验证测量名称
        Self::validate_measurement_name(measurement)?;
        
        let mut line = String::new();
        
        // 添加测量名称
        line.push_str(&Self::escape_measurement(measurement));
        
        // 添加标签
        if !tags.is_empty() {
            for (key, value) in tags {
                Self::validate_tag_key(key)?;
                line.push(',');
                line.push_str(&Self::escape_tag_key(key));
                line.push('=');
                line.push_str(&Self::escape_tag_value(value));
            }
        }
        
        // 添加字段
        if fields.is_empty() {
            return Err(anyhow!("至少需要一个字段"));
        }
        
        line.push(' ');
        let mut first_field = true;
        for (key, value) in fields {
            Self::validate_field_key(key)?;
            if !first_field {
                line.push(',');
            }
            line.push_str(&Self::escape_field_key(key));
            line.push('=');
            line.push_str(&Self::format_field_value(value)?);
            first_field = false;
        }
        
        // 添加时间戳
        if let Some(ts) = timestamp {
            line.push(' ');
            line.push_str(&ts.to_string());
        }
        
        Ok(line)
    }
    
    /// 批量格式化多个数据点
    pub fn format_points(points: &[LineProtocolPoint]) -> Result<String> {
        let mut lines = Vec::new();
        for point in points {
            let line = Self::format_point(
                &point.measurement,
                &point.tags.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect::<Vec<_>>(),
                &point.fields.iter().map(|(k, v)| (k.as_str(), v)).collect::<Vec<_>>(),
                point.timestamp,
            )?;
            lines.push(line);
        }
        Ok(lines.join("\n"))
    }
    
    /// 转义测量名称
    fn escape_measurement(name: &str) -> String {
        name.replace(',', r"\,").replace(' ', r"\ ")
    }
    
    /// 转义标签键
    fn escape_tag_key(key: &str) -> String {
        key.replace(',', r"\,")
            .replace('=', r"\=")
            .replace(' ', r"\ ")
    }
    
    /// 转义标签值
    fn escape_tag_value(value: &str) -> String {
        value.replace(',', r"\,")
            .replace('=', r"\=")
            .replace(' ', r"\ ")
    }
    
    /// 转义字段键
    fn escape_field_key(key: &str) -> String {
        key.replace(',', r"\,")
            .replace('=', r"\=")
            .replace(' ', r"\ ")
    }
    
    /// 格式化字段值
    fn format_field_value(value: &Value) -> Result<String> {
        match value {
            Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    Ok(format!("{}i", i))
                } else if let Some(f) = n.as_f64() {
                    Ok(f.to_string())
                } else {
                    Err(anyhow!("无效的数字值"))
                }
            }
            Value::String(s) => Ok(format!("\"{}\"", s.replace('"', r#"\""#))),
            Value::Bool(b) => Ok(b.to_string()),
            _ => Err(anyhow!("不支持的字段值类型")),
        }
    }
    
    /// 验证测量名称
    fn validate_measurement_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(anyhow!("测量名称不能为空"));
        }
        if name.len() > 255 {
            return Err(anyhow!("测量名称长度不能超过255个字符"));
        }
        Ok(())
    }
    
    /// 验证标签键
    fn validate_tag_key(key: &str) -> Result<()> {
        if key.is_empty() {
            return Err(anyhow!("标签键不能为空"));
        }
        if key.len() > 255 {
            return Err(anyhow!("标签键长度不能超过255个字符"));
        }
        Ok(())
    }
    
    /// 验证字段键
    fn validate_field_key(key: &str) -> Result<()> {
        if key.is_empty() {
            return Err(anyhow!("字段键不能为空"));
        }
        if key.len() > 255 {
            return Err(anyhow!("字段键长度不能超过255个字符"));
        }
        Ok(())
    }
}

/// Line Protocol 数据点
#[derive(Debug, Clone)]
pub struct LineProtocolPoint {
    pub measurement: String,
    pub tags: HashMap<String, String>,
    pub fields: HashMap<String, Value>,
    pub timestamp: Option<i64>,
}

impl LineProtocolPoint {
    /// 创建新的数据点
    pub fn new(measurement: String) -> Self {
        Self {
            measurement,
            tags: HashMap::new(),
            fields: HashMap::new(),
            timestamp: None,
        }
    }
    
    /// 添加标签
    pub fn tag(mut self, key: String, value: String) -> Self {
        self.tags.insert(key, value);
        self
    }
    
    /// 添加字段
    pub fn field(mut self, key: String, value: Value) -> Self {
        self.fields.insert(key, value);
        self
    }
    
    /// 设置时间戳
    pub fn timestamp(mut self, timestamp: i64) -> Self {
        self.timestamp = Some(timestamp);
        self
    }
    
    /// 转换为 Line Protocol 字符串
    pub fn to_line_protocol(&self) -> Result<String> {
        LineProtocolFormatter::format_point(
            &self.measurement,
            &self.tags.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect::<Vec<_>>(),
            &self.fields.iter().map(|(k, v)| (k.as_str(), v)).collect::<Vec<_>>(),
            self.timestamp,
        )
    }
}

/// 数据库名称验证器
pub struct DatabaseValidator;

impl DatabaseValidator {
    /// 验证数据库名称
    pub fn validate_database_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(anyhow!("数据库名称不能为空"));
        }
        
        if name.len() > 255 {
            return Err(anyhow!("数据库名称长度不能超过255个字符"));
        }
        
        // 检查是否包含非法字符
        let invalid_chars = [' ', '"', '\'', '\\', '\n', '\r', '\t'];
        for &ch in &invalid_chars {
            if name.contains(ch) {
                return Err(anyhow!("数据库名称包含非法字符: '{}'", ch));
            }
        }
        
        // 检查是否以数字开头
        if name.chars().next().unwrap().is_ascii_digit() {
            return Err(anyhow!("数据库名称不能以数字开头"));
        }
        
        Ok(())
    }
    
    /// 验证测量名称
    pub fn validate_measurement_name(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(anyhow!("测量名称不能为空"));
        }
        
        if name.len() > 255 {
            return Err(anyhow!("测量名称长度不能超过255个字符"));
        }
        
        Ok(())
    }
}

/// 时间戳解析器
pub struct TimestampParser;

impl TimestampParser {
    /// 解析时间戳字符串
    pub fn parse_timestamp(timestamp_str: &str) -> Result<i64> {
        // 尝试解析纳秒时间戳
        if let Ok(ns) = timestamp_str.parse::<i64>() {
            return Ok(ns);
        }
        
        // 尝试解析 RFC3339 格式
        if let Ok(dt) = DateTime::parse_from_rfc3339(timestamp_str) {
            return Ok(dt.timestamp_nanos_opt().unwrap_or(0));
        }
        
        // 尝试解析 UTC 格式
        if let Ok(dt) = timestamp_str.parse::<DateTime<Utc>>() {
            return Ok(dt.timestamp_nanos_opt().unwrap_or(0));
        }
        
        Err(anyhow!("无法解析时间戳: {}", timestamp_str))
    }
    
    /// 格式化时间戳为 RFC3339 字符串
    pub fn format_timestamp(timestamp_ns: i64) -> String {
        let dt = DateTime::from_timestamp_nanos(timestamp_ns);
        dt.format("%Y-%m-%dT%H:%M:%S%.9fZ").to_string()
    }
    
    /// 获取当前时间戳（纳秒）
    pub fn current_timestamp_ns() -> i64 {
        Utc::now().timestamp_nanos_opt().unwrap_or(0)
    }
}

/// 查询语言检测器
pub struct QueryLanguageDetector;

impl QueryLanguageDetector {
    /// 检测查询语言类型
    pub fn detect_language(query: &str) -> crate::database::influxdb::QueryLanguage {
        let query_upper = query.trim().to_uppercase();
        
        // 检测 Flux 查询特征
        if Self::is_flux_query(&query_upper) {
            return crate::database::influxdb::QueryLanguage::Flux;
        }
        
        // 检测 SQL 查询特征
        if Self::is_sql_query(&query_upper) {
            return crate::database::influxdb::QueryLanguage::Sql;
        }
        
        // 默认为 InfluxQL
        crate::database::influxdb::QueryLanguage::InfluxQL
    }
    
    /// 检测是否为 Flux 查询
    fn is_flux_query(query: &str) -> bool {
        // Flux 查询的典型特征
        query.contains("FROM(") || 
        query.contains("RANGE(") || 
        query.contains("|>") ||
        query.contains("BUCKET:") ||
        query.starts_with("IMPORT")
    }
    
    /// 检测是否为 SQL 查询
    fn is_sql_query(query: &str) -> bool {
        // SQL 查询的典型特征，但排除 InfluxQL 特有的语法
        if query.starts_with("SELECT") && query.contains("FROM") {
            // 检查是否包含 InfluxQL 特有的语法
            if query.contains("GROUP BY TIME") || 
               query.contains("FILL(") ||
               query.contains("SLIMIT") ||
               query.contains("SOFFSET") {
                return false; // 这是 InfluxQL
            }
            
            // 检查是否包含标准 SQL 语法
            if query.contains("JOIN") ||
               query.contains("UNION") ||
               query.contains("HAVING") ||
               query.contains("WINDOW") {
                return true; // 这是标准 SQL
            }
        }
        
        false
    }
}

// 便利函数，保持向后兼容
pub fn format_line_protocol(
    measurement: &str,
    tags: &[(&str, &str)],
    fields: &[(&str, &Value)],
    timestamp: Option<i64>,
) -> String {
    LineProtocolFormatter::format_point(measurement, tags, fields, timestamp)
        .unwrap_or_else(|e| format!("Error: {}", e))
}

pub fn validate_database_name(name: &str) -> Result<()> {
    DatabaseValidator::validate_database_name(name)
}

pub fn parse_timestamp(timestamp_str: &str) -> Result<i64> {
    TimestampParser::parse_timestamp(timestamp_str)
}
