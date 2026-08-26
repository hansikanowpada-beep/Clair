# ClairMD

## Licensing checks

GPL/license risk for this project comes from npm packages pulled into the
Node.js backend (`clairmd-backend/package.json`) and the React frontend
(`clair-frontend/package.json`) — not from GitHub or Neon themselves.
Before launch, do a one-time check of `dependencies`/`devDependencies`
license fields (e.g. `npm view <pkg> license`, or `npx license-checker
--summary` for the full transitive tree) to confirm nothing copyleft
(GPL/AGPL/LGPL) has crept in. Most mainstream packages (React, Express,
etc.) are MIT-licensed, so this is usually a quick check, but re-run it
whenever new dependencies are added.

Last checked: 2026-08-26 — clean in both projects:
- `clairmd-backend`: 218 MIT, 40 ISC, 34 Apache-2.0, 13 BSD-3-Clause, and
  a handful of other permissive licenses across all direct + transitive
  dependencies. One dual-licensed package (`node-forge`,
  `BSD-3-Clause OR GPL-2.0`) — usable under its BSD-3-Clause option, so
  not a copyleft obligation.
- `clair-frontend`: 89 MIT, 18 ISC, 3 BSD-3-Clause, and a few other
  permissive licenses. One MPL-2.0 package (`lightningcss`, a Tailwind
  v4/Vite build-time CSS tool) — build tooling only, not bundled into the
  shipped app, so MPL's file-level share-alike obligation doesn't reach
  ClairMD's own code.

No GPL/AGPL/LGPL-only packages in either project as of this check.
