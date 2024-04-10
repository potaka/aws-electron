import { Config, ConfigSchema } from "models"

interface HasOptionalConfig {
  config?: Config
}

interface HasMfaCode {
  mfaCode: string
}

export type LauncherState = HasOptionalConfig & HasMfaCode
export type MfaCacheState = HasOptionalConfig & HasMfaCode

interface SetConfig {
  type: "set-config"
  payload: Config
}

interface SetMfaCode {
  type: "set-mfa-code"
  payload: string
}

export type LauncherEvent = SetConfig | SetMfaCode
export type MfaCacheEvent = SetConfig | SetMfaCode

export type RendererEvent = LauncherEvent | MfaCacheEvent
type RendererState = LauncherState | MfaCacheState

export function dispatcher(
  state: LauncherState,
  event: LauncherEvent,
): LauncherState

export function dispatcher(
  state: MfaCacheState,
  event: MfaCacheEvent,
): MfaCacheState

export function dispatcher(
  state: RendererState,
  event: RendererEvent,
): RendererState {
  switch (event.type) {
    case "set-config":
      return { ...state, config: event.payload }
    case "set-mfa-code":
      return { ...state, mfaCode: event.payload }
  }
}

export function setConfig(dispatch: React.Dispatch<RendererEvent>): {
  (config: unknown): void
} {
  return (config: unknown) =>
    dispatch({ type: "set-config", payload: ConfigSchema.parse(config) })
}

export function initialState(): HasMfaCode {
  return {
    mfaCode: "",
  }
}
