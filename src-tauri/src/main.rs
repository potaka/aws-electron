// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod menu;
}

fn main() {
    tauri::Builder::default()
        .menu(menu::menu())
        .on_menu_event(|event| menu::menu_event(event))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
