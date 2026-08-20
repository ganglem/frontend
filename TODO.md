# TODO: real Keycloak + API integration

## Current status

- UI, routing, session handling, and every page's logic are built and typecheck/lint/build clean against **v2**'s documented schemas.
- Auth uses the official **`keycloak-js`** adapter (Authorization Code + PKCE), not a hand-rolled implementation — see `src/lib/keycloak.ts` and `src/hooks/useAuth.tsx`.
- `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_KEYCLOAK_URL` are **required, no hardcoded fallback**. Both are checked lazily (on first real use, not on page load), so a missing value won't fail the build or block `dev:noauth` — it'll throw a clear `Missing required environment variable: ...` the first time the app actually tries to call the API or Keycloak. If something's silently not working, check the browser console for that error first.
- **Nothing has been run against a live Keycloak instance or a live API** — verification so far is static (`tsc`, `eslint`, `next build`) plus reading `api-docs-v2.json`. There's no automated test suite in this app yet (`old/` had vitest tests for the v1 client; none were ported).
- `npm run dev:noauth` works today and exercises the full UI with fixture data, bypassing both Keycloak and the API entirely. Use it to confirm a UI change without needing either dependency up.
- The one thing guaranteed to need a fix on first real run: the Keycloak `client_id` and redirect URI below are guesses, not confirmed values.

## 1. Keycloak client setup — do this first

In the Keycloak admin console, realm `datalake`:

