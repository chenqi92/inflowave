/**
 * IoTDB 全版本兼容性测试示例
 * 
 * 演示如何使用新的驱动系统连接不同版本的 IoTDB
 */

use anyhow::Result;
use std::collections::HashMap;
use std::time::Duration;

use crate::database::iotdb::{
    IoTDBManager, DriverConfig, QueryRequest,
    capability::{Capability, VersionInfo},
    driver::DriverFactory,
};

/// 测试不同版本的 IoTDB 连接
pub async fn test_multi_version_compatibility() -> Result<()> {
    println!("🚀 开始 IoTDB 全版本兼容性测试");
    
    // 测试配置列表
    let test_configs = vec![
        TestConfig {
            name: "IoTDB 0.13.x".to_string(),
            host: "localhost".to_string(),
            port: 6667,
            expected_major: 0,
        },
        TestConfig {
            name: "IoTDB 1.3.x".to_string(),
            host: "localhost".to_string(),
            port: 6668,
            expected_major: 1,
        },
        TestConfig {
            name: "IoTDB 2.0.x".to_string(),
            host: "localhost".to_string(),
            port: 6669,
            expected_major: 2,
        },
    ];
    
    for config in test_configs {
        println!("\n📊 测试 {}", config.name);
        
        match test_single_version(&config).await {
            Ok(_) => println!("✅ {} 测试通过", config.name),
            Err(e) => println!("❌ {} 测试失败: {}", config.name, e),
        }
    }
    
    println!("\n🎉 兼容性测试完成");
    Ok(())
}

/// 单个版本测试配置
struct TestConfig {
    name: String,
    host: String,
    port: u16,
    expected_major: u8,
}

/// 测试单个版本的 IoTDB
async fn test_single_version(config: &TestConfig) -> Result<()> {
    // 创建驱动配置
    let driver_config = DriverConfig {
        host: config.host.clone(),
        port: config.port,
        username: Some("root".to_string()),
        password: Some("root".to_string()),
        ssl: false,
        timeout: Duration::from_secs(10),
        extra_params: HashMap::new(),
    };
    
    // 探测服务器能力
    println!("  🔍 探测服务器能力...");
    let capability = match Capability::detect(&driver_config).await {
        Ok(cap) => {
            println!("  📋 检测到版本: {}", cap.server.version.raw);
            println!("  🌳 树模型支持: {}", cap.server.tree_model);
            println!("  📊 表模型支持: {}", cap.server.table_model);
            println!("  🌐 REST V2 支持: {}", cap.server.rest_v2);
            println!("  🆕 新类型支持: {}", cap.server.new_types);
            cap
        }
        Err(e) => {
            println!("  ⚠️  无法探测服务器能力，使用默认配置: {}", e);
            create_mock_capability(config.expected_major)
        }
    };
    
    // 验证版本
    if capability.server.version.major != config.expected_major {
        println!("  ⚠️  版本不匹配: 期望 {}.x，实际 {}", 
                config.expected_major, capability.server.version.raw);
    }
    
    // 创建最佳驱动
    println!("  🔧 创建驱动...");
    let mut driver = DriverFactory::create_best_driver(driver_config, &capability).await?;
    
    // 测试连接
    println!("  🔌 测试连接...");
    let latency = driver.test_connection().await?;
    println!("  ⚡ 连接延迟: {}ms", latency.as_millis());
    
    // 测试基本查询
    println!("  📊 测试基本查询...");
    test_basic_queries(&mut *driver, &capability).await?;
    
    // 测试方言兼容性
    println!("  🗣️  测试方言兼容性...");
    test_dialect_compatibility(&mut *driver, &capability).await?;
    
    // 测试类型兼容性
    println!("  🔢 测试类型兼容性...");
    test_type_compatibility(&mut *driver, &capability).await?;
    
    // 断开连接
    driver.disconnect().await?;
    
    Ok(())
}

