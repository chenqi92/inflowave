use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 数据源树节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TreeNodeType {
    // 通用节点类型
    Connection,
    
    // InfluxDB 1.x 节点类型
    Database,           // 数据库
    SystemDatabase,     // 系统数据库
    RetentionPolicy,    // 保留策略
    Series,             // 序列（特定标签组合的时间序列）
    ContinuousQuery,    // 连续查询
    Shard,              // 分片
    ShardGroup,         // 分片组
    User1x,             // InfluxDB 1.x 用户
    Privilege,          // 权限
    
    // InfluxDB 2.x 节点类型
    Organization,       // 组织
    Bucket,             // 存储桶
    SystemBucket,       // 系统存储桶
    Task,               // 任务（替代连续查询）
    Dashboard,          // 仪表板
    Cell,               // 仪表板单元格
    Variable,           // 变量
    Check,              // 监控检查
    NotificationRule,   // 通知规则
    NotificationEndpoint, // 通知端点
    Scraper,            // 数据抓取器
    Telegraf,           // Telegraf 配置
    Authorization,      // 授权令牌
    User2x,             // InfluxDB 2.x 用户
    Label,              // 组织标签

    // InfluxDB 3.x 节点类型（简化架构）
    Database3x,         // InfluxDB 3.x 数据库（类似 1.x 但支持现代功能）
    Schema,             // 模式
    Table,              // 表（替代 Measurement）
    Column,             // 列（替代 Field）
    Index,              // 索引
    Partition,          // 分区
    View,               // 视图
    MaterializedView,   // 物化视图
    Function3x,         // InfluxDB 3.x 函数
    Procedure,          // 存储过程
    Trigger3x,          // InfluxDB 3.x 触发器
    Namespace,          // 命名空间
    
    // IoTDB 节点类型
    StorageGroup,      // 存储组/数据库
    Device,            // 设备
    Timeseries,        // 时间序列
    AlignedTimeseries, // 对齐时间序列
    Template,          // 设备模板
    Function,          // 用户定义函数
    Trigger,           // 触发器
    User,              // 用户
    DataNode,          // 数据节点
    ConfigNode,        // 配置节点

    // IoTDB 系统节点
    SystemInfo,        // 系统信息
    VersionInfo,       // 版本信息
    StorageEngineInfo, // 存储引擎信息
    ClusterInfo,       // 集群信息
    SchemaTemplate,    // 模式模板

    // IoTDB 时间序列属性
    DataType,          // 数据类型
    Encoding,          // 编码方式
    Compression,       // 压缩方式
    AttributeGroup,    // 属性分组

    // 通用测量相关
    Measurement,       // 测量/表
    FieldGroup,        // 字段分组
    TagGroup,          // 标签分组
    Field,             // 字段
    Tag,               // 标签

    // 管理节点分组
    StorageGroupManagement,  // 存储组管理分组
    TimeseriesManagement,    // 时间序列管理分组
    FunctionGroup,           // 函数管理分组
    ConfigManagement,        // 配置管理分组
    VersionManagement,       // 版本管理分组

    // 系统节点
    // SystemDatabase,    // 系统数据库（如 _internal）
    // SystemBucket,      // 系统存储桶（如 _monitoring）

    // Object Storage (S3/MinIO/OSS/COS) 节点类型
    StorageBucket,     // 存储桶
    Folder,            // 文件夹
    File,              // 文件
}

/// 树节点数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub id: String,
    pub name: String,
    pub node_type: TreeNodeType,
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub children: Vec<TreeNode>,
    pub is_leaf: bool,
    pub is_system: bool,           // 是否为系统节点
    pub is_expandable: bool,       // 是否可展开
    pub is_expanded: bool,         // 是否已展开
    pub is_loading: bool,          // 是否正在加载
    pub metadata: HashMap<String, serde_json::Value>, // 额外元数据
}

/// 树节点构建器
impl TreeNode {
    pub fn new(id: String, name: String, node_type: TreeNodeType) -> Self {
        Self {
            id,
            name,
            node_type,
            parent_id: None,
            children: Vec::new(),
            is_leaf: false,
            is_system: false,
            is_expandable: true,
            is_expanded: false,
            is_loading: false,
            metadata: HashMap::new(),
        }
    }
    
