import { invoke } from "@tauri-apps/api/tauri";
import { listen } from '@tauri-apps/api/event';
import { CCol, CContainer, CFormInput, CRow } from "@coreui/react";
import { useEffect, useState } from "react";
import { Config, ConfigSchema } from "../types";
import "../App.css";
import "../styles.css";
import "./Launcher.css";
import ProfileEntry from "./ProfileEntry";

function Launcher() {
  const [config, setConfig] = useState<Config | undefined>(undefined)
  const [mfaCode, setMfaCode] = useState<string>("");

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
      invoke("get_aws_config").then((newConfig): void => {
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
      {config && Object.entries(config.config).sort(
        ([_a, {order: a}], [_b, {order: b}]) => a - b
      ).map(([profileName, profile]) => (
        <ProfileEntry key={profileName}
          profileName={profileName}
          profile={profile}
          launchAction={async () => {
            await invoke("launch-profile", {profile_name: profileName})
          }}
        />
      ))}
      {config && config.usable_profiles.some(
        (profile: string) => config.config[profile].mfa_serial !== undefined,
      ) ? (
        <CRow className="mfaBox">
          <CCol>
            <CFormInput
              type="text"
              value={mfaCode}
              placeholder="MFA Code"
              onChange={(
                event: React.ChangeEvent<HTMLInputElement>,
              ) => setMfaCode(event.target.value)}
            />
          </CCol>
        </CRow>
        ) : null}
    </CContainer>
  </>
}

export default Launcher
