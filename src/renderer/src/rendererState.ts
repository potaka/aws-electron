import { Config, ConfigSchema } from "models"

interface HasOptionalConfig {
  config?: Config
}

interface HasMfaCode {
  mfaCode: string
}

interface SetConfig {
  type: "set-config"
  payload: Config
}

interface SetMfaCode {
  type: "set-mfa-code"
  payload: string
}


export type RendererEvent = SetConfig | SetMfaCode | LaunchConsole
type RendererState = HasOptionalConfig & HasMfaCode

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
