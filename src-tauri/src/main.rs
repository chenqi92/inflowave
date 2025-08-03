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
use commands::workspace::*;
use commands::iotdb::*;
use commands::database_detection::*;
use commands::multi_source_performance::*;

// Updater commands
use updater::*;

// Services
use services::ConnectionService;
use utils::encryption::create_encryption_service;

/// 系统兼容性检查
fn check_system_compatibility() -> Result<(), Box<dyn std::error::Error>> {
    info!("Performing system compatibility check...");

    // 检查操作系统版本
    #[cfg(target_os = "windows")]
    {
        // 检查 Windows 版本（需要 Windows 10 或更高版本）
        let version = std::env::var("OS").unwrap_or_else(|_| "Unknown".to_string());
        info!("Operating System: {}", version);

        // 检查架构兼容性
        let arch = std::env::consts::ARCH;
        info!("Architecture: {}", arch);

        // 检查必要的系统库
        if !check_required_dlls() {
            return Err("Required system libraries are missing".into());
        }
    }

    // 检查可用内存
    let available_memory = get_available_memory();
    if available_memory < 100 * 1024 * 1024 { // 100MB
        warn!("Low available memory: {} bytes", available_memory);
    } else {
        info!("Available memory: {} MB", available_memory / 1024 / 1024);
    }

    // 检查磁盘空间
    if let Ok(temp_dir) = std::env::temp_dir().canonicalize() {
        info!("Temp directory: {:?}", temp_dir);
    }

    info!("System compatibility check passed");
    Ok(())
}

/// 检查必要的 DLL 文件
#[cfg(target_os = "windows")]
fn check_required_dlls() -> bool {
    // 简化的 DLL 检查，避免直接使用 winapi
    let required_dlls = [
        "kernel32.dll",
        "user32.dll",
        "ole32.dll",
        "oleaut32.dll",
        "advapi32.dll",
        "shell32.dll",
    ];

    for dll in &required_dlls {
        // 使用 std::process::Command 来检查 DLL 是否可用
        let output = std::process::Command::new("where")
            .arg(dll)
            .output();

        match output {
            Ok(result) if result.status.success() => {
                info!("Successfully verified DLL: {}", dll);
            }
            _ => {
                warn!("Could not verify DLL: {} (this may be normal)", dll);
                // 不返回 false，因为某些 DLL 可能不在 PATH 中但仍然可用
            }
        }
    }
    true
}

#[cfg(not(target_os = "windows"))]
fn check_required_dlls() -> bool {
    true // 非 Windows 系统跳过 DLL 检查
}

/// 获取可用内存
fn get_available_memory() -> u64 {
    use sysinfo::{System, SystemExt};
    let mut system = System::new_all();
    system.refresh_memory();
    system.available_memory()
}

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



    // 风格设置子菜单 - 恢复风格切换功能
    let style_submenu = SubmenuBuilder::new(app, "风格设置")
        .text("theme_default", "默认蓝色")
        .text("theme_shadcn", "极简黑")
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

    // 模式切换子菜单
    let mode_submenu = SubmenuBuilder::new(app, "模式切换")
        .text("mode_system", "跟随系统")
        .text("mode_light", "浅色模式")
        .text("mode_dark", "深色模式")
        .build()?;

    // 语言设置子菜单
    let language_submenu = SubmenuBuilder::new(app, "语言设置")
        .text("lang_chinese", "中文")
        .text("lang_english", "English")
        .build()?;

    // 工具菜单 - 使用平台特定的快捷键
    let tools_menu = SubmenuBuilder::new(app, "工具")
        .text("console", &format!("控制台\t{}+`", cmd_key))
        .text("dev_tools", "开发者工具\tF12")
        .text("query_performance", "查询性能分析")
        .separator()
        .text("extensions", "扩展管理")
        .item(&style_submenu)
        .item(&mode_submenu)
        .item(&language_submenu)
        .separator()
        .text("preferences", &format!("首选项\t{},", cmd_key))
        .build()?;

    // 帮助菜单 - 使用平台特定的快捷键
    let help_menu = SubmenuBuilder::new(app, "帮助")
        .text("user_manual", "用户手册\tF1")
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
    log::info!("📤 发送菜单动作: {} 到窗口: {}", action, window.label());
    match window.emit("menu-action", action) {
        Ok(_) => {
            log::info!("✅ 菜单事件发送成功: {}", action);
        },
        Err(e) => {
            log::error!("❌ 发送菜单事件失败 '{}': {}", action, e);
        }
    }
}

