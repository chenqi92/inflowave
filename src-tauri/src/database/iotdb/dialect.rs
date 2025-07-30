/**
 * IoTDB SQL 方言适配器
 * 
 * 处理树模型和表模型之间的 SQL 差异
 */

use anyhow::Result;
use regex::Regex;
use std::collections::HashMap;

/// SQL 方言类型
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SqlDialect {
    /// 树模型（传统模式，≤ 1.x）
    Tree,
    /// 表模型（2.x+ 新模式）
    Table,
}

/// 方言接口
pub trait Dialect: std::fmt::Debug {
    /// 处理查询语句
    fn process_query(&self, sql: &str) -> Result<String>;

    /// 构建测试查询
    fn build_test_query(&self) -> String;

    /// 构建显示数据库查询
    fn build_show_databases_query(&self) -> String;

    /// 构建显示时间序列查询
    fn build_show_timeseries_query(&self, pattern: Option<&str>) -> String;

    /// 构建创建数据库语句
    fn build_create_database_statement(&self, database: &str) -> String;

    /// 克隆方言实现
    fn clone_box(&self) -> Box<dyn Dialect + Send + Sync>;
}

/// 树模型方言实现
#[derive(Debug, Clone)]
pub struct TreeDialect;

impl Dialect for TreeDialect {
    fn process_query(&self, sql: &str) -> Result<String> {
        let mut processed_sql = sql.to_string();

        // 将表模型语法转换为树模型语法
        processed_sql = self.convert_table_to_tree_syntax(&processed_sql)?;

        Ok(processed_sql)
    }

    fn build_test_query(&self) -> String {
        // 使用更简单的查询，避免版本兼容性问题
        "SHOW STORAGE GROUP".to_string()
    }

    fn build_show_databases_query(&self) -> String {
        "SHOW STORAGE GROUP".to_string()
    }

    fn build_show_timeseries_query(&self, pattern: Option<&str>) -> String {
        match pattern {
            Some(p) => format!("SHOW TIMESERIES {}", p),
            None => "SHOW TIMESERIES".to_string(),
        }
    }

    fn build_create_database_statement(&self, database: &str) -> String {
        format!("SET STORAGE GROUP TO root.{}", database)
    }

    fn clone_box(&self) -> Box<dyn Dialect + Send + Sync> {
        Box::new(self.clone())
    }
}

impl TreeDialect {
    /// 将表模型语法转换为树模型语法
    fn convert_table_to_tree_syntax(&self, sql: &str) -> Result<String> {
        let mut result = sql.to_string();
        
        // 转换 SHOW DATABASES -> SHOW STORAGE GROUP
        result = result.replace("SHOW DATABASES", "SHOW STORAGE GROUP");
        
        // 转换 CREATE DATABASE -> SET STORAGE GROUP
        if let Some(re) = Regex::new(r"CREATE\s+DATABASE\s+(\w+)").ok() {
            result = re.replace_all(&result, "SET STORAGE GROUP TO root.$1").to_string();
        }
        
        // 转换 DROP DATABASE -> DELETE STORAGE GROUP
        if let Some(re) = Regex::new(r"DROP\s+DATABASE\s+(\w+)").ok() {
            result = re.replace_all(&result, "DELETE STORAGE GROUP root.$1").to_string();
        }
        
        Ok(result)
    }
}

/// 表模型方言实现
#[derive(Debug, Clone)]
pub struct TableDialect;

impl Dialect for TableDialect {
    fn process_query(&self, sql: &str) -> Result<String> {
        let mut processed_sql = sql.to_string();

        // 将树模型语法转换为表模型语法
        processed_sql = self.convert_tree_to_table_syntax(&processed_sql)?;

        Ok(processed_sql)
    }

    fn build_test_query(&self) -> String {
        // 使用更简单的查询，避免版本兼容性问题
        "SHOW DATABASES".to_string()
    }

    fn build_show_databases_query(&self) -> String {
        "SHOW DATABASES".to_string()
    }

    fn build_show_timeseries_query(&self, pattern: Option<&str>) -> String {
        match pattern {
            Some(p) => format!("SHOW TABLES LIKE '{}'", p),
            None => "SHOW TABLES".to_string(),
        }
    }

    fn build_create_database_statement(&self, database: &str) -> String {
        format!("CREATE DATABASE {}", database)
    }

