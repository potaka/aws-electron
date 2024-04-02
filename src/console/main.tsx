import React from "react";
import ReactDOM from "react-dom/client";
import Launcher from "./Console";
import '@coreui/coreui/dist/css/coreui.min.css'

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Launcher />
  </React.StrictMode>,
);
