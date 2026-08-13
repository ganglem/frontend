"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { FrontendSession } from "@/types/api";
import { clearSession, isSessionExpired, loadSession, persistSession } from "@/lib/session";

interface AuthContextValue {
  session: FrontendSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setSession: (session: FrontendSession) => void;
  setCatalog: (catalogId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<FrontendSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Session lives in sessionStorage, which is only readable on the client.
  // Reading it during the initial render would desync the server-rendered
  // HTML from the client's first paint, so it's loaded after mount instead.
  useEffect(() => {
    const loaded = loadSession();

    if (loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs from sessionStorage, an external system unreadable during SSR/first paint
      setSessionState(loaded);
    }

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!session) {
      clearSession();
      return;
    }

    if (isSessionExpired(session)) {
      clearSession();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs against wall-clock expiry, an external signal
      setSessionState(null);
      return;
    }

    persistSession(session);

    if (session.expiresAt === null) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearSession();
      setSessionState(null);
    }, Math.max(0, session.expiresAt - Date.now()));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [session, isHydrated]);

  const value: AuthContextValue = {
    session,
    isAuthenticated: isHydrated && !!session && !isSessionExpired(session),
    isHydrated,
    setSession: (nextSession) => {
      setSessionState(nextSession);
    },
    setCatalog: (catalogId) => {
      setSessionState((current) => (current ? { ...current, catalogId } : current));
    },
    logout: () => {
      clearSession();
      setSessionState(null);
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
