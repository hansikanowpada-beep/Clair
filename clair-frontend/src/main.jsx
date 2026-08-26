import React from "react";
import { createRoot } from "react-dom/client";
import ClairMDEHR from "./ClairMDEHR.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClairMDEHR />
  </React.StrictMode>
);
