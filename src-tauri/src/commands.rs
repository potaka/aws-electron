use crate::{config, menu};
use config::parser::Config;

use std::path::PathBuf;

use tauri::{
    async_runtime, menu::MenuEvent, AppHandle, LogicalPosition, LogicalSize, Manager, Webview,
    WebviewUrl, WebviewWindowBuilder, Window,
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
    let task = async_runtime::spawn_blocking(|| -> Result<Config, task::JoinError> {
        let config = config::parser::get_aws_config();
        Ok(config)
    });

    let result = task.await.unwrap();
    result.unwrap()
}

#[tauri::command]
pub async fn launch_profile(app_handle: AppHandle, profile_name: String) {
    std::println!("launch profile {}", profile_name);

    let width = 800.;
    let height = 600.;
    let window: tauri::window::Window = tauri::window::WindowBuilder::new(&app_handle, "console")
        .inner_size(width, height)
        .build()
        .unwrap();

    let window2: tauri::window::Window = tauri::window::WindowBuilder::new(&app_handle, "console2")
        .inner_size(width, height)
        .visible(false)
        .build()
        .unwrap();

    let _webview1 = window.add_child(
        tauri::webview::WebviewBuilder::new("main1", WebviewUrl::External("https://gmail.com/".parse().unwrap()))
            .auto_resize(),
        LogicalPosition::new(0., 0.),
        LogicalSize::new(width, height),
    );
    let webview1: Webview = _webview1.unwrap();

    async_runtime::spawn_blocking(move || -> Result<(), task::JoinError> {
        std::thread::sleep(std::time::Duration::from_secs(5));
        webview1.reparent(&window2).unwrap();
        std::thread::sleep(std::time::Duration::from_secs(5));
        webview1.reparent(&window).unwrap();
        std::thread::sleep(std::time::Duration::from_secs(5));
        webview1.reparent(&window2).unwrap();
        Ok(())
    });
}
