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
    
    // IoTDB 节点类型
    StorageGroup,      // 存储组/数据库
    Device,            // 设备
    Timeseries,        // 时间序列
    
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
            TreeNodeType::StorageGroup => "🏢",
            TreeNodeType::Device => "📱",
            TreeNodeType::Timeseries => "📊",
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
            TreeNodeType::Database => "数据库",
            TreeNodeType::SystemDatabase => "系统数据库",
            TreeNodeType::RetentionPolicy => "保留策略",
            TreeNodeType::Organization => "组织",
            TreeNodeType::Bucket => "存储桶",
            TreeNodeType::SystemBucket => "系统存储桶",
            TreeNodeType::StorageGroup => "存储组",
            TreeNodeType::Device => "设备",
            TreeNodeType::Timeseries => "时间序列",
            TreeNodeType::Measurement => "测量",
            TreeNodeType::FieldGroup => "字段组",
            TreeNodeType::TagGroup => "标签组",
            TreeNodeType::Field => "字段",
            TreeNodeType::Tag => "标签",
        }
    }
}
