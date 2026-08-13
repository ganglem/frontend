"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldMessage } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, isNoAuthMode } from "@/lib/api/client";
import { getCurrentUser, NOAUTH_TOKEN } from "@/lib/api/auth";
import { formatApiError } from "@/lib/format";
import { consumePkceState, exchangeCodeForToken, startLoginRedirect } from "@/lib/keycloak";
import { createSession } from "@/lib/session";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isHydrated, setSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const exchangeStartedRef = useRef(false);

  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/namespaces");
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (isNoAuthMode() || !code || exchangeStartedRef.current) {
      return;
    }

    exchangeStartedRef.current = true;
    setIsProcessing(true);

    (async () => {
      try {
        const returnedState = searchParams.get("state");
        const { codeVerifier, state } = consumePkceState();

        if (!codeVerifier || !state || state !== returnedState) {
          throw new ApiError(
            "The sign-in attempt expired or was tampered with. Please try again.",
            400,
          );
        }

        const tokenResponse = await exchangeCodeForToken(code, codeVerifier);
        const currentUser = await getCurrentUser(tokenResponse.access_token);

        if (!currentUser.catalogs.length) {
          throw new ApiError(
            "Your account has no accessible catalogs. Contact an administrator.",
            403,
          );
        }

        const session = createSession({
          username: currentUser.name,
          token: tokenResponse.access_token,
          email: currentUser.email,
          catalogs: currentUser.catalogs,
          catalogId: currentUser.catalogs[0].catalog,
          expiresIn: tokenResponse.expires_in,
        });

        setSession(session);
        router.replace("/namespaces");
      } catch (err) {
        setError(formatApiError(err));
        setIsProcessing(false);
        router.replace("/login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per authorization code, guarded by exchangeStartedRef
  }, [code]);

  const handleKeycloakSignIn = () => {
    setError(null);
    startLoginRedirect().catch((err) => setError(formatApiError(err)));
  };

  const handleNoAuthSignIn = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const currentUser = await getCurrentUser(NOAUTH_TOKEN);
      const session = createSession({
        username: currentUser.name,
        token: NOAUTH_TOKEN,
        email: currentUser.email,
        catalogs: currentUser.catalogs,
        catalogId: currentUser.catalogs[0].catalog,
      });

      setSession(session);
      router.replace("/namespaces");
    } catch (err) {
      setError(formatApiError(err));
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to Data Lake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isNoAuthMode() ? (
            <Button className="w-full" disabled={isProcessing} onClick={handleNoAuthSignIn}>
              {isProcessing ? "Signing in…" : "Continue (no-auth dev mode)"}
            </Button>
          ) : (
            <Button className="w-full" disabled={isProcessing} onClick={handleKeycloakSignIn}>
              {isProcessing ? "Signing in…" : "Sign in with Keycloak"}
            </Button>
          )}

          <FieldMessage tone="danger">{error ?? oauthError}</FieldMessage>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