1. Find the right client. Two candidates were mentioned: `datalake-api-testing` and `datalake-api`. Check both under **Clients**; the one intended for this frontend should have:
   - **Client authentication: Off** (it must be a *public* client — a browser app can't hold a secret).
   - **Standard flow: On** (Authorization Code).
   - **PKCE Method: S256** (required, not just supported) — matches the earlier confirmation that this API's auth is "Authorization Code with PKCE". `keycloak-js` is told to use `S256` explicitly in `initKeycloak()` regardless, but the client needs to accept it.
2. Check **Valid redirect URIs**. The frontend sends `{origin}/login` as its `redirect_uri` (see `getRedirectUri()` in `src/lib/keycloak.ts` — it reuses the `/login` page as the callback target so only one URI needs registering). You need an entry matching wherever this app actually runs, e.g.:
   - `http://localhost:3000/login` (or whatever port local dev lands on)
   - the real deployed origin's `/login`, for production
   - If the registered URI uses a different path than `/login`, update `getRedirectUri()` to match — don't add a second guessed path, use whatever's actually registered.
3. Check **Web origins** (CORS) includes the frontend's origin(s) — `keycloak-js` calls Keycloak's token endpoint directly from the browser (cross-origin, frontend's domain → `keycloak.datalake`), so this needs to be allowed or the token exchange fails with a CORS error before it reaches the app's own error handling.
4. Confirm `public/silent-check-sso.html` is reachable at `{origin}/silent-check-sso.html` once deployed — `keycloak-js` loads it in a hidden iframe on every page load to silently check for an existing session (so a page refresh doesn't force a visible Keycloak redirect). It's same-origin, so it needs no separate Keycloak registration, but it does need to actually be served (confirm your deployment serves everything under `public/`).
5. Once confirmed, set `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` in `.env.local` (and wherever prod env vars live) to the real value.
6. Worth a sanity check: `keycloak-js` is pinned at `26.2.4` (`package.json`) — confirm that's compatible with whatever Keycloak server version the `datalake` realm is actually running. The OIDC flows themselves are standard, but adapter/server version mismatches occasionally cause subtle issues.

## 2. Test the login flow end to end

1. `npm run dev` (not `dev:noauth` — that skips Keycloak entirely).
2. Visit `/login`. The button should read "Sign in with Keycloak" once hydrated (briefly "Loading…" first — that's `keycloak-js`'s silent-check-sso running, see step 5).
3. Click it. Should redirect to Keycloak's hosted login page. If this 404s or shows "invalid client", the `client_id` is wrong.
4. Authenticate. Keycloak redirects back to `{origin}/login` with auth params in the URL (query or fragment, `keycloak-js` handles either).
5. The page should briefly show "Loading…" then land on `/namespaces` with real catalogs in the header's catalog switcher and real username/email in the sidebar footer's user menu (sourced from `/api/v1/auth/me`).
6. Refresh the page while on `/namespaces` — you should stay logged in without seeing a visible Keycloak redirect. That's the silent-check-sso path (`onLoad: "check-sso"` + `public/silent-check-sso.html`) confirming the session still exists; if you instead get bounced to `/login`, check the browser console for errors loading `silent-check-sso.html` (step 1.4) or CORS/iframe issues.
7. If step 3 or 4 fails, check the browser network tab on the `POST .../protocol/openid-connect/token` call:
   - `invalid_grant` — code already used or expired (took too long between redirect and exchange).
   - CORS error — Web Origins not configured (see step 1.3).
   - `unauthorized_client` / `invalid_client` — wrong `client_id`, or the client isn't actually public (`Client authentication` still on).
   - `invalid redirect_uri` on the *first* redirect (step 3) — the redirect URI sent doesn't match what's registered.
   - Errors surface in the UI via the `FieldMessage` under the sign-in button, sourced from `useAuth()`'s `authError`.
8. **Sign out**, then click "Sign in with Keycloak" again — it should now show a real login prompt (not silently re-authenticate), since `logout()` calls `keycloak.logout()`, which ends the session on Keycloak's side too, not just locally.
9. Token refresh is harder to test deliberately since it's timed — if you can, check whatever `expires_in` Keycloak's realm is configured for, then just leave the tab open past that point and confirm you're still logged in (watch the network tab for a `POST .../token` with `grant_type=refresh_token` firing shortly before expiry).

## 3. Test every page against a real API

None of these have been exercised against a live backend — only typechecked against `api-docs-v2.json`'s schemas. Point `NEXT_PUBLIC_API_BASE_URL` at a real instance and walk through:

- **Namespaces** — list, create, edit properties, row-action delete (with and without `force`).
- **Datasets** — browse, preview rows, view schema/properties/snapshot history, contextual dataset delete (purge on/off), per-snapshot download, per-snapshot rollback (confirm `currentSnapshotId` updates afterward).
- **Upload** — create a new dataset from a `.parquet` file, then append/overwrite an existing one.
- **Query** — run a query, check the debug endpoint.

Note: rollback, download, and delete are no longer standalone pages — they're contextual actions on Namespaces/Datasets (see `ConfirmDialog` note in AGENTS.md). Test them there.

Watch for response-shape mismatches between what `types/api.ts` declares and what the real API actually returns — the types were derived from the OpenAPI schema, not from a live response, and OpenAPI schemas can drift from reality.

## 4. Known gaps / design decisions for whoever picks this up

- **Token refresh is implemented but unverified against real Keycloak.** `hooks/useAuth.tsx` assigns `keycloak.onTokenExpired`, which `keycloak-js` fires based on the token's own `exp` claim; the handler calls `keycloak.updateToken(30)` and updates the session on success, or logs out on failure. This has only been typechecked/built, never run against a real token — confirm during step 2.9 testing that a session actually survives past the first `expires_in` window.
- **Logout now correctly ends the Keycloak session too** (fixed by the `keycloak-js` swap) — `logout()` calls `keycloak.logout({ redirectUri })`, which hits Keycloak's real `end_session_endpoint`, not just local cleanup. Confirmed logically, not yet tested against a real realm (step 2.8).
- **Catalog-selection continuity across refresh is a best-effort heuristic.** `useAuth.tsx`'s init reads `loadPreferredCatalogId()` (`lib/session.ts` — just a bare catalog ID string in `sessionStorage`, not the full session) and reuses it if it's still in the fresh catalog list, purely to avoid resetting the catalog switcher back to `catalogs[0]` on every silent-check-sso refresh. It doesn't check that the persisted preference belonged to the same user — low risk in practice, but worth knowing about if catalog IDs ever collide across accounts. Note this is deliberately *not* the same storage the raw token used to live in — a real Keycloak session no longer persists its access/refresh token to `sessionStorage` at all (`keycloak-js`'s silent-check-sso re-derives it fresh from Keycloak each load), which shrinks the XSS exposure window; `dev:noauth` still persists its full fixture session since it has no Keycloak session to re-check against.
- **`getCatalogs()` in `lib/api/auth.ts` is dead code** — catalogs are sourced from `/api/v1/auth/me` instead, and nothing calls `getCatalogs()`. Either wire it in somewhere or remove it.
- **No automated tests.** `old/` had `api.test.ts`/`session.test.ts`/`utils.test.ts` (vitest) for the v1 client; nothing was ported for v2, and there's no test runner in `package.json` yet.
- **Verifying in a browser from an agent session may not work.** In the environment this was built in, WSL's `curl`/browser tooling couldn't reach the Windows-hosted `next dev` server (`localhost` forwarding didn't work both directions) — if you hit the same thing, the safest path is asking the human running the actual browser to check, rather than assuming a failed `curl` means the server is broken.
