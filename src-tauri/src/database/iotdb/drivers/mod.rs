/**
 * IoTDB 驱动实现模块
 *
 * 包含各种协议的具体驱动实现
 */

// 官方生成的Thrift接口
pub mod common;
pub mod client;

// 官方Thrift客户端包装器
pub mod official_thrift;

// Thrift驱动已移除，只使用官方客户端

// REST V2 驱动已移除，现在只使用官方Thrift客户端

// 重新导出驱动实现（内部使用，不对外导出以避免未使用警告）
// #[cfg(any(feature = "iotdb-v1", feature = "iotdb-v2"))]
// pub use thrift::ThriftDriver;

// REST V2 驱动已移除
