import { ApiError } from "@/lib/api/client";

// Talks to Keycloak directly (Authorization Code + PKCE) - the lakehouse API
// only validates tokens via JWKS, it never issues or proxies them. See
// api-docs-v2.json's components.securitySchemes.OAuth2AuthorizationCodeBearer
// for where the URL/realm below come from.
const KEYCLOAK_URL = (process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "https://keycloak.datalake").replace(
  /\/$/,
  "",
);
const KEYCLOAK_REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "datalake";

// Placeholder - confirm the real client_id (and that it's registered as a
// public client with this app's redirect URI) in the Keycloak admin console.
const KEYCLOAK_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "datalake-api-testing";

const AUTHORIZATION_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`;
const TOKEN_ENDPOINT = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

const PKCE_VERIFIER_KEY = "datalake-frontend.pkce.verifier";
const PKCE_STATE_KEY = "datalake-frontend.pkce.state";

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  [key: string]: unknown;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

async function generateCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));

  return base64UrlEncode(new Uint8Array(digest));
}

function generateState() {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

// Placeholder path - must exactly match a "Valid redirect URI" configured on
// the Keycloak client. Reuses /login so only one URI needs registering.
function getRedirectUri() {
  return `${window.location.origin}/login`;
}

export async function startLoginRedirect() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: KEYCLOAK_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- leaving the app entirely for Keycloak's hosted login page, not an internal route
  window.location.href = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

// Reads back the verifier/state stashed by startLoginRedirect and clears
// them - each is meant to be used exactly once.
export function consumePkceState() {
  const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const state = sessionStorage.getItem(PKCE_STATE_KEY);

  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);

  return { codeVerifier, state };
}

export async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: KEYCLOAK_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.error_description === "string"
        ? data.error_description
        : "Failed to exchange the authorization code for a token.";

    throw new ApiError(message, response.status, data);
  }

  return data as KeycloakTokenResponse;
}
