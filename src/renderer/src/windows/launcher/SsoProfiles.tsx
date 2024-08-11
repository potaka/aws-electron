import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import {
  dispatcher,
  initialState,
  setSsoRoles as _setSsoRoles,
} from "@renderer/rendererState"
// import ProfileAccordion from "./ProfileAccordion"
import { useEffect, useReducer } from "react"
import { v4 as getUuid } from "uuid"
const { api } = window

interface SsoProfilesProps {
  profileName: string
}

function SsoProfiles({ profileName }: SsoProfilesProps): JSX.Element {
  const [{ ssoRoles }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )
  const setSsoRoles = _setSsoRoles(dispatch, profileName)

  useEffect(() => {
    if (ssoRoles) {
      return undefined
    }
    const timeoutNumber = setTimeout(() => {
      // this janky shit makes it so  we don't actually fire the damn event
      // before react has finished piss-farting around calling things twice
      const uuid = getUuid()
      api.getSsoConfig(profileName, uuid).then(setSsoRoles)
    }, 1000)
    return (): void => {
      clearTimeout(timeoutNumber)
    }
  }, [ssoRoles])

  return <>Something for SSO Profile {profileName}</>
}

export default SsoProfiles
