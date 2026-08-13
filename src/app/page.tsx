"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuth();

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    router.replace(isAuthenticated ? "/namespaces" : "/login");
  }, [isHydrated, isAuthenticated, router]);

  return null;
}
