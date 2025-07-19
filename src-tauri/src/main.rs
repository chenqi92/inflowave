// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod models;
mod services;
mod utils;
mod config;
mod updater;

use tauri::{Manager, Emitter, menu::{MenuBuilder, SubmenuBuilder}, LogicalSize, LogicalPosition};
use log::{info, warn, error};

// Tauri commands
use commands::connection::*;
use commands::database::*;
use commands::query::*;
use commands::system::*;
use commands::data_write::*;
use commands::query_history::*;
use commands::settings::*;
use commands::context_menu::*;
use commands::data_export::*;
use commands::dashboard::*;
use commands::performance::*;
use commands::user_experience::*;
use commands::extensions::*;
use commands::optimization_history::*;
use commands::port_manager::*;
use commands::embedded_server::*;

// Updater commands
use updater::*;

// Services
use services::ConnectionService;
use utils::encryption::create_encryption_service;

// 创建原生菜单 - 完整的专业化菜单，支持跨平台
fn create_native_menu(app: &tauri::AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    info!("为平台创建原生菜单: {}", std::env::consts::OS);
    // 文件菜单 - 使用平台特定的快捷键
    let cmd_key = if cfg!(target_os = "macos") { "Cmd" } else { "Ctrl" };
    let file_menu = SubmenuBuilder::new(app, "文件")
        .text("new_query", &format!("新建查询\t{}+N", cmd_key))
        .text("open_file", &format!("打开文件\t{}+O", cmd_key))
        .text("save", &format!("保存\t{}+S", cmd_key))
        .text("save_as", &format!("另存为\t{}+Shift+S", cmd_key))
        .separator()
        .text("import_data", "导入数据")
        .text("export_data", "导出数据")
        .separator()
        .text("quit", &format!("退出\t{}+Q", cmd_key))
        .build()?;

    // 编辑菜单 - 使用平台特定的快捷键
    let edit_menu = SubmenuBuilder::new(app, "编辑")
        .text("undo", &format!("撤销\t{}+Z", cmd_key))
        .text("redo", &format!("重做\t{}+Y", cmd_key))
        .separator()
        .text("cut", &format!("剪切\t{}+X", cmd_key))
        .text("copy", &format!("复制\t{}+C", cmd_key))
        .text("paste", &format!("粘贴\t{}+V", cmd_key))
        .separator()
        .text("find", &format!("查找\t{}+F", cmd_key))
        .text("replace", &format!("替换\t{}+H", cmd_key))
        .text("global_search", &format!("全局搜索\t{}+Shift+F", cmd_key))
        .build()?;

    // 查看菜单 - 使用平台特定的快捷键
    let view_menu = SubmenuBuilder::new(app, "查看")
        .text("view_datasource", &format!("数据源管理\t{}+1", cmd_key))
        .text("view_query", &format!("查询编辑器\t{}+2", cmd_key))
        .text("view_visualization", &format!("数据可视化\t{}+3", cmd_key))
        .text("view_performance", &format!("性能监控\t{}+4", cmd_key))
        .separator()
        .text("toggle_sidebar", &format!("切换侧边栏\t{}+B", cmd_key))
        .text("toggle_statusbar", "切换状态栏")
        .text("fullscreen", "全屏模式\tF11")
        .separator()
        .text("zoom_in", &format!("放大\t{}+=", cmd_key))
        .text("zoom_out", &format!("缩小\t{}-", cmd_key))
        .text("zoom_reset", &format!("重置缩放\t{}+0", cmd_key))
        .build()?;

    // 数据库菜单 - 使用平台特定的快捷键
    let database_menu = SubmenuBuilder::new(app, "数据库")
        .text("new_connection", &format!("新建连接\t{}+Shift+N", cmd_key))
        .text("edit_connection", "编辑连接")
        .text("test_connection", &format!("测试连接\t{}+T", cmd_key))
        .text("delete_connection", "删除连接")
        .separator()
        .text("refresh_structure", "刷新数据库结构\tF5")
        .text("database_info", "查看数据库信息")
        .text("database_stats", "数据库统计")
        .separator()
        .text("import_structure", "导入数据库结构")
        .text("export_structure", "导出数据库结构")
        .build()?;

    // 查询菜单 - 使用平台特定的快捷键
    let query_menu = SubmenuBuilder::new(app, "查询")
        .text("execute_query", "执行查询\tF5")
        .text("stop_query", &format!("停止查询\t{}+F2", cmd_key))
        .text("execute_selection", &format!("执行选中\t{}+Enter", cmd_key))
        .separator()
        .text("query_history", &format!("查询历史\t{}+H", cmd_key))
        .text("save_query", "保存查询")
        .text("query_favorites", "查询收藏夹")
        .separator()
        .text("query_plan", "查询计划")
        .text("explain_query", "解释查询")
        .text("format_query", &format!("格式化查询\t{}+Alt+L", cmd_key))
        .build()?;

    // 风格设置子菜单 - 更新为完整的主题支持
    let style_submenu = SubmenuBuilder::new(app, "风格设置")
        .text("theme_default", "默认蓝色")
        .text("theme_shadcn", "Shadcn 黑白")
        .text("theme_zinc", "锌灰色")
        .text("theme_slate", "石板灰")
        .text("theme_indigo", "靛蓝色")
        .text("theme_emerald", "翡翠绿")
        .text("theme_blue", "经典蓝")
        .text("theme_green", "自然绿色")
        .text("theme_red", "活力红色")
        .text("theme_orange", "温暖橙色")
        .text("theme_purple", "优雅紫色")
        .text("theme_rose", "浪漫玫瑰")
        .text("theme_yellow", "明亮黄色")
        .text("theme_violet", "神秘紫罗兰")
        .build()?;

    // 工具菜单 - 使用平台特定的快捷键
    let tools_menu = SubmenuBuilder::new(app, "工具")
        .text("console", &format!("控制台\t{}+`", cmd_key))
        .text("dev_tools", "开发者工具\tF12")
        .text("query_performance", "查询性能分析")
        .separator()
        .text("extensions", "扩展管理")
        .text("theme_settings", "主题设置")
        .item(&style_submenu)
        .text("language_settings", "语言设置")
        .separator()
        .text("preferences", &format!("首选项\t{},", cmd_key))
        .build()?;

    // 帮助菜单 - 使用平台特定的快捷键
    let help_menu = SubmenuBuilder::new(app, "帮助")
        .text("user_manual", "用户手册\tF1")
        .text("quick_start", "快速入门")
        .text("shortcuts_help", &format!("键盘快捷键\t{}/", cmd_key))
        .separator()
        .text("sample_queries", "示例查询")
        .text("api_docs", "API文档")
        .text("influxdb_docs", "InfluxDB文档")
        .separator()
        .text("check_updates", "检查更新")
        .text("report_issue", "反馈问题")
        .text("about", "关于InfloWave")
        .build()?;

    MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &view_menu, &database_menu, &query_menu, &tools_menu, &help_menu])
        .build()
}