    pub fn with_parent(mut self, parent_id: String) -> Self {
        self.parent_id = Some(parent_id);
        self
    }
    
    pub fn as_leaf(mut self) -> Self {
        self.is_leaf = true;
        self.is_expandable = false;
        self
    }
    
    pub fn as_system(mut self) -> Self {
        self.is_system = true;
        self
    }
    
    pub fn with_metadata(mut self, key: String, value: serde_json::Value) -> Self {
        self.metadata.insert(key, value);
        self
    }
    
    pub fn add_child(&mut self, child: TreeNode) {
        self.children.push(child);
    }
    
    pub fn set_loading(&mut self, loading: bool) {
        self.is_loading = loading;
    }
    
    pub fn set_expanded(&mut self, expanded: bool) {
        self.is_expanded = expanded;
    }
}

/// 数据库特定的树节点工厂
pub struct TreeNodeFactory;

impl TreeNodeFactory {
    /// 创建 InfluxDB 1.x 数据库节点
    pub fn create_influxdb1_database(name: String, is_system: bool) -> TreeNode {
        let node_type = if is_system {
            TreeNodeType::SystemDatabase
        } else {
            TreeNodeType::Database
        };

        let mut node = TreeNode::new(format!("db_{}", name), name, node_type);
        if is_system {
            node = node.as_system();
        }
        node
    }

    /// 创建带版本信息的 InfluxDB 1.x 数据库节点
    pub fn create_influxdb1_database_with_version(name: String, is_system: bool, version: &str) -> TreeNode {
        let node_type = if is_system {
            TreeNodeType::SystemDatabase
        } else {
            TreeNodeType::Database
        };

        let mut node = TreeNode::new(format!("db_{}", name), name, node_type)
            .with_metadata("version".to_string(), serde_json::Value::String(version.to_string()));

        if is_system {
            node = node.as_system();
        }
        node
    }
    
    /// 创建 InfluxDB 1.x 保留策略节点
    pub fn create_retention_policy(name: String, parent_id: String, duration: String, replication: i32) -> TreeNode {
        TreeNode::new(
            format!("{}/rp_{}", parent_id, name),
            name,
            TreeNodeType::RetentionPolicy,
        )
        .with_parent(parent_id)
        .with_metadata("duration".to_string(), serde_json::Value::String(duration))
        .with_metadata("replication".to_string(), serde_json::Value::Number(serde_json::Number::from(replication)))
    }
    
    /// 创建 InfluxDB 2.x 组织节点
    pub fn create_organization(name: String) -> TreeNode {
        TreeNode::new(format!("org_{}", name), name, TreeNodeType::Organization)
    }
    
    /// 创建 InfluxDB 2.x 存储桶节点
    pub fn create_bucket(org: &str, name: String, is_system: bool) -> TreeNode {
        let node_type = if is_system {
            TreeNodeType::SystemBucket
        } else {
            TreeNodeType::Bucket
        };

        let mut node = TreeNode::new(
            format!("bucket_{}_{}", org, name),
            name.clone(),
            node_type,
        )
        .with_parent(format!("org_{}", org))
        .with_metadata("bucket_name".to_string(), serde_json::Value::String(name))
        .with_metadata("organization".to_string(), serde_json::Value::String(org.to_string()));

        if is_system {
            node = node.as_system();
        }

        node
    }

    /// 创建 InfluxDB 3.x 数据库节点（简化架构）
    pub fn create_influxdb3_database(name: String, is_system: bool) -> TreeNode {
        let node_type = if is_system {
            TreeNodeType::SystemDatabase
        } else {
            TreeNodeType::Database3x
        };

        let mut node = TreeNode::new(format!("db3x_{}", name), name, node_type);
        if is_system {
            node = node.as_system();
        }
        node.with_metadata("version".to_string(), serde_json::Value::String("3.x".to_string()))
    }

    // InfluxDB 1.x 工厂方法

    /// 创建 InfluxDB 1.x 数据库节点
    pub fn create_database(name: String) -> TreeNode {
        TreeNode::new(
            format!("db_{}", name),
            name.clone(),
            TreeNodeType::Database,
        )
        .with_metadata("database".to_string(), serde_json::Value::String(name.clone()))
        .with_metadata("databaseName".to_string(), serde_json::Value::String(name))
    }

