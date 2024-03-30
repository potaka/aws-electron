// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod menu;
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::open_mfa_cache,
            commands::load_config,
        ])
        .menu(menu::menu())
        .on_menu_event(|event| menu::menu_event(event))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
