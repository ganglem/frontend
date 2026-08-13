# TODO: real Keycloak + API integration

## Current status

- UI, routing, session handling, and every page's logic are built and typecheck/lint/build clean against **v2**'s documented schemas.
- **Nothing has been run against a live Keycloak instance or a live API** — verification so far is static (`tsc`, `eslint`, `next build`) plus reading `api-docs-v2.json`. There's no automated test suite in this app yet (`old/` had vitest tests for the v1 client; none were ported).
- `npm run dev:noauth` works today and exercises the full UI with fixture data, bypassing both Keycloak and the API entirely. Use it to confirm a UI change without needing either dependency up.
- The one thing guaranteed to need a fix on first real run: the Keycloak `client_id` and redirect URI below are guesses, not confirmed values.

## 1. Keycloak client setup — do this first

In the Keycloak admin console, realm `datalake`:

1. Find the right client. Two candidates were mentioned: `datalake-api-testing` and `datalake-api`. Check both under **Clients**; the one intended for this frontend should have:
   - **Client authentication: Off** (it must be a *public* client — a browser app can't hold a secret).
   - **Standard flow: On** (Authorization Code).
   - **PKCE Method: S256** (required, not just supported) — matches the earlier confirmation that this API's auth is "Authorization Code with PKCE".
2. Check **Valid redirect URIs**. The frontend currently sends `{origin}/login` as its `redirect_uri` (see `getRedirectUri()` in `src/lib/keycloak.ts` — it reuses the `/login` page as the callback target so only one URI needs registering). You need an entry matching wherever this app actually runs, e.g.:
   - `http://localhost:3000/login` (or whatever port local dev lands on)
   - the real deployed origin's `/login`, for production
   - If the registered URI uses a different path than `/login`, update `getRedirectUri()` to match — don't add a second guessed path, use whatever's actually registered.
3. Check **Web origins** (CORS) includes the frontend's origin(s) — the browser calls Keycloak's `/protocol/openid-connect/token` endpoint directly (cross-origin POST from the frontend's domain to `keycloak.datalake`), so this needs to be allowed or the token exchange will fail with a CORS error before it ever reaches the app's error handling.
4. Once confirmed, set `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` in `.env.local` (and wherever prod env vars live) to the real value.

## 2. Test the login flow end to end

1. `npm run dev` (not `dev:noauth` — that skips Keycloak entirely).
2. Visit `/login`, click **Sign in with Keycloak**.
3. Should redirect to Keycloak's hosted login page (`https://keycloak.datalake/realms/datalake/protocol/openid-connect/auth?...`). If this 404s or shows "invalid client", the `client_id` is wrong.
4. Authenticate. Keycloak should redirect back to `{origin}/login?code=...&state=...`.
5. The page should show "Signing in…" briefly, then land on `/namespaces` with real catalogs in the header's catalog switcher (previously the sidebar footer's user menu — confirm that dropdown shows the real username/email from `/api/v1/auth/me`).
6. If it instead bounces back to `/login` with an error message, check the browser network tab on the `POST .../protocol/openid-connect/token` call:
   - `invalid_grant` — code already used (shouldn't happen given the `useRef` guard in `LoginForm`, but confirm) or code expired (took too long between redirect and exchange).
   - CORS error — Web Origins not configured (see step 1.3).
   - `unauthorized_client` / `invalid_client` — wrong `client_id`, or the client isn't actually public (`Client authentication` still on).
   - `invalid redirect_uri` on the *first* redirect (step 3) — the redirect URI sent doesn't match what's registered.

## 3. Test every page against a real API

None of these have been exercised against a live backend — only typechecked against `api-docs-v2.json`'s schemas. Point `NEXT_PUBLIC_API_BASE_URL` at a real instance and walk through:

- **Namespaces** — list, create, edit properties, delete (with and without `force`).
- **Datasets** — browse, preview rows, view schema/properties/snapshot history.
- **Upload** — create a new dataset from a `.parquet` file, then append/overwrite an existing one.
- **Query** — run a query, check the debug endpoint.
- **Rollback** — restore a prior snapshot, confirm `currentSnapshotId` updates.
- **Download** — export current snapshot and a specific snapshot ID.
- **Delete** — dataset delete (purge on/off) and namespace delete (force on/off).

Watch for response-shape mismatches between what `types/api.ts` declares and what the real API actually returns — the types were derived from the OpenAPI schema, not from a live response, and OpenAPI schemas can drift from reality.

## 4. Known gaps / design decisions for whoever picks this up

- **No token refresh.** The access token's `expires_in` just drives a logout timer (`hooks/useAuth.tsx`) — when it expires, the user is logged out and has to redirect through Keycloak again. If Keycloak issues a `refresh_token` (likely, per earlier investigation, but unconfirmed) and access tokens turn out to be short-lived, silent refresh is probably worth adding. Nothing currently reads or stores `refresh_token` from the token response.
- **Logout is local-only.** `logout()` clears `sessionStorage` and app state but never calls Keycloak's `end_session_endpoint` (`/realms/datalake/protocol/openid-connect/logout`). Keycloak's own SSO session likely survives a "sign out" in this app, so clicking "Sign in with Keycloak" again may silently re-authenticate without showing a login prompt. Decide if that's acceptable or needs a real end-session call.
- **`getCatalogs()` in `lib/api/auth.ts` is dead code** — catalogs are sourced from `/api/v1/auth/me` instead, and nothing calls `getCatalogs()`. Either wire it in somewhere or remove it.
- **No automated tests.** `old/` had `api.test.ts`/`session.test.ts`/`utils.test.ts` (vitest) for the v1 client; nothing was ported for v2, and there's no test runner in `package.json` yet.
- **Verifying in a browser from an agent session may not work.** In the environment this was built in, WSL's `curl`/browser tooling couldn't reach the Windows-hosted `next dev` server (`localhost` forwarding didn't work both directions) — if you hit the same thing, the safest path is asking the human running the actual browser to check, rather than assuming a failed `curl` means the server is broken.
