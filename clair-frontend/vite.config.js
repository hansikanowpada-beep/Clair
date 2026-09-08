import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// This project has always been a single-file React prototype
// (src/ClairMDEHR.jsx) with no build tooling of its own — this is the
// first time it's had one, added specifically to make it deployable
// (2026-08-22). Tailwind v4's own Vite plugin is used instead of a
// separate postcss.config.js/tailwind.config.js — it auto-detects
// utility classes across the project with no content-glob config needed,
// which is all this file's extensive use of Tailwind utility classes
// (including arbitrary values like bg-[#F7F9F7]) needs.
//
// PWA (added 2026-09-08): makes the built app installable and lets the
// app shell (JS/CSS/HTML) load instantly from cache, including with no
// network at all — genuinely useful for a clinic on a flaky connection
// just to get the UI itself on screen. This does NOT make patient data
// editable offline: the app currently keeps all patient/admission state
// in React memory with no localStorage/IndexedDB persistence layer at
// all, so a full "work with no signal, sync later" flow would need a
// real client-side persisted-and-encrypted data store (respecting the
// backend's own no-plaintext-clinical-content rule) — a separate,
// security-sensitive project, not something bundled in here. What this
// DOES add: a NetworkFirst cache for GET API calls, so data already
// fetched once this session keeps displaying (read-only, possibly
// stale) through a brief connectivity drop instead of erroring out.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "ClairMD",
        short_name: "ClairMD",
        description: "An AI-assisted EHR for small clinics — encrypted on your own device before it ever reaches us.",
        theme_color: "#1877F2",
        background_color: "#ECF2F6",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell (JS/CSS/HTML/icons) — precached, so it loads offline.
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        // ClairMDEHR.jsx is one big ~30k-line component with no code
        // splitting, so the main bundle is a few MB — well past Workbox's
        // 2MB default. Raised rather than split, since splitting this
        // single-file prototype is a separate, larger refactor.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // GET-only: writes always need the network and should surface
            // their own failure (matches api.js's existing "sync failure
            // shows as a small inline message" pattern) rather than
            // silently appearing to succeed against a stale cache.
            urlPattern: ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/api/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "clairmd-api-get-cache",
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
});
