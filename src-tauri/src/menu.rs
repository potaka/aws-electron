use crate::commands;
use tauri::{
    async_runtime,
    menu::{Menu, MenuBuilder, MenuEvent, MenuItem, Submenu, SubmenuBuilder},
    AppHandle, EventLoopMessage, Manager, Result, WebviewWindow, Window,
};
use tauri_runtime_wry::Wry;

pub fn menu(handle: &AppHandle, window_label: String) -> Result<Menu<Wry<EventLoopMessage>>> {
    let menu = Menu::new(handle)?;
    let submenu = SubmenuBuilder::new(handle, "File")
        .text("open_mfa_cache", "MFA Cache")
        .separator()
        .text(format!("{}-{}", window_label, "close"), "Close")
        .text("quit", "Quit")
        .build()?;
    menu.append(&submenu)?;
    Ok(menu)
}

pub fn menu_event(event: MenuEvent, window: &Window) {
    let event_id = event.id.0.as_str();
    let app = window.app_handle();
    match event_id {
        "quit" => {
            std::process::exit(0);
        }
        "open_mfa_cache" => {
            async_runtime::spawn(commands::open_mfa_cache(app.clone()));
        }
        _ => {
            let mut components = event_id.split('-');
            let window_name: Option<&str> = components.next();
            let window_label: &str = window.label();
            let command_name = components.next();
            match command_name {
                Some("close") => {
                    if window_label.eq(window_name.unwrap()) {
                        window.close().unwrap();
                    }
                }
                _ => {}
            }
        }
    }
}
