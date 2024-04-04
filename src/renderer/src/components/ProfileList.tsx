import { CCol, CContainer, CRow } from "@coreui/react"
import "@coreui/coreui/dist/css/coreui.min.css"
import { useEffect, useState } from "react"
import { Config, ConfigSchema } from "models"

function ProfileList(): JSX.Element {
  const [config, setConfig] = useState<Config | undefined>(undefined)

  useEffect(() => {
    if (!config) {
      window.electron.ipcRenderer.invoke("getConfig").then((result) => {
        setConfig(ConfigSchema.parse(result))
      })
    }
  }, [config])

  console.log(config)

  return (
    <>
      <CContainer fluid>
        <CRow className="heading">
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
        {config &&
          Object.entries(config.profiles)
            .sort(([_a, a], [_b, b]) => a.order! - b.order!)
            .filter(([profileName]) =>
              config.usableProfiles.includes(profileName),
            )
            .map(([profileName]) => (
              <CRow key={profileName}>{profileName}</CRow>
            ))}
      </CContainer>
    </>
  )
}

export default ProfileList
