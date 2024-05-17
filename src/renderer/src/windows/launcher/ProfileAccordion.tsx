import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CButton,
  CCol,
  CContainer,
  CRow,
} from "@coreui/react"
import { Profile } from "models"

interface ProfileAccordionProps {
  profileName: string
  profile: Profile
  launchAction: { (): void }
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

function getMfaDetail(
  mfaSerial: string | undefined,
): [string | undefined, string | undefined] {
  if (mfaSerial === undefined) {
    return [undefined, undefined]
  }
  const match = mfaSerial?.match(/.*::(\d{12}):mfa\/(.*)/)
  if (match) {
    return [match[2], match[1]]
  }
  return [mfaSerial, undefined]
}

function ProfileAccordion({
  profileName,
  profile: {
    mfa_serial,
    role_arn,
    source_profile,
    sso_account_id,
    sso_role_name,
    sso_session,
  },
  launchAction,
}: ProfileAccordionProps): JSX.Element {
  const [mfa_name, mfa_account] = getMfaDetail(mfa_serial)
  return (
    <>
      <CRow key={profileName} className="profile" xs={{ gutter: 0 }}>
        <CCol className="me-auto">
          <CAccordion>
            <CAccordionItem>
              <CAccordionHeader>{profileName}</CAccordionHeader>
              <CAccordionBody>
                <CContainer>
                  <CRow>
                    <CCol>Account</CCol>
                    {role_arn && <CCol>{getRoleAccount(role_arn)}</CCol>}
                    {sso_account_id && <CCol>{sso_account_id}</CCol>}
                  </CRow>
                  {role_arn && (
                    <CRow>
                      <CCol>Role Name</CCol>
                      <CCol>{getRoleName(role_arn)}</CCol>
                    </CRow>
                  )}
                  {sso_role_name && (
                    <CRow>
                      <CCol>Permission Set Name</CCol>
                      <CCol>{sso_role_name}</CCol>
                    </CRow>
                  )}
                  {mfa_account && (
                    <CRow>
                      <CCol>MFA Account</CCol>
                      <CCol>{mfa_account}</CCol>
                    </CRow>
                  )}
                  {mfa_name && (
                    <CRow>
                      {mfa_account && <CCol>MFA Name</CCol>}
                      {mfa_account === undefined && <CCol>MFA Serial</CCol>}
                      <CCol>{mfa_name}</CCol>
                    </CRow>
                  )}
                  {source_profile && (
                    <CRow>
                      <CCol>Credentials Profile</CCol>
                      <CCol>{source_profile}</CCol>
                    </CRow>
                  )}
                  {sso_session && (
                    <CRow>
                      <CCol>SSO Profile</CCol> <CCol>{sso_session}</CCol>
                    </CRow>
                  )}
                </CContainer>
              </CAccordionBody>
            </CAccordionItem>
          </CAccordion>
        </CCol>
        <CCol xs="auto" className="launchButton align-self-end">
          <CButton color="primary" onClick={launchAction}>
            Launch
          </CButton>
        </CCol>
      </CRow>
    </>
  )
}

export default ProfileAccordion
