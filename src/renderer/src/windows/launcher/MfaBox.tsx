import { CRow, CCol, CFormInput } from "@coreui/react"
import { LauncherEvent } from "./Launcher"

interface MfaBoxProps {
  dispatch: React.Dispatch<LauncherEvent>
  mfaCode: string | undefined
}
function MfaBox({ dispatch, mfaCode }: MfaBoxProps): JSX.Element {
  return (
    <>
      <CRow className="mfaBox">
        <CCol>
          <CFormInput
            type="text"
            value={mfaCode}
            placeholder="MFA Code"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              dispatch({
                type: "set-mfa-code",
                payload: event.target.value,
              })
            }
          />
        </CCol>
      </CRow>
    </>
  )
}

export default MfaBox