    fn clone_box(&self) -> Box<dyn Dialect + Send + Sync> {
        Box::new(self.clone())
    }
}

impl TableDialect {
    /// 将树模型语法转换为表模型语法
    fn convert_tree_to_table_syntax(&self, sql: &str) -> Result<String> {
        let mut result = sql.to_string();
        
        // 转换 SHOW STORAGE GROUP -> SHOW DATABASES
        result = result.replace("SHOW STORAGE GROUP", "SHOW DATABASES");
        
        // 转换 SET STORAGE GROUP -> CREATE DATABASE
        if let Some(re) = Regex::new(r"SET\s+STORAGE\s+GROUP\s+TO\s+root\.(\w+)").ok() {
            result = re.replace_all(&result, "CREATE DATABASE $1").to_string();
        }
        
        // 转换 DELETE STORAGE GROUP -> DROP DATABASE
        if let Some(re) = Regex::new(r"DELETE\s+STORAGE\s+GROUP\s+root\.(\w+)").ok() {
            result = re.replace_all(&result, "DROP DATABASE $1").to_string();
        }
        
        // 转换路径表示法
        result = self.convert_path_notation(&result)?;
        
        Ok(result)
    }
    
    /// 转换路径表示法
    fn convert_path_notation(&self, sql: &str) -> Result<String> {
        // 将 root.sg.device.measurement 转换为标准 SQL 表示法
        // 这是一个简化的实现，实际情况可能更复杂
        
        let mut result = sql.to_string();
        
        // 转换 SELECT 语句中的路径
        if let Some(re) = Regex::new(r"root\.(\w+)\.(\w+)\.(\w+)").ok() {
            result = re.replace_all(&result, "$1.$2.$3").to_string();
        }
        
        Ok(result)
    }
}

/// 查询构建器
pub struct QueryBuilder {
    dialect: Box<dyn Dialect + Send + Sync>,
    sql_dialect: SqlDialect,
}

impl std::fmt::Debug for QueryBuilder {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("QueryBuilder")
            .field("sql_dialect", &self.sql_dialect)
            .finish()
    }
}

impl Clone for QueryBuilder {
    fn clone(&self) -> Self {
        Self {
            dialect: self.dialect.clone_box(),
            sql_dialect: self.sql_dialect.clone(),
        }
    }
}

impl QueryBuilder {
    /// 创建新的查询构建器
    pub fn new(sql_dialect: SqlDialect) -> Self {
        let dialect: Box<dyn Dialect + Send + Sync> = match sql_dialect {
            SqlDialect::Tree => Box::new(TreeDialect),
            SqlDialect::Table => Box::new(TableDialect),
        };
        
        Self {
            dialect,
            sql_dialect,
        }
    }
    
    /// 处理查询语句
    pub fn process_query(&self, sql: &str) -> Result<String> {
        self.dialect.process_query(sql)
    }
    
    /// 构建测试查询
    pub fn build_test_query(&self) -> String {
        self.dialect.build_test_query()
    }
    
    /// 构建显示数据库查询
    pub fn build_show_databases_query(&self) -> String {
        self.dialect.build_show_databases_query()
    }
    
    /// 构建显示时间序列查询
    pub fn build_show_timeseries_query(&self, pattern: Option<&str>) -> String {
        self.dialect.build_show_timeseries_query(pattern)
    }
    
    /// 构建创建数据库语句
    pub fn build_create_database_statement(&self, database: &str) -> String {
        self.dialect.build_create_database_statement(database)
    }
    
    /// 获取当前方言
    pub fn get_dialect(&self) -> &SqlDialect {
        &self.sql_dialect
    }
    
    /// 构建常用查询
    pub fn build_common_queries(&self) -> HashMap<String, String> {
        let mut queries = HashMap::new();
        
        queries.insert("test".to_string(), self.build_test_query());
        queries.insert("show_databases".to_string(), self.build_show_databases_query());
        queries.insert("show_timeseries".to_string(), self.build_show_timeseries_query(None));
        
        // 添加方言特定的查询
        match self.sql_dialect {
            SqlDialect::Tree => {
                queries.insert("show_devices".to_string(), "SHOW DEVICES".to_string());
                queries.insert("show_child_paths".to_string(), "SHOW CHILD PATHS root".to_string());
            }
            SqlDialect::Table => {
                queries.insert("show_tables".to_string(), "SHOW TABLES".to_string());
                queries.insert("show_columns".to_string(), "SHOW COLUMNS".to_string());
            }
        }
        
        queries
    }
}

