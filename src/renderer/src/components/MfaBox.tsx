import { CRow, CCol, CFormInput } from "@coreui/react"
import { RendererEvent } from "@renderer/rendererState"

interface MfaBoxProps {
  dispatch: React.Dispatch<RendererEvent>
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
