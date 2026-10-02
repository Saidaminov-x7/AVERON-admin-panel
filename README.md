# AVERON Admin

The Admin panel is a React/Vite single-page application for authorized
administrators. It manages catalog products, imports and review decisions,
orders, reviews, commerce promo codes, users, settings, audit records, and
integration diagnostics.

## Local development

Use Node.js 20 or newer and the repository's pnpm lockfile:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Configure the Backend API URL using the repository's local environment
configuration. Do not place server-side provider credentials in Vite
`VITE_*` variables; those values are exposed to the browser.

## Checks

```powershell
pnpm test
pnpm build
pnpm lint
```

`pnpm build` runs the TypeScript project build before producing the Vite
bundle. `pnpm lint` runs Oxlint.

Admin-only actions are enforced by the Backend as well as hidden or guarded in
the client. Parser and AI-assisted product data stays in review until an
administrator explicitly approves and publishes it. Integration diagnostics
report configured and verified status separately; the presence of an
integration screen does not mean a provider is live.
