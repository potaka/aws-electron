import { randomUUID } from "crypto"
import { WebContentsView, BrowserWindow, ipcMain } from "electron"

interface LauncherWindowCreated {
  type: "launcher-window-created"
  payload: { window: Electron.BrowserWindow }
}

interface OpenPreferences {
  type: "open-preferences"
}

interface OpenKeyRotation {
  type: "open-key-rotation"
}

interface OpenMfaCache {
  type: "open-mfa-cache"
}

interface ReloadWindow {
  type: "reload-window"
  payload: {
    window?: BrowserWindow
    force: boolean
  }
}

interface OpenWindow {
  type: "open-window"
  payload: {
    profileName: string
    window: BrowserWindow
  }
}

interface AddTab {
  type: "add-tab"
  payload: {
    profileName: string
    url: string
  }
}

interface SetTop {
  type: "set-top"
  payload: {
    profileName: string
    top: number
  }
}

export type MainEvent =
  | LauncherWindowCreated
  | OpenPreferences
  | OpenKeyRotation
  | OpenMfaCache
  | ReloadWindow
  | OpenWindow
  | AddTab
  | SetTop

interface WindowDetails {
  // TODO how much of this is fluff?
  // browserViews: Record<string, WebContentsView>
  // currentView?: string
  window: BrowserWindow
  tabs: WebContentsView[]
  top: number
  // boundsChangedHandlerBound?: boolean
  // zoomHandlerBound?: boolean
  // expiryTime: number
  // titleUpdateTimer?: NodeJS.Timeout
}

export interface MainState {
  mainWindow?: Electron.BrowserWindow
  windows: Record<string, WindowDetails>
}

export function reducer(state: MainState, event: MainEvent): MainState {
  switch (event.type) {
    case "launcher-window-created":
      return { ...state, mainWindow: event.payload.window }
    case "open-key-rotation":
      console.log("Intent to open Key Rotation window")
      break
    case "open-preferences":
      console.log("Intent to open Preferences window")
      break
    case "open-mfa-cache":
      ipcMain.emit("openMfaCache")
      break
    case "reload-window": {
      const { window /*force*/ } = event.payload
      if (!window) {
        break
      }
      const { windows } = state
      const currentProfileName = Object.keys(windows).find(
        (profileName) => window === windows[profileName].window,
      )
      if (!currentProfileName) {
        break
      }
      // const { browserViews, currentView } = windows[currentProfileName]
      // if (!currentView) {
      //   break
      // }
      // const { webContents } = browserViews[currentView]
      // if (force) {
      //   webContents.reloadIgnoringCache()
      // } else {
      //   webContents.reload()
      // }
      break
    }
    case "open-window": {
      const { windows } = state
      const { profileName, window } = event.payload
      const windowDetails: WindowDetails = {
        window,
        // browserViews: {},
        tabs: [],
        top: 0,
      }
      return {
        ...state,
        windows: {
          ...windows,
          [profileName]: windowDetails,
        },
      }
    }
    case "add-tab": {
      const { windows } = state
      const { profileName, url } = event.payload
      const windowDetails = windows[profileName]
      const { window, tabs } = windowDetails

      const view = new WebContentsView({
        webPreferences: {
          partition: ["persist", profileName].join(":"),
        },
      })

      view.webContents.loadURL(url)
      window.contentView.children.forEach((view) => view.setVisible(false))
      window.contentView.addChildView(view)
      view.setVisible(true)
      return {
        ...state,
        windows: {
          ...windows,
          [profileName]: {
            ...windowDetails,
            tabs: [...tabs, view],
          },
        },
      }
    }
    case "set-top": {
      const { windows } = state
      const { profileName, top } = event.payload
      const windowDetails = windows[profileName]
      const { window } = windowDetails
      window.contentView.children.forEach((view) => {
        const bounds = { ...window.getContentBounds(), x: 0, y: top }
        bounds.height = bounds.height - top
        view.setBounds(bounds)
      })
      return {
        ...state,
        windows: {
          ...windows,
          [profileName]: {
            ...windowDetails,
            top,
          },
        },
      }
    }
  }
  return state
}

export function initialState(): MainState {
  return {
    windows: {},
  }
}

// framework from here down

// the states we are tracking, held generically
const states: Record<string, unknown> = {}

/**
 * @template S Type of the state
 * @template E Type of the events
 * @param initialState the initial state
 * @param reducer the dispatch function
 * @returns initial state & dispatcher
 */
export function createReducer<E, S>(
  reducer: {
    (state: S, event: E): S
  },
  initialState: S | { (): S },
): [S, { (event: E): void }] {
  // generate a random UUID we will close over
  const uuid = randomUUID()

  if (typeof initialState === "function") {
    states[uuid] = (initialState as { (): S })()
  } else {
    states[uuid] = initialState
  }

  function dispatch(event: E): void {
    // cast our state to a generic record,
    // now we can mess with the properties dynamically
    const state = states[uuid] as unknown as Record<string, unknown>

    // update the state, casting the result as a generic record
    // now we can figure out what properties disappeared
    // TODO is this really necessary? can I just require the dispatcher function set things to delete to unknown
    const newState = reducer(state as S, event) as unknown as Record<
      string,
      unknown
    >
    const newStaKeys = Object.keys(newState)
    Object.keys(state)
      .filter((key) => !newStaKeys.includes(key))
      .forEach((key) => {
        delete state[key]
      })

    // we're modifying the state in place -
    // this isn't running in something like react
    // where a change will cause a rerender.
    Object.entries(newState).forEach(([key, value]) => {
      state[key] = value
    })
  }

  return [states[uuid] as S, dispatch]
}
