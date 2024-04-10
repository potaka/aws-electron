import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CContainer } from "@coreui/react"
import { useEffect, useReducer } from "react"
import ProfileRow from "./ProfileRow"
import ProfileHeader from "./ProfileHeader"
import {
  setConfig as _setConfig,
  dispatcher,
  initialState,
} from "@renderer/rendererState"
import MfaBox from "@renderer/components/MfaBox"
const { api } = window

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
              config.cachableProfiles.includes(profileName),
            )
            .map(([profileName, profile]) => (
              <ProfileRow
                key={profileName}
                profileName={profileName}
                profile={profile}
              />
            ))}
        {config && config.cachableProfiles.length > 0 && (
          <MfaBox dispatch={dispatch} mfaCode={mfaCode} />
        )}
      </CContainer>
    </>
  )
}

export default MfaCache
