#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopSaveRecord {
    storage_version: u8,
    id: String,
    name: String,
    turn: i32,
    players: String,
    created_at: String,
    updated_at: String,
    data: String,
    checksum: String,
}

fn saves_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data directory: {error}"))?
        .join("saves");
    fs::create_dir_all(&dir)
        .map_err(|error| format!("failed to create save directory: {error}"))?;
    Ok(dir)
}

fn save_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    if id.is_empty()
        || id.len() > 160
        || !id
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '-' || ch == '_')
    {
        return Err("invalid save id".to_string());
    }

    Ok(saves_dir(app)?.join(format!("{id}.json")))
}

fn read_record(path: &Path) -> Option<DesktopSaveRecord> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<DesktopSaveRecord>(&raw).ok()
}

#[tauri::command]
fn desktop_save_list(app: AppHandle) -> Result<Vec<DesktopSaveRecord>, String> {
    let dir = saves_dir(&app)?;
    let entries = fs::read_dir(dir)
        .map_err(|error| format!("failed to read save directory: {error}"))?;

    let mut records = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        if let Some(record) = read_record(&path) {
            records.push(record);
        }
    }

    records.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(records)
}

#[tauri::command]
fn desktop_save_load(app: AppHandle, id: String) -> Result<Option<DesktopSaveRecord>, String> {
    let path = save_path(&app, &id)?;
    if !path.exists() {
        return Ok(None);
    }

    read_record(&path)
        .ok_or_else(|| "failed to read save file or save file is malformed".to_string())
        .map(Some)
}

#[tauri::command]
fn desktop_save_write(app: AppHandle, record: DesktopSaveRecord) -> Result<(), String> {
    let path = save_path(&app, &record.id)?;
    let temp_path = path.with_extension("json.tmp");
    let data = serde_json::to_string_pretty(&record)
        .map_err(|error| format!("failed to serialize save file: {error}"))?;

    fs::write(&temp_path, data)
        .map_err(|error| format!("failed to write temporary save file: {error}"))?;
    fs::rename(&temp_path, &path)
        .map_err(|error| format!("failed to commit save file: {error}"))?;

    Ok(())
}

#[tauri::command]
fn desktop_save_delete(app: AppHandle, id: String) -> Result<(), String> {
    let path = save_path(&app, &id)?;
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("failed to delete save file: {error}")),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            desktop_save_list,
            desktop_save_load,
            desktop_save_write,
            desktop_save_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Realms of War");
}

