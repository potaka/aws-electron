import { Menu, app, ipcMain } from "electron"

const isMac = process.platform === "darwin"

export default function buildAppMenu(): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: isMac ? app.name : "AWS Console",
      submenu: [
        {
          label: "Profile List",
          click: () => ipcMain.emit("open-profile-list"),
        },
        {
          label: "Preferences",
          click: () => ipcMain.emit("open-preferences"),
        },
        {
          label: "Rotate Keys",
          click: () => ipcMain.emit("open-key-rotation"),
        },
        {
          label: "MFA Cache",
          click: () => ipcMain.emit("openMfaCache"),
        },
        ...((isMac
          ? [
              { type: "separator" },
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideothers" },
              { role: "unhide" },
              { type: "separator" },
            ]
          : []) as Electron.MenuItemConstructorOptions[]),
        {
          role: "close",
          accelerator: "Alt+F4",
        },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...((isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
              { type: "separator" },
              {
                label: "Speech",
                submenu: [{ role: "startspeaking" }, { role: "stopspeaking" }],
              },
            ]
          : [
              { role: "delete" },
              { type: "separator" },
              { role: "selectAll" },
            ]) as Electron.MenuItemConstructorOptions[]),
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: (_, browserWindow): void => {
            ipcMain.emit("reloadWindow", undefined, browserWindow, false)
          },
        },
        {
          label: "Force Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: (_, browserWindow): void => {
            ipcMain.emit("reloadWindow", undefined, browserWindow, true)
          },
        },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        ...((isMac
          ? [
              { role: "zoom" },
              { type: "separator" },
              { role: "front" },
              { type: "separator" },
              { role: "window" },
            ]
          : [{ role: "close" }]) as Electron.MenuItemConstructorOptions[]),
      ],
    },
  ]
  return Menu.buildFromTemplate(template)
}
