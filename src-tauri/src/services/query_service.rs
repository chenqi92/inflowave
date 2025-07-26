use crate::models::{QueryRequest, QueryResult, QueryHistory, SavedQuery};
use crate::services::ConnectionService;
use anyhow::{Context, Result};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use log::{debug, error, info};

/// 查询服务
pub struct QueryService {
    connection_service: Arc<ConnectionService>,
    query_history: Arc<RwLock<Vec<QueryHistory>>>,
    saved_queries: Arc<RwLock<HashMap<String, SavedQuery>>>,
    max_history_size: usize,
}

impl QueryService {
    /// 创建新的查询服务
    pub fn new(connection_service: Arc<ConnectionService>) -> Self {
        Self {
            connection_service,
            query_history: Arc::new(RwLock::new(Vec::new())),
            saved_queries: Arc::new(RwLock::new(HashMap::new())),
            max_history_size: 1000,
        }
    }

    /// 执行查询
    pub async fn execute_query(&self, request: QueryRequest) -> Result<QueryResult> {
        debug!("执行查询: {}", request.connection_id);
        
        let manager = self.connection_service.get_manager();
        let client = manager.get_connection(&request.connection_id).await
            .context("获取连接失败")?;
        
        let _start_time = std::time::Instant::now();
        
        match client.execute_query(&request.query, request.database.as_deref()).await {
            Ok(result) => {
                // 记录成功的查询历史
                let history = QueryHistory::new(
                    request.connection_id,
                    request.database,
                    request.query,
                    &result,
                );
                
                self.add_to_history(history).await;
                
                info!("查询执行成功，耗时: {}ms", result.execution_time.unwrap_or(0));
                Ok(result)
            }
            Err(e) => {
                // 记录失败的查询历史
                let history = QueryHistory::error(
                    request.connection_id,
                    request.database,
                    request.query,
                    e.to_string(),
                );
                
                self.add_to_history(history).await;
                
                error!("查询执行失败: {}", e);
                Err(e)
            }
        }
    }

    /// 添加到查询历史
    async fn add_to_history(&self, history: QueryHistory) {
        let mut query_history = self.query_history.write().await;
        
        // 添加新记录
        query_history.push(history);
        
        // 限制历史记录数量
        if query_history.len() > self.max_history_size {
            query_history.remove(0);
        }
        
        debug!("查询历史记录已更新，当前记录数: {}", query_history.len());
    }

    /// 获取查询历史
    pub async fn get_query_history(
        &self,
        connection_id: Option<String>,
        limit: Option<usize>,
    ) -> Vec<QueryHistory> {
        let query_history = self.query_history.read().await;
        
        let mut filtered_history: Vec<QueryHistory> = if let Some(conn_id) = connection_id {
            query_history
                .iter()
                .filter(|h| h.connection_id == conn_id)
                .cloned()
                .collect()
        } else {
            query_history.clone()
        };
        
        // 按时间倒序排列
        filtered_history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // 限制返回数量
        if let Some(limit) = limit {
            filtered_history.truncate(limit);
        }
        
        debug!("返回 {} 条查询历史记录", filtered_history.len());
        filtered_history
    }

    /// 清空查询历史
    pub async fn clear_query_history(&self, connection_id: Option<String>) {
        let mut query_history = self.query_history.write().await;
        
        if let Some(conn_id) = connection_id {
            query_history.retain(|h| h.connection_id != conn_id);
            info!("已清空连接 '{}' 的查询历史", conn_id);
        } else {
            query_history.clear();
            info!("已清空所有查询历史");
        }
    }

    /// 保存查询
    pub async fn save_query(&self, query: SavedQuery) -> Result<String> {
        debug!("保存查询: {}", query.name);
        
        let query_id = query.id.clone();
        
        {
            let mut saved_queries = self.saved_queries.write().await;
            saved_queries.insert(query_id.clone(), query);
        }
        
        info!("查询保存成功: {}", query_id);
        Ok(query_id)
    }

    /// 获取保存的查询
    pub async fn get_saved_query(&self, query_id: &str) -> Option<SavedQuery> {
        let saved_queries = self.saved_queries.read().await;
        saved_queries.get(query_id).cloned()
    }