// 辅助函数：发送菜单动作事件
fn emit_menu_action(window: &tauri::WebviewWindow, action: &str) {
    log::info!("发送菜单动作: {}", action);
    if let Err(e) = window.emit("menu-action", action) {
        log::error!("发送菜单事件失败 '{}': {}", action, e);
    }
}

// 处理菜单事件 - 完整的专业化菜单
fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    // 添加调试日志
    log::info!("菜单事件触发: {}", event.id().as_ref());
    
    // 获取主窗口 - 改进的窗口查找逻辑
    let window = match app.get_webview_window("main") {
        Some(window) => {
            log::debug!("找到主窗口: main");
            window
        },
        None => {
            // 如果找不到 main 窗口，尝试获取第一个可用的窗口
            log::warn!("未找到 'main' 窗口，尝试获取第一个可用窗口");
            match app.webview_windows().values().next().cloned() {
                Some(window) => {
                    log::info!("使用第一个可用窗口: {}", window.label());
                    window
                },
                None => {
                    log::error!("没有找到任何可用窗口");
                    return;
                }
            }
        }
    };

    match event.id().as_ref() {
        // 文件菜单
        "new_query" => emit_menu_action(&window, "new_query"),
        "open_file" => emit_menu_action(&window, "open_file"),
        "save" => emit_menu_action(&window, "save"),
        "save_as" => emit_menu_action(&window, "save_as"),
        "import_data" => emit_menu_action(&window, "import_data"),
        "export_data" => emit_menu_action(&window, "export_data"),
        "quit" => {
            std::process::exit(0);
        }

        // 编辑菜单
        "undo" => emit_menu_action(&window, "undo"),
        "redo" => emit_menu_action(&window, "redo"),
        "cut" => emit_menu_action(&window, "cut"),
        "copy" => emit_menu_action(&window, "copy"),
        "paste" => emit_menu_action(&window, "paste"),
        "find" => emit_menu_action(&window, "find"),
        "replace" => emit_menu_action(&window, "replace"),
        "global_search" => emit_menu_action(&window, "global_search"),

        // 查看菜单
        "view_datasource" => emit_menu_action(&window, "navigate:/connections"),
        "view_query" => emit_menu_action(&window, "navigate:/query"),
        "view_visualization" => emit_menu_action(&window, "navigate:/visualization"),
        "view_performance" => emit_menu_action(&window, "navigate:/performance"),
        "toggle_sidebar" => emit_menu_action(&window, "toggle_sidebar"),
        "toggle_statusbar" => emit_menu_action(&window, "toggle_statusbar"),
        "fullscreen" => emit_menu_action(&window, "fullscreen"),
        "zoom_in" => emit_menu_action(&window, "zoom_in"),
        "zoom_out" => emit_menu_action(&window, "zoom_out"),
        "zoom_reset" => emit_menu_action(&window, "zoom_reset"),

        // 数据库菜单
        "new_connection" => emit_menu_action(&window, "new_connection"),
        "edit_connection" => emit_menu_action(&window, "edit_connection"),
        "test_connection" => emit_menu_action(&window, "test_connection"),
        "delete_connection" => emit_menu_action(&window, "delete_connection"),
        "refresh_structure" => emit_menu_action(&window, "refresh_structure"),
        "database_info" => emit_menu_action(&window, "database_info"),
        "database_stats" => emit_menu_action(&window, "database_stats"),
        "import_structure" => emit_menu_action(&window, "import_structure"),
        "export_structure" => emit_menu_action(&window, "export_structure"),

        // 查询菜单
        "execute_query" => emit_menu_action(&window, "execute_query"),
        "stop_query" => emit_menu_action(&window, "stop_query"),
        "execute_selection" => emit_menu_action(&window, "execute_selection"),
        "query_history" => emit_menu_action(&window, "query_history"),
        "save_query" => emit_menu_action(&window, "save_query"),
        "query_favorites" => emit_menu_action(&window, "query_favorites"),
        "query_plan" => emit_menu_action(&window, "query_plan"),
        "explain_query" => emit_menu_action(&window, "explain_query"),
        "format_query" => emit_menu_action(&window, "format_query"),

        // 软件风格菜单 - 更新为完整的主题支持
        "theme_default" => {
            log::info!("发送主题切换事件: default");
            if let Err(e) = window.emit("theme-change", "default") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_shadcn" => {
            log::info!("发送主题切换事件: shadcn");
            if let Err(e) = window.emit("theme-change", "shadcn") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_zinc" => {
            log::info!("发送主题切换事件: zinc");
            if let Err(e) = window.emit("theme-change", "zinc") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_slate" => {
            log::info!("发送主题切换事件: slate");
            if let Err(e) = window.emit("theme-change", "slate") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_indigo" => {
            log::info!("发送主题切换事件: indigo");
            if let Err(e) = window.emit("theme-change", "indigo") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_emerald" => {
            log::info!("发送主题切换事件: emerald");
            if let Err(e) = window.emit("theme-change", "emerald") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_blue" => {
            log::info!("发送主题切换事件: blue");
            if let Err(e) = window.emit("theme-change", "blue") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_green" => {
            log::info!("发送主题切换事件: green");
            if let Err(e) = window.emit("theme-change", "green") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_red" => {
            log::info!("发送主题切换事件: red");
            if let Err(e) = window.emit("theme-change", "red") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_orange" => {
            log::info!("发送主题切换事件: orange");
            if let Err(e) = window.emit("theme-change", "orange") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_purple" => {
            log::info!("发送主题切换事件: purple");
            if let Err(e) = window.emit("theme-change", "purple") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_rose" => {
            log::info!("发送主题切换事件: rose");
            if let Err(e) = window.emit("theme-change", "rose") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_yellow" => {
            log::info!("发送主题切换事件: yellow");
            if let Err(e) = window.emit("theme-change", "yellow") {
                log::error!("发送主题事件失败: {}", e);
            }
        }
        "theme_violet" => {
            log::info!("发送主题切换事件: violet");
            if let Err(e) = window.emit("theme-change", "violet") {
                log::error!("发送主题事件失败: {}", e);
            }
        }

        // 工具菜单
        "console" => emit_menu_action(&window, "console"),
        "dev_tools" => emit_menu_action(&window, "dev_tools"),
        "query_performance" => emit_menu_action(&window, "query_performance"),
        "extensions" => emit_menu_action(&window, "navigate:/extensions"),
        "theme_settings" => emit_menu_action(&window, "theme_settings"),
        "language_settings" => emit_menu_action(&window, "language_settings"),
        "preferences" => emit_menu_action(&window, "navigate:/settings"),

        // 帮助菜单
        "user_manual" => emit_menu_action(&window, "user_manual"),
        "quick_start" => emit_menu_action(&window, "quick_start"),
        "shortcuts_help" => emit_menu_action(&window, "shortcuts_help"),
        "sample_queries" => emit_menu_action(&window, "sample_queries"),
        "api_docs" => emit_menu_action(&window, "api_docs"),
        "influxdb_docs" => emit_menu_action(&window, "influxdb_docs"),
        "check_updates" => emit_menu_action(&window, "check_updates"),
        "report_issue" => emit_menu_action(&window, "report_issue"),
        "about" => emit_menu_action(&window, "about"),

        _ => {}
    }
}

