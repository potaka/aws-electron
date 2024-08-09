import { Config, ConfigSchema } from "models"

interface HasOptionalConfig {
  config?: Config
}

interface HasMfaCode {
  mfaCode: string
}

interface HasOptionalTabs {
  tabs?: string[]
  activeTab?: number
  profileName?: string
}

interface HasOptionalSeconds {
  seconds?: string
}

interface HasOptionalTitleFormat {
  titleFormat?: string
}

interface HasOptionalVersion {
  version?: string
}

interface HasOptionalActiveProfileTab {
  activeProfileTab?: number
}

interface SetConfig {
  type: "set-config"
  payload: Config
}

interface SetMfaCode {
  type: "set-mfa-code"
  payload: string
}

interface LaunchConsole {
  type: "launch-console"
}

interface SetActiveTab {
  type: "set-active-tab"
  payload: number
}

interface SetProfileName {
  type: "set-profile-name"
  payload: string
}

interface SetTabs {
  type: "set-tabs"
  payload: {
    titles: string[]
    activeTab: number
  }
}

interface SetSeconds {
  type: "set-seconds"
  payload: string
}

interface SetTitleFormat {
  type: "set-title-format"
  payload: string
}

interface SetVersion {
  type: "set-version"
  payload: string
}

interface SetActiveProfileTab {
  type: "set-active-profile-tab"
  payload: number
}

export type RendererEvent =
  | SetConfig
  | SetMfaCode
  | LaunchConsole
  | SetActiveTab
  | SetProfileName
  | SetTabs
  | SetSeconds
  | SetTitleFormat
  | SetVersion
  | SetActiveProfileTab

type RendererState = HasOptionalConfig &
  HasMfaCode &
  HasOptionalTabs &
  HasOptionalSeconds &
  HasOptionalTitleFormat &
  HasOptionalVersion &
  HasOptionalActiveProfileTab

export function dispatcher(
  state: RendererState,
  event: RendererEvent,
): RendererState {
  switch (event.type) {
    case "set-config":
      return { ...state, config: event.payload }
    case "set-mfa-code":
      return { ...state, mfaCode: event.payload }
    case "launch-console":
      return { ...state, mfaCode: "" }
    case "set-active-tab":
      return { ...state, activeTab: event.payload }
    case "set-profile-name":
      return { ...state, profileName: event.payload }
    case "set-tabs":
      return {
        ...state,
        tabs: [...event.payload.titles],
        activeTab: event.payload.activeTab,
      }
    case "set-seconds":
      return { ...state, seconds: event.payload }
    case "set-title-format":
      return { ...state, titleFormat: event.payload }
    case "set-version":
      return { ...state, version: event.payload }
    case "set-active-profile-tab":
      return { ...state, activeProfileTab: event.payload }
  }
}

export function setConfig(dispatch: React.Dispatch<RendererEvent>): {
  (config: unknown): void
} {
  return (config: unknown) =>
    dispatch({ type: "set-config", payload: ConfigSchema.parse(config) })
}

export function setActiveProfileTab(dispatch: React.Dispatch<RendererEvent>): {
  (activeTab: number): void
} {
  return (activeTab: number) =>
    dispatch({ type: "set-active-profile-tab", payload: activeTab })
}

export function initialState(): HasMfaCode {
  return { mfaCode: "" }
}
