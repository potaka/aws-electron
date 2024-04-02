// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod menu;
use tauri::{
    AppHandle,
    Manager,
    Window,
    async_runtime,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_handle = app.app_handle();
            // watch for changes to the config file
            async_runtime::spawn(
                config::watcher::async_watch(
                    app.app_handle().clone()
                )
            );


            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_mfa_cache,
            commands::get_aws_config,
        ])
        .menu(menu::menu())
        .on_menu_event(|event| menu::menu_event(event))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
