use base64::Engine as _;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Deserialize)]
pub struct FileIn {
    /// Path relative to the destination root (uses forward slashes).
    pub path: String,
    /// File payload.
    pub data: String,
    /// `true` when `data` is base64 (binary asset), `false` for UTF-8 text.
    #[serde(default)]
    pub base64: bool,
}

#[derive(Debug, Serialize)]
pub struct OkCount {
    pub count: usize,
}

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

fn decode_payload(file: &FileIn) -> Result<Vec<u8>, String> {
    if file.base64 {
        let cleaned: String = file
            .data
            .chars()
            .filter(|c| !c.is_whitespace() && *c != '\n' && *c != '\r')
            .collect();
        base64::engine::general_purpose::STANDARD
            .decode(cleaned.as_bytes())
            .map_err(|e| format!("base64 decode failed for {}: {}", file.path, e))
    } else {
        Ok(file.data.as_bytes().to_vec())
    }
}

/// Reject relative-path escapes so an exported file can never land outside the
/// destination folder.
fn safe_join(root: &Path, rel: &str) -> Result<PathBuf, String> {
    let mut out = root.to_path_buf();
    for part in rel.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err(format!("illegal path component in {rel}"));
        }
        if part.contains(':') || part.contains('\\') {
            return Err(format!("illegal path component in {rel}"));
        }
        out.push(part);
    }
    Ok(out)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command]
fn read_file_base64(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(err)?;
    }
    std::fs::write(p, contents).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("{path}: {e}"))
}

/// Writes a batch of files under `root`, creating parent directories.
#[tauri::command]
fn write_files(root: String, files: Vec<FileIn>) -> Result<OkCount, String> {
    let root_path = PathBuf::from(&root);
    std::fs::create_dir_all(&root_path).map_err(err)?;
    let mut count = 0usize;
    for file in &files {
        let target = safe_join(&root_path, &file.path)?;
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(err)?;
        }
        let bytes = decode_payload(file)?;
        std::fs::write(&target, bytes).map_err(|e| format!("{}: {e}", target.display()))?;
        count += 1;
    }
    Ok(OkCount { count })
}

/// Recursively lists every file below `root` (relative, forward slashes).
#[tauri::command]
fn list_files(root: String) -> Result<Vec<String>, String> {
    fn walk(base: &Path, dir: &Path, out: &mut Vec<String>) -> Result<(), String> {
        let entries = std::fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
        for entry in entries {
            let entry = entry.map_err(err)?;
            let path = entry.path();
            if path.is_dir() {
                walk(base, &path, out)?;
            } else if let Ok(rel) = path.strip_prefix(base) {
                let rel = rel
                    .components()
                    .map(|c| c.as_os_str().to_string_lossy().to_string())
                    .collect::<Vec<_>>()
                    .join("/");
                out.push(rel);
            }
        }
        Ok(())
    }
    let base = PathBuf::from(&root);
    if !base.exists() {
        return Err(format!("{root} does not exist"));
    }
    let mut out = Vec::new();
    walk(&base, &base, &mut out)?;
    out.sort();
    Ok(out)
}

/// Best-effort "open this folder in the OS file manager".
#[tauri::command]
fn reveal_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let target = if p.is_dir() {
        p.to_path_buf()
    } else {
        p.parent().map(|x| x.to_path_buf()).unwrap_or_else(|| p.to_path_buf())
    };
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(err)?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&target)
            .spawn()
            .map_err(err)?;
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&target)
            .spawn()
            .map_err(err)?;
    }
    Ok(())
}

/// WebView2 refuses to start when it cannot create its user-data folder, which
/// happens on locked-down machines (`%LOCALAPPDATA%` read-only, AppContainer,
/// redirected profiles...). Pick the first writable candidate and point WebView2
/// at it explicitly.
const APP_ID: &str = "com.colin.patchoulihelper";

fn probe_writable(dir: &Path) -> bool {
    if std::fs::create_dir_all(dir).is_err() {
        return false;
    }
    let probe = dir.join(".write-probe");
    let ok = std::fs::write(&probe, b"ok").is_ok();
    let _ = std::fs::remove_file(&probe);
    ok
}

fn choose_data_dir() -> PathBuf {
    let mut candidates: Vec<PathBuf> = Vec::new();
    for var in ["LOCALAPPDATA", "APPDATA", "TEMP", "TMP"] {
        if let Ok(base) = std::env::var(var) {
            candidates.push(Path::new(&base).join(APP_ID));
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.join("userdata"));
        }
    }
    candidates.push(std::env::temp_dir().join(APP_ID));
    if let Some(found) = candidates.iter().find(|dir| probe_writable(dir)) {
        return found.clone();
    }
    std::env::temp_dir().join(APP_ID)
}

/// Shows a readable dialog + writes a log file instead of dying silently.
fn install_panic_dialog(data_dir: &Path) {
    let log_path = data_dir.join("crash.log");
    std::panic::set_hook(Box::new(move |info| {
        let text = format!(
            "Patchouli Helper 启动失败。\n\n{info}\n\n详细信息已写入：\n{}",
            log_path.display()
        );
        let _ = std::fs::write(&log_path, format!("{text}\n"));
        eprintln!("{text}");
        let _ = rfd::MessageDialog::new()
            .set_level(rfd::MessageLevel::Error)
            .set_title("Patchouli Helper")
            .set_description(&text)
            .set_buttons(rfd::MessageButtons::Ok)
            .show();
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = choose_data_dir();
    if std::env::var_os("WEBVIEW2_USER_DATA_FOLDER").is_none() {
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data_dir.join("EBWebView"));
    }
    install_panic_dialog(&data_dir);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text_file,
            read_file_base64,
            write_text_file,
            write_files,
            list_files,
            path_exists,
            ensure_dir,
            reveal_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Patchouli Helper");
}
