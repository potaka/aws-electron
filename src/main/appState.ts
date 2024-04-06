import { randomUUID } from "crypto"

type MainWindowCreated = {
  type: "main-window-created"
  payload: { window: Electron.BrowserWindow }
}

export type AppEvent = MainWindowCreated

export interface AppState {
  mainWindow?: Electron.BrowserWindow
}

export function reducer(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case "main-window-created":
      return { mainWindow: event.payload.window, ...state }
    default:
      return state
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
  initialState: S,
  reducer: {
    (state: S, event: E): S
  },
): [S, { (event: E): void }] {
  // generate a random UUID we will close over
  const uuid = randomUUID()

  states[uuid] = initialState

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

  return [initialState, dispatch]
}
