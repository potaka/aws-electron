import { contextBridge, ipcRenderer } from "electron"

function registerHandler(
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: { (...args: any[]): void },
): { (): void } {
  ipcRenderer.on(event, handler)
  return () => ipcRenderer.removeListener(event, handler)
}

const api = {
  registerConfigChangeListener: (callback: {
    (payload: unknown): void
  }): { (): void } => {
    return registerHandler("new-config", (_, payload): void =>
      callback(payload),
    )
  },
  registerProfileNameListener: (callback: {
    (profileName: string): void
  }): { (): void } => {
    return registerHandler("set-profile-name", (_, profileName: string): void =>
      callback(profileName),
    )
  },
  registerNewTabListener: (callback: { (url: string): void }): { (): void } => {
    return registerHandler("open-tab", (_, url: string): void => callback(url))
  },
  getConfig: async (): Promise<unknown> => {
    return ipcRenderer.invoke("getConfig")
  },
  launchConsole: (profileName: string, mfaCode: string): void => {
    ipcRenderer.send("launchConsole", profileName, mfaCode)
  },
}

contextBridge.exposeInMainWorld("api", api)
