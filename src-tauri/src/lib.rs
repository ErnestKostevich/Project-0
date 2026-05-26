use serde::Serialize;

#[derive(Serialize)]
struct ActiveWindowInfo {
    title: String,
    app_name: String,
    process_path: String,
}

/// Returns metadata about the OS-level foreground window (NOT pixels — only
/// title + process name, same info Task Manager shows). Used by Lumi to
/// understand whether the user is on a productive app (IDE, design tool) or
/// distracting one (YouTube, Twitter, etc).
///
/// Returns None if detection fails (e.g. no active window, missing OS
/// permission). On macOS the user must grant Accessibility permission once
/// in System Settings → Privacy & Security.
#[tauri::command]
fn get_active_window() -> Option<ActiveWindowInfo> {
    active_win_pos_rs::get_active_window().ok().map(|w| ActiveWindowInfo {
        title: w.title,
        app_name: w.app_name,
        process_path: w.process_path.to_string_lossy().to_string(),
    })
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_active_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
