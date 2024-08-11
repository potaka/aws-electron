import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { useReducer } from "react"
import {
  dispatcher,
  initialState,
  setConfig as _setConfig,
} from "@renderer/rendererState"
import MfaBox from "@renderer/components/MfaBox"
import ProfileAccordion from "./ProfileAccordion"
import { Config } from "models"
const { api } = window

interface StandardProfilesProps {
  config: Config
}

function StandardProfiles({ config }: StandardProfilesProps): JSX.Element {
  const [{ mfaCode }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )

  return (
    <>
      {config &&
        Object.entries(config.profiles)
          .sort(([_a, a], [_b, b]) => a.order! - b.order!)
          .filter(
            ([profileName]) =>
              config.usableProfiles.includes(profileName) &&
              config.profiles[profileName].sso_session === undefined,
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
    </>
  )
}

export default StandardProfiles
