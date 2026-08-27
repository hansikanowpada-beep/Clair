import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import ClairMDEHR from "./ClairMDEHR.jsx";
import LandingPage from "./LandingPage.jsx";
import { getAuthToken, apiRequest } from "./api.js";
import "./index.css";

const ACCOUNT_TYPE_TO_APP_MODE = {
  individual_doctor: "clinic",
  hospital_doctor: "clinic",
  hospital: "clinic",
  patient: "patient",
  care_team_member: "careTeam",
  admin: "admin",
};

// LandingPage is the real front door now; ClairMDEHR (the "working page")
// stays exactly as it was, just gated behind it — reached either by
// finishing the Doctor login on the landing page itself, or handed off
// there for Patient/Hospital staff (whose own real login screens live
// inside PatientPortalView/CareTeamPortalView already). A visitor who
// already has a valid session token (e.g. a doctor reloading the page)
// skips straight back to their working page instead of re-picking a role
// every time.
function App() {
  const [entryMode, setEntryMode] = useState(null); // null = show landing; "clinic"|"patient"|"careTeam" = show ClairMDEHR
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      setCheckingSession(false);
      return;
    }
    apiRequest("/auth/me")
      .then((data) => setEntryMode(ACCOUNT_TYPE_TO_APP_MODE[data.account.account_type] || "clinic"))
      .catch(() => {}) // invalid/expired token — fall through to the landing page
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) return null;
  if (entryMode === null) return <LandingPage onEnter={setEntryMode} />;
  return <ClairMDEHR initialAppMode={entryMode} onExitToLanding={() => setEntryMode(null)} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