/// 设置嵌入式服务器（如果需要）
async fn setup_embedded_server_if_needed(app_handle: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use services::embedded_server::{init_embedded_server, start_embedded_server, ServerConfig};
    
    // 从配置或环境变量中读取是否需要嵌入式服务器
    let enable_embedded_server = std::env::var("ENABLE_EMBEDDED_SERVER")
        .unwrap_or_else(|_| "false".to_string())
        .parse::<bool>()
        .unwrap_or(false);
    
    if !enable_embedded_server {
        info!("嵌入式服务器已禁用");
        return Ok(());
    }
    
    info!("正在设置嵌入式服务器...");
    
    let config = ServerConfig {
        enabled: true,
        preferred_port: 1422,
        port_range: (1422, 1500),
        auto_start: true,
        features: vec!["debug".to_string(), "proxy".to_string()],
    };
    
    // 初始化嵌入式服务器
    init_embedded_server(config)?;
    
    // 启动服务器
    match start_embedded_server().await {
        Ok(port) => {
            info!("嵌入式服务器已启动，端口: {}", port);
            
            // 通知前端服务器已启动
            if let Err(e) = app_handle.emit("embedded-server-started", port) {
                warn!("通知前端嵌入式服务器启动失败: {}", e);
            }
        }
        Err(e) => {
            warn!("嵌入式服务器启动失败: {}", e);
        }
    }
    
    Ok(())
}

