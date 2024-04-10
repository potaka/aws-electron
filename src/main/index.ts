import { app, shell, BrowserWindow, ipcMain, Menu } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import { getConfig, watchConfigFile } from "./awsConfig"
import { createReducer, initialState, reducer } from "./mainState"
import { Config } from "models"
import buildAppMenu from "./menu"

const [state, dispatch] = createReducer(reducer, initialState)

function createLauncherWindow(): void {
  // Create the browser window.
  const launcherWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
    },
  })
  dispatch({
    type: "launcher-window-created",
    payload: { window: launcherWindow },
  })

  launcherWindow.on("ready-to-show", () => {
    launcherWindow.show()
    // mainWindow.webContents.openDevTools();
  })

  launcherWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    launcherWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/launcher`)
  } else {
    launcherWindow.loadFile(join(__dirname, "../renderer/launcher.html"))
  }
}

function createMfaCacheWindow(): void {
  // Create the browser window.
  const mfaCacheWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
    },
  })
  // dispatch({
  //   type: "mfa-cache-window-created",
  //   payload: { window: mfaCacheWindow },
  // })

  mfaCacheWindow.on("ready-to-show", () => {
    mfaCacheWindow.show()
    // mainWindow.webContents.openDevTools();
  })

  mfaCacheWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log(process.env["ELECTRON_RENDERER_URL"])
    mfaCacheWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/mfaCache`)
  } else {
    mfaCacheWindow.loadFile(join(__dirname, "../renderer/mfaCache.html"))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle("getConfig", () => getConfig())
  ipcMain.on("openMfaCache", () => {
    createMfaCacheWindow()
  })

  Menu.setApplicationMenu(buildAppMenu(dispatch))

  createLauncherWindow()

  watchConfigFile((newConfig: Config) =>
    state.mainWindow!.webContents.send("new-config", newConfig),
  )

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createLauncherWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
