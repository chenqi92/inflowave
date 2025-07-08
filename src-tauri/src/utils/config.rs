use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use anyhow::{Context, Result};
use log::{debug, info, error};

/// 应用配置工具
pub struct ConfigUtils;

impl ConfigUtils {
    /// 获取应用配置目录
    pub fn get_config_dir() -> Result<PathBuf> {
        let config_dir = dirs::config_dir()
            .context("无法获取系统配置目录")?
            .join("influx-gui");
        
        // 确保目录存在
        std::fs::create_dir_all(&config_dir)
            .context("创建配置目录失败")?;
        
        debug!("配置目录: {:?}", config_dir);
        Ok(config_dir)
    }

    /// 获取数据目录
    pub fn get_data_dir() -> Result<PathBuf> {
        let data_dir = dirs::data_dir()
            .context("无法获取系统数据目录")?
            .join("influx-gui");
        
        // 确保目录存在
        std::fs::create_dir_all(&data_dir)
            .context("创建数据目录失败")?;
        
        debug!("数据目录: {:?}", data_dir);
        Ok(data_dir)
    }

    /// 获取缓存目录
    pub fn get_cache_dir() -> Result<PathBuf> {
        let cache_dir = dirs::cache_dir()
            .context("无法获取系统缓存目录")?
            .join("influx-gui");
        
        // 确保目录存在
        std::fs::create_dir_all(&cache_dir)
            .context("创建缓存目录失败")?;
        
        debug!("缓存目录: {:?}", cache_dir);
        Ok(cache_dir)
    }

    /// 读取 JSON 配置文件
    pub fn read_json_config<T>(file_path: &PathBuf) -> Result<T>
    where
        T: for<'de> Deserialize<'de>,
    {
        debug!("读取配置文件: {:?}", file_path);
        
        let content = std::fs::read_to_string(file_path)
            .context("读取配置文件失败")?;
        
        let config: T = serde_json::from_str(&content)
            .context("解析配置文件失败")?;
        
        info!("配置文件读取成功");
        Ok(config)
    }

