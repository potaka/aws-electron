import { invoke } from "@tauri-apps/api/core";
import { listen } from '@tauri-apps/api/event';
import { CCol, CContainer, CFormInput, CRow } from "@coreui/react";
import { useCallback, useEffect, useState } from "react";
import { Config, ConfigSchema } from "../types";
import "../App.css";
import "../styles.css";
import "./Console.css";

function Console() {
  // listener for new config
  useEffect(() => {
    // don't resolve await the promise until you need it for unregistering the listener
    const unlistenerPromise = listen("launch-tab", (event: any) => {
      const url = event.payload;
      console.log(`Request to open ${url}`)
    });
    return () => {
      unlistenerPromise.then(unlisten => unlisten())
    }
  }, [])



  return <>
    Hello, Console!
  </>
}

export default Console