// 处理菜单事件 - 完整的专业化菜单
fn handle_menu_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    // 添加详细的调试日志
    log::info!("🎯 菜单事件触发: {}", event.id().as_ref());
    log::info!("🔍 当前平台: {}", std::env::consts::OS);

    // 列出所有可用窗口
    let windows: Vec<String> = app.webview_windows().keys().cloned().collect();
    log::info!("📋 可用窗口列表: {:?}", windows);

    // 获取主窗口 - 改进的窗口查找逻辑
    let window = match app.get_webview_window("main") {
        Some(window) => {
            log::info!("✅ 找到主窗口: main");
            window
        },
        None => {
            // 如果找不到 main 窗口，尝试获取第一个可用的窗口
            log::warn!("⚠️ 未找到 'main' 窗口，尝试获取第一个可用窗口");
            match app.webview_windows().values().next().cloned() {
                Some(window) => {
                    log::info!("✅ 使用第一个可用窗口: {}", window.label());
                    window
                },
                None => {
                    log::error!("❌ 没有找到任何可用窗口");
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

        // 风格设置菜单 - 恢复风格切换功能
        "theme_default" => emit_menu_action(&window, "theme_default"),
        "theme_shadcn" => emit_menu_action(&window, "theme_shadcn"),
        "theme_zinc" => emit_menu_action(&window, "theme_zinc"),
        "theme_slate" => emit_menu_action(&window, "theme_slate"),
        "theme_indigo" => emit_menu_action(&window, "theme_indigo"),
        "theme_emerald" => emit_menu_action(&window, "theme_emerald"),
        "theme_blue" => emit_menu_action(&window, "theme_blue"),
        "theme_green" => emit_menu_action(&window, "theme_green"),
        "theme_red" => emit_menu_action(&window, "theme_red"),
        "theme_orange" => emit_menu_action(&window, "theme_orange"),
        "theme_purple" => emit_menu_action(&window, "theme_purple"),
        "theme_rose" => emit_menu_action(&window, "theme_rose"),
        "theme_yellow" => emit_menu_action(&window, "theme_yellow"),
        "theme_violet" => emit_menu_action(&window, "theme_violet"),

        // 模式切换菜单
        "mode_system" => emit_menu_action(&window, "mode_system"),
        "mode_light" => emit_menu_action(&window, "mode_light"),
        "mode_dark" => emit_menu_action(&window, "mode_dark"),

        // 工具菜单
        "console" => emit_menu_action(&window, "console"),
        "dev_tools" => emit_menu_action(&window, "dev_tools"),
        "query_performance" => emit_menu_action(&window, "query_performance"),
        "extensions" => emit_menu_action(&window, "navigate:/extensions"),
        "theme_settings" => emit_menu_action(&window, "theme_settings"),
        "preferences" => emit_menu_action(&window, "preferences"),

        // 语言设置菜单
        "lang_chinese" => emit_menu_action(&window, "lang_chinese"),
        "lang_english" => emit_menu_action(&window, "lang_english"),

        // 帮助菜单
        "user_manual" => emit_menu_action(&window, "user_manual"),
        "shortcuts_help" => emit_menu_action(&window, "shortcuts_help"),
        "sample_queries" => emit_menu_action(&window, "sample_queries"),
        "api_docs" => emit_menu_action(&window, "api_docs"),
        "influxdb_docs" => emit_menu_action(&window, "influxdb_docs"),
        "check_updates" => emit_menu_action(&window, "check_updates"),
        "report_issue" => emit_menu_action(&window, "report_issue"),
        "about" => emit_menu_action(&window, "about"),

        _ => {
            log::warn!("🚫 未处理的菜单事件ID: {}", event.id().as_ref());
            log::warn!("📋 所有可用窗口: {:?}", app.webview_windows().keys().collect::<Vec<_>>());
        }
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
            
            // 根据缩放因子调整窗口大小策略
            let (target_width, target_height) = if scale_factor >= 1.5 {
                // 高DPI显示器：使用固定的合理尺寸，避免窗口过大
                let ideal_width: f64 = 1400.0;
                let ideal_height: f64 = 900.0;

                // 确保窗口不会超过屏幕的70%
                let max_width = screen_size.width as f64 * 0.7;
                let max_height = screen_size.height as f64 * 0.7;

                let width = ideal_width.min(max_width).max(1000.0);
                let height = ideal_height.min(max_height).max(700.0);
                
                info!("高DPI模式: 使用固定尺寸 {}x{}", width, height);
                (width, height)
            } else {
                // 标准显示器：使用屏幕比例
                let max_width = 1600.0;
                let max_height = 1000.0;
                let min_width = 1000.0;
                let min_height = 700.0;
                
                // 计算目标尺寸（屏幕的75%，避免过大）
                let width = (screen_size.width as f64 * 0.75).min(max_width).max(min_width);
                let height = (screen_size.height as f64 * 0.75).min(max_height).max(min_height);
                
                info!("标准DPI模式: 使用屏幕比例 {}x{}", width, height);
                (width, height)
            };
            
            info!("计算出的窗口大小: {}x{}", target_width, target_height);
            
            // 获取显示器位置和尺寸
            let monitor_position = monitor.position();
            let screen_width = screen_size.width as f64;
            let screen_height = screen_size.height as f64;
            
            // 计算窗口在显示器中的居中位置
            let center_x = monitor_position.x as f64 + (screen_width - target_width) / 2.0;
            let center_y = monitor_position.y as f64 + (screen_height - target_height) / 2.0;
            
            // 确保位置不会超出显示器边界
            let center_x = center_x.max(monitor_position.x as f64);
            let center_y = center_y.max(monitor_position.y as f64);
            
            info!("显示器位置: ({}, {}), 计算出的中心位置: ({}, {})", 
                  monitor_position.x, monitor_position.y, center_x, center_y);
            
            // 设置窗口大小
            let logical_size = LogicalSize::new(target_width, target_height);
            if let Err(e) = window.set_size(logical_size) {
                warn!("设置窗口大小失败: {}", e);
            } else {
                info!("窗口大小已设置: {}x{}", target_width, target_height);
            }
            
            // 使用系统的center()方法，它能更好地处理不同的DPI和多显示器环境
            if let Err(e) = window.center() {
                warn!("系统居中方法失败: {}，尝试手动设置位置", e);
                // 如果系统居中失败，则使用手动计算的位置作为备用
                let center_position = LogicalPosition::new(center_x, center_y);
                if let Err(e) = window.set_position(center_position) {
                    warn!("手动设置窗口位置也失败: {}", e);
                } else {
                    info!("窗口已手动定位到计算位置: ({}, {})", center_x, center_y);
                }
            } else {
                info!("窗口已使用系统方法居中显示");
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
            
        }
    }
    
    Ok(())
}


/// 增强的崩溃日志记录和诊断
fn setup_crash_handler(_app_handle: tauri::AppHandle) {
    std::panic::set_hook(Box::new(|panic_info| {
        let panic_message = panic_info.to_string();
        let location = panic_info.location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown location".to_string());

        let full_message = format!(
            "InfloWave Application Crash Report\n\
            Version: {}\n\
            Platform: {}\n\
            Architecture: {}\n\
            Location: {}\n\
            Error: {}\n\
            \n\
            Please report this issue at: https://github.com/chenqi92/inflowave/issues",
            env!("CARGO_PKG_VERSION"),
            std::env::consts::OS,
            std::env::consts::ARCH,
            location,
            panic_message
        );

        error!("Application panic: {}", full_message);
        eprintln!("{}", full_message);

        // 尝试写入崩溃日志文件
        if let Ok(mut home_dir) = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
            home_dir.push_str("/.inflowave_crash.log");
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(&home_dir) {
                use std::io::Write;
                let _ = writeln!(file, "{}\n{}\n{}",
                    chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
                    full_message,
                    "=" .repeat(80)
                );
            }
        }
    }));
}

/// 处理启动时的端口冲突
async fn handle_port_conflicts_at_startup() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use services::port_manager::get_port_manager;
    
    info!("检查启动时端口状态...");
    
    let manager = get_port_manager();
    let manager = match manager.read() {
        Ok(m) => m,
        Err(e) => {
            warn!("Failed to acquire port manager lock: {}", e);
            return Ok(());
        }
    };
    
    // 在开发模式下，Vite 开发服务器已经由 Tauri 的 BeforeDevCommand 启动
    // 我们只需要检查并记录端口状态，不需要尝试分配端口
    #[cfg(debug_assertions)]
    {
        let preferred_port = 1422;
        let is_preferred_available = manager.is_port_available(preferred_port);
        
        if is_preferred_available {
            info!("开发模式：默认端口 {} 当前可用", preferred_port);
        } else {
            info!("开发模式：默认端口 {} 被前端开发服务器占用（这是正常的）", preferred_port);
        }
        
        // 在开发模式下，不需要通过端口管理器分配端口
        info!("开发模式：跳过端口分配，前端服务器由 Tauri 开发工作流程管理");
    }
    
    // 在生产模式下，才需要端口管理
    #[cfg(not(debug_assertions))]
    {
        let preferred_port = 1422;
        let is_preferred_available = manager.is_port_available(preferred_port);
        
        if is_preferred_available {
            info!("生产模式：默认端口 {} 可用", preferred_port);
        } else {
            warn!("生产模式：默认端口 {} 被占用，需要查找替代端口", preferred_port);
        }
        
        // 分配端口给前端服务
        match manager.allocate_port("frontend") {
            Ok(port) => {
                if port == preferred_port {
                    info!("前端服务成功使用默认端口: {}", port);
                } else {
                    warn!("端口冲突已解决，前端将使用端口: {} 而不是默认的 {}", port, preferred_port);
                }
            }
            Err(e) => {
                error!("无法为前端服务分配端口: {}", e);
                return Err(format!("端口分配失败: {}", e).into());
            }
        }
        
        // 启动健康检查
        manager.start_health_check_loop("frontend".to_string());
    }
    
    Ok(())
}

