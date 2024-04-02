use futures::{
    channel::mpsc::{channel, Receiver},
    SinkExt, StreamExt,
};
use notify::{
    event::{AccessKind, AccessMode},
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use std::path::PathBuf;
use tauri::{AppHandle, EventTarget, Manager};

fn async_watcher() -> notify::Result<(RecommendedWatcher, Receiver<notify::Result<Event>>)> {
    let (mut tx, rx) = channel(1);

    // Automatically select the best implementation for your platform.
    // You can also access each implementation directly e.g. INotifyWatcher.
    let watcher = RecommendedWatcher::new(
        move |res| {
            futures::executor::block_on(async {
                tx.send(res).await.unwrap();
            })
        },
        Config::default(),
    )?;

    Ok((watcher, rx))
}

pub async fn async_watch(app_handle: AppHandle) -> notify::Result<()> {
    let (mut watcher, mut rx) = async_watcher()?;

    // Add a path to be watched. All files and directories at that path and
    // below will be monitored for changes.
    watcher.watch(
        super::get_aws_config_dir().as_ref(),
        RecursiveMode::NonRecursive,
    )?;

    while let Some(res) = rx.next().await {
        match res {
            Ok(event) => match event.kind {
                EventKind::Access(AccessKind::Close(AccessMode::Write)) => {
                    let changed_file: &PathBuf = &event.paths[0];
                    if changed_file.file_name().unwrap() == "config" {
                        app_handle
                            .emit_to(
                                EventTarget::webview_window("launcher"),
                                "file-change",
                                Some(String::from(
                                    changed_file.file_name().unwrap().to_str().unwrap(),
                                )),
                            )
                            .unwrap();
                    }
                }
                _ => {}
            },
            _ => {}
        }
    }
    Ok(())
}
