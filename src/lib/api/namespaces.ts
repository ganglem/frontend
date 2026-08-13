import { buildQuery, requestJson } from "@/lib/api/client";
import type {
  BaseListResponse,
  FrontendSession,
  NamespaceCreateRequest,
  NamespaceDeleteResponse,
  NamespaceInfo,
  NamespaceResponse,
  NamespaceUpdateRequest,
} from "@/types/api";

function namespacesPath(session: FrontendSession) {
  return `/api/v1/catalogs/${encodeURIComponent(session.catalogId)}/namespaces`;
}

export function listNamespaces(session: FrontendSession) {
  return requestJson<BaseListResponse<NamespaceInfo>>(namespacesPath(session), {
    method: "GET",
    authToken: session.token,
  });
}

export function createNamespace(session: FrontendSession, input: NamespaceCreateRequest) {
  return requestJson<NamespaceResponse>(namespacesPath(session), {
    method: "POST",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}

export function getNamespace(session: FrontendSession, namespace: string) {
  return requestJson<NamespaceResponse>(
    `${namespacesPath(session)}/${encodeURIComponent(namespace)}`,
    {
      method: "GET",
      authToken: session.token,
    },
  );
}

export function updateNamespace(
  session: FrontendSession,
  namespace: string,
  input: NamespaceUpdateRequest,
) {
  return requestJson<NamespaceResponse>(
    `${namespacesPath(session)}/${encodeURIComponent(namespace)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
      authToken: session.token,
    },
  );
}

export function deleteNamespace(
  session: FrontendSession,
  namespace: string,
  force: boolean,
) {
  return requestJson<NamespaceDeleteResponse>(
    `${namespacesPath(session)}/${encodeURIComponent(namespace)}${buildQuery({ force })}`,
    {
      method: "DELETE",
      authToken: session.token,
    },
  );
}
