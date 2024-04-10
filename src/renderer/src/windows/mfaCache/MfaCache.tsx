import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CContainer } from "@coreui/react"
import { useEffect, useReducer } from "react"
import ProfileRow from "./ProfileRow"
import ProfileHeader from "./ProfileHeader"
import {
  MfaCacheEvent,
  MfaCacheState,
  setConfig as _setConfig,
} from "@renderer/rendererState"
import MfaBox from "@renderer/components/MfaBox"
const { api } = window

function dispatcher(state: MfaCacheState, event: MfaCacheEvent): MfaCacheState {
  switch (event.type) {
    case "set-config":
      return { ...state, config: event.payload }
    case "set-mfa-code":
      return { ...state, mfaCode: event.payload }
  }
}

function initialState(): MfaCacheState {
  return {
    mfaCode: "",
  }
}

function MfaCache(): JSX.Element {
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

export default MfaCache
