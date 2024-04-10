import { CButton, CCol, CRow } from "@coreui/react"
import { Profile } from "models"

interface ProfileRowProps {
  profileName: string
  profile: Profile
}

interface MfaDetail {
  account: string
  arn: string
}

function getMfaDetail(mfaSerial: string): MfaDetail {
  const match = mfaSerial.match(/.*::(\d{12}):mfa\/(.*)/)!
  return { account: match[1], arn: match[2] }
}

function ProfileRow({
  profileName,
  profile: { mfa_serial },
}: ProfileRowProps): JSX.Element {
  const { account, arn } = getMfaDetail(mfa_serial!)
  return (
    <>
      <CRow key={profileName} className="profile" xs={{ gutter: 0 }}>
        <CCol className="d-sm-table-cell" xs={3}>
          {profileName}
        </CCol>
        <CCol className="d-sm-table-cell" xs={2}>
          {account}
        </CCol>
        <CCol className="d-sm-table-cell" xs={5}>
          {arn}
        </CCol>
        <CCol xs={1} className="launchButton">
          <CButton color="primary">Cache</CButton>
        </CCol>
      </CRow>
    </>
  )
}

export default ProfileRow
