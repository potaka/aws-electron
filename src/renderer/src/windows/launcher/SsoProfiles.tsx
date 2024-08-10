import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import {
  dispatcher,
  initialState,
  setConfig as _setConfig,
} from "@renderer/rendererState"
// import ProfileAccordion from "./ProfileAccordion"
import { useEffect, useReducer } from "react"
import { v4 as getUuid } from "uuid"
const { api } = window

interface SsoProfilesProps {
  profileName: string
}

function SsoProfiles({ profileName }: SsoProfilesProps): JSX.Element {
  const [{ config }, dispatch] = useReducer(dispatcher, undefined, initialState)
  const setConfig = _setConfig(dispatch)

  useEffect(() => {
    if (config) {
      return (): void => {}
    }
    const uuid = getUuid()
    api.getSsoConfig(profileName, uuid).then(setConfig)
    return (): void => {
      api.cancelGetSsoConfig(uuid)
    }
  }, [config])

  return <>Something for SSO Profile {profileName}</>
}

export default SsoProfiles
