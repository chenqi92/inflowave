use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use axum::{
    Router,
    routing::get,
    extract::{Path, State},
    http::{StatusCode, header, HeaderMap},
    response::IntoResponse,
};
use tower_http::cors::{CorsLayer, Any};
use log::{info, error, warn};
use anyhow::{anyhow, Result};

/// 视频服务器状态
#[derive(Clone)]
pub struct VideoServerState {
    /// 允许访问的目录前缀（安全限制）
    allowed_prefix: String,
}

/// 视频服务器
pub struct VideoServer {
    port: u16,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl VideoServer {
    /// 获取服务器端口
    pub fn port(&self) -> u16 {
        self.port
    }
}

// 全局视频服务器实例
lazy_static::lazy_static! {
    static ref VIDEO_SERVER: Arc<RwLock<Option<VideoServer>>> = Arc::new(RwLock::new(None));
    static ref VIDEO_SERVER_PORT: Arc<RwLock<Option<u16>>> = Arc::new(RwLock::new(None));
}

/// 启动视频服务器
pub async fn start_video_server() -> Result<u16> {
    let mut server_guard = VIDEO_SERVER.write().await;

    // 如果已经运行，返回现有端口
    if let Some(ref server) = *server_guard {
        info!("Video server already running on port {}", server.port);
        return Ok(server.port);
    }

    // 获取应用缓存目录作为允许的前缀
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Failed to get cache directory"))?
        .join("inflowave");

    let allowed_prefix = cache_dir.to_string_lossy().to_string();
    info!("Video server allowed prefix: {}", allowed_prefix);

    let state = VideoServerState {
        allowed_prefix,
    };

    // 创建路由 (axum 0.8 使用 {*path} 格式)
    let app = Router::new()
        .route("/video/{*path}", get(serve_video))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any)
        )
        .with_state(state);

    // 尝试绑定端口
    let port = find_available_port(14280, 14300).await?;
    let addr = SocketAddr::from(([127, 0, 0, 1], port));

    let listener = tokio::net::TcpListener::bind(addr).await?;
    info!("Video server starting on http://127.0.0.1:{}", port);

    // 创建关闭通道
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

    // 启动服务器
    tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
                info!("Video server shutting down");
            })
            .await
            .unwrap_or_else(|e| error!("Video server error: {}", e));
    });

    // 保存服务器实例
    *server_guard = Some(VideoServer {
        port,
        shutdown_tx: Some(shutdown_tx),
    });

    // 保存端口号
    *VIDEO_SERVER_PORT.write().await = Some(port);

    info!("Video server started successfully on port {}", port);
    Ok(port)
}

/// 停止视频服务器
pub async fn stop_video_server() -> Result<()> {
    let mut server_guard = VIDEO_SERVER.write().await;

    if let Some(mut server) = server_guard.take() {
        if let Some(tx) = server.shutdown_tx.take() {
            let _ = tx.send(());
        }
        info!("Video server stopped");
    }

    *VIDEO_SERVER_PORT.write().await = None;

    Ok(())
}

/// 获取视频服务器端口
pub async fn get_video_server_port() -> Option<u16> {
    *VIDEO_SERVER_PORT.read().await
}

/// 清理过期的临时视频文件
/// 在应用启动时调用，清理上次运行留下的临时文件
pub fn cleanup_temp_video_files() -> Result<()> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| anyhow!("Failed to get cache directory"))?
        .join("inflowave")
        .join("video_previews");

    if !cache_dir.exists() {
        info!("Video previews directory does not exist, nothing to clean");
        return Ok(());
    }

    let max_age_secs = 24 * 60 * 60; // 24小时
    let max_total_size: u64 = 500 * 1024 * 1024; // 500MB
    let target_size: u64 = 400 * 1024 * 1024; // 清理到 400MB
    let now = std::time::SystemTime::now();

    let mut files: Vec<(std::path::PathBuf, std::time::SystemTime, u64)> = Vec::new();
    let mut total_size: u64 = 0;
    let mut deleted_count = 0;
    let mut deleted_size: u64 = 0;

    // 收集所有文件信息
    if let Ok(entries) = std::fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Ok(metadata) = entry.metadata() {
                    let modified = metadata.modified().unwrap_or(now);
                    let size = metadata.len();
                    files.push((path, modified, size));
                    total_size += size;
                }
            }
        }
    }

    // 按修改时间排序（最旧的在前）
    files.sort_by(|a, b| a.1.cmp(&b.1));

    // 第一轮：删除过期文件（超过24小时）
    for (path, modified, size) in &files {
        if let Ok(age) = now.duration_since(*modified) {
            if age.as_secs() > max_age_secs {
                if let Err(e) = std::fs::remove_file(path) {
                    warn!("Failed to remove expired temp file {:?}: {}", path, e);
                } else {
                    info!("Removed expired temp file: {:?}", path);
                    deleted_count += 1;
                    deleted_size += size;
                    total_size -= size;
                }
            }
        }
    }

    // 第二轮：如果总大小超过限制，删除最旧的文件
    if total_size > max_total_size {
        for (path, _, size) in &files {
            if total_size <= target_size {
                break;
            }
            // 跳过已删除的文件
            if !path.exists() {
                continue;
            }
            if let Err(e) = std::fs::remove_file(path) {
                warn!("Failed to remove temp file {:?}: {}", path, e);
            } else {
                info!("Removed temp file to free space: {:?}", path);
                deleted_count += 1;
                deleted_size += size;
                total_size -= size;
            }
        }
    }

    if deleted_count > 0 {
        info!(
            "Cleaned up {} temp video files, freed {:.2}MB, remaining {:.2}MB",
            deleted_count,
            deleted_size as f64 / 1024.0 / 1024.0,
            total_size as f64 / 1024.0 / 1024.0
        );
    } else {
        info!(
            "No temp video files need cleanup, current size: {:.2}MB",
            total_size as f64 / 1024.0 / 1024.0
        );
    }

    Ok(())
}

