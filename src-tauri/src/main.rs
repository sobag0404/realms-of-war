#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Clone, Debug, Deserialize, Serialize)]
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    backup_data: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    backup_checksum: Option<String>,
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

fn backup_path(path: &Path) -> PathBuf {
    path.with_extension("json.bak")
}

fn temp_path(path: &Path) -> PathBuf {
    path.with_extension("json.tmp")
}

fn read_backup_record(path: &Path) -> Option<DesktopSaveRecord> {
    let raw = fs::read_to_string(backup_path(path)).ok()?;
    serde_json::from_str::<DesktopSaveRecord>(&raw).ok()
}

fn attach_backup(record: &mut DesktopSaveRecord, path: &Path) {
    if let Some(backup) = read_backup_record(path) {
        record.backup_data = Some(backup.data);
        record.backup_checksum = Some(backup.checksum);
    }
}

fn unreadable_record(path: &Path) -> Option<DesktopSaveRecord> {
    let id = path.file_stem()?.to_str()?.to_string();
    let mut record = DesktopSaveRecord {
        storage_version: 1,
        id,
        name: "Unreadable save".to_string(),
        turn: 0,
        players: "Unknown".to_string(),
        created_at: "1970-01-01T00:00:00.000Z".to_string(),
        updated_at: "1970-01-01T00:00:00.000Z".to_string(),
        data: String::new(),
        checksum: String::new(),
        backup_data: None,
        backup_checksum: None,
    };

    if let Some(backup) = read_backup_record(path) {
        record.name = backup.name;
        record.turn = backup.turn;
        record.players = backup.players;
        record.created_at = backup.created_at;
        record.updated_at = backup.updated_at;
        record.backup_data = Some(backup.data);
        record.backup_checksum = Some(backup.checksum);
    }

    Some(record)
}

fn read_record(path: &Path) -> Option<DesktopSaveRecord> {
    let raw = match fs::read_to_string(path) {
        Ok(raw) => raw,
        Err(_) => return unreadable_record(path),
    };

    match serde_json::from_str::<DesktopSaveRecord>(&raw) {
        Ok(mut record) => {
            attach_backup(&mut record, path);
            Some(record)
        }
        Err(_) => unreadable_record(path),
    }
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
    let temp_path = temp_path(&path);
    let backup_path = backup_path(&path);
    let data = serde_json::to_string_pretty(&record)
        .map_err(|error| format!("failed to serialize save file: {error}"))?;
    let had_existing = path.exists();

    if had_existing {
        fs::copy(&path, &backup_path)
            .map_err(|error| format!("failed to create save backup: {error}"))?;
    }

    fs::write(&temp_path, data)
        .map_err(|error| format!("failed to write temporary save file: {error}"))?;
    if had_existing {
        fs::remove_file(&path)
            .map_err(|error| format!("failed to prepare save file commit: {error}"))?;
    }
    if let Err(error) = fs::rename(&temp_path, &path) {
        if had_existing {
            let _ = fs::copy(&backup_path, &path);
        }
        let _ = fs::remove_file(&temp_path);
        return Err(format!("failed to commit save file: {error}"));
    }

    if !had_existing {
        let _ = fs::copy(&path, &backup_path);
    }

    Ok(())
}

#[tauri::command]
fn desktop_save_delete(app: AppHandle, id: String) -> Result<(), String> {
    let path = save_path(&app, &id)?;
    remove_save_file(&temp_path(&path))?;
    remove_save_file(&backup_path(&path))?;
    remove_save_file(&path)
}

fn remove_save_file(path: &Path) -> Result<(), String> {
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

