import Keycloak from "keycloak-js";
import { requireEnv } from "@/lib/env";

// Talks to Keycloak directly (Authorization Code + PKCE) via the official
// keycloak-js adapter - the lakehouse API only validates tokens via JWKS, it
// never issues or proxies them. See api-docs-v2.json's
// components.securitySchemes.OAuth2AuthorizationCodeBearer for where the
// URL/realm below come from.
const KEYCLOAK_URL = requireEnv(
  "NEXT_PUBLIC_KEYCLOAK_URL",
  process.env.NEXT_PUBLIC_KEYCLOAK_URL,
).replace(/\/$/, "");
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "datalake";

// Placeholder - confirm the real client_id (and that it's registered as a
// public client with this app's redirect URI) in the Keycloak admin console.
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "datalake-api-testing";

let keycloak: Keycloak | null = null;

// keycloak-js touches window/document, so it can only be constructed in the
// browser - never call this at module scope or during render.
export function getKeycloak() {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: KEYCLOAK_URL,
      realm: KEYCLOAK_REALM,
      clientId: KEYCLOAK_CLIENT_ID,
    });
  }

  return keycloak;
}

// Placeholder path - must exactly match a "Valid redirect URI" configured on
// the Keycloak client. Reuses /login so only one URI needs registering.
function getRedirectUri() {
  return `${window.location.origin}/login`;
}

let initPromise: Promise<boolean> | null = null;

// init() throws if called twice on the same instance, and React 18 Strict
// Mode runs mount effects twice in dev - this memoizes the one real call.
// onLoad: "check-sso" + silentCheckSsoRedirectUri asks Keycloak (via a
// hidden iframe, see public/silent-check-sso.html) whether the browser
// already has a session on every load, so a page refresh doesn't force a
// visible login redirect. If a login() redirect just landed with ?code=...
// in the URL, init() processes that first regardless of onLoad.
export function initKeycloak() {
  if (!initPromise) {
    initPromise = getKeycloak().init({
      pkceMethod: "S256",
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      checkLoginIframe: false,
    });
  }

  return initPromise;
}

export function redirectToLogin() {
  return getKeycloak().login({ redirectUri: getRedirectUri() });
}

export function redirectToLogout() {
  return getKeycloak().logout({ redirectUri: getRedirectUri() });
}
