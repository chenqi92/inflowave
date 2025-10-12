use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Light,
    Dark,
}

/// 设置窗口背景色以匹配主题
#[tauri::command]
pub async fn set_window_background<R: Runtime>(
    app: AppHandle<R>,
    theme: ThemeMode,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Failed to get main window")?;

    // 根据主题设置背景色
    let background_color = match theme {
        ThemeMode::Light => "#ffffff", // 浅色模式背景
        ThemeMode::Dark => "#0f172a",  // 深色模式背景（与 index.html 中的深色背景一致）
    };

    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSColor, NSWindow};
        use cocoa::base::{id, nil};

        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;

        unsafe {
            // 解析颜色
            let (r, g, b) = parse_hex_color(background_color)?;

            // 创建 NSColor
            let color = NSColor::colorWithSRGBRed_green_blue_alpha_(
                nil,
                r as f64 / 255.0,
                g as f64 / 255.0,
                b as f64 / 255.0,
                1.0,
            );

            // 设置窗口背景色
            ns_window.setBackgroundColor_(color);
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        // 在其他平台上，我们可以尝试使用 Tauri 的 API
        // 但这可能不会影响标题栏
        let _ = background_color; // 避免未使用变量警告
    }

    Ok(())
}

/// 解析十六进制颜色代码
fn parse_hex_color(hex: &str) -> Result<(u8, u8, u8), String> {
    let hex = hex.trim_start_matches('#');

    if hex.len() != 6 {
        return Err(format!("Invalid hex color: {}", hex));
    }

    let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
    let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
    let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;

    Ok((r, g, b))
}

