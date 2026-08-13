"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FieldMessage } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { isNoAuthMode } from "@/lib/api/client";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, authError, loginWithKeycloak, loginNoAuth } = useAuth();

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/namespaces");
    }
  }, [isHydrated, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Sign in to Data Lake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isNoAuthMode() ? (
            <Button className="w-full" onClick={loginNoAuth}>
              Continue (no-auth dev mode)
            </Button>
          ) : (
            <Button className="w-full" disabled={!isHydrated} onClick={loginWithKeycloak}>
              {isHydrated ? "Sign in with Keycloak" : "Loading…"}
            </Button>
          )}

          <FieldMessage tone="danger">{authError}</FieldMessage>
        </CardContent>
      </Card>
    </div>
  );
}