/// 方言检测器
pub struct DialectDetector;

impl DialectDetector {
    /// 从 SQL 语句检测方言
    pub fn detect_from_sql(sql: &str) -> SqlDialect {
        let sql_upper = sql.to_uppercase();
        
        // 检查表模型特有的关键词
        if sql_upper.contains("SHOW DATABASES") ||
           sql_upper.contains("CREATE DATABASE") ||
           sql_upper.contains("DROP DATABASE") ||
           sql_upper.contains("SHOW TABLES") {
            return SqlDialect::Table;
        }
        
        // 检查树模型特有的关键词
        if sql_upper.contains("SHOW STORAGE GROUP") ||
           sql_upper.contains("SET STORAGE GROUP") ||
           sql_upper.contains("DELETE STORAGE GROUP") ||
           sql_upper.contains("SHOW DEVICES") ||
           sql_upper.contains("ROOT.") {
            return SqlDialect::Tree;
        }
        
        // 默认使用树模型（向后兼容）
        SqlDialect::Tree
    }
    
    /// 检查 SQL 是否兼容指定方言
    pub fn is_compatible(sql: &str, dialect: &SqlDialect) -> bool {
        let detected = Self::detect_from_sql(sql);
        detected == *dialect
    }
    
    /// 获取方言转换建议
    pub fn get_conversion_suggestions(sql: &str, target_dialect: &SqlDialect) -> Vec<String> {
        let mut suggestions = Vec::new();
        let current_dialect = Self::detect_from_sql(sql);
        
        if current_dialect != *target_dialect {
            match (current_dialect, target_dialect) {
                (SqlDialect::Tree, SqlDialect::Table) => {
                    suggestions.push("将 'SHOW STORAGE GROUP' 替换为 'SHOW DATABASES'".to_string());
                    suggestions.push("将 'SET STORAGE GROUP TO root.db' 替换为 'CREATE DATABASE db'".to_string());
                    suggestions.push("移除路径中的 'root.' 前缀".to_string());
                }
                (SqlDialect::Table, SqlDialect::Tree) => {
                    suggestions.push("将 'SHOW DATABASES' 替换为 'SHOW STORAGE GROUP'".to_string());
                    suggestions.push("将 'CREATE DATABASE db' 替换为 'SET STORAGE GROUP TO root.db'".to_string());
                    suggestions.push("在路径前添加 'root.' 前缀".to_string());
                }
                (SqlDialect::Tree, SqlDialect::Tree) | (SqlDialect::Table, SqlDialect::Table) => {
                    // 相同方言，无需转换
                }
            }
        }
        
        suggestions
    }
}

// TreeDialect 和 TableDialect 自动实现 Send + Sync，因为它们没有非 Send/Sync 字段

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_tree_dialect() {
        let dialect = TreeDialect;
        
        assert_eq!(
            dialect.build_show_databases_query(),
            "SHOW STORAGE GROUP"
        );
        
        assert_eq!(
            dialect.build_create_database_statement("test"),
            "SET STORAGE GROUP TO root.test"
        );
    }
    
    #[test]
    fn test_table_dialect() {
        let dialect = TableDialect;
        
        assert_eq!(
            dialect.build_show_databases_query(),
            "SHOW DATABASES"
        );
        
        assert_eq!(
            dialect.build_create_database_statement("test"),
            "CREATE DATABASE test"
        );
    }
    
    #[test]
    fn test_dialect_detection() {
        assert_eq!(
            DialectDetector::detect_from_sql("SHOW DATABASES"),
            SqlDialect::Table
        );
        
        assert_eq!(
            DialectDetector::detect_from_sql("SHOW STORAGE GROUP"),
            SqlDialect::Tree
        );
        
        assert_eq!(
            DialectDetector::detect_from_sql("SELECT * FROM root.sg.device"),
            SqlDialect::Tree
        );
    }
    
    #[test]
    fn test_query_builder() {
        let builder = QueryBuilder::new(SqlDialect::Tree);
        
        assert_eq!(
            builder.build_show_databases_query(),
            "SHOW STORAGE GROUP"
        );
        
        let builder = QueryBuilder::new(SqlDialect::Table);
        
        assert_eq!(
            builder.build_show_databases_query(),
            "SHOW DATABASES"
        );
    }
}
