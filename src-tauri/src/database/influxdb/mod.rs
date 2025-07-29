/**
 * InfluxDB 统一驱动模块
 * 
 * 实现对 InfluxDB 1.x/2.x/3.x 的统一支持
 * 采用"探测 → 能力 → 装驱动"的架构模式
 */

pub mod capability;
pub mod detector;
pub mod driver;
pub mod utils;
pub mod pool;
pub mod metrics;

#[cfg(feature = "influxdb-v1")]
pub mod v1_driver;

#[cfg(feature = "influxdb-v2")]
pub mod v2_driver;

#[cfg(feature = "influxdb-v3")]
pub mod v3_driver;

pub use capability::*;
pub use detector::*;
pub use driver::*;
// 有选择地导出常用的工具函数（按需导入以避免警告）
// pub use utils::{LineProtocolFormatter, LineProtocolPoint, DatabaseValidator, TimestampParser, QueryLanguageDetector};
// 连接池和监控功能按需导入
// pub use pool::*;
// pub use metrics::*;

#[cfg(feature = "influxdb-v1")]
pub use v1_driver::V1HttpDriver;

#[cfg(feature = "influxdb-v2")]
pub use v2_driver::V2HttpDriver;

#[cfg(feature = "influxdb-v3")]
pub use v3_driver::FlightSqlDriver;

#[cfg(test)]

use anyhow::Result;
use std::sync::Arc;
use crate::models::ConnectionConfig;

/// InfluxDB 驱动工厂
pub struct InfluxDriverFactory;

impl InfluxDriverFactory {
    /// 创建适合的 InfluxDB 驱动
    pub async fn create_driver(config: &ConnectionConfig) -> anyhow::Result<Arc<dyn InfluxDriver>> {
        // 1. 探测版本和能力
        let capability = InfluxDetector::detect(&config).await?;
        
        // 2. 根据能力装配驱动
        let driver: Arc<dyn InfluxDriver> = match capability.major {
            #[cfg(feature = "influxdb-v1")]
            1 => Arc::new(V1HttpDriver::new(config.clone())?),
            
            #[cfg(feature = "influxdb-v2")]
            2 => Arc::new(V2HttpDriver::new(config.clone())?),
            
            #[cfg(feature = "influxdb-v3")]
            3 if capability.has_flightsql => Arc::new(FlightSqlDriver::new(config.clone())?),
            
            #[cfg(feature = "influxdb-v3")]
            3 => {
                // 3.x 但没有 FlightSQL，使用轻量 HTTP 客户端
                // 这里可以实现一个简化的 V3LiteDriver
                return Err(anyhow::anyhow!("InfluxDB 3.x 轻量客户端暂未实现"));
            },
            
            _ => return Err(anyhow::anyhow!("不支持的 InfluxDB 版本: {}", capability.major)),
        };
        
        Ok(driver)
    }
}