/// 获取并设置响应式窗口大小
fn setup_responsive_window_size(window: &tauri::WebviewWindow) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    info!("正在设置响应式窗口大小...");
    
    // 获取主显示器信息
    match window.primary_monitor() {
        Ok(Some(monitor)) => {
            let screen_size = monitor.size();
            let scale_factor = monitor.scale_factor();
            
            info!("检测到屏幕大小: {}x{}, 缩放因子: {}", 
                  screen_size.width, screen_size.height, scale_factor);
            
            // 计算合适的窗口大小（屏幕的80%，但不超过最大合理尺寸）
            let max_width = 1800.0;
            let max_height = 1200.0;
            let min_width = 1000.0;
            let min_height = 700.0;
            
            // 计算目标尺寸（屏幕的80%）
            let target_width = (screen_size.width as f64 * 0.8).min(max_width).max(min_width);
            let target_height = (screen_size.height as f64 * 0.8).min(max_height).max(min_height);
            
            info!("计算出的窗口大小: {}x{}", target_width, target_height);
            
            // 计算屏幕正中心位置
            let center_x = (screen_size.width as f64 - target_width) / 2.0;
            let center_y = (screen_size.height as f64 - target_height) / 2.0;
            
            // 确保位置不为负数
            let center_x = center_x.max(0.0);
            let center_y = center_y.max(0.0);
            
            info!("计算出的中心位置: ({}, {})", center_x, center_y);
            
            // 设置窗口大小
            let logical_size = LogicalSize::new(target_width, target_height);
            if let Err(e) = window.set_size(logical_size) {
                warn!("设置窗口大小失败: {}", e);
            } else {
                info!("窗口大小已设置: {}x{}", target_width, target_height);
            }
            
            // 直接设置窗口位置到计算出的中心点
            let center_position = LogicalPosition::new(center_x, center_y);
            if let Err(e) = window.set_position(center_position) {
                warn!("设置窗口位置失败: {}", e);
                // 如果手动设置位置失败，则使用系统的居中方法作为备用
                if let Err(e) = window.center() {
                    warn!("备用居中方法也失败: {}", e);
                }
            } else {
                info!("窗口已精确定位到屏幕中心: ({}, {})", center_x, center_y);
            }
            
            // 显示窗口
            if let Err(e) = window.show() {
                warn!("显示窗口失败: {}", e);
            } else {
                info!("窗口已显示");
            }
            
            info!("响应式窗口大小设置完成: {}x{}", target_width, target_height);
        }
        Ok(None) => {
            warn!("无法获取主显示器信息，使用默认窗口大小和居中");
            
            // 设置默认大小
            let default_width = 1400.0;
            let default_height = 900.0;
            if let Err(e) = window.set_size(LogicalSize::new(default_width, default_height)) {
                warn!("设置默认窗口大小失败: {}", e);
            } else {
                info!("默认窗口大小已设置: {}x{}", default_width, default_height);
            }
            
            // 使用系统居中方法
            if let Err(e) = window.center() {
                warn!("窗口居中失败: {}", e);
            } else {
                info!("默认窗口已居中显示");
            }
            
            // 显示窗口
            if let Err(e) = window.show() {
                warn!("显示窗口失败: {}", e);
            }
        }
        Err(e) => {
            error!("获取显示器信息失败: {}, 使用错误恢复模式", e);
            
            // 设置默认大小
            let default_width = 1400.0;
            let default_height = 900.0;
            if let Err(e) = window.set_size(LogicalSize::new(default_width, default_height)) {
                warn!("设置默认窗口大小失败: {}", e);
            } else {
                info!("错误恢复模式下窗口大小已设置: {}x{}", default_width, default_height);
            }
            
            // 使用系统居中方法
            if let Err(e) = window.center() {
                warn!("窗口居中失败: {}", e);
            } else {
                info!("错误恢复模式下窗口已居中显示");
            }
            
            // 显示窗口
            if let Err(e) = window.show() {
                warn!("显示窗口失败: {}", e);
            }
        }
    }
    
    Ok(())
}

