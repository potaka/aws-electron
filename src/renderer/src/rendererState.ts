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

export type RendererEvent =
  | SetConfig
  | SetMfaCode
  | LaunchConsole
  | SetActiveTab
  | SetProfileName
  | SetTabs
type RendererState = HasOptionalConfig & HasMfaCode & HasOptionalTabs

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
  }
}

export function setConfig(dispatch: React.Dispatch<RendererEvent>): {
  (config: unknown): void
} {
  return (config: unknown) =>
    dispatch({ type: "set-config", payload: ConfigSchema.parse(config) })
}

export function initialState(): HasMfaCode {
  return { mfaCode: "" }
}
