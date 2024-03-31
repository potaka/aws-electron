use crate::config;
use config::parser::Config;

use std::path::PathBuf;

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
pub async fn get_aws_config() -> Config {
    let task = async_runtime::spawn_blocking(
        || -> Result<Config, task::JoinError> {
            let config = config::parser::get_aws_config();
            Ok(config)
    });

    let result = task.await.unwrap();
    result.unwrap()
}
