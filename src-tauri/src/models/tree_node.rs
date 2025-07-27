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
    RetentionPolicy,    // 保留策略
    
    // InfluxDB 2.x 节点类型
    Organization,       // 组织
    Bucket,            // 存储桶

    // InfluxDB 3.x 节点类型（简化架构）
    Database3x,        // InfluxDB 3.x 数据库（类似 1.x 但支持现代功能）
    
    // IoTDB 节点类型
    StorageGroup,      // 存储组/数据库
    Device,            // 设备
    Timeseries,        // 时间序列
    AlignedTimeseries, // 对齐时间序列
    Template,          // 设备模板
    Function,          // 用户定义函数
    Trigger,           // 触发器

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
    
    // 系统节点
    SystemDatabase,    // 系统数据库（如 _internal）
    SystemBucket,      // 系统存储桶（如 _monitoring）
}

/// 树节点数据
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub id: String,
    pub name: String,
    pub node_type: TreeNodeType,
    pub parent_id: Option<String>,
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
            name,
            node_type,
        )
        .with_parent(format!("org_{}", org));
        
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
        .with_metadata("data_type".to_string(), serde_json::Value::String(data_type));

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
            format!("📊 {} (Aligned)", name),
            TreeNodeType::AlignedTimeseries,
        )
        .with_parent(parent_id)
    }

    /// 创建 IoTDB 设备模板节点
    pub fn create_template(name: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/template_{}", parent_id, name.replace(".", "_")),
            format!("📋 {}", name),
            TreeNodeType::Template,
        )
        .with_parent(parent_id)
    }

    /// 创建 IoTDB 系统信息节点
    pub fn create_system_info() -> TreeNode {
        TreeNode::new(
            "system_info".to_string(),
            "🔧 System Information".to_string(),
            TreeNodeType::SystemInfo,
        )
        .as_system()
    }

    /// 创建 IoTDB 版本信息节点
    pub fn create_version_info(version: String) -> TreeNode {
        TreeNode::new(
            "version_info".to_string(),
            format!("📋 Version: {}", version),
            TreeNodeType::VersionInfo,
        )
        .with_parent("system_info".to_string())
        .with_metadata("version".to_string(), serde_json::Value::String(version))
        .as_leaf()
        .as_system()
    }

    /// 创建 IoTDB 存储引擎信息节点
    pub fn create_storage_engine_info() -> TreeNode {
        TreeNode::new(
            "storage_engine_info".to_string(),
            "💾 Storage Engine".to_string(),
            TreeNodeType::StorageEngineInfo,
        )
        .with_parent("system_info".to_string())
        .as_system()
    }

    /// 创建 IoTDB 集群信息节点
    pub fn create_cluster_info() -> TreeNode {
        TreeNode::new(
            "cluster_info".to_string(),
            "🌐 Cluster Information".to_string(),
            TreeNodeType::ClusterInfo,
        )
        .with_parent("system_info".to_string())
        .as_system()
    }

    /// 创建 IoTDB 模式模板节点
    pub fn create_schema_template(name: String) -> TreeNode {
        TreeNode::new(
            format!("schema_template_{}", name),
            format!("📋 Template: {}", name),
            TreeNodeType::SchemaTemplate,
        )
    }

    /// 创建 IoTDB 数据类型信息节点
    pub fn create_data_type_info(data_type: String, parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("{}/datatype", parent_id),
            format!("🔢 Type: {}", data_type),
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
            format!("🔧 Encoding: {}", encoding),
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
            format!("📦 Compression: {}", compression),
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
            name,
            TreeNodeType::Measurement,
        )
        .with_parent(parent_id)
    }
    
    /// 创建字段分组节点
    pub fn create_field_group(parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("fields_{}", parent_id),
            "📈 Fields".to_string(),
            TreeNodeType::FieldGroup,
        )
        .with_parent(parent_id)
    }

    /// 创建标签分组节点
    pub fn create_tag_group(parent_id: String) -> TreeNode {
        TreeNode::new(
            format!("tags_{}", parent_id),
            "🏷️ Tags".to_string(),
            TreeNodeType::TagGroup,
        )
        .with_parent(parent_id)
    }
    
    /// 创建字段节点
    pub fn create_field(name: String, parent_id: String, field_type: String) -> TreeNode {
        let display_name = format!("{} ({})", name, field_type);

        TreeNode::new(
            format!("{}/field_{}", parent_id, name),
            display_name,
            TreeNodeType::Field,
        )
        .with_parent(parent_id)
        .with_metadata("field_type".to_string(), serde_json::Value::String(field_type))
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

/// 树节点图标映射
impl TreeNodeType {
    pub fn get_icon(&self) -> &'static str {
        match self {
            TreeNodeType::Connection => "🔌",
            TreeNodeType::Database => "💾",
            TreeNodeType::SystemDatabase => "🔧",
            TreeNodeType::RetentionPolicy => "📅",
            TreeNodeType::Organization => "🏢",
            TreeNodeType::Bucket => "🪣",
            TreeNodeType::SystemBucket => "⚙️",
            TreeNodeType::Database3x => "🗄️",
            TreeNodeType::StorageGroup => "🏢",
            TreeNodeType::Device => "📱",
            TreeNodeType::Timeseries => "📊",
            TreeNodeType::AlignedTimeseries => "📊",
            TreeNodeType::Template => "📋",
            TreeNodeType::Function => "⚙️",
            TreeNodeType::Trigger => "🔔",
            TreeNodeType::SystemInfo => "🔧",
            TreeNodeType::VersionInfo => "📋",
            TreeNodeType::StorageEngineInfo => "💾",
            TreeNodeType::ClusterInfo => "🌐",
            TreeNodeType::SchemaTemplate => "📋",
            TreeNodeType::DataType => "🔢",
            TreeNodeType::Encoding => "🔧",
            TreeNodeType::Compression => "📦",
            TreeNodeType::AttributeGroup => "📝",
            TreeNodeType::Measurement => "📊",
            TreeNodeType::FieldGroup => "📈",
            TreeNodeType::TagGroup => "🏷️",
            TreeNodeType::Field => "📊",
            TreeNodeType::Tag => "🏷️",
        }
    }
    
    pub fn get_description(&self) -> &'static str {
        match self {
            TreeNodeType::Connection => "数据库连接",
            TreeNodeType::Database => "InfluxDB 1.x 数据库",
            TreeNodeType::SystemDatabase => "系统数据库，包含内部监控和元数据",
            TreeNodeType::RetentionPolicy => "数据保留策略，定义数据存储时长",
            TreeNodeType::Organization => "InfluxDB 2.x 组织，用于多租户管理",
            TreeNodeType::Bucket => "InfluxDB 2.x 存储桶，类似于数据库",
            TreeNodeType::SystemBucket => "系统存储桶，包含监控和内部数据",
            TreeNodeType::Database3x => "InfluxDB 3.x 数据库，支持现代功能和 SQL 查询",
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
        }
    }
}
