import { ElectronAPI } from "@electron-toolkit/preload"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      registerConfigChangeListener: { (payload: unknown): void }
      getConfig: { (): Promise<unknown> }
    }
  }
}
