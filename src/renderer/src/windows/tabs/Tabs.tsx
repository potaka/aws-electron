import "@coreui/coreui/dist/css/coreui.min.css"
import "../../assets/main.css"
import {
  CCloseButton,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
} from "@coreui/react"
import { useEffect, useReducer } from "react"
import {
  setConfig as _setConfig,
  dispatcher,
  initialState,
} from "@renderer/rendererState"
const { api } = window

function Tabs(): JSX.Element {
  const [{ activeTab, tabs, profileName }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )

  useEffect(
    () =>
      api.registerProfileNameListener((profileName: string): void =>
        dispatch({ type: "set-profile-name", payload: profileName }),
      ),
    [],
  )

  useEffect(
    () =>
      api.registerNewTabListener((url: string): void =>
        dispatch({ type: "open-tab", payload: url }),
      ),
    [],
  )

  useEffect(() => {
    if (profileName) {
      document.title = profileName
      api.setTop(profileName, document.getElementById("tabPanel")!.offsetTop)
    }
  }, [profileName])

  return (
    <>
      <CNav variant="tabs">
        <CNavItem>
          <CNavLink
            href="#!"
            onClick={() => {
              console.log(`sending ${activeTab} back`)
            }}
          >
            Back
          </CNavLink>
        </CNavItem>
        <CNavItem>
          <CNavLink
            href="#!"
            onClick={() => {
              console.log(`sending ${activeTab} forward`)
            }}
          >
            Forwards
          </CNavLink>
        </CNavItem>
        {tabs &&
          tabs.map((tab, index) => (
            <CNavItem key={index}>
              <CNavLink href="#!" active={index === activeTab}>
                <span
                  onClick={() => {
                    dispatch({ type: "set-active-tab", payload: index })
                    api.activateTab(profileName!, index)
                  }}
                >
                  {tab}
                </span>
                {index === activeTab && (
                  <CCloseButton
                    onClick={() => api.closeTab(profileName!, index)}
                  />
                )}
              </CNavLink>
            </CNavItem>
          ))}
      </CNav>
      <CTabContent>
        <CTabPane role="tabpanel" visible={true} id="tabPanel">
          {profileName}
        </CTabPane>
      </CTabContent>
    </>
  )
}

export default Tabs
