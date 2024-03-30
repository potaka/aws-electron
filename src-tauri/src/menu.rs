use tauri::{CustomMenuItem, Menu, Manager, WindowMenuEvent, Submenu, async_runtime};
use crate::commands;

pub fn menu() -> Menu {
    let quit = CustomMenuItem::new(
        "quit".to_string(),
        "Quit"
    );
    let close = CustomMenuItem::new(
        "close".to_string(),
            "Close"
    );
    let open_mfa_cache_menu = CustomMenuItem::new(
        "open_mfa_cache".to_string(),
        "MFA Cache"
    );
    let submenu = Submenu::new(
        "File",
        Menu::new()
            .add_item(open_mfa_cache_menu)
            .add_item(close)
            .add_item(quit)
    );
    Menu::new()
        .add_submenu(submenu)
}

pub fn menu_event(event: WindowMenuEvent) {
    match event.menu_item_id() {
        "quit" => {
          std::process::exit(0);
        }
        "close" => {
          let window = event.window();
          window.close().unwrap();
        }
        "open_mfa_cache" => {
            async_runtime::spawn(commands::open_mfa_cache(event.window().app_handle()));
        }
        _ => {}
      }
}
