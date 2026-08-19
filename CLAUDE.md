# Clair / Arogya Clinic Backend

## Licensing checks

GPL/license risk for this project comes from npm packages pulled into the
Node.js backend (`arogya-backend/package.json`) and any future React
frontend — not from GitHub or Neon themselves. Before launch, do a one-time
check of `dependencies`/`devDependencies` license fields (e.g. `npm view
<pkg> license`, or `npx license-checker --summary` for the full transitive
tree) to confirm nothing copyleft (GPL/AGPL/LGPL) has crept in. Most
mainstream packages (React, Express, etc.) are MIT-licensed, so this is
usually a quick check, but re-run it whenever new dependencies are added.

Last checked: 2026-08-19 — all 14 direct dependencies in
`arogya-backend/package.json` are MIT, Apache-2.0, BSD-2-Clause, or MIT-0.
