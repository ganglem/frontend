import { requestJson } from "@/lib/api/client";
import type { FrontendSession, QueryDebugResponse, QueryRequest, QueryResponse } from "@/types/api";

function queryPath(session: FrontendSession) {
  return `/api/v1/catalogs/${encodeURIComponent(session.catalogId)}/query`;
}

export function runQuery(session: FrontendSession, input: QueryRequest) {
  return requestJson<QueryResponse>(queryPath(session), {
    method: "POST",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}

export function runQueryDebug(session: FrontendSession, input: QueryRequest) {
  return requestJson<QueryDebugResponse>(`${queryPath(session)}/debug`, {
    method: "POST",
    body: JSON.stringify(input),
    authToken: session.token,
  });
}
