import { invoke } from "@tauri-apps/api/tauri";
import { listen } from '@tauri-apps/api/event';
import { CButton, CCol, CContainer, CRow } from "@coreui/react";
import { useEffect, useState } from "react";
import { Config, ConfigSchema } from "../types";
import "../App.css";
import "../styles.css";
import "./Launcher.css";

function Launcher() {
  const [config, setConfig] = useState<Config | undefined>(undefined)

  // listener for new config
  useEffect(() =>{
    // don't resolve await the promise until you need it for unregistering the listener
    const unlistenerPromise = listen("new-config", (event) => {
      setConfig(ConfigSchema.parse(event.payload))
    });
    return () => {
      unlistenerPromise.then(unlisten => unlisten());
    }
  }, [])

  // hook to fetch config in case the initial event was lost
  useEffect(() => {
    if(!config) {
      invoke("load_config").then((newConfig): void => {
        setConfig(ConfigSchema.parse(newConfig))
      })
    }
  }, [config])

  return <>
    <CContainer fluid>
      <CRow className="heading">
        <CCol
          className="d-none d-sm-table-cell"
          sm={3}
          lg={2}
        >
          Profile Name
        </CCol>
        <CCol
          className="d-none d-md-table-cell"
          md={2}
        >
          Role Account
        </CCol>
        <CCol
          className="d-none d-md-table-cell"
          sm={3}
          lg={2}
        >
          Role Name
        </CCol>
        <CCol
          className="d-none d-lg-table-cell"
          lg={2}
        >
          MFA ARN or Serial Number
        </CCol>
        <CCol
          className="d-none d-md-table-cell"
          md={2}
        >
          Credentials Profile
        </CCol>
        <CCol xs={1}/>
      </CRow>
      {config && Object.entries(config).sort(
        ([_a, {order: a}], [_b, {order: b}]) => a - b
      ).map(([profileName, profile]) => {
        const roleArn = profile.role_arn as string | null
        if(!roleArn) {
          return
        }
        const accountNumber = roleArn.match(/::(\d{12}):/)![1]
        const roleName = roleArn.match(/role\/(.*)/)![1]

        return (
          <CRow
            key={profileName}
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
                onClick={async () => {
                  await invoke("launch-profile", {profile_name: profileName})
                }}
              >
                Launch
              </CButton>
            </CCol>
          </CRow>
        )
      })}
    </CContainer>
  </>
}

export default Launcher
