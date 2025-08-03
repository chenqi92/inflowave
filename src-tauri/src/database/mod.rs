pub mod client;
pub mod connection;
pub mod pool;
pub mod iotdb_client;
pub mod iotdb_official_client;
pub mod protocol;

// 新的 IoTDB 全版本兼容模块
pub mod iotdb;

// 新的 InfluxDB 全版本兼容模块
pub mod influxdb;
pub mod influxdb_client;

// pub use client::InfluxClient; // 旧的客户端，保留以兼容现有代码