/// 查找可用端口
async fn find_available_port(start: u16, end: u16) -> Result<u16> {
    for port in start..=end {
        let addr = SocketAddr::from(([127, 0, 0, 1], port));
        if tokio::net::TcpListener::bind(addr).await.is_ok() {
            return Ok(port);
        }
    }
    Err(anyhow!("No available port found in range {}-{}", start, end))
}

/// 处理视频请求
async fn serve_video(
    State(state): State<VideoServerState>,
    Path(path): Path<String>,
    headers: HeaderMap,
) -> impl IntoResponse {
    // URL 解码路径
    let decoded_path = match urlencoding::decode(&path) {
        Ok(p) => p.to_string(),
        Err(_) => path.clone(),
    };

    info!("Video request for: {}", decoded_path);

    // 安全检查：确保路径在允许的目录内
    if !decoded_path.starts_with(&state.allowed_prefix) {
        warn!("Access denied: path {} is outside allowed prefix {}", decoded_path, state.allowed_prefix);
        return (
            StatusCode::FORBIDDEN,
            HeaderMap::new(),
            "Access denied".as_bytes().to_vec(),
        );
    }

    // 防止目录遍历攻击
    if decoded_path.contains("..") {
        warn!("Directory traversal attempt blocked: {}", decoded_path);
        return (
            StatusCode::FORBIDDEN,
            HeaderMap::new(),
            "Access denied".as_bytes().to_vec(),
        );
    }

    let file_path = std::path::Path::new(&decoded_path);

    // 检查文件是否存在
    if !file_path.exists() {
        error!("Video file not found: {}", decoded_path);
        return (
            StatusCode::NOT_FOUND,
            HeaderMap::new(),
            "File not found".as_bytes().to_vec(),
        );
    }

    // 读取文件
    match std::fs::read(file_path) {
        Ok(data) => {
            let file_size = data.len() as u64;

            // 确定 MIME 类型
            let mime_type = match file_path.extension().and_then(|e| e.to_str()) {
                Some("mp4") => "video/mp4",
                Some("webm") => "video/webm",
                Some("ogg") | Some("ogv") => "video/ogg",
                Some("mov") => "video/quicktime",
                Some("avi") => "video/x-msvideo",
                Some("mkv") => "video/x-matroska",
                Some("m4v") => "video/x-m4v",
                _ => "video/mp4",
            };

            // 检查是否有 Range 请求
            if let Some(range_header) = headers.get(header::RANGE) {
                if let Ok(range_str) = range_header.to_str() {
                    // 解析 Range 头 (格式: "bytes=start-end")
                    if let Some(range) = parse_range_header(range_str, file_size) {
                        let (start, end) = range;
                        let content_length = end - start + 1;
                        let partial_data = data[start as usize..=end as usize].to_vec();

                        info!("Serving partial video: {} (range {}-{}/{}, {} bytes, {})",
                            decoded_path, start, end, file_size, content_length, mime_type);

                        let mut resp_headers = HeaderMap::new();
                        resp_headers.insert(header::CONTENT_TYPE, mime_type.parse().unwrap());
                        resp_headers.insert(header::CONTENT_LENGTH, content_length.to_string().parse().unwrap());
                        resp_headers.insert(header::CONTENT_RANGE,
                            format!("bytes {}-{}/{}", start, end, file_size).parse().unwrap());
                        resp_headers.insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
                        resp_headers.insert(header::CACHE_CONTROL, "no-cache".parse().unwrap());

                        return (StatusCode::PARTIAL_CONTENT, resp_headers, partial_data);
                    }
                }
            }

            // 没有 Range 请求，返回完整文件
            info!("Serving full video: {} ({} bytes, {})", decoded_path, file_size, mime_type);

            let mut resp_headers = HeaderMap::new();
            resp_headers.insert(header::CONTENT_TYPE, mime_type.parse().unwrap());
            resp_headers.insert(header::CONTENT_LENGTH, file_size.to_string().parse().unwrap());
            resp_headers.insert(header::ACCEPT_RANGES, "bytes".parse().unwrap());
            resp_headers.insert(header::CACHE_CONTROL, "no-cache".parse().unwrap());

            (StatusCode::OK, resp_headers, data)
        }
        Err(e) => {
            error!("Failed to read video file: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                HeaderMap::new(),
                format!("Failed to read file: {}", e).into_bytes(),
            )
        }
    }
}

/// 解析 Range 请求头
/// 返回 (start, end) 字节范围，如果解析失败返回 None
fn parse_range_header(range_str: &str, file_size: u64) -> Option<(u64, u64)> {
    // Range 格式: "bytes=start-end" 或 "bytes=start-"
    if !range_str.starts_with("bytes=") {
        return None;
    }

    let range_part = &range_str[6..]; // 跳过 "bytes="
    let parts: Vec<&str> = range_part.split('-').collect();

    if parts.len() != 2 {
        return None;
    }

    let start = parts[0].parse::<u64>().ok()?;
    let end = if parts[1].is_empty() {
        // "bytes=start-" 表示从 start 到文件末尾
        file_size - 1
    } else {
        parts[1].parse::<u64>().ok()?
    };

    // 验证范围有效性
    if start > end || end >= file_size {
        return None;
    }

    Some((start, end))
}
