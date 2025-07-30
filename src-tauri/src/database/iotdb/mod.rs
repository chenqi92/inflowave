/**
 * IoTDB 全版本兼容连接管理模块
 *
 * 支持 IoTDB 0.13 → 1.x → 2.x 全谱系
 * 运行时探测 + 编译期特性 + 可插拔驱动
 */
pub mod capability;
pub mod dialect;
pub mod driver;
pub mod drivers;
pub mod thrift_protocol;
pub mod types;

// 重新导出核心类型
pub use capability::Capability;
pub use driver::{DriverConfig, DriverFactory, IoTDBDriver, QueryRequest, QueryResponse};

// 内部使用的类型，不对外导出以避免未使用警告
// pub use dialect::{QueryBuilder, SqlDialect};
// pub use types::{IoTDBDataType, TypeMapper, DataValue};

// 驱动实现（内部使用，不对外导出）
// #[cfg(any(feature = "iotdb-v1", feature = "iotdb-v2"))]
// pub use drivers::thrift::ThriftDriver;

// #[cfg(feature = "iotdb-rest")]
// pub use drivers::rest_v2::RestV2Driver;

use anyhow::Result;
use std::collections::HashMap;

/// IoTDB 连接管理器
///
/// 提供统一的接口来管理不同版本的 IoTDB 连接
pub struct IoTDBManager {
    drivers: HashMap<String, Box<dyn IoTDBDriver>>,
    capabilities: HashMap<String, Capability>,
}

impl std::fmt::Debug for IoTDBManager {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("IoTDBManager")
            .field("driver_count", &self.drivers.len())
            .field("capabilities", &self.capabilities)
            .finish()
    }
}

impl IoTDBManager {
    /// 创建新的 IoTDB 管理器
    pub fn new() -> Self {
        Self {
            drivers: HashMap::new(),
            capabilities: HashMap::new(),
        }
    }

    /// 添加连接
    pub async fn add_connection(
        &mut self,
        connection_id: String,
        config: DriverConfig,
    ) -> Result<()> {
        // 探测服务器能力
        let capability = Capability::detect(&config).await?;

        // 根据能力选择最佳驱动
        let driver = DriverFactory::create_best_driver(config, &capability).await?;

        // 存储驱动和能力信息
        self.drivers.insert(connection_id.clone(), driver);
        self.capabilities.insert(connection_id, capability);

        Ok(())
    }

    /// 获取驱动
    pub fn get_driver(&mut self, connection_id: &str) -> Option<&mut Box<dyn IoTDBDriver>> {
        self.drivers.get_mut(connection_id)
    }

    /// 获取服务器能力
    pub fn get_capability(&self, connection_id: &str) -> Option<&Capability> {
        self.capabilities.get(connection_id)
    }

    /// 移除连接
    pub fn remove_connection(&mut self, connection_id: &str) -> Result<()> {
        self.drivers.remove(connection_id);
        self.capabilities.remove(connection_id);
        Ok(())
    }

    /// 列出所有连接
    pub fn list_connections(&self) -> Vec<String> {
        self.drivers.keys().cloned().collect()
    }
}

impl Default for IoTDBManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_manager_creation() {
        let manager = IoTDBManager::new();
        assert_eq!(manager.list_connections().len(), 0);
    }
}
