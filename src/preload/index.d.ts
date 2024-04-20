import { ElectronAPI } from "@electron-toolkit/preload"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      registerConfigChangeListener: {
        (callback: { (payload: unknown): void }): { (): void }
      }
      registerProfileNameListener: {
        (callback: { (profileName: string): void }): { (): void }
      }
      registerNewTabListener: {
        (callbadck: { (url: string): void }): { (): void }
      }
      getConfig: { (): Promise<unknown> }
      launchConsole: { (profileName: string, mfaCode: string): void }
    }
  }
}
