import { isNoAuthMode, requestJson } from "@/lib/api/client";
import type { CatalogInfo, CurrentUser } from "@/types/api";

export const NOAUTH_TOKEN = "dev-noauth-token";

const NOAUTH_CATALOG: CatalogInfo = {
  name: "dev-team",
  catalog: "dev-team-warehouse",
  bucketName: "dev-team-bucket",
  group: "dev-team",
  description: "Local fixture catalog used by npm run dev:noauth.",
};

export function getCurrentUser(token: string) {
  if (isNoAuthMode()) {
    return Promise.resolve<CurrentUser>({
      name: "dev-user",
      groups: [NOAUTH_CATALOG.group],
      email: "dev-user@example.com",
      catalogs: [NOAUTH_CATALOG],
    });
  }

  return requestJson<CurrentUser>("/api/v1/auth/me", {
    method: "GET",
    authToken: token,
  });
}

export function getCatalogs(token: string) {
  if (isNoAuthMode()) {
    return Promise.resolve<CatalogInfo[]>([NOAUTH_CATALOG]);
  }

  return requestJson<CatalogInfo[]>("/api/v1/auth/catalogs", {
    method: "GET",
    authToken: token,
  });
}
