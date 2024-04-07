import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CContainer } from "@coreui/react"
import { useEffect, useReducer } from "react"
import { Config, ConfigSchema } from "models"
import ProfileRow from "./ProfileRow"
import ProfileHeader from "./ProfileHeader"
import MfaBox from "./MfaBox"
const { api } = window

interface LauncherState {
  config?: Config
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

export type LauncherEvent = SetConfig | SetMfaCode

function dispatcher(state: LauncherState, event: LauncherEvent): LauncherState {
  switch (event.type) {
    case "set-config":
      return { ...state, config: event.payload }
    case "set-mfa-code":
      return { ...state, mfaCode: event.payload }
  }
}

function _setConfig(dispatch: React.Dispatch<LauncherEvent>): {
  (config: unknown): void
} {
  return (config: unknown) =>
    dispatch({ type: "set-config", payload: ConfigSchema.parse(config) })
}

function initialState(): LauncherState {
  return {
    mfaCode: "",
  }
}

function Launcher(): JSX.Element {
  const [{ config, mfaCode }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )
  const setConfig = _setConfig(dispatch)

  useEffect(() => api.registerConfigChangeListener(setConfig), [])

  useEffect(() => {
    if (!config) {
      api.getConfig().then(setConfig)
    }
  }, [config])

  return (
    <>
      <CContainer fluid>
        <ProfileHeader />
        {config &&
          Object.entries(config.profiles)
            .sort(([_a, a], [_b, b]) => a.order! - b.order!)
            .filter(([profileName]) =>
              config.usableProfiles.includes(profileName),
            )
            .map(([profileName, profile]) => (
              <ProfileRow
                key={profileName}
                profileName={profileName}
                profile={profile}
              />
            ))}
        {config &&
          config.usableProfiles.some(
            (profile: string) =>
              config.profiles[profile].mfa_serial !== undefined,
          ) && <MfaBox dispatch={dispatch} mfaCode={mfaCode} />}
      </CContainer>
    </>
  )
}

export default Launcher
