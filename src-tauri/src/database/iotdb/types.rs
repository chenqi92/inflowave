/**
 * IoTDB 数据类型兼容性处理模块
 * 
 * 处理不同版本间的数据类型差异和自动降级
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::capability::VersionInfo;

/// IoTDB 数据类型枚举
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum IoTDBDataType {
    // 基础类型（所有版本支持）
    Boolean,
    Int32,
    Int64,
    Float,
    Double,
    Text,
    
    // 新类型（1.3+ 支持）
    String,
    Blob,
    Date,
    Timestamp,
    
    // 特殊类型
    Null,
}

impl IoTDBDataType {
    /// 获取类型的字符串表示
    pub fn as_str(&self) -> &'static str {
        match self {
            IoTDBDataType::Boolean => "BOOLEAN",
            IoTDBDataType::Int32 => "INT32",
            IoTDBDataType::Int64 => "INT64",
            IoTDBDataType::Float => "FLOAT",
            IoTDBDataType::Double => "DOUBLE",
            IoTDBDataType::Text => "TEXT",
            IoTDBDataType::String => "STRING",
            IoTDBDataType::Blob => "BLOB",
            IoTDBDataType::Date => "DATE",
            IoTDBDataType::Timestamp => "TIMESTAMP",
            IoTDBDataType::Null => "NULL",
        }
    }
    
    /// 从字符串解析数据类型
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "BOOLEAN" => Some(IoTDBDataType::Boolean),
            "INT32" => Some(IoTDBDataType::Int32),
            "INT64" => Some(IoTDBDataType::Int64),
            "FLOAT" => Some(IoTDBDataType::Float),
            "DOUBLE" => Some(IoTDBDataType::Double),
            "TEXT" => Some(IoTDBDataType::Text),
            "STRING" => Some(IoTDBDataType::String),
            "BLOB" => Some(IoTDBDataType::Blob),
            "DATE" => Some(IoTDBDataType::Date),
            "TIMESTAMP" => Some(IoTDBDataType::Timestamp),
            _ => None,
        }
    }
    
    /// 检查类型是否为新类型（1.3+ 引入）
    pub fn is_new_type(&self) -> bool {
        matches!(self, 
            IoTDBDataType::String | 
            IoTDBDataType::Blob | 
            IoTDBDataType::Date | 
            IoTDBDataType::Timestamp
        )
    }
}

/// 数据值枚举
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum DataValue {
    Boolean(bool),
    Int32(i32),
    Int64(i64),
    Float(f32),
    Double(f64),
    Text(String),
    Blob(Vec<u8>),
    Timestamp(i64),
    Null,
}

impl DataValue {
    /// 获取数据值的类型
    pub fn data_type(&self) -> IoTDBDataType {
        match self {
            DataValue::Boolean(_) => IoTDBDataType::Boolean,
            DataValue::Int32(_) => IoTDBDataType::Int32,
            DataValue::Int64(_) => IoTDBDataType::Int64,
            DataValue::Float(_) => IoTDBDataType::Float,
            DataValue::Double(_) => IoTDBDataType::Double,
            DataValue::Text(_) => IoTDBDataType::Text,
            DataValue::Blob(_) => IoTDBDataType::Blob,
            DataValue::Timestamp(_) => IoTDBDataType::Timestamp,
            DataValue::Null => IoTDBDataType::Null,
        }
    }
    
    /// 转换为字符串表示
    pub fn to_string(&self) -> String {
        match self {
            DataValue::Boolean(b) => b.to_string(),
            DataValue::Int32(i) => i.to_string(),
            DataValue::Int64(i) => i.to_string(),
            DataValue::Float(f) => f.to_string(),
            DataValue::Double(d) => d.to_string(),
            DataValue::Text(s) => s.clone(),
            DataValue::Blob(b) => format!("BLOB({} bytes)", b.len()),
            DataValue::Timestamp(t) => t.to_string(),
            DataValue::Null => "NULL".to_string(),
        }
    }
}

/// 类型映射器
/// 
/// 负责处理不同版本间的类型兼容性
#[derive(Debug, Clone)]
pub struct TypeMapper {
    version: VersionInfo,
    type_mappings: HashMap<IoTDBDataType, IoTDBDataType>,
}

impl TypeMapper {
    /// 创建新的类型映射器
    pub fn new(version: &VersionInfo) -> Self {
        let mut type_mappings = HashMap::new();
        
        // 如果版本不支持新类型，则进行降级映射
        if !version.supports_feature("new_types") {
            type_mappings.insert(IoTDBDataType::String, IoTDBDataType::Text);
            type_mappings.insert(IoTDBDataType::Blob, IoTDBDataType::Text);
            type_mappings.insert(IoTDBDataType::Date, IoTDBDataType::Int64);
            type_mappings.insert(IoTDBDataType::Timestamp, IoTDBDataType::Int64);
        }
        
        Self {
            version: version.clone(),
            type_mappings,
        }
    }
    
    /// 映射数据类型
    pub fn map_type(&self, data_type: &IoTDBDataType) -> IoTDBDataType {
        self.type_mappings.get(data_type)
            .cloned()
            .unwrap_or_else(|| data_type.clone())
    }
    
    /// 转换数据值
    pub fn convert_value(&self, value: DataValue, target_type: &IoTDBDataType) -> DataValue {
        // 如果目标类型与当前类型相同，直接返回
        if &value.data_type() == target_type {
            return value;
        }
        
        // 根据映射规则进行转换
        match (&value, target_type) {
            // STRING -> TEXT
            (DataValue::Text(s), IoTDBDataType::Text) => DataValue::Text(s.clone()),

            // BLOB -> TEXT (转换为十六进制字符串)
            (DataValue::Blob(b), IoTDBDataType::Text) => {
                DataValue::Text(hex::encode(b))
            }

            // TIMESTAMP -> INT64 (包括 DATE 和 TIMESTAMP)
            (DataValue::Timestamp(t), IoTDBDataType::Int64) => DataValue::Int64(*t),

            // 其他情况保持原值
            _ => value,
        }
    }
    
    /// 检查类型是否受支持
    pub fn is_type_supported(&self, data_type: &IoTDBDataType) -> bool {
        if data_type.is_new_type() {
            self.version.supports_feature("new_types")
        } else {
            true // 基础类型都支持
        }
    }
    
    /// 获取支持的类型列表
    pub fn supported_types(&self) -> Vec<IoTDBDataType> {
        let mut types = vec![
            IoTDBDataType::Boolean,
            IoTDBDataType::Int32,
            IoTDBDataType::Int64,
            IoTDBDataType::Float,
            IoTDBDataType::Double,
            IoTDBDataType::Text,
        ];
        
        if self.version.supports_feature("new_types") {
            types.extend(vec![
                IoTDBDataType::String,
                IoTDBDataType::Blob,
                IoTDBDataType::Date,
                IoTDBDataType::Timestamp,
            ]);
        }
        
        types
    }
    
    /// 获取类型降级建议
    pub fn get_downgrade_suggestion(&self, data_type: &IoTDBDataType) -> Option<IoTDBDataType> {
        if self.is_type_supported(data_type) {
            None
        } else {
            self.type_mappings.get(data_type).cloned()
        }
    }
}

/// 类型转换工具
pub struct TypeConverter;

impl TypeConverter {
    /// 尝试将字符串值转换为指定类型
    pub fn parse_string_value(s: &str, target_type: &IoTDBDataType) -> Result<DataValue, String> {
        match target_type {
            IoTDBDataType::Boolean => {
                s.parse::<bool>()
                    .map(DataValue::Boolean)
                    .map_err(|_| format!("无法将 '{}' 转换为 Boolean", s))
            }
            IoTDBDataType::Int32 => {
                s.parse::<i32>()
                    .map(DataValue::Int32)
                    .map_err(|_| format!("无法将 '{}' 转换为 Int32", s))
            }
            IoTDBDataType::Int64 => {
                s.parse::<i64>()
                    .map(DataValue::Int64)
                    .map_err(|_| format!("无法将 '{}' 转换为 Int64", s))
            }
            IoTDBDataType::Float => {
                s.parse::<f32>()
                    .map(DataValue::Float)
                    .map_err(|_| format!("无法将 '{}' 转换为 Float", s))
            }
            IoTDBDataType::Double => {
                s.parse::<f64>()
                    .map(DataValue::Double)
                    .map_err(|_| format!("无法将 '{}' 转换为 Double", s))
            }
            IoTDBDataType::Text | IoTDBDataType::String => {
                Ok(DataValue::Text(s.to_string()))
            }
            IoTDBDataType::Blob => {
                hex::decode(s)
                    .map(DataValue::Blob)
                    .map_err(|_| format!("无法将 '{}' 转换为 Blob", s))
            }
            IoTDBDataType::Timestamp => {
                s.parse::<i64>()
                    .map(DataValue::Timestamp)
                    .map_err(|_| format!("无法将 '{}' 转换为 Timestamp", s))
            }
            _ => Err(format!("不支持的目标类型: {:?}", target_type)),
        }
    }
    
    /// 自动推断字符串值的类型
    pub fn infer_type(s: &str) -> IoTDBDataType {
        // 尝试按优先级推断类型
        if s.parse::<bool>().is_ok() {
            return IoTDBDataType::Boolean;
        }
        
        if s.parse::<i32>().is_ok() {
            return IoTDBDataType::Int32;
        }
        
        if s.parse::<i64>().is_ok() {
            return IoTDBDataType::Int64;
        }
        
        if s.parse::<f64>().is_ok() {
            return IoTDBDataType::Double;
        }
        
        // 默认为文本类型
        IoTDBDataType::Text
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_data_type_parsing() {
        assert_eq!(IoTDBDataType::from_str("BOOLEAN"), Some(IoTDBDataType::Boolean));
        assert_eq!(IoTDBDataType::from_str("int32"), Some(IoTDBDataType::Int32));
        assert_eq!(IoTDBDataType::from_str("STRING"), Some(IoTDBDataType::String));
        assert_eq!(IoTDBDataType::from_str("UNKNOWN"), None);
    }
    
    #[test]
    fn test_type_mapper() {
        let old_version = VersionInfo {
            major: 0,
            minor: 13,
            patch: 4,
            build: None,
            raw: "0.13.4".to_string(),
        };
        
        let mapper = TypeMapper::new(&old_version);
        
        // 新类型应该被映射为兼容类型
        assert_eq!(mapper.map_type(&IoTDBDataType::String), IoTDBDataType::Text);
        assert_eq!(mapper.map_type(&IoTDBDataType::Date), IoTDBDataType::Int64);
        
        // 基础类型保持不变
        assert_eq!(mapper.map_type(&IoTDBDataType::Int32), IoTDBDataType::Int32);
    }
    
    #[test]
    fn test_type_converter() {
        assert_eq!(
            TypeConverter::parse_string_value("123", &IoTDBDataType::Int32).unwrap(),
            DataValue::Int32(123)
        );
        
        assert_eq!(
            TypeConverter::parse_string_value("true", &IoTDBDataType::Boolean).unwrap(),
            DataValue::Boolean(true)
        );
        
        assert_eq!(
            TypeConverter::infer_type("123"),
            IoTDBDataType::Int32
        );
        
        assert_eq!(
            TypeConverter::infer_type("hello"),
            IoTDBDataType::Text
        );
    }
}
