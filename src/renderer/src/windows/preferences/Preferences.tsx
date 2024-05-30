import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CContainer } from "@coreui/react"
import WindowTitlePreference from "./WindowTitlePreference"

function Preferences(): JSX.Element {
  return (
    <>
      <CContainer fluid>
        <WindowTitlePreference />
      </CContainer>
    </>
  )
}

export default Preferences
