import type { CatalogInfo, FrontendSession } from "@/types/api";

const STORAGE_KEY = "datalake-frontend.session";

export function isSessionExpired(session: FrontendSession) {
  return session.expiresAt !== null && session.expiresAt <= Date.now();
}

export function createSession(input: {
  username: string;
  token: string;
  email: string | null;
  catalogs: CatalogInfo[];
  catalogId: string;
  expiresIn?: number;
}): FrontendSession {
  return {
    username: input.username,
    token: input.token,
    email: input.email,
    catalogs: input.catalogs,
    catalogId: input.catalogId,
    expiresAt: input.expiresIn ? Date.now() + input.expiresIn * 1000 : null,
  };
}

export function loadSession(): FrontendSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as FrontendSession;

    if (!parsed.token || !parsed.catalogId || !Array.isArray(parsed.catalogs)) {
      clearSession();
      return null;
    }

    if (isSessionExpired(parsed)) {
      clearSession();
      return null;
    }

    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

export function persistSession(session: FrontendSession) {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.sessionStorage.removeItem(STORAGE_KEY);
}
