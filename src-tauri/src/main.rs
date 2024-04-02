// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod menu;
use tauri::menu::MenuEvent;
use tauri::{
    async_runtime, window::Window, App, AppHandle, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app: &mut App| {
            // watch for changes to the config file
            async_runtime::spawn(config::watcher::async_watch(app.app_handle().clone()));

            let menu = menu::menu(app.handle(), String::from("launcher")).unwrap();
            let window: WebviewWindow = WebviewWindowBuilder::new(
                app,
                "launcher",
                WebviewUrl::App("launcher/index.html".into()).into(),
            )
            .menu(menu)
            .title("AWS Console - Profile List")
            .on_menu_event(move |win: &Window, event: MenuEvent| {
                menu::menu_event(event, win);
            })
            .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_mfa_cache,
            commands::get_aws_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
