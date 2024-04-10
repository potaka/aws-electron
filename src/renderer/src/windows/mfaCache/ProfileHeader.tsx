import { CRow, CCol } from "@coreui/react"

function ProfileHeader(): JSX.Element {
  return (
    <>
      <CRow className="heading" xs={{ gutter: 0 }}>
        <CCol className="d-sm-table-cell" xs={3}>
          Credentials Profile Name
        </CCol>
        <CCol className="d-sm-table-cell" xs={2}>
          Account
        </CCol>
        <CCol className="d-sm-table-cell" xs={5}>
          MFA ARN or Serial Number
        </CCol>
        <CCol xs={1}>&nbsp;</CCol>
      </CRow>
    </>
  )
}

export default ProfileHeader
