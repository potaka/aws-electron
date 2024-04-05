import { CButton, CCol, CRow } from "@coreui/react"
import { Profile } from "models"

interface ProfileRowProps {
  profileName: string
  profile: Profile
}

function getRoleAccount(roleArn: string | undefined): string | undefined {
  const match = roleArn?.match(/.*:(\d{12}):role.*/)
  if (match) {
    return match[1]
  }
  return roleArn
}

function getRoleName(roleArn: string | undefined): string | undefined {
  return roleArn?.replace(/.*role\//, "")
}

function getMfaDetail(mfaSerial: string | undefined): string | undefined {
  const match = mfaSerial?.match(/.*::(\d{12}):mfa\/(.*)/)
  if (match) {
    return [match[1], match[2]].join(" ")
  }
  return mfaSerial
}

function ProfileRow({
  profileName,
  profile: { mfa_serial, role_arn, source_profile },
}: ProfileRowProps): JSX.Element {
  return (
    <>
      <CRow key={profileName} className="profile" xs={{ gutter: 0 }}>
        <CCol className="d-none d-sm-table-cell" sm={3} lg={2}>
          {profileName}
        </CCol>
        <CCol className="d-none d-md-table-cell" md={2}>
          {getRoleAccount(role_arn)}
        </CCol>
        <CCol className="d-none d-md-table-cell" sm={3} lg={2}>
          {getRoleName(role_arn)}
        </CCol>
        <CCol className="d-none d-lg-table-cell" lg={2}>
          {getMfaDetail(mfa_serial)}
        </CCol>
        <CCol className="d-none d-md-table-cell" md={2}>
          {source_profile}
        </CCol>
        <CCol xs={1} className="launchButton">
          <CButton color="primary">Launch</CButton>
        </CCol>
      </CRow>
    </>
  )
}

export default ProfileRow
