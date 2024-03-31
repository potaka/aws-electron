import { CButton, CCol, CRow } from "@coreui/react";
import { Profile } from "../types";

interface ProfileProps {
  profileName: string
  profile: Profile
  launchAction: {(): void}
}

function ProfileEntry({
  profileName,
  profile,
  launchAction,
}: ProfileProps) {
  const roleArn = profile.role_arn as string | null
  if(!roleArn) {
    return
  }
  const accountNumber = roleArn.match(/::(\d{12}):/)![1]
  const roleName = roleArn.match(/role\/(.*)/)![1]
  return (
    <CRow
      className="profile"
    >
      <CCol
        className="d-none d-sm-table-cell"
        sm={3}
        lg={2}
      >
        {profileName}
      </CCol>
      <CCol
        className="d-none d-md-table-cell"
        md={2}
      >
        {accountNumber}
      </CCol>
      <CCol
        className="d-none d-md-table-cell"
        sm={3}
        lg={2}
      >
        {/* {roleName.replace(/-/g, String.fromCharCode(0x2011))} */}
        {roleName}
      </CCol>
      <CCol
        className="d-none d-lg-table-cell"
        lg={2}
      >
        {
          profile.mfa_serial &&
          profile.mfa_serial.replace(/arn:aws:iam::(\d{12}):mfa\/(.*)/, '$1 $2')
        }
      </CCol>
      <CCol
        className="d-none d-md-table-cell"
        md={2}
      >
        {/* {
          profile.source_profile &&
          profile.source_profile.replace(/-/g, String.fromCharCode(0x2011))
        } */}
        {profile.source_profile}
      </CCol>
      <CCol xs={1}>
        <CButton
          color="primary"
          onClick={launchAction}
        >
          Launch
        </CButton>
      </CCol>
    </CRow>
  )
}

export default ProfileEntry;
