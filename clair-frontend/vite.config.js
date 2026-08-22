import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// This project has always been a single-file React prototype
// (src/ClairMDEHR.jsx) with no build tooling of its own — this is the
// first time it's had one, added specifically to make it deployable
// (2026-08-22). Tailwind v4's own Vite plugin is used instead of a
// separate postcss.config.js/tailwind.config.js — it auto-detects
// utility classes across the project with no content-glob config needed,
// which is all this file's extensive use of Tailwind utility classes
// (including arbitrary values like bg-[#F7F9F7]) needs.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