    /// 创建系统数据库节点
    pub fn create_system_database(name: String) -> TreeNode {
        TreeNode::new(
            format!("sysdb_{}", name),
            name.clone(),
            TreeNodeType::SystemDatabase,
        )
        .with_metadata("database".to_string(), serde_json::Value::String(name.clone()))
        .with_metadata("databaseName".to_string(), serde_json::Value::String(name))
        .as_system()
    }

    /// 创建序列节点
    pub fn create_series(name: String, parent_id: String, tags: std::collections::HashMap<String, String>) -> TreeNode {
        let mut node = TreeNode::new(
            format!("{}/series_{}", parent_id, name.replace(".", "_")),
            name.clone(),
            TreeNodeType::Series,
        )
        .with_parent(parent_id);

        // 添加标签信息到元数据
        for (key, value) in tags {
            node = node.with_metadata(format!("tag_{}", key), serde_json::Value::String(value));
        }

        node
    }

    /// 创建连续查询节点
    pub fn create_continuous_query(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/cq_{}", parent_id, name),
            name,
            TreeNodeType::ContinuousQuery,
        )
        .with_parent(parent_id)
        .as_leaf()
    }

    /// 创建 InfluxDB 1.x 用户节点
    pub fn create_user1x(name: String, admin: bool) -> TreeNode {
        TreeNode::new(
            format!("user1x_{}", name),
            format!("{} {}", name, if admin { "(Admin)" } else { "" }),
            TreeNodeType::User1x,
        )
        .with_metadata("admin".to_string(), serde_json::Value::Bool(admin))
        .as_leaf()
    }

    // InfluxDB 2.x 工厂方法

    /// 创建任务节点
    pub fn create_task(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/task_{}", parent_id, name),
            name,
            TreeNodeType::Task,
        )
        .with_parent(parent_id)
        .as_leaf()
    }

    /// 创建仪表板节点
    pub fn create_dashboard(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/dashboard_{}", parent_id, name),
            name,
            TreeNodeType::Dashboard,
        )
        .with_parent(parent_id)
    }

    /// 创建 InfluxDB 2.x 用户节点
    pub fn create_user2x(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/user2x_{}", parent_id, name),
            name,
            TreeNodeType::User2x,
        )
        .with_parent(parent_id)
        .as_leaf()
    }

    // InfluxDB 3.x 工厂方法

    /// 创建模式节点
    pub fn create_schema(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/schema_{}", parent_id, name),
            name,
            TreeNodeType::Schema,
        )
        .with_parent(parent_id)
    }

    /// 创建表节点
    pub fn create_table(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/table_{}", parent_id, name),
            name,
            TreeNodeType::Table,
        )
        .with_parent(parent_id)
    }

    /// 创建列节点
    pub fn create_column(name: String, data_type: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/column_{}", parent_id, name),
            format!("{} ({})", name, data_type),
            TreeNodeType::Column,
        )
        .with_parent(parent_id)
        .with_metadata("data_type".to_string(), serde_json::Value::String(data_type))
        .as_leaf()
    }

    /// 创建视图节点
    pub fn create_view(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/view_{}", parent_id, name),
            name,
            TreeNodeType::View,
        )
        .with_parent(parent_id)
    }

    // IoTDB 工厂方法

    /// 创建 IoTDB 存储组节点
    pub fn create_storage_group(name: String) -> TreeNode {
        TreeNode::new(format!("sg_{}", name), name, TreeNodeType::StorageGroup)
    }

    /// 创建带版本信息的 IoTDB 存储组节点
    pub fn create_storage_group_with_version(name: String, version: String) -> TreeNode {
        TreeNode::new(format!("sg_{}", name), name, TreeNodeType::StorageGroup)
            .with_metadata("version".to_string(), serde_json::Value::String(version))
    }
    
    /// 创建 IoTDB 设备节点
    pub fn create_device(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/device_{}", parent_id, name.replace(".", "_")),
            name,
            TreeNodeType::Device,
        )
        .with_parent(parent_id)
    }

    /// 创建 IoTDB 时间序列节点
    pub fn create_timeseries(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/ts_{}", parent_id, name.replace(".", "_")),
            name,
            TreeNodeType::Timeseries,
        )
        .with_parent(parent_id)
        .as_leaf()
    }

    /// 创建 IoTDB 时间序列节点（带详细信息）
    pub fn create_timeseries_with_info(
        name: String,
        parent_id: String,
        data_type: String,
        encoding: Option<String>,
        compression: Option<String>
    ) -> TreeNode {
        let mut node = TreeNode::new(
            format!("{}/ts_{}", parent_id, name.replace(".", "_")),
            format!("{} ({})", name, data_type),
            TreeNodeType::Timeseries,
        )
        .with_parent(parent_id)
        .with_metadata("data_type".to_string(), serde_json::Value::String(data_type))
        .as_leaf();

        if let Some(enc) = encoding {
            node = node.with_metadata("encoding".to_string(), serde_json::Value::String(enc));
        }
        if let Some(comp) = compression {
            node = node.with_metadata("compression".to_string(), serde_json::Value::String(comp));
        }

        node
    }

    /// 创建 IoTDB 对齐时间序列节点
    pub fn create_aligned_timeseries(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/aligned_ts_{}", parent_id, name.replace(".", "_")),
            format!("{} (Aligned)", name),
            TreeNodeType::AlignedTimeseries,
        )
        .with_parent(parent_id)
        .as_leaf()
    }

    /// 创建 IoTDB 设备模板节点
    pub fn create_template(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/template_{}", parent_id, name.replace(".", "_")),
            name,
            TreeNodeType::Template,
        )
        .with_parent(parent_id)
    }

    /// 创建 IoTDB 系统信息节点
    pub fn create_system_info(name: String) -> TreeNode {
        TreeNode::new(
            format!("system_info_{}", name.replace(" ", "_")),
            name,
            TreeNodeType::SystemInfo,
        )
        .as_system()
        .as_leaf()
    }

    /// 创建存储组管理节点
    pub fn create_storage_group_management(name: String) -> TreeNode {
        TreeNode::new(
            "storage_group_management".to_string(),
            name,
            TreeNodeType::StorageGroupManagement,
        )
    }

    /// 创建时间序列管理节点
    pub fn create_timeseries_management(name: String) -> TreeNode {
        TreeNode::new(
            "timeseries_management".to_string(),
            name,
            TreeNodeType::TimeseriesManagement,
        )
    }

    /// 创建函数管理节点
    pub fn create_function_management(name: String) -> TreeNode {
        TreeNode::new(
            "function_management".to_string(),
            name,
            TreeNodeType::FunctionGroup,
        )
    }

    /// 创建配置管理节点
    pub fn create_config_management(name: String) -> TreeNode {
        TreeNode::new(
            "config_management".to_string(),
            name,
            TreeNodeType::ConfigManagement,
        )
    }

    /// 创建版本管理节点
    pub fn create_version_info(name: String) -> TreeNode {
        TreeNode::new(
            "version_management".to_string(),
            name,
            TreeNodeType::VersionManagement,
        )
    }

    /// 创建配置节点
    pub fn create_config(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("config_{}", name),
            name,
            TreeNodeType::ConfigNode,
        )
        .with_parent(parent_id)
    }

    /// 创建版本节点
    pub fn create_version(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("version_{}", name),
            name,
            TreeNodeType::SystemInfo,
        )
        .with_parent(parent_id)
    }

    /// 创建用户节点
    pub fn create_user(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("user_{}", name),
            name,
            TreeNodeType::User,
        )
        .with_parent(parent_id)
    }

    /// 创建权限节点
    pub fn create_privilege(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("privilege_{}", name),
            name,
            TreeNodeType::Privilege,
        )
        .with_parent(parent_id)
    }

    /// 创建函数节点
    pub fn create_function(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("function_{}", name),
            name,
            TreeNodeType::Function,
        )
        .with_parent(parent_id)
    }

    /// 创建触发器节点
    pub fn create_trigger(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("trigger_{}", name),
            name,
            TreeNodeType::Trigger,
        )
        .with_parent(parent_id)
    }



    /// 创建 IoTDB 存储引擎信息节点
    pub fn create_storage_engine_info() -> TreeNode {
        TreeNode::new(
            "storage_engine_info".to_string(),
            "Storage Engine".to_string(),
            TreeNodeType::StorageEngineInfo,
        )
        .with_parent("system_info".to_string())
        .as_system()
    }

    /// 创建 IoTDB 集群信息节点
    pub fn create_cluster_info() -> TreeNode {
        TreeNode::new(
            "cluster_info".to_string(),
            "Cluster Information".to_string(),
            TreeNodeType::ClusterInfo,
        )
        .with_parent("system_info".to_string())
        .as_system()
    }

    /// 创建 IoTDB 模式模板节点
    pub fn create_schema_template(name: String) -> TreeNode {
        TreeNode::new(
            format!("schema_template_{}", name),
            format!("Template: {}", name),
            TreeNodeType::SchemaTemplate,
        )
    }

    /// 创建 IoTDB 用户节点
    pub fn create_iotdb_user(name: String, is_admin: bool) -> TreeNode {
        let display_name = if is_admin {
            format!("{} (Admin)", name)
        } else {
            name.clone()
        };

        TreeNode::new(
            format!("user_{}", name),
            display_name,
            TreeNodeType::User,
        )
        .with_metadata("is_admin".to_string(), serde_json::Value::Bool(is_admin))
        .as_leaf()
    }

    /// 创建 IoTDB 函数节点
    pub fn create_iotdb_function(name: String, function_type: String) -> TreeNode {
        TreeNode::new(
            format!("function_{}", name),
            format!("{} ({})", name, function_type),
            TreeNodeType::Function,
        )
        .with_metadata("function_type".to_string(), serde_json::Value::String(function_type))
        .as_leaf()
    }

    /// 创建 IoTDB 触发器节点
    pub fn create_iotdb_trigger(name: String, status: String) -> TreeNode {
        TreeNode::new(
            format!("trigger_{}", name),
            format!("{} ({})", name, status),
            TreeNodeType::Trigger,
        )
        .with_metadata("status".to_string(), serde_json::Value::String(status))
        .as_leaf()
    }

    /// 创建 IoTDB 数据节点信息
    pub fn create_data_node(node_id: String, host: String, status: String) -> TreeNode {
        TreeNode::new(
            format!("datanode_{}", node_id),
            format!("DataNode {} ({}:{})", node_id, host, status),
            TreeNodeType::DataNode,
        )
        .with_metadata("host".to_string(), serde_json::Value::String(host))
        .with_metadata("status".to_string(), serde_json::Value::String(status))
        .as_leaf()
    }

    /// 创建 IoTDB 配置节点信息
    pub fn create_config_node(node_id: String, host: String, status: String) -> TreeNode {
        TreeNode::new(
            format!("confignode_{}", node_id),
            format!("ConfigNode {} ({}:{})", node_id, host, status),
            TreeNodeType::ConfigNode,
        )
        .with_metadata("host".to_string(), serde_json::Value::String(host))
        .with_metadata("status".to_string(), serde_json::Value::String(status))
        .as_leaf()
    }

    /// 创建 IoTDB 数据类型信息节点
    pub fn create_data_type_info(data_type: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/datatype", parent_id),
            format!("Type: {}", data_type),
            TreeNodeType::DataType,
        )
        .with_parent(parent_id)
        .with_metadata("data_type".to_string(), serde_json::Value::String(data_type))
        .as_leaf()
    }

    /// 创建 IoTDB 编码信息节点
    pub fn create_encoding_info(encoding: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/encoding", parent_id),
            format!("Encoding: {}", encoding),
            TreeNodeType::Encoding,
        )
        .with_parent(parent_id)
        .with_metadata("encoding".to_string(), serde_json::Value::String(encoding))
        .as_leaf()
    }

    /// 创建 IoTDB 压缩信息节点
    pub fn create_compression_info(compression: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/compression", parent_id),
            format!("Compression: {}", compression),
            TreeNodeType::Compression,
        )
        .with_parent(parent_id)
        .with_metadata("compression".to_string(), serde_json::Value::String(compression))
        .as_leaf()
    }
    
    /// 创建测量节点
    pub fn create_measurement(parent_id: String, name: String) -> TreeNode {
        TreeNode::new(
            format!("measurement_{}_{}", parent_id, name),
            name.clone(),
            TreeNodeType::Measurement,
        )
        .with_parent(parent_id.clone())
        .with_metadata("database".to_string(), serde_json::Value::String(parent_id.clone()))
        .with_metadata("measurement".to_string(), serde_json::Value::String(name.clone()))
        .with_metadata("table".to_string(), serde_json::Value::String(name.clone()))
        .with_metadata("tableName".to_string(), serde_json::Value::String(name))
        // 不标记为叶子节点，允许展开查看 tags 和 fields
    }
    
    /// 创建字段分组节点
    pub fn create_field_group(parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("fields_{}", parent_id),
            "Fields".to_string(),
            TreeNodeType::FieldGroup,
        )
        .with_parent(parent_id)
    }

    /// 创建标签分组节点
    pub fn create_tag_group(parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("tags_{}", parent_id),
            "Tags".to_string(),
            TreeNodeType::TagGroup,
        )
        .with_parent(parent_id)
    }
    
    /// 创建字段节点
    pub fn create_field(name: String, parent_id: String, field_type: String) -> TreeNode {
        // 只显示字段名，不显示类型
        TreeNode::new(
            format!("{}/field_{}", parent_id, name),
            name.clone(),
            TreeNodeType::Field,
        )
        .with_parent(parent_id)
        .with_metadata("field_type".to_string(), serde_json::Value::String(field_type))
        .with_metadata("fieldName".to_string(), serde_json::Value::String(name))
        .as_leaf()
    }

    /// 创建标签节点
    pub fn create_tag(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/tag_{}", parent_id, name),
            name,
            TreeNodeType::Tag,
        )
        .with_parent(parent_id)
        .as_leaf()
    }
}

