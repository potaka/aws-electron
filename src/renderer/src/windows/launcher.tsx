import "../assets/main.css"

import React from "react"
import ReactDOM from "react-dom/client"
import ProfileList from "../components/ProfileList"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ProfileList />
  </React.StrictMode>,
)
