use crate::models::ConnectionConfig;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;
use log::{debug, info, warn};

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: String,
    pub connections: Vec<ConnectionConfig>,
    pub settings: AppSettings,
}

/// 应用设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub query_timeout: u64,
    pub max_query_history: usize,
    pub enable_logging: bool,
    pub log_level: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            language: "zh-CN".to_string(),
            query_timeout: 30,
            max_query_history: 100,
            enable_logging: true,
            log_level: "info".to_string(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: env!("CARGO_PKG_VERSION").to_string(),
            connections: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}

/// 配置管理器
#[derive(Debug)]
pub struct ConfigManager {
    config_path: PathBuf,
    config: AppConfig,
}

impl ConfigManager {
    /// 创建新的配置管理器
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self> {
        let config_dir = app_handle
            .path()
            .app_config_dir()
            .context("获取应用配置目录失败")?;
        
        // 确保配置目录存在
        std::fs::create_dir_all(&config_dir)
            .context("创建配置目录失败")?;
        
        let config_path = config_dir.join("config.json");
        
        debug!("配置文件路径: {:?}", config_path);
        
        let config = if config_path.exists() {
            Self::load_config(&config_path)?
        } else {
            info!("配置文件不存在，使用默认配置");
            AppConfig::default()
        };
        
        Ok(Self {
            config_path,
            config,
        })
    }

    /// 加载配置
    fn load_config(path: &PathBuf) -> Result<AppConfig> {
        debug!("加载配置文件: {:?}", path);
        
        let content = std::fs::read_to_string(path)
            .context("读取配置文件失败")?;
        
        let config: AppConfig = serde_json::from_str(&content)
            .context("解析配置文件失败")?;
        
        info!("配置文件加载成功");
        Ok(config)
    }

    /// 保存配置
    pub fn save_config(&self) -> Result<()> {
        debug!("保存配置文件: {:?}", self.config_path);
        
        let content = serde_json::to_string_pretty(&self.config)
            .context("序列化配置失败")?;
        
        std::fs::write(&self.config_path, content)
            .context("写入配置文件失败")?;
        
        info!("配置文件保存成功");
        Ok(())
    }

    /// 获取配置
    pub fn get_config(&self) -> &AppConfig {
        &self.config
    }

    /// 获取可变配置
    pub fn get_config_mut(&mut self) -> &mut AppConfig {
        &mut self.config
    }

    /// 更新设置
    pub fn update_settings(&mut self, settings: AppSettings) -> Result<()> {
        debug!("更新应用设置");
        
        self.config.settings = settings;
        self.save_config()?;
        
        info!("应用设置更新成功");
        Ok(())
    }

    /// 添加连接配置
    pub fn add_connection(&mut self, connection: ConnectionConfig) -> Result<()> {
        debug!("添加连接配置: {}", connection.name);
        
        // 检查是否已存在相同 ID 的连接
        if self.config.connections.iter().any(|c| c.id == connection.id) {
            return Err(anyhow::anyhow!("连接 ID '{}' 已存在", connection.id));
        }
        
        self.config.connections.push(connection);
        self.save_config()?;
        
        info!("连接配置添加成功");
        Ok(())
    }

    /// 更新连接配置
    pub fn update_connection(&mut self, connection: ConnectionConfig) -> Result<()> {
        debug!("更新连接配置: {}", connection.name);
        
        let position = self.config.connections
            .iter()
            .position(|c| c.id == connection.id)
            .ok_or_else(|| anyhow::anyhow!("连接 '{}' 不存在", connection.id))?;
        
        self.config.connections[position] = connection;
        self.save_config()?;
        
        info!("连接配置更新成功");
        Ok(())
    }

    /// 删除连接配置
    pub fn remove_connection(&mut self, connection_id: &str) -> Result<()> {
        debug!("删除连接配置: {}", connection_id);
        
        let initial_len = self.config.connections.len();
        self.config.connections.retain(|c| c.id != connection_id);
        
        if self.config.connections.len() == initial_len {
            return Err(anyhow::anyhow!("连接 '{}' 不存在", connection_id));
        }
        
        self.save_config()?;
        
        info!("连接配置删除成功");
        Ok(())
    }

    /// 获取所有连接配置
    pub fn get_connections(&self) -> &Vec<ConnectionConfig> {
        &self.config.connections
    }

    /// 获取连接配置
    pub fn get_connection(&self, connection_id: &str) -> Option<&ConnectionConfig> {
        self.config.connections.iter().find(|c| c.id == connection_id)
    }

    /// 备份配置
    pub fn backup_config(&self) -> Result<()> {
        let backup_path = self.config_path.with_extension("json.backup");
        
        debug!("备份配置文件到: {:?}", backup_path);
        
        std::fs::copy(&self.config_path, &backup_path)
            .context("备份配置文件失败")?;
        
        info!("配置文件备份成功");
        Ok(())
    }

    /// 恢复配置
    pub fn restore_config(&mut self) -> Result<()> {
        let backup_path = self.config_path.with_extension("json.backup");
        
        if !backup_path.exists() {
            return Err(anyhow::anyhow!("备份文件不存在"));
        }
        
        debug!("从备份恢复配置文件: {:?}", backup_path);
        
        std::fs::copy(&backup_path, &self.config_path)
            .context("恢复配置文件失败")?;
        
        self.config = Self::load_config(&self.config_path)?;
        
        info!("配置文件恢复成功");
        Ok(())
    }

    /// 重置配置
    pub fn reset_config(&mut self) -> Result<()> {
        warn!("重置配置文件");
        
        self.config = AppConfig::default();
        self.save_config()?;
        
        info!("配置文件重置成功");
        Ok(())
    }
}

/// 初始化配置
pub fn init_config(app_handle: &tauri::AppHandle) -> Result<ConfigManager> {
    info!("初始化应用配置");
    
    let config_manager = ConfigManager::new(app_handle)
        .context("创建配置管理器失败")?;
    
    info!("应用配置初始化成功");
    Ok(config_manager)
}
