use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::{Context, Result};
use log::{debug, info};
use std::fs;
use std::sync::Mutex;

/// 持久化管理器 - 负责配置文件的读写
pub struct PersistenceManager {
    config_dir: PathBuf,
}

impl PersistenceManager {
    /// 创建新的持久化管理器
    pub fn new() -> Result<Self> {
        let config_dir = Self::get_config_dir()?;
        
        // 确保配置目录存在
        fs::create_dir_all(&config_dir)
            .context("创建配置目录失败")?;
        
        info!("持久化管理器初始化成功，配置目录: {:?}", config_dir);
        
        Ok(Self { config_dir })
    }
    
    /// 获取应用配置目录
    fn get_config_dir() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .context("无法获取系统配置目录")?
            .join("inflowave");
        
        debug!("配置目录: {:?}", config_dir);
        Ok(config_dir)
    }
    
    /// 获取配置文件路径
    fn get_config_path(&self, filename: &str) -> PathBuf {
        self.config_dir.join(filename)
    }
    
    /// 读取 JSON 配置文件
    pub fn read_json<T>(&self, filename: &str) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        let path = self.get_config_path(filename);
        
        if !path.exists() {
            return Err(anyhow::anyhow!("配置文件不存在: {:?}", path));
        }
        
        debug!("读取配置文件: {:?}", path);
        
        let content = fs::read_to_string(&path)
            .context(format!("读取配置文件失败: {:?}", path))?;
        
        let config: T = serde_json::from_str(&content)
            .context(format!("解析配置文件失败: {:?}", path))?;
        
        info!("配置文件读取成功: {}", filename);
        Ok(config)
    }
    
    /// 写入 JSON 配置文件
    pub fn write_json<T>(&self, filename: &str, data: &T) -> Result<()>
    where
        T: Serialize,
    {
        let path = self.get_config_path(filename);
        
        debug!("写入配置文件: {:?}", path);
        
        // 先写入临时文件，然后重命名，确保原子性
        let temp_path = path.with_extension("tmp");
        
        let content = serde_json::to_string_pretty(data)
            .context("序列化配置失败")?;
        
        fs::write(&temp_path, content)
            .context(format!("写入临时配置文件失败: {:?}", temp_path))?;
        
        // 重命名为正式文件
        fs::rename(&temp_path, &path)
            .context(format!("重命名配置文件失败: {:?}", path))?;
        
        info!("配置文件写入成功: {}", filename);
        Ok(())
    }
    
    /// 检查配置文件是否存在
    pub fn exists(&self, filename: &str) -> bool {
        self.get_config_path(filename).exists()
    }
    
    /// 删除配置文件
    pub fn delete(&self, filename: &str) -> Result<()> {
        let path = self.get_config_path(filename);
        
        if path.exists() {
            fs::remove_file(&path)
                .context(format!("删除配置文件失败: {:?}", path))?;
            info!("配置文件已删除: {}", filename);
        }
        
        Ok(())
    }
    
    /// 备份配置文件
    pub fn backup(&self, filename: &str) -> Result<()> {
        let path = self.get_config_path(filename);
        let backup_path = path.with_extension("backup");
        
        if path.exists() {
            fs::copy(&path, &backup_path)
                .context(format!("备份配置文件失败: {:?}", path))?;
            info!("配置文件已备份: {} -> {}", filename, backup_path.display());
        }
        
        Ok(())
    }
    
    /// 从备份恢复配置文件
    pub fn restore_from_backup(&self, filename: &str) -> Result<()> {
        let path = self.get_config_path(filename);
        let backup_path = path.with_extension("backup");
        
        if !backup_path.exists() {
            return Err(anyhow::anyhow!("备份文件不存在: {:?}", backup_path));
        }
        
        fs::copy(&backup_path, &path)
            .context(format!("恢复配置文件失败: {:?}", backup_path))?;
        
        info!("配置文件已从备份恢复: {}", filename);
        Ok(())
    }
}

/// 全局持久化管理器实例
pub type PersistenceManagerState = Mutex<PersistenceManager>;

/// 创建持久化管理器实例
pub fn create_persistence_manager() -> Result<PersistenceManagerState> {
    let manager = PersistenceManager::new()?;
    Ok(Mutex::new(manager))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    
    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct TestConfig {
        name: String,
        value: i32,
    }
    
    #[test]
    fn test_persistence_manager() {
        let manager = PersistenceManager::new().unwrap();
        
        let test_data = TestConfig {
            name: "test".to_string(),
            value: 42,
        };
        
        // 写入
        manager.write_json("test_config.json", &test_data).unwrap();
        
        // 读取
        let loaded_data: TestConfig = manager.read_json("test_config.json").unwrap();
        assert_eq!(loaded_data, test_data);
        
        // 清理
        manager.delete("test_config.json").unwrap();
    }
}