    /// 获取所有保存的查询
    pub async fn get_saved_queries(&self, tags: Option<Vec<String>>) -> Vec<SavedQuery> {
        let saved_queries = self.saved_queries.read().await;
        
        let mut queries: Vec<SavedQuery> = if let Some(filter_tags) = tags {
            saved_queries
                .values()
                .filter(|q| {
                    filter_tags.iter().any(|tag| q.tags.contains(tag))
                })
                .cloned()
                .collect()
        } else {
            saved_queries.values().cloned().collect()
        };
        
        // 按更新时间倒序排列
        queries.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
        
        debug!("返回 {} 个保存的查询", queries.len());
        queries
    }

    /// 更新保存的查询
    pub async fn update_saved_query(&self, query: SavedQuery) -> Result<()> {
        debug!("更新保存的查询: {}", query.name);
        
        let query_id = query.id.clone();
        
        {
            let mut saved_queries = self.saved_queries.write().await;
            
            if !saved_queries.contains_key(&query_id) {
                return Err(anyhow::anyhow!("查询 '{}' 不存在", query_id));
            }
            
            saved_queries.insert(query_id.clone(), query);
        }
        
        info!("查询更新成功: {}", query_id);
        Ok(())
    }

    /// 删除保存的查询
    pub async fn delete_saved_query(&self, query_id: &str) -> Result<()> {
        debug!("删除保存的查询: {}", query_id);
        
        {
            let mut saved_queries = self.saved_queries.write().await;
            
            if saved_queries.remove(query_id).is_none() {
                return Err(anyhow::anyhow!("查询 '{}' 不存在", query_id));
            }
        }
        
        info!("查询删除成功: {}", query_id);
        Ok(())
    }

    /// 搜索保存的查询
    pub async fn search_saved_queries(&self, keyword: &str) -> Vec<SavedQuery> {
        debug!("搜索保存的查询: {}", keyword);
        
        let saved_queries = self.saved_queries.read().await;
        let keyword_lower = keyword.to_lowercase();
        
        let mut results: Vec<SavedQuery> = saved_queries
            .values()
            .filter(|q| {
                q.name.to_lowercase().contains(&keyword_lower)
                    || q.query.to_lowercase().contains(&keyword_lower)
                    || q.description
                        .as_ref()
                        .map(|d| d.to_lowercase().contains(&keyword_lower))
                        .unwrap_or(false)
                    || q.tags.iter().any(|tag| tag.to_lowercase().contains(&keyword_lower))
            })
            .cloned()
            .collect();
        
        // 按相关性排序（简单实现：按名称匹配优先）
        results.sort_by(|a, b| {
            let a_name_match = a.name.to_lowercase().contains(&keyword_lower);
            let b_name_match = b.name.to_lowercase().contains(&keyword_lower);
            
            match (a_name_match, b_name_match) {
                (true, false) => std::cmp::Ordering::Less,
                (false, true) => std::cmp::Ordering::Greater,
                _ => a.updated_at.cmp(&b.updated_at).reverse(),
            }
        });
        
        debug!("搜索到 {} 个匹配的查询", results.len());
        results
    }

    /// 获取查询统计信息
    pub async fn get_query_stats(&self) -> crate::models::QueryStats {
        let query_history = self.query_history.read().await;
        
        let total_queries = query_history.len() as u64;
        let successful_queries = query_history.iter().filter(|h| h.success).count() as u64;
        let failed_queries = total_queries - successful_queries;
        
        let average_execution_time = if successful_queries > 0 {
            query_history
                .iter()
                .filter(|h| h.success)
                .map(|h| h.execution_time as f64)
                .sum::<f64>() / successful_queries as f64
        } else {
            0.0
        };
        
        let slowest_query = query_history
            .iter()
            .filter(|h| h.success)
            .max_by_key(|h| h.execution_time)
            .cloned();
        
        // 统计最常用的查询
        let mut query_counts: HashMap<String, u64> = HashMap::new();
        for history in query_history.iter() {
            *query_counts.entry(history.query.clone()).or_insert(0) += 1;
        }
        
        let mut most_frequent_queries: Vec<(String, u64)> = query_counts.into_iter().collect();
        most_frequent_queries.sort_by(|a, b| b.1.cmp(&a.1));
        most_frequent_queries.truncate(10);
        
        crate::models::QueryStats {
            total_queries,
            successful_queries,
            failed_queries,
            average_execution_time,
            slowest_query,
            most_frequent_queries,
        }
    }

    /// 设置最大历史记录数量
    pub fn set_max_history_size(&mut self, size: usize) {
        self.max_history_size = size;
        debug!("查询历史最大记录数设置为: {}", size);
    }
}