/// 创建模拟的能力信息
fn create_mock_capability(major_version: u8) -> Capability {
    use crate::database::iotdb::capability::{ServerCapability, ConnectionInfo};
    
    let version = VersionInfo {
        major: major_version,
        minor: 0,
        patch: 0,
        build: None,
        raw: format!("{}.0.0", major_version),
    };
    
    let server = ServerCapability {
        version: version.clone(),
        tree_model: true,
        table_model: major_version >= 2,
        rest_v2: major_version >= 1,
        new_types: major_version >= 1,
        ssl: false,
        supported_protocols: vec!["thrift".to_string()],
        extra_properties: HashMap::new(),
    };
    
    let connection_info = ConnectionInfo {
        host: "localhost".to_string(),
        port: 6667,
        ssl: false,
        available_ports: HashMap::new(),
    };
    
    Capability {
        server,
        connection_info,
    }
}

/// 测试基本查询
async fn test_basic_queries(
    driver: &mut dyn crate::database::iotdb::driver::IoTDBDriver,
    capability: &Capability,
) -> Result<()> {
    use crate::database::iotdb::driver::QueryRequest;
    
    // 版本查询
    let version_query = QueryRequest {
        sql: "SHOW VERSION".to_string(),
        database: None,
        session_id: None,
        fetch_size: Some(10),
        timeout: Some(Duration::from_secs(5)),
        parameters: None,
    };
    
    let _result = driver.query(version_query).await?;
    println!("    ✅ 版本查询成功");
    
    // 数据库查询（根据版本选择不同的语法）
    let db_sql = if capability.server.table_model {
        "SHOW DATABASES"
    } else {
        "SHOW STORAGE GROUP"
    };
    
    let db_query = QueryRequest {
        sql: db_sql.to_string(),
        database: None,
        session_id: None,
        fetch_size: Some(100),
        timeout: Some(Duration::from_secs(5)),
        parameters: None,
    };
    
    let _result = driver.query(db_query).await?;
    println!("    ✅ 数据库查询成功");
    
    Ok(())
}

/// 测试方言兼容性
async fn test_dialect_compatibility(
    driver: &mut dyn crate::database::iotdb::driver::IoTDBDriver,
    capability: &Capability,
) -> Result<()> {
    use crate::database::iotdb::{dialect::{QueryBuilder, SqlDialect}, driver::QueryRequest};
    
    // 根据能力选择方言
    let dialect = if capability.server.table_model {
        SqlDialect::Table
    } else {
        SqlDialect::Tree
    };
    
    let query_builder = QueryBuilder::new(dialect);
    
    // 测试常用查询构建
    let test_queries = query_builder.build_common_queries();
    
    for (name, sql) in test_queries {
        let query = QueryRequest {
            sql,
            database: None,
            session_id: None,
            fetch_size: Some(10),
            timeout: Some(Duration::from_secs(5)),
            parameters: None,
        };
        
        match driver.query(query).await {
            Ok(_) => println!("    ✅ {} 查询成功", name),
            Err(e) => println!("    ⚠️  {} 查询失败: {}", name, e),
        }
    }
    
    Ok(())
}

/// 测试类型兼容性
async fn test_type_compatibility(
    _driver: &mut dyn crate::database::iotdb::driver::IoTDBDriver,
    capability: &Capability,
) -> Result<()> {
    use crate::database::iotdb::types::{TypeMapper, IoTDBDataType};
    
    let type_mapper = TypeMapper::new(&capability.server.version);
    
    // 测试类型支持
    let test_types = vec![
        IoTDBDataType::Boolean,
        IoTDBDataType::Int32,
        IoTDBDataType::Int64,
        IoTDBDataType::Float,
        IoTDBDataType::Double,
        IoTDBDataType::Text,
        IoTDBDataType::String,
        IoTDBDataType::Blob,
        IoTDBDataType::Date,
        IoTDBDataType::Timestamp,
    ];
    
    for data_type in test_types {
        let is_supported = type_mapper.is_type_supported(&data_type);
        let mapped_type = type_mapper.map_type(&data_type);
        
        if is_supported {
            println!("    ✅ {} 类型支持", data_type.as_str());
        } else {
            println!("    🔄 {} 类型映射为 {}", data_type.as_str(), mapped_type.as_str());
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_mock_capability_creation() {
        let cap_v0 = create_mock_capability(0);
        assert_eq!(cap_v0.server.version.major, 0);
        assert!(!cap_v0.server.table_model);
        
        let cap_v2 = create_mock_capability(2);
        assert_eq!(cap_v2.server.version.major, 2);
        assert!(cap_v2.server.table_model);
    }
}
