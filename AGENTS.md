<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project: Data Lake Frontend

Next.js control center for the Lakehouse Gateway API **v2**. See [README.md](./README.md) for the stack/structure overview and [TODO.md](./TODO.md) for the current integration status — read TODO.md before assuming Keycloak or the live API are reachable in whatever environment you're running in.

## Ground truth for the API

`api-docs-v2.json` (repo root) is the actual OpenAPI spec for the API this app talks to — treat its `paths`/`components.schemas`/`components.securitySchemes` as authoritative over any prose in `info.description`, which is stale in places (e.g. it still mentions a `/auth/login` credentials endpoint that isn't in `paths` — that turned out to be irrelevant once the real auth model was confirmed: the frontend talks to Keycloak directly, the API only validates tokens via JWKS). `api-docs-v1.json` is the old API version, for `old/` only.

## `old/` is reference-only, never a dependency

`old/` is the previous frontend, built against **v1**. It's there so patterns (page layout, what fields a form needs, etc.) can be checked for orientation — never import from it, never treat its API calls or types as correct for v2 (v1 and v2 have different paths, different auth, different field casing throughout). If something in `old/` looks useful, re-derive it against `api-docs-v2.json`, don't port it directly.

## Conventions established in this codebase

- **File naming**: components that render JSX are PascalCase (`AppSidebar.tsx`, `DataTable.tsx`). Hooks are camelCase (`useAuth.tsx`, `useCatalog.ts`). Everything in `components/ui/` stays kebab-case (`dropdown-menu.tsx`) — that directory is shadcn-CLI-managed (see `components.json`); renaming those files breaks `shadcn add`/`shadcn diff`'s ability to match them against the registry. Plain `lib/` utilities are single lowercase words (`format.ts`, `session.ts`).
- **Data layer split**: `lib/api/*.ts` are plain fetch functions, one file per API resource, taking a `FrontendSession` as the first arg. Reads are wrapped in `useQuery` inside `hooks/useCatalog.ts` (shared across pages). Writes are page-local `useMutation` calls straight into `lib/api/*`, followed by `queryClient.invalidateQueries` on success. Don't centralize mutations the way reads are centralized — they carry page-specific `onSuccess`/reset logic that doesn't generalize.
- **Forms**: any page with a submit action uses `react-hook-form` + `zodResolver` + `Controller` (for shadcn/Base UI inputs that don't take a plain ref) + the shared `FieldMessage` component for validation/API errors. Pages that are pure filters/browsers with no submit (e.g. `datasets/page.tsx`) use plain `useState` instead — that's an intentional distinction, not an inconsistency to "fix".
- **Namespace → dataset cascading picker**: shared via `useNamespaceDatasetOptions(namespace)` in `hooks/useCatalog.ts`. Every page with that picker (`upload`, `delete`, `rollback`, `download`, `datasets`) should use it rather than re-deriving `namespacesQuery.data?.data.map(n => n.name)` locally.
- **Types**: `types/api.ts` mirrors `api-docs-v2.json` field-for-field (including its inconsistent camelCase/snake_case). Auth is Keycloak's contract, not the API's — it's handled by `keycloak-js`, not hand-rolled, and doesn't belong in `types/api.ts`.
- **Auth**: `lib/keycloak.ts` is a thin wrapper around the official `keycloak-js` adapter (Authorization Code + PKCE) — don't hand-roll PKCE/token-exchange/refresh logic, `keycloak-js` already does it (including silent session checks via `public/silent-check-sso.html` and real end-session logout). `hooks/useAuth.tsx` owns the resulting session (a plain `FrontendSession`, cached in `sessionStorage`, catalog switching) and is where `keycloak-js`'s `init()`/`onTokenExpired`/`updateToken` get wired up — it doesn't otherwise care how the token was obtained. `NEXT_PUBLIC_AUTH_MODE=noauth` (`npm run dev:noauth`) bypasses `keycloak-js` and the API entirely with fixture data — keep that path working when touching auth code, it's the primary way to iterate on UI without live dependencies.
