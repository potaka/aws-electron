import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import { CCol, CContainer, CFormInput, CRow } from "@coreui/react"
import { useEffect, useReducer } from "react"
import { Config, ConfigSchema } from "models"
import ProfileRow from "../..//components/ProfileRow"
const { ipcRenderer } = window.electron

interface LauncherState {
  config?: Config
  mfaCode?: string
}

interface SetConfig {
  type: "set-config"
  payload: Config
}

interface SetMfaCode {
  type: "set-mfa-code"
  payload: string
}

type LauncherEvent = SetConfig | SetMfaCode

function dispatcher(state: LauncherState, event: LauncherEvent): LauncherState {
  switch (event.type) {
    case "set-config":
      return { ...state, config: event.payload }
    case "set-mfa-code":
      return { ...state, mfaCode: event.payload }
  }
}

function Launcher(): JSX.Element {
  const [{ config, mfaCode }, dispatch] = useReducer(dispatcher, {})

  ipcRenderer.on("new-config", (_event, config: Config) => {
    dispatch({ type: "set-config", payload: ConfigSchema.parse(config) })
  })

  useEffect(() => {
    if (!config) {
      window.electron.ipcRenderer.invoke("getConfig").then((result) => {
        dispatch({ type: "set-config", payload: ConfigSchema.parse(result) })
      })
    }
  }, [config])

  return (
    <>
      <CContainer fluid>
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
        {config &&
          Object.entries(config.profiles)
            .sort(([_a, a], [_b, b]) => a.order! - b.order!)
            .filter(([profileName]) =>
              config.usableProfiles.includes(profileName),
            )
            .map(([profileName, profile]) => (
              <ProfileRow
                key={profileName}
                profileName={profileName}
                profile={profile}
              />
            ))}
        {config &&
        config.usableProfiles.some(
          (profile: string) =>
            config.profiles[profile].mfa_serial !== undefined,
        ) ? (
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
        ) : null}
      </CContainer>
    </>
  )
}

export default Launcher
