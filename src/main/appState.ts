import { randomUUID } from "crypto"
import { BrowserView, BrowserWindow } from "electron"

type MainWindowCreated = {
  type: "main-window-created"
  payload: { window: Electron.BrowserWindow }
}

type OpenPreferences = {
  type: "open-preferences"
}

type OpenKeyRotation = {
  type: "open-key-rotation"
}

type OpenMfaCache = {
  type: "open-mfa-cache"
}

type ReloadWindow = {
  type: "reload-window"
  payload: {
    window?: BrowserWindow
    force: boolean
  }
}

export type AppEvent =
  | MainWindowCreated
  | OpenPreferences
  | OpenKeyRotation
  | OpenMfaCache
  | ReloadWindow

interface WindowDetails {
  // TODO how much of this is fluff?
  window: BrowserWindow
  boundsChangedHandlerBound?: boolean
  zoomHandlerBound?: boolean
  browserViews: Record<string, BrowserView>
  currentView?: string
  expiryTime: number
  titleUpdateTimer?: NodeJS.Timeout
}

export interface AppState {
  mainWindow?: Electron.BrowserWindow
  windows: Record<string, WindowDetails>
}

export function reducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "main-window-created":
      return { mainWindow: event.payload.window, ...state }
    case "open-key-rotation":
      console.log("Intent to open Key Rotation window")
      break
    case "open-preferences":
      console.log("Intent to open Preferences window")
      break
    case "open-mfa-cache":
      console.log("Intent to open MFA Cache window")
      break
    case "reload-window": {
      const { window, force } = event.payload
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
      const { browserViews, currentView } = windows[currentProfileName]
      if (!currentView) {
        break
      }
      const { webContents } = browserViews[currentView]
      if (force) {
        webContents.reloadIgnoringCache()
      } else {
        webContents.reload()
      }
    }
  }
  return state
}

export function initialState(): AppState {
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
