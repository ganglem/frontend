import { isNoAuthMode, requestJson } from "@/lib/api/client";
import { mockRunQuery, mockRunQueryDebug } from "@/lib/mocks/store";
import type { FrontendSession, QueryDebugResponse, QueryRequest, QueryResponse } from "@/types/api";

function queryPath(session: FrontendSession) {
  return `/api/v1/catalogs/${encodeURIComponent(session.catalogId)}/query`;
}

export function runQuery(session: FrontendSession, input: QueryRequest) {
  if (isNoAuthMode()) {
    return mockRunQuery(input);
  }

  return requestJson<QueryResponse>(queryPath(session), {
    method: "POST",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}

export function runQueryDebug(session: FrontendSession, input: QueryRequest) {
  if (isNoAuthMode()) {
    return mockRunQueryDebug(input);
  }

  return requestJson<QueryDebugResponse>(`${queryPath(session)}/debug`, {
    method: "POST",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}