#[tokio::main]
async fn main() {
    // Initialize logger with better error handling
    if let Err(e) = env_logger::try_init() {
        eprintln!("Failed to initialize logger: {}", e);
    }

    info!("Starting InfloWave v{}", env!("CARGO_PKG_VERSION"));

    // Early system compatibility check (disabled for now to avoid crashes)
    // if let Err(e) = check_system_compatibility() {
    //     eprintln!("System compatibility check failed: {}", e);
    //     std::process::exit(1);
    // }

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
            establish_connection,
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
            validate_connection_exists,
            get_connection_safe,
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

            // IoTDB specific operations
            get_iotdb_storage_groups,
            get_iotdb_devices,
            get_iotdb_timeseries,
            execute_iotdb_query,
            create_iotdb_storage_group,
            delete_iotdb_storage_group,
            create_iotdb_timeseries,
            delete_iotdb_timeseries,
            insert_iotdb_data,
            get_iotdb_server_info,
            get_iotdb_cluster_info,
            get_iotdb_users,
            get_iotdb_functions,
            get_iotdb_triggers,

            // Database version detection
            commands::database_detection::detect_database_version,
            quick_detect_database_type,
            validate_detected_connection,
            get_supported_database_types,
            generate_connection_config_suggestions,

            // Tree node operations
            commands::database::get_tree_nodes,
            commands::database::get_tree_children,



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
            open_file_dialog,
            save_file_dialog,
            read_file,
            write_file,
            write_binary_file,
            create_dir,
            get_downloads_dir,
            file_exists,
            delete_file,
            get_file_info,
            show_message_dialog,
            close_app,

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

            // Workspace operations
            save_tab_to_workspace,
            remove_tab_from_workspace,
            get_workspace_tabs,
            set_active_workspace_tab,
            get_active_workspace_tab,
            clear_workspace,
            save_tabs_to_workspace,

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
            update_monitoring_settings,
            get_monitoring_settings,
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
            get_performance_metrics_result,
            start_system_monitoring,
            stop_system_monitoring,
            get_system_monitoring_status,
            record_query_performance,
            get_slow_query_analysis,
            get_storage_analysis_report,
            get_query_optimization_suggestions,
            perform_health_check,
            
            // Performance monitoring - frontend compatibility
            detect_performance_bottlenecks,
            detect_performance_bottlenecks_with_mode,
            check_performance_monitoring_health,
            get_system_performance_metrics,
            get_slow_query_log,
            analyze_lock_waits,
            get_connection_pool_stats_perf,
            generate_performance_report,
            generate_local_performance_report,

            // Multi-source performance monitoring
            get_opened_datasources_performance,
            get_datasource_performance_details,
            get_performance_monitoring_config,
            update_performance_monitoring_config,

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
            is_builtin_update_supported,
            get_platform_info,
            download_update,
            install_update,
            download_and_install_update,
        ])
        .setup(|app| {
            info!("Application setup started");
            
            // 设置崩溃处理程序
            setup_crash_handler(app.handle().clone());

            // 设置响应式窗口大小和标题
            if let Some(window) = app.get_webview_window("main") {
                // 显式设置窗口标题
                if let Err(e) = window.set_title("InfloWave") {
                    error!("设置窗口标题失败: {}", e);
                } else {
                    info!("窗口标题已设置为: InfloWave");
                }

                // 根据系统主题设置初始背景色
                match window.theme() {
                    Ok(tauri::Theme::Dark) => {
                        info!("检测到系统深色主题，使用深色背景");
                        // 深色主题背景色已在CSS中处理，这里不需要额外设置
                    }
                    Ok(tauri::Theme::Light) => {
                        info!("检测到系统浅色主题，使用浅色背景");
                        // 浅色主题背景色已在配置中设置
                    }
                    Ok(_) => {
                        info!("检测到未知系统主题，使用默认浅色背景");
                    }
                    Err(e) => {
                        warn!("获取系统主题失败: {}, 使用默认浅色背景", e);
                    }
                }
                
                if let Err(e) = setup_responsive_window_size(&window) {
                    error!("设置响应式窗口大小失败: {}", e);
                }

                // 窗口已通过配置设置为可见，无需手动显示
                info!("窗口已通过配置设置为可见状态");

                #[cfg(debug_assertions)]
                {
                    info!("开发环境：保留右键上下文菜单用于调试");
                }

                #[cfg(not(debug_assertions))]
                {
                    info!("生产环境：上下文菜单禁用将由前端处理");
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
            info!("🎛️ 正在设置菜单事件处理器...");
            app.on_menu_event(move |_app, event| {
                info!("🎯 菜单事件处理器被调用，事件ID: {}", event.id().as_ref());
                handle_menu_event(&app_handle, event);
            });
            info!("✅ 菜单事件处理器设置完成");

            // Initialize encryption service
            let encryption_service = create_encryption_service()
                .expect("Failed to create encryption service");

            // Initialize connection service (connections will be loaded via initialize_connections command)
            let connection_service = ConnectionService::new(encryption_service);

            // Store services in app state
            app.manage(connection_service);

            // Initialize database version detector
            app.manage(commands::database_detection::init_detector());

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

            // Initialize workspace storage
            app.manage(commands::workspace::WorkspaceStorage::new(commands::workspace::WorkspaceData::default()));

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
        .map_err(|e| {
            error!("Failed to run InfloWave application: {}", e);
            eprintln!("InfloWave startup failed: {}", e);
            std::process::exit(1);
        })
        .unwrap();
}
