import { CButton, CCol, CRow } from "@coreui/react"
import { useEffect, useReducer } from "react"
import {
  dispatcher,
  initialState,
  setConfig as _setConfig,
} from "@renderer/rendererState"
const { api } = window
import * as sprintf from "sprintf-js"

function WindowTitlePreference(): JSX.Element {
  const [{ titleFormat, seconds, version }, dispatch] = useReducer(
    dispatcher,
    undefined,
    initialState,
  )

  let formattedTitle: string | undefined = undefined
  try {
    formattedTitle = sprintf.sprintf(titleFormat || "", {
      title: "AWS Console",
      profile: "myProfile",
      version,
      timeLeft: `0:30:${seconds || "00"}`,
    })
  } catch {
    /* nothing */
  }

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({
        type: "set-seconds",
        payload: (59 - new Date().getSeconds()).toString().padStart(2, "0"),
      })
    }, 1000)
    return (): void => clearInterval(interval)
  })

  useEffect(() => {
    if (!version) {
      ;(async (): Promise<void> => {
        dispatch({ type: "set-version", payload: await api.getVersion() })
      })()
    }
  })

  return (
    <>
      <CRow>
        <CCol xs={6}>
          Title format - a template to use to format the title bar - variables
          available:
          <dl>
            <dt>
              <span className={"tt"}>%(title)s</span>
            </dt>
            <dd>AWS Console</dd>
            <dt>
              <span className={"tt"}>%(version)s</span>
            </dt>
            <dd>{version}</dd>
            <dt>
              <span className={"tt"}>%(profile)s</span>
            </dt>
            <dd>
              The <span className={"tt"}>~/.aws/config</span> profile used
            </dd>
            <dt>
              <span className={"tt"}>%(timeLeft)s</span>
            </dt>
            <dd>The time left before the current session expires</dd>
          </dl>
        </CCol>
        <CCol xs={5}>
          <input
            size={40}
            value={titleFormat || ""}
            onChange={(event) => {
              dispatch({
                type: "set-title-format",
                payload: event.target.value,
              })
            }}
            name="titleFormat"
            className={"titleFormat"}
          />
          <br />
          {formattedTitle}
        </CCol>
        <CCol className="d-sm-table-cell" xs={5}>
          <CButton color={"primary"} onClick={() => {}}>
            Save
          </CButton>
        </CCol>
      </CRow>
    </>
  )
}

export default WindowTitlePreference