/// 处理启动时的端口冲突
async fn handle_port_conflicts_at_startup() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use services::port_manager::get_port_manager;
    
    info!("检查启动时端口冲突...");
    
    let manager = get_port_manager();
    let manager = manager.read().unwrap();
    
    // 检查默认端口 1422 是否可用
    if manager.is_port_available(1422) {
        // 为前端服务分配默认端口
        match manager.allocate_port("frontend") {
            Ok(port) => {
                info!("前端服务使用默认端口: {}", port);
            }
            Err(e) => {
                warn!("无法分配默认端口，尝试查找其他可用端口: {}", e);
                // 分配其他可用端口
                match manager.find_available_port() {
                    Ok(port) => {
                        warn!("端口冲突已解决，前端将使用端口: {} 而不是默认的 1422", port);
                    }
                    Err(e) => {
                        error!("无法找到可用端口: {}", e);
                        return Err(format!("端口分配失败: {}", e).into());
                    }
                }
            }
        }
    } else {
        warn!("默认端口 1422 被占用，正在查找可用端口...");
        // 查找并分配可用端口
        match manager.allocate_port("frontend") {
            Ok(port) => {
                warn!("端口冲突已解决，前端将使用端口: {} 而不是默认的 1422", port);
            }
            Err(e) => {
                error!("无法为前端服务分配端口: {}", e);
                return Err(format!("端口分配失败: {}", e).into());
            }
        }
    }
    
    // 启动健康检查
    manager.start_health_check_loop("frontend".to_string());
    
    Ok(())
}

