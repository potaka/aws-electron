import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import {
  CContainer,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from "@coreui/react"
import { useEffect, useReducer } from "react"
import {
  dispatcher,
  initialState,
  setConfig as _setConfig,
  setActiveProfileTab as __setActiveProfileTab,
} from "@renderer/rendererState"
import SsoProfiles from "./SsoProfiles"
import StandardProfiles from "./StandardProfiles"
const { api } = window

function Launcher(): JSX.Element {
  const [{ config, activeProfileTab }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )
  const setConfig = _setConfig(dispatch)
  const _setActiveProfileTab = __setActiveProfileTab(dispatch)

  const setActiveProfileTab = (activeTab: number): void => {
    api.setActiveProfileTab(activeTab)
    _setActiveProfileTab(activeTab)
  }

  useEffect(() => api.registerConfigChangeListener(setConfig), [])

  useEffect(() => {
    if (!config) {
      api.getConfig().then(setConfig)
    }
  }, [config])

  useEffect(() => {
    if (activeProfileTab === undefined) {
      api.getActiveProfileTab().then(_setActiveProfileTab)
    }
  }, [activeProfileTab])

  if (!config || activeProfileTab === undefined) {
    return <CContainer fluid />
  }

  return (
    <>
      <CContainer fluid>
        {Object.entries(config.ssoSessions || {}).length > 0 &&
          config.standardProfiles.length > 0 && (
            <>
              <CNav variant="tabs">
                <CNavItem>
                  <CNavLink
                    href="#!"
                    active={
                      activeProfileTab === undefined || activeProfileTab === -1
                    }
                    onClick={() => setActiveProfileTab(-1)}
                  >
                    Standard Profiles
                  </CNavLink>
                </CNavItem>
                {Object.entries(config.ssoSessions!).map(
                  ([ssoSessionName], index) => (
                    <CNavItem key={ssoSessionName}>
                      <CNavLink
                        href="#!"
                        active={activeProfileTab === index}
                        onClick={() => setActiveProfileTab(index)}
                      >
                        SSO {ssoSessionName} Profiles
                      </CNavLink>
                    </CNavItem>
                  ),
                )}
              </CNav>
              <CTabContent>
                {config.standardProfiles.length > 0 && (
                  <CTabPane
                    visible={
                      activeProfileTab === undefined || activeProfileTab === -1
                    }
                  >
                    <StandardProfiles config={config} />
                  </CTabPane>
                )}
                {Object.entries(config.ssoSessions!).map(
                  ([ssoSessionName, _ssoSession], index) => (
                    <CTabPane
                      visible={activeProfileTab === index}
                      key={ssoSessionName}
                    >
                      <SsoProfiles profileName={ssoSessionName} />
                    </CTabPane>
                  ),
                )}
              </CTabContent>
            </>
          )}
      </CContainer>
    </>
  )
}

export default Launcher
