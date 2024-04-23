import { app, shell, BrowserWindow, ipcMain, Menu } from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import { getConfig, watchConfigFile } from "./awsConfig"
import { createReducer, initialState, reducer } from "./mainState"
import { Config } from "models"
import buildAppMenu from "./menu"
import { getConsoleUrl } from "./getConsoleURL"

const [state, dispatch] = createReducer(reducer, initialState)

function loadWindowContent(window: BrowserWindow, contentName: string): void {
  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/${contentName}`)
  } else {
    window.loadFile(join(__dirname, "../renderer/${contentName}.html"))
  }
}

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

  launcherWindow.on("ready-to-show", () => launcherWindow.show())

  launcherWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  loadWindowContent(launcherWindow, "launcher")
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

  mfaCacheWindow.on("ready-to-show", () => mfaCacheWindow.show())

  mfaCacheWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  loadWindowContent(mfaCacheWindow, "mfaCache")
}

async function launchConsole(
  profileName: string,
  mfaCode: string,
): Promise<void> {
  const url = await getConsoleUrl(await getConfig(), mfaCode, profileName)

  // Create the browser window.
  const { windows } = state
  const windowDetails = windows[profileName]

  const tabsWindow =
    windowDetails?.window ||
    new BrowserWindow({
      width: 900,
      height: 670,
      show: false,
      ...(process.platform === "linux" ? { icon } : {}),
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        sandbox: true,
        partition: ["persist", profileName].join(":"),
      },
    })

  if (!windowDetails) {
    dispatch({
      type: "open-window",
      payload: { profileName, window: tabsWindow },
    })

    tabsWindow.on("ready-to-show", () => {
      tabsWindow.show()
      tabsWindow.webContents.openDevTools()
      tabsWindow.webContents.send("set-profile-name", profileName)
      tabsWindow.webContents.send("open-tab", url)
    })

    })

    loadWindowContent(tabsWindow, "tabs")
  }
  openTab(profileName, url)
  tabsWindow.webContents.send("open-tab", url)
function reloadWindow(window: BrowserWindow, force: boolean): void {
  if (!window) {
    return
  }
  const { windows } = state
  const foundWindow = Object.entries(windows).find(
    ([profileName]) => window === windows[profileName].window,
  )

  if (!foundWindow) {
    return
  }

  const [_profileName, { tabs, activeTab: currentTab }] = foundWindow
  if (currentTab === undefined) {
    return
  }

  const { webContents } = tabs[currentTab]

  if (force) {
    webContents.reloadIgnoringCache()
  } else {
    webContents.reload()
  }
}

function openTab(profileName: string, url: string): void {
  const { top, window, tabs } = state.windows[profileName]
  const { contentView } = window

  const view = new WebContentsView({
    webPreferences: {
      partition: ["persist", profileName].join(":"),
    },
  })

  const bounds = { ...window.getContentBounds(), x: 0, y: top }
  bounds.height = bounds.height - top
  view.setBounds(bounds)

  const { webContents: viewWebContents } = view
  viewWebContents.loadURL(url)
  contentView.children.forEach((view) => view.setVisible(false))
  contentView.addChildView(view)

  viewWebContents.setWindowOpenHandler(({ url }) => {
    openTab(profileName, url)
    return { action: "deny" }
  })
  dispatch({ type: "add-tab", payload: { profileName, tab: view } })

  view.setVisible(true)
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
  ipcMain.on("openMfaCache", () => createMfaCacheWindow())

  ipcMain.on("launchConsole", (_, profileName: string, mfaCode: string) =>
    launchConsole(profileName, mfaCode),
  )

  ipcMain.on("reloadWindow", (_, window: BrowserWindow, force: boolean): void =>
    reloadWindow(window, force),
  )

  )
  ipcMain.on("setTop", (_, profileName: string, top: number): void => {
    dispatch({ type: "set-top", payload: { profileName, top } })
  })

  Menu.setApplicationMenu(buildAppMenu())

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
