import { contextBridge, ipcRenderer } from "electron"

const api = {
  registerConfigChangeListener: (callback: {
    (payload: unknown): void
  }): void => {
    ipcRenderer.on("new-config", (_, payload: unknown) => callback(payload))
  },
  getConfig: async (): Promise<unknown> => {
    return ipcRenderer.invoke("getConfig")
  },
  launchConsole: (profileName: string, mfaCode: string): void => {
    ipcRenderer.send("launchConsole", profileName, mfaCode)
  },
}

contextBridge.exposeInMainWorld("api", api)