/// 树节点图标映射 - 现在由前端完全负责图标渲染
impl TreeNodeType {
    pub fn get_icon(&self) -> &'static str {
        // 返回空字符串，图标由前端SVG系统处理
        ""
    }
    
    pub fn get_description(&self) -> &'static str {
        match self {
            TreeNodeType::Connection => "数据库连接",
            // InfluxDB 1.x 描述
            TreeNodeType::Database => "InfluxDB 1.x 数据库，支持时间序列数据存储",
            TreeNodeType::SystemDatabase => "系统数据库，包含内部监控和元数据",
            TreeNodeType::RetentionPolicy => "数据保留策略，定义数据存储时长和分片策略",
            TreeNodeType::Series => "时间序列，特定标签组合的数据点集合",
            TreeNodeType::ContinuousQuery => "连续查询，自动化数据聚合和处理",
            TreeNodeType::Shard => "数据分片，存储特定时间范围的数据",
            TreeNodeType::ShardGroup => "分片组，管理相关分片的集合",
            TreeNodeType::User1x => "InfluxDB 1.x 用户账户",
            TreeNodeType::Privilege => "用户权限，控制数据库访问级别",
            // InfluxDB 2.x 描述
            TreeNodeType::Organization => "InfluxDB 2.x 组织，用于多租户管理",
            TreeNodeType::Bucket => "InfluxDB 2.x 存储桶，类似于数据库",
            TreeNodeType::SystemBucket => "系统存储桶，包含监控和内部数据",
            TreeNodeType::Task => "任务，使用 Flux 语言的自动化数据处理",
            TreeNodeType::Dashboard => "仪表板，数据可视化和监控界面",
            TreeNodeType::Cell => "仪表板单元格，单个图表或可视化组件",
            TreeNodeType::Variable => "变量，仪表板和查询中的动态参数",
            TreeNodeType::Check => "监控检查，数据质量和阈值监控",
            TreeNodeType::NotificationRule => "通知规则，定义告警触发条件",
            TreeNodeType::NotificationEndpoint => "通知端点，告警消息的发送目标",
            TreeNodeType::Scraper => "数据抓取器，从外部源收集指标数据",
            TreeNodeType::Telegraf => "Telegraf 配置，数据收集代理设置",
            TreeNodeType::Authorization => "授权令牌，API 访问凭证",
            TreeNodeType::User2x => "InfluxDB 2.x 用户账户",
            TreeNodeType::Label => "组织标签，用于资源分类和管理",
            // InfluxDB 3.x 描述
            TreeNodeType::Database3x => "InfluxDB 3.x 数据库，支持现代功能和 SQL 查询",
            TreeNodeType::Schema => "数据库模式，定义表结构和约束",
            TreeNodeType::Table => "数据表，存储结构化时间序列数据",
            TreeNodeType::Column => "表列，定义数据字段和类型",
            TreeNodeType::Index => "索引，优化查询性能的数据结构",
            TreeNodeType::Partition => "分区，按时间或其他维度分割数据",
            TreeNodeType::View => "视图，基于查询的虚拟表",
            TreeNodeType::MaterializedView => "物化视图，预计算的查询结果",
            TreeNodeType::Function3x => "用户定义函数，扩展 SQL 查询功能",
            TreeNodeType::Procedure => "存储过程，预定义的数据库操作序列",
            TreeNodeType::Trigger3x => "触发器，自动响应数据变化的操作",
            TreeNodeType::Namespace => "命名空间，逻辑分组和权限管理",
            TreeNodeType::StorageGroup => "IoTDB 存储组，用于组织时间序列数据",
            TreeNodeType::Device => "IoTDB 设备，包含多个传感器时间序列",
            TreeNodeType::Timeseries => "IoTDB 时间序列，存储传感器数据",
            TreeNodeType::AlignedTimeseries => "IoTDB 对齐时间序列，优化存储和查询性能",
            TreeNodeType::Template => "IoTDB 设备模板，定义设备结构",
            TreeNodeType::Function => "IoTDB 用户定义函数，扩展查询功能",
            TreeNodeType::Trigger => "IoTDB 触发器，自动处理数据变化",
            TreeNodeType::SystemInfo => "IoTDB 系统信息，包含版本和配置",
            TreeNodeType::VersionInfo => "IoTDB 版本信息",
            TreeNodeType::StorageEngineInfo => "IoTDB 存储引擎配置信息",
            TreeNodeType::ClusterInfo => "IoTDB 集群节点信息",
            TreeNodeType::SchemaTemplate => "IoTDB 模式模板，定义数据结构",
            TreeNodeType::DataType => "时间序列数据类型 (BOOLEAN, INT32, FLOAT, DOUBLE, TEXT)",
            TreeNodeType::Encoding => "数据编码方式 (PLAIN, RLE, TS_2DIFF, GORILLA)",
            TreeNodeType::Compression => "数据压缩算法 (SNAPPY, GZIP, LZO)",
            TreeNodeType::TagGroup => "标签分组，包含索引的元数据",
            TreeNodeType::AttributeGroup => "IoTDB 属性分组，包含元数据信息",
            TreeNodeType::Measurement => "InfluxDB 测量，类似于表",
            TreeNodeType::FieldGroup => "字段分组，包含数值类型的数据",
            TreeNodeType::Field => "字段，存储数值数据",
            TreeNodeType::Tag => "标签，用于索引和过滤",
            TreeNodeType::User => "IoTDB 用户账户，管理数据库访问权限",
            TreeNodeType::DataNode => "IoTDB 数据节点，存储和处理时间序列数据",
            TreeNodeType::ConfigNode => "IoTDB 配置节点，管理集群配置和元数据",
            TreeNodeType::StorageGroupManagement => "存储组管理，查看和管理IoTDB存储组",
            TreeNodeType::TimeseriesManagement => "时间序列管理，查看和管理所有时间序列",
            TreeNodeType::FunctionGroup => "函数管理，查看和管理用户定义函数",
            TreeNodeType::ConfigManagement => "配置管理，查看和管理系统配置",
            TreeNodeType::VersionManagement => "版本信息，查看IoTDB版本和系统信息",
            // Object Storage (S3/MinIO/OSS/COS) 描述
            TreeNodeType::StorageBucket => "存储桶，对象存储的容器",
            TreeNodeType::Folder => "文件夹，对象存储中的虚拟目录",
            TreeNodeType::File => "文件，存储在对象存储中的对象",
        }
    }
}
