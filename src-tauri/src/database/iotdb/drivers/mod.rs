/**
 * IoTDB 驱动实现模块
 * 
 * 包含各种协议的具体驱动实现
 */

#[cfg(any(feature = "iotdb-v1", feature = "iotdb-v2"))]
pub mod thrift;

#[cfg(feature = "iotdb-rest")]
pub mod rest_v2;

// 重新导出驱动实现（内部使用，不对外导出以避免未使用警告）
// #[cfg(any(feature = "iotdb-v1", feature = "iotdb-v2"))]
// pub use thrift::ThriftDriver;

// #[cfg(feature = "iotdb-rest")]
// pub use rest_v2::RestV2Driver;
