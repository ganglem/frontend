"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FrontendSession } from "@/types/api";
import { getCurrentUser, NOAUTH_TOKEN } from "@/lib/api/auth";
import { ApiError, isNoAuthMode } from "@/lib/api/client";
import { formatApiError } from "@/lib/format";
import { getKeycloak, initKeycloak, redirectToLogin, redirectToLogout } from "@/lib/keycloak";
import {
  clearSession,
  createSession,
  loadPreferredCatalogId,
  loadSession,
  persistPreferredCatalogId,
  persistSession,
} from "@/lib/session";

interface AuthContextValue {
  session: FrontendSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  authError: string | null;
  loginWithKeycloak: () => void;
  loginNoAuth: () => Promise<void>;
  setCatalog: (catalogId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSessionState] = useState<FrontendSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Session lives in sessionStorage, which is only readable on the client.
  // Reading it during the initial render would desync the server-rendered
  // HTML from the client's first paint, so it's loaded after mount instead.
  useEffect(() => {
    if (isNoAuthMode()) {
      const loaded = loadSession();

      if (loaded) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from sessionStorage, an external system unreadable during SSR/first paint
        setSessionState(loaded);
      }

      setIsHydrated(true);
      return;
    }

    const keycloak = getKeycloak();

    // Fires when keycloak-js's own internal timer (based on the token's exp
    // claim) detects the access token has expired - try a silent refresh
    // before giving up and logging out.
    keycloak.onTokenExpired = () => {
      keycloak
        .updateToken(30)
        .then((refreshed) => {
          if (!refreshed || !keycloak.token) {
            return;
          }

          setSessionState((current) =>
            current
              ? {
                  ...current,
                  token: keycloak.token as string,
                  refreshToken: keycloak.refreshToken ?? current.refreshToken,
                  expiresAt: keycloak.tokenParsed?.exp ? keycloak.tokenParsed.exp * 1000 : null,
                }
              : current,
          );
        })
        .catch(() => {
          clearSession();
          setSessionState(null);
        });
    };

    initKeycloak()
      .then(async (authenticated) => {
        if (!authenticated || !keycloak.token) {
          setIsHydrated(true);
          return;
        }

        const currentUser = await getCurrentUser(keycloak.token);

        if (!currentUser.catalogs.length) {
          throw new ApiError(
            "Your account has no accessible catalogs. Contact an administrator.",
            403,
          );
        }

        // Prefer whatever catalog was selected before a refresh, so
        // switching catalogs doesn't get silently reset every reload.
        const previousCatalogId = loadPreferredCatalogId();
        const catalogId = currentUser.catalogs.some((c) => c.catalog === previousCatalogId)
          ? (previousCatalogId as string)
          : currentUser.catalogs[0].catalog;

        setSessionState(
          createSession({
            username: currentUser.name,
            token: keycloak.token as string,
            email: currentUser.email,
            catalogs: currentUser.catalogs,
            catalogId,
            expiresIn: keycloak.tokenParsed?.exp
              ? keycloak.tokenParsed.exp - Math.floor(Date.now() / 1000)
              : undefined,
            refreshToken: keycloak.refreshToken ?? null,
          }),
        );
        setIsHydrated(true);
      })
      .catch((err) => {
        setAuthError(formatApiError(err));
        setIsHydrated(true);
      });
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!session) {
      clearSession();
      return;
    }

    // noauth has no Keycloak session to silently re-derive from, so the
    // whole thing has to be persisted. A real login only needs the catalog
    // preference remembered - see loadPreferredCatalogId's comment.
    if (isNoAuthMode()) {
      persistSession(session);
      return;
    }

    persistPreferredCatalogId(session.catalogId);
  }, [session, isHydrated]);

  const value: AuthContextValue = {
    session,
    isAuthenticated: isHydrated && !!session,
    isHydrated,
    authError,
    loginWithKeycloak: () => {
      setAuthError(null);
      redirectToLogin().catch((err) => setAuthError(formatApiError(err)));
    },
    loginNoAuth: async () => {
      setAuthError(null);

      try {
        const currentUser = await getCurrentUser(NOAUTH_TOKEN);

        setSessionState(
          createSession({
            username: currentUser.name,
            token: NOAUTH_TOKEN,
            email: currentUser.email,
            catalogs: currentUser.catalogs,
            catalogId: currentUser.catalogs[0].catalog,
          }),
        );
      } catch (err) {
        setAuthError(formatApiError(err));
      }
    },
    setCatalog: (catalogId) => {
      setSessionState((current) => (current ? { ...current, catalogId } : current));
    },
    logout: () => {
      clearSession();
      setSessionState(null);

      if (isNoAuthMode()) {
        router.replace("/login");
        return;
      }

      redirectToLogout();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