    /// 写入 JSON 配置文件
    pub fn write_json_config<T>(file_path: &PathBuf, config: &T) -> Result<()>
    where
        T: Serialize,
    {
        debug!("写入配置文件: {:?}", file_path);
        
        // 确保父目录存在
        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent)
                .context("创建配置文件目录失败")?;
        }
        
        let content = serde_json::to_string_pretty(config)
            .context("序列化配置失败")?;
        
        std::fs::write(file_path, content)
            .context("写入配置文件失败")?;
        
        info!("配置文件写入成功");
        Ok(())
    }

    /// 备份配置文件
    pub fn backup_config_file(file_path: &PathBuf) -> Result<PathBuf> {
        debug!("备份配置文件: {:?}", file_path);
        
        if !file_path.exists() {
            return Err(anyhow::anyhow!("配置文件不存在"));
        }
        
        let backup_path = file_path.with_extension("json.backup");
        
        std::fs::copy(file_path, &backup_path)
            .context("备份配置文件失败")?;
        
        info!("配置文件备份成功: {:?}", backup_path);
        Ok(backup_path)
    }

    /// 恢复配置文件
    pub fn restore_config_file(file_path: &PathBuf) -> Result<()> {
        debug!("恢复配置文件: {:?}", file_path);
        
        let backup_path = file_path.with_extension("json.backup");
        
        if !backup_path.exists() {
            return Err(anyhow::anyhow!("备份文件不存在"));
        }
        
        std::fs::copy(&backup_path, file_path)
            .context("恢复配置文件失败")?;
        
        info!("配置文件恢复成功");
        Ok(())
    }

    /// 清理旧的配置文件
    pub fn cleanup_old_configs(config_dir: &PathBuf, keep_days: u64) -> Result<()> {
        debug!("清理旧配置文件，保留 {} 天", keep_days);
        
        let cutoff_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() - (keep_days * 24 * 60 * 60);
        
        let entries = std::fs::read_dir(config_dir)
            .context("读取配置目录失败")?;
        
        let mut cleaned_count = 0;
        
        for entry in entries {
            let entry = entry.context("读取目录项失败")?;
            let path = entry.path();
            
            if path.is_file() && path.extension().map_or(false, |ext| ext == "backup") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                            if duration.as_secs() < cutoff_time {
                                if std::fs::remove_file(&path).is_ok() {
                                    cleaned_count += 1;
                                    debug!("删除旧配置文件: {:?}", path);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        info!("清理完成，删除了 {} 个旧配置文件", cleaned_count);
        Ok(())
    }

    /// 验证配置文件完整性
    pub fn validate_config_file<T>(file_path: &PathBuf) -> Result<bool>
    where
        T: for<'de> Deserialize<'de>,
    {
        debug!("验证配置文件: {:?}", file_path);
        
        if !file_path.exists() {
            return Ok(false);
        }
        
        match Self::read_json_config::<T>(file_path) {
            Ok(_) => {
                info!("配置文件验证通过");
                Ok(true)
            }
            Err(e) => {
                error!("配置文件验证失败: {}", e);
                Ok(false)
            }
        }
    }

    /// 获取配置文件大小
    pub fn get_config_file_size(file_path: &PathBuf) -> Result<u64> {
        let metadata = std::fs::metadata(file_path)
            .context("获取文件元数据失败")?;
        
        Ok(metadata.len())
    }

    /// 检查配置目录磁盘空间
    pub fn check_disk_space(config_dir: &PathBuf) -> Result<(u64, u64)> {
        // 简单实现，返回固定值
        // 在实际应用中，可以使用 statvfs 等系统调用获取真实磁盘空间
        Ok((1024 * 1024 * 1024, 512 * 1024 * 1024)) // (总空间, 可用空间)
    }
}

/// 配置文件锁
pub struct ConfigLock {
    lock_file: PathBuf,
}

impl ConfigLock {
    /// 创建配置锁
    pub fn new(config_dir: &PathBuf) -> Self {
        let lock_file = config_dir.join(".lock");
        Self { lock_file }
    }

    /// 获取锁
    pub fn acquire(&self) -> Result<()> {
        if self.lock_file.exists() {
            return Err(anyhow::anyhow!("配置文件已被锁定"));
        }
        
        std::fs::write(&self.lock_file, std::process::id().to_string())
            .context("创建锁文件失败")?;
        
        debug!("获取配置锁成功");
        Ok(())
    }

    /// 释放锁
    pub fn release(&self) -> Result<()> {
        if self.lock_file.exists() {
            std::fs::remove_file(&self.lock_file)
                .context("删除锁文件失败")?;
        }
        
        debug!("释放配置锁成功");
        Ok(())
    }

    /// 检查锁状态
    pub fn is_locked(&self) -> bool {
        self.lock_file.exists()
    }
}

impl Drop for ConfigLock {
    fn drop(&mut self) {
        let _ = self.release();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize, PartialEq, Debug)]
    struct TestConfig {
        name: String,
        value: i32,
    }

    #[test]
    fn test_read_write_config() {
        let temp_dir = tempdir().unwrap();
        let config_path = temp_dir.path().join("test_config.json");
        
        let original_config = TestConfig {
            name: "test".to_string(),
            value: 42,
        };
        
        // 写入配置
        ConfigUtils::write_json_config(&config_path, &original_config).unwrap();
        
        // 读取配置
        let loaded_config: TestConfig = ConfigUtils::read_json_config(&config_path).unwrap();
        
        assert_eq!(original_config, loaded_config);
    }

    #[test]
    fn test_config_lock() {
        let temp_dir = tempdir().unwrap();
        let lock = ConfigLock::new(temp_dir.path());
        
        assert!(!lock.is_locked());
        
        lock.acquire().unwrap();
        assert!(lock.is_locked());
        
        lock.release().unwrap();
        assert!(!lock.is_locked());
    }
}
