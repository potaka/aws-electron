use crate::config;
use config::parser::Profile;

use std::{
    collections::HashMap,
    path::PathBuf
};

use tauri::{
    AppHandle,
    WindowBuilder,
    WindowUrl,
    async_runtime,
};

use tokio::task;


// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub async fn open_mfa_cache(app_handle: AppHandle) {
    // TODO is some check for existing window necessary?
    let _mfa_cache_window = WindowBuilder::new(
        &app_handle,
        "mfaCache",
        WindowUrl::App("mfaCache/index.html".into()).into())
    .data_directory(PathBuf::from("mfaCache"))
    .title("AWS Console - MFA Cache")
    .build();
}

#[tauri::command]
pub async fn load_config() -> HashMap<String, Profile> {
    let task = async_runtime::spawn_blocking(
        || -> Result<HashMap<String, Profile>, task::JoinError> {
            let config = config::parser::load_config();
            Ok(config)
    });

    let result = task.await.unwrap();
    result.unwrap()
}
