use crate::{config, menu};
use config::parser::Config;

use std::path::PathBuf;

use tauri::{
    async_runtime, menu::MenuEvent, AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Window,
};

use tokio::task;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub async fn open_mfa_cache(app_handle: AppHandle) {
    // TODO is some check for existing window necessary?
    let menu = menu::menu(&app_handle, String::from("mfaCache")).unwrap();

    WebviewWindowBuilder::new(
        &app_handle,
        "mfaCache",
        WebviewUrl::App("mfaCache/index.html".into()).into(),
    )
    .data_directory(PathBuf::from("mfaCache"))
    .menu(menu)
    .on_menu_event(move |win: &Window, event: MenuEvent| {
        menu::menu_event(event, win);
    })
    .title("AWS Console - MFA Cache")
    .build()
    .unwrap();
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
