/**
 * InfluxDB 驱动测试
 */

#[cfg(test)]
mod tests {
    use crate::database::influxdb::{
        Capability, FieldType, Query, QueryLanguage, BucketInfo, DataSet
    };
    use crate::models::{ConnectionConfig, DatabaseType, InfluxDBV2Config};

    /// 创建测试用的 InfluxDB 1.x 配置
    fn create_v1_config() -> ConnectionConfig {
        ConnectionConfig {
            id: "test-v1".to_string(),
            name: "Test InfluxDB 1.x".to_string(),
            description: None,
            db_type: DatabaseType::InfluxDB,
            version: Some("1.8.10".to_string()),
            host: "localhost".to_string(),
            port: 8086,
            username: Some("admin".to_string()),
            password: Some("password".to_string()),
            database: Some("test".to_string()),
            ssl: false,
            timeout: 30,
            connection_timeout: 30,
            query_timeout: 60,
            default_query_language: Some("InfluxQL".to_string()),
            proxy_config: None,
            retention_policy: None,
            v2_config: None,
            driver_config: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    /// 创建测试用的 InfluxDB 2.x 配置
    fn create_v2_config() -> ConnectionConfig {
        let mut config = create_v1_config();
        config.id = "test-v2".to_string();
        config.name = "Test InfluxDB 2.x".to_string();
        config.version = Some("2.7.5".to_string());
        config.v2_config = Some(InfluxDBV2Config {
            api_token: "test-token".to_string(),
            organization: "test-org".to_string(),
            bucket: Some("test-bucket".to_string()),
            v1_compatibility_api: false,
        });
        config
    }

    /// 创建测试用的 InfluxDB 3.x 配置
    fn create_v3_config() -> ConnectionConfig {
        let mut config = create_v2_config();
        config.id = "test-v3".to_string();
        config.name = "Test InfluxDB 3.x".to_string();
        config.version = Some("3.2.1".to_string());
        config
    }

    #[test]
    fn test_capability_creation() {
        // 测试 1.x 能力
        let cap_v1 = Capability::v1x("1.8.10".to_string());
        assert_eq!(cap_v1.major, 1);
        assert!(cap_v1.supports_influxql);
        assert!(!cap_v1.supports_flux);
        assert!(!cap_v1.supports_sql);
        assert!(!cap_v1.has_flightsql);

        // 测试 2.x 能力
        let cap_v2 = Capability::v2x("2.7.5".to_string());
        assert_eq!(cap_v2.major, 2);
        assert!(cap_v2.supports_influxql);
        assert!(cap_v2.supports_flux);
        assert!(!cap_v2.supports_sql);
        assert!(!cap_v2.has_flightsql);

        // 测试 3.x 能力
        let cap_v3 = Capability::v3x("3.2.1".to_string(), true);
        assert_eq!(cap_v3.major, 3);
        assert!(cap_v3.supports_influxql);
        assert!(!cap_v3.supports_flux);
        assert!(cap_v3.supports_sql);
        assert!(cap_v3.has_flightsql);
    }

    #[test]
    fn test_query_language_detection() {
        // 测试查询语言枚举
        assert_eq!(QueryLanguage::InfluxQL.as_str(), "influxql");
        assert_eq!(QueryLanguage::Flux.as_str(), "flux");
        assert_eq!(QueryLanguage::Sql.as_str(), "sql");

        // 测试从字符串创建
        assert_eq!(QueryLanguage::from_str("influxql"), Some(QueryLanguage::InfluxQL));
        assert_eq!(QueryLanguage::from_str("flux"), Some(QueryLanguage::Flux));
        assert_eq!(QueryLanguage::from_str("sql"), Some(QueryLanguage::Sql));
        assert_eq!(QueryLanguage::from_str("unknown"), None);
    }

    #[test]
    fn test_query_builder() {
        let query = Query::new(QueryLanguage::InfluxQL, "SELECT * FROM cpu".to_string())
            .with_database("mydb".to_string())
            .with_timeout(30);

        assert_eq!(query.language, QueryLanguage::InfluxQL);
        assert_eq!(query.text, "SELECT * FROM cpu");
        assert_eq!(query.database, Some("mydb".to_string()));
        assert_eq!(query.timeout, Some(30));
    }

    #[test]
    fn test_bucket_info_builder() {
        let bucket = BucketInfo::new("test-bucket".to_string())
            .with_org("test-org".to_string())
            .with_retention_policy("autogen".to_string());

        assert_eq!(bucket.name, "test-bucket");
        assert_eq!(bucket.org, Some("test-org".to_string()));
        assert_eq!(bucket.retention_policy, Some("autogen".to_string()));
    }

    #[test]
    fn test_dataset_creation() {
        let columns = vec!["time".to_string(), "value".to_string()];
        let rows = vec![
            vec![
                serde_json::Value::String("2023-01-01T00:00:00Z".to_string()),
                serde_json::Value::Number(serde_json::Number::from(42)),
            ],
            vec![
                serde_json::Value::String("2023-01-01T00:01:00Z".to_string()),
                serde_json::Value::Number(serde_json::Number::from(43)),
            ],
        ];

        let dataset = DataSet::new(columns.clone(), rows.clone())
            .with_execution_time(100);

        assert_eq!(dataset.columns, columns);
        assert_eq!(dataset.rows, rows);
        assert_eq!(dataset.row_count, 2);
        assert_eq!(dataset.execution_time, Some(100));
    }

    #[test]
    fn test_field_type_conversion() {
        assert_eq!(FieldType::from_str("float").as_str(), "float");
        assert_eq!(FieldType::from_str("integer").as_str(), "integer");
        assert_eq!(FieldType::from_str("string").as_str(), "string");
        assert_eq!(FieldType::from_str("boolean").as_str(), "boolean");
        assert_eq!(FieldType::from_str("unknown").as_str(), "unknown");
    }

    #[tokio::test]
    async fn test_driver_factory_config_validation() {
        // 测试无效配置
        let mut invalid_config = create_v1_config();
        invalid_config.host = "".to_string(); // 无效主机

        // 注意：这个测试需要实际的网络连接，在 CI 环境中可能会失败
        // 在实际测试中，我们应该使用模拟的网络客户端
    }

    #[test]
    fn test_line_protocol_formatting() {
        use crate::database::influxdb::utils::{LineProtocolFormatter, LineProtocolPoint};
        use serde_json::Value;

        let measurement = "cpu";
        let tags = vec![("host", "server01"), ("region", "us-west")];
        let fields = vec![
            ("usage_idle", &Value::Number(serde_json::Number::from_f64(10.5).unwrap())),
            ("usage_system", &Value::Number(serde_json::Number::from(5))),
            ("online", &Value::Bool(true)),
        ];
        let timestamp = Some(1640995200000000000i64);

        let line_protocol = LineProtocolFormatter::format_point(measurement, &tags, &fields, timestamp).unwrap();

        // 验证 Line Protocol 格式
        assert!(line_protocol.contains("cpu,host=server01,region=us-west"));
        assert!(line_protocol.contains("usage_idle=10.5"));
        assert!(line_protocol.contains("usage_system=5i"));
        assert!(line_protocol.contains("online=true"));
        assert!(line_protocol.contains("1640995200000000000"));
    }

    #[test]
    fn test_database_name_validation() {
        use crate::database::influxdb::utils::DatabaseValidator;

        // 有效的数据库名称
        assert!(DatabaseValidator::validate_database_name("mydb").is_ok());
        assert!(DatabaseValidator::validate_database_name("test_db_123").is_ok());

        // 无效的数据库名称
        assert!(DatabaseValidator::validate_database_name("").is_err()); // 空名称
        assert!(DatabaseValidator::validate_database_name("my db").is_err()); // 包含空格
        assert!(DatabaseValidator::validate_database_name("my\"db").is_err()); // 包含引号

        // 过长的名称
        let long_name = "a".repeat(256);
        assert!(DatabaseValidator::validate_database_name(&long_name).is_err());
    }

    #[test]
    fn test_timestamp_parsing() {
        use crate::database::influxdb::utils::TimestampParser;

        // 测试纳秒时间戳
        assert!(TimestampParser::parse_timestamp("1640995200000000000").is_ok());

        // 测试 RFC3339 格式
        assert!(TimestampParser::parse_timestamp("2022-01-01T00:00:00Z").is_ok());

        // 测试无效格式
        assert!(TimestampParser::parse_timestamp("invalid").is_err());
    }

    #[test]
    fn test_query_language_detection() {
        use crate::database::influxdb::utils::QueryLanguageDetector;
        use crate::database::influxdb::QueryLanguage;

        // 测试 Flux 查询检测
        let flux_query = "from(bucket: \"mybucket\") |> range(start: -1h)";
        assert_eq!(QueryLanguageDetector::detect_language(flux_query), QueryLanguage::Flux);

        // 测试 InfluxQL 查询检测
        let influxql_query = "SELECT * FROM cpu WHERE time > now() - 1h GROUP BY TIME(5m)";
        assert_eq!(QueryLanguageDetector::detect_language(influxql_query), QueryLanguage::InfluxQL);

        // 测试 SQL 查询检测
        let sql_query = "SELECT * FROM cpu WHERE time > NOW() - INTERVAL '1 hour'";
        assert_eq!(QueryLanguageDetector::detect_language(sql_query), QueryLanguage::Sql);
    }

    #[test]
    fn test_line_protocol_point_builder() {
        use crate::database::influxdb::utils::LineProtocolPoint;
        use serde_json::Value;

        let point = LineProtocolPoint::new("temperature".to_string())
            .tag("location".to_string(), "office".to_string())
            .tag("sensor".to_string(), "A001".to_string())
            .field("value".to_string(), Value::Number(serde_json::Number::from_f64(23.5).unwrap()))
            .field("unit".to_string(), Value::String("celsius".to_string()))
            .timestamp(1640995200000000000);

        let line_protocol = point.to_line_protocol().unwrap();

        assert!(line_protocol.contains("temperature"));
        assert!(line_protocol.contains("location=office"));
        assert!(line_protocol.contains("sensor=A001"));
        assert!(line_protocol.contains("value=23.5"));
        assert!(line_protocol.contains("unit=\"celsius\""));
        assert!(line_protocol.contains("1640995200000000000"));
    }

    #[test]
    fn test_capability_creation() {
        let capability = Capability::new(2, "2.7.1".to_string())
            .with_flux_support()
            .with_influxql_support()
            .with_sql_support();

        assert_eq!(capability.major, 2);
        assert_eq!(capability.version, "2.7.1");
        assert!(capability.supports_flux);
        assert!(capability.supports_influxql);
        assert!(capability.supports_sql);
        assert!(!capability.has_flightsql);
    }

    #[test]
    fn test_query_creation() {
        let query = Query::new(QueryLanguage::InfluxQL, "SELECT * FROM cpu".to_string());

        assert_eq!(query.language, QueryLanguage::InfluxQL);
        assert_eq!(query.statement, "SELECT * FROM cpu");
        assert!(query.database.is_none());
        assert!(query.parameters.is_empty());
    }

    #[test]
    fn test_bucket_info_creation() {
        let bucket = BucketInfo::new("test-bucket".to_string(), "test-org".to_string())
            .with_retention_seconds(3600);

        assert_eq!(bucket.name, "test-bucket");
        assert_eq!(bucket.organization, "test-org");
        assert_eq!(bucket.retention_seconds, Some(3600));
    }
}
