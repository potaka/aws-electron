import { Menu, app } from "electron"
import { MainEvent } from "./mainState"

const isMac = process.platform === "darwin"

export default function buildAppMenu(dispatch: {
  (event: MainEvent): void
}): Menu {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: isMac ? app.name : "AWS Console",
      submenu: [
        {
          label: "Preferences",
          click: () => dispatch({ type: "open-preferences" }),
        },
        {
          label: "Rotate Keys",
          click: () => dispatch({ type: "open-key-rotation" }),
        },
        {
          label: "MFA Cache",
          click: () => dispatch({ type: "open-mfa-cache" }),
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
          click: (_, browserWindow): void =>
            dispatch({
              type: "reload-window",
              payload: { window: browserWindow, force: false },
            }),
        },
        {
          label: "Force Reload",
          accelerator: "CmdOrCtrl+Shift+R",
          click: (_, browserWindow): void =>
            dispatch({
              type: "reload-window",
              payload: { window: browserWindow, force: true },
            }),
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
