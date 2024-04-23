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
      registerTabsListener: {
        (callback: { (titles: string[], activeTab: number): void }): {
          (): void
        }
      }
      closeTab: { (profileName: string, index: number): void }
      getConfig: { (): Promise<unknown> }
      setTop: { (profileName: string, top: number): void }
      launchConsole: { (profileName: string, mfaCode: string): void }
    }
  }
}
