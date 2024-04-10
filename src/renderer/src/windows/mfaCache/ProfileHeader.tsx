import { CRow, CCol } from "@coreui/react"

function ProfileHeader(): JSX.Element {
  return (
    <>
      <CRow className="heading" xs={{ gutter: 0 }}>
        <CCol className="d-none d-sm-table-cell" sm={3} lg={2}>
          Profile Name
        </CCol>
        <CCol className="d-none d-md-table-cell" md={2}>
          Role Account
        </CCol>
        <CCol className="d-none d-md-table-cell" sm={3} lg={2}>
          Role Name
        </CCol>
        <CCol className="d-none d-lg-table-cell" lg={2}>
          MFA ARN or Serial Number
        </CCol>
        <CCol className="d-none d-md-table-cell" md={2}>
          Credentials Profile
        </CCol>
        <CCol xs={1} />
      </CRow>
    </>
  )
}

export default ProfileHeader
