# Data Lake Frontend

A Next.js control center for the Lakehouse Gateway API (v2): browse namespaces and datasets, upload and query Parquet data, roll back to a previous snapshot, download exports, and delete data.

This is a from-scratch rebuild targeting API **v2** (`api-docs-v2.json`). The `old/` directory is the previous frontend, built against **v1** (`api-docs-v1.json`) — it's kept as read-only reference for UI/UX patterns and is not part of this app. See [AGENTS.md](./AGENTS.md) for conventions and [TODO.md](./TODO.md) for what's left to wire up against a real backend.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **TanStack Query** for server state, **TanStack Table** for the query/preview grid
- **react-hook-form** + **zod** for every form
- **shadcn/ui** components on top of **Base UI** primitives (not Radix)
- Auth: Keycloak via **`keycloak-js`** (Authorization Code + PKCE, see below)

## Getting started

```bash
npm install
npm run dev            # talks to a real API + Keycloak
npm run dev:noauth      # bypasses auth entirely with a fixture user/catalog - no API or Keycloak needed
npm run build && npm run start
npm run lint
```

Config lives in `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:1337       # Lakehouse Gateway API; defaults to https://api.datalake if unset
NEXT_PUBLIC_KEYCLOAK_URL=https://keycloak.datalake
NEXT_PUBLIC_KEYCLOAK_REALM=datalake
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=datalake-api-testing   # placeholder - see TODO.md
```

`npm run dev:noauth` sets `NEXT_PUBLIC_AUTH_MODE=noauth`, which short-circuits both the API and Keycloak with fixture data — it's the fastest way to work on UI without either dependency running.

## Auth, in short

The frontend talks to Keycloak directly (Authorization Code + PKCE, via the official `keycloak-js` adapter) to get a bearer token, then uses that token on every API call — the API only validates tokens (via JWKS), it never issues or proxies them. `keycloak-js` also silently re-checks for an existing session on every page load (`public/silent-check-sso.html`), refreshes the token before it expires, and ends the real Keycloak session on sign-out — none of that is hand-rolled. See `src/lib/keycloak.ts`/`src/hooks/useAuth.tsx` for the wiring and [TODO.md](./TODO.md) for what still needs confirming against the real Keycloak realm before this works end-to-end.

## Project structure

```
src/
  app/
    login/page.tsx        # sign-in button(s) only - keycloak-js handles the OAuth callback itself
    (app)/                 # authenticated routes, share AppSidebar/AppHeader via layout.tsx
      namespaces/  upload/  query/  datasets/  rollback/  download/  delete/
  components/               # app-specific components (PascalCase - AppSidebar, DataTable, ...)
  components/ui/            # shadcn-managed primitives (kebab-case - don't rename, see AGENTS.md)
  hooks/
    useAuth.tsx              # session context: keycloak-js init/refresh/logout, sessionStorage cache, catalog switch
    useCatalog.ts            # TanStack Query read hooks (namespaces/datasets/snapshots)
    useMobile.ts             # shadcn sidebar breakpoint helper
  lib/
    api/                     # one file per API resource (auth, namespaces, datasets, query) + client.ts
    keycloak.ts              # thin keycloak-js setup (singleton instance, init, login/logout redirects)
    session.ts, format.ts, utils.ts
  types/api.ts               # types mirrored from api-docs-v2.json
public/
  silent-check-sso.html      # keycloak-js's hidden-iframe session check, see TODO.md
```

Reads go through `useCatalog.ts`'s query hooks; writes are page-local `useMutation` calls into `lib/api/*` followed by `queryClient.invalidateQueries`. Every page with a submit action uses `react-hook-form` + `zod`; the namespace → dataset cascading picker is shared via `useNamespaceDatasetOptions`.