#[tokio::main]
async fn main() {
    // Initialize logger
    env_logger::init();

    info!("Starting InfloWave");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            // Connection management
            initialize_connections,
            create_connection,
            test_connection,
            get_connections,
            get_connection,
            update_connection,
            delete_connection,
            get_connection_status,
            get_all_connection_statuses,
            health_check_all_connections,
            get_connection_count,
            connect_to_database,
            disconnect_from_database,
            start_connection_monitoring,
            stop_connection_monitoring,
            get_connection_pool_stats,
            sync_connections,
            debug_connection_manager,

            // Database operations
            get_databases,
            create_database,
            drop_database,
            get_retention_policies,
            create_retention_policy,
            drop_retention_policy,
            alter_retention_policy,
            get_measurements,
            drop_measurement,
            get_field_keys,
            get_tag_keys,
            get_tag_values,
            get_table_schema,
            import_data,

            // New database operations
            get_database_info,
            get_database_stats,
            execute_table_query,
            get_table_structure,
            generate_insert_template,
            export_table_data,
            refresh_database_structure,
            create_measurement_template,
            show_measurements,

            // Query operations
            execute_query,
            execute_batch_queries,
            validate_query,
            get_query_suggestions,
            format_query,
            explain_query,

            // System operations
            get_system_info,
            health_check,
            cleanup_resources,
            get_app_config,
            show_open_dialog,
            show_save_dialog,
            toggle_devtools,
            check_for_updates,
            open_file_dialog,
            save_file_dialog,
            read_file,
            write_file,
            write_binary_file,
            get_downloads_dir,

            // Data write operations
            write_data,
            write_data_points,
            validate_data_format,
            preview_data_conversion,

            // Query history operations
            add_query_history,
            get_query_history,
            delete_query_history,
            clear_query_history,
            save_query,
            get_saved_queries,
            update_saved_query,
            delete_saved_query,

            // Settings operations
            get_app_settings,
            update_app_settings,
            reset_app_settings,
            update_general_settings,
            update_editor_settings,
            update_query_settings,
            update_visualization_settings,
            update_security_settings,
            update_controller_settings,
            get_controller_settings,
            export_settings,
            import_settings,
            get_settings_schema,

            // Context menu and SQL generation
            generate_smart_sql,
            get_database_context_menu,
            get_measurement_context_menu,
            get_field_context_menu,

            // Data export operations
            export_query_data,
            get_export_formats,
            estimate_export_size,

            // Dashboard operations
            create_dashboard,
            get_dashboards,
            get_dashboard,
            update_dashboard,
            delete_dashboard,
            add_widget_to_dashboard,
            update_dashboard_widget,
            remove_widget_from_dashboard,
            get_chart_types,
            get_color_schemes,
            duplicate_dashboard,

            // Performance monitoring
            get_performance_metrics,
            record_query_performance,
            get_slow_query_analysis,
            get_storage_analysis_report,
            get_query_optimization_suggestions,
            perform_health_check,
            
            // Performance monitoring - frontend compatibility
            detect_performance_bottlenecks,
            get_system_performance_metrics,
            get_slow_query_log,
            analyze_lock_waits,
            get_connection_pool_stats_perf,
            generate_performance_report,

            // User experience
            get_user_preferences,
            update_user_preferences,
            get_default_shortcuts,
            send_notification,
            get_workspace_layout,
            save_workspace_layout,
            add_recent_file,
            get_app_statistics,
            record_user_action,
            get_help_content,

            // Extensions and integrations
            get_installed_plugins,
            install_plugin,
            toggle_plugin,
            uninstall_plugin,
            create_api_integration,
            get_api_integrations,
            test_api_integration,
            toggle_api_integration,
            create_webhook,
            get_webhooks,
            trigger_webhook,
            toggle_webhook,
            create_automation_rule,
            get_automation_rules,
            execute_automation_rule,
            toggle_automation_rule,
            get_integration_templates,

            // Optimization history
            load_optimization_history,
            save_optimization_history,
            add_optimization_history,
            get_optimization_history,
            delete_optimization_history,
            update_optimization_feedback,
            clear_optimization_history,

            // Port manager
            init_port_manager,
            allocate_port,
            release_port,
            get_current_port,
            get_service_port,
            is_port_available,
            port_health_check,
            start_health_check_loop,
            try_reallocate_port,
            check_port_conflicts,
            get_port_stats,
            find_available_port,
            ensure_frontend_port_available,
            get_frontend_port,

            // Embedded server
            init_embedded_server_cmd,
            start_embedded_server_cmd,
            stop_embedded_server_cmd,
            restart_embedded_server_cmd,
            get_embedded_server_status,
            is_embedded_server_running,

            // Updater commands
            check_for_app_updates,
            skip_version,
            get_updater_settings,
            update_updater_settings,
            read_release_notes_file,
            list_release_notes_files,
        ])
        .setup(|app| {
            info!("Application setup started");

            // 设置响应式窗口大小
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = setup_responsive_window_size(&window) {
                    error!("设置响应式窗口大小失败: {}", e);
                }
            } else {
                warn!("无法获取主窗口，跳过响应式大小设置");
            }

            // 创建并设置原生菜单
            match create_native_menu(app.handle()) {
                Ok(menu) => {
                    info!("菜单创建成功，正在设置为应用菜单...");
                    if let Err(e) = app.set_menu(menu) {
                        error!("设置菜单失败: {}", e);
                    } else {
                        info!("应用菜单设置成功");
                    }
                }
                Err(e) => {
                    error!("创建菜单失败: {}", e);
                }
            }

            // 设置菜单事件处理器
            let app_handle = app.handle().clone();
            info!("正在设置菜单事件处理器...");
            app.on_menu_event(move |_app, event| {
                info!("菜单事件处理器被调用，事件ID: {}", event.id().as_ref());
                handle_menu_event(&app_handle, event);
            });

            // Initialize encryption service
            let encryption_service = create_encryption_service()
                .expect("Failed to create encryption service");

            // Initialize connection service (connections will be loaded via initialize_connections command)
            let connection_service = ConnectionService::new(encryption_service);

            // Store services in app state
            app.manage(connection_service);

            // Initialize storage for query history and saved queries
            app.manage(commands::query_history::QueryHistoryStorage::new(Vec::new()));
            app.manage(commands::query_history::SavedQueryStorage::new(std::collections::HashMap::new()));

            // Initialize settings storage
            app.manage(commands::settings::SettingsStorage::new(commands::settings::AppSettings::default()));

            // Initialize dashboard storage
            app.manage(commands::dashboard::DashboardStorage::new(std::collections::HashMap::new()));

            // Initialize performance monitoring storage
            app.manage(commands::performance::QueryMetricsStorage::new(Vec::new()));

            // Initialize user experience storage
            app.manage(commands::user_experience::UserPreferencesStorage::new(commands::user_experience::UserPreferences::default()));

            // Initialize extensions storage
            app.manage(commands::extensions::PluginStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::APIIntegrationStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::WebhookStorage::new(std::collections::HashMap::new()));
            app.manage(commands::extensions::AutomationStorage::new(std::collections::HashMap::new()));

            // Initialize optimization history storage
            app.manage(std::sync::Mutex::new(Vec::<commands::optimization_history::OptimizationHistoryEntry>::new()));

            // Initialize application configuration
            if let Err(e) = config::init_config(app.handle()) {
                log::error!("Failed to initialize config: {}", e);
            }

            // Initialize port manager and handle port conflicts
            if let Err(e) = services::port_manager::init_port_manager(app.handle().clone()) {
                error!("Failed to initialize port manager: {}", e);
            } else {
                // 检查并处理端口冲突
                let app_handle = app.handle().clone();
                tokio::spawn(async move {
                    if let Err(e) = handle_port_conflicts_at_startup().await {
                        error!("处理启动时端口冲突失败: {}", e);
                    }
                    
                    // 初始化嵌入式服务器（如果需要）
                    if let Err(e) = setup_embedded_server_if_needed(app_handle).await {
                        error!("设置嵌入式服务器失败: {}", e);
                    }
                });
            }

            info!("Application setup completed");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
