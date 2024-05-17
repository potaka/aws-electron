import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CContainer } from "@coreui/react"
import { useEffect, useReducer } from "react"
import {
  dispatcher,
  initialState,
  setConfig as _setConfig,
} from "@renderer/rendererState"
import MfaBox from "@renderer/components/MfaBox"
import ProfileAccordion from "./ProfileAccordion"
const { api } = window

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
        {config &&
          Object.entries(config.profiles)
            .sort(([_a, a], [_b, b]) => a.order! - b.order!)
            .filter(([profileName]) =>
              config.usableProfiles.includes(profileName),
            )
            .map(([profileName, profile]) => (
              <ProfileAccordion
                key={profileName}
                profileName={profileName}
                profile={profile}
                launchAction={() => {
                  api.launchConsole(profileName, mfaCode)
                  dispatch({ type: "launch-console" })
                }}
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
